import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const HashFiModule = buildModule("HashFiModule", (m) => {
  // 部署参数
  const initialOwner = m.getParameter("initialOwner");
  const usdtAddress = m.getParameter("usdtAddress");

  // 如果没有提供 USDT 地址，部署测试 USDT
  const usdt = m.contractAt("USDT", usdtAddress, {
    id: "USDT",
  });

  // 部署 HashFi 主合约
  const hashFi = m.contract("HashFi", [usdtAddress, initialOwner], {
    id: "HashFi",
  });

  return { hashFi, usdt };
});

export default HashFiModule;
