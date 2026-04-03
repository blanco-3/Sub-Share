import { useState, useCallback, useEffect } from 'react'
import { useReadContract, usePublicClient, useConnectorClient } from 'wagmi'
import { parseUnits, decodeEventLog, createWalletClient, custom } from 'viem'
import { baseSepolia } from 'viem/chains'
import { transformForOnchain } from '@reclaimprotocol/js-sdk'
import {
  USDC_ADDRESS,
  USDC_ABI,
  VAULT_ABI,
  FACTORY_ABI,
  FACTORY_ADDRESS,
  RECLAIM_VERIFIER_ADDRESS,
  CHAIN_ID,
} from './contracts.js'

const RECLAIM_PROVIDER_ID = import.meta.env.VITE_RECLAIM_PROVIDER_ID?.trim()
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/

// ─── Patch Reown's CAIP-2 eth_chainId bug ─────────────────────────────────────
// Reown AppKit returns "eip155:84532" from eth_chainId instead of "0x14a34".
// viem's sendTransaction calls hexToBigInt(chainId) → SyntaxError.
// Fix: intercept eth_chainId and return proper hex string.
function makeFixedClient(connectorClient) {
  if (!connectorClient) return null
  return createWalletClient({
    account: connectorClient.account,
    chain: baseSepolia,
    transport: custom({
      request: async ({ method, params }) => {
        if (method === 'eth_chainId') return '0x' + CHAIN_ID.toString(16)
        return connectorClient.request({ method, params })
      },
    }),
  })
}

function normalizeProofForContract(proofLike) {
  const proof = Array.isArray(proofLike) ? proofLike[0] : proofLike
  if (!proof || typeof proof === 'string') {
    throw new Error('No Reclaim proof was returned')
  }

  if (proof.claimInfo && proof.signedClaim && !proof.claimData) {
    return proof
  }

  if (!proof.claimData) {
    throw new Error('Unexpected Reclaim proof shape')
  }

  return transformForOnchain(proof)
}

function getReadableError(error, fallback = 'Transaction failed') {
  return (
    error?.cause?.reason ||
    error?.cause?.data?.errorName ||
    error?.shortMessage ||
    error?.details ||
    error?.message ||
    fallback
  )
}

// ─── Create vault via Factory ─────────────────────────────────────────────────
export function useDeployVault() {
  const [isDeploying, setIsDeploying] = useState(false)
  const { data: connectorClient } = useConnectorClient({ chainId: CHAIN_ID })
  const publicClient = usePublicClient({ chainId: CHAIN_ID })

  const deploy = useCallback(async ({ name, monthlyPriceUSD, nMembers, duration }) => {
    setIsDeploying(true)
    try {
      const wc = makeFixedClient(connectorClient)
      if (!wc) throw new Error('Wallet not connected')
      if (!FACTORY_ADDRESS || !ADDRESS_RE.test(FACTORY_ADDRESS)) {
        throw new Error('Missing VITE_FACTORY_ADDRESS')
      }
      if (!RECLAIM_PROVIDER_ID) throw new Error('Missing VITE_RECLAIM_PROVIDER_ID')

      const monthlyPriceUsdc = parseUnits(String(monthlyPriceUSD), 6)

      const hash = await wc.writeContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'createVault',
        args: [
          USDC_ADDRESS,
          name,
          monthlyPriceUsdc,
          BigInt(nMembers),
          BigInt(duration),
          RECLAIM_VERIFIER_ADDRESS,
          RECLAIM_PROVIDER_ID,
        ],
        chain: baseSepolia,
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      // Extract vault address from VaultCreated event
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({ abi: FACTORY_ABI, ...log })
          if (decoded.eventName === 'VaultCreated') {
            return { vault: decoded.args.vault, txHash: hash }
          }
        } catch {}
      }
      throw new Error('VaultCreated event not found in receipt')
    } catch (error) {
      throw new Error(getReadableError(error, 'Create vault failed'))
    } finally {
      setIsDeploying(false)
    }
  }, [connectorClient, publicClient])

  return { deploy, isDeploying }
}

// ─── Approve USDC + Deposit ───────────────────────────────────────────────────
export function useVaultDeposit(vaultAddress) {
  const [step, setStep] = useState('idle') // idle | approving | depositing | done | error
  const { data: connectorClient } = useConnectorClient({ chainId: CHAIN_ID })
  const publicClient = usePublicClient({ chainId: CHAIN_ID })

  const deposit = useCallback(async (depositAmountUsdc) => {
    try {
      const wc = makeFixedClient(connectorClient)
      if (!wc) throw new Error('Wallet not connected')

      setStep('approving')
      const approveTx = await wc.writeContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [vaultAddress, depositAmountUsdc],
        chain: baseSepolia,
      })
      await publicClient.waitForTransactionReceipt({ hash: approveTx })

      setStep('depositing')
      const depositTx = await wc.writeContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'deposit',
        chain: baseSepolia,
      })
      await publicClient.waitForTransactionReceipt({ hash: depositTx })

      setStep('done')
      return depositTx
    } catch (e) {
      setStep('error')
      throw new Error(getReadableError(e, 'Deposit failed'))
    }
  }, [vaultAddress, connectorClient, publicClient])

  const reset = () => setStep('idle')
  return { deposit, step, reset }
}

