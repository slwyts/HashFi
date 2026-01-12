/**
 * 导出创世节点入金记录
 * 通过 RPC 查询合约收到的 USDT Transfer 事件
 * 区分入金（applyForGenesisNode）和质押（stake）
 * 使用方式: npm run export:genesis
 */

import { createPublicClient, http, getContract, parseAbiItem, formatUnits, type Address, decodeFunctionData, type Hex } from "viem";
import { bsc } from "viem/chains";
import fs from "fs";
import readline from "readline";

// HashFi 合约 ABI
const HashFiABI = [
  {
    inputs: [],
    name: "getAllGenesisNodes",
    outputs: [{ type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "genesisNodeCost",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_amount", type: "uint256" }],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "applyForGenesisNode",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// 函数选择器（用于判断交易类型）
const STAKE_SELECTOR = "0xa694fc3a"; // stake(uint256)
const APPLY_GENESIS_SELECTOR = "0xeb808210"; // applyForGenesisNode()

// ERC20 Transfer 事件
const transferEventAbi = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

// BSC USDT 地址
const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955" as Address;

// 交易类型
type TransactionType = "applyGenesis" | "stake" | "unknown";

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 判断交易类型
function getTransactionType(input: Hex | undefined): TransactionType {
  if (!input || input.length < 10) return "unknown";
  const selector = input.slice(0, 10).toLowerCase();
  if (selector === STAKE_SELECTOR) return "stake";
  if (selector === APPLY_GENESIS_SELECTOR) return "applyGenesis";
  return "unknown";
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const contractAddress = await new Promise<string>((resolve) => {
    rl.question("请输入 HashFi 合约地址: ", (answer) => {
      resolve(answer.trim());
    });
  });

  if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    console.error("无效的合约地址");
    rl.close();
    process.exit(1);
  }

  const startBlockInput = await new Promise<string>((resolve) => {
    rl.question("请输入合约部署区块 (留空使用默认 73454368): ", (answer) => {
      resolve(answer.trim() || "73454368");
    });
  });

  const rpcUrlInput = await new Promise<string>((resolve) => {
    rl.question("请输入 RPC URL (留空使用默认，推荐用付费RPC如NodeReal): ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  const startBlock = BigInt(startBlockInput);

  console.log(`\n连接合约: ${contractAddress}`);
  console.log(`起始区块: ${startBlock}`);

  // 创建公共客户端 (PublicNode 支持归档数据)
  const rpcUrl = rpcUrlInput || process.env.BSC_MAINNET_RPC_URL || "https://bsc-mainnet.nodereal.io/v1/API_KEY";
  console.log(`RPC: ${rpcUrl}`);

  const publicClient = createPublicClient({
    chain: bsc,
    transport: http(rpcUrl),
  });

  const contract = getContract({
    address: contractAddress as Address,
    abi: HashFiABI,
    client: publicClient,
  });

  // 1. 获取所有创世节点
  console.log("\n获取创世节点列表...");
  const genesisNodes = await contract.read.getAllGenesisNodes();
  console.log(`共 ${genesisNodes.length} 个创世节点`);

  if (genesisNodes.length === 0) {
    console.log("没有创世节点，退出");
    process.exit(0);
  }

  // 创建创世节点集合（小写）
  const genesisNodeSet = new Set(genesisNodes.map(addr => addr.toLowerCase()));

  // 2. 获取当前区块
  const currentBlock = await publicClient.getBlockNumber();
  console.log(`当前区块: ${currentBlock}`);

  // 3. 分批查询合约收到的 USDT Transfer 事件
  console.log("\n查询合约收到的 USDT 转账...");

  const deposits: {
    address: string;
    amount: string;
    amountWei: string;
    txHash: string;
    blockNumber: string;
    type: TransactionType;
  }[] = [];

  // 每批查询区块数（付费RPC可用更大范围）
  const BLOCK_RANGE = 5000n;
  let fromBlock = startBlock;
  let totalQueries = 0;
  let consecutiveErrors = 0;

  // 缓存已查询的交易以避免重复请求
  const txCache: Map<string, TransactionType> = new Map();

  while (fromBlock <= currentBlock) {
    const toBlock = fromBlock + BLOCK_RANGE > currentBlock
      ? currentBlock
      : fromBlock + BLOCK_RANGE;

    totalQueries++;
    if (totalQueries % 50 === 0) {
      console.log(`  进度: 区块 ${fromBlock} / ${currentBlock} (${((Number(fromBlock - startBlock) / Number(currentBlock - startBlock)) * 100).toFixed(1)}%)`);
    }

    try {
      const logs = await publicClient.getLogs({
        address: USDT_ADDRESS,
        event: transferEventAbi,
        args: {
          to: contractAddress as Address,
        },
        fromBlock,
        toBlock,
      });

      consecutiveErrors = 0; // 重置错误计数

      for (const log of logs) {
        const from = log.args.from!.toLowerCase();
        // 只记录来自创世节点的转账
        if (genesisNodeSet.has(from)) {
          const amount = log.args.value!;
          const txHash = log.transactionHash;
          
          // 查询交易类型（使用缓存）
          let txType: TransactionType;
          if (txCache.has(txHash)) {
            txType = txCache.get(txHash)!;
          } else {
            try {
              const tx = await publicClient.getTransaction({ hash: txHash });
              txType = getTransactionType(tx.input as Hex);
              txCache.set(txHash, txType);
              await sleep(30); // 避免 rate limit
            } catch {
              txType = "unknown";
            }
          }
          
          deposits.push({
            address: log.args.from!,
            amount: formatUnits(amount, 18),
            amountWei: amount.toString(),
            txHash,
            blockNumber: log.blockNumber.toString(),
            type: txType,
          });
          
          const typeLabel = txType === "stake" ? "质押" : txType === "applyGenesis" ? "申请创世" : "未知";
          console.log(`  发现: ${log.args.from} -> ${formatUnits(amount, 18)} USDT [${typeLabel}]`);
        }
      }

      // 短暂延迟避免 rate limit
      await sleep(50);

    } catch (error: any) {
      consecutiveErrors++;
      console.error(`  查询 ${fromBlock}-${toBlock} 失败: ${error.message || error}`);
      if (consecutiveErrors > 10) {
        console.error(`\n连续错误过多，请使用付费RPC。推荐：`);
        console.error(`  NodeReal: https://nodereal.io/`);
        console.error(`  QuickNode: https://www.quicknode.com/`);
        process.exit(1);
      }
      await sleep(2000); // 等待2秒后重试
      continue; // 不增加 fromBlock，重试当前范围
    }

    fromBlock = toBlock + 1n;
  }

  console.log(`\n查询完成，共 ${totalQueries} 次请求`);

  // 4. 汇总数据
  const summary: Record<string, {
    totalDeposits: number;
    totalAmount: string;
    deposits: typeof deposits;
    // 细分统计
    applyGenesisCount: number;
    applyGenesisAmount: string;
    stakeCount: number;
    stakeAmount: string;
    unknownCount: number;
    unknownAmount: string;
  }> = {};

  for (const deposit of deposits) {
    const addr = deposit.address.toLowerCase();
    if (!summary[addr]) {
      summary[addr] = {
        totalDeposits: 0,
        totalAmount: "0",
        deposits: [],
        applyGenesisCount: 0,
        applyGenesisAmount: "0",
        stakeCount: 0,
        stakeAmount: "0",
        unknownCount: 0,
        unknownAmount: "0",
      };
    }
    summary[addr].totalDeposits++;
    summary[addr].totalAmount = (
      parseFloat(summary[addr].totalAmount) + parseFloat(deposit.amount)
    ).toString();
    summary[addr].deposits.push(deposit);
    
    // 按类型统计
    if (deposit.type === "applyGenesis") {
      summary[addr].applyGenesisCount++;
      summary[addr].applyGenesisAmount = (
        parseFloat(summary[addr].applyGenesisAmount) + parseFloat(deposit.amount)
      ).toString();
    } else if (deposit.type === "stake") {
      summary[addr].stakeCount++;
      summary[addr].stakeAmount = (
        parseFloat(summary[addr].stakeAmount) + parseFloat(deposit.amount)
      ).toString();
    } else {
      summary[addr].unknownCount++;
      summary[addr].unknownAmount = (
        parseFloat(summary[addr].unknownAmount) + parseFloat(deposit.amount)
      ).toString();
    }
  }

  // 5. 导出数据
  // 计算全局统计
  const globalStats = {
    applyGenesisTotal: 0,
    applyGenesisAmount: 0,
    stakeTotal: 0,
    stakeAmount: 0,
    unknownTotal: 0,
    unknownAmount: 0,
  };
  
  for (const deposit of deposits) {
    if (deposit.type === "applyGenesis") {
      globalStats.applyGenesisTotal++;
      globalStats.applyGenesisAmount += parseFloat(deposit.amount);
    } else if (deposit.type === "stake") {
      globalStats.stakeTotal++;
      globalStats.stakeAmount += parseFloat(deposit.amount);
    } else {
      globalStats.unknownTotal++;
      globalStats.unknownAmount += parseFloat(deposit.amount);
    }
  }
  
  const exportData = {
    exportTime: new Date().toISOString(),
    contractAddress,
    usdtAddress: USDT_ADDRESS,
    startBlock: startBlock.toString(),
    endBlock: currentBlock.toString(),
    totalGenesisNodes: genesisNodes.length,
    totalDepositsFound: deposits.length,
    globalStats,
    genesisNodes: genesisNodes.map(addr => addr.toString()),
    deposits,
    summary,
  };

  const filename = `genesis-deposits-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
  console.log(`\n✓ 数据已导出到 ${filename}`);

  // 6. 打印摘要
  console.log("\n========== 入金摘要 ==========");
  console.log(`创世节点总数: ${genesisNodes.length}`);
  console.log(`找到入金记录: ${deposits.length} 笔`);
  console.log(`\n全局统计:`);
  console.log(`  申请创世节点: ${globalStats.applyGenesisTotal} 笔, 共 ${globalStats.applyGenesisAmount} USDT`);
  console.log(`  质押: ${globalStats.stakeTotal} 笔, 共 ${globalStats.stakeAmount} USDT`);
  if (globalStats.unknownTotal > 0) {
    console.log(`  未知类型: ${globalStats.unknownTotal} 笔, 共 ${globalStats.unknownAmount} USDT`);
  }
  console.log("\n各节点入金详情:");

  for (const nodeAddress of genesisNodes) {
    const nodeSummary = summary[nodeAddress.toLowerCase()];
    if (nodeSummary) {
      const details: string[] = [];
      if (nodeSummary.applyGenesisCount > 0) {
        details.push(`申请创世: ${nodeSummary.applyGenesisAmount} USDT (${nodeSummary.applyGenesisCount}笔)`);
      }
      if (nodeSummary.stakeCount > 0) {
        details.push(`质押: ${nodeSummary.stakeAmount} USDT (${nodeSummary.stakeCount}笔)`);
      }
      if (nodeSummary.unknownCount > 0) {
        details.push(`未知: ${nodeSummary.unknownAmount} USDT (${nodeSummary.unknownCount}笔)`);
      }
      console.log(`  ${nodeAddress}: 总计 ${nodeSummary.totalAmount} USDT | ${details.join(" | ")}`);
    } else {
      console.log(`  ${nodeAddress}: 无入金记录 (迁移/管理员设置)`);
    }
  }

  // 7. 单独输出有申请创世节点费用的节点
  console.log("\n========== 有创世节点费用的节点 ==========");
  const nodesWithGenesisFee: { address: string; amount: string }[] = [];
  
  for (const nodeAddress of genesisNodes) {
    const nodeSummary = summary[nodeAddress.toLowerCase()];
    if (nodeSummary && nodeSummary.applyGenesisCount > 0) {
      nodesWithGenesisFee.push({
        address: nodeAddress,
        amount: nodeSummary.applyGenesisAmount,
      });
    }
  }

  if (nodesWithGenesisFee.length === 0) {
    console.log("  无");
  } else {
    console.log(`共 ${nodesWithGenesisFee.length} 个节点有创世节点费用记录:\n`);
    console.log("  地址                                       | 创世节点费用");
    console.log("  " + "-".repeat(60));
    for (const node of nodesWithGenesisFee) {
      console.log(`  ${node.address} | ${node.amount} USDT`);
    }
    
    // 计算总费用
    const totalGenesisFee = nodesWithGenesisFee.reduce((sum, n) => sum + parseFloat(n.amount), 0);
    console.log("  " + "-".repeat(60));
    console.log(`  合计: ${nodesWithGenesisFee.length} 个节点, ${totalGenesisFee} USDT`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
