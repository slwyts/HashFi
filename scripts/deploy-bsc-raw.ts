/**
 * BSC 主网部署脚本 - 使用 viem 原生部署
 * 支持自定义 Gas Limit，绕过 Hardhat Ignition 的限制
 * 
 * 使用方式: npx tsx scripts/deploy-bsc-raw.ts
 */

import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { bsc } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

// BSC 主网 RPC
const RPC_URL = "https://bsc-mainnet.nodereal.io/v1/YOUR_API_KEY";

// 合约地址
const USDT_ADDRESS = "0x55d398326f99059ff775485246999027b3197955";
const INITIAL_OWNER = "0x40E9046a0D8fEA5691221279A3B9f4ec3D34A55B";

// 读取私钥
function readPrivateKey(): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question("请输入部署者私钥 (0x开头): ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// 加载迁移数据
function loadMigrationData() {
  const filePath = path.resolve(process.cwd(), "migration-data-latest.json");
  
  if (!fs.existsSync(filePath)) {
    console.log("⚠️ 迁移数据文件不存在，将部署空合约");
    return {
      users: [],
      referrers: [],
      genesisNodes: [],
      stakeUsers: [],
      stakeAmounts: [],
    };
  }

  const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  
  return {
    users: jsonData.users || [],
    referrers: jsonData.referrers || [],
    genesisNodes: jsonData.genesisNodes || [],
    stakeUsers: jsonData.stakeUsers || [],
    stakeAmounts: (jsonData.stakeAmounts || []).map((a: string) => BigInt(a)),
  };
}

// 读取编译后的合约 bytecode
function loadContractArtifact(contractName: string) {
  const artifactPath = path.resolve(
    process.cwd(),
    `artifacts/contracts/${contractName}.sol/${contractName}.json`
  );
  
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`合约 artifact 不存在: ${artifactPath}\n请先运行 npx hardhat compile`);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  return {
    abi: artifact.abi,
    bytecode: artifact.bytecode as `0x${string}`,
  };
}

