# 前端数据集成进度

## ✅ 已完成

### Profile.vue - 个人资料页面
**改进内容**:
1. ✅ 移除了不必要的"提现"按钮（提现功能应该在 Income 页面）
2. ✅ 替换为"查看收益"按钮，跳转到 Income 页面
3. ✅ 使用真实钱包地址替换假数据
4. ✅ 集成真实合约数据

**集成的合约数据**:
- ✅ 用户钱包地址（来自 `useAccount`）
- ✅ HAF 代币余额（`useBalance`）
- ✅ 可提取收益（`getClaimableRewards`）
- ✅ 总资产计算（余额 + 可提取收益）
- ✅ 美元价值（基于 HAF 价格）
- ✅ 用户等级（基于总投资金额自动判断）
- ✅ 推荐人地址（`users.referrer`）
- ✅ 管理员权限判断（`owner` 对比）

**用户等级判断逻辑**:
```typescript
投资额 >= 50000 USDT → 钻石
投资额 >= 10000 USDT → 黄金
投资额 >= 1000 USDT → 白银
其他 → 青铜
```

---

## 📋 待完成页面

### 1. Staking.vue - 质押页面
**需要替换的数据**:
- [ ] 用户当前质押订单列表（`getUserStakingOrders`）
- [ ] 每个订单的详细信息（已投资、已释放、剩余额度等）
- [ ] 用户 USDT 余额（用于质押）
- [ ] 最小质押金额验证
- [ ] 质押交易处理（`stakeUsdt`）

**合约函数**:
```solidity
getUserStakingOrders(address user) → StakingOrder[]
stakeUsdt(uint256 usdtAmount, address referrer)
```

---

### 2. Income.vue - 收益页面
**需要替换的数据**:
- [ ] 收益记录列表（`getRewardRecords`）
- [ ] 待提取收益（`getClaimableRewards`）
- [ ] 已提取总额
- [ ] 收益类型分类（静态、动态、团队、创世）
- [ ] 提现功能（`withdraw`）

**合约函数**:
```solidity
getRewardRecords(address user, uint256 offset, uint256 limit) → RewardRecord[]
getClaimableRewards(address user) → (totalUsdt, totalHaf, ...)
withdraw()
```

---

### 3. Team.vue - 团队页面
**需要替换的数据**:
- [ ] 直推团队列表（一级推荐）
- [ ] 团队总人数
- [ ] 团队总业绩
- [ ] 团队收益统计
- [ ] 邀请链接生成

**合约函数**:
```solidity
users(address).referrer → 推荐关系
// 需要遍历或链下索引获取推荐列表
```

**建议**: 团队数据可能需要链下索引支持，因为合约中没有直接存储"我推荐了谁"的数组。

---

### 4. GenesisNode.vue - 创世节点页面
**需要替换的数据**:
- [ ] 用户是否已申请（`genesisApplications`）
- [ ] 用户是否是活跃节点（`isActiveGenesisNode`）
- [ ] 申请状态检查
- [ ] 申请功能（`applyForGenesisNode`）
- [ ] USDT 余额（申请需要 5000 USDT）

**合约函数**:
```solidity
applyForGenesisNode()
genesisApplications(address) → bool
isActiveGenesisNode(address) → bool
```

---

### 5. Swap.vue - 闪兑页面
**需要替换的数据**:
- [ ] USDT 余额
- [ ] HAF 余额
- [ ] HAF 当前价格（`hafPrice`）
- [ ] 兑换比率计算
- [ ] 兑换功能（`swapUsdtToHaf` / `swapHafToUsdt`）

**合约函数**:
```solidity
swapUsdtToHaf(uint256 usdtAmount)
swapHafToUsdt(uint256 hafAmount)
hafPrice → uint256
```

---

### 6. MiningPool.vue - 矿池页面
**需要替换的数据**:
- [ ] BTC 统计数据（`getBtcStats`）
- [ ] 总算力、全网算力
- [ ] BTC 价格、难度
- [ ] 昨日收益

**合约函数**:
```solidity
getBtcStats() → BtcMiningStats
```

---

## 🔧 通用改进建议

### 1. 错误处理
在所有合约调用中添加错误处理：
```typescript
try {
  await writeContract({ ... });
  alert(t('success'));
} catch (error) {
  console.error(error);
  alert(t('failed'));
}
```

### 2. Loading 状态
在数据加载时显示加载提示：
```typescript
const { data, isLoading, error } = useReadContract(...);

// 模板中
<div v-if="isLoading">Loading...</div>
<div v-else-if="error">Error: {{ error.message }}</div>
<div v-else>{{ data }}</div>
```

### 3. 数据刷新
在交易成功后刷新数据：
```typescript
const { refetch } = useReadContract(...);

// 交易成功后
await writeContract(...);
refetch();
```

### 4. 空状态处理
当用户未连接钱包或无数据时显示友好提示：
```vue
<div v-if="!address">
  <p>请先连接钱包</p>
</div>
```

---

## 📊 优先级建议

### 高优先级（核心功能）
1. **Staking.vue** - 质押是核心功能
2. **Income.vue** - 收益查看和提现
3. **GenesisNode.vue** - 创世节点申请

### 中优先级
4. **Swap.vue** - 闪兑功能
5. **Team.vue** - 团队管理

### 低优先级
6. **MiningPool.vue** - 信息展示为主

---

## 🎯 下一步行动

建议按以下顺序进行：
1. ✅ Profile.vue（已完成）
2. → Staking.vue（核心质押功能）
3. → Income.vue（收益和提现）
4. → GenesisNode.vue（节点申请）
5. → Swap.vue（闪兑）
6. → Team.vue（团队，可能需要后端支持）
7. → MiningPool.vue（展示为主）

---

## 💡 技术要点

### HAF 代币地址
HAF 是 ERC20 代币，地址就是 HashFi 合约地址：
```typescript
const HAF_TOKEN_ADDRESS = CONTRACT_ADDRESS;
```

### USDT 授权
在质押、申请节点前需要授权 USDT：
```typescript
// 1. 检查授权额度
const { data: allowance } = useReadContract({
  address: USDT_ADDRESS,
  abi: erc20Abi,
  functionName: 'allowance',
  args: [address, CONTRACT_ADDRESS],
});

// 2. 如果不足，先授权
if (allowance < amount) {
  await writeContract({
    address: USDT_ADDRESS,
    abi: erc20Abi,
    functionName: 'approve',
    args: [CONTRACT_ADDRESS, MAX_UINT256],
  });
}

// 3. 执行质押
await writeContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'stakeUsdt',
  args: [amount, referrer],
});
```

### 数据格式化
使用 viem 的工具函数：
```typescript
import { formatEther, formatUnits, parseEther, parseUnits } from 'viem';

// USDT/HAF (18 decimals)
formatEther(bigintValue)
parseEther(stringValue)

// Price (6 decimals)
formatUnits(bigintValue, 6)
parseUnits(stringValue, 6)
```

---

## 📝 测试检查清单

每个页面完成后需要测试：
- [ ] 未连接钱包时的显示
- [ ] 连接钱包后数据正确加载
- [ ] Loading 状态正常
- [ ] 错误处理正常
- [ ] 交易成功后数据刷新
- [ ] 国际化文本完整
- [ ] 移动端布局正常
