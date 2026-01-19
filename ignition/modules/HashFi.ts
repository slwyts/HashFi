import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * 通用 HashFi 部署脚本
 * 需要提供所有参数：USDT地址、owner地址、PancakeSwap地址
 */
const HashFiModule = buildModule("HashFiModule", (m) => {
  // 部署参数
  const initialOwner = m.getParameter("initialOwner");
  const usdtAddress = m.getParameter("usdtAddress");
  // PancakeSwap 地址（BSC/tBSC可传0使用默认值）
  const pancakeFactory = m.getParameter("pancakeFactory", "0x0000000000000000000000000000000000000000");
  const pancakeRouter = m.getParameter("pancakeRouter", "0x0000000000000000000000000000000000000000");

  // 如果没有提供 USDT 地址，部署测试 USDT
  const usdt = m.contractAt("USDT", usdtAddress, {
    id: "USDT",
  });

  // 部署 HashFi 主合约（会自动部署 HAFToken 并创建 LP 池）
  // 不迁移数据，传入空数组
  const hashFi = m.contract("HashFi", [usdtAddress, initialOwner, [], [], [], [], []], {
    id: "HashFi",
  });

  return { hashFi, usdt };
});

export default HashFiModule;
