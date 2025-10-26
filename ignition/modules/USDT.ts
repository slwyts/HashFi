import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * 部署测试 USDT 代币
 * 用于开发和测试环境
 */
const USDTModule = buildModule("USDTModule", (m) => {
  const usdt = m.contract("USDT", [], {
    id: "USDT",
  });

  return { usdt };
});

export default USDTModule;
