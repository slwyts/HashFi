#!/usr/bin/env node

/**
 * 部署后自动给测试地址打币
 * 给指定地址发送 ETH 和 USDT
 */

import { createPublicClient, createWalletClient, http, parseEther, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 定义 Hardhat 本地链（Chain ID 31337）
const hardhatLocal = defineChain({
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
  },
});

// 你的测试地址列表
const TEST_ADDRESSES = [
  '0xA4b76D7Cae384C9a5fD5f573Cef74BFdB980E966',
  '0x98C2e0ECDFA961F8B36144C743FEa3951dAd0309',
  '0x676A05c975F447eA13Bf09219A1C3acf81031feC',
  '0x1265986b221d09c163479F64DbcD87daDd197EAc',
  '0xEa4816aE14244465d16D1d074b2bf0F2B75b5e8C',
];

// Hardhat 默认账户 #0 的私钥（部署者）
const DEPLOYER_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

// USDT ABI（只需要 transfer 方法）
const USDT_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

async function main() {
  console.log('\n💰 给测试地址发送资金...\n');

  // 读取部署地址
  const deploymentPath = path.join(__dirname, '../ignition/deployments/chain-31337/deployed_addresses.json');
  
  if (!fs.existsSync(deploymentPath)) {
    console.error('❌ 未找到部署地址文件');
    process.exit(1);
  }

  const addresses = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const usdtAddress = addresses['FullDeployModule#USDT'] as `0x${string}`;

  if (!usdtAddress) {
    console.error('❌ 未找到 USDT 地址');
    process.exit(1);
  }

  // 创建客户端
  const publicClient = createPublicClient({
    chain: hardhatLocal,
    transport: http('http://127.0.0.1:8545'),
  });

  const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY as `0x${string}`);
  
  const walletClient = createWalletClient({
    account,
    chain: hardhatLocal,
    transport: http('http://127.0.0.1:8545'),
  });

  const ethAmount = parseEther('1000'); // 每个地址 1000 ETH
  const usdtAmount = parseEther('100000'); // 每个地址 100,000 USDT

  for (const address of TEST_ADDRESSES) {
    try {
      // 发送 ETH
      const ethTx = await walletClient.sendTransaction({
        to: address as `0x${string}`,
        value: ethAmount,
        chain: hardhatLocal,
      });
      await publicClient.waitForTransactionReceipt({ hash: ethTx });
      
      // 发送 USDT
      const usdtTx = await walletClient.writeContract({
        address: usdtAddress,
        abi: USDT_ABI,
        functionName: 'transfer',
        args: [address as `0x${string}`, usdtAmount],
        chain: hardhatLocal,
      });
      await publicClient.waitForTransactionReceipt({ hash: usdtTx });
      
      console.log(`✅ ${address}`);
      console.log(`   ETH: 1,000 | USDT: 100,000`);
    } catch (error: any) {
      console.error(`❌ ${address} 转账失败:`, error?.message || error);
    }
  }

  console.log('\n💰 资金发送完成！\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
