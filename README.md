# USDC Faucet

Public web faucet that **transfers** dummy USDC from the faucet wallet (`transfer(to, amount)`) to any address (with per-address cooldown).

Stack: React (Vite) + Express + viem + PostgreSQL (production) or SQLite (local).

## Prerequisites

1. Deploy your dummy USDC ERC-20 (standard `transfer` / `balanceOf`).
2. Send enough dummy USDC to the **faucet wallet** (address for `FAUCET_PRIVATE_KEY`).
3. Fund that wallet with **native gas** on your chain.

## Local setup

```bash
cp .env.example .env
# Edit .env with your RPC, contract, and faucet private key

npm install
npm run dev:backend   # terminal 1 — http://localhost:3000
npm run dev:frontend  # terminal 2 — http://localhost:5173 (proxies /api)
```

Production-style single server:

```bash
npm run build
npm start
# Open http://localhost:3000
```

## Environment variables

See [`.env.example`](.env.example). Required:

| Variable | Description |
|----------|-------------|
| `RPC_URL` | HTTPS JSON-RPC for your chain |
| `CHAIN_ID` | EVM chain ID |
| `USDC_CONTRACT_ADDRESS` | Dummy USDC contract |
| `FAUCET_PRIVATE_KEY` | Server-only; never commit |
| `DRIP_AMOUNT` | Human-readable amount per drip |
| `DRIP_DECIMALS` | Usually `6` for USDC-like tokens |
| `COOLDOWN_MINUTES` | Min minutes between drips per address |
| `CORS_ORIGIN` | Frontend origin(s), comma-separated; use your public URL in prod |

Optional: `DATABASE_URL` (Postgres — used on Render), `DATABASE_PATH` (SQLite file when `DATABASE_URL` is unset), `VITE_API_URL` (only if frontend is hosted on another domain).

### Wallet tracking

Each successful drip stores the wallet in a `faucet_drips` table (safe to share one Postgres with other apps):

| Column | Meaning |
|--------|---------|
| `address` | Wallet (unique — **wallets funded** count) |
| `drip_count` | Times this wallet dripped (**total drips** = sum) |
| `first_drip_at` / `last_drip_at` | Timestamps (ms) |
| `last_tx_hash` | Latest transfer tx |

`/api/info` returns `totalWalletsFunded` and `totalDripsSent`. Cooldown still uses `last_drip_at` per address.

## Deploy free on Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/dhavalsaxena-esparkbiz/usdc-faucet)

1. Click **Deploy to Render** (or connect this GitHub repo as a **Blueprint** / Docker web service).
2. In Render, set **secret** env vars only:
   - `RPC_URL`
   - `FAUCET_PRIVATE_KEY`
3. Set `DATABASE_URL` to the same **Internal Database URL** as your other Render app (e.g. bridge-sandbox) if you share one free Postgres instance.
4. `CHAIN_ID`, contract address, drip size, and `CORS_ORIGIN` are preset in `render.yaml`.
5. After deploy, open `https://<your-service>.onrender.com` (free tier may sleep ~50s on first visit).

**Existing Render service:** Dashboard → **New PostgreSQL** → copy **Internal Database URL** into the web service env as `DATABASE_URL` → redeploy.

Docker locally:

```bash
docker build -t usdc-faucet .
docker run --env-file .env -p 3000:3000 usdc-faucet
```

## API

- `GET /api/info` — drip size, cooldown, faucet balance, chain metadata
- `POST /api/drip` — body `{ "address": "0x…" }` → `{ "txHash": "0x…" }`
- `GET /api/cooldown/:address` — whether the address can drip yet

## Security notes

- The private key lives only on the server.
- Use **Postgres on Render** so wallet counts survive redeploys (SQLite is file-based and ephemeral on free web containers).
- Add Turnstile or CAPTCHA before a public mainnet deployment if abuse is a concern.
