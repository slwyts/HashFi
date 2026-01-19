/**
 * 导出旧合约数据用于迁移
 * 导出内容：用户推荐关系、创世节点、质押订单
 * 使用方式: npm run export:data
 * 
 * 导出文件可直接用于部署脚本: npm run deploy:bsc:migrate
 */

import { createPublicClient, http, getContract, formatUnits, type Address } from "viem";
import { bsc } from "viem/chains";
import fs from "fs";
import readline from "readline";

// HashFi 合约 ABI (只需要用到的部分)
const HashFiABI = [
  {
    inputs: [],
    name: "owner",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_user", type: "address" }],
    name: "getDirectReferrals",
    outputs: [
      {
        components: [
          { name: "memberAddress", type: "address" },
          { name: "teamLevel", type: "uint8" },
          { name: "totalStakedAmount", type: "uint256" },
          { name: "teamTotalPerformance", type: "uint256" },
        ],
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_user", type: "address" }],
    name: "getUserOrders",
    outputs: [
      {
        components: [
          { name: "id", type: "uint256" },
          { name: "user", type: "address" },
          { name: "level", type: "uint8" },
          { name: "amount", type: "uint256" },
          { name: "totalQuota", type: "uint256" },
          { name: "releasedQuota", type: "uint256" },
          { name: "totalQuotaHaf", type: "uint256" },
          { name: "releasedHaf", type: "uint256" },
          { name: "startTime", type: "uint256" },
          { name: "lastSettleTime", type: "uint256" },
          { name: "isCompleted", type: "bool" },
        ],
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllGenesisNodes",
    outputs: [{ type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getActiveGenesisNodes",
    outputs: [{ type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // 从 stdin 读取合约地址
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const contractAddress = await new Promise<string>((resolve) => {
    rl.question("请输入旧合约地址: ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    console.error("无效的合约地址");
    process.exit(1);
  }

  console.log(`\n连接合约: ${contractAddress}`);

  // 创建公共客户端
  const rpcUrl = process.env.BSC_MAINNET_RPC_URL || "https://bsc-dataseed1.binance.org";
  const publicClient = createPublicClient({
    chain: bsc,
    transport: http(rpcUrl),
  });

  const contract = getContract({
    address: contractAddress as Address,
    abi: HashFiABI,
    client: publicClient,
  });

  const owner = await contract.read.owner();
  console.log("Owner:", owner);

  // 1. 从 owner 开始 BFS 遍历整个推荐树
  const allUsers: Address[] = [];
  const referrerMap = new Map<string, Address>(); // user => referrer
  const visited = new Set<string>();
  const queue: Address[] = [owner];

  // Owner 的推荐人是 0x1
  referrerMap.set(owner.toLowerCase(), "0x0000000000000000000000000000000000000001");

  console.log("\n开始遍历推荐树...");

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLower = current.toLowerCase();

    if (visited.has(currentLower)) continue;
    visited.add(currentLower);
    allUsers.push(current);

    // 获取直推列表
    const directReferrals = await contract.read.getDirectReferrals([current]);

    if (directReferrals.length > 0) {
      console.log(`${current} -> ${directReferrals.length} 个直推`);
    }

    for (const member of directReferrals) {
      const addr = member.memberAddress;
      const addrLower = addr.toLowerCase();
      if (!visited.has(addrLower)) {
        queue.push(addr);
        referrerMap.set(addrLower, current);
      }
    }

    // 避免 rate limit
    await sleep(50);
  }

  console.log(`\n共 ${allUsers.length} 个用户`);

  // 2. 获取创世节点
  const genesisNodes = await contract.read.getAllGenesisNodes();
  const activeGenesisNodes = await contract.read.getActiveGenesisNodes();
  console.log(`创世节点: ${genesisNodes.length} 个 (活跃: ${activeGenesisNodes.length} 个)`);

  // 3. 获取所有用户的未完成质押订单
  console.log("\n获取质押订单数据...");
  const stakeUsers: string[] = [];
  const stakeAmounts: string[] = [];
  
  // 详细订单信息（用于调试和验证）
  const orderDetails: {
    user: string;
    orderId: number;
    level: number;
    amount: string;
    amountFormatted: string;
    isCompleted: boolean;
    releasedPercent: string;
  }[] = [];

  let totalActiveOrders = 0;
  let totalCompletedOrders = 0;

  for (let i = 0; i < allUsers.length; i++) {
    const user = allUsers[i];
    
    if ((i + 1) % 10 === 0) {
      console.log(`  进度: ${i + 1}/${allUsers.length} 用户`);
    }

    try {
      const userOrders = await contract.read.getUserOrders([user]);
      
      for (const order of userOrders) {
        const isCompleted = order.isCompleted;
        const amount = order.amount;
        const releasedPercent = order.totalQuotaHaf > 0n 
          ? ((order.releasedHaf * 100n) / order.totalQuotaHaf).toString() + "%"
          : "0%";

        orderDetails.push({
          user,
          orderId: Number(order.id),
          level: order.level,
          amount: amount.toString(),
          amountFormatted: formatUnits(amount, 18),
          isCompleted,
          releasedPercent,
        });

        if (isCompleted) {
          totalCompletedOrders++;
        } else {
          totalActiveOrders++;
          // 只迁移未完成的订单
          stakeUsers.push(user);
          stakeAmounts.push(amount.toString());
        }
      }

      await sleep(50); // 避免 rate limit
    } catch (error) {
      console.error(`  获取 ${user} 订单失败:`, error);
    }
  }

  console.log(`\n订单统计: 活跃 ${totalActiveOrders} 个, 已完成 ${totalCompletedOrders} 个`);

  // 4. 构建导出数据（与部署脚本格式一致）
  const users = allUsers;
  const referrers = allUsers.map((u) => referrerMap.get(u.toLowerCase())!);

  const exportData = {
    exportTime: new Date().toISOString(),
    contractAddress,
    
    // === 部署脚本需要的字段 ===
    users,
    referrers,
    genesisNodes: Array.from(activeGenesisNodes), // 使用活跃创世节点
    stakeUsers,      // 质押用户地址（只包含未完成订单）
    stakeAmounts,    // 质押金额（wei 单位）
    
    // === 统计信息 ===
    stats: {
      totalUsers: users.length,
      totalGenesisNodes: genesisNodes.length,
      activeGenesisNodes: activeGenesisNodes.length,
      totalActiveOrders,
      totalCompletedOrders,
      totalStakeAmount: stakeAmounts.reduce((sum, a) => sum + BigInt(a), 0n).toString(),
      totalStakeAmountFormatted: formatUnits(
        stakeAmounts.reduce((sum, a) => sum + BigInt(a), 0n),
        18
      ),
    },
    
    // === 详细数据（用于验证）===
    allGenesisNodes: Array.from(genesisNodes),
    orderDetails,
  };

  // 5. 导出到文件
  const filename = `migration-data-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
  
  // 同时更新 latest 文件
  fs.writeFileSync("migration-data-latest.json", JSON.stringify(exportData, null, 2));
  
  console.log(`\n✓ 数据已导出到 ${filename}`);
  console.log(`✓ 已更新 migration-data-latest.json`);

  // 6. 打印摘要
  console.log("\n========== 导出摘要 ==========");
  console.log(`用户总数: ${users.length}`);
  console.log(`推荐关系: ${referrers.length}`);
  console.log(`创世节点: ${genesisNodes.length} (活跃: ${activeGenesisNodes.length})`);
  console.log(`质押订单: ${totalActiveOrders} 个未完成, ${totalCompletedOrders} 个已完成`);
  console.log(`迁移质押: ${stakeUsers.length} 笔, 共 ${exportData.stats.totalStakeAmountFormatted} USDT`);
  console.log(`\n导出文件: ${filename}`);
  console.log(`\n🚀 可直接使用以下命令部署:`);
  console.log(`   npm run deploy:bsc:migrate`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
