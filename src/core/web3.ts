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
  [bsc.id]: http(import.meta.env.VITE_BSC_MAINNET_RPC_URL || 'https://bsc-dataseed1.binance.org'),
  [bscTestnet.id]: http(import.meta.env.VITE_BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545'),
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
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    '20459438007b75f4f4acb98bf29aa3b800550309646d375da5fd4aac6c2a2c66', // TokenPocket
    '163d2cf19babf05eb8962e9748f9ebe613ed52ebf9c8107c9a0f104bfcf161b3', // Bitget Wallet
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow
  ],
})