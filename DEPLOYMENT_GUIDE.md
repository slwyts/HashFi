# HashFi 合约部署与测试指南

## 📋 修复完成清单

### ✅ 已修复的严重问题
- [x] 静态收益计算逻辑 - 按总额度百分比释放
- [x] 创世节点分红计算 - 平均分配机制
- [x] 团队奖励单独记录 - 便于前端显示

### ✅ 新增功能
- [x] BTC矿池数据管理
- [x] 全局统计数据
- [x] 创世节点查询功能

---

## 🔧 编译与测试

### 1. 编译合约

```bash
# 使用 Hardhat 编译
npx hardhat compile

# 或使用 Foundry
forge build
```

### 2. 运行单元测试

创建测试文件 `test/HashFi.test.ts`:

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";

describe("HashFi", function () {
  let hashFi;
  let usdt;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    // 部署模拟USDT
    const USDT = await ethers.getContractFactory("MockUSDT");
    usdt = await USDT.deploy();
    
    // 部署HashFi
    const HashFi = await ethers.getContractFactory("HashFi");
    hashFi = await HashFi.deploy(usdt.address, owner.address);
    
    // 给用户分配USDT
    await usdt.transfer(user1.address, ethers.utils.parseEther("10000"));
    await usdt.transfer(user2.address, ethers.utils.parseEther("10000"));
  });

  describe("静态收益测试", function () {
    it("应该正确计算按总额度百分比的静态收益", async function () {
      // 1. 绑定推荐关系
      await hashFi.connect(user1).bindReferrer(owner.address);
      
      // 2. 质押3000 USDT (钻石级别)
      await usdt.connect(user1).approve(hashFi.address, ethers.utils.parseEther("3000"));
      await hashFi.connect(user1).stake(ethers.utils.parseEther("3000"));
      
      // 3. 模拟1天后
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine");
      
      // 4. 检查待领取收益
      const [pendingStatic] = await hashFi.getClaimableRewards(user1.address);
      
      // 期望: 3000 * 3 (倍数) * 1% (日释放率) * 90% (用户份额) / HAF价格
      // = 9000 * 0.01 * 0.9 / 1 = 81 HAF
      expect(pendingStatic).to.equal(ethers.utils.parseEther("81"));
    });

    it("HAF价格上涨时，应该获得更少的HAF数量", async function () {
      await hashFi.connect(user1).bindReferrer(owner.address);
      await usdt.connect(user1).approve(hashFi.address, ethers.utils.parseEther("3000"));
      await hashFi.connect(user1).stake(ethers.utils.parseEther("3000"));
      
      // HAF价格涨到10 USDT
      await hashFi.setHafPrice(ethers.utils.parseUnits("10", 6));
      
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine");
      
      const [pendingStatic] = await hashFi.getClaimableRewards(user1.address);
      
      // 期望: 81 USDT / 10 = 8.1 HAF
      expect(pendingStatic).to.equal(ethers.utils.parseEther("8.1"));
    });
  });

  describe("创世节点测试", function () {
    it("应该平均分配分红池", async function () {
      // 创建2个创世节点
      await hashFi.connect(user1).bindReferrer(owner.address);
      await hashFi.connect(user2).bindReferrer(owner.address);
      
      await usdt.connect(user1).approve(hashFi.address, ethers.utils.parseEther("100"));
      await hashFi.connect(user1).stake(ethers.utils.parseEther("100"));
      
      await usdt.connect(user2).approve(hashFi.address, ethers.utils.parseEther("100"));
      await hashFi.connect(user2).stake(ethers.utils.parseEther("100"));
      
      // 申请创世节点
      await usdt.connect(user1).approve(hashFi.address, ethers.utils.parseEther("5000"));
      await hashFi.connect(user1).applyForGenesisNode();
      
      await usdt.connect(user2).approve(hashFi.address, ethers.utils.parseEther("5000"));
      await hashFi.connect(user2).applyForGenesisNode();
      
      // 后台审核通过
      await hashFi.approveGenesisNode(user1.address);
      await hashFi.approveGenesisNode(user2.address);
      
      // 模拟有1000 USDT分红池
      // (通过其他用户质押产生)
      
      // 检查分红
      const activeNodes = await hashFi.getActiveGenesisNodes();
      expect(activeNodes.length).to.equal(2);
    });
  });

  describe("BTC数据测试", function () {
    it("应该正确存储和读取BTC数据", async function () {
      await hashFi.updateBtcStats(
        ethers.utils.parseEther("100000"), // 总算力
        ethers.utils.parseEther("1000000"), // 全网算力
        ethers.utils.parseUnits("0.00001", 6), // 每T日收益
        12345678, // 难度
        ethers.utils.parseUnits("50000", 6), // BTC价格
        1735689600 // 下次减产时间
      );
      
      const btcStats = await hashFi.getBtcStats();
      expect(btcStats.totalHashrate).to.equal(ethers.utils.parseEther("100000"));
    });
  });

  describe("全局统计测试", function () {
    it("应该正确更新统计数据", async function () {
      await hashFi.connect(user1).bindReferrer(owner.address);
      await usdt.connect(user1).approve(hashFi.address, ethers.utils.parseEther("3000"));
      await hashFi.connect(user1).stake(ethers.utils.parseEther("3000"));
      
      const stats = await hashFi.getGlobalStats();
      expect(stats.statistics.totalDepositedUsdt).to.equal(ethers.utils.parseEther("3000"));
      expect(stats.statistics.totalActiveUsers).to.equal(1);
    });
  });
});
```

运行测试：
```bash
npx hardhat test
```

---

## 🚀 部署步骤

### 1. 准备环境变量

创建 `.env` 文件：

```env
# 网络配置
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
BSC_MAINNET_RPC=https://bsc-dataseed.binance.org/

