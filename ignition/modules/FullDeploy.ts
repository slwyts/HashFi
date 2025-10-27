import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * 完整部署脚本：先部署 USDT，再部署 HashFi
 * 用于本地测试和开发环境
 */
const FullDeployModule = buildModule("FullDeployModule", (m) => {
  // 使用指定的 owner 地址
  const initialOwner = "0xA4b76D7Cae384C9a5fD5f573Cef74BFdB980E966";

  // 1. 部署测试 USDT
  const usdt = m.contract("USDT", [], {
    id: "USDT",
  });

  // 2. 部署 HashFi 主合约
  const hashFi = m.contract("HashFi", [usdt, initialOwner], {
    id: "HashFi",
  });

  return { usdt, hashFi };
});

export default FullDeployModule;
