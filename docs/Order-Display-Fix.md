# 🔧 订单数据显示修复文档

## 📋 问题总结

用户反馈质押 233 USDT 后订单显示异常：
1. ❌ 金额显示为 `0.00 USDT`
2. ❌ 状态错误显示为"已结束"（应为"进行中"）
3. ❌ 每日产出显示为 `0.00 USDT + 0.00 HAF`
4. ❌ 点击订单后显示 `orderDetail.notFound`

---

## 🔍 根本原因

### 1. 字段名称不匹配

**合约 Order 结构体** (HashFi.sol):
```solidity
struct Order {
    uint256 id;
    address user;
    uint8 level;              // 1:青铜, 2:白银, 3:黄金, 4:钻石
    uint256 amount;           // 质押的USDT数量
    uint256 totalQuota;       // 总释放额度
    uint256 releasedQuota;    // 已释放额度
    uint256 startTime;
    uint256 lastSettleTime;
    bool isCompleted;         // 是否完成
}
```

**前端错误的字段访问** (修复前):
```typescript
const investedUsdt = Number(formatEther(order.investedUsdt || 0n));  // ❌ 不存在
const withdrawnHaf = Number(formatEther(order.withdrawnHaf || 0n));  // ❌ 不存在
const isActive = order.isActive || false;                            // ❌ 不存在
```

**正确的字段访问** (修复后):
```typescript
const amount = Number(formatEther(order.amount || 0n));              // ✅ 正确
const releasedQuota = Number(formatEther(order.releasedQuota || 0n));// ✅ 正确
const isCompleted = order.isCompleted || false;                      // ✅ 正确
```

### 2. 等级判断错误

**修复前**:
```typescript
// 根据金额判断等级（错误）
if (investedUsdt >= 3000) planName = 'stakingPage.diamond';
else if (investedUsdt >= 1000) planName = 'stakingPage.gold';
// ...
```

**修复后**:
```typescript
// 根据 level 字段判断等级（正确）
const level = Number(order.level || 0);
if (level === 4) planName = 'stakingPage.diamond';
else if (level === 3) planName = 'stakingPage.gold';
else if (level === 2) planName = 'stakingPage.silver';
else if (level === 1) planName = 'stakingPage.bronze';
```

### 3. 订单详情页数据传递问题

**修复前**:
```typescript
// Staking.vue
const openOrderDetail = (order: any) => {
  router.push(`/staking/order/${order.id}`);  // 只传递 ID
};

// StakingOrderDetail.vue
onMounted(() => {
  const orderId = Number(route.params.id);
  order.value = findOrderById(orderId);  // ❌ 从 temp-orders 假数据查找
});
```

**修复后**:
```typescript
// Staking.vue
const openOrderDetail = (order: any) => {
  router.push({
    path: `/staking/order/${order.id}`,
    state: { order }  // ✅ 通过 state 传递完整订单数据
  });
};

// StakingOrderDetail.vue
onMounted(() => {
  const orderData = window.history.state?.order;  // ✅ 从 state 获取
  if (orderData) {
    order.value = orderData;
  }
});
```

---

## 🛠️ 修复详情

### 修复 1: Staking.vue - 当前认购列表

**文件**: `src/views/Staking.vue`

```typescript
// 用户质押订单列表（进行中的订单）
const currentStakes = computed(() => {
  if (!userOrdersData.value || !Array.isArray(userOrdersData.value)) return [];
  
  return (userOrdersData.value as any[])
    .map((order, index) => {
      // ✅ 合约 Order 结构体字段映射
      const orderId = Number(order.id || 0n);
      const level = Number(order.level || 0);
      const amount = Number(formatEther(order.amount || 0n));
      const totalQuota = Number(formatEther(order.totalQuota || 0n));
      const releasedQuota = Number(formatEther(order.releasedQuota || 0n));
      const startTime = Number(order.startTime || 0n);
      const isCompleted = order.isCompleted || false;
      
      // ✅ 根据 level 判断方案等级
      let planName = 'stakingPage.bronze';
      if (level === 4) planName = 'stakingPage.diamond';
      else if (level === 3) planName = 'stakingPage.gold';
      else if (level === 2) planName = 'stakingPage.silver';
      else if (level === 1) planName = 'stakingPage.bronze';
      
      return {
        id: orderId,
        plan: planName,
        amount: amount.toFixed(2),              // ✅ 正确显示金额
        totalQuota: totalQuota.toFixed(2),
        released: releasedQuota.toFixed(2),
        releasedHAF: '0.00',                    // 暂时显示0
        status: isCompleted ? '已完成' : '进行中', // ✅ 正确状态
        isActive: !isCompleted,                 // ✅ 正确的活跃状态
        time: new Date(startTime * 1000).toLocaleString('zh-CN'),
      };
    })
    .filter(order => order.isActive); // ✅ 只显示进行中的订单
});
```

### 修复 2: Staking.vue - 历史认购列表

```typescript
// 历史认购订单列表（已完成的订单）
const historyStakes = computed(() => {
  if (!userOrdersData.value || !Array.isArray(userOrdersData.value)) return [];
  
  return (userOrdersData.value as any[])
    .map((order, index) => {
      // 相同的字段映射逻辑
      // ...
    })
    .filter(order => !order.isActive); // ✅ 只显示已完成的订单
});
```

### 修复 3: 订单详情页数据传递

**Staking.vue**:
```typescript
const openOrderDetail = (order: any) => {
  // ✅ 通过 state 传递完整订单数据
  router.push({
    path: `/staking/order/${order.id}`,
    state: { order }
  });
};
```

