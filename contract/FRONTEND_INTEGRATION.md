# 前端集成指南 - HashFi合约

## 📦 新增查询函数(懒加载,不消耗Gas)

### 1. 获取用户待提取收益
```typescript
const rewards = await contract.getClaimableRewards(userAddress);
// Returns: { 
//   pendingStatic: BigNumber,   // 静态收益
//   pendingDynamic: BigNumber,  // 动态收益(100天释放)
//   pendingGenesis: BigNumber   // 创世节点分红
// }
```

### 2. 获取订单待释放收益
```typescript
const orderReward = await contract.getOrderPendingReward(orderId);
// Returns: { 
//   pendingUsdt: BigNumber,  // 待释放USDT金额
//   pendingHaf: BigNumber    // 待释放HAF数量
// }
```

### 3. 获取用户推荐统计
```typescript
const stats = await contract.getUserReferralStats(userAddress);
// Returns: {
//   totalReferrals: BigNumber,  // 总推荐人数
//   bronzeCount: BigNumber,     // 青铜级数量
//   silverCount: BigNumber,     // 白银级数量
//   goldCount: BigNumber,       // 黄金级数量
//   diamondCount: BigNumber     // 钻石级数量
// }
```

### 4. 获取团队业绩详情
```typescript
const teamData = await contract.getTeamPerformanceDetails(userAddress);
// Returns: {
//   totalPerformance: BigNumber,      // 团队总业绩
//   largestArea: BigNumber,           // 最大区业绩
//   smallArea: BigNumber,             // 小区业绩(用于判断V级)
//   directReferralsCount: BigNumber   // 直推人数
// }
```

### 5. 获取全局统计
```typescript
const globalStats = await contract.getGlobalStats();
// Returns: {
//   totalStakedUsdt: BigNumber,      // 总质押USDT
//   totalOrders: BigNumber,          // 总订单数
//   totalGenesisNodesCount: BigNumber, // 创世节点数
//   currentHafPrice: BigNumber,      // 当前HAF价格
//   contractUsdtBalance: BigNumber,  // 合约USDT余额
//   contractHafBalance: BigNumber    // 合约HAF余额
// }
```

### 6. 按类型筛选收益记录
```typescript
// RewardType: 0=Static, 1=Direct, 2=Share, 3=Team
const records = await contract.getRewardRecordsByType(userAddress, 0);
// Returns: RewardRecord[]
// { timestamp, fromUser, rewardType, usdtAmount, hafAmount }
```

---

## 🎯 事件监听

### 1. 创世节点审核
```typescript
contract.on("GenesisNodeApproved", (user) => {
  console.log(`${user} 的创世节点申请已批准`);
});

contract.on("GenesisNodeRejected", (user) => {
  console.log(`${user} 的创世节点申请被拒绝`);
});
```

### 2. 团队等级升级
```typescript
contract.on("TeamLevelUpdated", (user, oldLevel, newLevel) => {
  console.log(`${user} 从 V${oldLevel} 升级到 V${newLevel}`);
  // 可以触发庆祝动画
});
```

### 3. 代币燃烧
```typescript
contract.on("TokensBurned", (user, hafAmount, usdtAmount) => {
  console.log(`燃烧了 ${formatHAF(hafAmount)} HAF`);
});
```

### 4. 价格更新
```typescript
contract.on("PriceUpdated", (newPrice) => {
  const priceInUsdt = newPrice / 1e6;
  console.log(`HAF价格更新为 ${priceInUsdt} USDT`);
});
```

---

## 🔧 管理员功能(仅Owner可调用)

### 创世节点管理
```typescript
// 批准申请
await contract.approveGenesisNode(applicantAddress);

// 拒绝申请(自动退款)
await contract.rejectGenesisNode(applicantAddress);

// 获取所有节点信息
const nodesInfo = await contract.getAllGenesisNodesInfo();
// Returns: { nodes: address[], totalDividends: uint256[], withdrawn: uint256[] }
```

### 参数配置
```typescript
// 修改质押级别
await contract.updateStakingLevel(
  1, // level: 1=青铜, 2=白银, 3=黄金, 4=钻石
  ethers.utils.parseUnits("100", 18), // minAmount
  ethers.utils.parseUnits("499", 18), // maxAmount
  150, // multiplier: 150 = 1.5倍
  70   // dailyRate: 70 = 0.7%
);

// 修改团队级别
await contract.updateTeamLevel(
  1, // level: V1
  ethers.utils.parseUnits("5000", 18), // requiredPerformance
  5  // accelerationBonus: 5 = 5%加速
);

// 设置HAF价格(手动)
await contract.setHafPrice(ethers.utils.parseUnits("1.5", 6)); // 1.5 USDT

// 设置每日自动涨幅
await contract.setDailyPriceIncreaseRate(2); // 千分之二 = 0.2%

// 启用/禁用自动涨价
await contract.setAutoPriceUpdate(true);

// 修改提现手续费
await contract.setWithdrawalFee(5); // 5%

// 修改闪兑手续费
await contract.setSwapFee(1); // 1%

// 修改创世节点费用
await contract.setGenesisNodeCost(ethers.utils.parseUnits("5000", 18));
```

### 用户管理
```typescript
// 强制结算用户收益
await contract.forceSettleUser(userAddress);

// 手动调整团队等级
await contract.setUserTeamLevel(userAddress, 3); // 设为V3
```

---

## 💡 实用示例

