import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { base, baseSepolia, mainnet } from '@reown/appkit/networks'

export const projectId = 'b9b6bd0309117a0175490cece6ffccd9'

// baseSepolia first = default network for testing
const networks = [baseSepolia, base, mainnet]

const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
})

export const wagmiConfig = wagmiAdapter.wagmiConfig

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  defaultNetwork: baseSepolia,
  projectId,
  metadata: {
    name: 'Sub-Share',
    description: 'Split subscriptions trustlessly.',
    url: 'https://sub-share.xyz',
    icons: [],
  },
  features: {
    email: true,
    socials: ['google', 'discord', 'github'],
    emailShowWallets: true,
  },
})
