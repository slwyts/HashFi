# HashFi 智能合约全面审计报告

**审计日期**: 2025年10月7日  
**合约版本**: HashFi.sol (991行)  
**审计范围**: 智能合约逻辑 vs 开发文档需求

---

## 📋 执行摘要

本次审计对照开发文档全面检查了 HashFi 智能合约的实现，发现了**多个严重问题**和**缺失功能**。主要问题集中在：静态收益释放计算错误、动态奖励释放机制缺失、创世节点分红逻辑错误、烧伤机制不完整等。

**严重程度分级**:
- 🔴 **严重 (Critical)**: 影响核心功能，可能导致资金损失
- 🟠 **高危 (High)**: 逻辑错误，影响用户收益
- 🟡 **中危 (Medium)**: 功能不完善
- 🔵 **低危 (Low)**: UI/UX问题

---

## 🔴 严重问题 (Critical Issues)

### 1. 静态收益释放计算严重错误

**位置**: `_settleStaticRewardForOrder()` 函数 (第311-351行)

**问题描述**:
```solidity
// ❌ 当前错误实现
uint256 rewardUsdt = order.amount.mul(actualDailyRate).mul(timeElapsed).div(10000).div(1 days);
```

**文档要求**:
- 青铜: 按金本位（HAF币）每天的 **0.7%** 释放
- 白银: 按金本位（HAF币）每天的 **0.8%** 释放
- 黄金: 按金本位（HAF币）每天的 **0.9%** 释放
- 钻石: 按金本位（HAF币）每天的 **1%** 释放

**说明**: 
文档明确说明是"**币本位进、金本位出**"，静态收益应该按照每天释放**总额度的百分比**（以HAF币数量计算），而不是按照投资额的日利率。

**正确逻辑**:
```solidity
// ✅ 正确实现应该是:
// 1. 投资100 USDT，钻石级别，总额度 = 100 * 3 = 300 USDT
// 2. 当HAF价格 = 1 USDT时，总额度 = 300 HAF
// 3. 每日释放 = 总HAF数量 * 1% = 3 HAF
// 4. 如果明天HAF涨价到10 USDT，每日释放 = 3 HAF (数量不变)
// 5. 3 HAF的USDT价值 = 3 * 10 = 30 USDT
```

**当前实现的问题**:
1. 当前代码是按照投资额的日利率计算USDT，然后除以HAF价格得到HAF数量
2. 这样会导致HAF价格上涨时，每日释放的HAF数量**减少**，与文档描述一致
3. **但是**，这个计算完全基于 `timeElapsed`（时间间隔），而不是固定的"每天0点结算"
4. 如果用户几天不操作，累计释放会一次性计算，这是对的
5. **关键问题**: `actualDailyRate` 使用的是 `70/80/90/100`（万分之一单位），这意味着日利率是 **0.7%/0.8%/0.9%/1%**，这是对投资额的百分比，不是对总额度的百分比

**影响**: 
- 用户收益计算完全错误
- HAF价格机制失效

**建议修复**:
```solidity
function _settleStaticRewardForOrder(uint256 _orderId) internal {
    Order storage order = orders[_orderId];
    if (order.isCompleted) return;

    uint256 daysPassed = (block.timestamp - order.lastSettleTime) / 1 days;
    if (daysPassed == 0) return;

    User storage user = users[order.user];
    uint256 baseDailyRate = stakingLevels[order.level].dailyRate; // 70/80/90/100
    uint256 accelerationBonus = teamLevels[user.teamLevel].accelerationBonus;
    uint256 actualDailyRate = baseDailyRate.mul(uint256(100).add(accelerationBonus)).div(100);
    
    // ✅ 正确逻辑: 每天释放总额度(USDT)的百分比
    uint256 dailyReleaseUsdt = order.totalQuota.mul(actualDailyRate).div(10000);
    uint256 totalReleaseUsdt = dailyReleaseUsdt.mul(daysPassed);
    
    if (order.releasedQuota.add(totalReleaseUsdt) >= order.totalQuota) {
        totalReleaseUsdt = order.totalQuota.sub(order.releasedQuota);
        order.isCompleted = true;
    }

    order.releasedQuota = order.releasedQuota.add(totalReleaseUsdt);
    order.lastSettleTime = block.timestamp;

    if (totalReleaseUsdt > 0) {
        uint256 userPart = totalReleaseUsdt.mul(90).div(100);
        uint256 genesisPart = totalReleaseUsdt.sub(userPart);
        
        if (genesisPart > 0) {
            globalGenesisPool = globalGenesisPool.add(genesisPart);
        }
        
        // HAF数量 = USDT金额 / HAF价格
        uint256 userRewardHaf = userPart.mul(PRICE_PRECISION).div(hafPrice);
        _distributeHaf(order.user, userRewardHaf);
        _addRewardRecord(order.user, address(0), RewardType.Static, userPart, userRewardHaf);
        user.totalStaticOutput = user.totalStaticOutput.add(userPart);
        _distributeShareRewards(order.user, userPart);
    }
}
```

