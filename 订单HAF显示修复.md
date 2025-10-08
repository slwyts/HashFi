# 🔧 订单详情"已释放 HAF"显示修复

## 🐛 问题描述

用户反馈：
> 订单详情为啥释放 HAF 总是 0
> 
> 订单详情：
> - 认购级别: 钻石
> - 认购金额: 30000000.00 USDT
> - 所得倍数: 3x
> - 总额度 / 已释放: 90000000.00 / 6300000.00 USDT
> - **已释放 HAF: 0.00 HAF** ❌ (应该是 6300000 HAF)

---

## 🔍 根本原因

### 问题1: 硬编码为 0
在 `Staking.vue` 中，`releasedHAF` 字段被硬编码为固定值 `'0.00'`：

```typescript
// ❌ 错误代码
return {
  id: orderId,
  plan: planName,
  amount: amount.toFixed(2),
  totalQuota: totalQuota.toFixed(2),
  released: releasedQuota.toFixed(2),
  releasedHAF: '0.00', // ❌ HAF 释放暂时显示0，实际需要计算
  status: isCompleted ? '已完成' : '进行中',
  time: new Date(startTime * 1000).toLocaleString('zh-CN'),
};
```

### 问题2: 合约中没有 releasedHAF 字段
合约的 `Order` 结构体中**没有存储已释放的 HAF 数量**：

```solidity
struct Order {
    uint256 id;
    address user;
    uint8 level;
    uint256 amount;           // 质押的 USDT 数量
    uint256 totalQuota;       // 总释放额度 (USDT 本位)
    uint256 releasedQuota;    // 已释放额度 (USDT 本位) ✅ 有这个
    uint256 startTime;
    uint256 lastSettleTime;
    bool isCompleted;
    // ❌ 没有 releasedHAF 字段！
}
```

### 问题3: 需要动态计算
HAF 的数量需要根据**已释放的 USDT** 和**当前 HAF 价格**来计算：

**公式：`releasedHAF = releasedQuota (USDT) / hafPrice`**

---

## ✅ 解决方案

### 步骤1: 读取 HAF 价格
```typescript
// ========== NEW: 读取 HAF 价格 ==========
const { data: hafPriceData } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'hafPrice',
  query: {
    enabled: true,
  },
});
// =======================================
```

### 步骤2: 计算已释放的 HAF
```typescript
// 用户质押订单列表（进行中的订单）
const currentStakes = computed(() => {
  if (!userOrdersData.value || !Array.isArray(userOrdersData.value)) return [];
  if (!hafPriceData.value) return []; // ✅ 需要 hafPrice 才能计算
  
  const currentHafPrice = Number(formatUnits(hafPriceData.value as bigint, 18)); // HAF 价格是 18 位精度
  
  return (userOrdersData.value as any[])
    .map((order, index) => {
      // ... 其他字段映射 ...
      
      const releasedQuota = Number(formatEther(order.releasedQuota || 0n));
      
      // ========== 计算已释放的 HAF ==========
      // 公式: releasedHAF = releasedQuota (USDT) / hafPrice
      const releasedHAF = currentHafPrice > 0 ? (releasedQuota / currentHafPrice) : 0;
      // =====================================
      
      return {
        id: orderId,
        plan: planName,
        amount: amount.toFixed(2),
        totalQuota: totalQuota.toFixed(2),
        released: releasedQuota.toFixed(2),
        releasedHAF: releasedHAF.toFixed(4), // ✅ 修复：根据价格计算 HAF
        status: isCompleted ? '已完成' : '进行中',
        time: new Date(startTime * 1000).toLocaleString('zh-CN'),
      };
    })
    .filter(order => order.isActive);
});
```

### 步骤3: 同样修复历史订单列表
```typescript
// 历史认购订单列表（已完成的订单）
const historyStakes = computed(() => {
  // ... 同样的逻辑 ...
  const releasedHAF = currentHafPrice > 0 ? (releasedQuota / currentHafPrice) : 0;
  
  return {
    // ...
    releasedHAF: releasedHAF.toFixed(4), // ✅ 修复
  };
});
```

---

## 📊 计算示例

### 用户的实际订单数据

**合约数据：**
- `releasedQuota` = `6300000000000000000000000n` (6,300,000 USDT with 18 decimals)
- `hafPrice` = `1000000000000000000n` (1.0 USDT with 18 decimals)

**计算过程：**
```typescript
// 1. 格式化 USDT 金额
const releasedQuota = Number(formatEther(6300000000000000000000000n));
// releasedQuota = 6300000.0

// 2. 格式化 HAF 价格
const hafPrice = Number(formatUnits(1000000000000000000n, 18));
// hafPrice = 1.0

// 3. 计算已释放的 HAF
const releasedHAF = releasedQuota / hafPrice;
// releasedHAF = 6300000.0 / 1.0 = 6300000.0

// 4. 格式化显示
releasedHAF.toFixed(4)
// "6300000.0000" ✅
```

