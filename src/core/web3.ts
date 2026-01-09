import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/vue'
import { bsc , bscTestnet} from 'viem/chains'
import { reconnect } from 'wagmi/actions'
import { http } from 'viem'
import { defineChain } from 'viem'

// 自定义 Hardhat 本地链配置
const hardhatLocal = defineChain({
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
  },
})

const projectId = '8fad523df181cc16d6cfe41bf546b913' 

const metadata = {
  name: 'HashFi',
  description: 'HashFi Defi',
  url: 'https://hashfidefi.com',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

// 根据环境选择链
const appMode = import.meta.env.VITE_APP_MODE
let chains: any

if (appMode === 'localnet') {
  // 本地开发环境：包含本地链和 BSC 主网
  chains = [hardhatLocal] as const
} else if (appMode === 'development') {
  // 开发环境：仅 BSC testnet
  chains = [bscTestnet] as const
} else {
  // 生产环境：仅 BSC 主网
  chains = [bsc] as const
}

// 配置 RPC URLs（支持未连接钱包时读取数据）
const transports = {
  [bsc.id]: http(import.meta.env.VITE_BSC_MAINNET_RPC_URL || 'https://bsc-dataseed.binance.org/'),
  [bscTestnet.id]: http(import.meta.env.VITE_BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/'),
  [hardhatLocal.id]: http(import.meta.env.VITE_LOCAL_RPC_URL || 'http://127.0.0.1:8545'),
}

export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  transports,
  enableWalletConnect: false,
  enableInjected: true,
  enableCoinbase: true, 
  ssr: false,
})

const initReconnect = async () => {
  try {
    await reconnect(wagmiConfig);
  } catch (error) {
    console.warn('Reconnect failed:', error);
  }
};

// 延迟执行重连，确保钱包已初始化
if (typeof window !== 'undefined') {
  setTimeout(() => {
    initReconnect();
  }, 100);
}

// 根据环境选择默认链
let defaultChain: typeof bsc | typeof bscTestnet | typeof hardhatLocal
if (appMode === 'localnet') {
  defaultChain = hardhatLocal as any
} else if (appMode === 'development') {
  defaultChain = bscTestnet
} else {
  defaultChain = bsc
}

createWeb3Modal({
  wagmiConfig,
  projectId,
  enableAnalytics: false,
  defaultChain: defaultChain as any,
  enableOnramp: false,
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    '20459438007b75f4f4acb98bf29aa3b800550309646d375da5fd4aac6c2a2c66', // TokenPocket
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    '38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662', // Bitget Wallet
    '5d9f1395b3a8e848684848dc4147cbd05c8d54bb737eac78fe103901fe6b01a1', // OKX Wallet
  ],
})