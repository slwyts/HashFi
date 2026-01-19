import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * 本地完整部署脚本
 * 部署顺序：
 * 1. Mock USDT
 * 2. Mock WETH
 * 3. Mock Uniswap Factory
 * 4. Mock Uniswap Router
 * 5. HashFi
 * 6. HAFToken
 * 7. setHafToken 绑定
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

  // 5. 部署 HashFi（不含迁移数据）
  const hashfi = m.contract("HashFi", [usdt, deployer, [], [], [], [], []], { id: "HashFi" });

  // 6. 部署 HAFToken（传入 HashFi 地址）
  const hafToken = m.contract("HAFToken", [usdt, hashfi, factory, router], { id: "HAFToken" });

  // 7. 绑定 HAFToken 到 HashFi
  m.call(hashfi, "setHafToken", [hafToken], { id: "setHafToken" });

  return { usdt, weth, factory, router, hashfi, hafToken };
});

export default LocalDeployModule;
