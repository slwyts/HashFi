# 🔧 用户信息数据结构修复文档

## 📋 问题描述

**问题现象**:
1. ✗ 已绑定推荐人后，Staking 页面仍提示"需要先绑定推荐人"
2. ✗ Profile 页面不显示已绑定的推荐人
3. ✗ BindReferrerModal 模态框无法正确判断绑定状态

**根本原因**:
合约 `users` 函数返回的是 **tuple（元组）**，而不是对象。在 Wagmi/Viem 中，tuple 会被转换为 **数组** 格式。

---

## 🔍 数据结构分析

### 合约 ABI 定义

```json
{
  "name": "users",
  "outputs": [
    { "name": "referrer", "type": "address" },          // index 0
    { "name": "teamLevel", "type": "uint8" },           // index 1
    { "name": "totalStakedAmount", "type": "uint256" }, // index 2
    { "name": "teamTotalPerformance", "type": "uint256" }, // index 3
    { "name": "isGenesisNode", "type": "bool" },        // index 4
    { "name": "genesisDividendsWithdrawn", "type": "uint256" }, // index 5
    { "name": "dynamicRewardTotal", "type": "uint256" }, // index 6
    // ... 更多字段
  ]
}
```

### 前端实际返回

```typescript
// ❌ 错误假设（对象格式）
userInfo = {
  referrer: "0x1234...",
  teamLevel: 1,
  totalStakedAmount: 1000000000000000000n,
  // ...
}

// ✅ 实际返回（数组格式）
userInfo = [
  "0x1234...",              // [0] referrer
  1,                        // [1] teamLevel  
  1000000000000000000n,     // [2] totalStakedAmount
  0n,                       // [3] teamTotalPerformance
  false,                    // [4] isGenesisNode
  0n,                       // [5] genesisDividendsWithdrawn
  0n,                       // [6] dynamicRewardTotal
  // ...
]
```

---

## 🛠️ 修复方案

### 1. Profile.vue - 推荐人显示

**修复前**:
```typescript
const referrerDisplay = computed(() => {
  if (!userInfo.value) return t('profilePage.notBound');
  
  const info = userInfo.value as any;
  const referrer = info.referrer as string; // ❌ 访问不存在的属性
  
  if (!referrer || referrer === '0x0000000000000000000000000000000000000000') {
    return t('profilePage.notBound');
  }
  
  return `${referrer.substring(0, 6)}...${referrer.substring(referrer.length - 4)}`;
});
```

**修复后**:
```typescript
const referrerDisplay = computed(() => {
  if (!userInfo.value) return t('profilePage.notBound');
  
  // ✅ userInfo 是数组: [referrer, teamLevel, totalStakedAmount, ...]
  const info = userInfo.value as any[];
  const referrer = info[0] as string; // ✅ index 0 是 referrer
  
  if (!referrer || referrer === '0x0000000000000000000000000000000000000000') {
    return t('profilePage.notBound');
  }
  
  return `${referrer.substring(0, 6)}...${referrer.substring(referrer.length - 4)}`;
});
```

---

### 2. Profile.vue - 用户等级

**修复前**:
```typescript
const userLevel = computed(() => {
  if (!userInfo.value) return '';
  
  const info = userInfo.value as any;
  const totalInvested = Number(formatEther(info.totalInvestedUsdt || 0n)); // ❌ 字段不存在
  
  if (totalInvested >= 50000) return 'stakingPage.diamond';
  if (totalInvested >= 10000) return 'stakingPage.gold';
  if (totalInvested >= 1000) return 'stakingPage.silver';
  return 'stakingPage.bronze';
});
```

**修复后**:
```typescript
const userLevel = computed(() => {
  if (!userInfo.value) return '';
  
  // ✅ userInfo 是数组: [referrer, teamLevel, totalStakedAmount, ...]
  const info = userInfo.value as any[];
  const totalInvested = Number(formatEther(info[2] || 0n)); // ✅ index 2 是 totalStakedAmount
  
  if (totalInvested >= 50000) return 'stakingPage.diamond';
  if (totalInvested >= 10000) return 'stakingPage.gold';
  if (totalInvested >= 1000) return 'stakingPage.silver';
  return 'stakingPage.bronze';
});
```

