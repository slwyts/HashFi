# HashFi Hardhat 部署指南

## 安装依赖

```bash
npm install
```

## 编译合约

```bash
npx hardhat compile
```

## 本地测试

### 1. 启动本地节点

```bash
npx hardhat node
```

### 2. 部署到本地网络

在另一个终端中运行:

```bash
# 部署完整项目 (USDT + HashFi)
npx hardhat ignition deploy ignition/modules/FullDeploy.ts --network localhost

# 或者分别部署
npx hardhat ignition deploy ignition/modules/USDT.ts --network localhost
npx hardhat ignition deploy ignition/modules/HashFi.ts --network localhost --parameters '{"initialOwner": "0x...", "usdtAddress": "0x..."}'
```

## 测试网部署 (Sepolia)

### 1. 配置环境变量

复制 `.env.example` 为 `.env` 并填写:

```bash
cp .env.example .env
```

编辑 `.env` 文件:
```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
SEPOLIA_PRIVATE_KEY=your_private_key_here
```

### 2. 部署到 Sepolia

```bash
npx hardhat ignition deploy ignition/modules/FullDeploy.ts --network sepolia
```

## 合约验证

部署后验证合约:

```bash
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS "constructor_arg1" "constructor_arg2"
```

## 合约架构

```
HashFi (主合约)
├── HashFiAdmin (管理员功能)
│   └── HashFiLogic (业务逻辑)
│       └── HashFiStorage (状态存储)
│           └── Ownable
├── HashFiView (视图函数)
│   └── HashFiLogic
├── ERC20 (HAF 代币)
├── ReentrancyGuard (防重入)
└── Pausable (暂停功能)
```

## 主要功能

- **质押**: 用户质押 USDT 获得 HAF 代币奖励
- **推荐系统**: 6代推荐奖励 + 10代分享奖励
- **团队等级**: V0-V5 等级,提供收益加速
- **创世节点**: 特殊节点享受全网分红
- **闪兑**: HAF ↔ USDT 互换

## 开发命令

```bash
# 编译合约
npx hardhat compile

# 清理编译产物
npx hardhat clean

# 运行测试
npx hardhat test

# 启动本地节点
npx hardhat node

# 部署合约
npx hardhat ignition deploy ignition/modules/FullDeploy.ts --network <network-name>
```

## 注意事项

1. **测试 USDT**: `contracts/usdt.sol` 仅用于开发测试,生产环境请使用真实 USDT 地址
2. **优化器**: 已启用 `viaIR: true` 以解决栈深度问题
3. **私钥安全**: 永远不要提交 `.env` 文件到 git
4. **Gas 优化**: 生产部署建议增加 optimizer runs 参数

## 网络配置

当前配置的网络:
- `hardhatMainnet`: 本地 L1 模拟网络
- `hardhatOp`: 本地 OP Stack 模拟网络
- `sepolia`: Sepolia 测试网

可以在 `hardhat.config.ts` 中添加更多网络配置。
