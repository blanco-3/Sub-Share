# Sub-Share

## The Moment

A hackathon team wants to share a paid Claude plan. One teammate buys it first, then has to chase everyone else for reimbursement across DMs, Discord, and different payment apps.

That works when everyone knows each other well. It breaks when the team is temporary, online-first, and loosely trusted.

## Who This Is For

This is for small hackathon or project teams who:

- form online and move fast
- want to share an expensive AI subscription like Claude
- are willing to commit upfront if it removes social friction later

The core user is the teammate who pays first and becomes the collector by default.

## Why I Picked This

Most cost-sharing tools solve calculation, not trust. They tell people who owes what, but they still rely on someone asking for money and someone else choosing to pay.

In this moment, the emotional cost is not just “I might lose money.” It is “I already paid, and now I have to repeatedly ask people I barely know to pay me back.”

That tension felt specific, real, and well-suited to a trust-minimized product.

## What The Prototype Does

Sub-Share is a shared-payback vault for Claude.

The flow:

1. A creator deploys a vault for a Claude plan, team size, and duration.
2. They share an invite link with teammates.
3. Teammates join and deposit their share into the vault.
4. Once the Claude bill is paid, the creator can be reimbursed in two ways:
   - fallback path: all teammates approve the payback
   - roadmap path: a zkTLS proof confirms the billing event and removes creator-side approval risk

The working prototype supports the full vault flow:

- login
- vault creation
- invite link sharing
- join
- deposit
- month-by-month unlock
- approval-based payback
- onchain status and transaction visibility

The zkTLS claim path is wired at the contract and UI level, but live proof generation remains in development because of provider/runtime constraints in Reclaim’s current setup.

## Why This Matters

The product shifts the trust problem.

Before:
- teammates trust the creator not to disappear after collecting money

Now:
- funds are locked first
- payback follows shared rules
- reimbursement is no longer purely social

The remaining risk is on the creator side: if teammates do not approve, the creator is blocked. That is exactly why the zkTLS path matters. It is the next step that turns “I paid first” into something the system can verify directly.

## Tools Used

- GPT-5 Codex for implementation and iteration
- Reown AppKit for social login and embedded wallet flows
- Solidity + Foundry for the vault contracts
- React + Vite for the interactive prototype
- Reclaim Protocol research and provider experiments for zkTLS-based claims

What felt easy:
- moving from problem framing to a working interactive vault flow quickly

What felt hard:
- making multi-account social login testing stable
- getting live zkTLS proof generation production-ready within the challenge window

## What I’d Test First

I would test whether hackathon teams are actually willing to pre-commit funds upfront if it means they never need to chase each other later.

The key question is not “Do people like trustless systems?” It is:

**Will a temporary team accept upfront locked deposits in exchange for eliminating reimbursement friction later?**

If the answer is yes, then the vault is useful even before zkTLS is fully shipped. If the answer is no, then the core assumption behind the product is wrong.
