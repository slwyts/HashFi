// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./HashFiLogic.sol";

/**
 * @title HashFiAdmin
 * @dev 包含所有仅限管理员(Owner)访问的功能。
 * 继承自 HashFiLogic 以访问内部函数和状态。
 * 不再需要单独继承 Ownable，因为 HashFiStorage 已经继承了。
 */
abstract contract HashFiAdmin is HashFiLogic {

    function approveGenesisNode(address _applicant) external onlyOwner {
        if (!genesisNodeApplications[_applicant]) revert NoPendingApplication();
        User storage user = users[_applicant];
        if (user.isGenesisNode) revert AlreadyGenesisNode();
        
        genesisNodeApplications[_applicant] = false;
        _removeFromPendingApplications(_applicant);
        
        user.isGenesisNode = true;
        genesisNodes.push(_applicant);
        
        activeGenesisNodes.push(_applicant);
        isActiveGenesisNode[_applicant] = true;
        
        user.genesisRewardDebt = accGenesisRewardPerNode;
    }
    
    function rejectGenesisNode(address _applicant) external onlyOwner {
        if (!genesisNodeApplications[_applicant]) revert NoPendingApplication();
        
        genesisNodeApplications[_applicant] = false;
        _removeFromPendingApplications(_applicant);
    }

    // --- 参数设置 ---

    function setHafPrice(uint256 _newPrice) external onlyOwner {
        if (_newPrice == 0) revert InvalidAmount();
        hafPrice = _newPrice;
        lastPriceUpdateTime = block.timestamp;
    }
    
    function setDailyPriceIncreaseRate(uint256 _rate) external onlyOwner {
        if (_rate > 100) revert InvalidFeeRate();
        dailyPriceIncreaseRate = _rate;
    }

    function setAutoPriceUpdate(bool _enabled) external onlyOwner {
        autoPriceUpdateEnabled = _enabled;
    }

    function setWithdrawalFee(uint256 _newFeeRate) external onlyOwner {
        if (_newFeeRate > 100) revert InvalidFeeRate();
        withdrawalFeeRate = _newFeeRate;
    }

    function setGenesisNodeCost(uint256 _newCost) external onlyOwner {
        if (_newCost == 0) revert InvalidAmount();
        genesisNodeCost = _newCost;
    }

    function setSwapFee(uint256 _newFeeRate) external onlyOwner {
        if (_newFeeRate > 100) revert InvalidFeeRate();
        swapFeeRate = _newFeeRate;
    }

    function forceSettleUser(address _user) external onlyOwner {
        _settleUserRewards(_user);
    }

    function setUserTeamLevel(address _user, uint8 _level) external onlyOwner {
        if (_level > 5) revert InvalidLevel();
        users[_user].teamLevel = _level;
    }
    
    function emergencyWithdrawToken(address _tokenAddress, uint256 _amount) external onlyOwner {
        IERC20 token = IERC20(_tokenAddress);
        token.transfer(owner(), _amount);
    }

    // --- 管理员视图 ---

    function getAllGenesisNodesInfo() external view onlyOwner returns (
        address[] memory nodes,
        uint256[] memory totalDividends,
        uint256[] memory withdrawn
    ) {
        uint256 length = genesisNodes.length;
        nodes = new address[](length);
        totalDividends = new uint256[](length);
        withdrawn = new uint256[](length);
        
        uint256 maxDividend = genesisNodeCost * GENESIS_NODE_EXIT_MULTIPLIER;
        
        for (uint i = 0; i < length; i++) {
            nodes[i] = genesisNodes[i];
            totalDividends[i] = maxDividend;
            withdrawn[i] = users[genesisNodes[i]].genesisDividendsWithdrawn;
        }
        
        return (nodes, totalDividends, withdrawn);
    }

    function getPendingGenesisApplications() external view onlyOwner returns (address[] memory) {
        return pendingGenesisApplications;
    }

    // ========================================
    // 算力中心管理员功能
    // ========================================

    /**
     * @dev 更新用户算力
     * @param _user 用户地址
     * @param _delta 算力变动量（正数增加，负数减少，整数T）
     */
    function updateHashPower(address _user, int256 _delta) external onlyOwner {
        if (_user == address(0)) revert InvalidAddress();
        _settleBtcRewards(_user);
        _updateHashPower(_user, _delta);
    }

    /**
     * @dev 设置指定日期的BTC产出
     * @param _date 日期时间戳
     * @param _btcAmount BTC产出数量（8位精度，可以设置为0表示当天无产出）
     * @notice 设置时会自动记录当前的全网总算力快照
     * @notice 允许设置为0，用于节假日或其他不产出的日期
     */
    function setDailyBtcOutput(uint256 _date, uint256 _btcAmount) external onlyOwner {
        uint256 alignedDate = _alignToUtc8Date(_date);
        uint256 totalHashPower = _calculateTotalHashPowerAtDate(alignedDate);
        dailyBtcOutputs[alignedDate] = DailyBtcOutput(alignedDate, _btcAmount, totalHashPower);
    }

    /**
     * @dev 审核BTC提现订单
     * @param _orderId 订单ID
     * @param _approved true通过，false拒绝
     */
    function processBtcWithdrawal(uint256 _orderId, bool _approved) external onlyOwner {
        if (_orderId >= btcWithdrawalOrders.length) revert InvalidOrder();
        BtcWithdrawalOrder storage order = btcWithdrawalOrders[_orderId];
        if (order.status != BtcWithdrawalStatus.Pending) revert AlreadyProcessed();
        
        if (_approved) {
            order.status = BtcWithdrawalStatus.Approved;
            userHashPowers[order.user].withdrawnBtc += order.amount;
        } else {
            order.status = BtcWithdrawalStatus.Rejected;
            userHashPowers[order.user].totalMinedBtc += order.amount;
        }
    }

    /**
     * @dev 设置最小BTC提现数量
     * @param _minAmount 最小提现数量（8位精度）
     */
    function setMinBtcWithdrawal(uint256 _minAmount) external onlyOwner {
        if (_minAmount == 0) revert InvalidAmount();
        minBtcWithdrawal = _minAmount;
    }

}
