// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HashFiStorage
 * @dev 包含所有状态变量、数据结构、事件和枚举。
 * 这是所有其他合约模块的基础。
 */
abstract contract HashFiStorage is Ownable {

    // --- 依赖 ---
    IERC20 internal usdtToken;

    // --- 常量 ---
    uint256 internal constant TOTAL_SUPPLY = 200_000_000 * 1e18;
    uint256 internal constant PRICE_PRECISION = 1e18;
    uint256 internal constant GENESIS_NODE_EXIT_MULTIPLIER = 3;

    // --- Custom Errors ---
    error InvalidAddress();
    error InvalidAmount();
    error ReferrerAlreadyBound();
    error ReferrerNotExist();
    error CannotReferSelf();
    error MustBindReferrer();
    error InvalidStakingAmount();
    error AlreadyGenesisNode();
    error ApplicationPending();
    error NoRewards();
    error BelowMinimum();
    error AddressNotSet();
    error InsufficientBalance();
    error InvalidOrder();
    error AlreadyProcessed();
    error NoPendingApplication();
    error InvalidLevel();
    error InvalidFeeRate();
    error NoHashPower();

    // --- 枚举 ---
    /**
     * @dev 奖励类型枚举
     * Static  - 静态奖：基础每日释放收益（0.7%-1%日利率）
     * Direct  - 直推奖（推荐奖）：1-6代推荐奖励（一代5%、二代3%、三至六代1%）（DYNAMIC_RELEASE_PERIOD线性释放，主网100天，测试网10个时间单位）（有烧伤机制）
     * Share   - 分享奖：最多10代，伞下静态收益的5%（立即可提取）（无烧伤机制）
     * Team    - 团队奖：V1-V5等级，自身静态收益加速5%-25%
     * Genesis - 创世节点奖：全网静态收益10%的均分奖励
     */
    enum RewardType { Static, Direct, Share, Team, Genesis }

    /**
     * @dev BTC提现订单状态枚举
     */
    enum BtcWithdrawalStatus { Pending, Approved, Rejected }

    // --- 数据结构 ---
    struct RewardRecord {
        uint256 timestamp;
        address fromUser;
        RewardType rewardType;
        uint256 usdtAmount;
        uint256 hafAmount;
    }

    /**
     * @dev 算力变动记录（用于lazyload计算）
     */
    struct HashPowerRecord {
        uint256 timestamp;      // 变动时间（UTC+8对齐的00:00）
        uint256 hashPower;      // 此时的算力值（整数，单位：T）
    }

    /**
     * @dev 每日BTC产出记录
     */
    struct DailyBtcOutput {
        uint256 date;           // 日期（UTC+8的00:00时间戳）
        uint256 btcAmount;      // 当日BTC产出（8位精度）
        uint256 totalHashPower; // 当日全网总算力快照（整数T）
    }

    /**
     * @dev BTC提现订单
     */
    struct BtcWithdrawalOrder {
        uint256 orderId;
        address user;
        string btcAddress;      // BTC提现地址
        uint256 amount;         // 提现金额（8位精度）
        uint256 timestamp;
        BtcWithdrawalStatus status; // Pending/Approved/Rejected
    }

    /**
     * @dev 用户算力数据
     */
    struct UserHashPower {
        HashPowerRecord[] records;  // 算力变动历史（按时间升序）
        uint256 totalMinedBtc;      // 累计挖矿BTC（8位精度）
        uint256 withdrawnBtc;       // 已提现BTC（8位精度）
        uint256 lastSettleDate;     // 上次结算日期（UTC+8对齐）
        string btcWithdrawalAddress; // BTC提现地址
    }
    
    struct WithdrawRecord {
        uint256 timestamp;
        uint256 hafAmount;
        uint256 fee;
    }
    
    /**
     * @dev 直推奖详细记录结构
     * 用于记录每笔直推奖的来源、金额和释放进度
     */
    struct DirectRewardDetail {
        address fromUser;           // 奖励来源（投资的下级地址）
        uint256 totalAmount;        // 该笔奖励的总金额 (HAF)
        uint256 releasedAmount;     // 已释放的金额 (HAF)
        uint256 claimedAmount;      // 已领取的金额 (HAF)
        uint256 startTime;          // 奖励开始时间
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
        uint256 genesisRewardDebt; // 创世节点奖励债务（用于计算待领取金额）

        // 直推奖励（DYNAMIC_RELEASE_PERIOD线性释放）
        uint256 directRewardTotal; // 累计获得的直推奖总额 (HAF本位)
        uint256 directRewardReleased; // 已释放的直推奖励 (HAF本位)
        uint256 lastDirectUpdateTime; // 上次更新直推奖励释放的时间
        uint256 directRewardClaimed; // 已领取的直推奖励 (HAF本位)
        DirectRewardDetail[] directRewardDetails; // 直推奖详细记录数组

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

    struct TeamMemberInfo {
        address memberAddress;
        uint8 teamLevel;
        uint256 totalStakedAmount;
        uint256 teamTotalPerformance;
    }

    // --- 状态变量 ---

    // 用户和订单
    mapping(address => User) public users;
    Order[] public orders;

    // --- 算力中心相关状态变量 ---
    
    // UTC+8时区偏移量（8小时）
    uint256 internal constant UTC8_OFFSET = 8 hours;
    
    // BTC精度常量（8位小数）
    uint256 internal constant BTC_PRECISION = 1e8;
    
    // 用户算力数据
    mapping(address => UserHashPower) internal userHashPowers;
    
    // 每日BTC产出记录（日期 => DailyBtcOutput）
    mapping(uint256 => DailyBtcOutput) public dailyBtcOutputs;
    
    // BTC提现订单
    BtcWithdrawalOrder[] public btcWithdrawalOrders;
    
    // BTC提现参数（固定值）
    uint256 public constant MIN_BTC_WITHDRAWAL = 0.001 * 1e8;  // 最小提现0.001 BTC
    uint256 public constant BTC_WITHDRAWAL_FEE_RATE = 5;       // 提现手续费5%
    
    // 全网算力统计
    uint256 public globalTotalHashPower;  // 当前全网总算力（整数T）

    // 价格与费用
    uint256 public hafPrice; // HAF的USDT价格, 使用18位小数精度
    uint256 public withdrawalFeeRate = 5; // 提现手续费率, 5%
    uint256 public swapFeeRate = 1; // 闪兑手续费, 1%
    
    // 价格自动上涨
    uint256 internal lastPriceUpdateTime; // 上次价格更新时间（内部使用）
    uint256 public dailyPriceIncreaseRate = 1; // 每日涨幅 千分之一 = 0.1%
    bool public autoPriceUpdateEnabled = false; // 是否启用自动涨价
    
    // 时间单位
    uint256 public TIME_UNIT; // 时间单位 
    uint256 public DYNAMIC_RELEASE_PERIOD; // 动态奖励释放周期
    
    // 配置信息
    mapping(uint8 => StakingLevelInfo) public stakingLevels;
    TeamLevelInfo[] public teamLevels;

    // 创世节点
    uint256 public genesisNodeCost = 5000 * 1e18;
    uint256 public globalGenesisPool; // 全局创世节点分红池 (USDT本位)
    uint256 public accGenesisRewardPerNode; // 每个节点累积的奖励（精度放大1e18）
    uint256 internal totalGenesisShares; // 创世节点总份额（内部使用）
    address[] internal genesisNodes; // 所有创世节点列表
    address[] internal activeGenesisNodes; // 活跃创世节点列表
    address[] internal pendingGenesisApplications; // 待审核申请
    mapping(address => bool) public genesisNodeApplications; 
    mapping(address => bool) public isActiveGenesisNode;
    
    // 全局统计
    GlobalStatistics public globalStats;
}
