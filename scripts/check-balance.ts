/**
 * 检查部署账户余额
 * 使用方式: npx hardhat run scripts/check-balance.ts --network bscTestnet
 */

import { createPublicClient, http, formatEther, createWalletClient } from "viem";
import { bscTestnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

async function main() {
  console.log("\n🔍 检查 BSC Testnet 部署账户状态...\n");

  // 从环境变量获取私钥
  const privateKey = process.env.BSC_TESTNET_PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ 未找到 BSC_TESTNET_PRIVATE_KEY 环境变量");
    return;
  }

  // 创建账户
  const account = privateKeyToAccount(`0x${privateKey}` as `0x${string}`);
  console.log("📍 部署者地址:", account.address);

  // 创建公共客户端
  const rpcUrl = process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.bnbchain.org:8545";
  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http(rpcUrl),
  });

  try {
    // 获取余额
    const balance = await publicClient.getBalance({ address: account.address });
    const balanceInBNB = formatEther(balance);
    console.log("💰 BNB 余额:", balanceInBNB, "BNB");

    // 检查余额是否足够
    const minimumBalance = 0.01; // 至少需要 0.01 BNB
    if (parseFloat(balanceInBNB) < minimumBalance) {
      console.log("\n⚠️  警告: 余额不足！");
      console.log(`   需要至少 ${minimumBalance} BNB 来支付部署 gas 费用`);
      console.log(`   请访问 BSC Testnet Faucet 获取测试币:`);
      console.log(`   🔗 https://testnet.bnbchain.org/faucet-smart`);
    } else {
      console.log("\n✅ 余额充足，可以开始部署");
    }

    // 获取网络信息
    console.log("\n📡 网络信息:");
    const chainId = await publicClient.getChainId();
    console.log("   Chain ID:", chainId);
    console.log("   RPC URL:", rpcUrl);

    // 检查 USDT 合约
    console.log("\n📄 USDT 合约地址: 0x9c1A27a6E140973eAA6e5b63dBc04E1177B431E7");
    
    const usdtCode = await publicClient.getBytecode({
      address: "0x9c1A27a6E140973eAA6e5b63dBc04E1177B431E7",
    });
    
    if (!usdtCode || usdtCode === "0x") {
      console.log("   ❌ USDT 合约不存在或未部署");
    } else {
      console.log("   ✅ USDT 合约已部署");
    }
  } catch (error: any) {
    console.error("\n❌ RPC 连接错误:", error.message);
    console.log("\n可能的原因:");
    console.log("1. RPC 节点不可用或响应慢");
    console.log("2. 网络连接问题");
    console.log("3. 尝试更换 .env.hardhat 中的 BSC_TESTNET_RPC_URL");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ 错误:", error.message);
    process.exit(1);
  });
