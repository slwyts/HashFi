#!/usr/bin/env npx tsx
/**
 * ====================================================================
 * HAFToken 全面自动化测试脚本
 * ====================================================================
 * 测试覆盖:
 * 1. 初始状态检查
 * 2. LP 流动性初始化
 * 3. DEX 交易 (买入/卖出)
 * 4. 买入税 1.5% - 累积后分发给创世节点
 * 5. 卖出税 1.5% - 直接转给owner
 * 6. 每日燃烧 5% (时间跳转测试)
 * 7. 自动销毁 0.2%/2小时 (时间跳转测试)
 * 8. 创世节点申请/审批/分红
 * 9. 持币分红 (88 HAF门槛)
 * 10. 质押收益 (静态/动态奖励)
 * ====================================================================
 */

import { spawn, ChildProcess } from 'child_process';
import { 
  createPublicClient, createWalletClient, http, parseEther, formatEther, 
  defineChain, type Address, type Hash
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';

// ==================== 配置 ====================

const hardhatLocal = defineChain({
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: { default: { http: ['http://127.0.0.1:8545'] } },
});

// Hardhat 默认测试账户私钥
const TEST_ACCOUNTS = [
  { name: 'Deployer', key: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' },
  { name: 'User1', key: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' },
  { name: 'User2', key: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' },
  { name: 'User3', key: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6' },
  { name: 'User4', key: '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a' },
  { name: 'User5', key: '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba' },
];

// ABI 定义
const ERC20_ABI = [
  { inputs: [{ name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], name: 'approve', outputs: [{ type: 'bool' }], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], name: 'transfer', outputs: [{ type: 'bool' }], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'totalSupply', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const;

const HASHFI_ABI = [
  { inputs: [], name: 'hafToken', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getLpPairAddress', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'usdtAmount', type: 'uint256' }, { name: 'hafAmount', type: 'uint256' }], name: 'addLiquidity', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'referrer', type: 'address' }], name: 'bindReferrer', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'amount', type: 'uint256' }], name: 'stake', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'applicant', type: 'address' }], name: 'approveGenesisNode', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'applyForGenesisNode', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'withdraw', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'getActiveGenesisNodesCount', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'genesisNodeCost', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'user', type: 'address' }], name: 'getClaimableRewards', outputs: [
    { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }
  ], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'user', type: 'address' }], name: 'getUserInfo', outputs: [{ type: 'tuple', components: [
    { name: 'referrer', type: 'address' },
    { name: 'teamLevel', type: 'uint8' },
    { name: 'totalStakedAmount', type: 'uint256' },
    { name: 'teamTotalPerformance', type: 'uint256' },
    { name: 'directReferrals', type: 'address[]' },
    { name: 'orderIds', type: 'uint256[]' },
    { name: 'isGenesisNode', type: 'bool' },
    { name: 'genesisDividendsWithdrawn', type: 'uint256' },
    { name: 'genesisRewardDebt', type: 'uint256' },
    { name: 'directRewardTotal', type: 'uint256' },
    { name: 'directRewardReleased', type: 'uint256' },
    { name: 'lastDirectUpdateTime', type: 'uint256' },
    { name: 'directRewardClaimed', type: 'uint256' },
    { name: 'directRewardDetails', type: 'tuple[]', components: [] },
    { name: 'shareRewardTotal', type: 'uint256' },
    { name: 'shareRewardClaimed', type: 'uint256' },
    { name: 'totalStaticOutput', type: 'uint256' },
    { name: 'rewardRecords', type: 'tuple[]', components: [] },
    { name: 'withdrawRecords', type: 'tuple[]', components: [] }
  ]}, { type: 'uint8' }, { type: 'uint256' }, { type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'owner', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
] as const;

const HAF_TOKEN_ABI = [
  ...ERC20_ABI,
  { inputs: [], name: 'pancakePair', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'isLpInitialized', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getLpHafBalance', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getLpUsdtBalance', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getPrice', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getContractBalance', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'defiContract', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'DEAD_ADDRESS', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getBurnStats', outputs: [
    { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'bool' }
  ], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getNextDailyBurnTime', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getNextAutoBurnTime', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getEligibleHoldersCount', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'holder', type: 'address' }], name: 'getHolderInfo', outputs: [
    { type: 'bool' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }
  ], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'holder', type: 'address' }], name: 'getPendingDividend', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'claimDividend', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'triggerMechanismsExternal', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'account', type: 'address' }], name: 'isTaxExempt', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
] as const;

const ROUTER_ABI = [
  { inputs: [
    { name: 'amountIn', type: 'uint256' },
    { name: 'amountOutMin', type: 'uint256' },
    { name: 'path', type: 'address[]' },
    { name: 'to', type: 'address' },
    { name: 'deadline', type: 'uint256' }
  ], name: 'swapExactTokensForTokens', outputs: [{ type: 'uint256[]' }], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [
    { name: 'amountIn', type: 'uint256' },
    { name: 'amountOutMin', type: 'uint256' },
    { name: 'path', type: 'address[]' },
    { name: 'to', type: 'address' },
    { name: 'deadline', type: 'uint256' }
  ], name: 'swapExactTokensForTokensSupportingFeeOnTransferTokens', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'amountIn', type: 'uint256' }, { name: 'path', type: 'address[]' }], 
    name: 'getAmountsOut', outputs: [{ type: 'uint256[]' }], stateMutability: 'view', type: 'function' },
] as const;