---

### 3. Staking.vue - 推荐人检查

**修复前**:
```typescript
try {
  // 0. 检查是否绑定推荐人
  const referrer = (userInfo.value as any)?.referrer || '0x0000000000000000000000000000000000000000'; // ❌
  if (referrer === '0x0000000000000000000000000000000000000000') {
    toast.warning(t('stakingPage.bindReferrerFirst'));
    isProcessing.value = false;
    router.push('/profile');
    return;
  }
  
  const amount = parseEther(stakeAmount.value.toString());
  // ...
}
```

**修复后**:
```typescript
try {
  // 0. 检查是否绑定推荐人
  // ✅ userInfo 是数组: [referrer, teamLevel, totalStakedAmount, ...]
  const info = userInfo.value as any[];
  const referrer = info?.[0] || '0x0000000000000000000000000000000000000000'; // ✅ index 0
  
  if (referrer === '0x0000000000000000000000000000000000000000') {
    toast.warning(t('stakingPage.bindReferrerFirst'));
    isProcessing.value = false;
    router.push('/profile');
    return;
  }
  
  const amount = parseEther(stakeAmount.value.toString());
  // ...
}
```

---

### 4. Profile.vue - BindReferrerModal Props

**修复前**:
```vue
<BindReferrerModal
  :visible="showBindReferrerModal"
  :owner-address="ownerAddress as string"
  :current-referrer="userInfo ? (userInfo as any).referrer : undefined"  <!-- ❌ -->
  @close="showBindReferrerModal = false"
  @success="handleBindSuccess"
/>
```

**修复后**:
```vue
<BindReferrerModal
  :visible="showBindReferrerModal"
  :owner-address="ownerAddress as string"
  :current-referrer="userInfo ? (userInfo as any[])[0] : undefined"  <!-- ✅ -->
  @close="showBindReferrerModal = false"
  @success="handleBindSuccess"
/>
```

---

## 🧪 测试验证

### 测试步骤

1. **绑定推荐人测试**
   ```
   1. 打开 Profile 页面
   2. 查看"绑定推荐人"右侧显示
      ✓ 应显示"未绑定"（如果未绑定）
      ✓ 应显示地址简化格式（如果已绑定）
   3. 点击"绑定推荐人"
   4. 使用默认推荐人绑定
   5. 绑定成功后页面刷新
   6. 验证"绑定推荐人"右侧显示地址
   ```

2. **质押页面检查测试**
   ```
   1. 未绑定状态下进入 Staking 页面
   2. 选择方案，输入金额，点击"认购"
      ✓ 应提示"请先绑定推荐人"
      ✓ 自动跳转到 Profile 页面
   
   3. 绑定推荐人后返回 Staking 页面
   4. 再次尝试质押
      ✓ 应正常进入授权流程
      ✓ 不再提示绑定推荐人
   ```

3. **调试信息验证**
   ```
   打开 Profile 页面，查看黄色调试框:
   
   应看到类似输出:
   [
     "0x1234567890abcdef...",  // referrer
     0,                        // teamLevel
     "1000000000000000000",    // totalStakedAmount (BigInt)
     "0",                      // teamTotalPerformance
     false,                    // isGenesisNode
     "0",                      // genesisDividendsWithdrawn
     "0"                       // dynamicRewardTotal
   ]
   ```

---

## 📊 数据索引映射表

