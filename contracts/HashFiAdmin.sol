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

    // --- 创世节点审核 ---

    function approveGenesisNode(address _applicant) external onlyOwner {
        require(genesisNodeApplications[_applicant], "No pending application");
        User storage user = users[_applicant];
        require(!user.isGenesisNode, "Already approved");
        
        genesisNodeApplications[_applicant] = false;
        _removeFromPendingApplications(_applicant);
        
        user.isGenesisNode = true;
        genesisNodes.push(_applicant);
        
        // ✅ 添加到活跃节点列表
        activeGenesisNodes.push(_applicant);
        isActiveGenesisNode[_applicant] = true;
        
        emit GenesisNodeApproved(_applicant);
    }
    
    function rejectGenesisNode(address _applicant) external onlyOwner {
        require(genesisNodeApplications[_applicant], "No pending application");
        
        genesisNodeApplications[_applicant] = false;
        _removeFromPendingApplications(_applicant);
        
        // 退还申请费用
        usdtToken.transfer(_applicant, genesisNodeCost);
        
        emit GenesisNodeRejected(_applicant);
    }

    // --- 参数设置 ---

    function setHafPrice(uint256 _newPrice) external onlyOwner {
        require(_newPrice > 0, "Price must be positive");
        hafPrice = _newPrice;
        lastPriceUpdateTime = block.timestamp;
        emit PriceUpdated(_newPrice);
    }
    
    function setDailyPriceIncreaseRate(uint256 _rate) external onlyOwner {
        require(_rate <= 100, "Rate too high"); // 最高10%每天
        dailyPriceIncreaseRate = _rate;
    }

    function setAutoPriceUpdate(bool _enabled) external onlyOwner {
        autoPriceUpdateEnabled = _enabled;
    }

    function setWithdrawalFee(uint256 _newFeeRate) external onlyOwner {
        require(_newFeeRate <= 100, "Fee rate cannot exceed 100%");
        withdrawalFeeRate = _newFeeRate;
    }
    
    function updateStakingLevel(
        uint8 _level, 
        uint256 _minAmount, 
        uint256 _maxAmount, 
        uint256 _multiplier, 
        uint256 _dailyRate
    ) external onlyOwner {
        require(_level >= 1 && _level <= 4, "Invalid level");
        require(_minAmount < _maxAmount, "Invalid amount range");
        require(_multiplier > 0 && _dailyRate > 0, "Invalid parameters");
        
        stakingLevels[_level] = StakingLevelInfo(_minAmount, _maxAmount, _multiplier, _dailyRate);
    }
    
    function updateTeamLevel(
        uint8 _level,
        uint256 _requiredPerformance,
        uint256 _accelerationBonus
    ) external onlyOwner {
        require(_level >= 0 && _level <= 5, "Invalid team level");
        require(_accelerationBonus <= 100, "Bonus cannot exceed 100%");
        
        if (_level < teamLevels.length) {
            teamLevels[_level] = TeamLevelInfo(_requiredPerformance, _accelerationBonus);
        }
    }

    function setGenesisNodeCost(uint256 _newCost) external onlyOwner {
        require(_newCost > 0, "Cost must be positive");
        genesisNodeCost = _newCost;
    }

    function setSwapFee(uint256 _newFeeRate) external onlyOwner {
        require(_newFeeRate <= 100, "Fee rate cannot exceed 100%");
        swapFeeRate = _newFeeRate;
    }

    // --- 强制操作 ---

    function forceSettleUser(address _user) external onlyOwner {
        _settleUserRewards(_user);
    }

    function setUserTeamLevel(address _user, uint8 _level) external onlyOwner {
        require(_level >= 0 && _level <= 5, "Invalid team level");
        uint8 oldLevel = users[_user].teamLevel;
        users[_user].teamLevel = _level;
        emit TeamLevelUpdated(_user, oldLevel, _level);
    }
    
    function emergencyWithdrawToken(address _tokenAddress, uint256 _amount) external onlyOwner {
        IERC20 token = IERC20(_tokenAddress);
        // uint256 balance = token.balanceOf(address(this)); // 变量 balance 未被使用
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

    // --- 暂停功能 ---
    // Pausable 的 pause/unpause 函数已经是 onlyOwner，
    // 但为了模块清晰，我们在这里显式"继承"它们
    // 在主合约 HashFi.sol 中继承 Pausable 将提供 _pause 和 _unpause 的实现
    
    function pause() external virtual onlyOwner {
        // 实现将在主合约
    }

    function unpause() external virtual onlyOwner {
        // 实现将在主合约
    }
}
