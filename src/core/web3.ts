import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/vue'
import { bsc, bscTestnet } from 'viem/chains'
import { reconnect } from 'wagmi/actions'
import { http } from 'viem'

const projectId = '8fad523df181cc16d6cfe41bf546b913' 

const metadata = {
  name: 'HashFi',
  description: 'HashFi Defi',
  url: 'https://hashfidefi.com',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

const chains = [bsc, bscTestnet] as const

// 配置 RPC URLs（支持未连接钱包时读取数据）
const transports = {
  [bsc.id]: http(import.meta.env.VITE_BSC_MAINNET_RPC_URL || 'https://bsc-rpc.publicnode.com'),
  [bscTestnet.id]: http(import.meta.env.VITE_BSC_TESTNET_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com'),
}

export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  transports,
  enableWalletConnect: true, // 启用 WalletConnect
  enableInjected: true, // 启用注入式钱包（MetaMask 等）
  enableCoinbase: true, // 启用 Coinbase Wallet
})

reconnect(wagmiConfig);

createWeb3Modal({
  wagmiConfig,
  projectId,
  enableAnalytics: true,
  defaultChain: import.meta.env.VITE_CHAIN_ID === '97' ? bscTestnet : bsc,
  enableOnramp: false,
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    '20459438007b75f4f4acb98bf29aa3b800550309646d375da5fd4aac6c2a2c66', // TokenPocket
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    '38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662', // Bitget Wallet
    '5d9f1395b3a8e848684848dc4147cbd05c8d54bb737eac78fe103901fe6b01a1', // OKX Wallet
  ],
})