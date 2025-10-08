# 🔧 USDT 和 HAF 价格精度修复

## 🐛 问题描述

用户反馈：
> 为啥我看 +808382.4268 HAF ≈ $810000000000000000.00
> 总资产 (HAF) 5349575.81 ≈ $5392522504553695232.00
> 这么逆天阿 是不是我哪里搞错了

**原因：USDT 和 HAF 价格的小数位数搞错了！**

---

## 📊 合约定义

### 1. USDT Token
```solidity
// 您的 USDT 是 18 位小数！(不是标准的 6 位)
IERC20 usdtToken;
```

### 2. HAF 价格精度
```solidity
uint256 public hafPrice;  // HAF 的 USDT 价格
uint256 public constant PRICE_PRECISION = 1e18;  // 18 位精度

// 初始化
hafPrice = 1 * PRICE_PRECISION;  // 1 HAF = 1 USDT
// 实际值: hafPrice = 1000000000000000000 (1e18)
```

### 3. BTC 价格精度
```solidity
uint256 btcPrice;  // BTC 币价 (使用 6 位小数)
// 例如: 50000.50 表示为 50000500000
```

---

## ❌ 错误的代码

### Income.vue - 收益记录
```typescript
// ❌ 错误: USDT 用了 6 位
usdtDisplay: parseFloat(formatUnits(record.usdtAmount as bigint, 6)).toFixed(2)

// 实际数据: 810000000000000000000000n (810,000 USDT with 18 decimals)
// 错误计算: 810000000000000000000000 ÷ 10^6 = 810000000000000000.00 💥
```

### Swap.vue - HAF 价格显示
```typescript
// ❌ 错误: hafPrice 用了 6 位
const hafPriceDisplay = computed(() => {
  return parseFloat(formatUnits(hafPrice.value as bigint, 6)).toFixed(4);
});

// 实际数据: hafPrice = 1000000000000000000n (1 * 1e18)
// 错误计算: 1000000000000000000 ÷ 10^6 = 1000000000000.0000 💥
```

### Profile.vue - 总资产计算
```typescript
// ❌ 错误: hafPrice 用了 6 位
const hafPrice = Number(formatUnits(hafPriceData.value as bigint, 6));
const totalValue = hafAmount * hafPrice;

// 例如: 5349575.81 HAF
// 错误的 hafPrice: 1000000000000.0000
// 错误的总资产: 5392522504553695232.00 💥
```

---

## ✅ 正确的代码

### Income.vue - 收益记录
```typescript
// ✅ 正确: USDT 用 18 位
usdtDisplay: parseFloat(formatUnits(record.usdtAmount as bigint, 18)).toFixed(2)

// 实际数据: 810000000000000000000000n
// 正确计算: 810000000000000000000000 ÷ 10^18 = 810000.00 ✅
```

### Swap.vue - HAF 价格显示
```typescript
// ✅ 正确: hafPrice 用 18 位
const hafPriceDisplay = computed(() => {
  return parseFloat(formatUnits(hafPrice.value as bigint, 18)).toFixed(4);
});

// 实际数据: 1000000000000000000n
// 正确计算: 1000000000000000000 ÷ 10^18 = 1.0000 ✅
```

### Profile.vue - 总资产计算
```typescript
// ✅ 正确: hafPrice 用 18 位
const hafPrice = Number(formatUnits(hafPriceData.value as bigint, 18));
const totalValue = hafAmount * hafPrice;

// 例如: 5349575.81 HAF
// 正确的 hafPrice: 1.0000
// 正确的总资产: 5349575.81 ✅
```

---

## 📝 修复清单

### 已修复文件

| 文件 | 行数 | 修改内容 | 精度 |
|------|------|---------|------|
| `Income.vue` | 322 | `record.usdtAmount` | 6 → **18** |
| `Swap.vue` | 154 | `hafPrice` 显示 | 6 → **18** |
| `Swap.vue` | 218 | `hafPrice` 计算汇率 | 6 → **18** |
| `Profile.vue` | 212 | `hafPrice` 计算总资产 | 6 → **18** |
| `Admin.vue` | 613 | `hafPrice` 管理页面 | 6 → **18** |

### 保持不变的文件

| 文件 | 字段 | 精度 | 原因 |
|------|------|------|------|
| `MiningPool.vue` | `btcPrice` | **6** | 合约中 BTC 价格确实是 6 位 |
| `BtcPoolStats.vue` | `dailyRewardPerT` | **6** | BTC 相关数据 |
| `BtcPoolStats.vue` | `btcPrice` | **6** | BTC 相关数据 |

---

## 🎯 精度规则总结

| 数据类型 | 精度 | 示例 | formatUnits 参数 |
|---------|------|------|------------------|
| **USDT Amount** | 18 位 | `810000000000000000000000n` → `810000.00` | **18** |
| **HAF Amount** | 18 位 | `808382426764045145663527n` → `808382.4267` | **18** |
| **HAF Price** | 18 位 | `1000000000000000000n` → `1.0000` | **18** |
| **BTC Price** | 6 位 | `50000500000n` → `50000.50` | **6** |
| **BTC Reward** | 6 位 | `123456n` → `0.123456` | **6** |

---

## 📊 修复效果对比

### 修复前（错误）
```
收益记录:
  +808382.4268 HAF
  ≈ $810000000000000000.00  💥

总资产:
  5349575.81 HAF
  ≈ $5392522504553695232.00  💥
```

### 修复后（正确）
```
收益记录:
  +808382.4268 HAF
  ≈ $810000.00  ✅

总资产:
  5349575.81 HAF
  ≈ $5349575.81  ✅
```

---

## 🔍 如何验证

### 1. 检查 HAF 价格显示
- 打开 Swap 页面
- 查看 "当前价格" 应该显示 `1.0000 USDT` (初始价格)
- 不应该显示 `1000000000000.0000`

### 2. 检查收益记录
- 打开 Income 页面
- 查看 USDT 金额应该合理（几百、几千）
- 不应该显示天文数字（数万亿）

### 3. 检查总资产
- 打开 Profile 页面
- 总资产 (USDT) 应该等于 HAF 余额 × 当前价格
- 如果价格是 1.0，资产应该等于 HAF 数量

---

## 🚀 重要提醒

⚠️ **您的 USDT 合约使用的是 18 位小数，不是标准的 6 位！**

这在前端所有涉及 USDT 和 HAF 价格的地方都必须使用 **18 位精度**：
- ✅ USDT 金额: `formatUnits(amount, 18)`
- ✅ HAF 价格: `formatUnits(hafPrice, 18)`
- ✅ HAF 金额: `formatUnits(amount, 18)`

只有 BTC 相关数据使用 6 位精度：
- ✅ BTC 价格: `formatUnits(btcPrice, 6)`
- ✅ BTC 挖矿奖励: `formatUnits(reward, 6)`

---

**修复时间:** 2025-10-09  
**修复范围:** 5 个 Vue 文件  
**核心问题:** 小数位数配置错误 (6 vs 18)