| 索引 | 字段名 | 类型 | 说明 |
|------|--------|------|------|
| `[0]` | `referrer` | `address` | 推荐人地址 |
| `[1]` | `teamLevel` | `uint8` | 团队等级 (0-5) |
| `[2]` | `totalStakedAmount` | `uint256` | 总质押金额 (USDT) |
| `[3]` | `teamTotalPerformance` | `uint256` | 团队总业绩 |
| `[4]` | `isGenesisNode` | `bool` | 是否创世节点 |
| `[5]` | `genesisDividendsWithdrawn` | `uint256` | 已提取创世分红 |
| `[6]` | `dynamicRewardTotal` | `uint256` | 动态奖励总额 |
| `[7]` | `teamMemberCount` | `uint256` | 团队成员数 |
| `[8]` | `directReferralsCount` | `uint256` | 直推人数 |

---

## 🎯 使用指南

### 如何正确访问 userInfo 数据

```typescript
// 1. 读取用户信息
const { data: userInfo } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'users',
  args: [userAddress],
});

// 2. 类型断言为数组
const info = userInfo.value as any[];

// 3. 按索引访问字段
const referrer = info[0] as string;               // 推荐人
const teamLevel = info[1] as number;              // 团队等级
const totalStaked = info[2] as bigint;            // 总质押额
const isGenesisNode = info[4] as boolean;         // 创世节点状态

// 4. BigInt 字段需要格式化
const stakedAmount = Number(formatEther(totalStaked)); // 转为数字
```

### 常用代码片段

#### 检查是否绑定推荐人
```typescript
const hasReferrer = computed(() => {
  if (!userInfo.value) return false;
  const info = userInfo.value as any[];
  const referrer = info[0] as string;
  return referrer !== '0x0000000000000000000000000000000000000000';
});
```

#### 格式化推荐人地址显示
```typescript
const referrerShort = computed(() => {
  if (!userInfo.value) return 'N/A';
  const info = userInfo.value as any[];
  const referrer = info[0] as string;
  
  if (referrer === '0x0000000000000000000000000000000000000000') {
    return 'Not Bound';
  }
  
  return `${referrer.substring(0, 6)}...${referrer.substring(38)}`;
});
```

#### 判断用户等级
```typescript
const getUserTier = computed(() => {
  if (!userInfo.value) return 'bronze';
  const info = userInfo.value as any[];
  const stakedAmount = Number(formatEther(info[2] || 0n));
  
  if (stakedAmount >= 50000) return 'diamond';
  if (stakedAmount >= 10000) return 'gold';
  if (stakedAmount >= 1000) return 'silver';
  return 'bronze';
});
```

---

## 🚨 注意事项

### 1. 类型安全
```typescript
// ❌ 不要这样做（假设是对象）
const referrer = userInfo.value?.referrer;

// ✅ 应该这样做（明确为数组）
const info = userInfo.value as any[];
const referrer = info?.[0];
```

### 2. 空值检查
```typescript
// ✅ 始终检查 userInfo 是否存在
if (!userInfo.value) return defaultValue;

// ✅ 使用可选链和默认值
const referrer = (userInfo.value as any[])?.[0] || '0x0000000000000000000000000000000000000000';
```

### 3. BigInt 处理
```typescript
// ❌ 直接使用 BigInt 会导致显示问题
const amount = info[2]; // 1000000000000000000n

// ✅ 使用 formatEther 转换
const amount = Number(formatEther(info[2] || 0n)); // 1.0
```

### 4. 其他合约函数
```typescript
// 类似的 tuple 返回函数也需要注意:
// - getStakingOrder(orderId) → 返回数组
// - getClaimableRewards(user) → 返回数组
// - getBtcStats() → 返回数组

// 统一处理模式:
const data = result.value as any[];
const field1 = data[0];
const field2 = data[1];
```

---

## 📝 更新日志

### v1.0.2 (2025-10-07)
- ✅ 修复 BigInt 序列化错误
- ✅ 添加 `debugUserInfo` computed 属性处理 BigInt 显示
- ✅ 使用自定义 JSON replacer 函数将 BigInt 转换为字符串

