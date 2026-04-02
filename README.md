# Sub-Share

**Trustless subscription sharing for teams.**

Split costly AI tools (Claude Team, ChatGPT Team, Cursor Business, etc.) with your project team — no trust needed. Smart contracts handle the money.

## Problem

When developers form project teams online (hackathons, open source, freelance), they often need shared access to expensive AI subscriptions. But:

- One person must pay the full amount upfront
- No guarantee others will pay their share
- No way to prevent someone from disappearing mid-commitment
- Cross-border payments add friction (currency conversion, fees)
- Existing tools (Toss, KakaoPay, Splitwise) assume trust between users

## Solution

Sub-Share uses smart contract vaults to enable trustless subscription cost-sharing:

1. **Create a Vault** — Choose subscription, set team size & commitment period
2. **Invite Members** — Share link. Anyone joins via social login (Google/Discord/GitHub) or wallet
3. **Everyone Deposits** — Each member locks their share (USDC) upfront in the contract
4. **Auto-Pay via Virtual Card** — A shared virtual card pays the subscription directly from the vault. No one touches the funds.

### Key Innovation: No Admin Holds the Money

The vault issues a shared virtual card linked directly to the smart contract. Subscription fees are charged to the card automatically — no intermediary, no trust required. This eliminates the "admin rug-pull" risk entirely.

## Tech Stack

- **Frontend**: React (Claude Artifacts prototype)
- **Auth**: Reown AppKit (social login + Account Abstraction)
- **Smart Contract**: Solidity (ERC-4337 Smart Accounts, USDC vault)
- **Network**: Base (L2)
- **Payment**: Virtual card integration (Gnosis Pay / Holyheld pattern)

## Features

- 🌐 Bilingual UI (한국어 / English)
- 🔐 Social login — no wallet needed (Google, Discord, GitHub)
- 💳 Virtual card auto-payment — no admin handles funds
- 🔒 Smart contract escrow — funds locked for commitment period
- 🌍 Cross-border ready — USDC eliminates currency friction
- 👥 Multi-sig governance — early exit requires group vote

## Project Structure

```
Sub-Share/
├── src/
│   └── App.jsx          # Main prototype (React component)
├── docs/
│   └── PROJECT_REPORT.md # 프로젝트 보고서 (지속 업데이트)
├── README.md
└── .gitignore
```

## Context

This project was built as part of the **ShardLab Product Intern Challenge** (48-hour deadline).

ShardLab is the R&D innovation arm of Hashed, focused on solving real-world problems with blockchain technology. Sub-Share directly aligns with this mission — using Web3 infrastructure (smart contracts, account abstraction, stablecoin payments) to solve a real cost-sharing problem that existing Web2 tools can't address.

## Development

The prototype is built as a React component designed to run in Claude Artifacts or any React environment.

```bash
# Clone
git clone https://github.com/blanco-3/Sub-Share.git

# The main prototype is in src/App.jsx
# Can be imported into any React project or viewed in Claude Artifacts
```

## License

MIT
