# RPC URL 配置说明

## 📋 功能说明

添加 RPC URL 配置后，用户**无需连接钱包**即可读取链上数据，提升用户体验。

---

## 🔧 配置文件

### 测试网配置 (`.env.development`)

```bash
# RPC URL - 用于未连接钱包时读取链上数据
VITE_BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
```

**备用 RPC（可选）：**
```bash
# 币安官方测试网 RPC
https://data-seed-prebsc-1-s1.binance.org:8545
https://data-seed-prebsc-2-s1.binance.org:8545
https://data-seed-prebsc-1-s2.binance.org:8545

# 其他公共 RPC
https://bsc-testnet.public.blastapi.io
https://bsc-testnet-rpc.publicnode.com
```

---

### 主网配置 (`.env.production`)

```bash
# RPC URL - 用于未连接钱包时读取链上数据
VITE_BSC_MAINNET_RPC_URL=https://bsc-dataseed1.binance.org
```

**备用 RPC（可选）：**
```bash
# 币安官方主网 RPC
https://bsc-dataseed1.binance.org
https://bsc-dataseed2.binance.org
https://bsc-dataseed3.binance.org
https://bsc-dataseed4.binance.org

# 社区公共 RPC
https://bsc-dataseed1.defibit.io
https://bsc-dataseed1.ninicoin.io
https://rpc.ankr.com/bsc
https://bsc-rpc.publicnode.com
https://1rpc.io/bnb

# 付费/高性能 RPC（推荐生产环境）
https://bsc-mainnet.nodereal.io/v1/YOUR_API_KEY
https://bsc-mainnet.infura.io/v3/YOUR_API_KEY
```

---

## 💻 代码实现

### `src/core/web3.ts`

```typescript
import { http } from 'viem'

// 配置 RPC URLs
const transports = {
  [bsc.id]: http(import.meta.env.VITE_BSC_MAINNET_RPC_URL),
  [bscTestnet.id]: http(import.meta.env.VITE_BSC_TESTNET_RPC_URL),
}

export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  transports, // ✅ 添加 transports 配置
})
```

---

## ✅ 功能效果

### 之前（无 RPC 配置）
```
❌ 用户未连接钱包 → 无法读取任何链上数据
❌ 页面显示 "请连接钱包" 或加载失败
❌ 用户体验差
```

### 现在（有 RPC 配置）
```
✅ 用户未连接钱包 → 可以读取链上数据
✅ 页面正常显示：
   - HAF 价格
   - 全局统计
   - 创世节点数量
   - 团队数据（如果有地址）
✅ 用户可以先浏览，再决定是否连接钱包
```

---

## 🧪 测试方法

### 1. 清除钱包连接

```javascript
// 在浏览器控制台执行
localStorage.clear()
sessionStorage.clear()
// 刷新页面
```

### 2. 测试读取数据

未连接钱包时，测试以下功能：

#### ✅ 应该可以读取：
- [ ] HAF 价格（`hafPrice`）
- [ ] 创世节点数量（`getActiveGenesisNodes()`）
- [ ] 全局统计（`getGlobalStats()`）
- [ ] BTC 矿池数据（`getBtcStats()`）
- [ ] 质押等级配置（`stakingLevels`）
- [ ] 团队等级配置（`teamLevels`）

#### ❌ 应该无法读取（需要用户地址）：
- [ ] 用户个人数据（`getUserInfo()`）
- [ ] 用户订单（`getUserOrders()`）
- [ ] 用户收益（`getClaimableRewards()`）
- [ ] 团队成员（`getDirectReferrals()`）

---

## 🔍 RPC 性能对比

| RPC 提供商 | 速度 | 稳定性 | 限制 | 成本 |
|-----------|------|--------|------|------|
| **币安官方** | ⭐⭐⭐ | ⭐⭐⭐⭐ | 免费有限制 | 免费 |
| **PublicNode** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 无限制 | 免费 |
| **Ankr** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 免费有限制 | 免费 |
| **1RPC** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 无限制 | 免费 |
| **NodeReal** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 付费无限制 | 付费 |
| **Infura** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 付费无限制 | 付费 |

