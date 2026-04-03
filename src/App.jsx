import { useState, useEffect } from "react";
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { useDisconnect, useChainId, useSwitchChain, useBalance, useSendTransaction } from 'wagmi'
import { parseUnits } from 'viem'
import { useDeployVault, useVaultDeposit, useVaultJoin, useVaultClaim, useVaultInfo, useMyVaults, useIsAccountDeployed } from './useVault.js'
import { CHAIN_ID } from './contracts.js'

// ─── i18n ───
const T = {
  en: {
    appName: "Sub-Share",
    tagline: "Split subscriptions. Trustlessly.",
    taglineSub: "Share costly AI tools with your project team — no trust needed. Smart contracts handle the money. You focus on building.",
    
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
    createVault: "Create Vault",
    joinVault: "Join Vault",
    back: "← back",
    home: "← home",
    next: "Next",
    
    // Onboard
    onboardTitle: "How it works",
    steps: [
      { icon: "01", title: "Create a vault", desc: "Choose the subscription, set team size and commitment period." },
      { icon: "02", title: "Invite members", desc: "Share the vault link. Anyone can join with social login or wallet." },
      { icon: "03", title: "Everyone deposits", desc: "Each member locks their share upfront. Funds stay in the contract." },
      { icon: "04", title: "Auto-pay on schedule", desc: "A shared virtual card pays the subscription directly. No one touches the funds." },
    ],
    keyFeature: "No admin holds the money",
    keyFeatureDesc: "The vault issues a shared virtual card linked directly to the contract. Subscription fees are charged to the card automatically — no intermediary, no trust required.",
    getStarted: "Create a Vault",
    
    // Create
    selectService: "What are you splitting?",
    selectServiceDesc: "Choose the subscription this vault will manage.",
    perTeam: "/mo per team",
    customAmount: "Enter details manually",
    serviceName: "Service name",
    monthlyPrice: "Monthly price (USD)",
    configVault: "Team setup",
    configDesc: "How many people, and for how long?",
    teamSize: "Team size",
    commitment: "Commitment",
    reviewTitle: "Confirm & deploy",
    reviewDesc: "Review the vault setup before deploying on-chain.",
    monthlyCost: "Monthly subscription",
    members: "Members",
    perPerson: "Per person / month",
    durationLabel: "Commitment",
    depositRequired: "Deposit per person",
    howSafe: "How your money stays safe",
    howSafeDesc: "Funds are held in an audited on-chain smart contract. A shared virtual card is issued to the vault — subscription payments go directly from contract to service provider. No team member ever has access to withdraw funds. Early exit requires group vote.",
    deployBtn: "Deploy Vault",
    deploying: "Deploying on-chain...",
    
    // Invite
    inviteTitle: "Invite your team",
    inviteDesc: "Share this link. Members can join with Google, Discord, or any wallet — no crypto experience needed.",
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
    depositDesc: "Each member deposits their share upfront. Funds are locked in the smart contract until used for subscription payments.",
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
    schedule: "Payment schedule",
    noPayments: "First payment will be auto-charged to the vault's virtual card on the next billing date.",
    releaseBtn: "Execute month {n} payment",
    releasing: "Processing payment...",
    paymentTo: "→ via Virtual Card",
    
    // Virtual Card
    virtualCard: "Vault Virtual Card",
    cardDesc: "This card is linked to the vault contract. Subscription payments are charged directly — no member handles the funds.",
    cardNumber: "Card Number",
    cardExpiry: "Expiry",
    cardStatus: "Status",
    cardActive: "Active · Auto-pay enabled",
    cardLinked: "Linked to: ",
    
    // Complete
    complete: "Vault complete",
    completeDesc: "All scheduled payments executed successfully. Any remaining balance has been returned to each member's wallet.",
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
    admin: "creator",
    you: "You",
    mo: "mo",
    people: "people",
  },
  ko: {
    appName: "Sub-Share",
    tagline: "구독료, 신뢰 없이 나누세요.",
    taglineSub: "프로젝트 팀과 고가 AI 도구를 안전하게 공동 결제하세요. 스마트 컨트랙트가 돈을 관리합니다.",
    
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
    
    createVault: "볼트 만들기",
    joinVault: "볼트 참여하기",
    back: "← 이전",
    home: "← 홈",
    next: "다음",
    
    onboardTitle: "작동 방식",
    steps: [
      { icon: "01", title: "볼트 생성", desc: "구독 서비스를 선택하고, 팀 인원과 기간을 설정하세요." },
      { icon: "02", title: "팀원 초대", desc: "링크를 공유하세요. 소셜 로그인이나 지갑으로 누구나 참여 가능." },
      { icon: "03", title: "전원 입금", desc: "각자 자기 몫을 선입금합니다. 자금은 컨트랙트에 잠깁니다." },
      { icon: "04", title: "자동 결제", desc: "볼트 전용 가상 카드가 구독료를 직접 결제합니다. 아무도 돈에 손대지 않아요." },
    ],
    keyFeature: "누구도 돈을 만지지 않습니다",
    keyFeatureDesc: "볼트가 전용 가상 카드를 발급하고, 구독료가 카드에서 직접 결제됩니다. 관리자도 자금에 접근할 수 없어 먹튀가 구조적으로 불가능합니다.",
    getStarted: "볼트 만들기",
    
    selectService: "어떤 구독을 나누나요?",
    selectServiceDesc: "이 볼트에서 관리할 구독 서비스를 선택하세요.",
    perTeam: "/월 (팀 기준)",
    customAmount: "직접 입력하기",
    serviceName: "서비스 이름",
    monthlyPrice: "월 요금 (USD)",
    configVault: "팀 설정",
    configDesc: "몇 명이서, 얼마 동안 사용하나요?",
    teamSize: "팀 인원",
    commitment: "계약 기간",
    reviewTitle: "확인 및 배포",
    reviewDesc: "온체인 배포 전에 설정을 확인하세요.",
    monthlyCost: "월 구독료",
    members: "인원",
    perPerson: "1인당 / 월",
    durationLabel: "계약 기간",
    depositRequired: "1인당 선입금",
    howSafe: "자금이 안전한 이유",
    howSafeDesc: "자금은 감사받은 온체인 스마트 컨트랙트에 보관됩니다. 볼트 전용 가상 카드가 발급되어 구독료가 컨트랙트에서 서비스 제공자에게 직접 결제됩니다. 어떤 팀원도 자금 인출 권한이 없으며, 중도 탈퇴는 그룹 투표가 필요합니다.",
    deployBtn: "볼트 배포",
    deploying: "온체인 배포 중...",
    
    inviteTitle: "팀원 초대",
    inviteDesc: "이 링크를 공유하세요. Google, Discord, 지갑 등 어떤 방법으로든 참여할 수 있어요.",
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
    depositDesc: "전원이 입금하면 볼트가 활성화됩니다. 자금은 구독 결제에 사용될 때까지 스마트 컨트랙트에 안전하게 잠겨 있습니다.",
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
    schedule: "결제 내역",
    noPayments: "첫 결제는 다음 결제일에 볼트 가상 카드로 자동 청구됩니다.",
    releaseBtn: "{n}개월차 결제 실행",
    releasing: "결제 처리 중...",
    paymentTo: "→ 가상 카드 결제",
    
    virtualCard: "볼트 가상 카드",
    cardDesc: "이 카드는 볼트 컨트랙트에 연결되어 있습니다. 구독료가 카드에서 직접 결제되며, 어떤 멤버도 자금을 만지지 않습니다.",
    cardNumber: "카드 번호",
    cardExpiry: "유효기간",
    cardStatus: "상태",
    cardActive: "활성 · 자동결제 설정됨",
    cardLinked: "연결: ",
    
    complete: "볼트 완료",
    completeDesc: "모든 예정 결제가 성공적으로 완료되었습니다. 잔여 잔액은 각 멤버의 지갑으로 반환됩니다.",
    newVault: "새 볼트 만들기",
    
    joinTitle: "볼트 참여하기",
    joinDesc: "팀원이 공유한 볼트 링크 또는 주소를 붙여넣으세요.",
    vaultAddr: "볼트 링크 또는 주소",
    joinBtn: "참여하기",
    
    statusPending: "대기 중",
    statusActive: "활성",
    statusComplete: "완료",
    admin: "생성자",
    you: "나",
    mo: "개월",
    people: "명",
  },
};

