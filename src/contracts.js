import SubShareVaultABI    from './abi/SubShareVault.json'
import SubShareFactoryABI  from './abi/SubShareFactory.json'

// Base Sepolia
export const CHAIN_ID = 84532

// Base Sepolia USDC
export const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'

// Reclaim verifier on Base Sepolia
export const RECLAIM_VERIFIER_ADDRESS = '0xF90085f5Fd1a3bEb8678623409b3811eCeC5f6A5'

// SubShareFactory must point to the latest deployment that knows about Reclaim.
export const FACTORY_ADDRESS = import.meta.env.VITE_FACTORY_ADDRESS?.trim()

export const USDC_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount',  type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner',   type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
]

export const VAULT_ABI    = SubShareVaultABI
export const FACTORY_ABI  = SubShareFactoryABI
