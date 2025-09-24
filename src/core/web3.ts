import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/vue'
import { bsc, mainnet } from 'viem/chains' // 引入BSC链

const projectId = '8fad523df181cc16d6cfe41bf546b913' 

const metadata = {
  name: 'HashFi',
  description: 'HashFi Defi',
  url: 'https://hashfidefi.com',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

const chains = [bsc, mainnet] as const
export const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
})

createWeb3Modal({
  wagmiConfig: config,
  projectId,
  enableAnalytics: true
})