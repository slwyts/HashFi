/**
 * TokenTest 部署模块
 * 用于测试 HAFToken 的完整部署：USDT + MockUniswap + HashFi
 */

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TokenTestModule = buildModule("TokenTestModule", (m) => {
  // 获取部署账户作为 owner
  const deployer = m.getAccount(0);

  // 1. 部署 Mock USDT
  const usdt = m.contract("USDT", [], { id: "USDT" });

  // 2. 部署 Mock WETH
  const weth = m.contract("MockWETH", [], { id: "WETH" });

  // 3. 部署 Mock Uniswap Factory
  const factory = m.contract("MockUniswapV2Factory", [deployer], { id: "Factory" });

  // 4. 部署 Mock Uniswap Router
  const router = m.contract("MockUniswapV2Router02", [factory, weth], { id: "Router" });

  // 5. 部署 HashFi (包含 HAFToken)
  const hashfi = m.contract("HashFi", [usdt, deployer, factory, router], { id: "HashFi" });

  return { usdt, weth, factory, router, hashfi };
});

export default TokenTestModule;
