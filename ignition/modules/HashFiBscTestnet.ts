import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * BSC Testnet 部署脚本
 * 只部署 HashFi 合约，使用已存在的 USDT 地址
 * PancakeSwap 地址使用默认测试网地址（传0）
 */
const HashFiBscTestnetModule = buildModule("HashFiBscTestnetModule", (m) => {
  // BSC Testnet 上已部署的 USDT 地址
  const usdtAddress = "0x9c1A27a6E140973eAA6e5b63dBc04E1177B431E7";
  
  // 合约 owner 地址
  const initialOwner = m.getParameter("initialOwner", "0x492d5B3022d48185a7ecDc1A97Dc414B939cF867");
  
  // PancakeSwap 地址：传0使用BSC测试网默认地址
  const pancakeFactory = "0x0000000000000000000000000000000000000000";
  const pancakeRouter = "0x0000000000000000000000000000000000000000";

  // 部署 HashFi 主合约（会自动部署 HAFToken 并创建 LP 池）
  const hashFi = m.contract("HashFi", [usdtAddress, initialOwner, pancakeFactory, pancakeRouter], {
    id: "HashFi",
  });

  return { hashFi };
});

export default HashFiBscTestnetModule;