// ─── Check if account is deployed (not counterfactual) ───────────────────────
export function useIsAccountDeployed(address) {
  const publicClient = usePublicClient({ chainId: CHAIN_ID })
  const [deployed, setDeployed] = useState(null) // null=loading, true/false

  useEffect(() => {
    if (!address || !publicClient) { setDeployed(null); return }
    publicClient.getCode({ address }).then(code => {
      setDeployed(code && code !== '0x')
    }).catch(() => setDeployed(null))
  }, [address, publicClient])

  return deployed
}

// ─── Join vault ───────────────────────────────────────────────────────────────
export function useVaultJoin(vaultAddress, userAddress) {
  const [isJoining, setIsJoining] = useState(false)
  const { data: connectorClient } = useConnectorClient({ chainId: CHAIN_ID })
  const publicClient = usePublicClient({ chainId: CHAIN_ID })

  const join = useCallback(async () => {
    if (!vaultAddress) return
    setIsJoining(true)
    try {
      // 1. Simulate to catch contract-level reverts (vault full, already active, etc.)
      try {
        await publicClient.simulateContract({
          address: vaultAddress,
          abi: VAULT_ABI,
          functionName: 'join',
          // no account param — avoids CAIP-10 format issues with Reown
        })
      } catch (simErr) {
        throw new Error(getReadableError(simErr, 'Join simulation failed'))
      }

      // 2. Simulation passed → send actual tx via patched client
      const wc = makeFixedClient(connectorClient)
      if (!wc) throw new Error('Wallet not connected')

      const tx = await wc.writeContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'join',
        chain: baseSepolia,
      })
      await publicClient.waitForTransactionReceipt({ hash: tx })
      return tx
    } catch (error) {
      throw new Error(getReadableError(error, 'Join failed'))
    } finally {
      setIsJoining(false)
    }
  }, [vaultAddress, userAddress, connectorClient, publicClient])

  return { join, isJoining }
}

// ─── Approve monthly payment (any member votes; auto-releases at n-of-n) ──────
export function useVaultApprove(vaultAddress) {
  const [isApproving, setIsApproving] = useState(false)
  const { data: connectorClient } = useConnectorClient({ chainId: CHAIN_ID })
  const publicClient = usePublicClient({ chainId: CHAIN_ID })

  const approve = useCallback(async (month) => {
    if (!vaultAddress) return
    setIsApproving(true)
    try {
      const wc = makeFixedClient(connectorClient)
      if (!wc) throw new Error('Wallet not connected')

      const tx = await wc.writeContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'approvePayment',
        args: [BigInt(month)],
        chain: baseSepolia,
      })
      await publicClient.waitForTransactionReceipt({ hash: tx })
      return tx
    } catch (error) {
      throw new Error(getReadableError(error, 'Approve failed'))
    } finally {
      setIsApproving(false)
    }
  }, [vaultAddress, connectorClient, publicClient])

  // Grace period fallback: creator claims with (n-1) votes after 7 days
  const claimAfterGrace = useCallback(async (month) => {
    if (!vaultAddress) return
    setIsApproving(true)
    try {
      const wc = makeFixedClient(connectorClient)
      if (!wc) throw new Error('Wallet not connected')

      const tx = await wc.writeContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'claimAfterGrace',
        args: [BigInt(month)],
        chain: baseSepolia,
      })
      await publicClient.waitForTransactionReceipt({ hash: tx })
      return tx
    } catch (error) {
      throw new Error(getReadableError(error, 'Claim after grace failed'))
    } finally {
      setIsApproving(false)
    }
  }, [vaultAddress, connectorClient, publicClient])

  return { approve, claimAfterGrace, isApproving }
}

// ─── Claim via Reclaim ZK proof (creator fast-path) ──────────────────────────
export function useVaultClaimWithProof(vaultAddress) {
  const [isClaiming, setIsClaiming] = useState(false)
  const { data: connectorClient } = useConnectorClient({ chainId: CHAIN_ID })
  const publicClient = usePublicClient({ chainId: CHAIN_ID })

  const claimWithProof = useCallback(async (month, proof) => {
    if (!vaultAddress) return
    setIsClaiming(true)
    try {
      const wc = makeFixedClient(connectorClient)
      if (!wc) throw new Error('Wallet not connected')

      const onchainProof = normalizeProofForContract(proof)

      const tx = await wc.writeContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'claimWithProof',
        args: [onchainProof, BigInt(month)],
        chain: baseSepolia,
      })
      await publicClient.waitForTransactionReceipt({ hash: tx })
      return tx
    } catch (error) {
      throw new Error(getReadableError(error, 'Proof claim failed'))
    } finally {
      setIsClaiming(false)
    }
  }, [vaultAddress, connectorClient, publicClient])

  return { claimWithProof, isClaiming }
}

