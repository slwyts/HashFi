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

// 你的测试地址列表 (从助记词派生路径 m/44'/60'/0'/0/0-29)
const TEST_ADDRESSES = [
  '0xA4b76D7Cae384C9a5fD5f573Cef74BFdB980E966', // 1
  '0x98C2e0ECDFA961F8B36144C743FEa3951dAd0309', // 2
  '0x676A05c975F447eA13Bf09219A1C3acf81031feC', // 3
  '0x1265986b221d09c163479F64DbcD87daDd197EAc', // 4
  '0xEa4816aE14244465d16D1d074b2bf0F2B75b5e8C', // 5
  '0xC5D058151Fd2AE01630D499d6BF653Ac5fEdF0ba', // 6
  '0x8C6A1F5C86C17377685F677252eFf8DD9c8f9d1A', // 7
  '0x4e5A6Ec0178Df42633789fAeB7ad4CE6BB6c9350', // 8
  '0x75bcd7F24d8694b7aFa57685dC73264aa845ca89', // 9
  '0x1Ff124F4B7337A7442730EB068BDedA221a5A164', // 10
  '0x36d16694f33eE27CcFe4532EF952f4ECC91EF314', // 11
  '0x051222c589fcC6f6F522A3cE93cc08f89b6Ae9E6', // 12
  '0x66F16953E8ae2d9d9d51651133B4814f4874b272', // 13
  '0x9c31Faf916dcD26a9883be1166CF84A72a3666fA', // 14
  '0xfED9d7f6Be7c01bF341716C1c8d54130f3C7Cb6a', // 15
  '0x565AE5FBDD3a35e0815D44E22cEa4a000dF07dc6', // 16
  '0x34A3d9C8Dd22175c46160B30aFa52d4A2Ad40E8F', // 17
  '0x7450073d6CC76c45BDaA407E22902ea55c39090f', // 18
  '0x89327BF9c238f8142574351D7Ae80D5Dc4AdDbe8', // 19
  '0x95389Efa0cA6A8b0F25450f4531Eb66409E9ff46', // 20
  '0x4A3B62FE698f189fF3ee0251ec50c5f648a8372E', // 21
  '0xD0a7a8396fEb8a85b49e51Da4d3EA3E241b77e35', // 22
  '0x1E87f1d64539F68E1a928999f871150E1394EC10', // 23
  '0x29ef6026F84aFD61A5C1178D6dc7FF118828bF3d', // 24
  '0x5307665CD2c00280a5156bB74a8aeEB1a5aA4370', // 25
  '0x845B555e1E21aFf584F7f4F07A6D45173ee0b56C', // 26
  '0xfD2D45Fb49E44952FeC8C0042C7F7540F5533CCe', // 27
  '0x8c736085734f83d2c6bc470073F1395D3E4Cc615', // 28
  '0x5F32560703d28de0B9f2019D1A5704efcD4D5136', // 29
  '0xa5c801709f24513784a469a3B430fC16B808Ed56', // 30
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

  const ethAmount = parseEther('10'); // 每个地址 10 ETH (避免余额不足)
  const usdtAmount = parseEther('100000'); // 每个地址 100,000 USDT

  let successCount = 0;
  let failCount = 0;

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
      
      successCount++;
      console.log(`✅ [${successCount}/${TEST_ADDRESSES.length}] ${address}`);
      console.log(`   ETH: 100 | USDT: 100,000`);
    } catch (error: any) {
      failCount++;
      console.error(`❌ [${failCount}] ${address} 转账失败:`, error?.shortMessage || error?.message || error);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`💰 资金发送完成！`);
  console.log(`   ✅ 成功: ${successCount} 个地址`);
  console.log(`   ❌ 失败: ${failCount} 个地址`);
  console.log('='.repeat(60) + '\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