### 推荐配置

**开发/测试环境：**
```bash
# 免费公共 RPC 即可
VITE_BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
```

**生产环境（低流量）：**
```bash
# 使用免费高性能 RPC
VITE_BSC_MAINNET_RPC_URL=https://1rpc.io/bnb
```

**生产环境（高流量）：**
```bash
# 使用付费专用 RPC（推荐）
VITE_BSC_MAINNET_RPC_URL=https://bsc-mainnet.nodereal.io/v1/YOUR_API_KEY
```

---

## 🚨 注意事项

### 1. RPC 限制

大多数公共 RPC 有请求限制：
- **请求频率**：每秒 10-100 次
- **每日请求量**：10,000 - 100,000 次
- **批量请求**：限制数量

**解决方案：**
- 使用缓存（已实现：Workers 缓存收益记录）
- 限制前端请求频率
- 升级到付费 RPC

---

### 2. RPC 故障切换

当前配置只有一个 RPC，如果失败会影响用户体验。

**改进建议（可选）：**

```typescript
// 配置多个 RPC 作为备用
import { fallback, http } from 'viem'

const transports = {
  [bsc.id]: fallback([
    http('https://bsc-dataseed1.binance.org'),
    http('https://1rpc.io/bnb'),
    http('https://bsc-rpc.publicnode.com'),
  ]),
  [bscTestnet.id]: fallback([
    http('https://data-seed-prebsc-1-s1.binance.org:8545'),
    http('https://bsc-testnet.public.blastapi.io'),
  ]),
}
```

**效果：**
- ✅ 第一个 RPC 失败 → 自动切换到第二个
- ✅ 提高可用性和稳定性

---

### 3. 环境变量类型定义

创建 `src/env.d.ts`（如果不存在）：

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_MODE: string
  readonly VITE_CHAIN_ID: string
  readonly VITE_CONTRACT_ADDRESS: string
  readonly VITE_USDT_ADDRESS: string
  readonly VITE_CONTRACT_DEPLOY_BLOCK: string
  readonly VITE_API_URL: string
  readonly VITE_BSC_MAINNET_RPC_URL: string
  readonly VITE_BSC_TESTNET_RPC_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

---

## 📈 性能监控

### 监控 RPC 响应时间

```typescript
// 可选：添加 RPC 性能监控
import { http } from 'viem'

const monitoredHttp = (url: string) => {
  return http(url, {
    onFetchRequest(request) {
      console.log('🌐 RPC Request:', request.url)
    },
    onFetchResponse(response) {
      console.log('✅ RPC Response:', response.status)
    },
  })
}

const transports = {
  [bsc.id]: monitoredHttp(import.meta.env.VITE_BSC_MAINNET_RPC_URL),
  [bscTestnet.id]: monitoredHttp(import.meta.env.VITE_BSC_TESTNET_RPC_URL),
}
```

---

## 🎯 总结

### 已完成
- [x] 添加环境变量配置
  - [x] `.env.development` - 测试网 RPC
  - [x] `.env.production` - 主网 RPC
- [x] 更新 `web3.ts` 配置
  - [x] 导入 `http` from viem
  - [x] 配置 `transports`
  - [x] 添加到 `wagmiConfig`

### 效果
- ✅ 用户未连接钱包可读取公共数据
- ✅ 提升首次访问体验
- ✅ 降低用户进入门槛

### 后续优化（可选）
- [ ] 添加 RPC 故障切换（fallback）
- [ ] 添加 RPC 性能监控
- [ ] 升级到付费专用 RPC（生产环境）

---

**配置完成！** 🎉

现在用户无需连接钱包即可浏览 HashFi 的公共数据。