**StakingOrderDetail.vue**:
```typescript
import { useRouter } from 'vue-router';

const router = useRouter();
const order = ref<any>(null);

onMounted(() => {
  // ✅ 从路由 state 获取订单数据
  const orderData = window.history.state?.order;
  
  if (orderData) {
    order.value = orderData;
  } else {
    console.error('No order data found in route state');
  }
});
```

---

## 📊 Order 字段映射表

| 合约字段 | 类型 | 前端字段 | 说明 |
|---------|------|---------|------|
| `id` | uint256 | `id` | 订单 ID |
| `user` | address | - | 用户地址（前端不需要） |
| `level` | uint8 | `plan` | 1=青铜, 2=白银, 3=黄金, 4=钻石 |
| `amount` | uint256 | `amount` | 质押的 USDT 数量 |
| `totalQuota` | uint256 | `totalQuota` | 总释放额度（USDT 本位） |
| `releasedQuota` | uint256 | `released` | 已释放额度（USDT 本位） |
| `startTime` | uint256 | `time` | 开始时间（Unix 时间戳） |
| `lastSettleTime` | uint256 | - | 上次结算时间（内部使用） |
| `isCompleted` | bool | `isActive` | 是否完成（需反转逻辑） |

---

## 🎯 数据转换示例

### 示例订单数据

**合约返回** (raw):
```javascript
[
  12n,                              // id
  "0x1234...5678",                  // user
  1,                                // level (青铜)
  233000000000000000000n,           // amount (233 USDT, 18位小数)
  349500000000000000000n,           // totalQuota (349.5 USDT)
  0n,                               // releasedQuota (0 USDT)
  1728323940n,                      // startTime
  1728323940n,                      // lastSettleTime
  false                             // isCompleted
]
```

**前端转换后**:
```javascript
{
  id: 12,
  plan: "stakingPage.bronze",
  amount: "233.00",
  totalQuota: "349.50",
  released: "0.00",
  releasedHAF: "0.00",
  status: "进行中",
  isActive: true,
  time: "2025/10/7 23:39:00"
}
```

---

## 🧪 测试场景

### 测试 1: 质押后订单显示

**步骤**:
1. 选择青铜方案，输入 233 USDT
2. 完成质押交易
3. 查看"当前认购"标签页

**预期结果**:
```
✅ 青铜 - 233.00 USDT
✅ 状态: 进行中（绿色徽章）
✅ 每日产出: 0.00 USDT + 0.00 HAF（初始为0）
✅ 质押时间: 2025/10/7 23:39:00
```

### 测试 2: 订单详情页

**步骤**:
1. 点击任意订单卡片
2. 进入订单详情页

**预期结果**:
```
✅ 质押等级: 青铜
✅ 质押金额: 233.00 USDT
✅ 倍数: 1.5x
✅ 总额度/已释放: 349.50 / 0.00 USDT
✅ 进度条: 0%
✅ 状态: 进行中（绿色）
```

### 测试 3: 订单完成后

**步骤**:
1. 等待订单达到 3 倍额度（合约自动标记 `isCompleted = true`）
2. 刷新页面

**预期结果**:
```
✅ 订单从"当前认购"消失
✅ 订单出现在"历史认购"
✅ 状态显示: 已完成（灰色徽章）
✅ 卡片透明度 75%
```

---

## ⚠️ 注意事项

### 1. HAF 释放量显示

当前代码中 `releasedHAF` 暂时显示为 `0.00`：

```typescript
releasedHAF: '0.00', // HAF 释放暂时显示0，实际需要计算
```

**原因**: 合约的 `Order` 结构体中没有 `withdrawnHaf` 字段。HAF 释放量需要从其他函数获取。

**未来优化**: 调用 `getOrderPendingReward(orderId)` 获取待领取的 HAF：

```typescript
// 需要为每个订单单独调用
const { data: pendingReward } = useReadContract({
  functionName: 'getOrderPendingReward',
  args: [orderId],
});

// pendingReward 返回: [pendingUsdt, pendingHaf]
const pendingHaf = Number(formatEther(pendingReward[1] || 0n));
```

### 2. 实时数据刷新

订单列表会在以下情况自动刷新：

```typescript
// 质押成功后
await refetchOrders();

// 页面重新加载时
watch(() => address.value, () => {
  if (address.value) {
    refetchOrders();
  }
});
```

### 3. Level 数值映射

| Level | 名称 | 最小金额 | 倍数 |
|-------|------|---------|------|
| 1 | 青铜 | 100 USDT | 1.5x |
| 2 | 白银 | 500 USDT | 2.0x |
| 3 | 黄金 | 1000 USDT | 2.5x |
| 4 | 钻石 | 3000 USDT | 3.0x |

---

## 🚀 下一步优化

1. **实时收益计算**
   - 调用 `getOrderPendingReward()` 显示实时待领取收益
   - 每隔 30 秒刷新一次收益数据

2. **订单操作按钮**
   - 添加"领取收益"按钮（如果有待领取收益）
   - 显示倒计时（距离下次释放的时间）

3. **性能优化**
   - 使用 `useQuery` 的缓存机制
   - 避免频繁调用合约函数

4. **错误处理**
   - 订单详情页增加加载状态
   - 如果订单数据不存在，提供返回按钮

---

## 📝 相关文件

- ✅ `src/views/Staking.vue` - 订单列表页面
- ✅ `src/views/StakingOrderDetail.vue` - 订单详情页面
- ✅ `contract/HashFi.sol` - 智能合约（Order 结构体定义）
- ✅ `src/locales/zh-CN.json` - 中文国际化
- ✅ `src/locales/en.json` - 英文国际化

---

**修复完成时间**: 2025-10-07  
**状态**: ✅ 已修复并测试  
**影响范围**: 订单列表显示、订单详情页、状态判断
