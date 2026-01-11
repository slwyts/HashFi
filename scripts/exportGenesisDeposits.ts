/**
 * 导出创世节点入金记录
 * 通过 RPC 查询合约收到的 USDT Transfer 事件
 * 使用方式: npm run export:genesis
 */

import { createPublicClient, http, getContract, parseAbiItem, formatUnits, type Address } from "viem";
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
] as const;

// ERC20 Transfer 事件
const transferEventAbi = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

// BSC USDT 地址
const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955" as Address;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  }[] = [];

  // 每批查询区块数（付费RPC可用更大范围）
  const BLOCK_RANGE = 5000n;
  let fromBlock = startBlock;
  let totalQueries = 0;
  let consecutiveErrors = 0;

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
          deposits.push({
            address: log.args.from!,
            amount: formatUnits(amount, 18),
            amountWei: amount.toString(),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber.toString(),
          });
          console.log(`  发现: ${log.args.from} -> ${formatUnits(amount, 18)} USDT`);
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
  }> = {};

  for (const deposit of deposits) {
    const addr = deposit.address.toLowerCase();
    if (!summary[addr]) {
      summary[addr] = {
        totalDeposits: 0,
        totalAmount: "0",
        deposits: [],
      };
    }
    summary[addr].totalDeposits++;
    summary[addr].totalAmount = (
      parseFloat(summary[addr].totalAmount) + parseFloat(deposit.amount)
    ).toString();
    summary[addr].deposits.push(deposit);
  }

  // 5. 导出数据
  const exportData = {
    exportTime: new Date().toISOString(),
    contractAddress,
    usdtAddress: USDT_ADDRESS,
    startBlock: startBlock.toString(),
    endBlock: currentBlock.toString(),
    totalGenesisNodes: genesisNodes.length,
    totalDepositsFound: deposits.length,
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
  console.log("\n各节点入金详情:");

  for (const nodeAddress of genesisNodes) {
    const nodeSummary = summary[nodeAddress.toLowerCase()];
    if (nodeSummary) {
      console.log(`  ${nodeAddress}: ${nodeSummary.totalAmount} USDT (${nodeSummary.totalDeposits} 笔)`);
    } else {
      console.log(`  ${nodeAddress}: 无入金记录 (迁移/管理员设置)`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
