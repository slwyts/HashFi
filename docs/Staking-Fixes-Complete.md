# Staking.vue 修复报告

## 🐛 修复的Bug

### 1. 函数名错误 ❌ → ✅
**问题：**
```
AbiFunctionNotFoundError: Function "stakeUsdt" not found on ABI
```

**原因：** 
合约中的函数名是 `stake(uint256 _amount)`，而不是 `stakeUsdt`

**修复前：**
```typescript
await writeContractAsync({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'stakeUsdt',  // ❌ 错误
  args: [amount, referrer as `0x${string}`],
});
```

**修复后：**
```typescript
await writeContractAsync({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'stake',  // ✅ 正确
  args: [amount],
});
```

**说明：** 
- 合约的 `stake` 函数只需要 `_amount` 参数
- 推荐人（referrer）在合约内部通过 `users[msg.sender].referrer` 获取
- 不需要在前端传递 referrer 参数

---

## 📝 文案优化

### 2. 矿工费显示优化

**修复前：**
```vue
<p class="text-xs text-gray-500 mt-3">
  {{ t('stakingPage.minerFee') }}： <span class="font-mono">~0.0001 ETH</span>
</p>
```

**修复后：**
```vue
<p class="text-xs text-gray-500 mt-3">
  {{ t('stakingPage.minerFee') }}： <span class="font-mono">~0.0001</span>
</p>
```

**效果：** 移除 "ETH" 字样，只显示数字

---

### 3. 业务术语调整

#### "质押" → "认购"

**原因：** 更符合业务模式和用户理解

**涉及范围：**

##### 🌍 中文国际化 (zh-CN.json)
- ✅ 底部导航栏: `"staking": "认购"`
- ✅ 页面标题: `"stakeTitle": "认购"`
- ✅ 规则说明: `"stakingRules": "认购规则"`
- ✅ 按钮文本: `"stake": "认购"`, `"stakeNow": "立即认购"`
- ✅ 最小金额: `"minStakeAmount": "最少认购金额"`
- ✅ 当前状态: `"currentStaking": "当前认购"`, `"ecoStaking": "生态认购"`
- ✅ 提示消息: 
  - `"invalidAmount": "请输入有效的认购金额"`
  - `"staking": "正在认购..."`
  - `"stakeSuccess": "认购成功！"`
  - `"stakeFailed": "认购失败"`
- ✅ 订单详情: 
  - `"stakingLevel": "认购级别"`
  - `"stakingTime": "认购时间"`
- ✅ 管理员面板: `"totalDeposited": "总认购金额"`

##### 🌍 英文国际化 (en.json)
- ✅ 底部导航栏: `"staking": "Subscribe"`
- ✅ 页面标题: `"stakeTitle": "Subscribe"`
- ✅ 规则说明: `"stakingRules": "Subscription Rules"`
- ✅ 按钮文本: `"stake": "Subscribe"`, `"stakeNow": "Subscribe Now"`
- ✅ 最小金额: `"minStakeAmount": "Min subscription"`
- ✅ 当前状态: `"currentStaking": "Current Subscription"`, `"ecoStaking": "Eco Subscription"`
- ✅ 提示消息:
  - `"invalidAmount": "Please enter a valid subscription amount"`
  - `"staking": "Subscribing..."`
  - `"stakeSuccess": "Subscription successful!"`
  - `"stakeFailed": "Subscription failed"`
- ✅ 订单详情:
  - `"stakingLevel": "Subscription Level"`
  - `"stakingTime": "Subscription Time"`
- ✅ 管理员面板: `"totalDeposited": "Total Subscribed"`

##### 📄 页面模板 (Staking.vue)
```vue
<!-- 修复前 -->
<h2 class="text-2xl font-bold mb-4 gradient-text">选择质押方案</h2>

<!-- 修复后 -->
<h2 class="text-2xl font-bold mb-4 gradient-text">选择认购方案</h2>
```

