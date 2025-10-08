# 🔧 Solidity Struct 数据访问 - 快速参考

## 常见错误 ❌

```typescript
// ❌ 错误：以为是数组
const record = contractData[0];
const timestamp = record[0];
const amount = record[3];
```

**结果：** `undefined` → `TypeError: Cannot read properties of undefined`

---

## 正确方式 ✅

```typescript
// ✅ 正确：是对象
const record = contractData[0];
const timestamp = record.timestamp;
const amount = record.usdtAmount;
```

---

## Viem 转换规则

| Solidity 类型 | JavaScript 类型 | 访问方式 |
|--------------|----------------|---------|
| `struct Foo { uint256 x; }` | `{ x: bigint }` | `obj.x` |
| `Foo[]` | `Array<{ x: bigint }>` | `arr[0].x` |
| `uint256` | `bigint` | 直接使用 |
| `address` | `string` (0x...) | 直接使用 |
| `enum Bar { A, B }` | `number` (0, 1) | 直接使用 |

---

## 安全访问模式

```typescript
function parseContractRecord(record: any) {
  // 1. 检查对象类型
  if (!record || typeof record !== 'object') {
    return null;
  }
  
  // 2. 检查必需字段
  if (record.timestamp === undefined || 
      record.amount === undefined) {
    return null;
  }
  
  // 3. 安全使用
  return {
    timestamp: record.timestamp as bigint,
    amount: record.amount as bigint,
    formatted: formatUnits(record.amount, 18),
  };
}
```

---

## 调试技巧

```typescript
// 查看原始结构
watch(() => contractData.value, (data) => {
  console.log('Raw data:', data);
  console.log('Type:', typeof data);
  console.log('Is Array:', Array.isArray(data));
  if (Array.isArray(data) && data[0]) {
    console.log('First item:', data[0]);
    console.log('Keys:', Object.keys(data[0]));
  }
}, { immediate: true });
```

---

## 真实案例对比

### HashFi RewardRecord

**Solidity:**
```solidity
struct RewardRecord {
    uint256 timestamp;
    address fromUser;
    RewardType rewardType;
    uint256 usdtAmount;
    uint256 hafAmount;
}
```

**JavaScript (Viem 转换后):**
```javascript
{
  timestamp: 1759946760n,
  fromUser: '0x0000000000000000000000000000000000000000',
  rewardType: 0,
  usdtAmount: 810000000000000000000000n,
  hafAmount: 808382426764045145663527n
}
```

**访问方式:**
```typescript
// ✅ 正确
record.timestamp
record.fromUser
record.rewardType
record.usdtAmount
record.hafAmount

// ❌ 错误
record[0]
record[1]
record[2]
record[3]
record[4]
```

---

## 记住这句话

> **Viem 将 Solidity struct 转为 JavaScript 对象，用点号访问字段，不是数组索引！**

🎯 核心：`record.fieldName` 而不是 `record[index]`
