# Swap.vue 真实数据集成文档

> **完成时间**: 2025-10-08  
> **状态**: ✅ 已完成

## 实现概述

成功将 Swap.vue 从模拟数据替换为真实合约数据集成,实现了完整的 USDT ↔ HAF 双向闪兑功能。

---

## 核心功能

### 1. HAF 价格查询 ⭐

**合约变量**: `hafPrice` (public uint256)

```typescript
const { data: hafPrice } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'hafPrice',
  query: {
    refetchInterval: 30000, // 每30秒刷新一次
  }
});
```

**数据格式**: 6 decimals  
**示例**: `100000` = `0.10 USDT`

**显示逻辑**:
```typescript
const hafPriceDisplay = computed(() => {
  if (!hafPrice.value) return '0.00';
  return parseFloat(formatUnits(hafPrice.value as bigint, 6)).toFixed(4);
});
```

---

### 2. 余额查询 💰

#### USDT 余额

```typescript
const { data: usdtBalance, refetch: refetchUsdtBalance } = useBalance({
  address: address,
  token: USDT_ADDRESS,
});

// 显示: 6 decimals, 2位小数
const usdtBalanceDisplay = parseFloat(formatUnits(usdtBalance.value, 6)).toFixed(2);
```

#### HAF 余额

```typescript
const { data: hafBalance, refetch: refetchHafBalance } = useBalance({
  address: address,
  token: CONTRACT_ADDRESS,
});

// 显示: 18 decimals, 4位小数
const hafBalanceDisplay = parseFloat(formatUnits(hafBalance.value, 18)).toFixed(4);
```

---

### 3. 汇率计算 📊

**实时汇率**:

```typescript
const currentRate = computed(() => {
  if (!hafPrice.value) return '0';
  const price = parseFloat(formatUnits(hafPrice.value as bigint, 6));
  
  if (fromToken.name === 'USDT') {
    // USDT → HAF: 1 USDT = 1/hafPrice HAF
    // 例: hafPrice = 0.1, 则 1 USDT = 10 HAF
    return (1 / price).toFixed(4);
  } else {
    // HAF → USDT: 1 HAF = hafPrice USDT
    // 例: hafPrice = 0.1, 则 1 HAF = 0.1 USDT
    return price.toFixed(4);
  }
});
```

**金额计算**:

```typescript
// USDT → HAF
if (fromToken.name === 'USDT') {
  toAmount = fromAmount / hafPrice;
}

// HAF → USDT
if (fromToken.name === 'HAF') {
  toAmount = fromAmount * hafPrice;
}
```

---

### 4. USDT 授权流程 🔐

**检查授权额度**:

```typescript
const { data: allowance, refetch: refetchAllowance } = useReadContract({
  address: USDT_ADDRESS,
  abi: ERC20_ABI,
  functionName: 'allowance',
  args: [userAddress, CONTRACT_ADDRESS],
});

const needsApproval = computed(() => {
  if (fromToken.name !== 'USDT' || !fromAmount.value) return false;
  const amount = parseUnits(fromAmount.value.toString(), 6);
  return (allowance.value as bigint) < amount;
});
```

**执行授权**:

```typescript
const handleApprove = async () => {
  const amount = parseUnits(fromAmount.value.toString(), 6);
  await approve({
    address: USDT_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [CONTRACT_ADDRESS, amount],
  });
};
```

---

### 5. 兑换功能 🔄

#### USDT → HAF

**合约函数**: `swapUsdtToHaf(uint256 _usdtAmount)`

```typescript
const amount = parseUnits(fromAmount.value.toString(), 6); // 6 decimals
await swap({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'swapUsdtToHaf',
  args: [amount],
});
```

**兑换规则** (合约逻辑):
- 收取 swapFeeRate 手续费 (默认3%)
- 按照 hafPrice 计算 HAF 数量
- 直接转 HAF 到用户地址

#### HAF → USDT

**合约函数**: `swapHafToUsdt(uint256 _hafAmount)`

```typescript
const amount = parseUnits(fromAmount.value.toString(), 18); // 18 decimals
await swap({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'swapHafToUsdt',
  args: [amount],
});
```

**兑换规则** (合约逻辑):
- 收取 swapFeeRate 手续费 (默认3%)
- 按照 hafPrice 计算 USDT 数量
- 直接转 USDT 到用户地址

