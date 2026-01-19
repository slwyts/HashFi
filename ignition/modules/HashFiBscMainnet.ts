import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * BSC Mainnet 部署脚本
 * 部署顺序：HashFi -> HAFToken -> setHafToken
 * PancakeSwap 地址使用默认主网地址（传0）
 */
const HashFiBscMainnetModule = buildModule("HashFiBscMainnetModule", (m) => {
  // BSC Mainnet 上的 USDT (BSC-USD) 地址
  // 实际地址 0x55d398326f99059ff775485246999027b3197955 目前暂时使用测试token地址进行部署测试
  const usdtAddress = "0x91be819583bB301509c9aA3640DcE1F1CC03A49C";

  // 合约 owner 地址, 默认为开发者地址
  // 项目方地址 0x40E9046a0D8fEA5691221279A3B9f4ec3D34A55B
  const initialOwner = m.getParameter("initialOwner", "0xA4b76D7Cae384C9a5fD5f573Cef74BFdB980E966");

  // PancakeSwap 地址：传0使用BSC主网默认地址
  const pancakeFactory = "0x0000000000000000000000000000000000000000";
  const pancakeRouter = "0x0000000000000000000000000000000000000000";

  // 1. 部署 HashFi（不含迁移数据）
  const hashFi = m.contract("HashFi", [usdtAddress, initialOwner, [], [], [], [], []], {
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

export default HashFiBscMainnetModule;