// plans[].price = monthly subscription price (USD) — one shared account, split evenly among nMem
const SVCS = [
  { name: "Claude",         vendor: "Anthropic",    icon: "C",  color: "#D97706",
    plans: [{ label: "Pro", price: 20 }, { label: "Max 5x", price: 100 }, { label: "Max 20x", price: 200 }, { label: "Team", price: 30, note: "min 5 seats" }] },
  { name: "ChatGPT",        vendor: "OpenAI",       icon: "G",  color: "#10A37F",
    plans: [{ label: "Plus", price: 20 }, { label: "Pro", price: 200 }, { label: "Team", price: 30 }] },
  { name: "Cursor",         vendor: "Anysphere",    icon: "Cu", color: "#3B82F6",
    plans: [{ label: "Pro", price: 20 }, { label: "Business", price: 40 }, { label: "Pro+", price: 60 }, { label: "Ultra", price: 200 }] },
  { name: "GitHub Copilot", vendor: "GitHub",       icon: "GH", color: "#E2E8F0",
    plans: [{ label: "Individual", price: 10 }, { label: "Business", price: 19 }, { label: "Enterprise", price: 39 }] },
  { name: "Windsurf",       vendor: "Codeium",      icon: "W",  color: "#06B6D4",
    plans: [{ label: "Pro", price: 15 }, { label: "Teams", price: 30 }] },
  { name: "Perplexity",     vendor: "Perplexity AI",icon: "P",  color: "#A78BFA",
    plans: [{ label: "Pro", price: 20 }, { label: "Max", price: 200 }, { label: "Enterprise", price: 40 }] },
  { name: "Gemini",         vendor: "Google",       icon: "Ge", color: "#4285F4",
    plans: [{ label: "Advanced", price: 20 }] },
  { name: "Grok",           vendor: "xAI",          icon: "Gr", color: "#E2E8F0",
    plans: [{ label: "Premium", price: 16 }, { label: "Premium+", price: 30 }] },
  { name: "Midjourney",     vendor: "Midjourney",   icon: "MJ", color: "#E11D48",
    plans: [{ label: "Basic", price: 10 }, { label: "Standard", price: 30 }, { label: "Pro", price: 60 }, { label: "Mega", price: 120 }] },
  { name: "Runway",         vendor: "Runway",       icon: "R",  color: "#7C3AED",
    plans: [{ label: "Standard", price: 15 }, { label: "Pro", price: 35 }, { label: "Unlimited", price: 95 }] },
  { name: "ElevenLabs",     vendor: "ElevenLabs",   icon: "EL", color: "#F59E0B",
    plans: [{ label: "Starter", price: 5 }, { label: "Creator", price: 22 }, { label: "Pro", price: 99 }, { label: "Scale", price: 330 }] },
  { name: "Notion",         vendor: "Notion",       icon: "N",  color: "#F5F5F0",
    plans: [{ label: "Plus", price: 10 }, { label: "Business", price: 20 }] },
  { name: "Figma",          vendor: "Figma",        icon: "Fi", color: "#F24E1E",
    plans: [{ label: "Professional", price: 15 }, { label: "Organization", price: 45 }, { label: "Enterprise", price: 75 }] },
  { name: "Linear",         vendor: "Linear",       icon: "Li", color: "#5E6AD2",
    plans: [{ label: "Member", price: 8 }, { label: "Plus", price: 16 }] },
  { name: "Vercel",         vendor: "Vercel",       icon: "V",  color: "#E2E8F0",
    plans: [{ label: "Pro", price: 20 }] },
  { name: "Custom",         vendor: "",             icon: "+",  color: "#8B5CF6",
    plans: [] },
];

