import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/vue'
import { bsc, sepolia } from 'viem/chains'
import { reconnect } from 'wagmi/actions'

const projectId = '8fad523df181cc16d6cfe41bf546b913' 

const metadata = {
  name: 'HashFi',
  description: 'HashFi Defi',
  url: 'https://hashfidefi.com',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

const chains = [bsc, sepolia] as const
export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
})

reconnect(wagmiConfig);

createWeb3Modal({
  wagmiConfig,
  projectId,
  enableAnalytics: true
})