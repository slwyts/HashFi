/**
 * 导出旧合约数据用于迁移
 * 使用方式: npm run export:data
 */

import { createPublicClient, http, getContract, type Address } from "viem";
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
  }

  console.log(`\n共 ${allUsers.length} 个用户`);

  // 2. 获取创世节点
  const genesisNodes = await contract.read.getAllGenesisNodes();
  const activeGenesisNodes = await contract.read.getActiveGenesisNodes();
  console.log(`创世节点: ${genesisNodes.length} 个 (活跃: ${activeGenesisNodes.length} 个)`);
  if (genesisNodes.length > 0) {
    console.log("创世节点列表:", genesisNodes);
  }

  // 3. 构建导出数据
  const users = allUsers;
  const referrers = allUsers.map((u) => referrerMap.get(u.toLowerCase())!);

  const exportData = {
    exportTime: new Date().toISOString(),
    contractAddress,
    totalUsers: users.length,
    totalGenesisNodes: genesisNodes.length,
    activeGenesisNodes: activeGenesisNodes.length,
    users,
    referrers,
    genesisNodes: Array.from(genesisNodes),
    activeGenesisNodesList: Array.from(activeGenesisNodes),
  };

  // 4. 导出到文件
  const filename = `migration-data-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
  console.log(`\n✓ 数据已导出到 ${filename}`);

  // 5. 打印摘要
  console.log("\n========== 导出摘要 ==========");
  console.log(`用户总数: ${users.length}`);
  console.log(`创世节点: ${genesisNodes.length} (活跃: ${activeGenesisNodes.length})`);
  console.log(`导出文件: ${filename}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
