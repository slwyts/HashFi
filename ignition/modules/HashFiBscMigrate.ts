import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import fs from "fs";
import path from "path";

/**
 * BSC Mainnet 部署脚本（支持数据迁移）
 * 使用方式: npm run deploy:bsc:migrate
 *
 * 通过环境变量 MIGRATION_FILE 指定迁移数据文件，默认使用 migration-data-latest.json
 * 
 * 部署顺序：HashFi -> HAFToken -> setHafToken
 */

// 读取迁移数据
function loadMigrationData() {
  const migrationFile = process.env.MIGRATION_FILE || "migration-data-latest.json";
  const filePath = path.resolve(process.cwd(), migrationFile);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ 迁移数据文件不存在: ${migrationFile}，将部署空合约`);
    return {
      users: [] as string[],
      referrers: [] as string[],
      genesisNodes: [] as string[],
      stakeUsers: [] as string[],
      stakeAmounts: [] as string[],
    };
  }

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const jsonData = JSON.parse(fileContent);

  const data = {
    users: (jsonData.users || []) as string[],
    referrers: (jsonData.referrers || []) as string[],
    genesisNodes: (jsonData.genesisNodes || jsonData.activeGenesisNodesList || []) as string[],
    stakeUsers: (jsonData.stakeUsers || []) as string[],
    stakeAmounts: (jsonData.stakeAmounts || []) as string[],
  };

  console.log(`\n📦 迁移数据加载成功 (${migrationFile}):`);
  console.log(`   - 用户数量: ${data.users.length}`);
  console.log(`   - 推荐人数量: ${data.referrers.length}`);
  console.log(`   - 创世节点: ${data.genesisNodes.length}`);
  console.log(`   - 迁移质押用户: ${data.stakeUsers.length}`);
  console.log(`   - 迁移质押金额: ${data.stakeAmounts.length}`);

  return data;
}

// 加载迁移数据
const migrationData = loadMigrationData();

const HashFiBscMigrateModule = buildModule("HashFiBscMigrateModule", (m) => {
  // BSC Mainnet 上的 USDT (BSC-USD) 地址
  // 真实 USDT: 0x55d398326f99059ff775485246999027b3197955
  const usdtAddress = m.getParameter(
    "usdtAddress",
    "0x55d398326f99059ff775485246999027b3197955"
  );

  // 合约 owner 地址
  const initialOwner = m.getParameter(
    "initialOwner",
    "0x40E9046a0D8fEA5691221279A3B9f4ec3D34A55B"
  );

  // PancakeSwap 地址：传0使用BSC主网默认地址
  const pancakeFactory = m.getParameter(
    "pancakeFactory",
    "0x0000000000000000000000000000000000000000"
  );
  const pancakeRouter = m.getParameter(
    "pancakeRouter",
    "0x0000000000000000000000000000000000000000"
  );

  // 迁移数据参数（从文件加载的默认值）
  const users = m.getParameter("users", migrationData.users);
  const referrers = m.getParameter("referrers", migrationData.referrers);
  const genesisNodes = m.getParameter("genesisNodes", migrationData.genesisNodes);
  const stakeUsers = m.getParameter("stakeUsers", migrationData.stakeUsers);
  const stakeAmounts = m.getParameter("stakeAmounts", migrationData.stakeAmounts);

  // 1. 部署 HashFi（含迁移数据）
  const hashFi = m.contract(
    "HashFi",
    [usdtAddress, initialOwner, users, referrers, genesisNodes, stakeUsers, stakeAmounts],
    {
      id: "HashFi",
    }
  );

  // 2. 部署 HAFToken（传入 HashFi 地址）
  const hafToken = m.contract(
    "HAFToken",
    [usdtAddress, hashFi, pancakeFactory, pancakeRouter],
    {
      id: "HAFToken",
    }
  );

  // 3. 绑定 HAFToken 到 HashFi
  m.call(hashFi, "setHafToken", [hafToken], { id: "setHafToken" });

  return { hashFi, hafToken };
});

export default HashFiBscMigrateModule;
