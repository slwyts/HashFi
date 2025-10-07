# Income.vue 真实数据集成文档

> **完成时间**: 2025-10-07  
> **状态**: ✅ 已完成

## 实现概述

成功将 Income.vue 从模拟数据替换为真实合约数据集成,实现了完整的收益展示和提现功能。

---

## 核心功能

### 1. 待领取收益显示 ⭐

**合约函数**: `getClaimableRewards(address _user)`

```typescript
// 返回值: [pendingStatic, pendingDynamic, pendingGenesis]
const { data: claimableRewards } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'getClaimableRewards',
  args: address ? [address] : undefined,
});
```

**UI 展示**:
- 总可提取收益 (3种类型相加)
- 静态收益 (订单释放)
- 动态收益 (团队奖励)
- 创世节点收益 (节点分红)

**数据格式**: HAF (18 decimals)

---

### 2. 收益记录列表 📜

**合约函数**: `getRewardRecords(address _user)`

**返回结构**:
```solidity
struct RewardRecord {
    uint256 timestamp;      // [0] 记录时间
    address fromUser;       // [1] 来源用户
    RewardType rewardType;  // [2] 收益类型 (0-4)
    uint256 usdtAmount;     // [3] USDT金额
    uint256 hafAmount;      // [4] HAF金额
}
```

**RewardType 枚举**:
- 0 = Static (静态收益) - 蓝色
- 1 = Direct (直推收益) - 绿色
- 2 = Share (平级收益) - 紫色
- 3 = Team (团队收益) - 橙色
- 4 = Genesis (创世节点分红) - 粉色

**功能特性**:
- ✅ 按时间倒序排列 (最新的在前)
- ✅ 标签页筛选 (全部/静态/直推/分享/团队/创世节点)
- ✅ 显示来源地址 (格式化为 0x1234...5678)
- ✅ 显示 HAF 金额和等值 USDT
- ✅ 彩色图标区分收益类型

---

### 3. 提现功能 💰

**合约函数**: `withdraw()`

**实现流程**:
```typescript
const handleWithdraw = async () => {
  if (!address || !canWithdraw.value) return;

  try {
    await withdraw({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'withdraw',
    });
  } catch (error) {
    toast.error(error.message);
  }
};

// 监听提现成功
watch(() => isWithdrawSuccess, (success) => {
  if (success) {
    toast.success(t('incomePage.withdrawSuccess'));
    refetchRewards();   // 刷新待领取收益
    refetchRecords();   // 刷新收益记录
  }
});
```

**提现规则** (合约逻辑):
- 90% 转换为 USDT
- 10% 转换为 HAF
- 扣除 withdrawalFeeRate 手续费 (默认10%)

**按钮状态**:
- 无可提现: 灰色禁用 "暂无可提现"
- 有可提现: 白色激活 "立即提现"
- 提现中: 显示 "处理中..."

---

## 数据流程图

```
用户钱包地址
    ↓
getClaimableRewards() ────→ 显示待领取收益 (3种类型)
    ↓                              ↓
getRewardRecords() ────→ 收益记录列表 ← 标签页筛选
    ↓                              ↓
withdraw() ────→ 交易确认 ────→ 成功提示 + 刷新数据
```

---

## 技术细节

### 数据结构映射

```typescript
// ❌ 错误 - 合约返回的是数组 (tuple)
const static = claimableRewards.pendingStatic;
const record = rewardRecords[0].timestamp;

// ✅ 正确 - 使用数组索引
const static = claimableRewards[0];
const timestamp = rewardRecords[0][0];
const fromUser = rewardRecords[0][1];
const rewardType = rewardRecords[0][2];
const usdtAmount = rewardRecords[0][3];
const hafAmount = rewardRecords[0][4];
```

### 精度处理

```typescript
// HAF: 18 decimals
const hafDisplay = parseFloat(formatUnits(hafAmount, 18)).toFixed(4);

// USDT: 6 decimals
const usdtDisplay = parseFloat(formatUnits(usdtAmount, 6)).toFixed(2);
```

### 地址格式化

```typescript
const formatAddress = (addr: string): string => {
  if (!addr || addr === '0x0000000000000000000000000000000000000000') return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};
// 示例: 0x1234567890abcdef → 0x1234...cdef
```

### 日期格式化

```typescript
const formattedDate = date.toLocaleString('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});
// 示例: 2025/10/07 14:30
```

---

## 国际化翻译

### 中文 (zh-CN.json)

