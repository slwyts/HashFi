# 管理员面板使用指南

## 访问方式

1. 使用合约 Owner 地址连接钱包
2. 进入"我的"页面
3. 点击紫粉色渐变的"管理员面板"按钮

## 功能模块

### 1. 创世节点审核

**路径**: 管理员面板 > 创世节点

**功能说明**:
- 查看所有待审核的创世节点申请
- 批准申请：用户成为活跃创世节点，开始享受分红
- 拒绝申请：退还 5000 USDT 给申请人

**操作步骤**:
1. 查看申请人地址
2. 点击"批准"或"拒绝"按钮
3. 确认交易

**关联合约函数**:
```solidity
approveGenesisNode(address applicant)  // 批准
rejectGenesisNode(address applicant)   // 拒绝
getPendingGenesisApplications()        // 查询待审核
getActiveGenesisNodes()                // 查询活跃节点
```

### 2. BTC 数据管理

**路径**: 管理员面板 > BTC数据

**功能说明**:
- 更新 BTC 挖矿相关数据
- 影响矿池页面的统计展示

**字段说明**:
- **总算力 (T)**: 平台总算力
- **全网算力 (T)**: BTC 全网算力
- **BTC价格 (USD)**: 当前 BTC 市场价格
- **每T日产出 (BTC)**: 每 T 算力的日产出
- **当前难度**: BTC 挖矿难度
- **昨日已挖 (BTC)**: 昨日实际挖出的 BTC 数量

**操作步骤**:
1. 填写最新的 BTC 数据
2. 点击"更新BTC数据"
3. 确认交易

**关联合约函数**:
```solidity
updateBtcStats(
  uint256 _totalHashrate,
  uint256 _globalHashrate,
  uint256 _dailyRewardPerT,
  uint256 _currentDifficulty,
  uint256 _btcPrice,
  uint256 _nextHalvingTime
)
updateTotalMined(uint256 _amount)
```

**数据来源建议**:
- BTC 价格：CoinGecko/Binance API
- 全网算力：blockchain.com
- 难度：blockchain.com
- 每 T 产出：根据难度和区块奖励计算

### 3. HAF 价格管理

**路径**: 管理员面板 > 价格管理

**功能说明**:
- 设置 HAF 代币价格
- 设置每日涨幅率（千分比）
- 手动触发价格更新

**字段说明**:
- **当前HAF价格**: 展示当前价格
- **每日涨幅**: 展示当前涨幅率（千分比）
- **设置新价格**: 手动设置新的基础价格
- **每日涨幅率**: 设置每日自动涨幅（1 = 0.1%）

**操作步骤**:
1. **修改价格**: 输入新价格 > 点击"更新价格"
2. **修改涨幅**: 输入涨幅率 > 点击"更新价格"
3. **触发更新**: 点击"触发价格更新"立即执行涨幅计算

**关联合约函数**:
```solidity
setHafPrice(uint256 _price)                    // 设置价格
setDailyPriceIncreaseRate(uint256 _rate)       // 设置涨幅率
updatePrice()                                  // 触发价格更新
```

**价格更新逻辑**:
```
新价格 = 当前价格 × (1 + 涨幅率/1000)
```

### 4. 统计数据

**路径**: 管理员面板 > 统计数据

**功能说明**:
- 实时查看全局统计数据
- 监控合约运营状况

**数据指标**:
- **总质押金额**: 累计质押的 USDT 总额
- **总提现金额**: 累计提现的 HAF 总额
- **总手续费**: 累计收取的手续费
- **活跃用户数**: 当前有质押的用户数
- **总订单数**: 累计质押订单数
- **已完成订单**: 已释放完毕的订单数
- **USDT 余额**: 合约 USDT 余额
- **HAF 余额**: 合约 HAF 余额

**关联合约函数**:
```solidity
getGlobalStats() returns (
  GlobalStatistics statistics,
  uint256 totalOrders,
  uint256 contractUsdtBalance,
  uint256 contractHafBalance
)
```

## 安全建议

1. **权限保护**: 仅 Owner 地址可访问管理功能
2. **操作确认**: 重要操作前二次确认
3. **数据备份**: 定期记录重要数据变更
4. **多签建议**: 生产环境建议使用多签钱包作为 Owner

## 合约地址 (Sepolia)

- **HashFi 合约**: `0x775C002Dd21a8dBE115146D1838cdECe4A47189F`
- **USDT 合约**: `0xe6027b53dBED690D7619C8B88782C88046006861`

## 常见问题

**Q: 为什么我看不到管理员面板入口？**
A: 请确认您连接的钱包地址是合约 Owner 地址。

**Q: BTC 数据多久更新一次？**
A: 建议每日更新一次，确保矿池页面数据准确。

**Q: HAF 价格涨幅率如何计算？**
A: 涨幅率以千分比表示，例如 1 = 0.1%，10 = 1%。

**Q: 如何转移 Owner 权限？**
A: 调用合约的 `transferOwnership(address newOwner)` 函数。

## 技术栈

- **前端**: Vue 3 + TypeScript + Tailwind CSS
- **Web3**: Wagmi + Viem
- **国际化**: vue-i18n (支持中/英文)
- **合约交互**: 自动加载 ABI，类型安全
