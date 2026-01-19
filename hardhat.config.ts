import type { HardhatUserConfig } from "hardhat/config";

import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable } from "hardhat/config";
import dotenv from "dotenv";

dotenv.config({ path: ".env.hardhat" });

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.33",
        settings: {
          optimizer: {
            enabled: true,
            runs: 800,
          },
          viaIR: true,
          metadata: {
            bytecodeHash: "none",
          },
        },
      },
      production: {
        version: "0.8.33",
        settings: {
          optimizer: {
            enabled: true,
            runs: 800,
          },
          viaIR: true,
          metadata: {
            bytecodeHash: "none",
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    localhost: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545",
    },
    bscTestnet: {
      type: "http",
      chainType: "l1",
      url: configVariable("BSC_TESTNET_RPC_URL"),
      accounts: [configVariable("BSC_TESTNET_PRIVATE_KEY")],
      chainId: 97,
    },
    bscMainnet: {
      type: "http",
      chainType: "l1",
      url: configVariable("BSC_MAINNET_RPC_URL"),
      accounts: [configVariable("BSC_TESTNET_PRIVATE_KEY")], // 复用测试网私钥
      chainId: 56,
      gas: 20000000, // 2000万 Gas
    },
  },
};

export default config;
