// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";


contract HashFi is ERC20, Ownable, ReentrancyGuard, Pausable {
    using SafeMath for uint256;

    // --- 外部合约依赖 ---
    IERC20 public usdtToken;

    // --- 代币经济模型变更 ---
    /**
     * @dev HAF代币的总供应量，固定为2亿。
     */
    uint256 public constant TOTAL_SUPPLY = 200_000_000 * 1e18;


    // --- 事件 ---
    event Staked(address indexed user, uint256 orderId, uint256 amount, uint8 level);
    event ReferrerBound(address indexed user, address indexed referrer);
    event Withdrawn(address indexed user, uint256 hafAmount, uint256 fee);
    event GenesisNodeApplied(address indexed user);
    event GenesisNodeApproved(address indexed user);
    event GenesisNodeRejected(address indexed user);
    event RewardsClaimed(address indexed user, uint256 staticRewards, uint256 dynamicRewards, uint256 genesisRewards);
    event PriceUpdated(uint256 newPrice);
    event Swapped(address indexed user, address indexed fromToken, address indexed toToken, uint256 fromAmount, uint256 toAmount);
    event TokensBurned(address indexed user, uint256 hafAmount, uint256 usdtAmount);
    event TeamLevelUpdated(address indexed user, uint8 oldLevel, uint8 newLevel);

    // 详细的收益记录事件
    enum RewardType { Static, Direct, Share, Team }
    event RewardDistributed(address indexed user, address indexed fromUser, RewardType rewardType, uint256 usdtAmount, uint256 hafAmount);


    // --- 数据结构 ---
    
    // 用于存储收益记录的结构体
    struct RewardRecord {
        uint256 timestamp;
        address fromUser;
        RewardType rewardType;
        uint256 usdtAmount;
        uint256 hafAmount;
    }

    struct User {
        address referrer;
        uint8 teamLevel; // V0-V5
        uint256 totalStakedAmount; // 个人总投资额
        uint256 teamTotalPerformance; // 个人伞下总业绩 (用于给上级计算小区业绩)
        address[] directReferrals; // 直接推荐的用户列表
        uint256[] orderIds; // 用户的订单ID列表

        bool isGenesisNode;
        uint256 genesisDividendsWithdrawn; // 已领取的创世节点分红 (USDT本位)

        // 动态奖励 (直推奖+分享奖)
        uint256 dynamicRewardTotal; // 累计获得的动态总奖励 (HAF本位)
        uint256 dynamicRewardReleased; // 已释放的动态奖励 (HAF本位)
        uint256 dynamicRewardStartTime; // 第一个动态奖励的开始时间
        uint256 dynamicRewardClaimed; // 已领取的动态奖励 (HAF本位)

        // 分享奖相关
        uint256 totalStaticOutput; // 个人所有订单累计产出的总静态收益 (USDT本位)
        
        // 收益记录
        RewardRecord[] rewardRecords;
    }

    struct Order {
        uint256 id;
        address user;
        uint8 level; // 1:青铜, 2:白银, 3:黄金, 4:钻石
        uint256 amount; // 质押的USDT数量 (18位小数)
        uint256 totalQuota; // 总释放额度 (USDT本位)
        uint256 releasedQuota; // 已释放额度 (USDT本位)
        uint256 startTime;
        uint256 lastSettleTime; // 上次结算收益的时间
        bool isCompleted;
    }

    struct StakingLevelInfo {
        uint256 minAmount;
        uint256 maxAmount;
        uint256 multiplier; // 出局倍数 (例如, 1.5倍 存为 150)
        uint256 dailyRate; // 日利率 (例如, 0.7% 存为 70, 单位: 万分之一)
    }

    struct TeamLevelInfo {
        uint256 requiredPerformance; // 达成需要的小区业绩 (USDT本位)
        uint256 accelerationBonus; // 静态收益加速释放比例 (%)
    }
    
    // ========== NEW: BTC矿池数据结构 ==========
    struct BtcMiningStats {
        uint256 totalHashrate;      // 总算力 (H/s)
        uint256 globalHashrate;     // 全网算力 (H/s)
        uint256 dailyRewardPerT;    // 每T日收益 (使用6位小数)
        uint256 currentDifficulty;  // 当前难度
        uint256 btcPrice;           // BTC币价 (使用6位小数，如 50000.50 表示为 50000500000)
        uint256 nextHalvingTime;    // 下次减产时间 (Unix timestamp)
        uint256 totalMined;         // 累计已挖 (BTC数量，使用18位小数)
        uint256 yesterdayMined;     // 昨日已挖 (BTC数量，使用18位小数)
        uint256 lastUpdateTime;     // 最后更新时间
    }
    
    // ========== NEW: 全局统计数据结构 ==========
    struct GlobalStatistics {
        uint256 totalDepositedUsdt;      // 总入金 (累计)
        uint256 totalWithdrawnHaf;       // 总提现HAF数量
        uint256 totalFeeCollectedHaf;    // 总手续费收入(HAF)
        uint256 totalHafDistributed;     // 总HAF分发量
        uint256 totalActiveUsers;        // 活跃用户数
        uint256 totalCompletedOrders;    // 已完成订单数
    }
    // ================================================
    
    // 团队成员信息结构体
    struct TeamMemberInfo {
        address memberAddress;
        uint8 teamLevel;
        uint256 totalStakedAmount;
        uint256 teamTotalPerformance;
    }


    // --- 状态变量 ---

    mapping(address => User) public users;
    Order[] public orders;

    // 价格与费用
    uint256 public hafPrice; // HAF的USDT价格, 使用18位小数精度
    uint256 public constant PRICE_PRECISION = 1e18;
    uint256 public withdrawalFeeRate = 5; // 提现手续费率, 5%
    uint256 public swapFeeRate = 1; // 闪兑手续费, 1%
    
    // ========== NEW: 价格自动上涨机制 ==========
    uint256 public lastPriceUpdateTime; // 上次价格更新时间
    uint256 public dailyPriceIncreaseRate = 1; // 每日涨幅 千分之一 = 0.1%
    bool public autoPriceUpdateEnabled = true; // 是否启用自动涨价
    // ================================================
    
    // ========== NEW: 测试网时间单位配置 ==========
    uint256 public TIME_UNIT; // 时间单位 (生产: 1 days, 测试: 3 minutes)
    uint256 public DYNAMIC_RELEASE_PERIOD; // 动态奖励释放周期 (生产: 100 days, 测试: 500 minutes)
    // ================================================

    // 配置信息
    mapping(uint8 => StakingLevelInfo) public stakingLevels;
    TeamLevelInfo[] public teamLevels; // index 0-5对应 V0-V5

    // 创世节点
    uint256 public genesisNodeCost = 5000 * 1e18;
    uint256 public constant GENESIS_NODE_EXIT_MULTIPLIER = 3;
    uint256 public globalGenesisPool; // 全局创世节点分红池 (USDT本位)
    uint256 public totalGenesisShares; // 总分红权数 (用于计算每份分红) - 已废弃，改用平均分配
    address[] public genesisNodes;
    address[] public activeGenesisNodes; // ========== NEW: 活跃的创世节点列表 ==========
    address[] public pendingGenesisApplications; // ========== NEW: 待审核申请列表 ==========
    mapping(address => bool) public genesisNodeApplications; // 待审核的创世节点申请
    mapping(address => bool) public isActiveGenesisNode; // ========== NEW: 节点是否活跃 ==========
    
    // ========== NEW: BTC矿池数据 ==========
    BtcMiningStats public btcStats;
    
    // ========== NEW: 全局统计数据 ==========
    GlobalStatistics public globalStats;
    // ================================================

    // --- 构造函数 ---
    constructor(address _usdtAddress, address _initialOwner) ERC20("Hash Fi Token", "HAF") Ownable(_initialOwner) {
        // ========== MODIFIED: 金库模型 ==========
        // 在合约创建时，将2亿HAF代币全部铸造到合约自身地址，作为金库。
        _mint(address(this), TOTAL_SUPPLY);
        // =====================================

        usdtToken = IERC20(_usdtAddress);
        hafPrice = 1 * PRICE_PRECISION; // 初始价格: 1 HAF = 1 USDT
        lastPriceUpdateTime = block.timestamp; // 初始化价格更新时间
        
        // ========== NEW: 根据chainID设置时间单位 ==========
        // Sepolia Testnet (chainID: 11155111) 使用3分钟作为时间单位
        // 主网使用1天作为时间单位
        if (block.chainid == 11155111) {
            TIME_UNIT = 3 minutes; // 测试网: 3分钟
            DYNAMIC_RELEASE_PERIOD = 50 minutes; // 测试网: 500分钟 (约8.3小时, 相当于100天的比例)
        } else {
            TIME_UNIT = 1 days; // 主网: 1天
            DYNAMIC_RELEASE_PERIOD = 100 days; // 主网: 100天
        }
        // ================================================

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
        
        // ========== NEW: 初始化BTC矿池数据 ==========
        // 初始值可以由管理员后续更新
        btcStats = BtcMiningStats({
            totalHashrate: 0,
            globalHashrate: 0,
            dailyRewardPerT: 0,
            currentDifficulty: 0,
            btcPrice: 0,
            nextHalvingTime: 0,
            totalMined: 0,
            yesterdayMined: 0,
            lastUpdateTime: block.timestamp
        });
        // ================================================
    }

    // --- 用户核心功能 ---
    
    // ========== NEW: 价格自动更新修饰器 ==========
    /**
     * @dev 在交易前自动检查并更新HAF价格(懒加载触发)
     */
    modifier autoUpdatePrice() {
        _updatePriceIfNeeded();
        _;
    }
    
    /**
     * @dev 内部函数:检查并更新价格
     */
    function _updatePriceIfNeeded() internal {
        if (!autoPriceUpdateEnabled) return;
        
        uint256 daysPassed = (block.timestamp - lastPriceUpdateTime) / TIME_UNIT;
        if (daysPassed > 0) {
            // 计算复利:每天涨千分之一
            for (uint i = 0; i < daysPassed; i++) {
                uint256 increase = hafPrice.mul(dailyPriceIncreaseRate).div(1000);
                hafPrice = hafPrice.add(increase);
            }
            lastPriceUpdateTime = lastPriceUpdateTime.add(daysPassed.mul(TIME_UNIT));
            emit PriceUpdated(hafPrice);
        }
    }
    // ================================================

    function bindReferrer(address _referrer) external whenNotPaused {
        User storage user = users[msg.sender];
        require(user.referrer == address(0), "Referrer already bound");
        // 允许绑定 owner 作为推荐人（即使没有投资），或者已经投资过的用户
        require(_referrer == owner() || users[_referrer].totalStakedAmount > 0, "Referrer does not exist");
        require(_referrer != msg.sender, "Cannot refer yourself");
        user.referrer = _referrer;
        users[_referrer].directReferrals.push(msg.sender);
        emit ReferrerBound(msg.sender, _referrer);
    }

    function stake(uint256 _amount) external nonReentrant whenNotPaused autoUpdatePrice {
        require(users[msg.sender].referrer != address(0), "Must bind a referrer first");
        uint8 level = _getStakingLevelByAmount(_amount);
        require(level > 0, "Invalid staking amount");

        _settleUserRewards(msg.sender);

        usdtToken.transferFrom(msg.sender, address(this), _amount);

        uint256 orderId = orders.length;
        uint256 quota = _amount.mul(stakingLevels[level].multiplier).div(100);
        
        orders.push(Order(orderId, msg.sender, level, _amount, quota, 0, block.timestamp, block.timestamp, false));
        User storage user = users[msg.sender];
        user.orderIds.push(orderId);
        user.totalStakedAmount = user.totalStakedAmount.add(_amount);

        // ========== NEW: 更新全局统计 ==========
        globalStats.totalDepositedUsdt = globalStats.totalDepositedUsdt.add(_amount);
        if (user.orderIds.length == 1) {
            // 首次质押，增加活跃用户数
            globalStats.totalActiveUsers = globalStats.totalActiveUsers.add(1);
        }
        // ================================================

        _updateAncestorsPerformanceAndRewards(msg.sender, _amount, level);
        emit Staked(msg.sender, orderId, _amount, level);
    }

    function applyForGenesisNode() external whenNotPaused {
        User storage user = users[msg.sender];
        require(user.totalStakedAmount > 0, "User must stake first");
        require(!user.isGenesisNode, "Already a genesis node");
        require(!genesisNodeApplications[msg.sender], "Application already pending");

        usdtToken.transferFrom(msg.sender, address(this), genesisNodeCost);
        
        // ========== MODIFIED: 改为待审核状态 ==========
        genesisNodeApplications[msg.sender] = true;
        pendingGenesisApplications.push(msg.sender); // 添加到待审核列表
        // ================================================

        emit GenesisNodeApplied(msg.sender);
    }

    function withdraw() external nonReentrant whenNotPaused autoUpdatePrice {
        _settleUserRewards(msg.sender);
        
        (uint256 pendingStaticHaf, uint256 pendingDynamicHaf, uint256 pendingGenesisHaf) = getClaimableRewards(msg.sender);
        uint256 totalClaimableHaf = pendingStaticHaf.add(pendingDynamicHaf).add(pendingGenesisHaf);
        require(totalClaimableHaf > 0, "No rewards to withdraw");

        User storage user = users[msg.sender];
        user.dynamicRewardClaimed = user.dynamicRewardClaimed.add(pendingDynamicHaf);
       
        uint256 fee = totalClaimableHaf.mul(withdrawalFeeRate).div(100);
        uint256 amountAfterFee = totalClaimableHaf.sub(fee);
        
        // ========== MODIFIED: 从金库分发 ==========
        // 不再是铸造，而是从合约金库转账给用户
        _distributeHaf(msg.sender, amountAfterFee);
        // =====================================
        
        // ========== NEW: 更新全局统计 ==========
        globalStats.totalWithdrawnHaf = globalStats.totalWithdrawnHaf.add(amountAfterFee);
        globalStats.totalFeeCollectedHaf = globalStats.totalFeeCollectedHaf.add(fee);
        // ================================================

        emit Withdrawn(msg.sender, amountAfterFee, fee);
    }
    
    // --- 闪兑功能 ---
    function swapUsdtToHaf(uint256 _usdtAmount) external nonReentrant whenNotPaused autoUpdatePrice {
        require(_usdtAmount > 0, "USDT amount must be positive");
        usdtToken.transferFrom(msg.sender, address(this), _usdtAmount);
        
        uint256 hafAmount = _usdtAmount.mul(PRICE_PRECISION).div(hafPrice);
        uint256 fee = hafAmount.mul(swapFeeRate).div(100);
        uint256 finalHafAmount = hafAmount.sub(fee);
        
        // ========== MODIFIED: 从金库分发 ==========
        _distributeHaf(msg.sender, finalHafAmount);
        // =====================================
        
        emit Swapped(msg.sender, address(usdtToken), address(this), _usdtAmount, finalHafAmount);
    }

    function swapHafToUsdt(uint256 _hafAmount) external nonReentrant whenNotPaused autoUpdatePrice {
        require(_hafAmount > 0, "HAF amount must be positive");
        
        // ========== MODIFIED: 回收至金库 ==========
        // 不再是销毁，而是将用户的HAF转回合约地址（金库）
        // 因为这是在代币合约内部调用，所以不需要用户approve
        _transfer(msg.sender, address(this), _hafAmount);
        // =====================================
        
        uint256 usdtAmount = _hafAmount.mul(hafPrice).div(PRICE_PRECISION);
        uint256 fee = usdtAmount.mul(swapFeeRate).div(100);
        uint256 finalUsdtAmount = usdtAmount.sub(fee);
        
        require(usdtToken.balanceOf(address(this)) >= finalUsdtAmount, "Insufficient USDT in contract");
        usdtToken.transfer(msg.sender, finalUsdtAmount);
        
        emit Swapped(msg.sender, address(this), address(usdtToken), _hafAmount, finalUsdtAmount);
    }

    
    // --- 结算核心逻辑 (用户驱动) ---

    function _settleUserRewards(address _user) internal {
        uint256[] memory orderIds = users[_user].orderIds;
        for (uint i = 0; i < orderIds.length; i++) {
            _settleStaticRewardForOrder(orderIds[i]);
        }

        if (users[_user].isGenesisNode) {
            _settleGenesisRewardForNode(_user);
        }
    }

    function _settleStaticRewardForOrder(uint256 _orderId) internal {
        Order storage order = orders[_orderId];
        if (order.isCompleted) {
            return;
        }

        // ========== FIXED: 按天数计算，而非连续时间 ==========
        uint256 daysPassed = (block.timestamp.sub(order.lastSettleTime)).div(TIME_UNIT);
        if (daysPassed == 0) return;

        User storage user = users[order.user];
        uint256 baseDailyRate = stakingLevels[order.level].dailyRate; // 70/80/90/100 (万分之一)
        uint256 accelerationBonus = teamLevels[user.teamLevel].accelerationBonus;
        uint256 actualDailyRate = baseDailyRate.mul(uint256(100).add(accelerationBonus)).div(100);
        
        // ✅ 正确逻辑: 每天释放总额度(USDT)的百分比
        // 例: 总额度300U，钻石1%日释放率，每天释放 = 300 * 100 / 10000 = 3 USDT
        uint256 dailyReleaseUsdt = order.totalQuota.mul(actualDailyRate).div(10000);
        uint256 totalReleaseUsdt = dailyReleaseUsdt.mul(daysPassed);
        
        // 检查是否超过总额度（烧伤多余部分）
        if (order.releasedQuota.add(totalReleaseUsdt) >= order.totalQuota) {
            totalReleaseUsdt = order.totalQuota.sub(order.releasedQuota);
            order.isCompleted = true;
            
            // ========== NEW: 更新全局统计 ==========
            globalStats.totalCompletedOrders = globalStats.totalCompletedOrders.add(1);
            // ================================================
        }

        order.releasedQuota = order.releasedQuota.add(totalReleaseUsdt);
        order.lastSettleTime = order.lastSettleTime.add(daysPassed.mul(TIME_UNIT)); // 精确到天
        // ================================================

        if (totalReleaseUsdt > 0) {
            uint256 userPart = totalReleaseUsdt.mul(90).div(100); // 90%给用户
            uint256 genesisPart = totalReleaseUsdt.sub(userPart); // 10%给创世节点池
            
            if (genesisPart > 0) {
                globalGenesisPool = globalGenesisPool.add(genesisPart);
            }
            
            // ========== FIXED: 只更新状态，不直接分发代币 ==========
            // 结算函数只负责计算收益并更新订单状态
            // 实际的代币分发由 withdraw() 函数统一处理
            // ================================================
            
            // 记录静态收益（基础部分）
            uint256 baseStaticUsdt = userPart;
            uint256 teamBonusUsdt = 0;
            
            // 如果有团队加速，单独记录团队奖励
            if (accelerationBonus > 0) {
                teamBonusUsdt = userPart.mul(accelerationBonus).div(uint256(100).add(accelerationBonus));
                baseStaticUsdt = userPart.sub(teamBonusUsdt);
                
                uint256 teamBonusHaf = teamBonusUsdt.mul(PRICE_PRECISION).div(hafPrice);
                _addRewardRecord(order.user, address(0), RewardType.Team, teamBonusUsdt, teamBonusHaf);
            }
            
            uint256 baseStaticHaf = baseStaticUsdt.mul(PRICE_PRECISION).div(hafPrice);
            _addRewardRecord(order.user, address(0), RewardType.Static, baseStaticUsdt, baseStaticHaf);

            user.totalStaticOutput = user.totalStaticOutput.add(userPart);
            _distributeShareRewards(order.user, userPart);
        }
    }
    
    function _settleGenesisRewardForNode(address _node) internal {
        User storage nodeUser = users[_node];
        uint256 maxDividend = genesisNodeCost.mul(GENESIS_NODE_EXIT_MULTIPLIER);
        
        // 检查节点是否已出局
        if (nodeUser.genesisDividendsWithdrawn >= maxDividend) {
            // ✅ 节点出局，从活跃列表移除
            if (isActiveGenesisNode[_node]) {
                _removeActiveGenesisNode(_node);
            }
            return;
        }

        if (globalGenesisPool == 0) return;
        
        // ✅ 计算活跃节点数量
        uint256 activeNodesCount = activeGenesisNodes.length;
        if (activeNodesCount == 0) return;
        
        // ✅ 平均分配分红池 - 每个节点分配相同金额
        uint256 claimableUsdt = globalGenesisPool.div(activeNodesCount);
        
        if (claimableUsdt > 0) {
            uint256 actualClaim = claimableUsdt;
            
            // 检查是否超过3倍上限（烧伤多余部分）
            if (nodeUser.genesisDividendsWithdrawn.add(claimableUsdt) > maxDividend) {
                actualClaim = maxDividend.sub(nodeUser.genesisDividendsWithdrawn);
            }

            nodeUser.genesisDividendsWithdrawn = nodeUser.genesisDividendsWithdrawn.add(actualClaim);
            globalGenesisPool = globalGenesisPool.sub(actualClaim);
            
            // 如果达到上限，从活跃列表移除
            if (nodeUser.genesisDividendsWithdrawn >= maxDividend) {
                _removeActiveGenesisNode(_node);
            }
            
            // ========== FIXED: 只更新状态，不直接分发代币 ==========
            // 结算函数只负责计算收益并更新状态
            // 实际的代币分发由 withdraw() 函数统一处理
            // ================================================
        }
    }
    
    /**
     * @dev 内部函数: 从活跃节点列表中移除节点
     */
    function _removeActiveGenesisNode(address _node) internal {
        if (!isActiveGenesisNode[_node]) return;
        
        isActiveGenesisNode[_node] = false;
        
        // 从数组中移除
        for (uint i = 0; i < activeGenesisNodes.length; i++) {
            if (activeGenesisNodes[i] == _node) {
                activeGenesisNodes[i] = activeGenesisNodes[activeGenesisNodes.length - 1];
                activeGenesisNodes.pop();
                break;
            }
        }
    }
    
    // --- 动态奖励逻辑 ---

    function _updateAncestorsPerformanceAndRewards(address _user, uint256 _amount, uint8 _level) internal {
        address currentUser = _user;
        address referrer = users[currentUser].referrer;

        uint256[] memory directRewardRates = _getDirectRewardRates();
        for (uint i = 0; i < 6 && referrer != address(0); i++) {
            uint8 referrerLevel = _getUserHighestLevel(referrer);
            uint256 receivableAmount = _calculateBurnableAmount(_amount, _level, referrerLevel);
            
            // ========== NEW: 实现燃烧机制 ==========
            if (receivableAmount < _amount && referrerLevel < 4) {
                // 跨级推荐,超额部分需要燃烧
                uint256 burnAmount = _amount.sub(receivableAmount);
                uint256 burnHafAmount = burnAmount.mul(PRICE_PRECISION).div(hafPrice);
                
                // 从金库转移到黑洞地址(0x000...dead)实现燃烧
                if (balanceOf(address(this)) >= burnHafAmount) {
                    _transfer(address(this), address(0x000000000000000000000000000000000000dEaD), burnHafAmount);
                    emit TokensBurned(_user, burnHafAmount, burnAmount);
                }
            }
            // ================================================
            
            uint256 rewardUsdt = receivableAmount.mul(directRewardRates[i]).div(100);
            
            if(rewardUsdt > 0) {
                uint256 rewardHaf = rewardUsdt.mul(PRICE_PRECISION).div(hafPrice);
                User storage referrerUser = users[referrer];
                referrerUser.dynamicRewardTotal = referrerUser.dynamicRewardTotal.add(rewardHaf);
                if (referrerUser.dynamicRewardStartTime == 0) {
                    referrerUser.dynamicRewardStartTime = block.timestamp;
                }
                _addRewardRecord(referrer, _user, RewardType.Direct, rewardUsdt, rewardHaf);
            }
            
            currentUser = referrer;
            referrer = users[currentUser].referrer;
        }

        currentUser = _user;
        referrer = users[currentUser].referrer;
        while(referrer != address(0)) {
            users[referrer].teamTotalPerformance = users[referrer].teamTotalPerformance.add(_amount);
            _updateUserTeamLevel(referrer);
            
            currentUser = referrer;
            referrer = users[currentUser].referrer;
        }
    }

    function _distributeShareRewards(address _user, uint256 _staticRewardUsdt) internal {
        address currentUser = _user;
        address referrer = users[currentUser].referrer;

        for (uint i = 0; i < 10 && referrer != address(0); i++) {
            User storage referrerUser = users[referrer];
            if (referrerUser.directReferrals.length > i) {
                uint256 rewardUsdt = _staticRewardUsdt.mul(5).div(100);
                uint8 userLevel = _getUserHighestLevel(_user);
                uint8 referrerLevel = _getUserHighestLevel(referrer);
                uint256 burnableBase = _calculateBurnableAmount(users[_user].totalStakedAmount, userLevel, referrerLevel);
                if(users[_user].totalStakedAmount > burnableBase){
                    rewardUsdt = rewardUsdt.mul(burnableBase).div(users[_user].totalStakedAmount);
                }

                if(rewardUsdt > 0){
                    uint256 rewardHaf = rewardUsdt.mul(PRICE_PRECISION).div(hafPrice);
                    referrerUser.dynamicRewardTotal = referrerUser.dynamicRewardTotal.add(rewardHaf);
                    if (referrerUser.dynamicRewardStartTime == 0) {
                        referrerUser.dynamicRewardStartTime = block.timestamp;
                    }
                    _addRewardRecord(referrer, _user, RewardType.Share, rewardUsdt, rewardHaf);
                }
            } else {
                break;
            }
            
            currentUser = referrer;
            referrer = users[currentUser].referrer;
        }
    }
    
    // --- 团队等级更新 ---

    function _updateUserTeamLevel(address _user) internal {
        User storage user = users[_user];
        if (user.directReferrals.length == 0) return;
        
        uint256 maxPerformance = 0;
        uint256 directReferralsTotalPerformance = 0;
        for(uint i = 0; i < user.directReferrals.length; i++){
            address directChild = user.directReferrals[i];
            uint256 childPerformance = users[directChild].totalStakedAmount.add(users[directChild].teamTotalPerformance);
            directReferralsTotalPerformance = directReferralsTotalPerformance.add(childPerformance);
            if(childPerformance > maxPerformance){
                maxPerformance = childPerformance;
            }
        }
        
        uint256 smallAreaPerformance = directReferralsTotalPerformance.sub(maxPerformance);
        uint8 oldLevel = user.teamLevel;
        
        for(uint8 i = 5; i > oldLevel; i--){
            if(smallAreaPerformance >= teamLevels[i].requiredPerformance){
                user.teamLevel = i;
                emit TeamLevelUpdated(_user, oldLevel, i);
                break;
            }
        }
    }
    
    // 内部函数，用于添加收益记录
    function _addRewardRecord(address _user, address _fromUser, RewardType _type, uint256 _usdtAmount, uint256 _hafAmount) internal {
        users[_user].rewardRecords.push(RewardRecord(
            block.timestamp,
            _fromUser,
            _type,
            _usdtAmount,
            _hafAmount
        ));
        emit RewardDistributed(_user, _fromUser, _type, _usdtAmount, _hafAmount);
    }


    // --- 视图函数 (View Functions for Frontend) ---
    
    function getUserInfo(address _user) external view returns (User memory, uint8, uint256, uint256) {
        User storage u = users[_user];
        uint8 highestLevel = _getUserHighestLevel(_user);
        
        uint256 maxP = 0;
        uint256 totalP = 0;
        for(uint i = 0; i < u.directReferrals.length; i++){
            address child = u.directReferrals[i];
            uint256 p = users[child].totalStakedAmount.add(users[child].teamTotalPerformance);
            totalP = totalP.add(p);
            if(p > maxP) maxP = p;
        }
        uint256 smallAreaP = totalP.sub(maxP);

        return (u, highestLevel, totalP, smallAreaP);
    }
    
    function getOrderInfo(uint256 _orderId) external view returns (Order memory) {
        return orders[_orderId];
    }
    
    function getClaimableRewards(address _user) public view returns (uint256 pendingStatic, uint256 pendingDynamic, uint256 pendingGenesis) {
        // ========== FIXED: 优化以避免Stack too deep错误 ==========
        pendingStatic = _calculatePendingStatic(_user);
        pendingDynamic = _calculatePendingDynamic(_user);
        pendingGenesis = _calculatePendingGenesis(_user);
    }
    
    /**
     * @dev 内部函数: 计算待领取的静态收益
     */
    function _calculatePendingStatic(address _user) internal view returns (uint256) {
        User storage user = users[_user];
        uint256 total = 0;
        
        for (uint i = 0; i < user.orderIds.length; i++) {
            Order storage order = orders[user.orderIds[i]];
            if (order.isCompleted) continue;
            
            uint256 daysPassed = (block.timestamp.sub(order.lastSettleTime)).div(TIME_UNIT);
            if (daysPassed == 0) continue;

            uint256 actualRate = stakingLevels[order.level].dailyRate
                .mul(uint256(100).add(teamLevels[user.teamLevel].accelerationBonus))
                .div(100);
            
            uint256 releaseUsdt = order.totalQuota.mul(actualRate).div(10000).mul(daysPassed);
            
            if (order.releasedQuota.add(releaseUsdt) >= order.totalQuota) {
                releaseUsdt = order.totalQuota.sub(order.releasedQuota);
            }
            
            total = total.add(releaseUsdt.mul(90).div(100).mul(PRICE_PRECISION).div(hafPrice));
        }
        
        return total;
    }
    
    /**
     * @dev 内部函数: 计算待领取的动态收益
     */
    function _calculatePendingDynamic(address _user) internal view returns (uint256) {
        User storage user = users[_user];
        
        if (user.dynamicRewardTotal <= user.dynamicRewardClaimed) {
            return 0;
        }
        
        uint256 totalReleased = user.dynamicRewardTotal
            .mul(block.timestamp.sub(user.dynamicRewardStartTime))
            .div(DYNAMIC_RELEASE_PERIOD);
            
        if (totalReleased > user.dynamicRewardTotal) {
            totalReleased = user.dynamicRewardTotal;
        }
        
        if (totalReleased > user.dynamicRewardClaimed) {
            return totalReleased.sub(user.dynamicRewardClaimed);
        }
        
        return 0;
    }
    
    /**
     * @dev 内部函数: 计算待领取的创世节点收益
     */
    function _calculatePendingGenesis(address _user) internal view returns (uint256) {
        User storage user = users[_user];
        
        if (!user.isGenesisNode) {
            return 0;
        }
        
        uint256 maxDividend = genesisNodeCost.mul(GENESIS_NODE_EXIT_MULTIPLIER);
        if (user.genesisDividendsWithdrawn >= maxDividend || globalGenesisPool == 0) {
            return 0;
        }
        
        uint256 activeNodesCount = activeGenesisNodes.length;
        if (activeNodesCount == 0) {
            return 0;
        }
        
        uint256 claimableUsdt = globalGenesisPool.div(activeNodesCount);
        if (user.genesisDividendsWithdrawn.add(claimableUsdt) > maxDividend) {
            claimableUsdt = maxDividend.sub(user.genesisDividendsWithdrawn);
        }
        
        return claimableUsdt.mul(PRICE_PRECISION).div(hafPrice);
        // ================================================
    }
    
    function getUserOrders(address _user) external view returns (Order[] memory) {
        uint256[] memory orderIds = users[_user].orderIds;
        Order[] memory userOrders = new Order[](orderIds.length);
        for(uint i = 0; i < orderIds.length; i++) {
            userOrders[i] = orders[orderIds[i]];
        }
        return userOrders;
    }
    
    function getRewardRecords(address _user) external view returns (RewardRecord[] memory) {
        return users[_user].rewardRecords;
    }
    
    function getDirectReferrals(address _user) external view returns (TeamMemberInfo[] memory) {
        address[] memory directReferrals = users[_user].directReferrals;
        TeamMemberInfo[] memory members = new TeamMemberInfo[](directReferrals.length);

        for (uint i = 0; i < directReferrals.length; i++) {
            User storage member = users[directReferrals[i]];
            members[i] = TeamMemberInfo(
                directReferrals[i],
                member.teamLevel,
                member.totalStakedAmount,
                member.teamTotalPerformance
            );
        }
        return members;
    }

    // ========== NEW: 懒加载查询函数 ==========
    
    /**
     * @dev 获取某个订单的待释放静态收益(不结算,纯计算)
     */
    function getOrderPendingReward(uint256 _orderId) external view returns (uint256 pendingUsdt, uint256 pendingHaf) {
        Order storage order = orders[_orderId];
        if (order.isCompleted) {
            return (0, 0);
        }

        User storage user = users[order.user];
        // ✅ 按天数计算
        uint256 daysPassed = (block.timestamp.sub(order.lastSettleTime)).div(TIME_UNIT);
        if (daysPassed == 0) return (0, 0);

        uint256 baseDailyRate = stakingLevels[order.level].dailyRate;
        uint256 accelerationBonus = teamLevels[user.teamLevel].accelerationBonus;
        uint256 actualDailyRate = baseDailyRate.mul(uint256(100).add(accelerationBonus)).div(100);
        
        // ✅ 每天释放总额度的百分比
        uint256 dailyReleaseUsdt = order.totalQuota.mul(actualDailyRate).div(10000);
        uint256 totalReleaseUsdt = dailyReleaseUsdt.mul(daysPassed);
        
        if (order.releasedQuota.add(totalReleaseUsdt) >= order.totalQuota) {
            totalReleaseUsdt = order.totalQuota.sub(order.releasedQuota);
        }

        uint256 userPart = totalReleaseUsdt.mul(90).div(100);
        uint256 rewardHaf = userPart.mul(PRICE_PRECISION).div(hafPrice);
        
        return (userPart, rewardHaf);
    }
    
    /**
     * @dev 获取用户的推荐人统计(按等级分类)
     */
    function getUserReferralStats(address _user) external view returns (
        uint256 totalReferrals,
        uint256 bronzeCount,
        uint256 silverCount,
        uint256 goldCount,
        uint256 diamondCount
    ) {
        address[] memory directReferrals = users[_user].directReferrals;
        totalReferrals = directReferrals.length;
        
        for (uint i = 0; i < directReferrals.length; i++) {
            uint8 level = _getUserHighestLevel(directReferrals[i]);
            if (level == 1) bronzeCount++;
            else if (level == 2) silverCount++;
            else if (level == 3) goldCount++;
            else if (level == 4) diamondCount++;
        }
        
        return (totalReferrals, bronzeCount, silverCount, goldCount, diamondCount);
    }
    
    /**
     * @dev 获取用户团队业绩详情
     */
    function getTeamPerformanceDetails(address _user) external view returns (
        uint256 totalPerformance,
        uint256 largestArea,
        uint256 smallArea,
        uint256 directReferralsCount
    ) {
        User storage user = users[_user];
        directReferralsCount = user.directReferrals.length;
        
        uint256 maxP = 0;
        uint256 totalP = 0;
        for(uint i = 0; i < user.directReferrals.length; i++){
            address child = user.directReferrals[i];
            uint256 p = users[child].totalStakedAmount.add(users[child].teamTotalPerformance);
            totalP = totalP.add(p);
            if(p > maxP) maxP = p;
        }
        
        return (user.teamTotalPerformance, maxP, totalP.sub(maxP), directReferralsCount);
    }
    
    /**
     * @dev 获取全局统计数据
     */
    function getGlobalStats() external view returns (
        uint256 totalStakedUsdt,
        uint256 totalOrders,
        uint256 totalGenesisNodesCount,
        uint256 currentHafPrice,
        uint256 contractUsdtBalance,
        uint256 contractHafBalance,
        GlobalStatistics memory statistics
    ) {
        totalOrders = orders.length;
        totalGenesisNodesCount = genesisNodes.length;
        currentHafPrice = hafPrice;
        contractUsdtBalance = usdtToken.balanceOf(address(this));
        contractHafBalance = balanceOf(address(this));
        
        // 计算当前活跃质押金额(未完成订单)
        for (uint i = 0; i < orders.length; i++) {
            if (!orders[i].isCompleted) {
                totalStakedUsdt = totalStakedUsdt.add(orders[i].amount);
            }
        }
        
        statistics = globalStats;
        
        return (totalStakedUsdt, totalOrders, totalGenesisNodesCount, currentHafPrice, contractUsdtBalance, contractHafBalance, statistics);
    }
    
    /**
     * @dev 获取按类型筛选的收益记录
     */
    function getRewardRecordsByType(address _user, RewardType _type) external view returns (RewardRecord[] memory) {
        RewardRecord[] storage allRecords = users[_user].rewardRecords;
        
        // 先统计符合条件的数量
        uint256 count = 0;
        for (uint i = 0; i < allRecords.length; i++) {
            if (allRecords[i].rewardType == _type) {
                count++;
            }
        }
        
        // 创建结果数组
        RewardRecord[] memory filteredRecords = new RewardRecord[](count);
        uint256 index = 0;
        for (uint i = 0; i < allRecords.length; i++) {
            if (allRecords[i].rewardType == _type) {
                filteredRecords[index] = allRecords[i];
                index++;
            }
        }
        
        return filteredRecords;
    }
    
    // ================================================

    
    // --- 辅助与内部函数 ---

    // ========== NEW: 金库分发函数 ==========
    /**
     * @dev 内部函数，用于从合约金库向指定地址分发HAF代币。
     * @param _recipient 接收代币的地址
     * @param _amount 要分发的代币数量
     */
    function _distributeHaf(address _recipient, uint256 _amount) internal {
        uint256 treasuryBalance = balanceOf(address(this));
        require(treasuryBalance >= _amount, "HashFi: Insufficient HAF in treasury for distribution");
        _transfer(address(this), _recipient, _amount);
        
        // ========== NEW: 更新全局统计 ==========
        globalStats.totalHafDistributed = globalStats.totalHafDistributed.add(_amount);
        // ================================================
    }
    // =====================================

    function _getStakingLevelByAmount(uint256 _amount) internal view returns (uint8) {
        for (uint8 i = 1; i <= 4; i++) {
            if (_amount >= stakingLevels[i].minAmount && _amount <= stakingLevels[i].maxAmount) {
                return i;
            }
        }
        return 0;
    }

    function _getUserHighestLevel(address _user) internal view returns (uint8) {
        uint8 maxLevel = 0;
        uint256[] memory orderIds = users[_user].orderIds;
        for (uint i = 0; i < orderIds.length; i++) {
            if (orders[orderIds[i]].level > maxLevel) {
                maxLevel = orders[orderIds[i]].level;
            }
        }
        return maxLevel;
    }

    function _calculateBurnableAmount(uint256 _originalAmount, uint8 _investorLevel, uint8 _referrerLevel) internal view returns (uint256) {
        if (_referrerLevel >= _investorLevel || _referrerLevel == 4) {
            return _originalAmount;
        }
        if (_originalAmount <= stakingLevels[_referrerLevel].maxAmount) {
            return _originalAmount;
        }
        return stakingLevels[_referrerLevel].maxAmount;
    }

    function _getDirectRewardRates() internal pure returns (uint256[] memory) {
        uint256[] memory rates = new uint256[](6);
        rates[0] = 5; rates[1] = 3; rates[2] = 1; rates[3] = 1; rates[4] = 1; rates[5] = 1;
        return rates;
    }

    // --- 后台管理函数 ---

    // 创世节点审核
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
        
        // totalGenesisShares 不再使用，改为平均分配
        
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
    
    /**
     * @dev 内部函数: 从待审核列表移除
     */
    function _removeFromPendingApplications(address _applicant) internal {
        for (uint i = 0; i < pendingGenesisApplications.length; i++) {
            if (pendingGenesisApplications[i] == _applicant) {
                pendingGenesisApplications[i] = pendingGenesisApplications[pendingGenesisApplications.length - 1];
                pendingGenesisApplications.pop();
                break;
            }
        }
    }

    function setHafPrice(uint256 _newPrice) external onlyOwner {
        require(_newPrice > 0, "Price must be positive");
        hafPrice = _newPrice;
        lastPriceUpdateTime = block.timestamp; // 重置更新时间
        emit PriceUpdated(_newPrice);
    }
    
    /**
     * @dev 设置每日价格涨幅(千分比)
     */
    function setDailyPriceIncreaseRate(uint256 _rate) external onlyOwner {
        require(_rate <= 100, "Rate too high"); // 最高10%每天
        dailyPriceIncreaseRate = _rate;
    }
    
    /**
     * @dev 启用/禁用自动涨价
     */
    function setAutoPriceUpdate(bool _enabled) external onlyOwner {
        autoPriceUpdateEnabled = _enabled;
    }
    
    /**
     * @dev 手动触发价格更新(公开函数,任何人都可调用)
     */
    function updatePrice() external {
        _updatePriceIfNeeded();
    }

    function setWithdrawalFee(uint256 _newFeeRate) external onlyOwner {
        require(_newFeeRate <= 100, "Fee rate cannot exceed 100%");
        withdrawalFeeRate = _newFeeRate;
    }
    
    // ========== NEW: 管理员控制函数 ==========
    
    /**
     * @dev 修改质押级别参数
     */
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
    
    /**
     * @dev 修改团队级别要求
     */
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
    
    /**
     * @dev 强制结算某个用户的收益(管理员操作)
     */
    function forceSettleUser(address _user) external onlyOwner {
        _settleUserRewards(_user);
    }
    
    /**
     * @dev 手动调整用户团队等级(特殊情况)
     */
    function setUserTeamLevel(address _user, uint8 _level) external onlyOwner {
        require(_level >= 0 && _level <= 5, "Invalid team level");
        uint8 oldLevel = users[_user].teamLevel;
        users[_user].teamLevel = _level;
        emit TeamLevelUpdated(_user, oldLevel, _level);
    }
    
    /**
     * @dev 获取所有创世节点的详细信息
     */
    function getAllGenesisNodesInfo() external view onlyOwner returns (
        address[] memory nodes,
        uint256[] memory totalDividends,
        uint256[] memory withdrawn
    ) {
        uint256 length = genesisNodes.length;
        nodes = new address[](length);
        totalDividends = new uint256[](length);
        withdrawn = new uint256[](length);
        
        uint256 maxDividend = genesisNodeCost.mul(GENESIS_NODE_EXIT_MULTIPLIER);
        
        for (uint i = 0; i < length; i++) {
            nodes[i] = genesisNodes[i];
            totalDividends[i] = maxDividend;
            withdrawn[i] = users[genesisNodes[i]].genesisDividendsWithdrawn;
        }
        
        return (nodes, totalDividends, withdrawn);
    }
    
    /**
     * @dev 设置创世节点费用
     */
    function setGenesisNodeCost(uint256 _newCost) external onlyOwner {
        require(_newCost > 0, "Cost must be positive");
        genesisNodeCost = _newCost;
    }
    
    /**
     * @dev 设置闪兑手续费率
     */
    function setSwapFee(uint256 _newFeeRate) external onlyOwner {
        require(_newFeeRate <= 100, "Fee rate cannot exceed 100%");
        swapFeeRate = _newFeeRate;
    }
    
    // ========== NEW: BTC矿池数据管理 ==========
    
    /**
     * @dev 更新BTC矿池统计数据（后台管理员调用）
     */
    function updateBtcStats(
        uint256 _totalHashrate,
        uint256 _globalHashrate,
        uint256 _dailyRewardPerT,
        uint256 _currentDifficulty,
        uint256 _btcPrice,
        uint256 _nextHalvingTime
    ) external onlyOwner {
        btcStats.totalHashrate = _totalHashrate;
        btcStats.globalHashrate = _globalHashrate;
        btcStats.dailyRewardPerT = _dailyRewardPerT;
        btcStats.currentDifficulty = _currentDifficulty;
        btcStats.btcPrice = _btcPrice;
        btcStats.nextHalvingTime = _nextHalvingTime;
        btcStats.lastUpdateTime = block.timestamp;
    }
    
    /**
     * @dev 更新累计已挖数量（后台每日自动增加）
     */
    function updateTotalMined(uint256 _increment) external onlyOwner {
        btcStats.totalMined = btcStats.totalMined.add(_increment);
        btcStats.yesterdayMined = _increment;
        btcStats.lastUpdateTime = block.timestamp;
    }
    
    /**
     * @dev 获取BTC矿池数据
     */
    function getBtcStats() external view returns (BtcMiningStats memory) {
        return btcStats;
    }
    
    // ========== NEW: 创世节点查询函数 ==========
    
    /**
     * @dev 获取所有待审核的创世节点申请
     */
    function getPendingGenesisApplications() external view onlyOwner returns (address[] memory) {
        return pendingGenesisApplications;
    }
    
    /**
     * @dev 检查地址是否有待审核的申请
     */
    function isApplicationPending(address _user) external view returns (bool) {
        return genesisNodeApplications[_user];
    }
    
    /**
     * @dev 获取活跃创世节点列表
     */
    function getActiveGenesisNodes() external view returns (address[] memory) {
        return activeGenesisNodes;
    }
    
    /**
     * @dev 获取所有创世节点（包括已出局的）
     */
    function getAllGenesisNodes() external view returns (address[] memory) {
        return genesisNodes;
    }
    
    // ================================================
    
    // ================================================
    
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdrawToken(address _tokenAddress, uint256 _amount) external onlyOwner {
        require(_tokenAddress != address(0), "Token address cannot be zero");
        IERC20 token = IERC20(_tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        require(_amount > 0, "Amount must be greater than zero");
        require(balance >= _amount, "Insufficient token balance in contract");
        
        token.transfer(owner(), _amount);
    }
}