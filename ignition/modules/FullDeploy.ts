import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * 完整部署脚本：先部署 USDT，再部署 HashFi
 * 用于本地测试和开发环境
 * 
 * 注意：本地环境需要先部署 PancakeSwap Factory，或者使用已有的 DEX
 */
const FullDeployModule = buildModule("FullDeployModule", (m) => {
  // 使用指定的 owner 地址
  const initialOwner = "0xA4b76D7Cae384C9a5fD5f573Cef74BFdB980E966";
  
  // PancakeSwap 地址（本地环境需要先部署或使用 mock）
  // BSC/tBSC 可以传 address(0)，会自动使用默认地址
  // 本地环境必须传入有效的工厂地址
  const pancakeFactory = m.getParameter("pancakeFactory", "0x0000000000000000000000000000000000000000");
  const pancakeRouter = m.getParameter("pancakeRouter", "0x0000000000000000000000000000000000000000");

  // 1. 部署测试 USDT
  const usdt = m.contract("USDT", [], {
    id: "USDT",
  });

  // 2. 部署 HashFi 主合约（会自动部署 HAFToken 并创建 LP 池）
  const hashFi = m.contract("HashFi", [usdt, initialOwner, pancakeFactory, pancakeRouter], {
    id: "HashFi",
  });

  return { usdt, hashFi };
});

export default FullDeployModule;
