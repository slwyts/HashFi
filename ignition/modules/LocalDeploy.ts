import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * 本地完整部署脚本
 * 部署顺序：
 * 1. Mock USDT
 * 2. Mock WETH
 * 3. Mock Uniswap Factory
 * 4. Mock Uniswap Router
 * 5. HashFi (包含 HAFToken)
 */
const LocalDeployModule = buildModule("LocalDeployModule", (m) => {
  // 使用固定的 owner 地址
  const deployer = "0xA4b76D7Cae384C9a5fD5f573Cef74BFdB980E966";

  console.log("部署账户:", deployer);

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

export default LocalDeployModule;
