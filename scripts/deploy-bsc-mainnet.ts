/**
 * BSC Mainnet 部署脚本（支持数据迁移）
 * 使用方式: npm run deploy:bsc:migrate
 *
 * 运行后会提示输入迁移数据 JSON 文件路径，直接回车跳过
 */

import { createWalletClient, createPublicClient, http, type Address } from "viem";
import { bsc } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import fs from "fs";
import readline from "readline";
import dotenv from "dotenv";

dotenv.config({ path: ".env.hardhat" });

interface MigrationData {
  users: string[];
  referrers: string[];
  genesisNodes: string[];
}

async function main() {
  console.log("\n🚀 BSC Mainnet 部署脚本\n");

  // 从命令行参数或 stdin 读取迁移数据文件路径
  let migrationFile = process.argv[2] || "";

  if (!migrationFile) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    migrationFile = await new Promise<string>((resolve) => {
      rl.question("请输入迁移数据 JSON 文件路径（直接回车跳过）: ", (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  // 解析迁移数据
  let migrationData: MigrationData = {
    users: [],
    referrers: [],
    genesisNodes: [],
  };

  if (migrationFile) {
    if (!fs.existsSync(migrationFile)) {
      console.error(`❌ 文件不存在: ${migrationFile}`);
      process.exit(1);
    }
    const fileContent = fs.readFileSync(migrationFile, "utf-8");
    const jsonData = JSON.parse(fileContent);
    migrationData = {
      users: jsonData.users || [],
      referrers: jsonData.referrers || [],
      genesisNodes: jsonData.genesisNodes || jsonData.activeGenesisNodesList || [],
    };
    console.log(`\n📦 迁移数据加载成功:`);
    console.log(`   - 用户数量: ${migrationData.users.length}`);
    console.log(`   - 创世节点: ${migrationData.genesisNodes.length}`);
  } else {
    console.log("\n⏭️  跳过数据迁移，部署空合约");
  }

  // BSC Mainnet 配置
  // 实际 USDT 地址: 0x55d398326f99059ff775485246999027b3197955
  // 目前使用测试 token 地址
  const usdtAddress = "0x55d398326f99059ff775485246999027b3197955";
  const initialOwner = "0x40E9046a0D8fEA5691221279A3B9f4ec3D34A55B";
  const pancakeFactory = "0x0000000000000000000000000000000000000000";
  const pancakeRouter = "0x0000000000000000000000000000000000000000";

  console.log("\n📋 部署配置:");
  console.log(`   - USDT 地址: ${usdtAddress}`);
  console.log(`   - Owner 地址: ${initialOwner}`);
  console.log(`   - PancakeSwap: 使用 BSC 主网默认地址`);

  // 获取部署账户
  const privateKey = process.env.BSC_TESTNET_PRIVATE_KEY;
  if (!privateKey) {
    console.error("\n❌ 未找到私钥，请检查 .env.hardhat 文件");
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey as Address);
  
  const rpcUrl = process.env.BSC_MAINNET_RPC_URL;
  if (!rpcUrl) {
    console.error("\n❌ 未找到 RPC URL，请检查 .env.hardhat 文件");
    process.exit(1);
  }

  const publicClient = createPublicClient({
    chain: bsc,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: bsc,
    transport: http(rpcUrl),
  });

  console.log(`\n👤 部署账户: ${account.address}`);

  const balance = await publicClient.getBalance({
    address: account.address,
  });
  
  const { formatEther, parseEther } = await import("viem");
  console.log(`💰 账户余额: ${formatEther(balance)} BNB`);

  if (balance < parseEther("0.01")) {
    console.error("\n❌ 余额不足，需要至少 0.01 BNB");
    process.exit(1);
  }

  // 部署合约
  console.log("\n⏳ 正在部署 HashFi 合约...");

  // 读取合约编译结果
  const hashFiArtifact = JSON.parse(
    fs.readFileSync("./artifacts/contracts/HashFi.sol/HashFi.json", "utf-8")
  );

  const hash = await walletClient.deployContract({
    abi: hashFiArtifact.abi,
    bytecode: hashFiArtifact.bytecode as Address,
    args: [
      usdtAddress as Address,
      initialOwner as Address,
      pancakeFactory as Address,
      pancakeRouter as Address,
      migrationData.users as Address[],
      migrationData.referrers as Address[],
      migrationData.genesisNodes as Address[],
    ],
  });

  console.log(`   交易哈希: ${hash}`);
  console.log(`   等待交易确认...`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const hashFiAddress = receipt.contractAddress;

  if (!hashFiAddress) {
    console.error("\n❌ 合约部署失败");
    process.exit(1);
  }

  console.log(`\n✅ HashFi 合约部署成功!`);
  console.log(`   合约地址: ${hashFiAddress}`);

  // 获取 HAFToken 地址
  const { getContract } = await import("viem");
  const hashFiContract = getContract({
    address: hashFiAddress,
    abi: hashFiArtifact.abi,
    client: { public: publicClient, wallet: walletClient },
  });

  const hafTokenAddress = await hashFiContract.read.hafToken() as Address;
  console.log(`   HAFToken 地址: ${hafTokenAddress}`);

  // 保存部署信息
  const deployInfo = {
    network: "bscMainnet",
    deployTime: new Date().toISOString(),
    deployer: account.address,
    contracts: {
      HashFi: hashFiAddress,
      HAFToken: hafTokenAddress,
    },
    migration: {
      usersCount: migrationData.users.length,
      genesisNodesCount: migrationData.genesisNodes.length,
      sourceFile: migrationFile || null,
    },
  };

  const deployInfoFile = `deploy-info-${Date.now()}.json`;
  fs.writeFileSync(deployInfoFile, JSON.stringify(deployInfo, null, 2));
  console.log(`\n📄 部署信息已保存到: ${deployInfoFile}`);

  console.log("\n========== 部署完成 ==========");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