---

### 6. 切换代币方向 🔁

```typescript
const switchTokens = () => {
  const tempToken = { ...fromToken };
  Object.assign(fromToken, toToken);
  Object.assign(toToken, tempToken);
  handleFromAmountChange(); // 重新计算金额
};
```

**效果**:
- USDT → HAF 切换为 HAF → USDT
- 自动重新计算兑换金额
- 重置授权状态检查

---

## 业务逻辑

### 按钮状态机

```typescript
const buttonText = computed(() => {
  if (!address) return '连接钱包';
  if (!fromAmount || fromAmount <= 0) return '输入金额';
  if (fromToken.name === 'USDT' && fromAmount < 10) return '最小兑换 10 USDT';
  if (fromAmount > parseFloat(fromToken.balance)) return '余额不足';
  if (needsApproval.value) return '授权 USDT';
  if (isApproving) return '处理中...';
  if (isSwapping) return '处理中...';
  return '确认兑换';
});
```

**状态优先级**:
1. 未连接钱包 → 连接钱包
2. 未输入金额 → 输入金额
3. 金额 < 10 USDT → 最小兑换提示
4. 金额 > 余额 → 余额不足
5. 需要授权 → 授权 USDT
6. 授权中/兑换中 → 处理中
7. 正常 → 确认兑换

---

### 验证规则

```typescript
const canSwap = computed(() => {
  if (!address || !fromAmount || fromAmount <= 0) return false;
  if (fromToken.name === 'USDT' && fromAmount < 10) return false; // 最小10 USDT
  
  const balance = parseFloat(fromToken.balance);
  if (fromAmount > balance) return false; // 余额不足
  
  return true;
});
```

---

## 数据流程图

```
用户输入金额
    ↓
计算汇率 (基于 hafPrice)
    ↓
显示预计获得数量
    ↓
检查余额充足 ← useBalance (USDT/HAF)
    ↓
USDT → HAF: 检查授权 ← allowance
    ↓                     ↓ (需要授权)
    ↓                 approve() → 等待确认
    ↓                              ↓
    ↓ ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
    ↓
swapUsdtToHaf() / swapHafToUsdt()
    ↓
等待交易确认
    ↓
成功提示 + 刷新余额 + 清空输入
```

---

## 技术细节

### 精度处理

```typescript
// USDT: 6 decimals
const usdtAmount = parseUnits('100', 6);     // 100 USDT
const usdtDisplay = formatUnits(amount, 6);  // "100.000000"

// HAF: 18 decimals
const hafAmount = parseUnits('100', 18);     // 100 HAF
const hafDisplay = formatUnits(amount, 18);  // "100.000000000000000000"

// HAF Price: 6 decimals
const price = formatUnits(hafPrice, 6);      // "0.100000"
```

### 代币配置

```typescript
const tokens = computed(() => ({
  HAF: { 
    name: 'HAF', 
    icon: '/icons/coin.svg', 
    balance: hafBalanceDisplay.value, 
    decimals: 18,
    address: CONTRACT_ADDRESS
  },
  USDT: { 
    name: 'USDT', 
    icon: '/icons/usdt.svg', 
    balance: usdtBalanceDisplay.value, 
    decimals: 6,
    address: USDT_ADDRESS
  },
}));
```

### 响应式更新

```typescript
// 监听代币余额变化,自动更新界面
watch(() => tokens.value, (newTokens) => {
  Object.assign(fromToken, fromToken.name === 'USDT' ? newTokens.USDT : newTokens.HAF);
  Object.assign(toToken, toToken.name === 'USDT' ? newTokens.USDT : newTokens.HAF);
}, { deep: true });

// 监听授权成功
watch(() => isApproveSuccess, (success) => {
  if (success) {
    toast.success('授权成功');
    refetchAllowance(); // 刷新授权额度
  }
});

// 监听兑换成功
watch(() => isSwapSuccess, (success) => {
  if (success) {
    toast.success('兑换成功');
    refetchUsdtBalance();
    refetchHafBalance();
    refetchPrice();
    fromAmount.value = null;
    toAmount.value = null;
  }
});
```

---

## 国际化翻译

### 中文 (zh-CN.json)

