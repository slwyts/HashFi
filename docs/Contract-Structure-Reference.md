# HashFi 合约完整结构参考文档

> **目的**: 为前端开发提供完整的合约数据结构和函数调用参考，避免字段映射错误

## 目录
- [核心数据结构](#核心数据结构)
- [视图函数 (View Functions)](#视图函数-view-functions)
- [写入函数 (Write Functions)](#写入函数-write-functions)
- [常用枚举和常量](#常用枚举和常量)
- [前端集成注意事项](#前端集成注意事项)

---

## 核心数据结构

### 1. User 结构体 (14个字段)

```solidity
struct User {
    address referrer;                  // [0] 推荐人地址
    uint8 teamLevel;                   // [1] 团队等级 (0-5)
    uint256 totalStakedAmount;         // [2] 累计质押金额
    uint256 teamTotalPerformance;      // [3] 团队总业绩
    uint256[] orderIds;                // [4] 订单ID数组
    address[] directReferrals;         // [5] 直推用户数组
    bool isGenesisNode;                // [6] 是否创世节点
    uint256 genesisDividendsWithdrawn; // [7] 创世节点已提现金额
    uint256 dynamicRewardTotal;        // [8] 动态奖励总额
    uint256 dynamicRewardClaimed;      // [9] 动态奖励已领取
    uint256 dynamicRewardStartTime;    // [10] 动态奖励开始时间
    RewardRecord[] rewardRecords;      // [11] 收益记录数组
}
```

**前端访问方式**:
```typescript
// ❌ 错误 - useReadContract 返回的是数组 (tuple)
const referrer = userInfo.referrer; 

// ✅ 正确 - 使用数组索引
const referrer = userInfo[0];
const teamLevel = userInfo[1];
const totalStakedAmount = userInfo[2];
const isGenesisNode = userInfo[6];
```

---

### 2. Order 结构体 (9个字段)

```solidity
struct Order {
    uint256 id;              // [0] 订单ID
    address user;            // [1] 用户地址
    uint8 level;             // [2] 质押级别 (1=青铜, 2=白银, 3=黄金, 4=钻石)
    uint256 amount;          // [3] 质押金额 (USDT)
    uint256 totalQuota;      // [4] 总额度 (amount * multiplier)
    uint256 releasedQuota;   // [5] 已释放额度
    uint256 startTime;       // [6] 开始时间 (timestamp)
    uint256 lastSettleTime;  // [7] 上次结算时间
    bool isCompleted;        // [8] 是否已完成
}
```

**前端访问方式**:
```typescript
// ✅ 正确映射
const order = {
  id: orderData[0],
  user: orderData[1],
  level: orderData[2],           // 1-4 对应青铜/白银/黄金/钻石
  amount: orderData[3],           // 质押的USDT数量
  totalQuota: orderData[4],       // amount * multiplier
  releasedQuota: orderData[5],    // 已释放额度
  startTime: orderData[6],
  lastSettleTime: orderData[7],
  isCompleted: orderData[8]       // 注意: 不是 isActive (需要取反)
};

// ❌ 错误的字段名
// investedUsdt, withdrawnHaf, isActive - 这些字段不存在!
```

**关键字段说明**:
- `level`: 1-4 对应质押级别 (不是根据金额计算的!)
- `amount`: 用户质押的USDT金额
- `totalQuota`: 总释放额度 = amount × multiplier
- `releasedQuota`: 已释放的额度 (USDT计价)
- `isCompleted`: 订单是否完成 (前端显示时需要取反: `isActive = !isCompleted`)

---

### 3. RewardRecord 结构体 (5个字段)

```solidity
struct RewardRecord {
    uint256 timestamp;      // [0] 记录时间
    address fromUser;       // [1] 来源用户 (推荐关系)
    RewardType rewardType;  // [2] 收益类型 (0-4)
    uint256 usdtAmount;     // [3] USDT金额
    uint256 hafAmount;      // [4] HAF金额
}
```

**前端访问方式**:
```typescript
const record = {
  timestamp: recordData[0],
  fromUser: recordData[1],
  rewardType: recordData[2], // 0=Static, 1=Direct, 2=Share, 3=Team, 4=Genesis
  usdtAmount: recordData[3],
  hafAmount: recordData[4]
};
```

---

### 4. StakingLevelInfo 结构体 (4个字段)

```solidity
struct StakingLevelInfo {
    uint256 minAmount;    // [0] 最小金额
    uint256 maxAmount;    // [1] 最大金额
    uint256 multiplier;   // [2] 总释放倍数 (如 200 表示2倍)
    uint256 dailyRate;    // [3] 每日释放率 (万分比, 如 50 = 0.5%)
}
```

**默认配置**:
```typescript
const stakingLevels = {
  1: { min: 100e6,  max: 999e6,  multiplier: 200, dailyRate: 50 },  // 青铜 100-999U, 2倍, 0.5%/天
  2: { min: 1000e6, max: 4999e6, multiplier: 220, dailyRate: 60 },  // 白银 1k-5k, 2.2倍, 0.6%/天
  3: { min: 5000e6, max: 9999e6, multiplier: 250, dailyRate: 80 },  // 黄金 5k-10k, 2.5倍, 0.8%/天
  4: { min: 10000e6, max: type(uint256).max, multiplier: 300, dailyRate: 100 } // 钻石 10k+, 3倍, 1%/天
};
```

---

### 5. TeamLevelInfo 结构体 (2个字段)

```solidity
struct TeamLevelInfo {
    uint256 requiredPerformance; // [0] 所需业绩
    uint256 accelerationBonus;   // [1] 加速收益百分比 (如 10 = 10%)
}
```

**默认配置**:
```typescript
const teamLevels = {
  0: { performance: 0,        bonus: 0 },   // V0
  1: { performance: 10000e6,  bonus: 10 },  // V1: 1万业绩, +10%
  2: { performance: 50000e6,  bonus: 20 },  // V2: 5万业绩, +20%
  3: { performance: 200000e6, bonus: 30 },  // V3: 20万业绩, +30%
  4: { performance: 500000e6, bonus: 40 },  // V4: 50万业绩, +40%
  5: { performance: 1000000e6, bonus: 50 } // V5: 100万业绩, +50%
};
```

---

### 6. BtcMiningStats 结构体 (8个字段)

```solidity
struct BtcMiningStats {
    uint256 totalHashrate;      // [0] 总算力 (TH/s)
    uint256 globalHashrate;     // [1] 全网算力 (TH/s)
    uint256 dailyRewardPerT;    // [2] 每T日产出 (Satoshi)
    uint256 totalMined;         // [3] 累计产出 (BTC, 8 decimals)
    uint256 yesterdayMined;     // [4] 昨日产出 (BTC, 8 decimals)
    uint256 currentDifficulty;  // [5] 当前难度
    uint256 btcPrice;           // [6] BTC价格 (USDT)
    uint256 nextHalvingTime;    // [7] 下次减半时间
    uint256 lastUpdateTime;     // [8] 最后更新时间
}
```

---

### 7. GlobalStatistics 结构体 (6个字段)

```solidity
struct GlobalStatistics {
    uint256 totalUsdtStaked;      // [0] 累计质押USDT
    uint256 totalHafDistributed;  // [1] 累计分发HAF
    uint256 totalUsdtSwapped;     // [2] 累计闪兑USDT
    uint256 totalHafBurned;       // [3] 累计销毁HAF
    uint256 totalUsers;           // [4] 总用户数
    uint256 totalWithdrawn;       // [5] 累计提现USDT
}
```

---

### 8. TeamMemberInfo 结构体 (4个字段)

```solidity
struct TeamMemberInfo {
    address memberAddress;            // [0] 成员地址
    uint8 teamLevel;                  // [1] 团队等级
    uint256 totalStakedAmount;        // [2] 质押金额
    uint256 teamTotalPerformance;     // [3] 团队业绩
}
```

---

## 视图函数 (View Functions)

### 1. getUserInfo - 获取用户完整信息

```solidity
function getUserInfo(address _user) external view returns (
    User memory,      // [0] User结构体 (14个字段的数组)
    uint8,            // [1] 最高质押级别 (1-4)
    uint256,          // [2] 团队总业绩
    uint256           // [3] 小区业绩
)
```

**前端使用**:
```typescript
const { data: userInfoData } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: 'getUserInfo',
  args: [userAddress]
});

// userInfoData 是一个包含4个元素的数组
const user = userInfoData[0];           // User结构体 (本身也是数组)
const highestLevel = userInfoData[1];   // uint8
const totalPerformance = userInfoData[2]; // uint256
const smallAreaPerformance = userInfoData[3]; // uint256

// User结构体的字段访问
const referrer = user[0];
const teamLevel = user[1];
const totalStakedAmount = user[2];
const isGenesisNode = user[6];
```

---

### 2. getUserOrders - 获取用户订单列表

```solidity
function getUserOrders(address _user) external view returns (Order[] memory)
```

**前端使用**:
```typescript
const { data: orders } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: 'getUserOrders',  // ❌ 不是 getUserStakingOrders!
  args: [userAddress]
});

// orders 是 Order[] 数组，每个元素是9个字段的数组
orders?.forEach((order) => {
  console.log({
    id: order[0],
    level: order[2],          // 1-4
    amount: order[3],         // USDT质押金额
    totalQuota: order[4],     // 总额度
    releasedQuota: order[5],  // 已释放额度
    isCompleted: order[8]     // 是否完成
  });
});
```

---

### 3. getClaimableRewards - 获取待领取收益

```solidity
function getClaimableRewards(address _user) public view returns (
    uint256 pendingStatic,   // [0] 待领取静态收益 (HAF)
    uint256 pendingDynamic,  // [1] 待领取动态收益 (HAF)
    uint256 pendingGenesis   // [2] 待领取创世节点收益 (HAF)
)
```

**前端使用**:
```typescript
const { data: rewards } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: 'getClaimableRewards',
  args: [userAddress]
});

// rewards 是包含3个BigInt的数组
const pendingStatic = rewards[0];  // 静态收益 (HAF)
const pendingDynamic = rewards[1]; // 动态收益 (HAF)
const pendingGenesis = rewards[2]; // 创世节点收益 (HAF)

// 显示总待领取
const totalPending = pendingStatic + pendingDynamic + pendingGenesis;
```

---

### 4. getRewardRecords - 获取收益记录

```solidity
function getRewardRecords(address _user) external view returns (RewardRecord[] memory)
```

**前端使用**:
```typescript
const { data: records } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: 'getRewardRecords',
  args: [userAddress]
});

// records 是 RewardRecord[] 数组，每个元素是5个字段的数组
records?.forEach((record) => {
  console.log({
    timestamp: record[0],
    fromUser: record[1],
    rewardType: record[2],  // 0=Static, 1=Direct, 2=Share, 3=Team, 4=Genesis
    usdtAmount: record[3],
    hafAmount: record[4]
  });
});
```

---

### 5. getDirectReferrals - 获取直推用户

```solidity
function getDirectReferrals(address _user) external view returns (TeamMemberInfo[] memory)
```

**前端使用**:
```typescript
const { data: referrals } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: 'getDirectReferrals',
  args: [userAddress]
});

// referrals 是 TeamMemberInfo[] 数组
referrals?.forEach((member) => {
  console.log({
    address: member[0],
    teamLevel: member[1],
    totalStaked: member[2],
    teamPerformance: member[3]
  });
});
```

---

### 6. getOrderPendingReward - 获取单个订单待释放收益

```solidity
function getOrderPendingReward(uint256 _orderId) external view returns (
    uint256 pendingUsdt,  // [0] 待释放USDT
    uint256 pendingHaf    // [1] 待释放HAF
)
```

**前端使用**:
```typescript
const { data: pending } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: 'getOrderPendingReward',
  args: [orderId]
});

const pendingUsdt = pending[0];
const pendingHaf = pending[1];
```

---

### 7. getUserReferralStats - 获取推荐统计

```solidity
function getUserReferralStats(address _user) external view returns (
    uint256 totalReferrals,  // [0] 总推荐数
    uint256 bronzeCount,     // [1] 青铜级数量
    uint256 silverCount,     // [2] 白银级数量
    uint256 goldCount,       // [3] 黄金级数量
    uint256 diamondCount     // [4] 钻石级数量
)
```

---

### 8. getTeamPerformanceDetails - 获取团队业绩详情

```solidity
function getTeamPerformanceDetails(address _user) external view returns (
    uint256 totalPerformance,       // [0] 总业绩
    uint256 largestArea,            // [1] 最大区业绩
    uint256 smallArea,              // [2] 小区业绩
    uint256 directReferralsCount    // [3] 直推人数
)
```

---

### 9. getGlobalStats - 获取全局统计

```solidity
function getGlobalStats() external view returns (
    uint256 totalStakedUsdt,         // [0] 当前活跃质押
    uint256 totalOrders,             // [1] 总订单数
    uint256 totalGenesisNodesCount,  // [2] 创世节点数
    uint256 currentHafPrice,         // [3] 当前HAF价格
    uint256 contractUsdtBalance,     // [4] 合约USDT余额
    uint256 contractHafBalance,      // [5] 合约HAF余额
    GlobalStatistics memory statistics // [6] 全局统计结构体
)
```

---

### 10. getBtcStats - 获取BTC矿池数据

```solidity
function getBtcStats() external view returns (BtcMiningStats memory)
```

**前端使用**:
```typescript
const { data: btcStats } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: 'getBtcStats'
});

// btcStats 是9个字段的数组
const stats = {
  totalHashrate: btcStats[0],      // 总算力 (TH/s)
  globalHashrate: btcStats[1],     // 全网算力
  dailyRewardPerT: btcStats[2],    // 每T日产出
  totalMined: btcStats[3],         // 累计产出 (8 decimals)
  yesterdayMined: btcStats[4],     // 昨日产出
  currentDifficulty: btcStats[5],  // 难度
  btcPrice: btcStats[6],           // BTC价格
  nextHalvingTime: btcStats[7],    // 减半时间
  lastUpdateTime: btcStats[8]      // 更新时间
};
```

---

### 11. getRewardRecordsByType - 按类型获取收益记录

```solidity
function getRewardRecordsByType(address _user, RewardType _type) 
    external view returns (RewardRecord[] memory)
```

**前端使用**:
```typescript
// 获取静态收益记录
const { data: staticRecords } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: 'getRewardRecordsByType',
  args: [userAddress, 0] // 0 = RewardType.Static
});
```

---

### 12. 其他重要视图函数

```solidity
// 获取合约所有者地址
function owner() external view returns (address)

// 检查是否有待审核的创世节点申请
function isApplicationPending(address _user) external view returns (bool)

// 获取活跃创世节点列表
function getActiveGenesisNodes() external view returns (address[] memory)

// 获取HAF价格 (6 decimals)
hafPrice public view returns (uint256)

// 获取创世节点费用
genesisNodeCost public view returns (uint256)

// 每日价格涨幅 (千分比)
dailyPriceIncreaseRate public view returns (uint256)

// 提现手续费率 (百分比)
withdrawalFeeRate public view returns (uint256)

// 闪兑手续费率 (百分比)
swapFeeRate public view returns (uint256)
```

---

## 写入函数 (Write Functions)

### 1. bindReferrer - 绑定推荐人

```solidity
function bindReferrer(address _referrer) external whenNotPaused
```

**要求**:
- 用户未绑定过推荐人
- 推荐人不能是自己
- 推荐人必须是owner或已有投资记录

**前端使用**:
```typescript
const { writeContract } = useWriteContract();

await writeContract({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: 'bindReferrer',
  args: [referrerAddress]
});
```

---

### 2. stake - 质押USDT

```solidity
function stake(uint256 _amount) external whenNotPaused
```

**前置条件**:
1. 必须已绑定推荐人
2. USDT授权额度充足
3. 金额符合质押级别要求 (100-999, 1000-4999, 5000-9999, 10000+)

**前端使用**:
```typescript
// 步骤1: 授权USDT
const { writeContract } = useWriteContract();

await writeContract({
  address: USDT_ADDRESS,
  abi: ERC20_ABI,
  functionName: 'approve',
  args: [CONTRACT_ADDRESS, amount]
});

// 步骤2: 质押
await writeContract({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: 'stake',
  args: [amount] // amount = BigInt (6 decimals for USDT)
});
```

---

### 3. withdraw - 提现收益

```solidity
function withdraw() external whenNotPaused
```

**说明**:
- 提现所有待领取的收益 (静态+动态+创世节点)
- 90%转换为USDT, 10%转换为HAF
- 收取withdrawalFeeRate手续费 (默认10%)

**前端使用**:
```typescript
await writeContract({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: 'withdraw'
});
```

---

### 4. swapUsdtToHaf - USDT兑换HAF

```solidity
function swapUsdtToHaf(uint256 _usdtAmount) external whenNotPaused
```

**前置条件**:
- USDT授权额度充足
- 合约HAF余额充足

**前端使用**:
```typescript
// 步骤1: 授权USDT
await writeContract({
  address: USDT_ADDRESS,
  abi: ERC20_ABI,
  functionName: 'approve',
  args: [CONTRACT_ADDRESS, amount]
});

// 步骤2: 兑换
await writeContract({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: 'swapUsdtToHaf',
  args: [usdtAmount]
});
```

---

### 5. swapHafToUsdt - HAF兑换USDT

```solidity
function swapHafToUsdt(uint256 _hafAmount) external whenNotPaused
```

**前端使用**:
```typescript
await writeContract({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: 'swapHafToUsdt',
  args: [hafAmount]
});
```

---

### 6. applyForGenesisNode - 申请创世节点

```solidity
function applyForGenesisNode() external whenNotPaused
```

**要求**:
- 最高质押级别达到钻石 (level 4)
- 支付genesisNodeCost费用 (默认5000 USDT)
- 未申请过或已被拒绝

**前端使用**:
```typescript
// 步骤1: 授权USDT
await writeContract({
  address: USDT_ADDRESS,
  abi: ERC20_ABI,
  functionName: 'approve',
  args: [CONTRACT_ADDRESS, genesisNodeCost]
});

// 步骤2: 申请
await writeContract({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: 'applyForGenesisNode'
});
```

---

## 常用枚举和常量

### RewardType 枚举

```solidity
enum RewardType {
    Static,   // 0 - 静态收益 (订单释放)
    Direct,   // 1 - 直推奖励
    Share,    // 2 - 平级奖励
    Team,     // 3 - 团队奖励
    Genesis   // 4 - 创世节点分红
}
```

---

### 重要常量

```solidity
uint256 public constant PRICE_PRECISION = 1e6;  // 价格精度 (6 decimals)
uint256 public constant GENESIS_NODE_EXIT_MULTIPLIER = 3; // 创世节点3倍出局

// 默认值 (可由管理员修改)
uint256 public hafPrice = 0.1 * 1e6;           // 初始价格 0.1 USDT (6 decimals)
uint256 public dailyPriceIncreaseRate = 1;     // 每日涨价 0.1% (千分比)
uint256 public genesisNodeCost = 5000 * 1e6;   // 创世节点费用 5000 USDT
uint256 public withdrawalFeeRate = 10;         // 提现手续费 10%
uint256 public swapFeeRate = 3;                // 闪兑手续费 3%
```

---

## 前端集成注意事项

### 1. ⚠️ 所有结构体返回值都是数组 (Tuple)

```typescript
// ❌ 错误
const referrer = userInfo.referrer;
const amount = order.amount;

// ✅ 正确
const referrer = userInfo[0];
const amount = order[3];
```

---

### 2. ⚠️ BigInt 序列化问题

```typescript
// ❌ 错误 - JSON.stringify会报错
console.log(JSON.stringify(userInfo));

// ✅ 正确 - 使用自定义replacer
console.log(JSON.stringify(userInfo, (_, v) => 
  typeof v === 'bigint' ? v.toString() : v
));
```

---

### 3. ⚠️ Order.level 是直接存储的级别 (1-4)

```typescript
// ❌ 错误 - 根据金额计算级别
const level = amount < 1000 ? 1 : amount < 5000 ? 2 : 3;

// ✅ 正确 - 直接使用 order[2]
const level = order[2]; // 1=青铜, 2=白银, 3=黄金, 4=钻石
```

---

### 4. ⚠️ isCompleted vs isActive

```typescript
// 订单结构中只有 isCompleted
const isCompleted = order[8];

// 前端显示"进行中"需要取反
const isActive = !isCompleted;
```

---

### 5. ⚠️ 函数名称对照

| ❌ 错误名称 | ✅ 正确名称 |
|-----------|-----------|
| getUserStakingOrders | getUserOrders |
| getStakingInfo | getUserInfo |
| claimRewards | withdraw |

---

### 6. ⚠️ 精度处理

```typescript
// USDT: 6 decimals
const usdtAmount = 100n * 10n**6n; // 100 USDT

// HAF: 18 decimals (ERC20标准)
const hafAmount = 100n * 10n**18n; // 100 HAF

// HAF Price: 6 decimals
const hafPrice = 0.1 * 1e6; // 0.1 USDT per HAF
```

---

### 7. ⚠️ 字段映射总结表

| 前端常见需求 | 合约字段路径 | 索引位置 | 类型 |
|------------|------------|---------|-----|
| 推荐人地址 | User.referrer | userInfo[0] | address |
| 团队等级 | User.teamLevel | userInfo[1] | uint8 |
| 累计质押 | User.totalStakedAmount | userInfo[2] | uint256 |
| 是否创世节点 | User.isGenesisNode | userInfo[6] | bool |
| 订单ID | Order.id | order[0] | uint256 |
| 质押级别 | Order.level | order[2] | uint8 (1-4) |
| 质押金额 | Order.amount | order[3] | uint256 |
| 总额度 | Order.totalQuota | order[4] | uint256 |
| 已释放额度 | Order.releasedQuota | order[5] | uint256 |
| 是否完成 | Order.isCompleted | order[8] | bool |
| 收益类型 | RewardRecord.rewardType | record[2] | uint8 (0-4) |

---

## 完整代码示例

### 示例1: 质押流程

```typescript
import { useWriteContract, useReadContract } from 'wagmi';
import { parseUnits } from 'viem';

// 1. 检查推荐人绑定
const { data: userInfo } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: 'getUserInfo',
  args: [userAddress]
});

const hasReferrer = userInfo && userInfo[0][0] !== '0x0000000000000000000000000000000000000000';

// 2. 授权USDT
const { writeContract } = useWriteContract();

const amount = parseUnits('1000', 6); // 1000 USDT (6 decimals)

await writeContract({
  address: USDT_ADDRESS,
  abi: ERC20_ABI,
  functionName: 'approve',
  args: [CONTRACT_ADDRESS, amount]
});

// 3. 质押
await writeContract({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: 'stake',
  args: [amount]
});
```

---

### 示例2: 订单列表显示

```typescript
const { data: orders } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: 'getUserOrders',
  args: [userAddress]
});

const currentOrders = computed(() => {
  if (!orders) return [];
  
  return orders
    .filter(order => !order[8]) // 未完成的订单
    .map(order => ({
      id: order[0],
      level: order[2],
      planName: ['', '青铜', '白银', '黄金', '钻石'][order[2]],
      amount: formatUnits(order[3], 6), // USDT
      totalQuota: formatUnits(order[4], 6),
      releasedQuota: formatUnits(order[5], 6),
      progress: Number(order[5]) / Number(order[4]) * 100,
      isActive: true // !order[8]
    }));
});
```

---

### 示例3: 收益记录显示

```typescript
const { data: records } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: 'getRewardRecords',
  args: [userAddress]
});

const rewardTypeNames = ['静态收益', '直推奖励', '平级奖励', '团队奖励', '创世节点'];

const formattedRecords = computed(() => {
  if (!records) return [];
  
  return records.map(record => ({
    timestamp: new Date(Number(record[0]) * 1000),
    fromUser: record[1],
    typeName: rewardTypeNames[record[2]],
    usdtAmount: formatUnits(record[3], 6),
    hafAmount: formatUnits(record[4], 18)
  }));
});
```

---

## 总结: 避免错误的核心原则

1. **永远使用数组索引访问结构体字段** - `userInfo[0]` 而不是 `userInfo.referrer`
2. **查看合约确认字段名称** - 不要猜测字段名 (如 investedUsdt 不存在)
3. **Order.level 是直接值** - 1-4 表示青铜/白银/黄金/钻石，不需要计算
4. **isCompleted 不等于 isActive** - 需要取反: `isActive = !isCompleted`
5. **精度转换要正确** - USDT 6位, HAF 18位, Price 6位
6. **函数名称精确匹配** - `getUserOrders` 不是 `getUserStakingOrders`

---

**文档版本**: v1.0  
**合约版本**: HashFi.sol (Solidity 0.8.24)  
**最后更新**: 根据完整合约代码 (1235行) 生成
