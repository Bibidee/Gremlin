# Gremlin

A shared token ledger (GREM) where the only way to move money is to talk a mischievous AI banker into it.
A GenLayer Intelligent Contract dApp — one contract, one static frontend, no database, no backend service.

Built from the plan in `GREMLIN_MASTER_PLAN.md`. Network: GenLayer StudioNet, chain id `61999`.

## Layout

```
contracts/gremlin_bank.py       Intelligent Contract (GenVM, Python)
tests/direct/                   Mocked, in-memory unit tests (pytest via genlayer-test)
tests/integration/               Real consensus/LLM tests against StudioNet or GLSim (gltest)
frontend/                        Next.js (App Router) + TypeScript static-exportable site (genlayer-js)
```

## Contract

```bash
pip install -r requirements.txt
genvm-lint check contracts/gremlin_bank.py --json
pytest tests/direct/ -v
gltest tests/integration/ -v -s   # needs a running network
```

Deploy to StudioNet with `genlayer deploy` (or via the Studio UI at studio.genlayer.com), then note the
deployed address for the frontend.

### Game rules

- `register()` grants a one-time starting balance of 100 GREM.
- `plead(action, target, message)` — action is one of `bless`, `gift`, `steal`, `curse`, `roast_tax`.
  The Gremlin (an LLM persona) judges the plea and returns `grant` / `partial` / `deny` plus a roast and
  an amount, validated for shape by every validator (never `strict_eq` on LLM text) and hard-capped by
  contract code at `MAX_ACTION_AMOUNT = 50` GREM per plea, with debits always clamped to the target's
  actual balance.

## Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_GREMLIN_CONTRACT_ADDRESS to your deployed contract
npm run dev
```

Three routes:

- `/` — landing page: pitch, rules disclaimer, "how it works", a 5-entry feed teaser.
- `/arena` — the actual play screen: ledger sidebar, plead form, live status strip, full feed.
- `/feed` — the full chaos feed on its own page.

A shared `Nav` (in the root layout) carries the wallet-connect control and active-route highlighting
across all three.

Wallet connection is **injected-wallet only** (MetaMask or Rabby) — no burner/dev accounts. The connect
button requests `eth_requestAccounts`, switches the wallet to StudioNet directly via
`wallet_switchEthereumChain`/`wallet_addEthereumChain`, then hands the injected provider to
`createClient({ chain: studionet, account, provider })` so viem signs through the wallet. Note this
deliberately skips genlayer-js's `client.connect()` helper — that function also installs a MetaMask-only
signing Snap (`wallet_getSnaps`/`wallet_requestSnaps`), which errors on Rabby and other non-MetaMask
wallets and isn't needed once a `provider` is already supplied to `createClient`.

Transaction status is driven by GenLayer's real `TransactionStatus` enum (`PENDING → PROPOSING →
COMMITTING → REVEALING → ACCEPTED → FINALIZED`, or `UNDETERMINED` / `CANCELED`) — the UI never assumes
success just because a transaction hash came back.

## Safety rails baked into the contract

- Fixed per-plea cap regardless of what the LLM proposes.
- Self-targeting guard on `steal` / `curse` / `roast_tax`.
- 280-character plea length bound.
- All debits clamped to the target's actual current balance — balances never go negative.
- Leader raises `gl.vm.UserError` on unparsable LLM output so validators disagree and rotate leader
  rather than agree on garbage.