```json
"swapPage": {
  "title": "闪兑",
  "from": "从",
  "to": "到",
  "balance": "余额",
  "swap": "确认兑换",
  "approve": "授权 USDT",
  "approveSuccess": "授权成功",
  "swapSuccess": "兑换成功",
  "insufficientBalance": "余额不足",
  "minSwapAmountError": "最小兑换 10 USDT"
}
```

### 英文 (en.json)

```json
"swapPage": {
  "title": "Swap",
  "from": "From",
  "to": "To",
  "balance": "Balance",
  "swap": "Confirm Swap",
  "approve": "Approve USDT",
  "approveSuccess": "Approve Success",
  "swapSuccess": "Swap Success",
  "insufficientBalance": "Insufficient Balance",
  "minSwapAmountError": "Minimum 10 USDT"
}
```

---

## UI 优化

### 卡片设计
- 白色背景 + 圆角 + 阴影
- 装饰性渐变背景圆圈
- 代币图标 + 名称下拉选择器 (预留功能)
- 实时汇率提示 (带图标)

### 切换按钮
- 圆形蓝色渐变按钮
- 双向箭头图标
- 悬浮放大 + 阴影效果
- 白色边框突出效果

### 输入框
- 右对齐大号字体
- 透明背景
- 底部显示美元等值
- 实时计算联动

### 提示信息
- 最小兑换金额: 红橙渐变卡片 + 警告图标
- 汇率信息: 蓝色图标 + 小字体
- 接收地址: 蓝色背景卡片

---

## 已知问题

### TypeScript 类型警告

**问题**: wagmi v2 的类型推断问题

```typescript
// 会有类型警告但不影响运行
const { data: allowance } = useReadContract({
  address: USDT_ADDRESS, // 类型警告
  args: allowanceArgs,    // 类型警告
});
```

**原因**: `@wagmi/vue` 的类型定义与 computed 返回类型不完全匹配

**影响**: 仅编译警告,运行时完全正常

**解决方案**: 可以使用 `as any` 或等待 wagmi 更新

---

## 测试要点

### 功能测试
- [ ] 连接钱包后正确显示余额
- [ ] HAF 价格实时显示正确
- [ ] 汇率计算准确
- [ ] USDT → HAF 兑换金额计算正确
- [ ] HAF → USDT 兑换金额计算正确
- [ ] 切换方向正常工作
- [ ] 授权流程完整 (检查 → 授权 → 兑换)
- [ ] 兑换成功后余额刷新
- [ ] 兑换成功后输入清空

### 边界测试
- [ ] 无钱包连接: 显示"连接钱包"
- [ ] 未输入金额: 按钮禁用
- [ ] 金额 < 10 USDT: 显示错误提示
- [ ] 金额 > 余额: 显示"余额不足"
- [ ] USDT未授权: 显示"授权 USDT"
- [ ] 授权失败: 显示错误提示
- [ ] 兑换失败: 显示错误提示

### UI测试
- [ ] 切换按钮动画流畅
- [ ] 输入联动计算准确
- [ ] Loading 状态显示正确
- [ ] Toast 提示正常
- [ ] 多语言切换正确

---

## 合约交互总结

| 功能 | 合约函数 | 参数 | 返回值 |
|-----|---------|-----|-------|
| 查询价格 | hafPrice | - | uint256 (6 decimals) |
| USDT→HAF | swapUsdtToHaf | uint256 _usdtAmount | - |
| HAF→USDT | swapHafToUsdt | uint256 _hafAmount | - |
| 查询授权 | allowance | address owner, address spender | uint256 |
| 授权USDT | approve | address spender, uint256 amount | bool |

---

## 下一步

已完成 Swap.vue,接下来建议:

1. **GenesisNode.vue** - 创世节点申请页面
   - 检查申请状态 (isApplicationPending)
   - 申请功能 (applyForGenesisNode)
   - 创世节点收益显示
   
2. **Team.vue** - 团队页面
   - 直推列表 (getDirectReferrals)
   - 团队统计 (getUserReferralStats)
   - 业绩详情 (getTeamPerformanceDetails)

3. **MiningPool.vue** - BTC矿池页面
   - BTC统计数据 (getBtcStats)
   - 显示矿池信息

---

**完成状态**: ✅ 完整实现,可投入测试  
**相关文档**: docs/Contract-Structure-Reference.md