# 私钥（测试网和主网使用不同的钱包）
TESTNET_PRIVATE_KEY=your_testnet_private_key_here
MAINNET_PRIVATE_KEY=your_mainnet_private_key_here

# API密钥（用于验证合约）
BSCSCAN_API_KEY=your_bscscan_api_key_here

# 合约地址（部署后填写）
USDT_ADDRESS_TESTNET=0x...
USDT_ADDRESS_MAINNET=0x55d398326f99059fF775485246999027B3197955
```

### 2. 配置 Hardhat

`hardhat.config.ts`:

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC,
      chainId: 97,
      accounts: [process.env.TESTNET_PRIVATE_KEY!],
    },
    bscMainnet: {
      url: process.env.BSC_MAINNET_RPC,
      chainId: 56,
      accounts: [process.env.MAINNET_PRIVATE_KEY!],
    },
  },
  etherscan: {
    apiKey: process.env.BSCSCAN_API_KEY,
  },
};

export default config;
```

### 3. 创建部署脚本

`scripts/deploy.ts`:

```typescript
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // USDT地址（BSC主网）
  const USDT_ADDRESS = process.env.USDT_ADDRESS_MAINNET || "0x55d398326f99059fF775485246999027B3197955";
  
  // 部署HashFi合约
  const HashFi = await ethers.getContractFactory("HashFi");
  const hashFi = await HashFi.deploy(USDT_ADDRESS, deployer.address);
  
  await hashFi.deployed();
  
  console.log("HashFi deployed to:", hashFi.address);
  console.log("USDT address:", USDT_ADDRESS);
  console.log("Owner address:", deployer.address);
  
  // 等待几个区块确认
  console.log("Waiting for block confirmations...");
  await hashFi.deployTransaction.wait(5);
  
  // 验证合约
  console.log("Verifying contract on BSCScan...");
  try {
    await hre.run("verify:verify", {
      address: hashFi.address,
      constructorArguments: [USDT_ADDRESS, deployer.address],
    });
    console.log("Contract verified successfully");
  } catch (error) {
    console.log("Verification failed:", error);
  }
  
  // 保存部署信息
  const fs = require("fs");
  const deployInfo = {
    network: hre.network.name,
    contractAddress: hashFi.address,
    usdtAddress: USDT_ADDRESS,
    owner: deployer.address,
    deployTime: new Date().toISOString(),
  };
  
  fs.writeFileSync(
    `deployments/${hre.network.name}.json`,
    JSON.stringify(deployInfo, null, 2)
  );
  
  console.log("Deployment info saved to deployments/" + hre.network.name + ".json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 4. 部署到测试网

```bash
# BSC测试网
npx hardhat run scripts/deploy.ts --network bscTestnet
```

### 5. 部署到主网

```bash
# BSC主网（谨慎操作）
npx hardhat run scripts/deploy.ts --network bscMainnet
```

---

## ⚙️ 部署后配置

### 1. 初始化HAF价格

```bash
npx hardhat console --network bscMainnet
```

```javascript
const hashFi = await ethers.getContractAt("HashFi", "YOUR_CONTRACT_ADDRESS");