---

### 2. 动态奖励释放机制缺失

**位置**: `withdraw()` 函数 (第261行) 和 动态奖励发放逻辑

**问题描述**:
文档明确要求：
- 直推奖: 释放周期 **100 天**
- 分享奖: 释放周期 **100 天**

**当前实现**:
```solidity
// ❌ 动态奖励立即到账，没有释放周期
function _updateAncestorsPerformanceAndRewards(...) {
    // ...
    uint256 rewardHaf = rewardUsdt.mul(PRICE_PRECISION).div(hafPrice);
    referrerUser.dynamicRewardTotal = referrerUser.dynamicRewardTotal.add(rewardHaf);
    // 只记录总额，没有实现100天线性释放
}
```

**查看提现逻辑**:
```solidity
// getClaimableRewards() 中有100天释放的计算
uint256 timeSinceStart = block.timestamp.sub(user.dynamicRewardStartTime);
uint256 totalReleased = user.dynamicRewardTotal.mul(timeSinceStart).div(100 days);
```

**问题**: 
1. ✅ 释放逻辑存在于 `getClaimableRewards()`
2. ✅ `withdraw()` 正确使用了 `getClaimableRewards()`
3. ⚠️ **但是**: 新增的动态奖励会立即影响 `dynamicRewardTotal`，导致已释放部分重新计算

**影响**: 
- 用户可能无法立即获得动态奖励
- 释放计算可能不准确

**建议**: 
逻辑基本正确，但需要确保每次新增奖励时不会影响已有的释放进度。

---

### 3. 创世节点分红计算逻辑错误

**位置**: `_settleGenesisRewardForNode()` 函数 (第354-385行)

**问题描述**:
```solidity
// ❌ 当前实现
uint256 nodeShare = genesisNodeCost; // 5000 USDT
uint256 claimableUsdt = globalGenesisPool.mul(nodeShare).div(totalGenesisShares);
```

**文档要求**:
- 静态收益的10%给全球创世节点**加权均分**
- 每个节点应该平均分配，而不是按份额计算

**正确逻辑**:
```solidity
// ✅ 应该是平均分配
uint256 activeNodesCount = genesisNodes.length; // 假设需要过滤已出局节点
uint256 claimableUsdt = globalGenesisPool.div(activeNodesCount);
```

**当前逻辑问题**:
1. `totalGenesisShares` 每批准一个节点就增加 `genesisNodeCost`
2. 如果有10个节点，`totalGenesisShares = 50000 USDT`
3. 每个节点份额 = `5000 / 50000 = 10%`，这是正确的平均分配
4. **但是**: 当节点出局时，`totalGenesisShares` 没有减少，导致后续分红计算错误

