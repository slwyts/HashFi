#!/usr/bin/env node

/**
 * 一键分发代币脚本（使用 batchTransfer 批量转账）
 * 
 * 使用方式: 
 *   npx tsx scripts/distribute-tokens.ts
 * 
 * 参数说明:
 *   - 私钥: 发送者的钱包私钥
 *   - 代币合约: HAFToken 合约地址
 *   - 单个地址分发数量: 每个地址分发的代币数量（人类可读格式，如 100 表示 100 个代币）
 *   - 地址列表: 接收代币的地址列表（空格隔开）
 *   - 网络: 选择网络 (bsc / bscTestnet / localhost)
 * 
 * 特点:
 *   - 使用 HAFToken 的 batchTransfer 批量转账，节省 Gas
 *   - 每批最多 100 个地址
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
import * as readline from 'readline';

// 定义 Hardhat 本地链
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

// HAFToken ABI（包含 batchTransfer）
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
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
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
] as const;

// 默认批次大小
const DEFAULT_BATCH_SIZE = 100;

// 网络配置
const NETWORKS: Record<string, { chain: Chain; rpcUrl: string }> = {
  bsc: {
    chain: bsc,
    rpcUrl: process.env.BSC_MAINNET_RPC_URL || 'https://bsc-mainnet.nodereal.io/v1/e1560c03c703402ebafc37500adadd16',
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

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promise 化的 question 函数
function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

// 多行输入函数（输入空行结束）
function questionMultiLine(prompt: string): Promise<string[]> {
  return new Promise((resolve) => {
    console.log(prompt);
    console.log('   (每行一个地址，或空格/逗号隔开，输入空行结束)\n');
    
    const lines: string[] = [];
    
    const onLine = (line: string) => {
      const trimmed = line.trim();
      if (trimmed === '') {
        // 空行表示输入结束
        rl.removeListener('line', onLine);
        resolve(lines);
      } else {
        lines.push(trimmed);
      }
    };
    
    rl.on('line', onLine);
  });
}

// 验证以太坊地址
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// 格式化私钥
function formatPrivateKey(key: string): `0x${string}` {
  const trimmed = key.trim();
  if (trimmed.startsWith('0x')) {
    return trimmed as `0x${string}`;
  }
  return `0x${trimmed}` as `0x${string}`;
}

// 分批处理数组
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// 延迟函数
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 一键分发代币脚本 (batchTransfer 批量版)');
  console.log('='.repeat(60) + '\n');

  try {
    // 1. 选择网络
    console.log('📡 可用网络:');
    console.log('   1. bsc - BSC 主网');
    console.log('   2. bscTestnet - BSC 测试网');
    console.log('   3. localhost - 本地测试网 (Hardhat)\n');
    
    const networkChoice = await question('请选择网络 (1/2/3): ');
    const networkMap: Record<string, string> = {
      '1': 'bsc',
      '2': 'bscTestnet',
      '3': 'localhost',
      'bsc': 'bsc',
      'bscTestnet': 'bscTestnet',
      'localhost': 'localhost',
    };
    
    const networkName = networkMap[networkChoice];
    if (!networkName || !NETWORKS[networkName]) {
      console.error('❌ 无效的网络选择');
      process.exit(1);
    }
    
    const { chain, rpcUrl } = NETWORKS[networkName];
    console.log(`✅ 已选择网络: ${chain.name} (Chain ID: ${chain.id})\n`);

    // 2. 输入私钥
    const privateKeyInput = await question('🔑 请输入发送者私钥: ');
    if (!privateKeyInput) {
      console.error('❌ 私钥不能为空');
      process.exit(1);
    }
    
    const privateKey = formatPrivateKey(privateKeyInput);
    const account = privateKeyToAccount(privateKey);
    console.log(`✅ 发送者地址: ${account.address}\n`);

    // 3. 输入代币合约地址
    const tokenAddress = await question('📄 请输入 HAFToken 合约地址: ');
    if (!isValidAddress(tokenAddress)) {
      console.error('❌ 无效的代币合约地址');
      process.exit(1);
    }

    // 4. 创建客户端
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    });

    // 5. 获取代币信息
    console.log('\n📊 获取代币信息...');
    
    let tokenSymbol: string;
    let tokenDecimals: number;
    let tokenName: string;
    
    try {
      [tokenSymbol, tokenDecimals, tokenName] = await Promise.all([
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
          functionName: 'name',
        }),
      ]);
      
      console.log(`   代币名称: ${tokenName}`);
      console.log(`   代币符号: ${tokenSymbol}`);
      console.log(`   代币精度: ${tokenDecimals}\n`);
    } catch (error) {
      console.error('❌ 无法获取代币信息，请确认合约地址正确');
      process.exit(1);
    }

    // 6. 获取发送者代币余额
    const senderBalance = await publicClient.readContract({
      address: tokenAddress as Address,
      abi: HAFTokenABI,
      functionName: 'balanceOf',
      args: [account.address],
    });
    
    const formattedBalance = formatUnits(senderBalance, tokenDecimals);
    console.log(`💰 发送者 ${tokenSymbol} 余额: ${formattedBalance}\n`);

    // 7. 输入每个地址分发数量
    const amountInput = await question(`💸 请输入每个地址分发的 ${tokenSymbol} 数量: `);
    const amountPerAddress = parseFloat(amountInput);
    
    if (isNaN(amountPerAddress) || amountPerAddress <= 0) {
      console.error('❌ 无效的数量');
      process.exit(1);
    }

    // 8. 输入批次大小
    const batchSizeInput = await question(`📦 请输入每批处理的地址数量 (默认 ${DEFAULT_BATCH_SIZE}): `);
    const batchSize = batchSizeInput ? parseInt(batchSizeInput) : DEFAULT_BATCH_SIZE;
    
    if (isNaN(batchSize) || batchSize <= 0 || batchSize > 1500) {
      console.error('❌ 无效的批次大小（1-1500）');
      process.exit(1);
    }

    // 9. 输入地址列表（支持多行输入）
    const addressLines = await questionMultiLine('📋 请输入接收地址列表:');
    
    // 解析所有地址（支持每行多个地址，空格或逗号隔开）
    const addressList = addressLines
      .flatMap(line => line.split(/[\s,]+/))
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0);

    if (addressList.length === 0) {
      console.error('❌ 地址列表不能为空');
      process.exit(1);
    }

    // 验证所有地址
    const invalidAddresses = addressList.filter(addr => !isValidAddress(addr));
    if (invalidAddresses.length > 0) {
      console.error('❌ 以下地址格式无效:');
      invalidAddresses.forEach(addr => console.error(`   ${addr}`));
      process.exit(1);
    }

    // 去重
    const uniqueAddresses = [...new Set(addressList)];
    if (uniqueAddresses.length < addressList.length) {
      console.log(`⚠️  已去除 ${addressList.length - uniqueAddresses.length} 个重复地址`);
    }

    // 计算总需要数量
    const totalAmount = amountPerAddress * uniqueAddresses.length;
    const amountPerAddressWei = parseUnits(amountPerAddress.toString(), tokenDecimals);
    
    // 分批
    const batches = chunkArray(uniqueAddresses, batchSize);
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 分发计划:');
    console.log('='.repeat(60));
    console.log(`   网络: ${chain.name}`);
    console.log(`   代币: ${tokenName} (${tokenSymbol})`);
    console.log(`   发送者: ${account.address}`);
    console.log(`   接收地址数量: ${uniqueAddresses.length}`);
    console.log(`   每个地址分发: ${amountPerAddress} ${tokenSymbol}`);
    console.log(`   总计分发: ${totalAmount} ${tokenSymbol}`);
    console.log(`   当前余额: ${formattedBalance} ${tokenSymbol}`);
    console.log(`   批次大小: ${batchSize}`);
    console.log(`   总批次数: ${batches.length}`);
    console.log('='.repeat(60) + '\n');

    // 检查余额是否足够
    const totalAmountWei = parseUnits(totalAmount.toString(), tokenDecimals);
    if (totalAmountWei > senderBalance) {
      console.error('❌ 代币余额不足！');
      console.error(`   需要: ${totalAmount} ${tokenSymbol}`);
      console.error(`   当前: ${formattedBalance} ${tokenSymbol}`);
      process.exit(1);
    }

    // 确认执行
    const confirm = await question('⚠️  确认执行分发? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('❌ 已取消分发');
      process.exit(0);
    }

    // 10. 开始分发（使用 batchTransfer）
    console.log('\n🚀 开始批量分发代币...\n');
    
    let successCount = 0;
    let failCount = 0;
    const failedBatches: number[] = [];
    const txHashes: string[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchNum = i + 1;
      
      console.log(`📦 批次 ${batchNum}/${batches.length} (${batch.length} 个地址)`);
      
      try {
        // 构建参数：所有地址和对应的金额数组
        const recipients = batch as Address[];
        const amounts = batch.map(() => amountPerAddressWei);
        
        const txHash = await walletClient.writeContract({
          address: tokenAddress as Address,
          abi: HAFTokenABI,
          functionName: 'batchTransfer',
          args: [recipients, amounts],
          chain,
        });

        console.log(`   ✅ 交易已发送: ${txHash}`);
        console.log(`   ⏳ 等待确认...`);

        // 等待交易确认
        const receipt = await publicClient.waitForTransactionReceipt({ 
          hash: txHash,
          confirmations: 1,
        });

        if (receipt.status === 'success') {
          successCount += batch.length;
          txHashes.push(txHash);
          console.log(`   ✅ 批次 ${batchNum} 成功 (区块: ${receipt.blockNumber})`);
        } else {
          failCount += batch.length;
          failedBatches.push(batchNum);
          console.log(`   ❌ 批次 ${batchNum} 交易失败`);
        }
      } catch (error: any) {
        failCount += batch.length;
        failedBatches.push(batchNum);
        console.error(`   ❌ 批次 ${batchNum} 发送失败: ${error?.shortMessage || error?.message || '未知错误'}`);
      }

      // 批次间延迟
      if (i < batches.length - 1) {
        console.log(`   ⏳ 等待 2 秒后继续...\n`);
        await sleep(2000);
      }
    }

    // 11. 输出结果
    console.log('\n' + '='.repeat(60));
    console.log('📊 分发完成!');
    console.log('='.repeat(60));
    console.log(`   ✅ 成功: ${successCount} 个地址`);
    console.log(`   ❌ 失败: ${failCount} 个地址`);
    console.log(`   📝 交易数: ${txHashes.length}`);
    
    if (failedBatches.length > 0) {
      console.log(`\n❌ 失败的批次: ${failedBatches.join(', ')}`);
    }

    if (txHashes.length > 0) {
      console.log('\n📜 交易哈希:');
      txHashes.forEach((hash, i) => console.log(`   ${i + 1}. ${hash}`));
    }

    // 获取最终余额
    const finalBalance = await publicClient.readContract({
      address: tokenAddress as Address,
      abi: HAFTokenABI,
      functionName: 'balanceOf',
      args: [account.address],
    });
    
    console.log(`\n💰 发送者最终余额: ${formatUnits(finalBalance, tokenDecimals)} ${tokenSymbol}`);
    console.log('='.repeat(60) + '\n');

  } catch (error: any) {
    console.error('\n❌ 发生错误:', error?.message || error);
  } finally {
    rl.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
