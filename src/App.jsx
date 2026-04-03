import { useState, useEffect } from "react";
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { useDisconnect, useChainId, useSwitchChain, useBalance, useSendTransaction } from 'wagmi'
import { parseUnits } from 'viem'
import { useDeployVault, useVaultDeposit, useVaultJoin, useVaultApprove, useVaultClaimWithProof, useMonthStatus, useVaultInfo, useMyVaults, useIsAccountDeployed, useVaultUnlockInfo } from './useVault.js'
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk'
import QRCode from 'react-qr-code'
import { CHAIN_ID } from './contracts.js'

// ─── i18n ───
const T = {
  en: {
    appName: "Sub-Share",
    tagline: "One teammate pays Claude first. The team pays them back safely.",
    taglineSub: "Made for hackathon teams sharing Claude. Everyone deposits first, so the person who paid does not have to chase others in Discord.",
    
    // Auth
    loginTitle: "Get Started",
    loginDesc: "No wallet needed.",
    socialGoogle: "Continue with Google",
    socialDiscord: "Continue with Discord",
    socialGithub: "Continue with GitHub",
    connectWallet: "Connect Wallet",
    orDivider: "or",
    poweredBy: "Powered by Reown AppKit · Account Abstraction",
    connected: "Connected",
    smartAccount: "Smart Account",
    
    // Nav
    createVault: "Create Claude Vault",
    joinVault: "Join Vault",
    back: "← back",
    home: "← home",
    next: "Next",
    
    // Onboard
    onboardTitle: "How it works",
    steps: [
      { icon: "01", title: "Make a Claude vault", desc: "Choose the Claude plan your team is sharing." },
      { icon: "02", title: "Invite your team", desc: "Send the link so teammates can join with social login or wallet." },
      { icon: "03", title: "Everyone deposits first", desc: "Each teammate puts in their share before money is paid back." },
      { icon: "04", title: "Pay back the person who paid", desc: "The person who paid Claude gets the monthly amount back after approvals or receipt proof." },
    ],
    keyFeature: "No more awkward reminders",
    keyFeatureDesc: "Instead of asking for money in chat, teammates put funds in first. The person who paid can only take back the exact monthly amount.",
    getStarted: "Start Claude Demo",
    
    // Create
    selectService: "What did one teammate already pay for?",
    selectServiceDesc: "This build is intentionally Claude-only. Pick the Claude plan your team will share.",
    perTeam: "/mo per team",
    serviceName: "Service name",
    monthlyPrice: "Monthly price (USD)",
    configVault: "Team setup",
    configDesc: "How many people, and for how long?",
    teamSize: "Team size",
    commitment: "Commitment",
    reviewTitle: "Confirm & deploy",
    reviewDesc: "Check the team size and monthly amount before deploying.",
    monthlyCost: "Monthly subscription",
    members: "Members",
    perPerson: "Per person / month",
    durationLabel: "Commitment",
    depositRequired: "Deposit per person",
    howSafe: "Why this is safer",
    howSafeDesc: "Everyone locks funds first. The person who paid can only take the fixed monthly amount, either through team approval or matching proof.",
    deployBtn: "Deploy Vault",
    deploying: "Deploying on-chain...",
    
    // Invite
    inviteTitle: "Invite your team",
    inviteDesc: "Share this link so teammates can lock their share before you ask for money back.",
    vaultLink: "Vault invite link",
    copied: "✓ Copied!",
    copyLink: "Copy Link",
    shareDiscord: "Discord",
    shareTelegram: "Telegram",
    shareSlack: "Slack",
    waiting: "Waiting for {n} more...",
    joined: "{n}/{t} joined",
    allJoined: "Everyone's here!",
    simJoin: "[Demo] Simulate all joined",
    proceed: "Continue to deposit",
    
    // Deposit
    depositTitle: "Lock your share",
    depositDesc: "Each teammate deposits before the person who paid Claude asks to be paid back.",
    yourShare: "Your deposit",
    depositBtn: "Deposit {a} USDC",
    depositing: "Confirming on-chain...",
    depositDone: "✓ Deposit confirmed",
    depositProgress: "Deposits",
    awaiting: "Pending",
    simDeposit: "[Demo] Simulate all deposits",
    vaultReady: "Vault is live!",
    goActive: "View active vault →",
    
    // Active
    balance: "Vault Balance",
    monthProgress: "Month {c} of {t}",
    collected: "Total locked",
    paid: "Paid out",
    remaining: "Remaining",
    schedule: "Payback history",
    noPayments: "No payback yet. After this month’s Claude bill is paid, the team can approve it or the payer can prove it with a receipt.",
    releaseBtn: "Approve month {n} payback",
    releasing: "Submitting approval...",
    paymentTo: "→ Sent back to the person who paid",
    approvedLabel: "{a}/{t} members approved",
    alreadyVoted: "✓ You voted this month",
    proveAndClaim: "Claim with Stripe receipt (zkTLS)",
    provingSubscription: "Starting receipt proof...",
    submittingProofClaim: "Submitting payback claim...",
    scanQr: "Scan with Reclaim app to prove the Stripe receipt",
    proofVerified: "✓ Proof verified on-chain",
    reimbursementGuide: "What happens each month",
    reimbursementDesc: "This vault does not pay Claude directly. One teammate pays first, then the vault sends that fixed amount back from the money the team already locked.",
    reimbursementStep1: "The team deposits first",
    reimbursementStep2: "One teammate pays the Claude bill",
    reimbursementStep3: "The vault pays them back after approval or receipt proof",
    reimbursementHint: "The receipt proof is just a faster way to get paid back.",
    unlockedNow: "Unlocked now",
    lockedUntil: "Locked until",
    claimHint: "Only the unlocked month can be claimed right now.",
    
    // Complete
    complete: "Vault schedule complete",
    completeDesc: "All planned monthly paybacks were completed.",
    newVault: "Create another vault",
    
    // Join
    joinTitle: "Join a vault",
    joinDesc: "Paste the vault address or invite link your team shared.",
    vaultAddr: "Vault link or address",
    joinBtn: "Join",
    
    // Status
    statusPending: "Pending",
    statusActive: "Active",
    statusComplete: "Complete",
    admin: "paid first",
    you: "You",
    mo: "mo",
    people: "people",
  },
  ko: {
    appName: "Sub-Share",
    tagline: "한 명이 먼저 결제한 Claude 비용을 팀이 안전하게 돌려줍니다.",
    taglineSub: "해커톤 팀이 Claude를 같이 쓸 때를 위한 앱입니다. 모두가 먼저 돈을 넣어두기 때문에, 먼저 결제한 사람이 디스코드에서 계속 독촉할 필요가 없습니다.",
    
    loginTitle: "시작하기",
    loginDesc: "지갑 없이 로그인 가능.",
    socialGoogle: "Google로 계속하기",
    socialDiscord: "Discord로 계속하기",
    socialGithub: "GitHub로 계속하기",
    connectWallet: "지갑 연결",
    orDivider: "또는",
    poweredBy: "Powered by Reown AppKit · 계정 추상화",
    connected: "연결됨",
    smartAccount: "스마트 계정",
    
    createVault: "Claude 볼트 만들기",
    joinVault: "볼트 참여하기",
    back: "← 이전",
    home: "← 홈",
    next: "다음",
    
    onboardTitle: "작동 방식",
    steps: [
      { icon: "01", title: "Claude 볼트 만들기", desc: "팀이 같이 쓸 Claude 요금제를 고릅니다." },
      { icon: "02", title: "팀원 초대", desc: "링크를 보내면 팀원이 소셜 로그인이나 지갑으로 참여할 수 있습니다." },
      { icon: "03", title: "모두 먼저 입금", desc: "나중에 돌려줄 돈을 팀원이 먼저 넣어둡니다." },
      { icon: "04", title: "먼저 결제한 사람에게 돌려주기", desc: "Claude를 결제한 사람은 승인이나 영수증 증명으로 월별 금액을 돌려받습니다." },
    ],
    keyFeature: "돈 보내달라고 계속 말할 필요가 없습니다",
    keyFeatureDesc: "팀원이 먼저 돈을 넣어두기 때문에, 먼저 결제한 사람은 정해진 월 금액만 안전하게 돌려받을 수 있습니다.",
    getStarted: "Claude 데모 시작",
    
    selectService: "누가 먼저 결제한 서비스인가요?",
    selectServiceDesc: "이번 빌드는 Claude 전용입니다. 팀이 같이 쓸 Claude 요금제를 고르세요.",
    perTeam: "/월 (팀 기준)",
    serviceName: "서비스 이름",
    monthlyPrice: "월 요금 (USD)",
    configVault: "팀 설정",
    configDesc: "몇 명이서, 얼마 동안 사용하나요?",
    teamSize: "팀 인원",
    commitment: "계약 기간",
    reviewTitle: "확인 및 배포",
    reviewDesc: "팀 인원과 월 금액을 확인한 뒤 배포하세요.",
    monthlyCost: "월 구독료",
    members: "인원",
    perPerson: "1인당 / 월",
    durationLabel: "계약 기간",
    depositRequired: "1인당 선입금",
    howSafe: "왜 더 안전한가요?",
    howSafeDesc: "모두가 먼저 돈을 넣어두고, 먼저 결제한 사람은 정해진 월 금액만 승인이나 증명으로 가져갈 수 있습니다.",
    deployBtn: "볼트 배포",
    deploying: "온체인 배포 중...",
    
    inviteTitle: "팀원 초대",
    inviteDesc: "이 링크를 공유해 팀원이 먼저 자기 몫을 넣게 하세요.",
    vaultLink: "볼트 초대 링크",
    copied: "✓ 복사됨!",
    copyLink: "링크 복사",
    shareDiscord: "Discord",
    shareTelegram: "Telegram",
    shareSlack: "Slack",
    waiting: "{n}명 더 기다리는 중...",
    joined: "{n}/{t}명 참여",
    allJoined: "전원 참여 완료!",
    simJoin: "[데모] 전원 참여 시뮬레이션",
    proceed: "입금 단계로",
    
    depositTitle: "자기 몫 입금하기",
    depositDesc: "먼저 결제한 사람이 돈을 돌려받기 전에, 팀원이 먼저 자기 몫을 넣습니다.",
    yourShare: "내 입금액",
    depositBtn: "{a} USDC 입금",
    depositing: "온체인 확인 중...",
    depositDone: "✓ 입금 확인됨",
    depositProgress: "입금 현황",
    awaiting: "대기 중",
    simDeposit: "[데모] 전원 입금 시뮬레이션",
    vaultReady: "볼트 활성화!",
    goActive: "활성 볼트 보기 →",
    
    balance: "볼트 잔액",
    monthProgress: "{t}개월 중 {c}개월째",
    collected: "총 모금액",
    paid: "지급 완료",
    remaining: "잔여",
    schedule: "돌려준 내역",
    noPayments: "아직 돌려준 돈이 없습니다. 이번 달 Claude 결제가 끝나면 팀 승인이나 영수증 증명으로 돌려줄 수 있습니다.",
    releaseBtn: "{n}개월차 돌려주기 승인",
    releasing: "승인 제출 중...",
    paymentTo: "→ 먼저 결제한 사람에게 지급됨",
    approvedLabel: "{a}/{t}명 승인",
    alreadyVoted: "✓ 이번 달 투표 완료",
    proveAndClaim: "Stripe 영수증으로 청구하기 (zkTLS)",
    provingSubscription: "영수증 증명 시작 중...",
    submittingProofClaim: "지급 청구 제출 중...",
    scanQr: "Reclaim 앱으로 QR 스캔 → Stripe 영수증 증명",
    proofVerified: "✓ 온체인 증명 검증 완료",
    reimbursementGuide: "매달 어떻게 진행되나요?",
    reimbursementDesc: "이 볼트가 Claude를 직접 결제하지는 않습니다. 한 명이 먼저 결제하면, 팀이 넣어둔 돈에서 같은 금액을 다시 돌려줍니다.",
    reimbursementStep1: "팀원 모두 먼저 입금",
    reimbursementStep2: "한 명이 Claude 요금을 결제",
    reimbursementStep3: "팀 승인이나 영수증 증명 후 그 사람에게 돈 지급",
    reimbursementHint: "영수증 증명은 더 빨리 돈을 돌려받는 방법입니다.",
    unlockedNow: "지금 열려 있는 월",
    lockedUntil: "열리는 시점",
    claimHint: "지금은 열려 있는 월만 청구할 수 있습니다.",
    
    complete: "볼트 일정 완료",
    completeDesc: "예정된 월별 정산이 모두 끝났습니다.",
    newVault: "새 볼트 만들기",
    
    joinTitle: "볼트 참여하기",
    joinDesc: "팀원이 공유한 볼트 링크 또는 주소를 붙여넣으세요.",
    vaultAddr: "볼트 링크 또는 주소",
    joinBtn: "참여하기",
    
    statusPending: "대기 중",
    statusActive: "활성",
    statusComplete: "완료",
    admin: "먼저 결제함",
    you: "나",
    mo: "개월",
    people: "명",
  },
};