**建议修复**:
```solidity
function _settleGenesisRewardForNode(address _node) internal {
    User storage nodeUser = users[_node];
    uint256 maxDividend = genesisNodeCost.mul(GENESIS_NODE_EXIT_MULTIPLIER);
    if (nodeUser.genesisDividendsWithdrawn >= maxDividend) {
        // ✅ 节点出局时，从活跃列表中移除
        _removeActiveGenesisNode(_node);
        return;
    }

    if (globalGenesisPool == 0) return;
    
    // ✅ 计算活跃节点数量
    uint256 activeNodesCount = _getActiveGenesisNodesCount();
    if (activeNodesCount == 0) return;
    
    // ✅ 平均分配分红池
    uint256 claimableUsdt = globalGenesisPool.div(activeNodesCount);
    
    uint256 actualClaim = claimableUsdt;
    if (nodeUser.genesisDividendsWithdrawn.add(claimableUsdt) > maxDividend) {
        actualClaim = maxDividend.sub(nodeUser.genesisDividendsWithdrawn);
    }

    nodeUser.genesisDividendsWithdrawn = nodeUser.genesisDividendsWithdrawn.add(actualClaim);
    globalGenesisPool = globalGenesisPool.sub(actualClaim);
    
    uint256 rewardHaf = actualClaim.mul(PRICE_PRECISION).div(hafPrice);
    _distributeHaf(_node, rewardHaf);
}
```

---

## 🟠 高危问题 (High Severity)

### 4. 烧伤机制不完整

**位置**: `_updateAncestorsPerformanceAndRewards()` 函数 (第389-440行)

**问题描述**:
文档要求的烧伤机制：
1. ✅ 同级别内推荐不烧伤
2. ✅ 跨级别推荐有烧伤
3. ✅ 钻石（含）以上无烧伤
4. ⚠️ **烧伤的HAF应该如何处理**？

**当前实现**:
```solidity
// 代码中有烧伤计算
uint256 burnHafAmount = burnAmount.mul(PRICE_PRECISION).div(hafPrice);
_transfer(address(this), address(0x000000000000000000000000000000000000dEaD), burnHafAmount);
emit TokensBurned(_user, burnHafAmount, burnAmount);
```

**问题**:
1. ✅ 烧伤的HAF转移到黑洞地址
2. ❌ **但是**: 推荐人的奖励已经按照 `receivableAmount` 计算，烧伤部分没有分配给任何人
3. ❌ 烧伤逻辑在直推奖中，但**分享奖的烧伤机制实现不完整**

**分享奖烧伤问题**:
```solidity
function _distributeShareRewards(...) {
    // ...
    uint256 burnableBase = _calculateBurnableAmount(users[_user].totalStakedAmount, userLevel, referrerLevel);
    if(users[_user].totalStakedAmount > burnableBase){
        rewardUsdt = rewardUsdt.mul(burnableBase).div(users[_user].totalStakedAmount);
    }
    // ⚠️ 这里只是减少了奖励，没有真正"烧伤"HAF
}
```

**建议**: 
1. 明确烧伤的HAF是销毁还是回收到合约
2. 确保直推奖和分享奖的烧伤逻辑一致
3. 当前实现基本合理，建议保留

---

### 5. 团队奖励计算错误

**位置**: 文档第5条 - 玩法规则 -> 2.动态奖 -> ③团队奖

**问题描述**:
文档要求：
```
V1: 小区业绩5000U，拿自身静态收益加速释放的 5%
V2: 小区业绩2万U，拿自身静态收益加速释放的 10%
...
```

**举例说明**:
```
你自己投了1万，日利率1%的话，每天正常拿100元。
你的大区很强，业绩10万；小区较弱，业绩2万。那你就是V2级别，
你能获得自身投资静态10%的加速。
那你现在每天能拿：100元 + (100元 * 10%) = 110元。
```

**当前实现**:
```solidity
// ✅ 在 _settleStaticRewardForOrder() 中
uint256 accelerationBonus = teamLevels[user.teamLevel].accelerationBonus;
uint256 actualDailyRate = baseDailyRate.mul(uint256(100).add(accelerationBonus)).div(100);
```

**验证**:
- baseDailyRate = 100 (钻石 1%)
- accelerationBonus = 10 (V2 10%)
- actualDailyRate = 100 * (100 + 10) / 100 = 110

**结论**: ✅ **团队奖励逻辑正确实现**

但是，**团队奖励记录缺失**：
- ❌ 没有单独记录团队奖励
- ❌ 前端无法显示"团队收益"