### 实时显示用户资产面板
```typescript
async function getUserDashboard(userAddress: string) {
  const [userInfo, rewards, stats, teamData] = await Promise.all([
    contract.getUserInfo(userAddress),
    contract.getClaimableRewards(userAddress),
    contract.getUserReferralStats(userAddress),
    contract.getTeamPerformanceDetails(userAddress)
  ]);

  return {
    // 基础信息
    referrer: userInfo[0].referrer,
    teamLevel: userInfo[0].teamLevel,
    totalStaked: userInfo[0].totalStakedAmount,
    isGenesisNode: userInfo[0].isGenesisNode,
    
    // 待提取收益
    pendingStatic: formatHAF(rewards.pendingStatic),
    pendingDynamic: formatHAF(rewards.pendingDynamic),
    pendingGenesis: formatHAF(rewards.pendingGenesis),
    
    // 推荐统计
    totalReferrals: stats.totalReferrals.toNumber(),
    referralsByLevel: {
      bronze: stats.bronzeCount.toNumber(),
      silver: stats.silverCount.toNumber(),
      gold: stats.goldCount.toNumber(),
      diamond: stats.diamondCount.toNumber()
    },
    
    // 团队数据
    teamPerformance: {
      total: formatUSDT(teamData.totalPerformance),
      largestArea: formatUSDT(teamData.largestArea),
      smallArea: formatUSDT(teamData.smallArea),
      directCount: teamData.directReferralsCount.toNumber()
    }
  };
}
```

### 订单列表显示
```typescript
async function getUserOrdersWithPending(userAddress: string) {
  const orders = await contract.getUserOrders(userAddress);
  
  const ordersWithRewards = await Promise.all(
    orders.map(async (order) => {
      const pending = await contract.getOrderPendingReward(order.orderId);
      return {
        orderId: order.orderId.toNumber(),
        level: order.level, // 1=青铜, 2=白银, 3=黄金, 4=钻石
        amount: formatUSDT(order.amount),
        totalQuota: formatUSDT(order.totalQuota),
        releasedQuota: formatUSDT(order.releasedQuota),
        isCompleted: order.isCompleted,
        pendingReward: formatHAF(pending.pendingHaf),
        progress: order.releasedQuota.mul(100).div(order.totalQuota).toNumber()
      };
    })
  );
  
  return ordersWithRewards;
}
```

### 收益记录页面
```typescript
async function getRewardHistory(userAddress: string, type?: RewardType) {
  let records;
  
  if (type !== undefined) {
    // 按类型筛选
    records = await contract.getRewardRecordsByType(userAddress, type);
  } else {
    // 获取全部
    records = await contract.getRewardRecords(userAddress);
  }
  
  return records.map(record => ({
    timestamp: new Date(record.timestamp.toNumber() * 1000),
    fromUser: record.fromUser,
    type: ['静态收益', '直推奖励', '分享奖励', '团队奖励'][record.rewardType],
    usdtAmount: formatUSDT(record.usdtAmount),
    hafAmount: formatHAF(record.hafAmount)
  }));
}
```

---

## 🚀 核心用户操作

### 1. 质押(自动触发价格更新)
```typescript
// 用户质押前需先授权USDT
await usdtContract.approve(hashFiAddress, amount);
await contract.stake(amount);
```

### 2. 提现(自动触发价格更新)
```typescript
// 会结算所有收益并提取
await contract.withdraw();
```

### 3. 闪兑(自动触发价格更新)
```typescript
// USDT → HAF
await usdtContract.approve(hashFiAddress, usdtAmount);
await contract.swapUsdtToHaf(usdtAmount);

// HAF → USDT
await contract.swapHafToUsdt(hafAmount);
```

### 4. 申请创世节点
```typescript
// 用户申请(支付5000 USDT)
await usdtContract.approve(hashFiAddress, genesisNodeCost);
await contract.applyForGenesisNode();

// 等待管理员审核...
// 可以监听 GenesisNodeApproved 或 GenesisNodeRejected 事件
```

---

## 📊 辅助函数

```typescript
// 格式化HAF (18位小数)
function formatHAF(amount: BigNumber): string {
  return ethers.utils.formatUnits(amount, 18);
}

// 格式化USDT (18位小数)
function formatUSDT(amount: BigNumber): string {
  return ethers.utils.formatUnits(amount, 18);
}

// 格式化价格 (6位小数)
function formatPrice(price: BigNumber): string {
  return ethers.utils.formatUnits(price, 6);
}

// 计算进度百分比
function calcProgress(released: BigNumber, total: BigNumber): number {
  return released.mul(100).div(total).toNumber();
}
```

---

## ⚡ 性能优化建议

1. **批量查询**: 使用 `Promise.all()` 并行请求多个查询函数
2. **缓存数据**: 全局统计数据可以缓存5-10分钟
3. **分页加载**: 收益记录过多时,在前端分页显示
4. **WebSocket**: 使用事件监听实时更新数据,减少轮询

---

## ⚠️ 注意事项

1. **Gas优化**: `getGlobalStats()` 遍历所有订单,数据量大时可能gas较高
2. **价格更新**: 首次交易跨多天时,价格更新循环会消耗更多gas
3. **审核等待**: 创世节点申请需等待管理员审核
4. **时区处理**: 合约使用 `block.timestamp` (UTC),前端需转换为本地时间

---

## 📞 合约地址(部署后填写)

```typescript
const HASHFI_ADDRESS = "0x..."; // 主合约地址
const USDT_ADDRESS = "0x...";   // USDT代币地址
```

---

## ✨ 总结

所有新增函数都遵循**懒加载原则**:
- ✅ View函数不消耗Gas
- ✅ 只计算不修改状态
- ✅ 实时数据,无需等待区块确认
- ✅ 可以频繁调用用于UI更新

关键功能自动触发价格更新:
- ✅ 纯链上执行,无需预言机
- ✅ 懒加载触发,用户交互时更新
- ✅ 高可靠性,完全去中心化
