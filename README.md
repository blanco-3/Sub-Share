# Sub-Share

**Claude reimbursement for hackathon teams, without awkward chasing.**

Sub-Share is a trust-minimized reimbursement vault for small online teams sharing Claude. One teammate pays the bill first. Everyone else commits funds upfront. The payer gets reimbursed by onchain rules instead of reminders in Discord.

## Problem

When online teammates share a Claude subscription, one person usually pays first and becomes the collector:

- They front the full invoice
- They wait for multiple people to reimburse them
- They have to remind teammates manually
- They carry both financial risk and social discomfort
- Existing apps like Splitwise, Toss, or KakaoPay track who owes what, but they do not enforce commitment

This is especially painful for hackathon teams and short-lived project groups where members may barely know each other.

## Solution

Sub-Share turns reimbursement into a pre-committed flow:

1. **Create a reimbursement vault** for the shared Claude bill
2. **Invite teammates** to join and lock their share upfront in USDC
3. **Pay the Claude invoice offchain** as the designated payer
4. **Claim reimbursement onchain** either through team approval or with a matching Reclaim zkTLS proof

### Why this is better

- The payer no longer depends on repeated follow-ups
- Free-riding gets harder because funds are locked upfront
- The claim rules are explicit and shared by the whole team
- Reclaim proof gives the payer a faster path when they can prove the Claude invoice was actually paid

## Current Prototype Scope

What is implemented:

- React prototype with interactive screens
- Reown AppKit login flow
- Base Sepolia reimbursement vault contract flow
- upfront deposit flow
- monthly approval flow
- Reclaim zkTLS proof claim flow for matching Claude invoices

What is not implemented:

- virtual cards
- automatic offchain subscription payment rails
- final withdrawal/refund logic for any rounding dust

## Tech Stack

- **Frontend**: React + Vite
- **Wallet/Auth**: Reown AppKit
- **Smart Contracts**: Solidity + Foundry
- **Network**: Base Sepolia
- **Payments**: USDC reimbursement vault
- **Proof System**: Reclaim Protocol zkTLS proof verification

## Features

- English/Korean UI
- social login with smart-account onboarding
- onchain vault creation, join, and deposit
- approval-based monthly reimbursement
- proof-based reimbursement acceleration through Reclaim
- demo-safe Claude-focused happy path

## Environment

Frontend `.env`:

```bash
VITE_REOWN_PROJECT_ID=...
VITE_FACTORY_ADDRESS=...
VITE_RECLAIM_APP_SECRET=...
VITE_RECLAIM_PROVIDER_ID=...
```

Foundry `contracts/.env`:

```bash
PRIVATE_KEY=...
RECLAIM_PROVIDER_ID=...
BASESCAN_API_KEY=... # optional
```

## Development

```bash
npm install
cp .env.example .env
cp contracts/.env.example contracts/.env
npm run contracts:build
npm run contracts:test
npm run dev
```

Deploy the updated factory:

```bash
npm run contracts:deploy:factory
```

After deployment, put the new factory address in root `.env` as `VITE_FACTORY_ADDRESS`.

## Context

This project was built for the **ShardLab Product Intern Challenge**.

The product focus is intentionally narrow: not generic bill splitting, but the moment when one hackathon teammate pays the Claude bill first and wants reimbursement without trust-heavy social follow-up.

## License

MIT
