# Private RPC + MEV Protection Execution Engine (Arbitrum)

Production-grade private RPC relay with MEV protection, simulation, transaction bundling, and fallback broadcast for the Vacuum protocol on Arbitrum.

## Architecture

```
┌─────────┐     ┌──────────────────┐     ┌─────────────┐     ┌─────────────┐
│   SDK   │────▶│  Private RPC     │────▶│   Redis     │────▶│   Worker     │
│ (client)│     │  (auth, rate     │     │   Queue     │     │   (dequeue)  │
└─────────┘     │   limit, enqueue)│     └─────────────┘     └──────┬───────┘
                └──────────────────┘                              │
                                                                   ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────────┐
│ Mempool Listener │────▶│  Mempool        │     │  Simulate → MEV Guard   │
│ (WebSocket RPC)  │     │  Snapshot       │◀────│  → Gas Manager → Bundle  │
└─────────────────┘     │  (Redis)        │     └────────────┬────────────┘
                        └─────────────────┘                  │
                                                              ▼
                        ┌─────────────────┐     ┌─────────────────────────┐
                        │  Private Relay   │────▶│  Fallback: Public RPC    │
                        │  (optional)     │     │  (retry broadcast)       │
                        └─────────────────┘     └─────────────────────────┘
```

**Flow:** User signs tx → SDK sends to Private RPC → RPC validates (API key, nonce), enqueues to Redis → Worker dequeues → **Simulate** (eth_call) → **MEV Guard** (risk score, action: safe / increaseGas / bundle / reject) → **Gas Manager** (priority fee) → **Broadcast** (private relay if set, else public; on failure fallback to public RPC).

## How to run

### Local (Node)

1. **Redis** must be running (queue + mempool snapshot).

```bash
# Example: Docker Redis
docker run -d -p 6379:6379 redis:7-alpine
```

2. **Install and build**

```bash
cd execution-engine
npm install
cp .env.example .env
# Edit .env: RPC_URL, RPC_WS_URL, API_KEYS, REDIS_URL
npm run build
```

3. **Start**

```bash
npm start
# Or: node dist/index.js
```

- RPC relay: `http://localhost:8545`
- Health: `GET /health`
- Metrics: `GET /metrics` (Prometheus)

4. **Optional: run only RPC** (no mempool/worker, e.g. separate scaling)

```bash
RUN_MEMPOOL=false RUN_WORKER=false node dist/index.js
```

### Docker

```bash
docker build -t vacuum-execution-engine .
docker run -p 8545:8545 \
  -e RPC_URL=https://arb1.arbitrum.io/rpc \
  -e RPC_WS_URL=wss://arb1.arbitrum.io/ws \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  -e API_KEYS=your-api-key \
  vacuum-execution-engine
```

Use a Redis container on the same network or `REDIS_URL=redis://redis:6379` in compose.

## How to connect the SDK

Point the Vacuum SDK (or any ethers/viem provider) at the **Private RPC** URL instead of a public RPC:

```ts
import { ArbiClient } from "vacuum-sdk";
import { JsonRpcProvider, Wallet } from "ethers";

const provider = new JsonRpcProvider("http://localhost:8545", 42161);
// For authenticated relay, set X-API-Key in fetch (custom fetch wrapper)
const wallet = new Wallet(process.env.PRIVATE_KEY!, provider);

const client = new ArbiClient({
  rpcUrl: "http://localhost:8545",
  chainId: 42161,
  signer: wallet,
});

// Build and sign swap as usual; when you send the tx, it goes to the relay
const { txHash } = await client.execution.swapExactInputSingleWithSlippage({ ... });
```

**Authenticated requests:** The relay expects `X-API-Key` on `POST /rpc`. Use a custom `fetch` that adds this header when using ethers/viem with the relay URL (e.g. `CustomJsonRpcProvider` or fetch override).

## How MEV protection works

1. **Mempool listener** (WebSocket) subscribes to pending transactions on Arbitrum, decodes Uniswap V3 (and Camelot-style) swap calldata, and keeps a **snapshot** in Redis: pending swaps per pool, whale size, same-pool activity.

2. **Before broadcast**, the worker:
   - **Simulates** the user tx with `eth_call` (no broadcast). Reverts → reject.
   - **MEV Guard** evaluates risk using:
     - Same-pool pending swaps (sandwich / front-run)
     - Large pending “whale” swaps
     - User slippage vs simulated output
     - Gas vs current base fee
   - **Risk score** 0–100 and **action**:
     - `safe` → broadcast as-is
     - `increaseGas` → suggest higher gas (client can re-sign; server does not hold keys)
     - `bundle` → can be sent as part of a bundle (order preserved)
     - `reject` → do not broadcast (above `RISK_THRESHOLD`)

3. **No private keys** are stored server-side; only **signed** transactions are accepted. Replay protection via nonce validation and reservation in Redis.

## How bundling works

- **Bundler** (`engine/bundler`) can send multiple txs in **order**: sequential broadcast (submit one, wait for inclusion or timeout, then next). Use for back-to-back swaps, atomic buy/sell, or buyback + vault deposit.
- When MEV Guard returns `action: "bundle"`, the worker can pass the tx to the bundler; currently the worker broadcasts a single tx and uses bundling only when explicitly given multiple items (e.g. future batch API).
- **Private relay**: if `PRIVATE_RELAY_URL` is set, the worker tries that first; on failure, **fallback** to the main RPC (public).

## Observability

- **Structured logs**: pino (JSON in prod, pretty in dev). Fields: `module`, `id`, `from`, `riskScore`, `txHash`, `err`.
- **Metrics** (`GET /metrics`): Prometheus.
  - `execution_engine_txs_received_total`, `_enqueued_total`, `_rejected_total`, `_broadcast_total`
  - `execution_engine_simulations_total`, `execution_engine_mev_evaluations_total`
  - `execution_engine_risk_score`, `execution_engine_gas_escalation_total`, `execution_engine_queue_length`

## Security

- **No private keys** on the server; only signed transactions.
- **Nonce** validated and reserved per address (Redis) to prevent replay and out-of-order reuse.
- **Rate limit** per API key (in-memory; use Redis-backed limiter for multi-instance).
- **API key** required (`X-API-Key`) for `POST /rpc`.

## Config (.env)

| Variable | Description |
|----------|-------------|
| `RPC_URL` | Arbitrum JSON-RPC (broadcast + simulation). |
| `RPC_WS_URL` | WebSocket RPC for mempool pending tx. |
| `PRIVATE_RELAY_URL` | Optional private relay / sequencer. |
| `REDIS_URL` | Redis (queue + mempool snapshot). |
| `API_KEYS` | Comma-separated keys for `X-API-Key`. |
| `CHAIN_ID` | 42161 (One) or 421614 (Sepolia). |
| `MAX_GAS_MULTIPLIER` | Cap for gas price. |
| `RISK_THRESHOLD` | 0–100; above = reject. |
| `MAX_SLIPPAGE_BPS` | Max slippage override (bps). |
| `MEMPOOL_WINDOW_BLOCKS` | Mempool activity window. |
| `QUEUE_NAME` | Redis list name for tx queue. |
| `PORT` | HTTP server port. |
| `METRICS_ENABLED` | Expose `/metrics`. |
| `LOG_LEVEL` | debug / info / warn / error. |

## Testing

```bash
npm test
```

- Unit tests: risk scoring, simulation success/failure, gas escalation, bundle order, reject unsafe swap, replay (nonce) prevention.
- Mempool is mocked in tests; no fake swap logic.
