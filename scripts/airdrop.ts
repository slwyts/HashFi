#!/usr/bin/env node

/**
 * 空投脚本 - 使用 HAFToken 的 batchTransfer 批量转账
 * 
 * 使用方式: 
 *   npx tsx scripts/airdrop.ts <json文件路径> [选项]
 * 
 * 参数说明:
 *   json文件路径: export-balances.ts 导出的 JSON 文件
 *   --token: HAFToken 合约地址（可选，会从环境变量或提示输入）
 *   --network: 网络选择 bsc / bscTestnet / localhost
 *   --batch-size: 每批处理的地址数量（默认: 100）
 *   --amount: 覆盖每个地址的空投数量（人类可读格式，如 "100" 表示 100 个代币）
 *   --multiplier: 按原余额的倍率空投（如 0.1 表示原余额的 10%）
 *   --dry-run: 仅模拟，不实际执行
 * 
 * 示例:
 *   npx tsx scripts/airdrop.ts ./balances.json --network bsc --amount 100
 *   npx tsx scripts/airdrop.ts ./balances.json --network bsc --multiplier 0.1
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  defineChain,
  type Chain,
  type Address,
} from 'viem';
import { bsc, bscTestnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';
import path from 'path';
import * as readline from 'readline';

// Hardhat 本地链
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

// HAFToken ABI（只需要 batchTransfer 和相关方法）
const HAFTokenABI = [
  {
    inputs: [
      { internalType: 'address[]', name: 'recipients', type: 'address[]' },
      { internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' },
    ],
    name: 'batchTransfer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// 网络配置
const NETWORKS: Record<string, { chain: Chain; rpcUrl: string }> = {
  bsc: {
    chain: bsc,
    rpcUrl: process.env.BSC_MAINNET_RPC_URL || 'https://bsc-dataseed1.binance.org',
  },
  bscTestnet: {
    chain: bscTestnet,
    rpcUrl: process.env.BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
  },
  localhost: {
    chain: hardhatLocal,
    rpcUrl: 'http://127.0.0.1:8545',
  },
};

interface BalancesData {
  exportTime: string;
  sourceFile: string;
  excludeTop: number;
  topLimit: number;
  totalHolders: number;
  filteredHolders: number;
  holders: Record<string, string>; // address => balance (wei string)
}

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

function formatPrivateKey(key: string): `0x${string}` {
  const trimmed = key.trim();
  if (trimmed.startsWith('0x')) {
    return trimmed as `0x${string}`;
  }
  return `0x${trimmed}` as `0x${string}`;
}

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
使用方式: npx tsx scripts/airdrop.ts <json文件路径> [选项]

选项:
  --token ADDRESS    HAFToken 合约地址
  --network NAME     网络: bsc / bscTestnet / localhost
  --batch-size N     每批处理的地址数量（默认: 100）
  --amount VALUE     覆盖每个地址的空投数量（人类可读格式）
  --multiplier N     按原余额的倍率空投（如 0.1 表示 10%）
  --dry-run          仅模拟，不实际执行
  --help, -h         显示帮助信息

示例:
  npx tsx scripts/airdrop.ts ./balances.json --network bsc --amount 100
  npx tsx scripts/airdrop.ts ./balances.json --network bsc --multiplier 0.1 --batch-size 50
`);
    process.exit(0);
  }

  // 解析参数
  let jsonPath = '';
  let tokenAddress = '';
  let networkName = '';
  let batchSize = 100;
  let fixedAmount = '';
  let multiplier = 0;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--token' && args[i + 1]) {
      tokenAddress = args[++i];
    } else if (arg === '--network' && args[i + 1]) {
      networkName = args[++i];
    } else if (arg === '--batch-size' && args[i + 1]) {
      batchSize = parseInt(args[++i]);
    } else if (arg === '--amount' && args[i + 1]) {
      fixedAmount = args[++i];
    } else if (arg === '--multiplier' && args[i + 1]) {
      multiplier = parseFloat(args[++i]);
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (!arg.startsWith('--')) {
      jsonPath = arg;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🪂 HAFToken 空投脚本');
  console.log('='.repeat(60) + '\n');

  // 验证 JSON 文件
  if (!jsonPath) {
    console.error('❌ 请提供 JSON 文件路径');
    process.exit(1);
  }

  if (!path.isAbsolute(jsonPath)) {
    jsonPath = path.resolve(process.cwd(), jsonPath);
  }

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ 文件不存在: ${jsonPath}`);
    process.exit(1);
  }

  // 读取 JSON 数据
  console.log(`📁 读取文件: ${jsonPath}`);
  const data: BalancesData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const holderAddresses = Object.keys(data.holders);
  console.log(`✅ 共 ${holderAddresses.length} 个地址\n`);

  // 选择网络
  if (!networkName) {
    console.log('📡 可用网络:');
    console.log('   1. bsc - BSC 主网');
    console.log('   2. bscTestnet - BSC 测试网');
    console.log('   3. localhost - 本地测试网\n');

    const choice = await question('请选择网络 (1/2/3): ');
    const networkMap: Record<string, string> = {
      '1': 'bsc',
      '2': 'bscTestnet',
      '3': 'localhost',
    };
    networkName = networkMap[choice] || choice;
  }

  if (!NETWORKS[networkName]) {
    console.error(`❌ 无效的网络: ${networkName}`);
    process.exit(1);
  }

  const { chain, rpcUrl } = NETWORKS[networkName];
  console.log(`✅ 网络: ${chain.name} (Chain ID: ${chain.id})\n`);

  // 输入私钥
  const privateKeyInput = await question('🔑 请输入发送者私钥: ');
  if (!privateKeyInput) {
    console.error('❌ 私钥不能为空');
    process.exit(1);
  }

  const privateKey = formatPrivateKey(privateKeyInput);
  const account = privateKeyToAccount(privateKey);
  console.log(`✅ 发送者地址: ${account.address}\n`);

  // 输入代币合约地址
  if (!tokenAddress) {
    tokenAddress = await question('📄 请输入 HAFToken 合约地址: ');
  }

  if (!isValidAddress(tokenAddress)) {
    console.error('❌ 无效的合约地址');
    process.exit(1);
  }

  // 创建客户端
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  // 获取代币信息
  console.log('\n📊 获取代币信息...');
  const [symbol, decimals, senderBalance] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress as Address,
      abi: HAFTokenABI,
      functionName: 'symbol',
    }),
    publicClient.readContract({
      address: tokenAddress as Address,
      abi: HAFTokenABI,
      functionName: 'decimals',
    }),
    publicClient.readContract({
      address: tokenAddress as Address,
      abi: HAFTokenABI,
      functionName: 'balanceOf',
      args: [account.address],
    }),
  ]);

  console.log(`   代币: ${symbol}`);
  console.log(`   小数位: ${decimals}`);
  console.log(`   发送者余额: ${formatUnits(senderBalance, decimals)} ${symbol}\n`);

  // 计算空投金额
  const recipients: Address[] = [];
  const amounts: bigint[] = [];
  let totalAmount = BigInt(0);

  for (const [address, balanceStr] of Object.entries(data.holders)) {
    let amount: bigint;

    if (fixedAmount) {
      // 固定金额
      amount = parseUnits(fixedAmount, decimals);
    } else if (multiplier > 0) {
      // 按比例
      const originalBalance = BigInt(balanceStr);
      amount = BigInt(Math.floor(Number(originalBalance) * multiplier));
    } else {
      // 默认使用原余额
      amount = BigInt(balanceStr);
    }

    if (amount > 0) {
      recipients.push(address as Address);
      amounts.push(amount);
      totalAmount += amount;
    }
  }

  console.log('📋 空投摘要:');
  console.log(`   接收地址数: ${recipients.length}`);
  console.log(`   总空投量: ${formatUnits(totalAmount, decimals)} ${symbol}`);
  console.log(`   每批大小: ${batchSize}`);
  console.log(`   批次数: ${Math.ceil(recipients.length / batchSize)}`);

  if (fixedAmount) {
    console.log(`   模式: 固定金额 ${fixedAmount} ${symbol}/地址`);
  } else if (multiplier > 0) {
    console.log(`   模式: 按比例 ${multiplier * 100}%`);
  } else {
    console.log(`   模式: 原始余额`);
  }
  console.log('');

  // 检查余额
  if (senderBalance < totalAmount) {
    console.error(`❌ 余额不足！需要 ${formatUnits(totalAmount, decimals)}，当前 ${formatUnits(senderBalance, decimals)}`);
    process.exit(1);
  }

  // 确认执行
  if (dryRun) {
    console.log('⚠️ 模拟运行模式，不会实际执行交易\n');

    // 显示前 10 个地址
    console.log('📋 前 10 个空投地址:');
    recipients.slice(0, 10).forEach((addr, i) => {
      console.log(`   ${i + 1}. ${addr} => ${formatUnits(amounts[i], decimals)} ${symbol}`);
    });
    if (recipients.length > 10) {
      console.log(`   ... 还有 ${recipients.length - 10} 个地址`);
    }

    rl.close();
    process.exit(0);
  }

  const confirm = await question(`\n⚠️ 确认执行空投？将发送 ${formatUnits(totalAmount, decimals)} ${symbol} 到 ${recipients.length} 个地址 (yes/no): `);
  if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
    console.log('已取消');
    rl.close();
    process.exit(0);
  }

  // 分批执行
  console.log('\n🚀 开始执行空投...\n');

  const batches = Math.ceil(recipients.length / batchSize);
  let successCount = 0;
  let failCount = 0;
  const txHashes: string[] = [];

  for (let i = 0; i < batches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, recipients.length);
    const batchRecipients = recipients.slice(start, end);
    const batchAmounts = amounts.slice(start, end);

    console.log(`📦 批次 ${i + 1}/${batches} (${batchRecipients.length} 个地址)`);

    try {
      const hash = await walletClient.writeContract({
        address: tokenAddress as Address,
        abi: HAFTokenABI,
        functionName: 'batchTransfer',
        args: [batchRecipients, batchAmounts],
      });

      console.log(`   ✅ 交易已发送: ${hash}`);
      txHashes.push(hash);

      // 等待确认
      console.log(`   ⏳ 等待确认...`);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        console.log(`   ✅ 交易确认成功 (区块: ${receipt.blockNumber})`);
        successCount += batchRecipients.length;
      } else {
        console.log(`   ❌ 交易失败`);
        failCount += batchRecipients.length;
      }

      // 批次间延迟
      if (i < batches - 1) {
        console.log(`   ⏳ 等待 2 秒后继续...\n`);
        await sleep(2000);
      }
    } catch (error: any) {
      console.log(`   ❌ 批次失败: ${error.message}`);
      failCount += batchRecipients.length;

      // 询问是否继续
      const continueChoice = await question('   是否继续? (yes/no): ');
      if (continueChoice.toLowerCase() !== 'yes' && continueChoice.toLowerCase() !== 'y') {
        break;
      }
    }
  }

  // 打印结果
  console.log('\n' + '='.repeat(60));
  console.log('📊 空投完成');
  console.log('='.repeat(60));
  console.log(`   成功: ${successCount} 个地址`);
  console.log(`   失败: ${failCount} 个地址`);
  console.log(`   交易数: ${txHashes.length}`);
  console.log('');

  // 保存交易记录
  const logFile = `airdrop-log-${Date.now()}.json`;
  fs.writeFileSync(
    logFile,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        network: networkName,
        token: tokenAddress,
        sender: account.address,
        sourceFile: jsonPath,
        totalRecipients: recipients.length,
        successCount,
        failCount,
        totalAmount: totalAmount.toString(),
        txHashes,
      },
      null,
      2
    )
  );
  console.log(`📝 交易记录已保存: ${logFile}`);

  rl.close();
}

main().catch((error) => {
  console.error('❌ 错误:', error.message);
  process.exit(1);
});
