import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { base, baseSepolia, mainnet } from '@reown/appkit/networks'

export const projectId =
  import.meta.env.VITE_REOWN_PROJECT_ID?.trim() || 'b9b6bd0309117a0175490cece6ffccd9'
const appUrl =
  import.meta.env.VITE_APP_URL?.trim() ||
  (typeof window !== 'undefined' ? window.location.origin : 'https://sub-share.xyz')

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
    description: 'Claude reimbursement vault for hackathon teams.',
    url: appUrl,
    icons: [],
  },
  features: {
    email: true,
    socials: ['google', 'discord', 'github'],
    emailShowWallets: true,
  },
})
