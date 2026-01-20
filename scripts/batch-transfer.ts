import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, Address, Hex } from 'viem';
import { bsc } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as readline from 'readline';

// BatchTransfer 合约地址
const BATCH_TRANSFER_CONTRACT = '0x454Ec8454B05bF2c1fb8fcc0A889Cda2f0721996' as const;

// BatchTransfer ABI
const BATCH_TRANSFER_ABI = [
  {
    constant: false,
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address[]', name: 'recipients', type: 'address[]' },
      { internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }
    ],
    name: 'batchTransfer',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address[]', name: 'recipients', type: 'address[]' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'batchTransferFixed',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;

// ERC20 ABI (仅需要的部分)
const ERC20_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function'
  },
  {
    constant: false,
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function'
  }
] as const;

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function readMultilineInput(prompt: string): Promise<string[]> {
  console.log(prompt);
  console.log('(输入完成后按两次回车结束)');
  
  const lines: string[] = [];
  
  while (true) {
    const line = await question('');
    if (line === '') {
      break;
    }
    lines.push(line.trim());
  }
  
  return lines.filter(line => line !== '');
}

async function main() {
  console.log('='.repeat(60));
  console.log('BSC 批量转账工具');
  console.log('='.repeat(60));
  console.log();

  // 1. 输入私钥
  const privateKeyInput = await question('请输入您的私钥 (带或不带0x前缀): ');
  const privateKey = (privateKeyInput.startsWith('0x') ? privateKeyInput : `0x${privateKeyInput}`) as Hex;
  
  // 创建账户
  const account = privateKeyToAccount(privateKey);
  console.log(`\n钱包地址: ${account.address}`);

  // 创建客户端
  const publicClient = createPublicClient({
    chain: bsc,
    transport: http()
  });

  const walletClient = createWalletClient({
    account,
    chain: bsc,
    transport: http()
  });

  // 2. 输入代币合约地址
  const tokenAddress = await question('\n请输入代币合约地址: ') as Address;

  // 获取代币信息
  console.log('\n正在获取代币信息...');
  
  const [decimalsResult, symbolResult, balanceResult] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'decimals'
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'symbol'
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address]
    })
  ]);

  const decimals = decimalsResult as number;
  const symbol = symbolResult as string;
  let balance = balanceResult as bigint;

  console.log(`代币符号: ${symbol}`);
  console.log(`代币精度: ${decimals}`);
  console.log(`您的余额: ${formatUnits(balance, decimals)} ${symbol}`);

  // 3. 检查授权状态
  console.log('\n正在检查授权状态...');
  const allowanceResult = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account.address, BATCH_TRANSFER_CONTRACT]
  });
  
  let allowance = allowanceResult as bigint;

  console.log(`当前授权额度: ${formatUnits(allowance, decimals)} ${symbol}`);

  // 4. 选择转账模式
  console.log('\n请选择转账模式:');
  console.log('1. 所有地址发送相同金额');
  console.log('2. 每个地址发送不同金额 (地址,金额 格式)');
  
  const mode = await question('\n请选择 (1 或 2): ');

  let recipients: Address[] = [];
  let amounts: bigint[] = [];
  let totalAmount = 0n;

  if (mode === '1') {
    // 模式1: 所有地址相同金额
    const fixedAmountStr = await question(`\n请输入每个地址发送的金额 (${symbol}): `);
    const fixedAmount = parseUnits(fixedAmountStr, decimals);

    console.log('\n请输入接收地址 (每行一个地址):');
    const addressLines = await readMultilineInput('');
    
    for (const line of addressLines) {
      const address = line.trim() as Address;
      if (address.startsWith('0x') && address.length === 42) {
        recipients.push(address);
        amounts.push(fixedAmount);
      } else {
        console.log(`跳过无效地址: ${line}`);
      }
    }
    
    totalAmount = fixedAmount * BigInt(recipients.length);
  } else if (mode === '2') {
    // 模式2: 每个地址不同金额
    console.log('\n请输入地址和金额 (格式: 地址,金额 或 地址 金额):');
    const lines = await readMultilineInput('');
    
    for (const line of lines) {
      // 支持逗号或空格分隔
      const parts = line.split(/[,\s]+/).filter(p => p !== '');
      if (parts.length >= 2) {
        const address = parts[0].trim() as Address;
        const amountStr = parts[1].trim();
        
        if (address.startsWith('0x') && address.length === 42) {
          const amount = parseUnits(amountStr, decimals);
          recipients.push(address);
          amounts.push(amount);
          totalAmount += amount;
        } else {
          console.log(`跳过无效行: ${line}`);
        }
      } else {
        console.log(`跳过无效行: ${line}`);
      }
    }
  } else {
    console.log('无效选择，退出。');
    rl.close();
    return;
  }

  if (recipients.length === 0) {
    console.log('没有有效的接收地址，退出。');
    rl.close();
    return;
  }

  // 5. 显示转账摘要
  console.log('\n' + '='.repeat(60));
  console.log('转账摘要');
  console.log('='.repeat(60));
  console.log(`接收地址数量: ${recipients.length}`);
  console.log(`总转账金额: ${formatUnits(totalAmount, decimals)} ${symbol}`);
  console.log(`您的余额: ${formatUnits(balance, decimals)} ${symbol}`);
  
  if (balance < totalAmount) {
    console.log('\n❌ 错误: 余额不足!');
    rl.close();
    return;
  }

  console.log('\n接收列表:');
  for (let i = 0; i < recipients.length; i++) {
    console.log(`  ${i + 1}. ${recipients[i]} -> ${formatUnits(amounts[i], decimals)} ${symbol}`);
  }

  // 6. 检查并处理授权
  if (allowance < totalAmount) {
    console.log(`\n⚠️  当前授权额度不足，需要授权更多代币`);
    console.log(`需要授权: ${formatUnits(totalAmount, decimals)} ${symbol}`);
    
    const approveConfirm = await question('\n是否授权无限额度? (y/n): ');
    
    if (approveConfirm.toLowerCase() === 'y') {
      console.log('\n正在发送授权交易...');
      
      const maxUint256 = 2n ** 256n - 1n;
      
      const approveHash = await walletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [BATCH_TRANSFER_CONTRACT, maxUint256]
      });
      
      console.log(`授权交易已发送: ${approveHash}`);
      console.log('等待交易确认...');
      
      const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
      
      if (approveReceipt.status === 'success') {
        console.log('✅ 授权成功!');
      } else {
        console.log('❌ 授权失败!');
        rl.close();
        return;
      }
    } else {
      console.log('取消操作。');
      rl.close();
      return;
    }
  }

  // 7. 确认执行转账
  const confirm = await question('\n确认执行批量转账? (y/n): ');
  
  if (confirm.toLowerCase() !== 'y') {
    console.log('已取消。');
    rl.close();
    return;
  }

  // 8. 执行批量转账
  console.log('\n正在发送批量转账交易...');

  // 判断是否所有金额相同，选择合适的方法
  const allSameAmount = amounts.every(a => a === amounts[0]);
  
  let txHash: Hex;
  
  if (allSameAmount && mode === '1') {
    // 使用 batchTransferFixed
    console.log('使用 batchTransferFixed 方法...');
    txHash = await walletClient.writeContract({
      address: BATCH_TRANSFER_CONTRACT,
      abi: BATCH_TRANSFER_ABI,
      functionName: 'batchTransferFixed',
      args: [tokenAddress, recipients, amounts[0]]
    });
  } else {
    // 使用 batchTransfer
    console.log('使用 batchTransfer 方法...');
    txHash = await walletClient.writeContract({
      address: BATCH_TRANSFER_CONTRACT,
      abi: BATCH_TRANSFER_ABI,
      functionName: 'batchTransfer',
      args: [tokenAddress, recipients, amounts]
    });
  }

  console.log(`\n交易已发送!`);
  console.log(`交易哈希: ${txHash}`);
  console.log(`BSCScan: https://bscscan.com/tx/${txHash}`);
  
  console.log('\n等待交易确认...');
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  
  if (receipt.status === 'success') {
    console.log('\n' + '='.repeat(60));
    console.log('✅ 批量转账成功!');
    console.log('='.repeat(60));
    console.log(`Gas 使用: ${receipt.gasUsed}`);
    console.log(`区块号: ${receipt.blockNumber}`);
  } else {
    console.log('\n❌ 交易失败!');
  }

  rl.close();
}

main().catch((error) => {
  console.error('发生错误:', error);
  rl.close();
  process.exit(1);
});
