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
    event RewardBurned(address indexed referrer, address indexed investor, uint256 fullRewardUsdt, uint256 actualRewardUsdt, uint256 burnedUsdt);

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

    // --- 数据结构 ---
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
    uint256 internal totalGenesisShares; // 创世节点总份额（内部使用）
    address[] internal genesisNodes; // 所有创世节点列表
    address[] internal activeGenesisNodes; // 活跃创世节点列表
    address[] internal pendingGenesisApplications; // 待审核申请
    mapping(address => bool) public genesisNodeApplications; 
    mapping(address => bool) public isActiveGenesisNode;
    
    // 全局统计
    GlobalStatistics public globalStats;
}