const SCR = { HOME: 0, ONBOARD: 1, CREATE: 2, INVITE: 3, DEPOSIT: 4, ACTIVE: 5, JOIN: 6, MYVAULTS: 7 };
const fmt = (n) => `$${n.toFixed(2)}`;

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
  const [lang, setLang] = useState("ko");
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
  const { claim, isClaiming }                           = useVaultClaim(vaultAddr);
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

  const t = T[lang];
  const go = (s) => { setFade(false); setTimeout(() => { setScr(s); setFade(true); if (s === SCR.JOIN) setTxStatus(''); }, 100); };

  const doDeploy = async () => {
    setDeploying(true);
    setTxStatus(lang === 'ko' ? '컨트랙트 배포 중...' : 'Deploying contract...');
    const sv = SVCS[selSvc];
    const isCustomSvc = sv.plans.length === 0;
    const nm = isCustomSvc ? cName : `${sv.name} ${sv.plans[selPlan].label}`;
    const pp = isCustomSvc ? parseFloat(cPrice) : sv.plans[selPlan].price;
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
      const msg = e.shortMessage || e.details || e.message || String(e);
      setTxStatus((lang === 'ko' ? '오류: ' : 'Error: ') + msg);
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
      setTxStatus('');
      await refetchInfo();
    } catch (e) {
      setTxStatus((lang === 'ko' ? '오류: ' : 'Error: ') + (e.shortMessage || e.message || String(e)));
    } finally {
      setDeping(false);
    }
  };

  const simJoin = () => { setMembers(p => p.map(m => ({...m, joined:true}))); setTimeout(() => go(SCR.DEPOSIT), 400); };
  const simDep  = () => { setMembers(p => p.map(m => ({...m, dep:true, joined:true}))); setTimeout(() => go(SCR.ACTIVE), 500); };

  const doPay = async () => {
    if (!vaultAddr) return;
    setReleasing(true);
    setTxStatus(lang === 'ko' ? '결제 클레임 중...' : 'Claiming payment...');
    try {
      const tx = await claim(curMo);
      setPays(p => [...p, { mo: curMo, amt: vault.price, tx }]);
      setCurMo(m => m + 1);
      setTxStatus('');
      await refetchInfo();
    } catch (e) {
      setTxStatus((lang === 'ko' ? '오류: ' : 'Error: ') + (e.shortMessage || e.message || String(e)));
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

  const VirtualCardUI = () => (
    <Card style={{ background:`linear-gradient(135deg, #1a1a2e, #16213e)`, border:`1px solid #2a2a4a`, padding:20 }}>
      <div style={{ fontSize:11, color:C.ac, fontWeight:700, textTransform:"uppercase", letterSpacing:"1px", marginBottom:14 }}>{t.virtualCard}</div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div style={{ fontSize:18, fontWeight:700, fontFamily:mono, letterSpacing:"2px", color:C.tx }}>•••• •••• •••• 4821</div>
        <div style={{ fontSize:11, padding:"4px 8px", borderRadius:6, background:"rgba(34,211,238,0.1)", color:C.ac, fontWeight:600 }}>VISA</div>
      </div>
      <div style={{ display:"flex", gap:20, marginBottom:14 }}>
        <div><div style={{ fontSize:10, color:C.t4, marginBottom:2 }}>{t.cardExpiry}</div><div style={{ fontSize:13, fontFamily:mono }}>08/28</div></div>
        <div><div style={{ fontSize:10, color:C.t4, marginBottom:2 }}>{t.cardStatus}</div><div style={{ fontSize:12, color:C.ok }}>{t.cardActive}</div></div>
      </div>
      <div style={{ fontSize:11, color:C.t3 }}>{t.cardLinked}<span style={{ color:C.tx, fontWeight:600 }}>{vault?.name}</span></div>
      <div style={{ marginTop:12, fontSize:11, color:C.t4, lineHeight:1.5, borderTop:`1px solid #2a2a4a`, paddingTop:12 }}>{t.cardDesc}</div>
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
          <Btn on={() => { setCStep(0); setSelSvc(null); go(SCR.ONBOARD); }} style={{ marginBottom:10 }}>{t.createVault}</Btn>
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
      <Btn on={() => { setCStep(0); setSelSvc(null); go(SCR.CREATE); }}>{t.getStarted}</Btn>
    </Wrap>
  );

  // CREATE
  if (scr === SCR.CREATE) {
    const sv = selSvc !== null ? SVCS[selSvc] : null;
    const isCustomSvc = sv?.plans.length === 0;
    const pp = isCustomSvc ? (parseFloat(cPrice)||0) : (selPlan !== null ? sv.plans[selPlan].price : 0);
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
          {SVCS.map((s,i) => {
            const isSelected = selSvc === i;
            const isCustom = s.plans.length === 0;
            const priceRange = s.plans.length > 1
              ? `${fmt(s.plans[0].price)} – ${fmt(s.plans[s.plans.length-1].price)}/mo`
              : s.plans.length === 1 ? `${fmt(s.plans[0].price)}/mo` : t.customAmount;
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
                {isSelected && isCustom && (
                  <div style={{ border:`1px solid ${s.color}50`, borderTop:"none", borderRadius:"0 0 14px 14px", padding:14, background:C.s2, marginBottom:9 }}>
                    <Label>{t.serviceName}</Label><Input value={cName} onChange={e=>setCName(e.target.value)} placeholder="e.g. Linear" style={{marginBottom:10}} />
                    <Label>{t.monthlyPrice}</Label><Input value={cPrice} onChange={e=>setCPrice(e.target.value.replace(/[^0-9.]/g,""))} placeholder="0.00" inputMode="decimal" />
                    {cName&&cPrice && <Btn on={()=>setCStep(1)} style={{marginTop:12}}>{t.next}</Btn>}
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
                <div style={{ fontSize:16, fontWeight:700 }}>{isCustomSvc ? cName : `${sv?.name} ${sv?.plans[selPlan]?.label || ''}`}</div>
                <div style={{ fontSize:12, color:C.t4 }}>{sv?.vendor || 'Custom'} · Subscription Vault</div>
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
    const shareText = lang==='ko' ? `Sub-Share 볼트에 참여하세요: ${vault.name}` : `Join my Sub-Share vault: ${vault.name}`;
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
            {txStatus && <div style={{ fontSize:11, color: txStatus.includes('Error')||txStatus.includes('오류') ? C.er : C.wn, marginBottom:10, padding:'8px', background:'#FBBF2410', borderRadius:8 }}>{txStatus}</div>}
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
    const canPay = curMo <= vault.dur;
    return (
      <Wrap><Back to={SCR.HOME} /><VaultHead />
        <Card style={{ textAlign:"center", padding:"26px 20px", background:`linear-gradient(180deg, ${C.s2}, ${C.s1})` }}>
          <div style={{ fontSize:10, color:C.t4, textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:10 }}>{t.balance}</div>
          <div style={{ fontSize:34, fontWeight:800, fontFamily:font, marginBottom:4 }}>{fmt(rem)} <span style={{ fontSize:14, color:C.t4 }}>USDC</span></div>
          <div style={{ fontSize:12, color:C.t2, marginBottom:16 }}>{t.monthProgress.replace("{c}",Math.min(curMo,vault.dur)).replace("{t}",vault.dur)}</div>
          <div style={{ height:6, background:C.bd, borderRadius:3 }}><div style={{ height:"100%", width:`${prog}%`, background:`linear-gradient(90deg, ${vault.color}, ${C.p})`, borderRadius:3, transition:"width 0.5s" }} /></div>
        </Card>
        <VirtualCardUI />
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
        {txStatus && <div style={{ fontSize:11, color: txStatus.includes('Error')||txStatus.includes('오류') ? C.er : C.wn, textAlign:'center', marginBottom:8, padding:'8px 12px', background: txStatus.includes('Error')||txStatus.includes('오류') ? '#EF444410':'#FBBF2410', borderRadius:8 }}>{txStatus}</div>}
        {canPay && <Btn on={doPay} disabled={releasing||isClaiming} style={{marginTop:8}}>{releasing||isClaiming ? t.releasing : t.releaseBtn.replace("{n}",curMo)}</Btn>}
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
              {lang==='ko' ? '⚠️ 볼트 생성자입니다' : '⚠️ You are the vault creator'}
            </div>
            <div style={{ fontSize:11, color:C.t2 }}>
              {lang==='ko'
                ? '생성자는 이미 멤버입니다. 다른 계정으로 로그인하여 팀원으로 참여하세요.'
                : 'The creator is already a member. Log in with a different account to join as a member.'}
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
            <Btn on={() => { setCStep(0); setSelSvc(null); go(SCR.ONBOARD); }} style={{ marginBottom:8 }}>{t.createVault}</Btn>
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
                    {v.isCreator ? (lang==='ko'?'👑 생성자':'👑 Creator') : (lang==='ko'?'👤 멤버':'👤 Member')}
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
