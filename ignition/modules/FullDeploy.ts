import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * 完整部署脚本：先部署 USDT，再部署 HashFi
 * 用于本地测试和开发环境
 */
const FullDeployModule = buildModule("FullDeployModule", (m) => {
  // 获取部署者地址作为初始 owner
  const initialOwner = m.getAccount(0);

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
