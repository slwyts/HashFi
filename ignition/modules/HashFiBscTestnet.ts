import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * BSC Testnet 部署脚本
 * 部署顺序：HashFi -> HAFToken -> setHafToken
 * PancakeSwap 地址使用默认测试网地址（传0）
 */
const HashFiBscTestnetModule = buildModule("HashFiBscTestnetModule", (m) => {
  // BSC Testnet 上已部署的 USDT 地址
  const usdtAddress = "0x9c1A27a6E140973eAA6e5b63dBc04E1177B431E7";
  
  // 合约 owner 地址
  const initialOwner = m.getParameter("initialOwner", "0x40e9046a0d8fea5691221279a3b9f4ec3d34a55b");
  
  // PancakeSwap 地址：传0使用BSC测试网默认地址
  const pancakeFactory = "0x0000000000000000000000000000000000000000";
  const pancakeRouter = "0x0000000000000000000000000000000000000000";

  // 1. 部署 HashFi（不含迁移数据）
  const hashFi = m.contract("HashFi", [usdtAddress, initialOwner, [], [], []], {
    id: "HashFi",
  });

  // 2. 部署 HAFToken（传入 HashFi 地址）
  const hafToken = m.contract("HAFToken", [usdtAddress, hashFi, pancakeFactory, pancakeRouter], {
    id: "HAFToken",
  });

  // 3. 绑定 HAFToken 到 HashFi
  m.call(hashFi, "setHafToken", [hafToken], { id: "setHafToken" });

  return { hashFi, hafToken };
});

export default HashFiBscTestnetModule;