// Demo is intentionally Claude-first to keep the prototype focused.
const SVCS = [
  { name: "Claude",         vendor: "Anthropic",    icon: "C",  color: "#D97706",
    plans: [{ label: "Pro", price: 20 }, { label: "Max 5x", price: 100 }, { label: "Max 20x", price: 200 }, { label: "Team", price: 30, note: "min 5 seats" }] },
];

const SCR = { HOME: 0, ONBOARD: 1, CREATE: 2, INVITE: 3, DEPOSIT: 4, ACTIVE: 5, JOIN: 6, MYVAULTS: 7 };
const fmt = (n) => `$${n.toFixed(2)}`;
const RECLAIM_APP_ID = '0xBf6B11D81583583c09935cd879193a1a0C3c4226';

const C = {
  bg: "#09090B", s1: "#111114", s2: "#18181B", s3: "#1F1F23",
  bd: "#27272A", bdL: "#3F3F46",
  p: "#818CF8", pG: "rgba(129,140,248,0.1)", pS: "#6366F1",
  ac: "#22D3EE", acG: "rgba(34,211,238,0.07)",
  tx: "#FAFAFA", t2: "#A1A1AA", t3: "#71717A", t4: "#52525B",
  ok: "#34D399", okG: "rgba(52,211,153,0.08)",
  wn: "#FBBF24", wnG: "rgba(251,191,36,0.08)",
  er: "#F87171",
};

