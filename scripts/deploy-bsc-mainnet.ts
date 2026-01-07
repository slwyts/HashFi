/**
 * BSC Mainnet 部署脚本（支持数据迁移）
 * 使用方式: npm run deploy:bsc:migrate
 *
 * 运行后会提示输入迁移数据 JSON 文件路径，直接回车跳过
 */

import hre from "hardhat";
import fs from "fs";
import readline from "readline";

interface MigrationData {
  users: string[];
  referrers: string[];
  genesisNodes: string[];
}

async function main() {
  console.log("\n🚀 BSC Mainnet 部署脚本\n");

  // 从 stdin 读取迁移数据文件路径
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const migrationFile = await new Promise<string>((resolve) => {
    rl.question("请输入迁移数据 JSON 文件路径（直接回车跳过）: ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

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
  const usdtAddress = "0x91be819583bB301509c9aA3640DcE1F1CC03A49C";
  const initialOwner = "0xA4b76D7Cae384C9a5fD5f573Cef74BFdB980E966";
  const pancakeFactory = "0x0000000000000000000000000000000000000000";
  const pancakeRouter = "0x0000000000000000000000000000000000000000";

  console.log("\n📋 部署配置:");
  console.log(`   - USDT 地址: ${usdtAddress}`);
  console.log(`   - Owner 地址: ${initialOwner}`);
  console.log(`   - PancakeSwap: 使用 BSC 主网默认地址`);

  // 获取部署账户
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  console.log(`\n👤 部署账户: ${deployer.account.address}`);

  const balance = await publicClient.getBalance({ address: deployer.account.address });
  console.log(`💰 账户余额: ${Number(balance) / 1e18} BNB`);

  if (balance < BigInt(0.01 * 1e18)) {
    console.error("\n❌ 余额不足，需要至少 0.01 BNB");
    process.exit(1);
  }

  // 部署合约
  console.log("\n⏳ 正在部署 HashFi 合约...");

  const hashFi = await hre.viem.deployContract("HashFi", [
    usdtAddress,
    initialOwner,
    pancakeFactory,
    pancakeRouter,
    migrationData.users,
    migrationData.referrers,
    migrationData.genesisNodes,
  ]);

  console.log(`\n✅ HashFi 合约部署成功!`);
  console.log(`   合约地址: ${hashFi.address}`);

  // 获取 HAFToken 地址
  const hafTokenAddress = await hashFi.read.hafToken();
  console.log(`   HAFToken 地址: ${hafTokenAddress}`);

  // 保存部署信息
  const deployInfo = {
    network: "bscMainnet",
    deployTime: new Date().toISOString(),
    deployer: deployer.account.address,
    contracts: {
      HashFi: hashFi.address,
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