### v1.0.1 (2025-10-07)
- ✅ 修复 Profile.vue 推荐人显示逻辑（对象 → 数组）
- ✅ 修复 Profile.vue 用户等级计算（totalInvestedUsdt → totalStakedAmount）
- ✅ 修复 Staking.vue 推荐人检查逻辑
- ✅ 修复 BindReferrerModal 的 currentReferrer prop 传递
- ✅ 添加调试信息展示（黄色框显示原始数据）

### v1.0.0 (2025-01-XX)
- 初始实现（错误版本，假设返回对象）

---

## 🔍 调试技巧

### 1. 临时调试显示

在 Profile.vue 中已添加：
```vue
<!-- 调试信息 -->
<div v-if="userInfo" class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-xs overflow-auto">
  <p class="font-bold mb-2">🔍 调试 - userInfo 数据:</p>
  <pre>{{ debugUserInfo }}</pre>
</div>
```

**对应的 computed 属性**:
```typescript
// 调试信息 - 序列化 BigInt
const debugUserInfo = computed(() => {
  if (!userInfo.value) return 'No data';
  
  try {
    // 自定义序列化，将 BigInt 转换为字符串
    return JSON.stringify(
      userInfo.value,
      (key, value) => typeof value === 'bigint' ? value.toString() + 'n' : value,
      2
    );
  } catch (error) {
    return `Error: ${error}`;
  }
});
```

**为什么需要自定义序列化**:
- BigInt 类型无法直接使用 `JSON.stringify()` 序列化
- 会抛出错误: `TypeError: Do not know how to serialize a BigInt`
- 使用 replacer 函数将 BigInt 转换为字符串 + 'n' 后缀标识

**用途**: 查看 userInfo 的实际结构和值

**移除时机**: 确认一切正常后可删除此调试块

### 2. Console 日志

```typescript
// 在 computed 中添加日志
const referrerDisplay = computed(() => {
  console.log('🔍 userInfo:', userInfo.value);
  console.log('🔍 referrer:', (userInfo.value as any[])?.[0]);
  // ...
});
```

### 3. Vue DevTools

安装 Vue DevTools 浏览器扩展，查看组件状态：
- 找到 Profile 组件
- 查看 `userInfo` 的 `data` 属性
- 验证是否为数组格式

---

## 🎓 最佳实践

1. **统一数据访问模式**
   - 所有访问 `userInfo` 的地方都先断言为数组
   - 使用常量定义索引位置（可选优化）

2. **创建辅助函数**（未来优化）
   ```typescript
   // composables/useUserInfo.ts
   export const useUserInfo = (userInfo: Ref<any>) => {
     const referrer = computed(() => (userInfo.value as any[])?.[0] || '0x0');
     const teamLevel = computed(() => (userInfo.value as any[])?.[1] || 0);
     const totalStaked = computed(() => (userInfo.value as any[])?.[2] || 0n);
     
     return { referrer, teamLevel, totalStaked };
   };
   ```

3. **类型定义**（未来优化）
   ```typescript
   type UserInfoTuple = [
     string,  // referrer
     number,  // teamLevel
     bigint,  // totalStakedAmount
     bigint,  // teamTotalPerformance
     boolean, // isGenesisNode
     bigint,  // genesisDividendsWithdrawn
     bigint,  // dynamicRewardTotal
     bigint,  // teamMemberCount
     bigint,  // directReferralsCount
   ];
   
   const info = userInfo.value as UserInfoTuple;
   const referrer = info[0]; // 类型安全
   ```

---

## 📞 相关文档

- [Referrer-Logic-Explained.md](./Referrer-Logic-Explained.md) - 推荐人逻辑详解
- [Referrer-Binding-UI-Implementation.md](./Referrer-Binding-UI-Implementation.md) - 绑定 UI 实现
- [Owner-Referrer-Optimization.md](./Owner-Referrer-Optimization.md) - Owner 冷启动方案

---

**文档编写**: GitHub Copilot  
**最后更新**: 2025-10-07  
**状态**: ✅ 已修复 | 🧪 待测试验证