export default function App() {
  const [lang, setLang] = useState("en");
  const [scr, setScr] = useState(SCR.HOME);
  const [fade, setFade] = useState(true);

  const { open } = useAppKit();
  const { address, status, embeddedWalletInfo } = useAppKitAccount();
  const { disconnect } = useDisconnect();
  const authMethod = embeddedWalletInfo?.authProvider || (status === 'connected' ? 'wallet' : '');
  const authed = status === 'connected';

  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: ethBalance } = useBalance({ address: address, chainId: CHAIN_ID, query: { enabled: !!address } });
  const onRightChain = chainId === CHAIN_ID;
  const hasGas = ethBalance && ethBalance.value > 0n;
  const { sendTransactionAsync } = useSendTransaction();

  const [selSvc, setSelSvc] = useState(null);
  const [selPlan, setSelPlan] = useState(null);
  const [cName, setCName] = useState("");
  const [cPrice, setCPrice] = useState("");
  const [nMem, setNMem] = useState(4);
  const [dur, setDur] = useState(3);
  const [cStep, setCStep] = useState(0);
  const [deploying, setDeploying] = useState(false);

  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState([]);
  const [vault, setVault] = useState(null);
  const [myDep, setMyDep] = useState(false);
  const [deping, setDeping] = useState(false);

  const [curMo, setCurMo] = useState(1);
  const [pays, setPays] = useState([]);
  const [releasing, setReleasing] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [customMem, setCustomMem] = useState("");
  const [customDur, setCustomDur] = useState("");
  const [joining, setJoining] = useState(false);
  const [vaultAddr, setVaultAddr] = useState(null);
  const [deployTxHash, setDeployTxHash] = useState(null);
  const [txStatus, setTxStatus] = useState(""); // user-facing tx status message
  const [activating, setActivating] = useState(false);
  const [activateDone, setActivateDone] = useState(false);

  // on-chain hooks (always called at top level)
  const { deploy, isDeploying: isOnChainDeploying } = useDeployVault();
  const { deposit: depositOnChain, step: depositStep }  = useVaultDeposit(vaultAddr);
  const { join: joinOnChain, isJoining }                = useVaultJoin(vaultAddr, address);
  const { approve: approveOnChain, isApproving }         = useVaultApprove(vaultAddr);
  const { claimWithProof, isClaiming: isProofClaiming }  = useVaultClaimWithProof(vaultAddr);
  const monthStatus                                      = useMonthStatus(vaultAddr, curMo, address);
  const unlockInfo                                       = useVaultUnlockInfo(vaultAddr, curMo);
  const [reclaimUrl, setReclaimUrl]                      = useState(null);
  const [reclaimStatus, setReclaimStatus]                = useState('idle'); // idle|loading|qr|submitting|done|error
  const { info: chainInfo, refetch: refetchInfo }       = useVaultInfo(vaultAddr);

  // read vault info from chain for JOIN preview
  const joinAddr = joinCode.match(/^0x[0-9a-fA-F]{40}$/) ? joinCode : null;
  const { info: joinInfo }                              = useVaultInfo(joinAddr);
  const { join: joinOnChainDirect, isJoining: isJoinDirect } = useVaultJoin(joinAddr, address);
  const { vaults: myVaults, isLoading: myVaultsLoading, refresh: refreshMyVaults } = useMyVaults(address);
  const accountDeployed = useIsAccountDeployed(address);

  // URL hash routing: /#/v/<vaultAddr>
  useEffect(() => {
    const m = window.location.hash.match(/^#\/v\/(.+)/);
    if (m) {
      setJoinCode(decodeURIComponent(m[1]));
      setScr(SCR.JOIN);
    }
  }, []);

  // Clear stale error messages when user logs in
  useEffect(() => {
    if (authed) setTxStatus('');
  }, [authed]);

  useEffect(() => {
    setReclaimStatus('idle');
    setReclaimUrl(null);
  }, [curMo, vaultAddr]);

  const t = T[lang];
  const go = (s) => { setFade(false); setTimeout(() => { setScr(s); setFade(true); if (s === SCR.JOIN) setTxStatus(''); }, 100); };
  const primeClaudeDemo = (nextScreen) => {
    setSelSvc(0);
    setSelPlan(0);
    setCName("");
    setCPrice("");
    setNMem(4);
    setDur(3);
    setCustomMem("");
    setCustomDur("");
    setCStep(0);
    go(nextScreen);
  };
  const formatAppError = (error) => {
    const raw =
      error?.cause?.reason ||
      error?.shortMessage ||
      error?.details ||
      error?.message ||
      String(error);

    if (!raw) {
      return lang === 'ko' ? '알 수 없는 오류가 발생했습니다.' : 'An unknown error occurred.'
    }

    if (raw.includes('Missing VITE_FACTORY_ADDRESS')) {
      return lang === 'ko'
        ? '새로 배포한 팩토리 주소가 없습니다. VITE_FACTORY_ADDRESS를 설정하세요.'
        : 'Missing the latest deployed factory. Set VITE_FACTORY_ADDRESS.'
    }
    if (raw.includes('Missing VITE_RECLAIM_PROVIDER_ID')) {
      return lang === 'ko'
        ? 'Reclaim Provider ID가 없습니다. VITE_RECLAIM_PROVIDER_ID를 설정하세요.'
        : 'Missing Reclaim provider id. Set VITE_RECLAIM_PROVIDER_ID.'
    }
    if (raw.includes('Missing Reclaim secret or provider id')) {
      return lang === 'ko'
        ? 'Reclaim 비밀값이 없습니다. VITE_RECLAIM_APP_SECRET과 VITE_RECLAIM_PROVIDER_ID를 설정하세요.'
        : 'Missing Reclaim secrets. Set VITE_RECLAIM_APP_SECRET and VITE_RECLAIM_PROVIDER_ID.'
    }
    if (raw.includes('Invalid provider')) {
      return lang === 'ko'
        ? '이 영수증은 이 볼트가 기대하는 Reclaim provider와 일치하지 않습니다.'
        : 'This receipt does not match the Reclaim provider configured for this vault.'
    }
    if (raw.includes('Amount mismatch')) {
      return lang === 'ko'
        ? '영수증 금액이 이 볼트의 월별 환급 금액과 일치하지 않습니다.'
        : 'The Claude invoice amount does not match this vault’s monthly reimbursement amount.'
    }
    if (raw.includes('Missing Claude plan')) {
      return lang === 'ko'
        ? '검증된 영수증에서 Claude 결제 내역을 찾지 못했습니다.'
        : 'The verified receipt does not mention a Claude payment.'
    }
    if (raw.includes('Already claimed')) {
      return lang === 'ko'
        ? '이 달은 이미 환급이 완료되었습니다.'
        : 'This month has already been reimbursed.'
    }
    if (raw.includes('Proof already used')) {
      return lang === 'ko'
        ? '이 증명은 이미 사용되었습니다.'
        : 'This proof has already been used.'
    }
    if (raw.includes('User rejected')) {
      return lang === 'ko'
        ? '사용자가 트랜잭션을 취소했습니다.'
        : 'The transaction was rejected by the user.'
    }
    if (raw.includes('Month still timelocked')) {
      return lang === 'ko'
        ? '아직 이번 달 청구 시점이 열리지 않았습니다.'
        : 'This month is still locked. It cannot be claimed yet.'
    }

    return raw
  };

  const formatUnlockTime = (value) => {
    if (!value || value === 0n) return '-'
    const date = new Date(Number(value) * 1000)
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US')
  }

  const doDeploy = async () => {
    setDeploying(true);
    setTxStatus(lang === 'ko' ? '컨트랙트 배포 중...' : 'Deploying contract...');
    const sv = SVCS[selSvc];
    const nm = `${sv.name} ${sv.plans[selPlan].label}`;
    const pp = sv.plans[selPlan].price;
    try {
      const { vault: addr, txHash } = await deploy({ name: nm, monthlyPriceUSD: pp, nMembers: nMem, duration: dur });
      setVaultAddr(addr);
      setDeployTxHash(txHash);
      setVault({ name: nm, price: pp, perPerson: pp/nMem, dep: pp*dur/nMem, nMem, dur, color: sv.color, icon: sv.icon, addr });
      setMembers([{ addr: address, name: t.you, dep: false, joined: true, creator: true }]);
      setMyDep(false); setCurMo(1); setPays([]);
      setTxStatus('');
      go(SCR.INVITE);
    } catch (e) {
      console.error('createVault error:', e);
      setTxStatus((lang === 'ko' ? '오류: ' : 'Error: ') + formatAppError(e));
    } finally {
      setDeploying(false);
    }
  };

  const doDeposit = async () => {
    if (!vaultAddr) return;
    setDeping(true);
    setTxStatus(lang === 'ko' ? 'USDC 승인 중...' : 'Approving USDC...');
    try {
      const depBig = parseUnits(String(vault.dep), 6);
      await depositOnChain(depBig);
      setMyDep(true);
      setMembers(p => p.map(m => m.addr === address ? { ...m, dep: true } : m));
      setTxStatus(lang === 'ko' ? '입금 완료. 나머지 팀원을 기다리는 중입니다.' : 'Deposit completed. Waiting for the rest of the team.');
      await refetchInfo();
    } catch (e) {
      setTxStatus((lang === 'ko' ? '오류: ' : 'Error: ') + formatAppError(e));
    } finally {
      setDeping(false);
    }
  };

  const simJoin = () => { setMembers(p => p.map(m => ({...m, joined:true}))); setTimeout(() => go(SCR.DEPOSIT), 400); };
  const simDep  = () => { setMembers(p => p.map(m => ({...m, dep:true, joined:true}))); setTimeout(() => go(SCR.ACTIVE), 500); };

  // Reclaim proof flow — APP_ID/APP_SECRET/PROVIDER_ID from env
  const doProveAndClaim = async () => {
    if (!vaultAddr) {
      setTxStatus(lang === 'ko' ? '오류: 먼저 볼트를 생성하거나 선택하세요.' : 'Error: Create or select a vault first.');
      return;
    }
    if (!onRightChain) {
      setTxStatus(lang === 'ko' ? '오류: Base Sepolia로 전환한 뒤 다시 시도하세요.' : 'Error: Switch to Base Sepolia and try again.');
      return;
    }
    if (!hasGas) {
      setTxStatus(lang === 'ko' ? '오류: 가스비가 부족합니다. Base Sepolia ETH를 충전하세요.' : 'Error: Not enough gas. Fund the wallet with Base Sepolia ETH.');
      return;
    }
    setTxStatus('');
    setReclaimStatus('loading');
    try {
      const APP_SECRET   = import.meta.env.VITE_RECLAIM_APP_SECRET;
      const PROVIDER_ID  = import.meta.env.VITE_RECLAIM_PROVIDER_ID;
      if (!APP_SECRET || !PROVIDER_ID) throw new Error('Missing Reclaim secret or provider id');

      const req = await ReclaimProofRequest.init(RECLAIM_APP_ID, APP_SECRET, PROVIDER_ID);
      // Bind proof to this vault+month to prevent cross-vault replay
      req.addContext(vaultAddr, `SubShare vault ${vaultAddr} month ${curMo}`);

      const url = await req.getRequestUrl();
      setReclaimUrl(url);
      setReclaimStatus('qr');

      await req.startSession({
        onSuccess: async (proof) => {
          const reclaimProof = Array.isArray(proof) ? proof[0] : proof;
          if (!reclaimProof || typeof reclaimProof === 'string') {
            setReclaimStatus('error');
            setTxStatus(lang==='ko' ? '오류: Reclaim proof를 받지 못했습니다.' : 'Error: No Reclaim proof was returned.');
            return;
          }

          setReclaimStatus('submitting');
          setReclaimUrl(null);
          setTxStatus(lang==='ko' ? '온체인 자동 청구 제출 중...' : 'Submitting on-chain auto-claim...');
          try {
            const tx = await claimWithProof(curMo, reclaimProof);
            setPays(p => [...p, { mo: curMo, amt: vault.price, tx }]);
            setCurMo(m => m + 1);
            setReclaimStatus('done');
            setTxStatus(lang==='ko' ? 'zkTLS 자동 청구가 완료되었습니다.' : 'zkTLS auto-claim completed.');
            await refetchInfo();
          } catch (e) {
            setReclaimStatus('error');
            setTxStatus((lang==='ko' ? '오류: ' : 'Error: ') + formatAppError(e));
          }
        },
        onError: (err) => {
          setReclaimStatus('error');
          setReclaimUrl(null);
          setTxStatus((lang==='ko' ? '증명 실패: ' : 'Proof failed: ') + formatAppError(err));
        },
      });
    } catch (e) {
      setReclaimStatus('error');
      setReclaimUrl(null);
      setTxStatus((lang==='ko' ? '오류: ' : 'Error: ') + formatAppError(e));
    }
  };

  const doPay = async () => {
    if (!vaultAddr) return;
    setReleasing(true);
    setTxStatus(lang === 'ko' ? '승인 제출 중...' : 'Submitting approval...');
    try {
      const tx = await approveOnChain(curMo);
      await refetchInfo();
      // If payment was fully released (all n voted), advance curMo
      const freshInfo = await refetchInfo();
      if (freshInfo?.data && Number(freshInfo.data[7]) > pays.length) {
        setPays(p => [...p, { mo: curMo, amt: vault.price, tx }]);
        setCurMo(m => m + 1);
        setTxStatus(lang === 'ko' ? `환급 완료. ${curMo}개월차 금액이 선결제자에게 지급되었습니다.` : `Reimbursement completed. Month ${curMo} was released to the payer.`);
      } else {
        setTxStatus(lang === 'ko' ? '승인 완료. 나머지 팀원의 승인을 기다리는 중입니다.' : 'Approval recorded. Waiting for the rest of the team.');
      }
    } catch (e) {
      setTxStatus((lang === 'ko' ? '오류: ' : 'Error: ') + formatAppError(e));
    } finally {
      setReleasing(false);
    }
  };

  // ── Components ──
  const font = '-apple-system, "Pretendard", "Helvetica Neue", sans-serif';
  const mono = '"SF Mono", "Fira Code", monospace';

  const Btn = ({ children, on, disabled, secondary, green, style: sx, ...p }) => (
    <button disabled={disabled} onClick={on} style={{
      width:"100%", padding:"15px", border: secondary ? `1px solid ${C.bd}` : "none",
      borderRadius:14, fontSize:14, fontWeight:600, cursor: disabled?"default":"pointer",
      fontFamily:font, transition:"all 0.2s", letterSpacing:"0.2px",
      background: green ? `linear-gradient(135deg, ${C.ok}, #059669)` : secondary ? "transparent" : disabled ? C.bd : `linear-gradient(135deg, ${C.p}, ${C.pS})`,
      color: secondary ? C.t2 : "#fff", opacity: disabled ? 0.5 : 1, ...sx
    }} {...p}>{children}</button>
  );

  const Card = ({children, style:sx, onClick}) => <div onClick={onClick} style={{ background:C.s1, border:`1px solid ${C.bd}`, borderRadius:16, padding:20, marginBottom:12, ...sx }}>{children}</div>;
  const Title = ({children}) => <h2 style={{ fontSize:21, fontWeight:700, marginBottom:6, fontFamily:font, lineHeight:1.3 }}>{children}</h2>;
  const Desc = ({children}) => <p style={{ color:C.t2, fontSize:13, lineHeight:1.6, marginBottom:24 }}>{children}</p>;
  const Label = ({children}) => <div style={{ fontSize:11, fontWeight:600, color:C.t3, marginBottom:8, textTransform:"uppercase", letterSpacing:"1px" }}>{children}</div>;
  const Input = (p) => <input {...p} style={{ width:"100%", padding:"13px 15px", background:C.s2, border:`1px solid ${C.bd}`, borderRadius:12, color:C.tx, fontSize:14, fontFamily:font, outline:"none", boxSizing:"border-box", ...p.style }} />;
  const Tag = ({children, color}) => <span style={{ padding:"3px 9px", borderRadius:7, fontSize:10, fontWeight:700, letterSpacing:"0.6px", background:`${color}15`, color, textTransform:"uppercase" }}>{children}</span>;
  const Back = ({to}) => <button onClick={()=>go(to)} style={{ background:"none", border:"none", color:C.t3, fontSize:13, cursor:"pointer", fontFamily:font, padding:"4px 0", marginBottom:20 }}>{to===SCR.HOME ? t.home : t.back}</button>;
  const Steps = ({cur, n}) => <div style={{ display:"flex", gap:5, marginBottom:28 }}>{Array.from({length:n},(_,i)=><div key={i} style={{ flex: i===cur?2.5:1, height:3, borderRadius:2, background: i<=cur?C.p:C.bd, transition:"all 0.4s" }}/>)}</div>;

  const LangToggle = () => (
    <div style={{ display:"flex", justifyContent:"flex-end", alignItems:"center", marginBottom:12 }}>
      <div style={{ display:"flex", background:C.s1, borderRadius:9, border:`1px solid ${C.bd}`, overflow:"hidden" }}>
        {["ko","en"].map(l => <button key={l} onClick={()=>setLang(l)} style={{ padding:"5px 13px", border:"none", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:font, background: lang===l?C.pG:"transparent", color: lang===l?C.p:C.t4 }}>{l==="ko"?"한국어":"EN"}</button>)}
      </div>
    </div>
  );

  const VaultHead = () => (
    <Card style={{ background:`linear-gradient(135deg, ${vault.color}08, ${C.s1})`, border:`1px solid ${vault.color}20` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div style={{ display:"flex", alignItems:"center", gap:11 }}>
          <div style={{ fontSize:21, width:44, height:44, borderRadius:12, background:`${vault.color}12`, display:"flex", alignItems:"center", justifyContent:"center", color:vault.color }}>{vault.icon}</div>
          <div>
            <div style={{ fontSize:16, fontWeight:700 }}>{vault.name}</div>
            <div style={{ fontSize:11, color:C.t4, fontFamily:mono }}>{vault.addr}</div>
          </div>
        </div>
        <Tag color={scr===SCR.ACTIVE?C.ok:C.wn}>{scr===SCR.ACTIVE?t.statusActive:t.statusPending}</Tag>
      </div>
    </Card>
  );

  const ReimbursementGuideUI = () => (
    <Card style={{ background:`linear-gradient(135deg, ${C.acG}, ${C.s1})`, border:`1px solid ${C.ac}20`, padding:20 }}>
      <div style={{ fontSize:11, color:C.ac, fontWeight:700, textTransform:"uppercase", letterSpacing:"1px", marginBottom:10 }}>{t.reimbursementGuide}</div>
      <div style={{ fontSize:12, color:C.t2, lineHeight:1.6, marginBottom:14 }}>{t.reimbursementDesc}</div>
      <div style={{ display:"grid", gap:8 }}>
        {[t.reimbursementStep1, t.reimbursementStep2, t.reimbursementStep3].map((step, index) => (
          <div key={step} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"10px 12px", background:C.s2, border:`1px solid ${C.bd}`, borderRadius:12 }}>
            <div style={{ width:22, height:22, borderRadius:8, background:`${C.ac}12`, color:C.ac, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700 }}>{index + 1}</div>
            <div style={{ fontSize:12, color:C.tx, lineHeight:1.5 }}>{step}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:12, fontSize:11, color:C.t4, lineHeight:1.5 }}>{t.reimbursementHint}</div>
    </Card>
  );

  const MemberRow = ({m, i, showDep}) => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 14px", background:C.s1, border:`1px solid ${C.bd}`, borderRadius:12, marginBottom:7 }}>
      <div style={{ display:"flex", alignItems:"center", gap:9 }}>
        <div style={{ width:28, height:28, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, background: (showDep?m.dep:m.joined)?C.okG:`${C.bd}40`, color:(showDep?m.dep:m.joined)?C.ok:C.t4 }}>{(showDep?m.dep:m.joined)?"✓":i+1}</div>
        <div>
          <div style={{ fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>
            {m.name}{m.creator && <Tag color={C.p}>{t.admin}</Tag>}
          </div>
          <div style={{ fontSize:10, color:C.t4, fontFamily:mono }}>{m.addr}</div>
        </div>
      </div>
      <div style={{ fontSize:11, fontWeight:600, color:(showDep?m.dep:m.joined)?C.ok:C.t4 }}>
        {showDep ? (m.dep ? fmt(vault.dep) : t.awaiting) : (m.joined ? "Joined" : t.awaiting)}
      </div>
    </div>
  );

  // ─── SCREENS ───

  // HOME
  if (scr === SCR.HOME) return (
    <div style={{ maxWidth:440, margin:"0 auto", minHeight:"100vh", background:C.bg, fontFamily:font, color:C.tx, padding:"20px 20px 80px", opacity:fade?1:0, transition:"opacity 0.1s" }}>
      <LangToggle />
      {!authed ? (
        <div>
          <div style={{ textAlign:"center", margin:"48px 0 36px" }}>
            <div style={{ fontSize:22, fontWeight:900, marginBottom:14, width:64, height:64, borderRadius:18, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", letterSpacing:"-1px", margin:"0 auto 14px", boxShadow:"0 4px 24px rgba(99,102,241,0.35)" }}>SS</div>
            <h1 style={{ fontSize:28, fontWeight:800, fontFamily:font, marginBottom:8, letterSpacing:"-0.5px" }}>{t.appName}</h1>
            <p style={{ fontSize:15, fontWeight:500, color:C.tx, marginBottom:6 }}>{t.tagline}</p>
            <p style={{ fontSize:13, color:C.t2, lineHeight:1.6, maxWidth:320, margin:"0 auto" }}>{t.taglineSub}</p>
          </div>
          <Btn on={() => open()} style={{ marginBottom:12, padding:"17px" }}>{t.loginTitle}</Btn>
          <div style={{ display:"flex", justifyContent:"center", gap:16, marginBottom:20 }}>
            {[
              { icon: "G", color: "#EA4335", label: "Google" },
              { icon: "D", color: "#5865F2", label: "Discord" },
              { icon: "⌥", color: "#E2E8F0", label: "GitHub" },
              { icon: "✉", color: "#A1A1AA", label: "Email" },
            ].map((s,i) => (
              <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:`${s.color}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, color:s.color }}>{s.icon}</div>
                <span style={{ fontSize:10, color:C.t4 }}>{s.label}</span>
              </div>
            ))}
          </div>
          <div style={{ textAlign:"center", fontSize:11, color:C.t4 }}>{t.poweredBy}</div>
        </div>
      ) : (
        <div>
          <div style={{ textAlign:"center", margin:"36px 0 28px" }}>
            <div style={{ fontSize:20, fontWeight:900, marginBottom:12, width:56, height:56, borderRadius:16, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", letterSpacing:"-1px", margin:"0 auto 12px", boxShadow:"0 4px 20px rgba(99,102,241,0.3)" }}>SS</div>
            <h1 style={{ fontSize:26, fontWeight:800, fontFamily:font, marginBottom:6 }}>{t.appName}</h1>
            <p style={{ fontSize:13, color:C.t2 }}>{t.tagline}</p>
          </div>
          <Card style={{ marginBottom:24, border:`1px solid ${C.p}20`, cursor:"pointer" }} onClick={() => open({ view: 'Account' })}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:10, color:C.t4, textTransform:"uppercase", letterSpacing:"1px", marginBottom:3 }}>
                  {t.connected} · {t.smartAccount}
                  {authMethod && authMethod !== 'wallet' && <span style={{ marginLeft:6, background:`${C.p}20`, color:C.p, borderRadius:4, padding:"1px 5px", fontSize:9, textTransform:"none" }}>{authMethod}</span>}
                </div>
                <div style={{ fontSize:14, fontWeight:600, fontFamily:mono }}>
                  {embeddedWalletInfo?.user?.email || (address ? `${address.slice(0,6)}...${address.slice(-4)}` : '')}
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:9, height:9, borderRadius:"50%", background:C.ok, boxShadow:`0 0 10px ${C.ok}` }} />
                <span style={{ fontSize:11, color:C.t4 }}>{lang==='ko' ? '관리 →' : 'Manage →'}</span>
              </div>
            </div>
          </Card>
          <Btn on={() => primeClaudeDemo(SCR.ONBOARD)} style={{ marginBottom:10 }}>{t.createVault}</Btn>
          <Btn secondary on={() => go(SCR.JOIN)} style={{ marginBottom:10 }}>{t.joinVault}</Btn>
          <Btn secondary on={() => { refreshMyVaults(); go(SCR.MYVAULTS); }} style={{ background:C.s2, border:`1px solid ${C.bd}` }}>
            {lang==='ko' ? '내 볼트 보기' : 'My Vaults'}
          </Btn>
        </div>
      )}
    </div>
  );

  // WRAPPER
  const Wrap = ({children}) => (
    <div style={{ maxWidth:440, margin:"0 auto", minHeight:"100vh", background:C.bg, fontFamily:font, color:C.tx, padding:"20px 20px 80px", opacity:fade?1:0, transition:"opacity 0.1s" }}>
      <LangToggle />{children}
    </div>
  );

  // ONBOARD
  if (scr === SCR.ONBOARD) return (
    <Wrap><Back to={SCR.HOME} />
      <Title>{t.onboardTitle}</Title>
      <div style={{ height:12 }} />
      {t.steps.map((s,i) => (
        <Card key={i} style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
          <div style={{ fontSize:13, color:C.p, fontWeight:800, fontFamily:mono, minWidth:26, marginTop:2 }}>{s.icon}</div>
          <div><div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>{s.title}</div><div style={{ fontSize:12, color:C.t2, lineHeight:1.5 }}>{s.desc}</div></div>
        </Card>
      ))}
      <Card style={{ background:`linear-gradient(135deg, ${C.acG}, ${C.s1})`, border:`1px solid ${C.ac}20`, marginTop:4 }}>
        <div style={{ fontSize:12, fontWeight:700, color:C.ac, marginBottom:6 }}>{t.keyFeature}</div>
        <div style={{ fontSize:12, color:C.t2, lineHeight:1.6 }}>{t.keyFeatureDesc}</div>
      </Card>
      <div style={{ height:8 }} />
      <Btn on={() => primeClaudeDemo(SCR.CREATE)}>{t.getStarted}</Btn>
    </Wrap>
  );

  // CREATE
  if (scr === SCR.CREATE) {
    const sv = selSvc !== null ? SVCS[selSvc] : null;
    const pp = selPlan !== null ? sv.plans[selPlan].price : 0;
    const perPersonMonthly = nMem > 0 ? pp / nMem : 0;
    const depPerPerson = nMem > 0 ? pp * dur / nMem : 0;
    return (
      <Wrap>
        {cStep === 0
          ? <Back to={SCR.ONBOARD} />
          : <button onClick={()=>setCStep(cStep-1)} style={{ background:"none", border:"none", color:C.t3, fontSize:13, cursor:"pointer", fontFamily:font, padding:"4px 0", marginBottom:20 }}>{t.back}</button>
        }
        <Steps cur={cStep} n={3} />
        {cStep===0 && (<div>
          <Title>{t.selectService}</Title><Desc>{t.selectServiceDesc}</Desc>
          <Card style={{ background:`linear-gradient(135deg, ${C.p}08, ${C.s1})`, border:`1px solid ${C.p}20`, padding:"14px 16px" }}>
            <div style={{ fontSize:11, color:C.p, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>
              {lang==='ko' ? '추천 데모 흐름' : 'Recommended demo flow'}
            </div>
            <div style={{ fontSize:12, color:C.t2, lineHeight:1.6 }}>
              {lang==='ko'
                ? 'Claude Pro, 4인 팀, 3개월 기준으로 미리 세팅되어 있습니다. 바로 검토하거나 다른 플랜으로 바꿀 수 있습니다.'
                : 'Preloaded for Claude Pro, a 4-person team, and a 3-month commitment. You can review it immediately or switch plans.'}
            </div>
          </Card>
          {SVCS.map((s,i) => {
            const isSelected = selSvc === i;
            const priceRange = s.plans.length > 1
              ? `${fmt(s.plans[0].price)} – ${fmt(s.plans[s.plans.length-1].price)}/mo`
              : `${fmt(s.plans[0].price)}/mo`;
            return (
              <div key={i}>
                <button onClick={() => {
                  setSelSvc(i); setSelPlan(null);
                  if (s.plans.length === 1) { setSelPlan(0); setCStep(1); }
                }} style={{
                  width:"100%", display:"flex", alignItems:"center", gap:13, padding:15,
                  background: isSelected ? `${s.color}08` : C.s1,
                  border: `1px solid ${isSelected ? s.color+"50" : C.bd}`,
                  borderRadius: isSelected && (s.plans.length > 1 || isCustom) ? "14px 14px 0 0" : 14,
                  cursor:"pointer", marginBottom: isSelected && (s.plans.length > 1 || isCustom) ? 0 : 9, textAlign:"left",
                }}>
                  <div style={{ fontSize:20, width:40, height:40, borderRadius:10, background:`${s.color}10`, display:"flex", alignItems:"center", justifyContent:"center", color:s.color }}>{s.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:C.tx }}>{s.name}</div>
                    <div style={{ fontSize:11, color:C.t4 }}>{s.vendor && `${s.vendor} · `}{priceRange}</div>
                  </div>
                  {s.plans.length > 1 && <div style={{ fontSize:11, color:C.t3 }}>{isSelected ? "▲" : "▼"}</div>}
                </button>
                {isSelected && s.plans.length > 1 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:1, marginBottom:9, border:`1px solid ${s.color}50`, borderTop:"none", borderRadius:"0 0 14px 14px", overflow:"hidden" }}>
                    {s.plans.map((p, j) => (
                      <button key={j} onClick={() => { setSelPlan(j); setCStep(1); }} style={{
                        flex:"1 0 calc(50% - 0.5px)", padding:"11px 14px", background: selPlan===j ? `${s.color}12` : C.s2,
                        border:"none", borderTop:`1px solid ${s.color}20`, cursor:"pointer", textAlign:"left",
                      }}>
                        <div style={{ fontSize:13, fontWeight:600, color:C.tx }}>{p.label}</div>
                        <div style={{ fontSize:12, color:s.color, fontWeight:700 }}>{fmt(p.price)}/mo</div>
                        {p.note && <div style={{ fontSize:10, color:C.t4, marginTop:2 }}>{p.note}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>)}
        {cStep===1 && (<div>
          <Title>{t.configVault}</Title><Desc>{t.configDesc}</Desc>
          <Label>{t.teamSize}</Label>
          <div style={{ display:"flex", gap:7, marginBottom:10 }}>
            {[2,3,4,5,6].map(n => <button key={n} onClick={()=>{setNMem(n);setCustomMem("");}} style={{ flex:1, padding:"14px 0", borderRadius:11, fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:font, border:`1px solid ${nMem===n&&!customMem?C.p:C.bd}`, background:nMem===n&&!customMem?C.pG:"transparent", color:nMem===n&&!customMem?C.p:C.t3 }}>{n}</button>)}
          </div>
          <input
            value={customMem}
            onChange={e => { const v = e.target.value.replace(/[^0-9]/g,""); setCustomMem(v); if(v && parseInt(v)>=2) setNMem(parseInt(v)); }}
            placeholder={lang==='ko'?"직접 입력 (2 이상)":"Custom (min 2)"}
            inputMode="numeric"
            style={{ width:"100%", padding:"11px 14px", background:C.s2, border:`1px solid ${customMem?C.p:C.bd}`, borderRadius:11, color:C.tx, fontSize:14, fontFamily:font, outline:"none", boxSizing:"border-box", marginBottom:22 }}
          />
          <Label>{t.commitment}</Label>
          <div style={{ display:"flex", gap:7, marginBottom:10 }}>
            {[1,3,6,12].map(n => <button key={n} onClick={()=>{setDur(n);setCustomDur("");}} style={{ flex:1, padding:"14px 0", borderRadius:11, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:font, border:`1px solid ${dur===n&&!customDur?C.ac:C.bd}`, background:dur===n&&!customDur?C.acG:"transparent", color:dur===n&&!customDur?C.ac:C.t3 }}>{n}{t.mo}</button>)}
          </div>
          <input
            value={customDur}
            onChange={e => { const v = e.target.value.replace(/[^0-9]/g,""); setCustomDur(v); if(v && parseInt(v)>=1) setDur(parseInt(v)); }}
            placeholder={lang==='ko'?"직접 입력 (개월)":"Custom (months)"}
            inputMode="numeric"
            style={{ width:"100%", padding:"11px 14px", background:C.s2, border:`1px solid ${customDur?C.ac:C.bd}`, borderRadius:11, color:C.tx, fontSize:14, fontFamily:font, outline:"none", boxSizing:"border-box", marginBottom:26 }}
          />
          <Btn on={()=>setCStep(2)}>{t.next}</Btn>
        </div>)}
        {cStep===2 && (<div>
          <Title>{t.reviewTitle}</Title><Desc>{t.reviewDesc}</Desc>
          <Card style={{ background:`linear-gradient(135deg, ${C.s1}, ${(sv?.color||C.p)}05)` }}>
            <div style={{ display:"flex", alignItems:"center", gap:11, marginBottom:16 }}>
              <div style={{ fontSize:24, width:48, height:48, borderRadius:13, background:`${sv?.color||C.p}10`, display:"flex", alignItems:"center", justifyContent:"center", color:sv?.color||C.p }}>{sv?.icon}</div>
              <div>
                <div style={{ fontSize:16, fontWeight:700 }}>{`${sv?.name} ${sv?.plans[selPlan]?.label || ''}`}</div>
                <div style={{ fontSize:12, color:C.t4 }}>{sv?.vendor} · Claude team sharing</div>
              </div>
            </div>
            {[[t.monthlyCost,fmt(pp)],[t.members,`${nMem} ${t.people}`],[t.perPerson,fmt(perPersonMonthly)],[t.durationLabel,`${dur}${t.mo}`],[t.depositRequired,fmt(depPerPerson)]].map(([l,v],i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderTop:i>0?`1px solid ${C.bd}`:"none" }}>
                <span style={{ fontSize:13, color:C.t2 }}>{l}</span><span style={{ fontSize:13, fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </Card>
          <Card style={{ background:C.acG, border:`1px solid ${C.ac}15`, padding:"14px 16px" }}>
            <div style={{ fontSize:11, color:C.ac, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>{t.howSafe}</div>
            <div style={{ fontSize:12, color:C.t2, lineHeight:1.6 }}>{t.howSafeDesc}</div>
          </Card>
          {/* Chain check */}
          {!onRightChain && (
            <div style={{ background:'#FBBF2415', border:'1px solid #FBBF2440', borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
              <div style={{ fontSize:12, color:C.wn, fontWeight:600, marginBottom:6 }}>
                {lang==='ko' ? '⚠️ Base Sepolia로 네트워크를 전환하세요' : '⚠️ Switch to Base Sepolia'}
              </div>
              <div style={{ fontSize:11, color:C.t2, marginBottom:8 }}>
                {lang==='ko' ? `현재 네트워크: ${chainId}` : `Current chain: ${chainId}`}
              </div>
              <button onClick={() => switchChain({ chainId: CHAIN_ID })}
                style={{ fontSize:12, fontWeight:600, padding:'7px 14px', borderRadius:8, background:C.wn, color:'#000', border:'none', cursor:'pointer' }}>
                Switch to Base Sepolia
              </button>
            </div>
          )}
          {onRightChain && ethBalance !== undefined && !hasGas && (
            <div style={{ background:'#EF444415', border:'1px solid #EF444430', borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
              <div style={{ fontSize:12, color:C.er, fontWeight:600, marginBottom:4 }}>
                {lang==='ko' ? '⚠️ 가스비 없음 (Base Sepolia ETH 필요)' : '⚠️ No gas (need Base Sepolia ETH)'}
              </div>
              <div style={{ fontSize:11, color:C.t2 }}>
                {lang==='ko' ? '아래 파우셋에서 무료 ETH를 받으세요:' : 'Get free ETH from the faucet:'}
                {' '}<a href={`https://learnweb3.io/faucets/base_sepolia${address ? `?address=${address}` : ''}`} target="_blank" rel="noreferrer"
                  style={{ color:C.ac, textDecoration:'underline' }}>LearnWeb3 Faucet</a>
              </div>
            </div>
          )}
          {onRightChain && hasGas && (
            <div style={{ fontSize:11, color:C.t4, marginBottom:8, textAlign:'right' }}>
              Gas: {parseFloat(ethBalance.formatted).toFixed(4)} ETH
            </div>
          )}
          {txStatus && (
            <div style={{ fontSize:12, padding:'10px 14px', borderRadius:10, marginBottom:10,
              background: txStatus.includes('Error')||txStatus.includes('오류') ? '#EF444415' : '#FBBF2415',
              color: txStatus.includes('Error')||txStatus.includes('오류') ? C.er : C.wn,
              wordBreak:'break-all' }}>
              {txStatus}
            </div>
          )}
          <Btn on={doDeploy} disabled={deploying || !onRightChain}>{deploying ? t.deploying : t.deployBtn}</Btn>
        </div>)}
      </Wrap>
    );
  }

  // INVITE
  if (scr === SCR.INVITE) {
    const totalSlots = vault?.nMem || members.length;
    const jc = members.filter(m=>m.joined).length;
    const all = jc === totalSlots;
    const link = `${window.location.origin}${window.location.pathname}#/v/${encodeURIComponent(vault.addr)}`;
    const shareText = lang==='ko' ? `Sub-Share 정산 볼트에 참여하세요: ${vault.name}` : `Join my Sub-Share reimbursement vault: ${vault.name}`;
    const copyLink = () => navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(()=>setCopied(false), 2000); });
    return (
      <Wrap><Back to={SCR.HOME} /><VaultHead />
        <Title>{t.inviteTitle}</Title><Desc>{t.inviteDesc}</Desc>
        {/* Deploy tx info */}
        {deployTxHash && (
          <Card style={{ background:'#10B98110', border:`1px solid ${C.ok}30`, padding:'12px 14px', marginBottom:4 }}>
            <div style={{ fontSize:11, color:C.ok, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>
              ✅ {lang==='ko' ? '컨트랙트 배포 완료' : 'Contract deployed'}
            </div>
            <div style={{ fontSize:11, color:C.t3, marginBottom:4 }}>
              {lang==='ko' ? '볼트 주소' : 'Vault address'}:
              <span style={{ color:C.ac, fontFamily:mono, marginLeft:4, wordBreak:'break-all' }}>{vault?.addr}</span>
            </div>
            <div style={{ fontSize:11, color:C.t3, marginBottom:6 }}>
              {lang==='ko' ? 'Tx 해시' : 'Tx hash'}:
              <span style={{ color:C.t2, fontFamily:mono, marginLeft:4 }}>{deployTxHash.slice(0,10)}...{deployTxHash.slice(-8)}</span>
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <a href={`https://sepolia.basescan.org/tx/${deployTxHash}`} target="_blank" rel="noreferrer"
                style={{ fontSize:12, color:C.ac, textDecoration:'none', fontWeight:600 }}>
                Basescan Tx ↗
              </a>
              <a href={`https://sepolia.basescan.org/address/${vault?.addr}#code`} target="_blank" rel="noreferrer"
                style={{ fontSize:12, color:C.p, textDecoration:'none', fontWeight:600 }}>
                {lang==='ko' ? '컨트랙트 코드 ↗' : 'Contract Code ↗'}
              </a>
            </div>
          </Card>
        )}
        <Card style={{ background:C.s2 }}>
          <Label>{t.vaultLink}</Label>
          <div style={{ padding:"11px 13px", background:C.bg, borderRadius:10, fontSize:12, color:C.ac, fontFamily:mono, wordBreak:"break-all", marginBottom:12, border:`1px solid ${C.bd}` }}>{link}</div>
          <Btn on={copyLink}>{copied?t.copied:t.copyLink}</Btn>
        </Card>
        <Label>{all ? t.allJoined : t.joined.replace("{n}",jc).replace("{t}",totalSlots)}</Label>
        <div style={{ height:4, background:C.bd, borderRadius:2, marginBottom:14 }}><div style={{ height:"100%", width:`${(jc/totalSlots)*100}%`, background:C.ok, borderRadius:2, transition:"width 0.5s" }} /></div>
        {members.map((m,i) => <MemberRow key={i} m={m} i={i} showDep={false} />)}
        {!all ? <div style={{marginTop:12}}><div style={{textAlign:"center",color:C.t4,fontSize:12,marginBottom:10}}>{t.waiting.replace("{n}",totalSlots-jc)}</div><Btn secondary on={simJoin}>{t.simJoin}</Btn></div>
        : <Btn on={()=>go(SCR.DEPOSIT)} style={{marginTop:12}}>{t.proceed}</Btn>}
      </Wrap>
    );
  }

  // DEPOSIT
  if (scr === SCR.DEPOSIT) {
    const dc = members.filter(m=>m.dep).length;
    const allD = dc===members.length;
    return (
      <Wrap><Back to={SCR.HOME} /><VaultHead />
        <Title>{t.depositTitle}</Title><Desc>{t.depositDesc}</Desc>
        {!myDep && (
          <Card style={{ background:`linear-gradient(135deg, ${C.p}06, ${C.s1})`, border:`1px solid ${C.p}20`, textAlign:"center", padding:24 }}>
            <div style={{ fontSize:10, color:C.t4, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>{t.yourShare}</div>
            <div style={{ fontSize:32, fontWeight:800, fontFamily:font, marginBottom:4 }}>{fmt(vault.dep)}</div>
            <div style={{ fontSize:12, color:C.t3, marginBottom:20 }}>USDC</div>
            {txStatus && (
              <div style={{
                fontSize:11,
                color: txStatus.includes('Error')||txStatus.includes('오류') ? C.er : txStatus.includes('completed')||txStatus.includes('완료') ? C.ok : C.wn,
                marginBottom:10,
                padding:'8px',
                background: txStatus.includes('Error')||txStatus.includes('오류') ? '#EF444410' : txStatus.includes('completed')||txStatus.includes('완료') ? '#34D39910' : '#FBBF2410',
                borderRadius:8
              }}>
                {txStatus}
              </div>
            )}
            <Btn on={doDeposit} disabled={deping}>
              {deping
                ? (depositStep === 'approving'
                    ? (lang==='ko' ? 'USDC 승인 중...' : 'Approving USDC...')
                    : (lang==='ko' ? '입금 중...' : 'Depositing...'))
                : t.depositBtn.replace("{a}", fmt(vault.dep))}
            </Btn>
          </Card>
        )}
        {myDep && <Card style={{ background:C.okG, border:`1px solid ${C.ok}20`, textAlign:"center", padding:14 }}><span style={{ color:C.ok, fontSize:13, fontWeight:600 }}>{t.depositDone}</span></Card>}
        <Label>{t.depositProgress} ({dc}/{members.length})</Label>
        <div style={{ height:4, background:C.bd, borderRadius:2, marginBottom:14 }}><div style={{ height:"100%", width:`${(dc/members.length)*100}%`, background:C.ok, borderRadius:2, transition:"width 0.5s" }} /></div>
        {members.map((m,i) => <MemberRow key={i} m={m} i={i} showDep={true} />)}
        {myDep && !allD && <Btn secondary on={simDep} style={{marginTop:12}}>{t.simDeposit}</Btn>}
        {allD && <Btn green on={()=>go(SCR.ACTIVE)} style={{marginTop:12}}>{t.goActive}</Btn>}
      </Wrap>
    );
  }

  // ACTIVE
  if (scr === SCR.ACTIVE) {
    const onChainBalance = chainInfo ? Number(chainInfo.balance) / 1e6 : null;
    const onChainClaimed = chainInfo ? chainInfo.monthsClaimed : null;
    const tp   = pays.length * vault.price;
    const rem  = onChainBalance !== null ? onChainBalance : (vault.price * vault.dur - tp);
    const prog = ((onChainClaimed !== null ? onChainClaimed : pays.length) / vault.dur) * 100;
    const canPay   = curMo <= vault.dur;
    const isCreator = !!(chainInfo && address && chainInfo.creator?.toLowerCase() === address?.toLowerCase());
    const proofBusy = reclaimStatus === 'loading' || reclaimStatus === 'qr' || reclaimStatus === 'submitting' || isProofClaiming;
    const isUnlocked = unlockInfo.unlockedMonth >= curMo;
    const txIsError = txStatus.includes('Error') || txStatus.includes('오류') || txStatus.includes('실패');
    const txIsSuccess = txStatus.includes('completed') || txStatus.includes('완료');
    return (
      <Wrap><Back to={SCR.HOME} /><VaultHead />
        <Card style={{ textAlign:"center", padding:"26px 20px", background:`linear-gradient(180deg, ${C.s2}, ${C.s1})` }}>
          <div style={{ fontSize:10, color:C.t4, textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:10 }}>{t.balance}</div>
          <div style={{ fontSize:34, fontWeight:800, fontFamily:font, marginBottom:4 }}>{fmt(rem)} <span style={{ fontSize:14, color:C.t4 }}>USDC</span></div>
          <div style={{ fontSize:12, color:C.t2, marginBottom:16 }}>{t.monthProgress.replace("{c}",Math.min(curMo,vault.dur)).replace("{t}",vault.dur)}</div>
          <div style={{ height:6, background:C.bd, borderRadius:3 }}><div style={{ height:"100%", width:`${prog}%`, background:`linear-gradient(90deg, ${vault.color}, ${C.p})`, borderRadius:3, transition:"width 0.5s" }} /></div>
        </Card>
        <ReimbursementGuideUI />
        <Card style={{ background:`linear-gradient(135deg, ${C.p}08, ${C.s1})`, border:`1px solid ${C.p}20`, padding:'16px 18px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:8 }}>
            <div>
              <div style={{ fontSize:10, color:C.t4, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:3 }}>{t.unlockedNow}</div>
              <div style={{ fontSize:18, fontWeight:800, color:isUnlocked ? C.ok : C.wn }}>
                {unlockInfo.unlockedMonth > 0 ? `${Math.min(unlockInfo.unlockedMonth, vault.dur)} / ${vault.dur}` : `0 / ${vault.dur}`}
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:10, color:C.t4, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:3 }}>{t.lockedUntil}</div>
              <div style={{ fontSize:12, color:C.t2 }}>{formatUnlockTime(unlockInfo.unlockTime)}</div>
            </div>
          </div>
          <div style={{ fontSize:12, color:C.t2, lineHeight:1.5 }}>{t.claimHint}</div>
        </Card>
        <div style={{ display:"flex", gap:9, marginBottom:14 }}>
          {[[t.collected, fmt(vault.dep*vault.nMem), C.ok],[t.paid, fmt(tp), C.wn]].map(([l,v,c],i) => (
            <Card key={i} style={{ flex:1, textAlign:"center", marginBottom:0, padding:13 }}>
              <div style={{ fontSize:10, color:C.t4, marginBottom:3, textTransform:"uppercase", letterSpacing:"0.5px" }}>{l}</div>
              <div style={{ fontSize:16, fontWeight:700, color:c }}>{v}</div>
            </Card>
          ))}
        </div>
        <Label>{t.schedule}</Label>
        {pays.length===0 ? <Card style={{ textAlign:"center", padding:18 }}><span style={{ color:C.t4, fontSize:12 }}>{t.noPayments}</span></Card>
        : pays.map((p,i) => (
          <Card key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7, padding:"13px 15px" }}>
            <div><div style={{ fontSize:13, fontWeight:600 }}>Month {p.mo}</div><div style={{ fontSize:10, color:C.t4, fontFamily:mono }}>{p.tx}</div></div>
            <div style={{ textAlign:"right" }}><div style={{ fontSize:14, fontWeight:700, color:C.ok }}>{fmt(p.amt)}</div><div style={{ fontSize:10, color:C.t4 }}>{t.paymentTo}</div></div>
          </Card>
        ))}
        {txStatus && (
          <div style={{
            fontSize:11,
            color: txIsError ? C.er : txIsSuccess ? C.ok : C.wn,
            textAlign:'center',
            marginBottom:8,
            padding:'8px 12px',
            background: txIsError ? '#EF444410' : txIsSuccess ? '#34D39910' : '#FBBF2410',
            borderRadius:8
          }}>
            {txStatus}
          </div>
        )}
        {canPay && (
          <>
            {isCreator && (
              <Btn
                on={doProveAndClaim}
                disabled={proofBusy || monthStatus.claimed || !isUnlocked}
                style={{ marginTop:4, marginBottom:10 }}
              >
                {reclaimStatus === 'submitting' || isProofClaiming
                  ? t.submittingProofClaim
                  : reclaimStatus === 'loading' || reclaimStatus === 'qr'
                    ? t.provingSubscription
                    : t.proveAndClaim}
              </Btn>
            )}
            {isCreator && (
              <Card style={{ border:`1px solid ${C.p}30`, background:`${C.p}08`, marginTop:10, marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.p, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8 }}>
                  ZK Proof · Reclaim Protocol
                </div>
                {reclaimStatus === 'qr' && reclaimUrl && (
                  <div style={{ textAlign:'center', marginBottom:12 }}>
                    <div style={{ fontSize:11, color:C.t3, marginBottom:10 }}>{t.scanQr}</div>
                    <div style={{ background:'#fff', display:'inline-block', padding:10, borderRadius:10 }}>
                      <QRCode value={reclaimUrl} size={160} />
                    </div>
                  </div>
                )}
                {reclaimStatus === 'loading' && (
                  <div style={{ fontSize:12, color:C.t2, textAlign:'center' }}>{t.provingSubscription}</div>
                )}
                {reclaimStatus === 'submitting' && (
                  <div style={{ fontSize:12, color:C.wn, textAlign:'center' }}>{t.submittingProofClaim}</div>
                )}
                {reclaimStatus === 'done' && (
                  <div style={{ fontSize:12, color:C.ok, textAlign:'center' }}>{t.proofVerified}</div>
                )}
              </Card>
            )}
            <div style={{ fontSize:11, color:C.t3, textAlign:'center', marginBottom:6 }}>
              {monthStatus.callerHasApproved
                ? t.alreadyVoted
                : t.approvedLabel.replace('{a}', monthStatus.approvals).replace('{t}', vault.nMem || chainInfo?.nMembers || '?')}
            </div>
            <Btn
              on={doPay}
              disabled={releasing || isApproving || monthStatus.callerHasApproved || monthStatus.claimed || !isUnlocked}
              secondary
              style={{ marginTop:0, marginBottom:0 }}
            >
              {releasing || isApproving ? t.releasing : t.releaseBtn.replace("{n}", curMo)}
            </Btn>
          </>
        )}
        {!canPay && (<>
          <Card style={{ background:C.okG, border:`1px solid ${C.ok}20`, textAlign:"center", marginTop:8, padding:22 }}>
            <div style={{ fontSize:20, marginBottom:6 }}>✓</div>
            <div style={{ color:C.ok, fontSize:16, fontWeight:700, marginBottom:4 }}>{t.complete}</div>
            <div style={{ color:C.t2, fontSize:12, lineHeight:1.5 }}>{t.completeDesc}</div>
          </Card>
          <Btn secondary on={()=>go(SCR.HOME)} style={{marginTop:10}}>{t.newVault}</Btn>
        </>)}
      </Wrap>
    );
  }

  // JOIN
  if (scr === SCR.JOIN) {
    const isCreatorJoining = !!(joinInfo && address && joinInfo.creator?.toLowerCase() === address.toLowerCase());
    const isAlreadyMember = isCreatorJoining;
    const needsActivation = authed && accountDeployed === false; // counterfactual smart account
    const accountChecking = authed && accountDeployed === null; // still loading

    const handleActivate = async () => {
      setActivating(true);
      setTxStatus(lang==='ko' ? '계정 활성화 중...' : 'Activating account...');
      try {
        // Send 0-value tx to self to trigger counterfactual account deployment
        const tx = await sendTransactionAsync({
          to: address,
          value: 0n,
          chainId: CHAIN_ID,
        });
        await new Promise(r => setTimeout(r, 3000)); // wait for indexing
        setActivateDone(true);
        setTxStatus(lang==='ko' ? '활성화 완료! 이제 Join을 눌러주세요.' : 'Activated! Now click Join.');
      } catch (e) {
        console.error('activate error:', e);
        setTxStatus((lang==='ko'?'활성화 오류: ':'Activate error: ') + (e.shortMessage || e.message || String(e)));
      } finally {
        setActivating(false);
      }
    };

    const handleJoin = async () => {
      if (!joinAddr) return;
      if (!authed) { setTxStatus(lang==='ko'?'오류: 먼저 로그인하세요':'Error: Please log in first'); return; }
      if (isAlreadyMember) { setTxStatus(lang==='ko'?'오류: 이 주소는 이미 볼트 멤버입니다':'Error: This address is already a member'); return; }
      if (!onRightChain) { setTxStatus(lang==='ko'?'오류: Base Sepolia 네트워크로 전환하세요':'Error: Switch to Base Sepolia'); return; }
      if (ethBalance !== undefined && ethBalance.value === 0n) {
        setTxStatus(lang==='ko'
          ? '오류: 가스비 없음. 파우셋에서 ETH를 받으세요. (주소: ' + address + ')'
          : 'Error: No ETH for gas. Get faucet ETH. (address: ' + address + ')');
        return;
      }
      setJoining(true);
      setTxStatus(lang==='ko'?'볼트 참여 중...':'Joining vault...');
      try {
        await joinOnChainDirect();
        // Load vault state
        const ji = joinInfo;
        if (ji) {
          setVaultAddr(joinAddr);
          setVault({
            name: ji.name, price: Number(ji.monthlyPrice)/1e6,
            perPerson: Number(ji.monthlyPrice)/1e6/ji.nMembers,
            dep: Number(ji.depositPerPerson)/1e6,
            nMem: ji.nMembers, dur: ji.duration,
            color: '#6366f1', icon: '◈', addr: joinAddr,
          });
          setMembers([{ addr: address, name: t.you, dep: false, joined: true, creator: false }]);
        }
        setMyDep(false); setPays([]); setCurMo(1);
        setTxStatus('');
        go(SCR.DEPOSIT);
      } catch (e) {
        // Deep-extract the real bundler error (Reown wraps it several layers deep)
        const allProps = Object.getOwnPropertyNames(e);
        console.error('[SubShare] join error raw:', e);
        console.error('[SubShare] join error json:', JSON.stringify(e, allProps));
        console.error('[SubShare] cause chain:',
          'L1:', e.cause?.message,
          'L2:', e.cause?.cause?.message,
          'L3:', e.cause?.cause?.cause?.message,
          'details:', e.details,
          'metaMessages:', e.metaMessages,
        );
        const bundlerMsg =
          e.cause?.cause?.message ||
          e.cause?.cause?.cause?.message ||
          e.cause?.reason ||
          e.details ||
          null;
        const surfaceMsg = e.shortMessage || e.message || String(e);
        const msg = bundlerMsg || surfaceMsg;

        const isUnknown = surfaceMsg.toLowerCase().includes('unknown error');
        let display = msg;
        if (isUnknown && !bundlerMsg) {
          // No bundler detail found — guess based on context
          if (accountDeployed === false) {
            display = lang==='ko'
              ? '지갑 활성화가 필요합니다. 위의 "지갑 활성화" 버튼을 먼저 눌러주세요.'
              : 'Wallet activation required. Tap "Activate Wallet" above first.';
          } else if (!ethBalance || ethBalance.value === 0n) {
            display = lang==='ko'
              ? '가스비 부족. 파우셋에서 ETH를 받으세요: ' + address
              : 'No gas ETH. Get faucet ETH: ' + address;
          } else {
            display = lang==='ko'
              ? '트랜잭션 실패. 브라우저 콘솔(F12)에서 실제 오류를 확인하세요.'
              : 'Transaction failed. Check browser console (F12) for details.';
          }
        }
        setTxStatus((lang==='ko'?'오류: ':'Error: ') + display);
      } finally {
        setJoining(false);
      }
    };
    return (
      <Wrap><Back to={SCR.HOME} />
        <Title>{t.joinTitle}</Title><Desc>{t.joinDesc}</Desc>
        <Label>{t.vaultAddr}</Label>
        <Input value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="0x..." style={{marginBottom:12}} />
        {joinInfo && (
          <Card style={{ marginBottom:14, border:`1px solid ${C.p}30` }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>{joinInfo.name}</div>
            {[
              [lang==='ko'?'월 구독료':'Monthly', `$${(Number(joinInfo.monthlyPrice)/1e6).toFixed(2)}`],
              [lang==='ko'?'인원':'Members', `${joinInfo.depositedCount}/${joinInfo.nMembers}`],
              [lang==='ko'?'기간':'Duration', `${joinInfo.duration}${t.mo}`],
              [lang==='ko'?'내 선입금':'My deposit', `$${(Number(joinInfo.depositPerPerson)/1e6).toFixed(2)} USDC`],
            ].map(([l,v],i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0', borderTop: i>0?`1px solid ${C.bd}`:'none' }}>
                <span style={{ color:C.t3 }}>{l}</span><span style={{ fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </Card>
        )}
        {!joinAddr && joinCode.length > 3 && (
          <div style={{ fontSize:11, color:C.wn, marginBottom:10 }}>{lang==='ko'?'유효한 0x 주소를 입력하세요':'Enter a valid 0x address'}</div>
        )}
        {/* Current account info for debugging */}
        {joinInfo && authed && (
          <div style={{ fontSize:11, color:C.t4, background:C.s2, borderRadius:8, padding:'7px 10px', marginBottom:10, fontFamily:mono, wordBreak:'break-all' }}>
            {lang==='ko' ? '내 주소: ' : 'My address: '}{address}
          </div>
        )}
        {/* Counterfactual account activation required */}
        {needsActivation && !activateDone && (
          <div style={{ background:'#6366f115', border:`1px solid ${C.p}40`, borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
            <div style={{ fontSize:12, color:C.p, fontWeight:700, marginBottom:4 }}>
              {lang==='ko' ? '⚡ 지갑 첫 사용 — 활성화 필요' : '⚡ First use — activation required'}
            </div>
            <div style={{ fontSize:11, color:C.t2, marginBottom:10, lineHeight:1.5 }}>
              {lang==='ko'
                ? '새 Reown 임베디드 지갑은 첫 트랜잭션 전에 온체인 활성화가 필요해요. 아래 버튼을 누르면 자동으로 처리돼요.'
                : 'New Reown embedded wallets need on-chain activation before the first tx. Tap below to activate.'}
            </div>
            <button onClick={handleActivate} disabled={activating || !hasGas}
              style={{ fontSize:12, fontWeight:700, padding:'8px 16px', borderRadius:8,
                background: activating ? C.s2 : C.p, color: activating ? C.t3 : '#fff',
                border:'none', cursor: activating ? 'not-allowed' : 'pointer', width:'100%' }}>
              {activating
                ? (lang==='ko' ? '활성화 중...' : 'Activating...')
                : (lang==='ko' ? '지갑 활성화' : 'Activate Wallet')}
            </button>
          </div>
        )}
        {/* Creator cannot join again */}
        {isCreatorJoining && (
          <div style={{ background:'#EF444415', border:'1px solid #EF444430', borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
            <div style={{ fontSize:12, color:C.er, fontWeight:700, marginBottom:4 }}>
              {lang==='ko' ? '⚠️ 이 볼트의 선결제자입니다' : '⚠️ You are this vault’s payer'}
            </div>
            <div style={{ fontSize:11, color:C.t2 }}>
              {lang==='ko'
                ? '선결제자는 이미 멤버입니다. 다른 계정으로 로그인해 팀원으로 참여하세요.'
                : 'The payer is already a member. Log in with a different account to join as a teammate.'}
            </div>
          </div>
        )}
        {/* Chain check for join */}
        {joinAddr && !onRightChain && (
          <div style={{ background:'#FBBF2415', border:'1px solid #FBBF2440', borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
            <div style={{ fontSize:12, color:C.wn, fontWeight:600, marginBottom:6 }}>
              {lang==='ko' ? '⚠️ Base Sepolia로 네트워크 전환 필요' : '⚠️ Switch to Base Sepolia'}
            </div>
            <button onClick={() => switchChain({ chainId: CHAIN_ID })}
              style={{ fontSize:12, fontWeight:600, padding:'7px 14px', borderRadius:8, background:C.wn, color:'#000', border:'none', cursor:'pointer' }}>
              Switch to Base Sepolia
            </button>
          </div>
        )}
        {joinAddr && onRightChain && ethBalance !== undefined && !hasGas && (
          <div style={{ background:'#EF444415', border:'1px solid #EF444430', borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
            <div style={{ fontSize:12, color:C.er, fontWeight:600, marginBottom:4 }}>
              {lang==='ko' ? '⚠️ 가스비 없음 (Base Sepolia ETH 필요)' : '⚠️ No gas (need Base Sepolia ETH)'}
            </div>
            <div style={{ fontSize:11, color:C.t2 }}>
              <a href={`https://learnweb3.io/faucets/base_sepolia${address ? `?address=${address}` : ''}`} target="_blank" rel="noreferrer"
                style={{ color:C.ac, textDecoration:'underline' }}>LearnWeb3 Faucet</a>
              {lang==='ko' ? '에서 무료 ETH를 받으세요' : ' — get free ETH'}
            </div>
          </div>
        )}
        {txStatus && <div style={{ fontSize:11, color: txStatus.startsWith('볼트')||txStatus.startsWith('Join') ? C.wn : C.er, marginBottom:10, padding:'8px', background: txStatus.startsWith('볼트')||txStatus.startsWith('Join') ? '#FBBF2410' : '#EF444410', borderRadius:8, wordBreak:'break-all' }}>{txStatus}</div>}
        <Btn disabled={!joinAddr || joining || isJoinDirect || !onRightChain || isAlreadyMember || (ethBalance !== undefined && ethBalance.value === 0n) || (needsActivation && !activateDone) || accountChecking} on={handleJoin}>
          {joining || isJoinDirect ? (lang==='ko'?'참여 중...':'Joining...') : accountChecking ? (lang==='ko'?'계정 확인 중...':'Checking account...') : t.joinBtn}
        </Btn>
      </Wrap>
    );
  }

  // MY VAULTS
  if (scr === SCR.MYVAULTS) {
    const goToVault = (v) => {
      setVaultAddr(v.addr);
      setVault({
        name: v.name, price: Number(v.monthlyPrice)/1e6,
        perPerson: Number(v.monthlyPrice)/1e6/v.nMembers,
        dep: Number(v.depositPerPerson)/1e6,
        nMem: v.nMembers, dur: v.duration,
        color: '#6366f1', icon: '◈', addr: v.addr,
      });
      setMembers([{ addr: address, name: t.you, dep: false, joined: true, creator: v.isCreator }]);
      setMyDep(false); setPays([]); setCurMo(1);
      if (v.isActive) go(SCR.ACTIVE);
      else if (v.isCreator) go(SCR.INVITE);
      else go(SCR.DEPOSIT);
    };

    return (
      <Wrap>
        <Back to={SCR.HOME} />
        <Title>{lang==='ko' ? '내 볼트' : 'My Vaults'}</Title>
        <Desc>{lang==='ko' ? '내가 참여 중인 구독 볼트 목록이에요.' : 'All subscription vaults you are part of.'}</Desc>
        {myVaultsLoading && (
          <div style={{ textAlign:'center', color:C.t4, fontSize:13, padding:'40px 0' }}>
            {lang==='ko' ? '체인에서 불러오는 중...' : 'Loading from chain...'}
          </div>
        )}
        {!myVaultsLoading && myVaults.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 0' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>◈</div>
            <div style={{ fontSize:14, color:C.t3, marginBottom:6 }}>
              {lang==='ko' ? '아직 참여한 볼트가 없어요' : 'No vaults yet'}
            </div>
            <div style={{ fontSize:12, color:C.t4, marginBottom:20 }}>
              {lang==='ko' ? '볼트를 만들거나 초대 링크로 참여해보세요.' : 'Create a vault or join one via invite link.'}
            </div>
            <Btn on={() => primeClaudeDemo(SCR.ONBOARD)} style={{ marginBottom:8 }}>{t.createVault}</Btn>
            <Btn secondary on={() => go(SCR.JOIN)}>{t.joinVault}</Btn>
          </div>
        )}
        {myVaults.map((v, i) => {
          const monthly = Number(v.monthlyPrice)/1e6;
          const dep = Number(v.depositPerPerson)/1e6;
          const bal = Number(v.balance)/1e6;
          const statusColor = v.isActive ? C.ok : C.wn;
          const statusLabel = v.isActive
            ? (lang==='ko' ? '활성' : 'Active')
            : (lang==='ko' ? '대기중' : 'Pending');
          return (
            <Card key={v.addr} style={{ marginBottom:12, cursor:'pointer', border:`1px solid ${v.isActive ? C.ok+'30' : C.bd}` }}
              onClick={() => goToVault(v)}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, marginBottom:3 }}>{v.name}</div>
                  <div style={{ fontSize:11, color:C.t4 }}>
                    {v.isCreator ? (lang==='ko'?'👑 선결제자':'👑 Payer') : (lang==='ko'?'👤 팀원':'👤 Teammate')}
                    {' · '}{v.nMembers}{lang==='ko'?'인':'p'} · {v.duration}{t.mo}
                  </div>
                </div>
                <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:6, background:`${statusColor}15`, color:statusColor }}>
                  {statusLabel}
                </span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {[
                  [lang==='ko'?'월 구독료':'Monthly', `$${monthly.toFixed(2)}`],
                  [lang==='ko'?'선입금':'Deposit', `$${dep.toFixed(2)}`],
                  [lang==='ko'?'볼트 잔액':'Balance', `$${bal.toFixed(2)}`],
                ].map(([l, val]) => (
                  <div key={l} style={{ background:C.s2, borderRadius:8, padding:'8px 10px' }}>
                    <div style={{ fontSize:10, color:C.t4, marginBottom:2 }}>{l}</div>
                    <div style={{ fontSize:13, fontWeight:700 }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:10, fontSize:11, color:C.t3, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontFamily:mono }}>{v.addr.slice(0,8)}...{v.addr.slice(-6)}</span>
                <span style={{ color:C.p, fontWeight:600 }}>{lang==='ko'?'열기 →':'Open →'}</span>
              </div>
            </Card>
          );
        })}
        {!myVaultsLoading && myVaults.length > 0 && (
          <button onClick={refreshMyVaults}
            style={{ width:'100%', padding:'10px', marginTop:4, background:'none', border:`1px solid ${C.bd}`, borderRadius:10, color:C.t3, fontSize:12, cursor:'pointer', fontFamily:font }}>
            {lang==='ko' ? '새로고침' : 'Refresh'}
          </button>
        )}
      </Wrap>
    );
  }

  return null;
}
