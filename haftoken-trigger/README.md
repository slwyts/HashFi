# HAFToken Trigger Worker

一个 Cloudflare Worker，用于定时触发 HAFToken 合约的分红和 LP 抽水机制。

## 功能

通过定时执行代币转账（自己转给自己 1 wei），主动触发 HAFToken 合约中的 `_triggerLazyMechanisms()` 函数，从而执行：

- 每日销毁 (Daily Burn)
- 自动销毁 (Auto Burn)
- 买入税分发 (Buy Tax Distribution)
- 持币人分红处理 (Holder Dividends)

## 触发时间表 (UTC+8)

| 时间 | 说明 |
|------|------|
| 08:00 | 早晨触发 - 每日销毁检查 |
| 12:00 | 中午触发 |
| 18:00 | 傍晚触发 |
| 22:00 | 晚间触发 |
| 23:58 | 午夜前触发 |
| 00:00 | 午夜触发 |
| 00:01 | 午夜后触发 |

## 安装

```bash
cd haftoken-trigger
npm install
```

## 配置

### 环境变量

需要配置以下环境变量（通过 Cloudflare Dashboard 或 `wrangler secret` 命令）：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `RPC_URL` | 区块链 RPC 节点地址 | `https://bsc-dataseed.binance.org/` |
| `PRIVATE_KEY` | 触发钱包的私钥 | `0x...` 或不带 `0x` 前缀 |
| `HAF_TOKEN_ADDRESS` | HAFToken 合约地址 | `0x...` |
| `CHAIN_ID` | 链 ID | `56` (BSC 主网) 或 `97` (BSC 测试网) |

### 设置 Secrets

```bash
# 设置私钥
npx wrangler secret put PRIVATE_KEY

# 设置 RPC URL
npx wrangler secret put RPC_URL

# 设置代币地址
npx wrangler secret put HAF_TOKEN_ADDRESS

# 设置链 ID
npx wrangler secret put CHAIN_ID
```

## 本地开发

```bash
# 启动本地开发服务器
npm run dev
```

访问以下端点测试：
- `http://localhost:8787/health` - 健康检查
- `http://localhost:8787/info` - 查看配置信息
- `http://localhost:8787/trigger` - 手动触发（需要配置环境变量）

## 部署

```bash
# 部署到 Cloudflare
npm run deploy
```

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/` | GET | 基本信息页 |
| `/health` | GET | 健康检查 |
| `/info` | GET | 详细配置和时间表信息 |
| `/trigger` | GET | 手动触发（用于测试） |

## 触发钱包要求

触发钱包需要：

1. **少量 BNB** - 用于支付 Gas 费用（每次触发约 0.0005-0.002 BNB）
2. **少量 HAF 代币**（可选）- 如果有余额，会通过自转账触发；如果没有，会调用 `triggerMechanismsExternal()` 函数

## 工作原理

1. Worker 按照设定的 cron 时间表被 Cloudflare 触发
2. 检查触发钱包的 HAF 余额
3. 如果有余额：执行一笔 1 wei 的自转账交易
4. 如果没有余额：直接调用合约的 `triggerMechanismsExternal()` 函数
5. 这两种方式都会触发合约内部的机制检查和执行

## 安全建议

- 触发钱包应该是专用钱包，只存放少量 BNB 用于 Gas
- 私钥必须通过 `wrangler secret` 设置，不要明文存储
- 定期检查触发钱包余额，确保有足够的 Gas 费用

## 日志查看

```bash
# 实时查看 Worker 日志
npm run tail
```

## 支持的链

- BSC 主网 (Chain ID: 56)
- BSC 测试网 (Chain ID: 97)
- 其他 EVM 兼容链（通过配置 CHAIN_ID 和 RPC_URL）

## License

MIT