// ─── Read vault info ──────────────────────────────────────────────────────────
export function useVaultInfo(vaultAddress) {
  const enabled = !!(vaultAddress && vaultAddress.match(/^0x[0-9a-fA-F]{40}$/))

  const { data, isLoading, refetch } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'getInfo',
    chainId: CHAIN_ID,
    query: { enabled, refetchInterval: 5000 },
  })

  if (!data) return { info: null, isLoading, refetch }

  const [name, monthlyPrice, nMembers, duration, depositPerPerson,
         isActive, depositedCount, monthsClaimed, creator, balance] = data

  return {
    info: {
      name,
      monthlyPrice,
      nMembers:      Number(nMembers),
      duration:      Number(duration),
      depositPerPerson,
      isActive,
      depositedCount: Number(depositedCount),
      monthsClaimed:  Number(monthsClaimed),
      creator,
      balance,
    },
    isLoading,
    refetch,
  }
}

// ─── Read month voting status ─────────────────────────────────────────────────
export function useMonthStatus(vaultAddress, month, userAddress) {
  const enabled = !!(vaultAddress && month >= 1)

  const { data, refetch } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'getMonthStatus',
    args: [BigInt(month || 1)],
    account: userAddress, // caller-dependent view (callerHasApproved)
    chainId: CHAIN_ID,
    query: { enabled, refetchInterval: 5000 },
  })

  if (!data) return { claimed: false, approvals: 0, callerHasApproved: false, graceAvailableAt: 0n, refetch }
  const [claimed, approvals, callerHasApproved, graceAvailableAt] = data
  return { claimed, approvals: Number(approvals), callerHasApproved, graceAvailableAt, refetch }
}

export function useVaultUnlockInfo(vaultAddress, month) {
  const enabled = !!(vaultAddress && month >= 1)

  const { data: unlockedMonthRaw } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'getCurrentUnlockedMonth',
    chainId: CHAIN_ID,
    query: { enabled, refetchInterval: 5000 },
  })

  const { data: unlockTimeRaw } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'getMonthUnlockTime',
    args: [BigInt(month || 1)],
    chainId: CHAIN_ID,
    query: { enabled, refetchInterval: 5000 },
  })

  return {
    unlockedMonth: unlockedMonthRaw ? Number(unlockedMonthRaw) : 0,
    unlockTime: unlockTimeRaw ?? 0n,
  }
}

export const fmtUsdc = (bigint) =>
  bigint !== undefined ? `$${(Number(bigint) / 1e6).toFixed(2)}` : '$0.00'

// ─── My Vaults: fetch all vaults from factory, filter by membership ───────────
export function useMyVaults(userAddress) {
  const publicClient = usePublicClient({ chainId: CHAIN_ID })
  const [vaults, setVaults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const hasFactoryAddress = !!(FACTORY_ADDRESS && ADDRESS_RE.test(FACTORY_ADDRESS))

  // total vault count
  const { data: totalRaw } = useReadContract({
    address: hasFactoryAddress ? FACTORY_ADDRESS : undefined,
    abi: FACTORY_ABI,
    functionName: 'totalVaults',
    chainId: CHAIN_ID,
    query: { enabled: !!userAddress && hasFactoryAddress, refetchInterval: 10000 },
  })
  const total = totalRaw ? Number(totalRaw) : 0

  const refresh = useCallback(async () => {
    if (!userAddress || !publicClient || !hasFactoryAddress || total === 0) { setVaults([]); return }
    setIsLoading(true)
    try {
      // Multicall: fetch all vault addresses
      const addrCalls = Array.from({ length: total }, (_, i) => ({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'allVaults',
        args: [BigInt(i)],
      }))
      const addrResults = await publicClient.multicall({ contracts: addrCalls, allowFailure: true })
      const addresses = addrResults.map(r => r.result).filter(Boolean)

      // Multicall: getInfo + isMember for each vault
      const infoCalls = addresses.flatMap(addr => [
        { address: addr, abi: VAULT_ABI, functionName: 'getInfo' },
        { address: addr, abi: VAULT_ABI, functionName: 'isMember', args: [userAddress] },
      ])
      const infoResults = await publicClient.multicall({ contracts: infoCalls, allowFailure: true })

      const mine = []
      for (let i = 0; i < addresses.length; i++) {
        const infoRaw = infoResults[i * 2]?.result
        const isMember = infoResults[i * 2 + 1]?.result
        if (!infoRaw || !isMember) continue
        const [name, monthlyPrice, nMembers, duration, depositPerPerson,
               isActive, depositedCount, monthsClaimed, creator, balance] = infoRaw
        mine.push({
          addr: addresses[i],
          name, monthlyPrice, nMembers: Number(nMembers), duration: Number(duration),
          depositPerPerson, isActive, depositedCount: Number(depositedCount),
          monthsClaimed: Number(monthsClaimed), creator, balance,
          isCreator: creator?.toLowerCase() === userAddress?.toLowerCase(),
        })
      }
      setVaults(mine)
    } catch (e) {
      console.error('useMyVaults error:', e)
    } finally {
      setIsLoading(false)
    }
  }, [userAddress, publicClient, hasFactoryAddress, total])

  // auto-refresh when total changes
  useEffect(() => { refresh() }, [refresh])

  return { vaults, isLoading, refresh }
}