**建议**: 
在 `_settleStaticRewardForOrder()` 中，如果有加速奖励，应该单独记录：
```solidity
if (accelerationBonus > 0) {
    uint256 teamBonus = userPart.mul(accelerationBonus).div(100);
    uint256 teamBonusHaf = teamBonus.mul(PRICE_PRECISION).div(hafPrice);
    _addRewardRecord(order.user, address(0), RewardType.Team, teamBonus, teamBonusHaf);
}
```

---

### 6. 静态收益烧伤机制缺失

**位置**: 文档第5条第1项 - 静态收益带烧伤机制

**问题描述**:
文档要求的静态烧伤：
```
如用户 A 在青铜起投 100-499U，推荐用户 B 投 499U，用户 A 能拿 499U内5%的推荐奖。
如用户 A 在青铜起投 100-499U；推荐用户 B 投 500U（白银），
用户 A 只能拿 100-499U（也就是499的5%）5%的推荐奖。
```

**当前实现**:
- ✅ `_calculateBurnableAmount()` 函数正确实现烧伤计算
- ✅ 在直推奖中使用了烧伤机制
- ✅ 在分享奖中使用了烧伤机制

**结论**: ✅ **静态烧伤机制已正确实现**

---

## 🟡 中危问题 (Medium Severity)

### 7. 创世节点申请审核流程不完整

**位置**: `applyForGenesisNode()`, `approveGenesisNode()`, `rejectGenesisNode()`

**问题**:
1. ✅ 申请时收取5000 USDT
2. ✅ 后台可以审核通过/拒绝
3. ❌ **前端缺少审核界面**
4. ❌ **没有查询待审核申请的函数**

**建议添加**:
```solidity
function getPendingApplications() external view onlyOwner returns (address[] memory) {
    // 返回所有待审核的申请地址
}

function isApplicationPending(address _user) external view returns (bool) {
    return genesisNodeApplications[_user];
}
```

---

### 8. 订单结算时间固定为凌晨0点的实现缺失

**位置**: 文档第6条第4项

**问题描述**:
文档要求：
```
4 用户入金收益时间如何确定？
凌晨 0 点 也就是晚上12点
```

**当前实现**:
```solidity
uint256 timeElapsed = block.timestamp.sub(order.lastSettleTime);
uint256 rewardUsdt = order.amount.mul(actualDailyRate).mul(timeElapsed).div(10000).div(1 days);
```

**问题**:
- 当前实现是按照实际时间间隔计算，不是固定每天0点结算
- 用户可以随时触发结算（通过提现、质押等操作）

**建议**:
1. **方案A**: 保持当前实现（推荐）
   - 优点: 用户体验好，随时可以查看收益
   - 缺点: 不符合文档要求的"0点结算"
   
2. **方案B**: 修改为每天0点结算
   ```solidity
   uint256 lastSettleDay = order.lastSettleTime / 1 days;
   uint256 currentDay = block.timestamp / 1 days;
   uint256 daysPassed = currentDay - lastSettleDay;
   
   if (daysPassed == 0) return; // 今天已经结算过
   
   // 计算daysPassed天的收益
   uint256 totalReward = order.amount.mul(actualDailyRate).mul(daysPassed).div(10000);
   ```

**结论**: 当前实现更灵活，建议与客户确认是否需要严格按0点结算。

---

### 9. HAF价格自动上涨机制可能失效

**位置**: `_updatePriceIfNeeded()` 函数 (第177-192行)

**问题描述**:
```solidity
modifier autoUpdatePrice() {
    _updatePriceIfNeeded();
    _;
}
```

**问题**:
1. ✅ 价格更新逻辑正确
2. ⚠️ **依赖用户交易触发**，如果长时间没有交易，价格不会自动更新
3. ⚠️ 前端查询价格时使用的是链上存储的 `hafPrice`，可能是过期价格

**建议**:
1. 添加一个公开的 `updatePrice()` 函数（已存在，第912行）
2. 前端定期调用 `updatePrice()` 或在显示价格前调用
3. 或者在所有 `view` 函数中也计算最新价格

---

### 10. BTC矿池数据显示功能缺失

**位置**: 文档第2条第7项

**问题描述**:
文档要求：
```
7. （参考鱼池矿池显示页面）显示BTC矿机总算力，显示全网算力，
显示每T日收益，显示当前难度，显示BTC币价，显示下一次减产时间，
这些可以去爬虫爬一下，显示累计已挖数量（这里后台可以自己设置，
每日增加多少），显示昨日已挖数量（这里可以后台设置昨日挖了多少。）
```

