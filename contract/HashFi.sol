// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";


contract HashFi is ERC20, Ownable, ReentrancyGuard, Pausable {
    using SafeMath for uint256;

    IERC20 private usdtToken;

    uint256 private constant TOTAL_SUPPLY = 200_000_000 * 1e18;

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
    event RewardBurned(address indexed referrer, address indexed investor, uint256 fullRewardUsdt, uint256 actualRewardUsdt, uint256 burnedUsdt);

    /**
     * @dev 奖励类型枚举
     * Static  - 静态奖：基础每日释放收益（0.7%-1%日利率）
     * Direct  - 直推奖（推荐奖）：1-6代推荐奖励（一代5%、二代3%、三至六代1%）（DYNAMIC_RELEASE_PERIOD线性释放，主网100天，测试网10个时间单位）（有烧伤机制）
     * Share   - 分享奖：最多10代，伞下静态收益的5%（立即可提取）（无烧伤机制）
     * Team    - 团队奖：V1-V5等级，自身静态收益加速5%-25%
     * Genesis - 创世节点奖：全网静态收益10%的均分奖励
     */
    enum RewardType { Static, Direct, Share, Team, Genesis }
    
    struct RewardRecord {
        uint256 timestamp;
        address fromUser;
        RewardType rewardType;
        uint256 usdtAmount;
        uint256 hafAmount;
    }
    
    struct WithdrawRecord {
        uint256 timestamp;
        uint256 hafAmount;
        uint256 fee;
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

        // 直推奖励（DYNAMIC_RELEASE_PERIOD线性释放）
        uint256 directRewardTotal; // 累计获得的直推奖总额 (HAF本位)
        uint256 directRewardReleased; // 已释放的直推奖励 (HAF本位)
        uint256 lastDirectUpdateTime; // 上次更新直推奖励释放的时间
        uint256 directRewardClaimed; // 已领取的直推奖励 (HAF本位)

        // 分享奖励（立即可提取）
        uint256 shareRewardTotal; // 累计获得的分享奖总额 (HAF本位)
        uint256 shareRewardClaimed; // 已领取的分享奖励 (HAF本位)

        // 分享奖相关
        uint256 totalStaticOutput; // 个人所有订单累计产出的总静态收益 (USDT本位)
        
        // 收益记录
        RewardRecord[] rewardRecords; // 收益记录数组
        WithdrawRecord[] withdrawRecords; // 提现记录数组
    }

    struct Order {
        uint256 id;
        address user;
        uint8 level; // 1:青铜, 2:白银, 3:黄金, 4:钻石
        uint256 amount; // 质押的USDT数量 (18位小数)
        uint256 totalQuota; // 总释放额度 (USDT本位)
        uint256 releasedQuota; // 已释放额度 (USDT本位)
        uint256 totalQuotaHaf; // 总释放额度 (HAF数量) - 用于准确判断出局
        uint256 releasedHaf; // 已释放HAF数量 - 用于准确判断出局
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
    
    // ========== 价格自动上涨机制 ==========
    uint256 private lastPriceUpdateTime; // 上次价格更新时间（内部使用）
    uint256 public dailyPriceIncreaseRate = 1; // 每日涨幅 千分之一 = 0.1%
    bool public autoPriceUpdateEnabled = true; // 是否启用自动涨价
    // ================================================
    
    // ========== 测试网时间单位配置 ==========
    uint256 public TIME_UNIT; // 时间单位 
    uint256 public DYNAMIC_RELEASE_PERIOD; // 动态奖励释放周期
    // ================================================

    // 配置信息
    mapping(uint8 => StakingLevelInfo) public stakingLevels;
    TeamLevelInfo[] public teamLevels;

    // 创世节点
    uint256 public genesisNodeCost = 5000 * 1e18;
    uint256 public constant GENESIS_NODE_EXIT_MULTIPLIER = 3;
    uint256 public globalGenesisPool; // 全局创世节点分红池 (USDT本位)
    uint256 private totalGenesisShares; // 创世节点总份额（内部使用）
    address[] private genesisNodes; // 所有创世节点列表（使用 getAllGenesisNodes() 访问）
    address[] private activeGenesisNodes; // 活跃创世节点列表（使用 getActiveGenesisNodes() 访问）
    address[] private pendingGenesisApplications; // 待审核申请（使用 getPendingGenesisApplications() 访问）
    mapping(address => bool) public genesisNodeApplications; 
    mapping(address => bool) public isActiveGenesisNode;
    
    GlobalStatistics public globalStats;

    constructor(address _usdtAddress, address _initialOwner) ERC20("Hash Fi Token", "HAF") Ownable(_initialOwner) {

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

    /**
     * @dev 在交易前自动检查并更新HAF价格(懒加载触发)
     */
    modifier autoUpdatePrice() {
        if (autoPriceUpdateEnabled) {
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
        _;
    }
    // ================================================

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

    function stake(uint256 _amount) external nonReentrant whenNotPaused autoUpdatePrice {
        require(users[msg.sender].referrer != address(0), "Must bind a referrer first");
        uint8 level = _getStakingLevelByAmount(_amount);
        require(level > 0, "Invalid staking amount");

        usdtToken.transferFrom(msg.sender, address(this), _amount);

        uint256 orderId = orders.length;
        uint256 quota = _amount.mul(stakingLevels[level].multiplier).div(100);
        
        // 计算总释放HAF额度：quota(USDT) / 当前HAF价格
        uint256 quotaHaf = quota.mul(PRICE_PRECISION).div(hafPrice);
        
        orders.push(Order(orderId, msg.sender, level, _amount, quota, 0, quotaHaf, 0, block.timestamp, block.timestamp, false));
        User storage user = users[msg.sender];
        user.orderIds.push(orderId);
        user.totalStakedAmount = user.totalStakedAmount.add(_amount);

        globalStats.totalDepositedUsdt = globalStats.totalDepositedUsdt.add(_amount);
        if (user.orderIds.length == 1) {
            globalStats.totalActiveUsers = globalStats.totalActiveUsers.add(1);
        }

        // ✅ 更新上级业绩和发放直推奖（仅累加，不记录）
        _updateAncestorsPerformanceAndRewards(msg.sender, _amount, level);
        
        emit Staked(msg.sender, orderId, _amount, level);
    }

    function applyForGenesisNode() external whenNotPaused {
        User storage user = users[msg.sender];
        require(user.totalStakedAmount > 0, "User must stake first");
        require(!user.isGenesisNode, "Already a genesis node");
        require(!genesisNodeApplications[msg.sender], "Application already pending");

        usdtToken.transferFrom(msg.sender, address(this), genesisNodeCost);
        
        genesisNodeApplications[msg.sender] = true;
        pendingGenesisApplications.push(msg.sender); 

        emit GenesisNodeApplied(msg.sender);
    }

    function withdraw() external nonReentrant whenNotPaused autoUpdatePrice {
        _settleUserRewards(msg.sender);
        
        // ✅ 在计算前更新直推奖励释放进度
        _updateDirectRewardRelease(msg.sender);
        
        (uint256 pendingStaticHaf, uint256 pendingDynamicHaf, uint256 pendingGenesisHaf) = getClaimableRewards(msg.sender);
        uint256 totalClaimableHaf = pendingStaticHaf.add(pendingDynamicHaf).add(pendingGenesisHaf);
        require(totalClaimableHaf > 0, "No rewards to withdraw");

        User storage user = users[msg.sender];
        
        // ✅ 分别计算直推奖和分享奖的待领取金额
        uint256 pendingDirect = 0;
        if (user.directRewardTotal > user.directRewardClaimed) {
            if (user.directRewardReleased > user.directRewardClaimed) {
                pendingDirect = user.directRewardReleased.sub(user.directRewardClaimed);
            }
        }
        uint256 pendingShare = 0;
        if (user.shareRewardTotal > user.shareRewardClaimed) {
            pendingShare = user.shareRewardTotal.sub(user.shareRewardClaimed);
        }
        
        // ✅ 记录直推奖（提现时才记录）
        if (pendingDirect > 0) {
            uint256 directUsdt = pendingDirect.mul(hafPrice).div(PRICE_PRECISION);
            _addRewardRecord(msg.sender, address(0), RewardType.Direct, directUsdt, pendingDirect);
        }
        
        user.directRewardClaimed = user.directRewardClaimed.add(pendingDirect);
        user.shareRewardClaimed = user.shareRewardClaimed.add(pendingShare);
       
        uint256 fee = totalClaimableHaf.mul(withdrawalFeeRate).div(100);
        uint256 amountAfterFee = totalClaimableHaf.sub(fee);
        
        _updateOrderSettleTimes(msg.sender);

        _distributeHaf(msg.sender, amountAfterFee);

        globalStats.totalWithdrawnHaf = globalStats.totalWithdrawnHaf.add(amountAfterFee);
        globalStats.totalFeeCollectedHaf = globalStats.totalFeeCollectedHaf.add(fee);

        // ✅ 记录提现记录
        user.withdrawRecords.push(WithdrawRecord({
            timestamp: block.timestamp,
            hafAmount: amountAfterFee,
            fee: fee
        }));

        emit Withdrawn(msg.sender, amountAfterFee, fee);
    }
    
    function swapUsdtToHaf(uint256 _usdtAmount) external nonReentrant whenNotPaused autoUpdatePrice {
        require(_usdtAmount > 0, "USDT amount must be positive");
        usdtToken.transferFrom(msg.sender, address(this), _usdtAmount);
        
        uint256 hafAmount = _usdtAmount.mul(PRICE_PRECISION).div(hafPrice);
        uint256 fee = hafAmount.mul(swapFeeRate).div(100);
        uint256 finalHafAmount = hafAmount.sub(fee);
        
        _distributeHaf(msg.sender, finalHafAmount);

        emit Swapped(msg.sender, address(usdtToken), address(this), _usdtAmount, finalHafAmount);
    }

    function swapHafToUsdt(uint256 _hafAmount) external nonReentrant whenNotPaused autoUpdatePrice {
        require(_hafAmount > 0, "HAF amount must be positive");
        
        _transfer(msg.sender, address(this), _hafAmount);
        
        uint256 usdtAmount = _hafAmount.mul(hafPrice).div(PRICE_PRECISION);
        uint256 fee = usdtAmount.mul(swapFeeRate).div(100);
        uint256 finalUsdtAmount = usdtAmount.sub(fee);
        
        require(usdtToken.balanceOf(address(this)) >= finalUsdtAmount, "Insufficient USDT in contract");
        usdtToken.transfer(msg.sender, finalUsdtAmount);
        
        emit Swapped(msg.sender, address(this), address(usdtToken), _hafAmount, finalUsdtAmount);
    }

    
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

        uint256 daysPassed = (block.timestamp.sub(order.lastSettleTime)).div(TIME_UNIT);
        if (daysPassed == 0) return;

        User storage user = users[order.user];
        uint256 baseDailyRate = stakingLevels[order.level].dailyRate; // 70/80/90/100 (万分之一)

        uint256 dailyReleaseUsdt = order.amount.mul(baseDailyRate).div(10000);
 
        uint256 dailyReleaseHaf = dailyReleaseUsdt.mul(PRICE_PRECISION).div(hafPrice);

        uint256 baseTotalReleaseHaf = dailyReleaseHaf.mul(daysPassed);
        uint256 baseTotalReleaseUsdt = dailyReleaseUsdt.mul(daysPassed);
        
        uint256 actualBaseReleaseHaf = baseTotalReleaseHaf;
        uint256 actualBaseReleaseUsdt = baseTotalReleaseUsdt;
        
        if (order.releasedHaf.add(baseTotalReleaseHaf) >= order.totalQuotaHaf) {
            // 烧伤多余部分
            actualBaseReleaseHaf = order.totalQuotaHaf.sub(order.releasedHaf);
            // 按比例调整USDT额度
            if (baseTotalReleaseHaf > 0) {
                actualBaseReleaseUsdt = baseTotalReleaseUsdt.mul(actualBaseReleaseHaf).div(baseTotalReleaseHaf);
            }
            order.isCompleted = true;
            
            globalStats.totalCompletedOrders = globalStats.totalCompletedOrders.add(1);
        }
        
        // 更新已释放的HAF数量和USDT额度
        order.releasedHaf = order.releasedHaf.add(actualBaseReleaseHaf);
        order.releasedQuota = order.releasedQuota.add(actualBaseReleaseUsdt);
        
        // 团队加速是额外奖励，基于实际释放的基础部分计算
        uint256 accelerationBonus = teamLevels[user.teamLevel].accelerationBonus;
        uint256 accelerationReleaseUsdt = 0;
        uint256 accelerationReleaseHaf = 0;
        
        if (accelerationBonus > 0 && !order.isCompleted) {
            // 加速基于实际释放的基础部分
            accelerationReleaseUsdt = actualBaseReleaseUsdt.mul(accelerationBonus).div(100);
            accelerationReleaseHaf = actualBaseReleaseHaf.mul(accelerationBonus).div(100);
        }
        
        if (actualBaseReleaseUsdt > 0) {
            uint256 userBasePart = actualBaseReleaseUsdt.mul(90).div(100);
            uint256 genesisPart = actualBaseReleaseUsdt.sub(userBasePart); // 10%给创世节点池
            
            if (genesisPart > 0) {
                globalGenesisPool = globalGenesisPool.add(genesisPart);
            }
            
            // 记录基础静态收益
            uint256 baseStaticHaf = actualBaseReleaseHaf.mul(90).div(100);
            _addRewardRecord(order.user, address(0), RewardType.Static, userBasePart, baseStaticHaf);
            
            // 更新用户总静态产出（用于计算分享奖）
            user.totalStaticOutput = user.totalStaticOutput.add(userBasePart);
            _distributeShareRewards(order.user, userBasePart);
        }
        
        if (accelerationReleaseUsdt > 0) {
            uint256 teamBonusUsdt = accelerationReleaseUsdt.mul(90).div(100);
            uint256 teamGenesisUsdt = accelerationReleaseUsdt.sub(teamBonusUsdt); // 10%给创世节点
            
            if (teamGenesisUsdt > 0) {
                globalGenesisPool = globalGenesisPool.add(teamGenesisUsdt);
            }
            
            uint256 teamBonusHaf = accelerationReleaseHaf.mul(90).div(100);
            _addRewardRecord(order.user, address(0), RewardType.Team, teamBonusUsdt, teamBonusHaf);
        }
    }
    
    function _settleGenesisRewardForNode(address _node) internal {
        User storage nodeUser = users[_node];
        uint256 maxDividend = genesisNodeCost.mul(GENESIS_NODE_EXIT_MULTIPLIER);
        
        // 如果已经出局且不在活跃列表，直接返回
        if (nodeUser.genesisDividendsWithdrawn >= maxDividend && !isActiveGenesisNode[_node]) {
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
            
            // ✅ 先计算本次可领取金额，再检查是否超过3倍上限
            uint256 afterClaimTotal = nodeUser.genesisDividendsWithdrawn.add(claimableUsdt);
            
            // 如果本次领取后会超过上限，调整领取金额（烧伤多余部分）
            if (afterClaimTotal > maxDividend) {
                actualClaim = maxDividend.sub(nodeUser.genesisDividendsWithdrawn);
            }

            // 计算对应的HAF数量并发送事件
            if (actualClaim > 0) {
                uint256 actualClaimHaf = actualClaim.mul(PRICE_PRECISION).div(hafPrice);
                _addRewardRecord(_node, address(0), RewardType.Genesis, actualClaim, actualClaimHaf);
            }
            
            // 更新已领取金额
            nodeUser.genesisDividendsWithdrawn = nodeUser.genesisDividendsWithdrawn.add(actualClaim);
            globalGenesisPool = globalGenesisPool.sub(actualClaim);
            
            // 如果达到上限，从活跃列表移除
            if (nodeUser.genesisDividendsWithdrawn >= maxDividend) {
                _removeActiveGenesisNode(_node);
            }
        }
    }
    
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

    function _updateOrderSettleTimes(address _user) internal {
        uint256[] memory orderIds = users[_user].orderIds;
        
        for (uint i = 0; i < orderIds.length; i++) {
            Order storage order = orders[orderIds[i]];
            if (!order.isCompleted) {
                uint256 daysPassed = (block.timestamp.sub(order.lastSettleTime)).div(TIME_UNIT);
                if (daysPassed > 0) {
                    order.lastSettleTime = order.lastSettleTime.add(daysPassed.mul(TIME_UNIT));
                }
            }
        }
    }
    
    function _updateAncestorsPerformanceAndRewards(address _user, uint256 _amount, uint8 _level) internal {
        address currentUser = _user;
        address referrer = users[currentUser].referrer;

        uint256[] memory directRewardRates = _getDirectRewardRates();
        for (uint i = 0; i < 6 && referrer != address(0); i++) {
            uint8 referrerLevel = _getUserHighestLevel(referrer);
            uint256 receivableAmount = _calculateBurnableAmount(_amount, _level, referrerLevel);
            
            // 计算应得奖励
            uint256 fullRewardUsdt = _amount.mul(directRewardRates[i]).div(100);
            uint256 actualRewardUsdt = receivableAmount.mul(directRewardRates[i]).div(100);
            
            // 如果发生烧伤（receivableAmount < _amount），记录烧伤的USDT奖励额度
            if (fullRewardUsdt > actualRewardUsdt) {
                uint256 burnedRewardUsdt = fullRewardUsdt.sub(actualRewardUsdt);
                // 烧伤的奖励不发放，直接丢弃（不需要燃烧HAF代币）
                emit RewardBurned(referrer, _user, fullRewardUsdt, actualRewardUsdt, burnedRewardUsdt);
            }
            
            // 发放实际奖励（不记录，在提现时才记录）
            if(actualRewardUsdt > 0) {
                uint256 rewardHaf = actualRewardUsdt.mul(PRICE_PRECISION).div(hafPrice);
                User storage referrerUser = users[referrer];
                
                // ✅ 在新增奖励前，先更新旧奖励的释放进度
                _updateDirectRewardRelease(referrer);
                
                // 累加新奖励到总额（直推奖DYNAMIC_RELEASE_PERIOD线性释放）
                referrerUser.directRewardTotal = referrerUser.directRewardTotal.add(rewardHaf);
                
                // ⚠️ 直推奖不在投资时记录，在提现时才记录
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

    /**
     * @dev 内部函数：更新用户动态奖励的释放进度
     * 在每次新增动态奖励前调用，将旧奖励按时间比例释放
     * ✅ 修复：使用固定的每日释放额度（总额的1/释放份数），而不是剩余金额的1/释放份数
     * ✅ 使用 DYNAMIC_RELEASE_PERIOD 和 TIME_UNIT 自动计算释放份数
     */
    function _updateDirectRewardRelease(address _user) internal {
        User storage user = users[_user];
        
        // 如果没有待释放的奖励，直接返回
        if (user.directRewardTotal <= user.directRewardReleased) {
            user.lastDirectUpdateTime = block.timestamp;
            return;
        }
        
        // 如果是第一次，初始化时间
        if (user.lastDirectUpdateTime == 0) {
            user.lastDirectUpdateTime = block.timestamp;
            return;
        }
        
        // 计算距离上次更新过了多少时间单位（天数）
        uint256 daysPassed = (block.timestamp.sub(user.lastDirectUpdateTime)).div(TIME_UNIT);
        if (daysPassed == 0) return;
        
        // ✅ 计算释放总份数：DYNAMIC_RELEASE_PERIOD / TIME_UNIT
        // 主网：100 days / 1 day = 100份
        // 测试网：100 minutes / 10 minutes = 10份
        uint256 totalReleasePeriods = DYNAMIC_RELEASE_PERIOD.div(TIME_UNIT);
        
        // ✅ 使用固定的每日释放额度：总金额 / 释放份数
        uint256 dailyRelease = user.directRewardTotal.div(totalReleasePeriods);
        uint256 newRelease = dailyRelease.mul(daysPassed);
        
        // 计算未释放的奖励总额
        uint256 unreleased = user.directRewardTotal.sub(user.directRewardReleased);
        
        // 如果超过释放周期或新增释放超过未释放总额，全部释放
        if (daysPassed >= totalReleasePeriods || newRelease >= unreleased) {
            newRelease = unreleased;
        }
        
        // 更新已释放金额和更新时间
        user.directRewardReleased = user.directRewardReleased.add(newRelease);
        user.lastDirectUpdateTime = block.timestamp;
    }
    
    /**
     * @dev 提现时发放分享奖（基于静态收益的5%）
     * 当下级用户产生静态收益时，按静态收益的5%发放给上级
     * 规则：推荐几人拿几代，最多拿10代
     * 计算方式：日收益 × 90%（用户实得部分）× 5% = 分享奖
     */
    function _distributeShareRewards(address _user, uint256 _staticRewardUsdt) internal {
        address currentUser = _user;
        address referrer = users[currentUser].referrer;
        
        for (uint i = 0; i < 10 && referrer != address(0); i++) {
            User storage referrerUser = users[referrer];
            uint256 activeDirectCount = 0;
            for (uint j = 0; j < referrerUser.directReferrals.length; j++) {
                if (users[referrerUser.directReferrals[j]].totalStakedAmount > 0) {
                    activeDirectCount++;
                }
            }

            if (activeDirectCount <= i) {
                break;
            }
            
            // ✅ 分享奖无烧伤机制 - 按静态收益的5%计算
            uint256 rewardUsdt = _staticRewardUsdt.mul(5).div(100);

            if(rewardUsdt > 0){
                uint256 rewardHaf = rewardUsdt.mul(PRICE_PRECISION).div(hafPrice);
                
                // ✅ 分享奖立即可提取，直接累加到 shareRewardTotal
                referrerUser.shareRewardTotal = referrerUser.shareRewardTotal.add(rewardHaf);
                
                // ✅ 记录分享奖（在静态收益结算时记录）
                _addRewardRecord(referrer, _user, RewardType.Share, rewardUsdt, rewardHaf);
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
        users[_user].rewardRecords.push(RewardRecord({
            timestamp: block.timestamp,
            fromUser: _fromUser,
            rewardType: _type,
            usdtAmount: _usdtAmount,
            hafAmount: _hafAmount
        }));
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

            // ✅ 基础释放：按投资额计算USDT额度，再转换为HAF
            uint256 baseDailyRate = stakingLevels[order.level].dailyRate;
            uint256 dailyReleaseUsdt = order.amount.mul(baseDailyRate).div(10000);
            uint256 dailyReleaseHaf = dailyReleaseUsdt.mul(PRICE_PRECISION).div(hafPrice);
            
            uint256 baseTotalReleaseHaf = dailyReleaseHaf.mul(daysPassed);
            uint256 baseTotalReleaseUsdt = dailyReleaseUsdt.mul(daysPassed);
            
            // 检查HAF数量是否超过总额度
            uint256 actualReleaseHaf = baseTotalReleaseHaf;
            uint256 actualReleaseUsdt = baseTotalReleaseUsdt;
            
            if (order.releasedHaf.add(baseTotalReleaseHaf) >= order.totalQuotaHaf) {
                actualReleaseHaf = order.totalQuotaHaf.sub(order.releasedHaf);
                if (baseTotalReleaseHaf > 0) {
                    actualReleaseUsdt = baseTotalReleaseUsdt.mul(actualReleaseHaf).div(baseTotalReleaseHaf);
                }
            }
            
            // 团队加速是额外奖励
            uint256 accelerationBonus = teamLevels[user.teamLevel].accelerationBonus;
            uint256 accelerationHaf = 0;
            
            if (accelerationBonus > 0) {
                accelerationHaf = actualReleaseHaf.mul(accelerationBonus).div(100);
            }
            
            // 计算总HAF收益（基础90% + 加速90%）
            uint256 baseHaf = actualReleaseHaf.mul(90).div(100);
            uint256 bonusHaf = 0;
            if (accelerationHaf > 0) {
                bonusHaf = accelerationHaf.mul(90).div(100);
            }
            
            total = total.add(baseHaf).add(bonusHaf);
        }
        
        return total;
    }
    
    /**
     * @dev 内部函数: 计算待领取的动态收益
     * ✅ 新方案：基于已释放金额和上次更新时间计算
     */
    /**
     * @dev 内部函数: 计算待领取的动态收益
     * 包含：直推奖的已释放部分 + 分享奖的全部待领取部分
     */
    function _calculatePendingDynamic(address _user) internal view returns (uint256) {
        User storage user = users[_user];
        
        uint256 pendingDirect = 0;
        uint256 pendingShare = 0;
        
        // 1. 计算直推奖的已释放但未领取部分（线性释放）
        if (user.directRewardTotal > 0) {
            uint256 currentReleased = user.directRewardReleased;
            
            // 如果有未释放的部分，计算新增释放
            if (user.directRewardTotal > currentReleased && user.lastDirectUpdateTime > 0) {
                uint256 daysPassed = (block.timestamp.sub(user.lastDirectUpdateTime)).div(TIME_UNIT);
                
                if (daysPassed > 0) {
                    // ✅ 计算释放总份数：DYNAMIC_RELEASE_PERIOD / TIME_UNIT
                    uint256 totalReleasePeriods = DYNAMIC_RELEASE_PERIOD.div(TIME_UNIT);
                    
                    // ✅ 使用固定的每日释放额度：总金额 / 释放份数
                    uint256 dailyRelease = user.directRewardTotal.div(totalReleasePeriods);
                    uint256 newRelease = dailyRelease.mul(daysPassed);
                    
                    uint256 unreleased = user.directRewardTotal.sub(currentReleased);
                    
                    // 如果超过释放周期或新增释放超过未释放总额，全部释放
                    if (daysPassed >= totalReleasePeriods || newRelease >= unreleased) {
                        newRelease = unreleased;
                    }
                    
                    currentReleased = currentReleased.add(newRelease);
                }
            }
            
            // 返回已释放但未领取的部分
            if (currentReleased > user.directRewardClaimed) {
                pendingDirect = currentReleased.sub(user.directRewardClaimed);
            }
        }
        
        // 2. 计算分享奖的待领取部分（立即可提取）
        if (user.shareRewardTotal > user.shareRewardClaimed) {
            pendingShare = user.shareRewardTotal.sub(user.shareRewardClaimed);
        }
        
        return pendingDirect.add(pendingShare);
    }
    

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
    
    /**
     * @dev 获取用户收益记录（全部返回）
     */
    function getUserRewardRecords(address _user) external view returns (RewardRecord[] memory) {
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

        // ✅ 基础释放：按投资额计算USDT额度，再转换为HAF
        uint256 baseDailyRate = stakingLevels[order.level].dailyRate;
        uint256 dailyReleaseUsdt = order.amount.mul(baseDailyRate).div(10000);
        uint256 dailyReleaseHaf = dailyReleaseUsdt.mul(PRICE_PRECISION).div(hafPrice);
        
        uint256 baseTotalReleaseHaf = dailyReleaseHaf.mul(daysPassed);
        uint256 baseTotalReleaseUsdt = dailyReleaseUsdt.mul(daysPassed);
        
        // 检查HAF数量是否超过总额度
        uint256 actualReleaseHaf = baseTotalReleaseHaf;
        uint256 actualReleaseUsdt = baseTotalReleaseUsdt;
        
        if (order.releasedHaf.add(baseTotalReleaseHaf) >= order.totalQuotaHaf) {
            actualReleaseHaf = order.totalQuotaHaf.sub(order.releasedHaf);
            if (baseTotalReleaseHaf > 0) {
                actualReleaseUsdt = baseTotalReleaseUsdt.mul(actualReleaseHaf).div(baseTotalReleaseHaf);
            }
        }
        
        // 团队加速是额外奖励
        uint256 accelerationBonus = teamLevels[user.teamLevel].accelerationBonus;
        uint256 accelerationHaf = 0;
        uint256 accelerationUsdt = 0;
        
        if (accelerationBonus > 0) {
            accelerationHaf = actualReleaseHaf.mul(accelerationBonus).div(100);
            accelerationUsdt = actualReleaseUsdt.mul(accelerationBonus).div(100);
        }

        // 计算总USDT和HAF（基础90% + 加速90%）
        uint256 userPartUsdt = actualReleaseUsdt.mul(90).div(100);
        uint256 accelerationPartUsdt = 0;
        if (accelerationUsdt > 0) {
            accelerationPartUsdt = accelerationUsdt.mul(90).div(100);
        }
        
        uint256 userPartHaf = actualReleaseHaf.mul(90).div(100);
        uint256 accelerationPartHaf = 0;
        if (accelerationHaf > 0) {
            accelerationPartHaf = accelerationHaf.mul(90).div(100);
        }
        
        pendingUsdt = userPartUsdt.add(accelerationPartUsdt);
        pendingHaf = userPartHaf.add(accelerationPartHaf);
        
        return (pendingUsdt, pendingHaf);
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

    function _distributeHaf(address _recipient, uint256 _amount) internal {
        uint256 treasuryBalance = balanceOf(address(this));
        require(treasuryBalance >= _amount, "HashFi: Insufficient HAF in treasury for distribution");
        _transfer(address(this), _recipient, _amount);
        globalStats.totalHafDistributed = globalStats.totalHafDistributed.add(_amount);
    }

    function _getStakingLevelByAmount(uint256 _amount) internal view returns (uint8) {
        for (uint8 i = 1; i <= 4; i++) {
            if (_amount >= stakingLevels[i].minAmount && _amount <= stakingLevels[i].maxAmount) {
                return i;
            }
        }
        return 0;
    }

    function _getUserHighestLevel(address _user) internal view returns (uint8) {
        if (_user == owner()) {
            return 4;
        }
        
        if (users[_user].isGenesisNode) {
            return 4;
        }
        
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
        // 投资者是钻石等级（含）以上，无烧伤
        if (_investorLevel >= 4) {
            return _originalAmount;
        }
        
        // 推荐人等级 >= 投资者等级，无烧伤
        if (_referrerLevel >= _investorLevel) {
            return _originalAmount;
        }
        
        // 跨级别烧伤：推荐人只能拿自己等级的最高投资额对应的奖励
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
        lastPriceUpdateTime = block.timestamp;
        emit PriceUpdated(_newPrice);
    }
    
    /**
     * @dev 设置每日价格涨幅(千分比)
     */
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
    

    function forceSettleUser(address _user) external onlyOwner {
        _settleUserRewards(_user);
    }

    function setUserTeamLevel(address _user, uint8 _level) external onlyOwner {
        require(_level >= 0 && _level <= 5, "Invalid team level");
        uint8 oldLevel = users[_user].teamLevel;
        users[_user].teamLevel = _level;
        emit TeamLevelUpdated(_user, oldLevel, _level);
    }
    
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

    function setGenesisNodeCost(uint256 _newCost) external onlyOwner {
        require(_newCost > 0, "Cost must be positive");
        genesisNodeCost = _newCost;
    }

    function setSwapFee(uint256 _newFeeRate) external onlyOwner {
        require(_newFeeRate <= 100, "Fee rate cannot exceed 100%");
        swapFeeRate = _newFeeRate;
    }

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

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdrawToken(address _tokenAddress, uint256 _amount) external onlyOwner {
        IERC20 token = IERC20(_tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        token.transfer(owner(), _amount);
    }
}