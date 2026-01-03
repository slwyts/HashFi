// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {HashFiAdmin} from "./HashFiAdmin.sol";
import {HashFiView} from "./HashFiView.sol";
import {HAFToken} from "./HAFToken.sol";
import {IHAFToken} from "./HashFiStorage.sol";

contract HashFi is HashFiAdmin, HashFiView, Pausable {

    /**
     * @dev 构造函数
     * @param _usdtAddress USDT代币地址
     * @param _initialOwner 合约初始owner
     * @param _pancakeFactory PancakeSwap工厂地址（BSC/tBSC可传0）
     * @param _pancakeRouter PancakeSwap路由地址（BSC/tBSC可传0）
     */
    constructor(
        address _usdtAddress, 
        address _initialOwner,
        address _pancakeFactory,
        address _pancakeRouter
    ) Ownable(_initialOwner) {
        usdtToken = IERC20(_usdtAddress);
        
        // 部署HAF Token合约，传入工厂和路由地址
        HAFToken token = new HAFToken(
            _usdtAddress, 
            address(this),
            _pancakeFactory,
            _pancakeRouter
        );
        hafToken = IHAFToken(address(token));

        TIME_UNIT = 1 days; // 主网: 1天
        DYNAMIC_RELEASE_PERIOD = 100 days; // 主网: 100天

        stakingLevels[1] = StakingLevelInfo(100 * 1e18, 499 * 1e18, 150, 70);
        stakingLevels[2] = StakingLevelInfo(500 * 1e18, 999 * 1e18, 200, 80);
        stakingLevels[3] = StakingLevelInfo(1000 * 1e18, 2999 * 1e18, 250, 90);
        stakingLevels[4] = StakingLevelInfo(3000 * 1e18, type(uint256).max, 300, 100);

        teamLevels.push(TeamLevelInfo(0, 0)); // V0
        teamLevels.push(TeamLevelInfo(5000 * 1e18, 5)); // V1
        teamLevels.push(TeamLevelInfo(20000 * 1e18, 10)); // V2
        teamLevels.push(TeamLevelInfo(100000 * 1e18, 15)); // V3
        teamLevels.push(TeamLevelInfo(300000 * 1e18, 20)); // V4
        teamLevels.push(TeamLevelInfo(1000000 * 1e18, 25));// V5
    }
    
    // 接收原生币（ETH/BNB），用于捕获意外转入的原生币
    receive() external payable {}

    function bindReferrer(address _referrer) external whenNotPaused {
        _triggerTokenMechanisms(); // Lazy load mechanisms
        
        User storage user = users[msg.sender];
        if (user.referrer != address(0)) revert ReferrerAlreadyBound();
        
        if (msg.sender == owner()) {
            user.referrer = address(0x0000000000000000000000000000000000000001);
            return;
        }

        if (users[_referrer].totalStakedAmount == 0 || _referrer == address(0)) revert ReferrerNotExist();
        if (_referrer == msg.sender) revert CannotReferSelf();
        user.referrer = _referrer;
        users[_referrer].directReferrals.push(msg.sender);
    }


    function stake(uint256 _amount) external whenNotPaused {
        _requireLpInitialized(); // LP must be initialized before staking
        _triggerTokenMechanisms(); // Lazy load mechanisms
        
        if (users[msg.sender].referrer == address(0)) revert MustBindReferrer();
        uint8 level = _getStakingLevelByAmount(_amount);
        if (level == 0) revert InvalidStakingAmount();

        usdtToken.transferFrom(msg.sender, address(this), _amount);

        uint256 orderId = orders.length;
        uint256 baseQuota = (_amount * stakingLevels[level].multiplier) / 100;
        
        uint256 quota = (baseQuota * 90) / 100;
        uint256 quotaHaf = (quota * PRICE_PRECISION) / getHafPrice();
        
        orders.push(Order(orderId, msg.sender, level, _amount, quota, 0, quotaHaf, 0, block.timestamp, block.timestamp, false));
        User storage user = users[msg.sender];
        user.orderIds.push(orderId);
        user.totalStakedAmount = user.totalStakedAmount + _amount;

        globalStats.totalDepositedUsdt = globalStats.totalDepositedUsdt + _amount;
        if (user.orderIds.length == 1) {
            globalStats.totalActiveUsers = globalStats.totalActiveUsers + 1;
        }

        _updateAncestorsPerformanceAndRewards(msg.sender, _amount, level);
    }

    function applyForGenesisNode() external whenNotPaused {
        _triggerTokenMechanisms();
        
        User storage user = users[msg.sender];
        if (user.isGenesisNode) revert AlreadyGenesisNode();
        if (genesisNodeApplications[msg.sender]) revert ApplicationPending();
        if (user.totalStakedAmount == 0) revert InvalidAmount();

        usdtToken.transferFrom(msg.sender, address(this), genesisNodeCost);
        
        genesisNodeApplications[msg.sender] = true;
        pendingGenesisApplications.push(msg.sender);
    }

    function withdraw() external whenNotPaused {
        _triggerTokenMechanisms();
        
        _updateDirectRewardRelease(msg.sender);
        (uint256 pendingStaticHaf, uint256 pendingDynamicHaf, uint256 pendingGenesisHaf) = getClaimableRewards(msg.sender);
        
        _settleUserRewards(msg.sender);
        uint256 totalClaimableHaf = pendingStaticHaf + pendingDynamicHaf + pendingGenesisHaf;
        if (totalClaimableHaf == 0) revert NoRewards();

        User storage user = users[msg.sender];
        
        uint256 totalPendingDirect = 0;
        if (user.directRewardTotal > user.directRewardClaimed) {
            if (user.directRewardReleased > user.directRewardClaimed) {
                for (uint i = 0; i < user.directRewardDetails.length; i++) {
                    DirectRewardDetail storage detail = user.directRewardDetails[i];
                    
                    if (detail.releasedAmount > detail.claimedAmount) {
                        uint256 claimFromThis = detail.releasedAmount - detail.claimedAmount;
                        
                        uint256 usdtAmount = (claimFromThis * getHafPrice()) / PRICE_PRECISION;
                        _addRewardRecord(msg.sender, detail.fromUser, RewardType.Direct, usdtAmount, claimFromThis);
                        
                        detail.claimedAmount = detail.releasedAmount;
                        totalPendingDirect = totalPendingDirect + claimFromThis;
                    }
                }
            }
        }
        
        uint256 pendingShare = 0;
        if (user.shareRewardTotal > user.shareRewardClaimed) {
            pendingShare = user.shareRewardTotal - user.shareRewardClaimed;
        }
        
        user.directRewardClaimed = user.directRewardClaimed + totalPendingDirect;
        user.shareRewardClaimed = user.shareRewardClaimed + pendingShare;
       
        uint256 fee = (totalClaimableHaf * withdrawalFeeRate) / 100;
        uint256 amountAfterFee = totalClaimableHaf - fee;
        
        _updateOrderSettleTimes(msg.sender);

        _distributeHaf(msg.sender, amountAfterFee);

        globalStats.totalWithdrawnHaf = globalStats.totalWithdrawnHaf + amountAfterFee;
        globalStats.totalFeeCollectedHaf = globalStats.totalFeeCollectedHaf + fee;

        user.withdrawRecords.push(WithdrawRecord({
            timestamp: block.timestamp,
            hafAmount: amountAfterFee,
            fee: fee
        }));
    }

    function _distributeHaf(address _recipient, uint256 _amount) internal override {
        uint256 treasuryBalance = hafToken.getContractBalance();
        if (treasuryBalance < _amount) revert InsufficientBalance();
        hafToken.transferFromContract(_recipient, _amount);
        globalStats.totalHafDistributed = globalStats.totalHafDistributed + _amount;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setBtcAddress(string calldata _addr) external whenNotPaused {
        if (bytes(_addr).length == 0) revert InvalidAddress();
        userHashPowers[msg.sender].btcWithdrawalAddress = _addr;
    }

    function withdrawBtc(uint256 _amount) external whenNotPaused {
        if (_amount < minBtcWithdrawal) revert BelowMinimum();
        if (bytes(userHashPowers[msg.sender].btcWithdrawalAddress).length == 0) revert AddressNotSet();
        
        _settleBtcRewards(msg.sender);
        UserHashPower storage userHP = userHashPowers[msg.sender];
        
        uint256 available = _calcAvailableBtc(msg.sender);
        if (available < _amount) revert InsufficientBalance();
        
        
        uint256 orderId = btcWithdrawalOrders.length;
        btcWithdrawalOrders.push(BtcWithdrawalOrder(
            orderId,
            msg.sender,
            userHP.btcWithdrawalAddress,
            _amount,
            block.timestamp,
            BtcWithdrawalStatus.Pending
        ));
    }
    
    // ==================== LP流动性管理 ====================
    
    /**
     * @dev 添加流动性到LP池
     * @param _usdtAmount USDT数量
     * @param _hafAmount HAF数量
     * 
     * 首次调用时会初始化LP池并设定初始价格
     * 后续调用可以调整流动性和价格
     * 
     * 双金库互补模式：
     * - USDT: 从HashFi合约转出
     * - HAF: 优先用HAFToken合约余额，不足则从HashFi补充
     */
    function addLiquidity(uint256 _usdtAmount, uint256 _hafAmount) external onlyOwner {
        if (_usdtAmount > 0) {
            usdtToken.approve(address(hafToken), _usdtAmount);
        }
        if (_hafAmount > 0) {
            // 授权HAF给HAFToken，以便不足时可以从这里补充
            IERC20(address(hafToken)).approve(address(hafToken), _hafAmount);
        }
        hafToken.addLiquidity(_usdtAmount, _hafAmount);
    }
    
    // ==================== 创世节点接口（供Token合约调用）====================
    
    /**
     * @dev 获取活跃创世节点数量
     */
    function getActiveGenesisNodesCount() external view returns (uint256) {
        return activeGenesisNodes.length;
    }
    
    /**
     * @dev 根据索引获取活跃创世节点地址
     */
    function getActiveGenesisNodeAt(uint256 index) external view returns (address) {
        if (index >= activeGenesisNodes.length) return address(0);
        return activeGenesisNodes[index];
    }
    
    /**
     * @dev Token合约调用此函数分发创世节点USDT奖励
     * @param usdtAmount USDT数量
     */
    function distributeGenesisReward(uint256 usdtAmount) external {
        require(msg.sender == address(hafToken), "Only token contract");
        
        uint256 activeNodesCount = activeGenesisNodes.length;
        if (activeNodesCount == 0) return;
        
        // 添加到创世池并更新每节点奖励
        globalGenesisPool = globalGenesisPool + usdtAmount;
        accGenesisRewardPerNode = accGenesisRewardPerNode + (usdtAmount * 1e18) / activeNodesCount;
    }
    
    /**
     * @dev 获取LP交易对地址
     * @return LP交易对合约地址
     * 
     * 这个比getHafTokenAddress更有用，因为hafToken是public的可以直接访问
     * 但pancakePair需要通过这个函数获取
     */
    function getLpPairAddress() external view returns (address) {
        return hafToken.pancakePair();
    }
}