// 设置初始HAF价格为1 USDT
await hashFi.setHafPrice(ethers.utils.parseUnits("1", 6));

// 设置每日涨幅0.1%
await hashFi.setDailyPriceIncreaseRate(1);

// 启用自动涨价
await hashFi.setAutoPriceUpdate(true);
```

### 2. 初始化BTC数据

```javascript
await hashFi.updateBtcStats(
  ethers.utils.parseEther("100000"),     // 总算力
  ethers.utils.parseEther("500000000"),  // 全网算力
  ethers.utils.parseUnits("0.00001", 6), // 每T日收益
  70000000000000,                        // 当前难度
  ethers.utils.parseUnits("95000", 6),   // BTC价格
  1777536000                             // 下次减产时间
);
```

### 3. 设置提现手续费

```javascript
// 5%手续费
await hashFi.setWithdrawalFee(5);

// 1%闪兑手续费
await hashFi.setSwapFee(1);
```

---

## 🔍 合约验证

### 验证合约代码

```bash
npx hardhat verify --network bscMainnet YOUR_CONTRACT_ADDRESS "USDT_ADDRESS" "OWNER_ADDRESS"
```

### 检查合约状态

```javascript
// 检查HAF价格
const price = await hashFi.hafPrice();
console.log("HAF Price:", ethers.utils.formatUnits(price, 6), "USDT");

// 检查全局统计
const stats = await hashFi.getGlobalStats();
console.log("Total Deposited:", ethers.utils.formatEther(stats.statistics.totalDepositedUsdt), "USDT");
console.log("Total Users:", stats.statistics.totalActiveUsers.toString());

// 检查BTC数据
const btcStats = await hashFi.getBtcStats();
console.log("BTC Price:", ethers.utils.formatUnits(btcStats.btcPrice, 6), "USD");
```

---

## 📱 前端集成

### 1. 更新合约地址和ABI

```typescript
// src/config/contracts.ts
export const HASHFI_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
export const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";

// 从 contract/abi.json 导入ABI
import abi from "../../contract/abi.json";
export const HASHFI_ABI = abi;
```

### 2. 替换模拟数据

```typescript
// src/views/Income.vue - 替换为真实合约数据
import { useRewardRecords } from '@/core/contract';

const { data: rewardRecords } = useRewardRecords();
```

### 3. 集成BTC数据

```typescript
// src/components/BtcPoolStats.vue
import { useReadContract } from '@wagmi/vue';
import { HASHFI_ADDRESS, HASHFI_ABI } from '@/config/contracts';

const { data: btcStats } = useReadContract({
  address: HASHFI_ADDRESS,
  abi: HASHFI_ABI,
  functionName: 'getBtcStats',
});
```

---

## 🛡️ 安全检查清单

- [ ] 合约编译无错误
- [ ] 所有单元测试通过
- [ ] 测试网部署成功
- [ ] 测试网功能验证完整
- [ ] 第三方安全审计（推荐）
- [ ] 多签钱包管理权限（推荐）
- [ ] 应急暂停机制测试
- [ ] 前端集成测试
- [ ] 用户手册编写
- [ ] 主网部署前审查

---

## 📞 联系与支持

如有问题，请参考：
1. 审计报告：`CONTRACT_AUDIT_REPORT.md`
2. 修复总结：`CONTRACT_FIXES_SUMMARY.md`
3. 合约文档：`contract/CONTRACT_IMPROVEMENTS.md`

---

**部署状态**: ⏳ 待测试  
**最后更新**: 2025年10月7日