```json
"incomePage": {
  "totalClaimable": "可提取收益",
  "staticReward": "静态收益",
  "dynamicReward": "动态收益",
  "genesisReward": "创世节点",
  "withdraw": "立即提现",
  "noClaimable": "暂无可提现",
  "withdrawSuccess": "提现成功",
  "from": "来自",
  "incomeRecords": "收益记录",
  "tabs": {
    "all": "全部",
    "static": "静态",
    "direct": "直推",
    "share": "分享",
    "team": "团队",
    "genesis": "创世节点"
  },
  "types": {
    "static": "静态收益",
    "direct": "直推收益",
    "share": "平级收益",
    "team": "团队收益",
    "genesis": "创世节点分红"
  }
}
```

### 英文 (en.json)

```json
"incomePage": {
  "totalClaimable": "Claimable Rewards",
  "staticReward": "Static Reward",
  "dynamicReward": "Dynamic Reward",
  "genesisReward": "Genesis Node",
  "withdraw": "Withdraw Now",
  "noClaimable": "No Claimable",
  "withdrawSuccess": "Withdraw Success",
  "from": "From",
  "incomeRecords": "Income Records",
  "tabs": {
    "all": "All",
    "static": "Static",
    "direct": "Direct",
    "share": "Share",
    "team": "Team",
    "genesis": "Genesis"
  },
  "types": {
    "static": "Static Income",
    "direct": "Direct Referral Income",
    "share": "Share Income",
    "team": "Team Income",
    "genesis": "Genesis Node Dividend"
  }
}
```

---

## UI 优化

### 顶部卡片
- 蓝色渐变背景 (from-blue-500 to-blue-600)
- 装饰性背景圆圈 (白色半透明模糊效果)
- 大号字体显示总可提现金额
- 3列网格展示各类收益
- 全宽提现按钮 (白色 + 悬浮效果)

### 标签页
- 灰色背景容器 (rounded-xl)
- 激活标签: 白色背景 + 蓝色文字 + 阴影
- 未激活标签: 灰色文字 + 悬浮变色

### 收益记录卡片
- 白色背景 + 圆角 + 阴影
- 彩色渐变图标 (根据收益类型)
- 左侧: 类型名称 + 时间 + 来源地址
- 右侧: HAF金额 (绿色) + USDT等值 (灰色)
- 悬浮放大阴影效果

### Loading 状态
- 待领取收益: 脉冲动画 "加载中..."
- 收益记录: 旋转加载器 + 提示文字

### 空状态
- 无数据图标 (no_data.png)
- 提示文字 "暂无数据"

---

## 已知问题

### TypeScript 类型警告

**问题**: wagmi v2 的 `useReadContract` 返回类型推断为 `unknown`

```typescript
// 会有类型警告但不影响运行
const value = claimableRewards.value[0]; // "claimableRewards"的类型为"未知"
```

**原因**: wagmi 无法从 ABI 自动推断复杂的返回类型

**解决方案**: 
1. 使用 `as any` 或 `as bigint` 断言
2. 等待 wagmi v3 或手动创建类型声明
3. 当前实现已足够使用,运行时完全正常

---

## 测试要点

### 功能测试
- [ ] 连接钱包后正确显示待领取收益
- [ ] 三种收益类型数值准确
- [ ] 收益记录按时间倒序显示
- [ ] 标签页筛选正常工作
- [ ] 提现按钮状态正确 (无收益时禁用)
- [ ] 提现流程完整 (交易确认 → 成功提示 → 数据刷新)
- [ ] 地址格式化正确
- [ ] 金额精度正确 (HAF 4位, USDT 2位)

### 边界测试
- [ ] 无钱包连接: 不显示数据
- [ ] 无收益记录: 显示空状态
- [ ] 无待领取收益: 提现按钮禁用
- [ ] 提现失败: 显示错误提示
- [ ] 来源地址为0x0: 不显示 "来自" 行

### UI测试
- [ ] 标签页切换流畅
- [ ] 卡片悬浮效果正常
- [ ] 按钮激活/禁用状态清晰
- [ ] Loading 动画流畅
- [ ] 多语言切换正确

---

## 下一步

已完成 Income.vue,接下来建议:

1. **GenesisNode.vue** - 创世节点申请页面
   - 检查申请状态 (isApplicationPending)
   - 申请功能 (applyForGenesisNode)
   - USDT授权流程
   
2. **Swap.vue** - 闪兑页面
   - HAF价格查询
   - USDT/HAF余额显示
   - 兑换功能 (双向)
   
3. **Team.vue** - 团队页面
   - 直推列表 (getDirectReferrals)
   - 团队统计 (getUserReferralStats)
   - 业绩详情 (getTeamPerformanceDetails)

---

**完成状态**: ✅ 完整实现,可投入测试
**相关文档**: docs/Contract-Structure-Reference.md
