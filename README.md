# 👹 Gremlin

**A shared token ledger where the only way to move money is to talk a mischievous AI banker into it.**

Gremlin is a GenLayer Intelligent Contract dApp. There is no database, no backend, no admin key. Every balance move — blessing, heist, curse, roast tax, or duel — goes through an LLM jury that reaches on-chain consensus before a single GREM changes hands.

[Live app → the-gremlin.vercel.app](https://the-gremlin.vercel.app)

---

## What it is

You start with 100 GREM. From there, the only way to gain or lose is to plead your case to the Gremlin — an AI persona baked into the contract that reads your message, judges your intent, and returns a verdict. Every validator in the GenLayer network independently runs that same AI judgment. They must agree on the verdict shape before the result is written to state.

No human arbiter. No off-chain oracle. The Gremlin is the only judge, and the Gremlin lives on-chain.

- **Plea system** — submit a `bless`, `gift`, `steal`, `curse`, or `roast_tax` plea with a free-text message; the AI decides if you deserve it
- **Duel mode** — challenge another address; both sides write their lines; the Gremlin picks a winner and moves GREM between them
- **Leaderboard** — three live tables: richest holders, biggest heisters, most-cursed addresses
- **Hall of Fame** — the all-time biggest single verdicts ever handed down
- **Consensus trace** — watch the transaction move through GenLayer's pipeline in real time: Plea received → Gremlin invoked → Validators judging → Consensus reached → Balance settled
- **No off-chain state** — every plea, duel, balance, and roast lives in the contract

---

## How it works

**Playing a plea**

1. Connect MetaMask or Rabby
2. Call `register()` to claim your starting 100 GREM (one-time)
3. Pick an action, enter a target address, and write your best plea
4. GenLayer validators each independently invoke the Gremlin persona with your message
5. They reach AI consensus on verdict (`grant` / `partial` / `deny`), roast text, and GREM amount
6. The verdict is written to contract state — balances update atomically

**Entering a duel**

1. Challenge any registered address with an opening line and a GREM stake
2. The opponent accepts (adding their own line) or declines
3. On acceptance, the Gremlin reads both sides and picks a winner
4. GREM flows from the loser to the winner — capped by contract code regardless of what the AI proposes

---

## The Gremlin's verdict

The contract uses `gl.vm.run_nondet_unsafe` to call the LLM, then validates the response with a custom validator function before any consensus write. The validator checks JSON shape — never `strict_eq` on LLM text — so validators can reach consensus even when the AI words its roast differently each time.

```
plea → LLM prompt (Gremlin persona) → JSON response
     ↓
validator checks: verdict in {grant, partial, deny}, amount is int, roast is str
     ↓
leader raises gl.vm.UserError on unparsable output → validators disagree → leader rotates
     ↓
consensus achieved → balances update
```

The contract hard-caps every amount at `MAX_ACTION_AMOUNT = 50 GREM` in contract code — the LLM can never exceed this regardless of what it decides.

---

## Contract mechanics

| Rule | Detail |
| --- | --- |
| Starting balance | `register()` grants 100 GREM once per address |
| Per-plea cap | 50 GREM maximum regardless of AI verdict |
| Message limit | 280 characters |
| Self-target guard | `steal`, `curse`, `roast_tax` cannot target your own address |
| Balance floor | Debits are always clamped to the target's actual balance — balances never go negative |
| Error handling | `gl.vm.UserError` on unparsable LLM output — validators rotate leader rather than agree on garbage |
| Duel verdicts | `challenger` / `opponent` / `draw` — each validated for shape by every validator |

---

## GenLayer consensus functions

| Function | What GenLayer does |
| --- | --- |
| `plead(action, target, message)` | Gremlin reads the plea, returns verdict + roast + amount; all validators must agree on shape |
| `challenge_duel(opponent, message, amount)` | Opens a duel with a stake and an opening line |
| `accept_duel(duel_id, message)` | Opponent responds; Gremlin judges both sides and picks a winner |
| `get_leaderboard_balances()` | Returns all addresses sorted by current GREM balance |
| `get_leaderboard_heists()` | Returns all addresses sorted by total GREM stolen across all pleas |
| `get_leaderboard_targeted()` | Returns all addresses sorted by times targeted by others |
| `get_recent_pleas(limit)` | Returns the last N plea records with full verdict data |
| `get_recent_duels(limit)` | Returns the last N duel records |

---

## Contract

| Field | Value |
| --- | --- |
| Network | GenLayer StudioNet |
| Chain ID | 61999 |
| RPC | https://studio.genlayer.com/api |
| Explorer | https://explorer-studio.genlayer.com |
| Contract | `0x87b93b1C838e11B0C278a75954e2FB0e2F9b6fd7` |
| Source | `contracts/gremlin_bank.py` |

---

## Tech stack

| Layer | Tech |
| --- | --- |
| Intelligent contract | GenLayer Python — `gl.vm.run_nondet_unsafe`, custom validator functions, `gl.vm.UserError` |
| Frontend | Next.js 14 App Router · TypeScript |
| Web3 | `genlayer-js` 1.1.8 · Viem |
| Wallet | Injected only — MetaMask or Rabby via EIP-6963 discovery |
| Chain switching | `wallet_switchEthereumChain` / `wallet_addEthereumChain` (no MetaMask Snap dependency) |
| Storage | None — all state on-chain |

---

## Pages

| Route | What's there |
| --- | --- |
| `/` | Lair — hero, pitch, rules, how-it-works, live feed teaser |
| `/arena` | Play screen — ledger sidebar, plea form, live consensus trace, full plea feed |
| `/duel` | Duel mode — challenge form, open duels, recent results |
| `/leaderboard` | Three tabs: Richest / Biggest Heisters / Most Roasted |
| `/hall-of-fame` | Top 12 biggest single verdicts of all time |
| `/feed` | Full plea history feed |

---

## Repository

```
contracts/
  gremlin_bank.py           GenLayer Intelligent Contract — all on-chain logic

frontend/
  src/app/                  Next.js App Router pages
    page.tsx                Lair (landing)
    arena/                  Play screen
    duel/                   Duel mode
    leaderboard/            Leaderboard
    hall-of-fame/           Hall of Fame
    feed/                   Full feed
  src/components/
    PleadForm.tsx           Plea submission + live consensus trace
    DuelArena.tsx           Duel challenge and response flow
    Leaderboard.tsx         Three-tab leaderboard
    HallOfFame.tsx          Top verdicts scanner
    ConsensusTrace.tsx      Transaction pipeline visualiser
    Feed.tsx                Live plea feed
    Ledger.tsx              Per-wallet balance panel
    Nav.tsx                 Navigation with active-route highlighting
    WalletBar.tsx           Wallet connect / disconnect
  src/lib/
    genlayerClient.ts       EIP-6963 wallet discovery + StudioNet chain switch
    WalletContext.tsx        Wallet state provider
    useContractWrite.ts     Transaction write hook with GenLayer status tracking
    config.ts               Contract address + game constants

tests/
  direct/                   In-memory unit tests (pytest + genlayer-test)
  integration/              Live consensus tests against StudioNet or GLSim
```

---

## Getting started

```bash
# Contract (optional — already deployed)
pip install -r requirements.txt
genvm-lint check contracts/gremlin_bank.py --json
pytest tests/direct/ -v

# Frontend
cd frontend
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_GREMLIN_CONTRACT_ADDRESS in .env.local
npm run dev
```

Open http://localhost:3000.

Wallet connection is injected only. The app uses EIP-6963 provider discovery to find MetaMask or Rabby without fighting over `window.ethereum`. It switches to StudioNet via `wallet_switchEthereumChain` — deliberately avoiding `client.connect()` which internally calls a MetaMask-only Snap API (`wallet_getSnaps`) that errors on Rabby.

---

## Disclaimer

Gremlin is a game running on a public test network. GREM has no monetary value.
The Gremlin's verdicts are AI-generated and exist purely for entertainment.