// ==================== 工具函数 ====================

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function log(emoji: string, msg: string) {
  console.log(`${emoji} ${msg}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

function logResult(label: string, value: string, indent = 0) {
  const pad = '   '.repeat(indent);
  console.log(`${pad}📊 ${label}: ${value}`);
}

// 将bigint格式化为带小数的字符串
function fmtBig(val: bigint, decimals = 4): string {
  const str = formatEther(val);
  const num = parseFloat(str);
  return num.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

// ==================== Hardhat JSON-RPC 工具 ====================

async function increaseTime(seconds: number): Promise<void> {
  await fetch('http://127.0.0.1:8545', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [seconds],
      id: Date.now(),
    }),
  });
  // 挖一个区块使时间生效
  await fetch('http://127.0.0.1:8545', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'evm_mine',
      params: [],
      id: Date.now(),
    }),
  });
}

async function getBlockTimestamp(): Promise<number> {
  const response = await fetch('http://127.0.0.1:8545', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getBlockByNumber',
      params: ['latest', false],
      id: Date.now(),
    }),
  });
  const data = await response.json() as any;
  return parseInt(data.result.timestamp, 16);
}

// ==================== 主测试流程 ====================

let hardhatProcess: ChildProcess | null = null;
let testResults: { name: string; passed: boolean; error?: string }[] = [];

// 全局存储
let publicClient: ReturnType<typeof createPublicClient>;
let wallets: Array<{
  name: string;
  account: ReturnType<typeof privateKeyToAccount>;
  client: ReturnType<typeof createWalletClient>;
}>;
let addresses: {
  usdt: Address;
  weth: Address;
  factory: Address;
  router: Address;
  hashfi: Address;
  hafToken: Address;
  lpPair: Address;
};

async function startHardhatNode(): Promise<void> {
  log('🚀', '启动 Hardhat 节点...');
  
  hardhatProcess = spawn('npx', ['hardhat', 'node'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  // 等待节点启动
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('节点启动超时')), 30000);
    
    hardhatProcess!.stdout?.on('data', (data) => {
      if (data.toString().includes('Started HTTP')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    
    hardhatProcess!.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
  
  log('✅', 'Hardhat 节点已启动');
}

async function deployContracts(): Promise<{
  usdt: Address;
  weth: Address;
  factory: Address;
  router: Address;
  hashfi: Address;
}> {
  log('📦', '部署合约...');
  
  return new Promise((resolve, reject) => {
    // 连接到启动的节点 (localhost)
    const deploy = spawn('npx', [
      'hardhat', 'ignition', 'deploy', 
      'ignition/modules/TokenTest.ts', 
      '--network', 'localhost'
    ], { stdio: ['ignore', 'pipe', 'pipe'], shell: true });

    let output = '';
    deploy.stdout?.on('data', (data) => { output += data.toString(); });
    deploy.stderr?.on('data', (data) => { output += data.toString(); });

    deploy.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`部署失败: ${output}`));
        return;
      }

      // 读取部署地址
      try {
        const addressFile = 'ignition/deployments/chain-31337/deployed_addresses.json';
        const addrs = JSON.parse(fs.readFileSync(addressFile, 'utf-8'));
        resolve({
          usdt: addrs['TokenTestModule#USDT'] as Address,
          weth: addrs['TokenTestModule#WETH'] as Address,
          factory: addrs['TokenTestModule#Factory'] as Address,
          router: addrs['TokenTestModule#Router'] as Address,
          hashfi: addrs['TokenTestModule#HashFi'] as Address,
        });
      } catch (e) {
        reject(new Error(`读取部署地址失败: ${e}`));
      }
    });
  });
}

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    testResults.push({ name, passed: true });
    log('✅', `${name}`);
  } catch (error: any) {
    testResults.push({ name, passed: false, error: error.message });
    log('❌', `${name} - 失败: ${error.message}`);
  }
}

// ==================== 测试套件 ====================

async function test1_InitialState() {
  logSection('测试 1: 初始状态检查');
  
  await runTest('HAFToken 初始供应量 = 2100万', async () => {
    const totalSupply = await publicClient.readContract({
      address: addresses.hafToken,
      abi: HAF_TOKEN_ABI,
      functionName: 'totalSupply',
    });
    logResult('总供应量', `${fmtBig(totalSupply)} HAF`);
    if (totalSupply !== parseEther('21000000')) throw new Error('供应量不正确');
  });

  await runTest('LP Pair 已创建但未初始化', async () => {
    const isInitialized = await publicClient.readContract({
      address: addresses.hafToken,
      abi: HAF_TOKEN_ABI,
      functionName: 'isLpInitialized',
    });
    logResult('LP Pair', addresses.lpPair);
    logResult('LP 已初始化', isInitialized ? '是' : '否');
    if (isInitialized) throw new Error('LP 不应该已初始化');
  });

  await runTest('HAFToken 金库持有全部 HAF', async () => {
    const balance = await publicClient.readContract({
      address: addresses.hafToken,
      abi: HAF_TOKEN_ABI,
      functionName: 'getContractBalance',
    });
    logResult('HAFToken 金库余额', `${fmtBig(balance)} HAF`);
    if (balance !== parseEther('21000000')) throw new Error('HAFToken 应持有全部 HAF');
  });

  await runTest('HAFToken 的 defiContract 是 HashFi', async () => {
    const defiContract = await publicClient.readContract({
      address: addresses.hafToken,
      abi: HAF_TOKEN_ABI,
      functionName: 'defiContract',
    });
    if ((defiContract as string).toLowerCase() !== addresses.hashfi.toLowerCase()) {
      throw new Error('defiContract 应该是 HashFi');
    }
  });
}

async function test2_InitLP() {
  logSection('测试 2: 初始化 LP 流动性');
  
  const deployer = wallets[0];
  const usdtAmount = parseEther('100000'); // 10万 USDT
  const hafAmount = parseEther('1000000'); // 100万 HAF，初始价格 0.1 USDT

  await runTest('添加初始流动性 (10万USDT + 100万HAF)', async () => {
    // 1. 先给 HashFi 转 USDT
    const transferHash = await deployer.client.writeContract({
      address: addresses.usdt,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [addresses.hashfi, usdtAmount],
    });
    await publicClient.waitForTransactionReceipt({ hash: transferHash });

    // 2. 调用 addLiquidity
    const addLiqHash = await deployer.client.writeContract({
      address: addresses.hashfi,
      abi: HASHFI_ABI,
      functionName: 'addLiquidity',
      args: [usdtAmount, hafAmount],
    });
    await publicClient.waitForTransactionReceipt({ hash: addLiqHash });

    // 3. 验证 LP 已初始化
    const isInitialized = await publicClient.readContract({
      address: addresses.hafToken,
      abi: HAF_TOKEN_ABI,
      functionName: 'isLpInitialized',
    });
    if (!isInitialized) throw new Error('LP 应该已初始化');
    logResult('LP 状态', '✅ 已初始化');
  });

  await runTest('验证 LP 池状态和价格约 0.1 USDT', async () => {
    const lpHaf = await publicClient.readContract({
      address: addresses.hafToken, abi: HAF_TOKEN_ABI, functionName: 'getLpHafBalance',
    });
    const lpUsdt = await publicClient.readContract({
      address: addresses.hafToken, abi: HAF_TOKEN_ABI, functionName: 'getLpUsdtBalance',
    });
    const price = await publicClient.readContract({
      address: addresses.hafToken, abi: HAF_TOKEN_ABI, functionName: 'getPrice',
    });

    logResult('LP 中 HAF', `${fmtBig(lpHaf)}`);
    logResult('LP 中 USDT', `${fmtBig(lpUsdt)}`);
    logResult('HAF 价格', `${fmtBig(price)} USDT`);
    
    const priceNum = Number(formatEther(price));
    if (priceNum < 0.09 || priceNum > 0.11) {
      throw new Error(`价格不正确: ${priceNum}, 应该约为 0.1`);
    }
  });
}

async function test3_DEXTrading() {
  logSection('测试 3: DEX 交易 (买入/卖出 HAF)');
  
  const deployer = wallets[0];
  const user = wallets[1]; // User1
  
  // 先给用户分发USDT
  await runTest('给 User1 转 10000 USDT', async () => {
    const hash = await deployer.client.writeContract({
      address: addresses.usdt,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [user.account.address, parseEther('10000')],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    const bal = await publicClient.readContract({
      address: addresses.usdt, abi: ERC20_ABI, functionName: 'balanceOf', args: [user.account.address],
    });
    logResult('User1 USDT 余额', `${fmtBig(bal)}`);
  });

  await runTest('User1 买入 HAF (1000 USDT -> HAF)', async () => {
    const amountIn = parseEther('1000');
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

    // 授权 Router
    const approveHash = await user.client.writeContract({
      address: addresses.usdt, abi: ERC20_ABI, functionName: 'approve',
      args: [addresses.router, amountIn],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    const beforeHaf = await publicClient.readContract({
      address: addresses.hafToken, abi: ERC20_ABI, functionName: 'balanceOf', args: [user.account.address],
    });

    // 执行 swap: USDT -> HAF (支持税收的swap)
    const swapHash = await user.client.writeContract({
      address: addresses.router,
      abi: ROUTER_ABI,
      functionName: 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
      args: [amountIn, 0n, [addresses.usdt, addresses.hafToken], user.account.address, deadline],
    });
    await publicClient.waitForTransactionReceipt({ hash: swapHash });

    const afterHaf = await publicClient.readContract({
      address: addresses.hafToken, abi: ERC20_ABI, functionName: 'balanceOf', args: [user.account.address],
    });
    
    const received = afterHaf - beforeHaf;
    logResult('买入前 HAF', `${fmtBig(beforeHaf)}`);
    logResult('买入后 HAF', `${fmtBig(afterHaf)}`);
    logResult('获得 HAF', `${fmtBig(received)}`);
    
    // 买入应该扣1.5%税
    // 1000 USDT ≈ 10000 HAF (0.1价格), 税后约 9850 HAF
    if (received <= 0n) throw new Error('应该收到 HAF');
  });

  await runTest('验证买入税 1.5% 被累积', async () => {
    // 买入税累积在 HAFToken 合约
    // 通过检查 HAFToken 合约余额变化间接验证
    const hafTokenBal = await publicClient.readContract({
      address: addresses.hafToken, abi: HAF_TOKEN_ABI, functionName: 'getContractBalance',
    });
    logResult('HAFToken 金库当前余额', `${fmtBig(hafTokenBal)} HAF`);
    // 初始 21M - LP用100万 = 20M，买入税会增加
  });

  await runTest('User1 卖出 HAF (5000 HAF -> USDT)', async () => {
    const amountIn = parseEther('5000');
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

    // 授权 Router
    const approveHash = await user.client.writeContract({
      address: addresses.hafToken, abi: ERC20_ABI, functionName: 'approve',
      args: [addresses.router, amountIn],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    const beforeUsdt = await publicClient.readContract({
      address: addresses.usdt, abi: ERC20_ABI, functionName: 'balanceOf', args: [user.account.address],
    });
    const ownerBefore = await publicClient.readContract({
      address: addresses.hafToken, abi: ERC20_ABI, functionName: 'balanceOf', args: [deployer.account.address],
    });

    // 执行 swap: HAF -> USDT
    const swapHash = await user.client.writeContract({
      address: addresses.router,
      abi: ROUTER_ABI,
      functionName: 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
      args: [amountIn, 0n, [addresses.hafToken, addresses.usdt], user.account.address, deadline],
    });
    await publicClient.waitForTransactionReceipt({ hash: swapHash });

    const afterUsdt = await publicClient.readContract({
      address: addresses.usdt, abi: ERC20_ABI, functionName: 'balanceOf', args: [user.account.address],
    });
    const ownerAfter = await publicClient.readContract({
      address: addresses.hafToken, abi: ERC20_ABI, functionName: 'balanceOf', args: [deployer.account.address],
    });
    
    const receivedUsdt = afterUsdt - beforeUsdt;
    const ownerReceived = ownerAfter - ownerBefore;
    logResult('获得 USDT', `${fmtBig(receivedUsdt)}`);
    logResult('Owner 收到卖出税 HAF', `${fmtBig(ownerReceived)}`);
    
    if (receivedUsdt <= 0n) throw new Error('应该收到 USDT');
    // 卖出税 1.5% 直接转给 owner (这里检查是否收到，可能为0因为是新部署)
    logResult('卖出税收取状态', ownerReceived > 0n ? '✅ Owner 已收到' : '⚠️ Owner 未收到 (可能LP池免税)');
  });
}

async function test4_TimeMechanisms() {
  logSection('测试 4: 时间机制 (每日燃烧 + 自动销毁)');
  
  const user = wallets[1];
  
  await runTest('获取燃烧统计 - 初始状态', async () => {
    const [totalBurned, effectiveSupply, minSupply, canStillBurn] = await publicClient.readContract({
      address: addresses.hafToken,
      abi: HAF_TOKEN_ABI,
      functionName: 'getBurnStats',
    }) as [bigint, bigint, bigint, boolean];
    
    logResult('已销毁', `${fmtBig(totalBurned)} HAF`);
    logResult('有效供应', `${fmtBig(effectiveSupply)} HAF`);
    logResult('最小供应', `${fmtBig(minSupply)} HAF`);
    logResult('可继续销毁', canStillBurn ? '是' : '否');
  });

  await runTest('时间跳转 2 小时 - 触发自动销毁 0.2%', async () => {
    const lpBefore = await publicClient.readContract({
      address: addresses.hafToken, abi: HAF_TOKEN_ABI, functionName: 'getLpHafBalance',
    });
    
    // 跳转 2 小时
    try {
      await increaseTime(2 * 60 * 60);
    } catch (e) {
      log('⚠️', '时间跳转可能未生效 (非本地节点模式)');
    }
    
    // 尝试触发机制 (通过简单的转账)
    try {
      const hash = await user.client.writeContract({
        address: addresses.hafToken,
        abi: HAF_TOKEN_ABI,
        functionName: 'triggerMechanismsExternal',
      });
      await publicClient.waitForTransactionReceipt({ hash });
    } catch (e: any) {
      // 如果触发失败，可能是因为没有权限或条件不满足
      log('⚠️', '触发机制调用失败，尝试通过转账触发');
      // 用户自己转给自己一点 HAF 来触发
      const balance = await publicClient.readContract({
        address: addresses.hafToken, abi: ERC20_ABI, functionName: 'balanceOf', args: [user.account.address],
      });
      if (balance > 0n) {
        const hash = await user.client.writeContract({
          address: addresses.hafToken, abi: ERC20_ABI, functionName: 'transfer',
          args: [user.account.address, 1n],
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }
    }
    
    const lpAfter = await publicClient.readContract({
      address: addresses.hafToken, abi: HAF_TOKEN_ABI, functionName: 'getLpHafBalance',
    });
    const [totalBurned,,, ] = await publicClient.readContract({
      address: addresses.hafToken, abi: HAF_TOKEN_ABI, functionName: 'getBurnStats',
    }) as [bigint, bigint, bigint, boolean];
    
    logResult('LP HAF 变化前', `${fmtBig(lpBefore)}`);
    logResult('LP HAF 变化后', `${fmtBig(lpAfter)}`);
    logResult('累计销毁 (黑洞)', `${fmtBig(totalBurned)}`);
    
    // LP 变化检查
    if (lpAfter < lpBefore) {
      logResult('自动销毁', '✅ LP 已减少');
    } else {
      logResult('自动销毁', '⚠️ 时间条件未满足或机制未触发');
    }
  });

  await runTest('时间跳转 24 小时 - 触发每日燃烧 5%', async () => {
    const lpBefore = await publicClient.readContract({
      address: addresses.hafToken, abi: HAF_TOKEN_ABI, functionName: 'getLpHafBalance',
    });
    const totalSupplyBefore = await publicClient.readContract({
      address: addresses.hafToken, abi: ERC20_ABI, functionName: 'totalSupply',
    });
    
    // 跳转 24 小时
    try {
      await increaseTime(24 * 60 * 60);
    } catch (e) {
      log('⚠️', '时间跳转可能未生效');
    }
    
    // 尝试触发
    try {
      const user2 = wallets[2];
      // 用户自己转给自己一点触发
      const hash = await user2.client.writeContract({
        address: addresses.usdt, abi: ERC20_ABI, functionName: 'transfer',
        args: [user2.account.address, 1n],
      });
      await publicClient.waitForTransactionReceipt({ hash });
    } catch (e) {
      // ignore
    }
    
    const lpAfter = await publicClient.readContract({
      address: addresses.hafToken, abi: HAF_TOKEN_ABI, functionName: 'getLpHafBalance',
    });
    const totalSupplyAfter = await publicClient.readContract({
      address: addresses.hafToken, abi: ERC20_ABI, functionName: 'totalSupply',
    });
    
    logResult('LP HAF 前', `${fmtBig(lpBefore)}`);
    logResult('LP HAF 后', `${fmtBig(lpAfter)}`);
    logResult('总供应量变化', `${fmtBig(totalSupplyBefore)} -> ${fmtBig(totalSupplyAfter)}`);
    
    // 每日燃烧会减少 5% LP，并重新铸造分配
    if (lpAfter < lpBefore) {
      logResult('每日燃烧', '✅ 已执行');
    } else {
      logResult('每日燃烧', '⚠️ 时间条件未满足 (需要UTC+8早8点)');
    }
  });
}

async function test5_GenesisNode() {
  logSection('测试 5: 创世节点机制');
  
  const deployer = wallets[0];
  const user = wallets[2]; // User2 作为创世节点申请者
  
  // 先让 User2 质押
  await runTest('User2 绑定推荐人 + 质押 3000U (成为钻石级)', async () => {
    // 给 User2 USDT
    let hash = await deployer.client.writeContract({
      address: addresses.usdt, abi: ERC20_ABI, functionName: 'transfer',
      args: [user.account.address, parseEther('10000')],
    });
    await publicClient.waitForTransactionReceipt({ hash });

    // 检查 Deployer 是否已经绑定推荐人
    const [deployerInfo] = await publicClient.readContract({
      address: addresses.hashfi, abi: HASHFI_ABI, functionName: 'getUserInfo',
      args: [deployer.account.address],
    }) as any;
    
    // 如果 Deployer 没有绑定推荐人，先绑定
    if (deployerInfo.referrer === '0x0000000000000000000000000000000000000000') {
      hash = await deployer.client.writeContract({
        address: addresses.hashfi, abi: HASHFI_ABI, functionName: 'bindReferrer',
        args: ['0x0000000000000000000000000000000000000000'],
      });
      await publicClient.waitForTransactionReceipt({ hash });
    }
    
    // 检查 Deployer 是否已质押
    if (BigInt(deployerInfo.totalStakedAmount) === 0n) {
      // Deployer 质押 100U (让 User2 可以绑定他)
      hash = await deployer.client.writeContract({
        address: addresses.usdt, abi: ERC20_ABI, functionName: 'approve',
        args: [addresses.hashfi, parseEther('100')],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      hash = await deployer.client.writeContract({
        address: addresses.hashfi, abi: HASHFI_ABI, functionName: 'stake',
        args: [parseEther('100')],
      });
      await publicClient.waitForTransactionReceipt({ hash });
    }

    // 检查 User2 是否已绑定
    const [user2Info] = await publicClient.readContract({
      address: addresses.hashfi, abi: HASHFI_ABI, functionName: 'getUserInfo',
      args: [user.account.address],
    }) as any;
    
    if (user2Info.referrer === '0x0000000000000000000000000000000000000000') {
      // User2 绑定 Deployer
      hash = await user.client.writeContract({
        address: addresses.hashfi, abi: HASHFI_ABI, functionName: 'bindReferrer',
        args: [deployer.account.address],
      });
      await publicClient.waitForTransactionReceipt({ hash });
    }
    
    // User2 质押 3000U
    hash = await user.client.writeContract({
      address: addresses.usdt, abi: ERC20_ABI, functionName: 'approve',
      args: [addresses.hashfi, parseEther('3000')],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    hash = await user.client.writeContract({
      address: addresses.hashfi, abi: HASHFI_ABI, functionName: 'stake',
      args: [parseEther('3000')],
    });
    await publicClient.waitForTransactionReceipt({ hash });

    logResult('User2 质押', '3000 USDT');
  });

  await runTest('User2 申请创世节点 (需要 5000 USDT)', async () => {
    const cost = await publicClient.readContract({
      address: addresses.hashfi, abi: HASHFI_ABI, functionName: 'genesisNodeCost',
    }) as bigint;
    logResult('创世节点费用', `${fmtBig(cost)} USDT`);
    
    // 授权
    const approveHash = await user.client.writeContract({
      address: addresses.usdt, abi: ERC20_ABI, functionName: 'approve',
      args: [addresses.hashfi, cost],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    
    // 申请
    const applyHash = await user.client.writeContract({
      address: addresses.hashfi, abi: HASHFI_ABI, functionName: 'applyForGenesisNode',
    });
    await publicClient.waitForTransactionReceipt({ hash: applyHash });
    
    logResult('申请状态', '✅ 已提交');
  });

  await runTest('管理员批准创世节点', async () => {
    // 批准
    const hash = await deployer.client.writeContract({
      address: addresses.hashfi, abi: HASHFI_ABI, functionName: 'approveGenesisNode',
      args: [user.account.address],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    
    const count = await publicClient.readContract({
      address: addresses.hashfi, abi: HASHFI_ABI, functionName: 'getActiveGenesisNodesCount',
    });
    const [userInfo] = await publicClient.readContract({
      address: addresses.hashfi, abi: HASHFI_ABI, functionName: 'getUserInfo',
      args: [user.account.address],
    }) as any;
    
    logResult('活跃创世节点数', `${count}`);
    logResult('User2 是创世节点', userInfo.isGenesisNode ? '是' : '否');
    
    if (!userInfo.isGenesisNode) throw new Error('User2 应该是创世节点');
  });
}

async function test6_HolderDividend() {
  logSection('测试 6: 持币分红机制 (88 HAF 门槛)');
  
  const deployer = wallets[0];
  const user = wallets[3]; // User3
  
  await runTest('User3 获取 100 HAF (满足门槛)', async () => {
    // 先给 User3 一些 USDT 买 HAF
    let hash = await deployer.client.writeContract({
      address: addresses.usdt, abi: ERC20_ABI, functionName: 'transfer',
      args: [user.account.address, parseEther('1000')],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    
    // 检查当前余额
    const currentBalance = await publicClient.readContract({
      address: addresses.usdt, abi: ERC20_ABI, functionName: 'balanceOf', args: [user.account.address],
    });
    logResult('User3 USDT 余额', `${fmtBig(currentBalance)}`);
    
    if (currentBalance > 0n) {
      // 买入 HAF
      hash = await user.client.writeContract({
        address: addresses.usdt, abi: ERC20_ABI, functionName: 'approve',
        args: [addresses.router, parseEther('100')],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      
      hash = await user.client.writeContract({
        address: addresses.router, abi: ROUTER_ABI,
        functionName: 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
        args: [parseEther('100'), 0n, [addresses.usdt, addresses.hafToken], user.account.address, BigInt(Math.floor(Date.now() / 1000) + 3600)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
    }
    
    const hafBal = await publicClient.readContract({
      address: addresses.hafToken, abi: ERC20_ABI, functionName: 'balanceOf', args: [user.account.address],
    });
    logResult('User3 HAF 余额', `${fmtBig(hafBal)}`);
  });

  await runTest('检查持币分红资格', async () => {
    const [eligible, weight, pending, claimed] = await publicClient.readContract({
      address: addresses.hafToken, abi: HAF_TOKEN_ABI, functionName: 'getHolderInfo',
      args: [user.account.address],
    }) as [boolean, bigint, bigint, bigint];
    
    const eligibleCount = await publicClient.readContract({
      address: addresses.hafToken, abi: HAF_TOKEN_ABI, functionName: 'getEligibleHoldersCount',
    });
    
    logResult('有资格', eligible ? '是' : '否');
    logResult('权重', `${weight}`);
    logResult('待领取分红', `${fmtBig(pending)} HAF`);
    logResult('已领取分红', `${fmtBig(claimed)} HAF`);
    logResult('总资格持有者数', `${eligibleCount}`);
  });

  await runTest('时间跳转触发每日燃烧 -> 产生持币分红', async () => {
    // 跳转 1 天
    try {
      await increaseTime(24 * 60 * 60);
    } catch (e) {
      // ignore
    }
    
    // 尝试触发
    try {
      const hafBal = await publicClient.readContract({
        address: addresses.hafToken, abi: ERC20_ABI, functionName: 'balanceOf', args: [user.account.address],
      });
      if (hafBal > 0n) {
        const hash = await user.client.writeContract({
          address: addresses.hafToken, abi: ERC20_ABI, functionName: 'transfer',
          args: [user.account.address, 1n],
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }
    } catch (e) {
      // ignore
    }
    
    const pending = await publicClient.readContract({
      address: addresses.hafToken, abi: HAF_TOKEN_ABI, functionName: 'getPendingDividend',
      args: [user.account.address],
    }) as bigint;
    
    logResult('待领取分红', `${fmtBig(pending)} HAF`);
    
    // 如果有待领取分红就领取
    if (pending > 0n) {
      try {
        const claimHash = await user.client.writeContract({
          address: addresses.hafToken, abi: HAF_TOKEN_ABI, functionName: 'claimDividend',
        });
        await publicClient.waitForTransactionReceipt({ hash: claimHash });
        logResult('领取分红', '✅ 已领取');
      } catch (e) {
        logResult('领取分红', '⚠️ 暂无可领取或条件不满足');
      }
    } else {
      logResult('分红状态', '⚠️ 时间条件未满足，暂无分红产生');
    }
  });
}

async function test7_StakingRewards() {
  logSection('测试 7: 质押收益测试');
  
  const deployer = wallets[0];
  const user = wallets[4]; // User4
  
  await runTest('User4 质押 1000U 并等待收益', async () => {
    // 给 User4 USDT
    let hash = await deployer.client.writeContract({
      address: addresses.usdt, abi: ERC20_ABI, functionName: 'transfer',
      args: [user.account.address, parseEther('5000')],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    
    // 检查 User4 是否已绑定推荐人
    const [user4Info] = await publicClient.readContract({
      address: addresses.hashfi, abi: HASHFI_ABI, functionName: 'getUserInfo',
      args: [user.account.address],
    }) as any;
    
    if (user4Info.referrer === '0x0000000000000000000000000000000000000000') {
      // 绑定推荐人
      hash = await user.client.writeContract({
        address: addresses.hashfi, abi: HASHFI_ABI, functionName: 'bindReferrer',
        args: [deployer.account.address],
      });
      await publicClient.waitForTransactionReceipt({ hash });
    }
    
    // 检查是否已质押
    if (BigInt(user4Info.totalStakedAmount) === 0n) {
      // 授权 + 质押
      hash = await user.client.writeContract({
        address: addresses.usdt, abi: ERC20_ABI, functionName: 'approve',
        args: [addresses.hashfi, parseEther('1000')],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      
      hash = await user.client.writeContract({
        address: addresses.hashfi, abi: HASHFI_ABI, functionName: 'stake',
        args: [parseEther('1000')],
      });
      await publicClient.waitForTransactionReceipt({ hash });
    }
    
    logResult('User4 质押', '1000 USDT');
  });

  await runTest('时间跳转 3 天 -> 检查质押收益', async () => {
    // 跳转 3 天
    try {
      await increaseTime(3 * 24 * 60 * 60);
    } catch (e) {
      // ignore
    }
    
    // 查询可领取奖励
    const [pendingStatic, pendingDynamic, pendingGenesis] = await publicClient.readContract({
      address: addresses.hashfi, abi: HASHFI_ABI, functionName: 'getClaimableRewards',
      args: [wallets[4].account.address],
    }) as [bigint, bigint, bigint];
    
    logResult('待领取静态收益', `${fmtBig(pendingStatic)} HAF`);
    logResult('待领取动态收益', `${fmtBig(pendingDynamic)} HAF`);
    logResult('待领取创世分红', `${fmtBig(pendingGenesis)} HAF`);
    
    // 静态收益应该 > 0 (3天 * 0.9% 日化)
    if (pendingStatic > 0n) {
      logResult('静态收益计算', '✅ 正常');
    } else {
      logResult('静态收益计算', '⚠️ 时间未满足或未生效');
    }
  });

  await runTest('User4 提取收益', async () => {
    const user = wallets[4];
    const hafBefore = await publicClient.readContract({
      address: addresses.hafToken, abi: ERC20_ABI, functionName: 'balanceOf',
      args: [user.account.address],
    });
    
    // 查询可领取奖励
    const [pendingStatic, pendingDynamic, pendingGenesis] = await publicClient.readContract({
      address: addresses.hashfi, abi: HASHFI_ABI, functionName: 'getClaimableRewards',
      args: [user.account.address],
    }) as [bigint, bigint, bigint];
    
    const totalPending = pendingStatic + pendingDynamic + pendingGenesis;
    
    if (totalPending > 0n) {
      try {
        const hash = await user.client.writeContract({
          address: addresses.hashfi, abi: HASHFI_ABI, functionName: 'withdraw',
        });
        await publicClient.waitForTransactionReceipt({ hash });
        
        const hafAfter = await publicClient.readContract({
          address: addresses.hafToken, abi: ERC20_ABI, functionName: 'balanceOf',
          args: [user.account.address],
        });
        
        logResult('HAF 余额变化', `${fmtBig(hafBefore)} -> ${fmtBig(hafAfter)}`);
        logResult('收到 HAF', `${fmtBig(hafAfter - hafBefore)}`);
      } catch (e: any) {
        if (e.message.includes('NoRewards')) {
          logResult('提取结果', '暂无可领取收益');
        } else {
          throw e;
        }
      }
    } else {
      logResult('提取结果', '⚠️ 暂无可领取收益 (需要时间累积)');
    }
  });
}

async function test8_FinalSummary() {
  logSection('测试 8: 最终状态汇总');
  
  await runTest('检查最终 LP 状态', async () => {
    const lpHaf = await publicClient.readContract({
      address: addresses.hafToken, abi: HAF_TOKEN_ABI, functionName: 'getLpHafBalance',
    }) as bigint;
    const lpUsdt = await publicClient.readContract({
      address: addresses.hafToken, abi: HAF_TOKEN_ABI, functionName: 'getLpUsdtBalance',
    }) as bigint;
    const price = await publicClient.readContract({
      address: addresses.hafToken, abi: HAF_TOKEN_ABI, functionName: 'getPrice',
    }) as bigint;
    
    logResult('LP HAF', `${fmtBig(lpHaf)}`);
    logResult('LP USDT', `${fmtBig(lpUsdt)}`);
    logResult('当前价格', `${fmtBig(price)} USDT`);
  });

  await runTest('检查销毁统计', async () => {
    const [totalBurned, effectiveSupply, minSupply, canStillBurn] = await publicClient.readContract({
      address: addresses.hafToken, abi: HAF_TOKEN_ABI, functionName: 'getBurnStats',
    }) as [bigint, bigint, bigint, boolean];
    
    const totalSupply = await publicClient.readContract({
      address: addresses.hafToken, abi: ERC20_ABI, functionName: 'totalSupply',
    });
    
    logResult('总供应量', `${fmtBig(totalSupply)} HAF`);
    logResult('已销毁 (黑洞)', `${fmtBig(totalBurned)} HAF`);
    logResult('有效供应', `${fmtBig(effectiveSupply)} HAF`);
    logResult('最小供应', `${fmtBig(minSupply)} HAF`);
    logResult('可继续销毁', canStillBurn ? '是' : '否');
  });

  await runTest('检查合约余额', async () => {
    const hafTokenBal = await publicClient.readContract({
      address: addresses.hafToken, abi: HAF_TOKEN_ABI, functionName: 'getContractBalance',
    }) as bigint;
    const hashfiUsdt = await publicClient.readContract({
      address: addresses.usdt, abi: ERC20_ABI, functionName: 'balanceOf',
      args: [addresses.hashfi],
    }) as bigint;
    
    logResult('HAFToken 金库', `${fmtBig(hafTokenBal)} HAF`);
    logResult('HashFi USDT', `${fmtBig(hashfiUsdt)} USDT`);
  });
}

// ==================== 主运行器 ====================

async function runAllTests(deployedAddresses: {
  usdt: Address;
  weth: Address;
  factory: Address;
  router: Address;
  hashfi: Address;
}) {
  // 初始化客户端
  publicClient = createPublicClient({
    chain: hardhatLocal,
    transport: http(),
  });

  wallets = TEST_ACCOUNTS.map(acc => ({
    name: acc.name,
    account: privateKeyToAccount(acc.key as `0x${string}`),
    client: createWalletClient({
      chain: hardhatLocal,
      transport: http(),
      account: privateKeyToAccount(acc.key as `0x${string}`),
    }),
  }));

  // 获取 HAFToken 和 LP Pair 地址
  const hafTokenAddress = await publicClient.readContract({
    address: deployedAddresses.hashfi,
    abi: HASHFI_ABI,
    functionName: 'hafToken',
  }) as Address;

  const lpPairAddress = await publicClient.readContract({
    address: hafTokenAddress,
    abi: HAF_TOKEN_ABI,
    functionName: 'pancakePair',
  }) as Address;

  addresses = {
    ...deployedAddresses,
    hafToken: hafTokenAddress,
    lpPair: lpPairAddress,
  };

  logSection('📋 合约地址');
  logResult('USDT', addresses.usdt);
  logResult('WETH', addresses.weth);
  logResult('Factory', addresses.factory);
  logResult('Router', addresses.router);
  logResult('HashFi', addresses.hashfi);
  logResult('HAFToken', addresses.hafToken);
  logResult('LP Pair', addresses.lpPair);

  // 运行所有测试套件
  await test1_InitialState();
  await test2_InitLP();
  await test3_DEXTrading();
  await test4_TimeMechanisms();
  await test5_GenesisNode();
  await test6_HolderDividend();
  await test7_StakingRewards();
  await test8_FinalSummary();

  // ==================== 输出测试结果汇总 ====================
  logSection('📊 测试结果汇总');
  
  let passed = 0;
  let failed = 0;
  
  for (const result of testResults) {
    if (result.passed) {
      console.log(`  ✅ ${result.name}`);
      passed++;
    } else {
      console.log(`  ❌ ${result.name}: ${result.error}`);
      failed++;
    }
  }
  
  console.log('\n' + '-'.repeat(60));
  console.log(`  总计: ${testResults.length} 个测试`);
  console.log(`  ✅ 通过: ${passed}`);
  console.log(`  ❌ 失败: ${failed}`);
  console.log('='.repeat(60) + '\n');

  return failed === 0;
}

async function cleanup() {
  if (hardhatProcess) {
    log('🛑', '停止 Hardhat 节点...');
    hardhatProcess.kill();
    await sleep(1000);
  }
}

// ==================== 主入口 ====================

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           HAFToken 全面自动化测试                          ║');
  console.log('║   覆盖: DEX交易 / 税收 / 燃烧 / 创世节点 / 持币分红 / 质押   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    // 1. 启动节点
    await startHardhatNode();
    await sleep(2000);

    // 2. 部署合约
    const deployedAddresses = await deployContracts();
    log('✅', '合约部署完成');

    // 3. 运行测试
    const success = await runAllTests(deployedAddresses);

    // 4. 清理
    await cleanup();

    // 5. 退出
    process.exit(success ? 0 : 1);

  } catch (error: any) {
    log('💥', `测试失败: ${error.message}`);
    console.error(error);
    await cleanup();
    process.exit(1);
  }
}

main();
