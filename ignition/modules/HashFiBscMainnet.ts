import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * BSC Mainnet 部署脚本
 * 只部署 HashFi 合约，使用已存在的 USDT 地址
 * PancakeSwap 地址使用默认主网地址（传0）
 */
const HashFiBscMainnetModule = buildModule("HashFiBscMainnetModule", (m) => {
  // BSC Mainnet 上的 USDT (BSC-USD) 地址
  const usdtAddress = "0x91be819583bB301509c9aA3640DcE1F1CC03A49C";

  // 合约 owner 地址
  const initialOwner = m.getParameter("initialOwner", "0xA4b76D7Cae384C9a5fD5f573Cef74BFdB980E966");

  // PancakeSwap 地址：传0使用BSC主网默认地址
  const pancakeFactory = "0x0000000000000000000000000000000000000000";
  const pancakeRouter = "0x0000000000000000000000000000000000000000";

  // 部署 HashFi 主合约（会自动部署 HAFToken 并创建 LP 池）
  const hashFi = m.contract("HashFi", [usdtAddress, initialOwner, pancakeFactory, pancakeRouter], {
    id: "HashFi",
  });

  return { hashFi };
});

export default HashFiBscMainnetModule;