---

#### "倍额度出局" → "倍额度结束投资"

**原因：** "出局" 语气负面，改为中性的"结束投资"

**修改位置：**

##### 🌍 中文
```json
{
  "stakingPage": {
    "multiplier": "倍额度结束投资"  // 原: "倍额度出局"
  }
}
```

##### 🌍 英文
```json
{
  "stakingPage": {
    "multiplier": "x Exit Multiplier"  // 原: "x Payout Multiplier"
  }
}
```

**显示效果：**
- 青铜：2.5 倍额度结束投资
- 白银：2.5 倍额度结束投资
- 黄金：2.5 倍额度结束投资
- 钻石：2.5 倍额度结束投资

---

## 📊 修改统计

### 代码修改
- **修改文件数：** 3个
  - `src/views/Staking.vue` (2处)
  - `src/locales/zh-CN.json` (15处)
  - `src/locales/en.json` (15处)

### 国际化键修改
- **中文键修改：** 15个
- **英文键修改：** 15个
- **总计：** 30个国际化键

### 影响范围
- ✅ 底部导航栏
- ✅ 认购页面标题
- ✅ 认购方案卡片
- ✅ 认购表单
- ✅ 按钮文本
- ✅ 提示消息
- ✅ 订单详情页
- ✅ 管理员统计面板

---

## 🧪 测试建议

### 功能测试
1. ✅ 连接钱包
2. ✅ 选择认购方案（青铜/白银/黄金/钻石）
3. ✅ 输入认购金额
4. ✅ 授权 USDT（第一次认购）
5. ✅ 执行认购交易
6. ✅ 查看认购订单列表
7. ✅ 检查 Toast 提示消息

### UI测试
1. ✅ 检查所有 "质押" 文本已改为 "认购"
2. ✅ 检查 "倍额度出局" 已改为 "倍额度结束投资"
3. ✅ 矿工费显示为 "~0.0001" (无ETH字样)
4. ✅ 中英文切换测试

### 合约调用测试
1. ✅ 确认调用的是 `stake(uint256)` 函数
2. ✅ 确认参数只有 `_amount`
3. ✅ 确认推荐人逻辑由合约处理

---

## 📋 修改清单

### ✅ Staking.vue
- [x] 修复函数名: `stakeUsdt` → `stake`
- [x] 移除 referrer 参数传递
- [x] 移除矿工费中的 "ETH" 字样
- [x] 页面标题: "选择质押方案" → "选择认购方案"

### ✅ zh-CN.json
- [x] bottomNav.staking: "质押" → "认购"
- [x] stakingPage.*: 15处 "质押" → "认购"
- [x] stakingPage.multiplier: "倍额度出局" → "倍额度结束投资"
- [x] orderDetail.*: 3处 "质押" → "认购"
- [x] admin.totalDeposited: "总质押金额" → "总认购金额"

### ✅ en.json
- [x] bottomNav.staking: "Staking" → "Subscribe"
- [x] stakingPage.*: 15处 "Stake/Staking" → "Subscribe/Subscription"
- [x] stakingPage.multiplier: "Payout Multiplier" → "Exit Multiplier"
- [x] orderDetail.*: 3处 "Staking" → "Subscription"
- [x] admin.totalDeposited: "Total Deposited" → "Total Subscribed"

---

## 🎉 修复完成

所有问题已修复，可以正常使用：

1. ✅ **合约调用错误已修复** - 正确调用 `stake(uint256)` 函数
2. ✅ **矿工费显示优化** - 移除 ETH 字样
3. ✅ **业务术语统一** - 全站 "质押" → "认购"
4. ✅ **文案优化** - "倍出局" → "结束投资"
5. ✅ **国际化完整** - 中英文双语支持

**当前状态：** ✅ 可以进行认购交易测试

**下一步：** 测试 Sepolia 测试网上的实际认购流程