async function main() {
  console.log("🚀 HashFi BSC 主网部署脚本 (viem 原生版)\n");
  console.log("📡 RPC:", RPC_URL);
  console.log("💰 USDT:", USDT_ADDRESS);
  console.log("👤 Owner:", INITIAL_OWNER);
  console.log("");

  // 读取私钥
  const privateKeyInput = await readPrivateKey();
  
  // 自动添加 0x 前缀
  const privateKey = privateKeyInput.startsWith("0x") ? privateKeyInput : `0x${privateKeyInput}`;
  
  if (privateKey.length !== 66) {
    console.error("❌ 私钥格式错误，应为 64 位十六进制字符串");
    process.exit(1);
  }

  // 创建账户
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`\n📍 部署地址: ${account.address}`);

  // 创建客户端
  const publicClient = createPublicClient({
    chain: bsc,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: bsc,
    transport: http(RPC_URL),
  });

  // 检查余额
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💎 BNB 余额: ${Number(balance) / 1e18} BNB`);

  if (balance < BigInt(0.005 * 1e18)) {
    console.error("❌ BNB 余额不足，建议至少 0.005 BNB (约 $5)");
    process.exit(1);
  }

  // 加载迁移数据
  const migrationData = loadMigrationData();
  console.log(`\n📦 迁移数据:`);
  console.log(`   - 用户: ${migrationData.users.length}`);
  console.log(`   - 创世节点: ${migrationData.genesisNodes.length}`);
  console.log(`   - 质押订单: ${migrationData.stakeUsers.length}`);

  // 加载合约
  console.log("\n📄 加载合约 artifacts...");
  const hashFiArtifact = loadContractArtifact("HashFi");
  const hafTokenArtifact = loadContractArtifact("HAFToken");

  // ========== 部署 HashFi ==========
  console.log("\n🔨 部署 HashFi...");
  console.log("   Gas Limit: 40,000,000");

  const hashFiHash = await walletClient.deployContract({
    abi: hashFiArtifact.abi,
    bytecode: hashFiArtifact.bytecode,
    args: [
      USDT_ADDRESS,
      INITIAL_OWNER,
      migrationData.users,
      migrationData.referrers,
      migrationData.genesisNodes,
      migrationData.stakeUsers,
      migrationData.stakeAmounts,
    ],
    gas: BigInt(40000000), // 4000万 Gas
  });

  console.log(`   交易哈希: ${hashFiHash}`);
  console.log("   等待确认...");

  const hashFiReceipt = await publicClient.waitForTransactionReceipt({
    hash: hashFiHash,
  });

  if (!hashFiReceipt.contractAddress) {
    console.error("❌ HashFi 部署失败");
    process.exit(1);
  }

  const hashFiAddress = hashFiReceipt.contractAddress;
  console.log(`   ✅ HashFi 部署成功: ${hashFiAddress}`);
  console.log(`   Gas 使用: ${hashFiReceipt.gasUsed.toString()}`);

  // ========== 部署 HAFToken ==========
  console.log("\n🔨 部署 HAFToken...");
  console.log("   Gas Limit: 10,000,000");

  const hafTokenHash = await walletClient.deployContract({
    abi: hafTokenArtifact.abi,
    bytecode: hafTokenArtifact.bytecode,
    args: [
      USDT_ADDRESS,
      hashFiAddress,
      "0x0000000000000000000000000000000000000000", // 使用默认 PancakeSwap Factory
      "0x0000000000000000000000000000000000000000", // 使用默认 PancakeSwap Router
    ],
    gas: BigInt(10000000), // 1000万 Gas
  });

  console.log(`   交易哈希: ${hafTokenHash}`);
  console.log("   等待确认...");

  const hafTokenReceipt = await publicClient.waitForTransactionReceipt({
    hash: hafTokenHash,
  });

  if (!hafTokenReceipt.contractAddress) {
    console.error("❌ HAFToken 部署失败");
    process.exit(1);
  }

  const hafTokenAddress = hafTokenReceipt.contractAddress;
  console.log(`   ✅ HAFToken 部署成功: ${hafTokenAddress}`);
  console.log(`   Gas 使用: ${hafTokenReceipt.gasUsed.toString()}`);

  // ========== 绑定 HAFToken ==========
  console.log("\n🔗 绑定 HAFToken 到 HashFi...");

  const setHafTokenHash = await walletClient.writeContract({
    address: hashFiAddress,
    abi: hashFiArtifact.abi,
    functionName: "setHafToken",
    args: [hafTokenAddress],
    gas: BigInt(200000),
  });

  console.log(`   交易哈希: ${setHafTokenHash}`);
  console.log("   等待确认...");

  await publicClient.waitForTransactionReceipt({ hash: setHafTokenHash });
  console.log("   ✅ 绑定成功");

  // ========== 保存结果 ==========
  const result = {
    network: "bscMainnet",
    chainId: 56,
    timestamp: new Date().toISOString(),
    deployer: account.address,
    contracts: {
      HashFi: hashFiAddress,
      HAFToken: hafTokenAddress,
    },
    transactions: {
      deployHashFi: hashFiHash,
      deployHAFToken: hafTokenHash,
      setHafToken: setHafTokenHash,
    },
    gasUsed: {
      HashFi: hashFiReceipt.gasUsed.toString(),
      HAFToken: hafTokenReceipt.gasUsed.toString(),
    },
  };

  fs.writeFileSync(
    "deploy-result-bsc-mainnet.json",
    JSON.stringify(result, null, 2)
  );

  console.log("\n" + "=".repeat(50));
  console.log("🎉 部署完成!");
  console.log("=".repeat(50));
  console.log(`HashFi:   ${hashFiAddress}`);
  console.log(`HAFToken: ${hafTokenAddress}`);
  console.log("\n📄 部署结果已保存到 deploy-result-bsc-mainnet.json");
}

main().catch((error) => {
  console.error("\n❌ 部署失败:", error.message || error);
  process.exit(1);
});