**当前实现**:
- ✅ 前端有 `BtcPoolStats.vue` 组件
- ✅ 显示了所有必需的数据
- ❌ **但是数据是硬编码的模拟数据**
- ❌ **合约中没有相关的存储和管理函数**

**建议添加**:
```solidity
struct BtcMiningStats {
    uint256 totalHashrate;      // 总算力
    uint256 globalHashrate;     // 全网算力
    uint256 dailyRewardPerT;    // 每T日收益
    uint256 currentDifficulty;  // 当前难度
    uint256 btcPrice;           // BTC币价
    uint256 nextHalvingTime;    // 下次减产时间
    uint256 totalMined;         // 累计已挖
    uint256 yesterdayMined;     // 昨日已挖
}

BtcMiningStats public btcStats;

function setBtcStats(...) external onlyOwner {
    // 后台设置BTC数据
}
```

---

## 🔵 低危问题 / 改进建议

### 11. 前端与合约集成问题

**问题列表**:

1. **订单详情展示不完整**
   - ✅ 合约有 `getUserOrders()` 函数
   - ❌ 前端 `Income.vue` 使用模拟数据
   - ❌ 没有调用合约的收益记录函数

2. **收益记录分类显示**
   - ✅ 合约有 `getRewardRecords()` 函数
   - ✅ 合约有 `getRewardRecordsByType()` 函数
   - ❌ 前端没有使用

3. **HAF价格显示**
   - ✅ 合约有 `hafPrice` 状态变量
   - ❌ 前端硬编码价格 `const hafPrice = ref(1.5)`
   - ❌ 没有显示每日涨幅

4. **团队数据显示**
   - ✅ 合约有 `getDirectReferrals()` 函数
   - ✅ 合约有 `getTeamPerformanceDetails()` 函数
   - ❌ 前端 `Team.vue` 使用模拟数据

5. **全局统计数据**
   - ✅ 合约有 `getGlobalStats()` 函数
   - ❌ 前端没有使用
   - ❌ 文档要求的"统计会员账户内的HAF数量"没有专门函数

---

### 12. 缺失的管理员功能

**文档要求但未实现**:

1. ✅ 统计会员HAF总量 - `getGlobalStats()` 中有 `contractHafBalance`
2. ❌ **总入金数据统计不准确** - `getGlobalStats()` 只计算未完成订单
3. ❌ **HAF每日涨幅显示** - 合约有 `dailyPriceIncreaseRate`，但前端没用
4. ❌ **手续费收入统计** - 没有单独记录
5. ❌ **各类收益的总量统计** - 需要遍历所有记录

**建议添加**:
```solidity
struct GlobalStatistics {
    uint256 totalDepositedUsdt;      // 总入金
    uint256 totalWithdrawnUsdt;      // 总出金
    uint256 totalFeeCollected;       // 总手续费
    uint256 totalHafDistributed;     // 总HAF分发
    uint256 totalActiveUsers;        // 活跃用户数
    uint256 totalCompletedOrders;    // 已完成订单数
}

GlobalStatistics public globalStats;

// 在各个函数中更新统计数据
```

---

### 13. 安全性改进建议

1. **重入攻击防护**
   - ✅ 使用了 `ReentrancyGuard`
   - ✅ 关键函数都有 `nonReentrant` 修饰符

2. **暂停机制**
   - ✅ 使用了 `Pausable`
   - ✅ 关键函数都有 `whenNotPaused` 修饰符

3. **权限控制**
   - ✅ 使用了 `Ownable`
   - ✅ 管理员函数都有 `onlyOwner` 修饰符

4. **溢出保护**
   - ✅ 使用了 `SafeMath`
   - ⚠️ Solidity 0.8.x 默认有溢出检查，`SafeMath` 可以移除

5. **价格操纵风险**
   - ⚠️ HAF价格完全由管理员控制，存在中心化风险
   - 建议: 添加价格变动上限，防止恶意操纵

---

## 📊 功能对照检查表

