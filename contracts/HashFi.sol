// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./HashFiAdmin.sol";
import "./HashFiView.sol";

/**
 * @title HashFi
 * @dev 主合约，整合所有模块功能。
 * 这是唯一需要部署的合约。
 * 它继承了：
 * - HashFiAdmin: 管理员功能 (继承了 HashFiLogic -> HashFiStorage)
 * - HashFiView: 公众视图功能 (继承了 HashFiLogic -> HashFiStorage)
 * - ERC20: 实现 HAF 代币标准
 * - ReentrancyGuard: 防重入攻击
 * - Pausable: 合约暂停功能
 */
contract HashFi is HashFiAdmin, HashFiView, ERC20, ReentrancyGuard, Pausable {

    constructor(address _usdtAddress, address _initialOwner) 
        ERC20("Hash Fi Token", "HAF") 
        Ownable(_initialOwner) 
    {
        _mint(address(this), TOTAL_SUPPLY);

        usdtToken = IERC20(_usdtAddress);
        hafPrice = 1 * PRICE_PRECISION;
        lastPriceUpdateTime = block.timestamp;

        if (block.chainid == 97) {
            TIME_UNIT = 10 minutes; 
            DYNAMIC_RELEASE_PERIOD = 100 minutes; 
        } else {
            TIME_UNIT = 1 days; // 主网: 1天
            DYNAMIC_RELEASE_PERIOD = 100 days; // 主网: 100天
        }

        // 初始化质押级别
        stakingLevels[1] = StakingLevelInfo(100 * 1e18, 499 * 1e18, 150, 70);
        stakingLevels[2] = StakingLevelInfo(500 * 1e18, 999 * 1e18, 200, 80);
        stakingLevels[3] = StakingLevelInfo(1000 * 1e18, 2999 * 1e18, 250, 90);
        stakingLevels[4] = StakingLevelInfo(3000 * 1e18, type(uint256).max, 300, 100);

        // 初始化团队级别 (V0 - V5)
        teamLevels.push(TeamLevelInfo(0, 0)); // V0
        teamLevels.push(TeamLevelInfo(5000 * 1e18, 5)); // V1
        teamLevels.push(TeamLevelInfo(20000 * 1e18, 10)); // V2
        teamLevels.push(TeamLevelInfo(100000 * 1e18, 15)); // V3
        teamLevels.push(TeamLevelInfo(300000 * 1e18, 20)); // V4
        teamLevels.push(TeamLevelInfo(1000000 * 1e18, 25));// V5
    }

    // --- 公共外部函数 (用户入口) ---

    /**
     * @dev 绑定推荐人
     */
    function bindReferrer(address _referrer) external whenNotPaused {
        User storage user = users[msg.sender];
        require(user.referrer == address(0), "Referrer already bound");
        
        if (msg.sender == owner()) {
            user.referrer = address(0x0000000000000000000000000000000000000001);
            emit ReferrerBound(msg.sender, address(0x0000000000000000000000000000000000000001));
            return;
        }

        require(_referrer == owner() || users[_referrer].totalStakedAmount > 0, "Referrer does not exist");
        require(_referrer != msg.sender, "Cannot refer yourself");
        user.referrer = _referrer;
        users[_referrer].directReferrals.push(msg.sender);
        emit ReferrerBound(msg.sender, _referrer);
    }

    /**
     * @dev 质押 USDT
     */
    function stake(uint256 _amount) external nonReentrant whenNotPaused autoUpdatePrice {
        require(users[msg.sender].referrer != address(0), "Must bind a referrer first");
        uint8 level = _getStakingLevelByAmount(_amount);
        require(level > 0, "Invalid staking amount");

        usdtToken.transferFrom(msg.sender, address(this), _amount);

        uint256 orderId = orders.length;
        uint256 baseQuota = (_amount * stakingLevels[level].multiplier) / 100;
        
        // 用户实际能获得90%，10%分给创世节点池
        uint256 quota = (baseQuota * 90) / 100; // 用户实际可得的USDT额度
        uint256 quotaHaf = (quota * PRICE_PRECISION) / hafPrice; // 对应的HAF数量
        
        orders.push(Order(orderId, msg.sender, level, _amount, quota, 0, quotaHaf, 0, block.timestamp, block.timestamp, false));
        User storage user = users[msg.sender];
        user.orderIds.push(orderId);
        user.totalStakedAmount = user.totalStakedAmount + _amount;

        globalStats.totalDepositedUsdt = globalStats.totalDepositedUsdt + _amount;
        if (user.orderIds.length == 1) {
            globalStats.totalActiveUsers = globalStats.totalActiveUsers + 1;
        }

        // ✅ 更新上级业绩和发放直推奖（仅累加，不记录）
        _updateAncestorsPerformanceAndRewards(msg.sender, _amount, level);
        
        emit Staked(msg.sender, orderId, _amount, level);
    }

    /**
     * @dev 申请创世节点
     */
    function applyForGenesisNode() external nonReentrant whenNotPaused {
        User storage user = users[msg.sender];
        require(user.totalStakedAmount > 0, "User must stake first");
        require(!user.isGenesisNode, "Already a genesis node");
        require(!genesisNodeApplications[msg.sender], "Application already pending");

        usdtToken.transferFrom(msg.sender, address(this), genesisNodeCost);
        
        genesisNodeApplications[msg.sender] = true;
        pendingGenesisApplications.push(msg.sender); 

        emit GenesisNodeApplied(msg.sender);
    }

    /**
     * @dev 提取奖励
     */
    function withdraw() external nonReentrant whenNotPaused autoUpdatePrice {
        _updateDirectRewardRelease(msg.sender);
        (uint256 pendingStaticHaf, uint256 pendingDynamicHaf, uint256 pendingGenesisHaf) = getClaimableRewards(msg.sender);
        
        _settleUserRewards(msg.sender);
        uint256 totalClaimableHaf = pendingStaticHaf + pendingDynamicHaf + pendingGenesisHaf;
        require(totalClaimableHaf > 0, "No rewards to withdraw");

        User storage user = users[msg.sender];
        
        uint256 pendingDirect = 0;
        if (user.directRewardTotal > user.directRewardClaimed) {
            if (user.directRewardReleased > user.directRewardClaimed) {
                pendingDirect = user.directRewardReleased - user.directRewardClaimed;
            }
        }
        uint256 pendingShare = 0;
        if (user.shareRewardTotal > user.shareRewardClaimed) {
            pendingShare = user.shareRewardTotal - user.shareRewardClaimed;
        }
        
        if (pendingDirect > 0) {
            uint256 directUsdt = (pendingDirect * hafPrice) / PRICE_PRECISION;
            _addRewardRecord(msg.sender, address(0), RewardType.Direct, directUsdt, pendingDirect);
        }
        
        user.directRewardClaimed = user.directRewardClaimed + pendingDirect;
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

        emit Withdrawn(msg.sender, amountAfterFee, fee);
    }
    
    /**
     * @dev 闪兑: HAF <-> USDT
     * @param _tokenIn 支付的代币地址 (HAF or USDT)
     * @param _amountIn 支付的数量
     */
    function swap(address _tokenIn, uint256 _amountIn) external nonReentrant whenNotPaused autoUpdatePrice {
        require(_amountIn > 0, "Amount must be positive");
        
        address _tokenOut;
        uint256 _amountOut;

        if (_tokenIn == address(usdtToken)) {
            // Case: USDT -> HAF
            _tokenOut = address(this); // HAF token
            
            usdtToken.transferFrom(msg.sender, address(this), _amountIn);
            
            uint256 hafAmount = (_amountIn * PRICE_PRECISION) / hafPrice;
            uint256 fee = (hafAmount * swapFeeRate) / 100;
            _amountOut = hafAmount - fee;
            
            _distributeHaf(msg.sender, _amountOut);

        } else if (_tokenIn == address(this)) {
            // Case: HAF -> USDT
            _tokenOut = address(usdtToken);

            _transfer(msg.sender, address(this), _amountIn);
            
            uint256 usdtAmount = (_amountIn * hafPrice) / PRICE_PRECISION;
            uint256 fee = (usdtAmount * swapFeeRate) / 100;
            _amountOut = usdtAmount - fee;
            
            require(usdtToken.balanceOf(address(this)) >= _amountOut, "Insufficient USDT in contract");
            usdtToken.transfer(msg.sender, _amountOut);
            
        } else {
            revert("Invalid swap token");
        }

        emit Swapped(msg.sender, _tokenIn, _tokenOut, _amountIn, _amountOut);
    }


    /**
     * @dev (内部) 从合约金库分发HAF代币
     * 重写 HashFiLogic 中的 virtual 函数，使用 ERC20 的 _transfer 实现
     */
    function _distributeHaf(address _recipient, uint256 _amount) internal override {
        uint256 treasuryBalance = balanceOf(address(this));
        require(treasuryBalance >= _amount, "HashFi: Insufficient HAF in treasury for distribution");
        _transfer(address(this), _recipient, _amount);
        globalStats.totalHafDistributed = globalStats.totalHafDistributed + _amount;
    }

    /**
     * @dev 重写 Pausable 的 _pause 函数
     */
    function pause() external override onlyOwner {
        _pause();
    }

    /**
     * @dev 重写 Pausable 的 _unpause 函数
     */
    function unpause() external override onlyOwner {
        _unpause();
    }
}