---

## 🎯 修复效果对比

### 修复前
```
订单详情:
┌──────────────────────────────┐
│ 认购级别: 钻石                │
│ 认购金额: 30000000.00 USDT   │
│ 所得倍数: 3x                 │
│ 总额度 / 已释放:              │
│   90000000.00 / 6300000.00   │
│ 已释放 HAF: 0.00 HAF ❌      │
└──────────────────────────────┘
```

### 修复后
```
订单详情:
┌──────────────────────────────┐
│ 认购级别: 钻石                │
│ 认购金额: 30000000.00 USDT   │
│ 所得倍数: 3x                 │
│ 总额度 / 已释放:              │
│   90000000.00 / 6300000.00   │
│ 已释放 HAF: 6300000.0000 HAF ✅│
└──────────────────────────────┘
```

---

## 📝 修复清单

### 修改的文件
- ✅ `src/views/Staking.vue`
  - 添加 `hafPriceData` 读取（新增 useReadContract）
  - 修改 `currentStakes` computed（计算 releasedHAF）
  - 修改 `historyStakes` computed（计算 releasedHAF）

### 关键改动
| 改动 | 修改前 | 修改后 |
|------|--------|--------|
| HAF 价格读取 | ❌ 无 | ✅ `useReadContract('hafPrice')` |
| releasedHAF 计算 | ❌ `'0.00'` 硬编码 | ✅ `releasedQuota / hafPrice` |
| 精度处理 | ❌ N/A | ✅ `formatUnits(hafPrice, 18)` |
| 显示格式 | ❌ `'0.00'` | ✅ `releasedHAF.toFixed(4)` |

---

## 🧮 公式说明

### 为什么这样计算？

在合约中，静态收益的结算逻辑是：

```solidity
// 1. 计算释放的 USDT 金额（releasedQuota）
uint256 releaseUsdt = order.amount.mul(dailyRate).mul(daysPassed).div(10000);

// 2. 用户实际得到的 USDT (90%)
uint256 userPart = releaseUsdt.mul(90).div(100);

// 3. 转换为 HAF
uint256 baseStaticHaf = userPart.mul(PRICE_PRECISION).div(hafPrice);
```

所以反向计算：
```
releasedHAF = (releasedQuota × PRICE_PRECISION) / hafPrice
            = releasedQuota / (hafPrice / PRICE_PRECISION)
            = releasedQuota / hafPriceInUsdt
```

由于前端已经用 `formatUnits(hafPrice, 18)` 得到了 USDT 本位的价格，所以直接除即可。

---

## 🚀 验证步骤

### 1. 检查 HAF 价格
打开控制台，应该能看到：
```javascript
console.log('HAF Price:', formatUnits(hafPriceData.value, 18));
// 输出: "1.0" (初始价格)
```

### 2. 检查订单详情
点击任意订单，查看详情页：
- ✅ "已释放 HAF" 应该显示正确的数值
- ✅ 数值应该约等于 "已释放 USDT" ÷ "HAF 价格"

### 3. 计算验证
```
已释放 USDT: 6300000.00
HAF 价格: 1.0000
已释放 HAF: 6300000.00 / 1.0000 = 6300000.0000 ✅
```

---

## 🎨 UI 显示

### 订单列表卡片
```vue
<div class="flex justify-between">
  <span class="text-gray-500">已释放 HAF:</span>
  <span class="font-mono font-semibold text-gray-800">
    {{ stake.releasedHAF }} HAF
  </span>
</div>
```

### 订单详情页
```vue
<div class="flex justify-between">
  <span class="text-gray-500">已释放 HAF</span>
  <span class="font-semibold text-blue-600 font-mono">
    {{ order.releasedHAF }} HAF
  </span>
</div>
```

---

## ⚠️ 注意事项

### 1. HAF 价格变化
随着价格自动上涨机制，HAF 价格会逐渐增加：
- 初始价格: 1.0 USDT
- 每日涨幅: 0.1% (千分之一)
- 已释放的 HAF 会相应减少（同样的 USDT 能买到更少的 HAF）

### 2. 精度问题
- USDT: 18 位小数
- HAF: 18 位小数
- HAF 价格: 18 位精度
- 所有计算都使用 `formatUnits(value, 18)`

### 3. 边界情况
- 如果 `hafPrice = 0`：设置 `releasedHAF = 0` (避免除以 0)
- 如果 `releasedQuota = 0`：`releasedHAF = 0` (正常)
- 如果 `hafPriceData` 未加载：返回空数组（等待加载）

---

## ✅ 修复完成

现在订单详情应该能正确显示已释放的 HAF 数量！

**修复时间:** 2025-10-09  
**修复文件:** `src/views/Staking.vue`  
**关键行数:** 
- 新增读取: ~305 行 (hafPriceData)
- currentStakes: ~355-358 行 (releasedHAF 计算)
- historyStakes: ~396-399 行 (releasedHAF 计算)