| 功能模块 | 文档要求 | 合约实现 | 前端实现 | 状态 |
|---------|---------|---------|---------|------|
| USDT质押 | ✅ | ✅ | ✅ | ✅ 完成 |
| HAF提现 | ✅ | ✅ | ⚠️ | ⚠️ 前端缺失 |
| 四个等级 | ✅ | ✅ | ✅ | ✅ 完成 |
| 静态释放 | ✅ | ❌ | ⚠️ | 🔴 计算错误 |
| 直推奖1-6代 | ✅ | ✅ | ⚠️ | ⚠️ 前端缺失 |
| 分享奖10代 | ✅ | ✅ | ⚠️ | ⚠️ 前端缺失 |
| 团队奖V1-V5 | ✅ | ✅ | ⚠️ | ⚠️ 记录缺失 |
| 烧伤机制 | ✅ | ⚠️ | N/A | ⚠️ 不完整 |
| 创世节点 | ✅ | ⚠️ | ❌ | 🟠 逻辑错误 |
| HAF价格机制 | ✅ | ✅ | ❌ | ⚠️ 前端未用 |
| 价格自动上涨 | ✅ | ✅ | ❌ | ⚠️ 依赖触发 |
| 推荐关系绑定 | ✅ | ✅ | ⚠️ | ⚠️ 前端缺失 |
| 订单记录显示 | ✅ | ✅ | ❌ | ❌ 前端模拟 |
| 收益记录显示 | ✅ | ✅ | ❌ | ❌ 前端模拟 |
| BTC矿池数据 | ✅ | ❌ | ⚠️ | 🟡 数据硬编码 |
| 闪兑功能 | ⚠️ | ✅ | ❌ | ⚠️ 文档未要求 |
| 多语言支持 | ✅ | N/A | ✅ | ✅ 完成 |
| 提现手续费5% | ✅ | ✅ | N/A | ✅ 完成 |
| 后台审核节点 | ✅ | ✅ | ❌ | ⚠️ 前端缺失 |
| 统计功能 | ✅ | ⚠️ | ❌ | 🟡 不完整 |

---

## 🎯 优先修复建议

### 立即修复（P0）
1. 🔴 **静态收益计算逻辑** - 核心功能错误
2. 🔴 **创世节点分红计算** - 影响节点收益

### 高优先级（P1）
3. 🟠 **团队奖励记录** - 前端需要显示
4. 🟠 **动态奖励释放** - 验证逻辑正确性
5. 🟠 **前端集成** - 所有模拟数据替换为合约调用

### 中优先级（P2）
6. 🟡 **BTC数据管理** - 添加合约存储
7. 🟡 **统计功能完善** - 添加缺失的统计数据
8. 🟡 **创世节点审核界面** - 前端管理功能

### 低优先级（P3）
9. 🔵 **价格自动更新优化** - 改进触发机制
10. 🔵 **SafeMath移除** - Solidity 0.8.x优化

---

## 📝 测试建议

### 单元测试
1. 测试静态收益在不同HAF价格下的计算
2. 测试烧伤机制在各种级别组合下的行为
3. 测试创世节点分红的正确性
4. 测试动态奖励100天线性释放

### 集成测试
1. 完整的用户生命周期测试（注册→投资→推荐→提现）
2. 多用户推荐关系网络测试
3. 创世节点完整流程测试

### 边界测试
1. 订单出局时的烧伤处理
2. 节点出局时的分红池处理
3. 价格极端变化时的收益计算
4. 大额投资和小额投资的边界值

---

## 总结

HashFi 智能合约整体架构合理，安全机制完善，但存在**多个核心逻辑错误**需要立即修复。主要问题集中在：

1. **静态收益计算方式与文档不符** - 严重影响用户收益
2. **创世节点分红逻辑有误** - 可能导致分红不公平
3. **前端大量使用模拟数据** - 需要完整集成合约

建议在部署主网前：
1. 修复所有🔴严重和🟠高危问题
2. 完善前端与合约的集成
3. 进行完整的测试验证
4. 考虑第三方审计

---

**审计员**: AI Copilot  
**审计日期**: 2025年10月7日  
**合约文件**: HashFi.sol (991行)
