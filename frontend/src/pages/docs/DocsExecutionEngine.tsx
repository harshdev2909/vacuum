import { Link } from "react-router-dom";
import { DocPage } from "./DocPage";
import { DocBlock, CodeBlock } from "../../components/docs/DocBlock";

export function DocsExecutionEngine() {
  return (
    <DocPage
      title="Execution Engine (Private RPC + MEV Protection)"
      description="Production-grade private RPC relay with MEV protection, simulation, transaction bundling, and fallback broadcast for Arbitrum."
    >
      <DocBlock title="Source code (GitHub)">
        <p className="mb-4">
          The Execution Engine source lives in the Vacuum monorepo. Clone the repo to build and run it locally.
        </p>
        <p className="mb-2">
          <a
            href="https://github.com/harshdev2909/vacuum"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[#1e1e2e] px-4 py-2 text-sm font-medium text-[#22d3ee] hover:bg-[#2a2a3a]"
          >
            https://github.com/harshdev2909/vacuum
          </a>
        </p>
        <p className="text-sm text-zinc-500">
          The Execution Engine is in the <code>execution-engine/</code> directory. See <Link to="/docs/run-locally" className="text-[#22d3ee] hover:underline">Run everything locally</Link> for prerequisites, Redis, env vars, and step-by-step run instructions.
        </p>
      </DocBlock>

      <DocBlock title="What it is">
        <p className="mb-4">
          The <strong>Execution Engine</strong> is a Node.js service that sits between your app (or SDK) and the chain. It accepts signed transactions, validates them, runs simulation and MEV checks, then broadcasts — without ever holding private keys. It reduces front-running and sandwich risk by evaluating mempool state and either broadcasting safely, suggesting higher gas, bundling, or rejecting when risk is too high.
        </p>
        <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-zinc-400">
          <li><strong>Private RPC relay</strong> — Accepts <code>eth_sendRawTransaction</code> and <code>vacuum_execute</code> (EIP-712); enqueues instead of broadcasting immediately.</li>
          <li><strong>Mempool listener</strong> — Subscribes to pending transactions via WebSocket; decodes Uniswap V3 (and Camelot-style) swaps; keeps a snapshot in Redis.</li>
          <li><strong>MEV guard</strong> — Before broadcast: simulates the tx, scores risk (same-pool activity, whale size, slippage, gas), and returns an action: <code>safe</code>, <code>increaseGas</code>, <code>bundle</code>, or <code>reject</code>.</li>
          <li><strong>Simulation engine</strong> — Uses <code>eth_call</code> and <code>estimateGas</code> to validate reverts and gas.</li>
          <li><strong>Bundler</strong> — Can broadcast multiple txs in order (sequential); supports fallback to public RPC if private relay fails.</li>
        </ul>
      </DocBlock>

      <DocBlock title="Architecture">
        <p className="mb-2">End-to-end flow:</p>
        <pre className="mb-4 overflow-x-auto rounded-lg bg-[#0a0a0f] p-4 font-mono text-xs text-zinc-300">
{`┌─────────────┐      ┌─────────────────────┐      ┌───────────────┐      ┌───────────────┐
│  SDK / App   │─────▶│  Private RPC Relay   │─────▶│  Redis Queue  │─────▶│    Worker     │
│  (client)    │      │  POST /rpc           │      │  (tx list)     │      │  (dequeue)    │
└─────────────┘      │  • Auth (X-API-Key)  │      └───────────────┘      └───────┬───────┘
                     │  • Rate limit        │                                    │
                     │  • Nonce validation  │                                    ▼
                     │  • Enqueue only      │      ┌─────────────────────────────────────────┐
                     └─────────────────────┘      │  Simulate → MEV Guard → Gas → Broadcast  │
                                                  │  (eth_call, risk score, priority fee)     │
┌─────────────────────┐      ┌───────────────┐     └─────────────────────┬─────────────────────┘
│  Mempool Listener   │─────▶│  Mempool      │◀─────────────────────────┘
│  (WebSocket → RPC)  │      │  Snapshot     │
│  • Pending tx       │      │  (Redis)      │            ┌─────────────────┐
│  • Decode swaps     │      └───────────────┘            │  Private Relay  │──▶ Fallback:
└─────────────────────┘                                   │  (optional)     │    Public RPC
                                                           └─────────────────┘`}
        </pre>
        <p className="mb-4 text-sm text-zinc-500">
          <strong>Flow:</strong> User signs tx → SDK sends to Private RPC → RPC validates (API key, nonce), enqueues to Redis → Worker dequeues → Simulate (<code>eth_call</code>) → MEV Guard (risk score, action) → Gas Manager (priority fee) → Broadcast (private relay if set, else public; on failure, fallback to public RPC).
        </p>
        <p className="mb-2 text-sm font-medium text-zinc-300">Components</p>
        <ul className="list-inside list-disc text-sm text-zinc-500">
          <li><strong>Private RPC</strong> — <code>server/rpc/</code>: Express server; accepts <code>eth_sendRawTransaction</code> and <code>vacuum_execute</code>; enqueues to Redis.</li>
          <li><strong>Mempool listener</strong> — <code>engine/mempool/</code>: WebSocket subscription to pending txs; decodes Uniswap V3 swaps; writes snapshot to Redis.</li>
          <li><strong>Worker</strong> — <code>engine/worker/</code>: BLPOP from Redis; runs simulator → mevGuard → gasManager → bundler (broadcast).</li>
          <li><strong>Simulator</strong> — <code>engine/simulator/</code>: <code>eth_call</code> + <code>estimateGas</code>.</li>
          <li><strong>MEV Guard</strong> — <code>engine/mevGuard/</code>: Risk score and action (safe / increaseGas / bundle / reject).</li>
          <li><strong>Gas Manager</strong> — <code>engine/gasManager/</code>: Priority fee and escalation.</li>
          <li><strong>Bundler</strong> — <code>engine/bundler/</code>: Sequential broadcast and single-tx broadcast.</li>
        </ul>
      </DocBlock>

      <DocBlock title="File and directory layout">
        <p className="mb-2">Layout under the repo root (Execution Engine in <code>execution-engine/</code>). Use this to run things locally:</p>
        <pre className="mb-4 overflow-x-auto rounded-lg bg-[#0a0a0f] p-4 font-mono text-xs text-zinc-300">
{`vacuum/                          # Repo root (clone from GitHub)
├── execution-engine/             # Private RPC + MEV (this service)
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts            # RPC_URL, REDIS_URL, API_KEYS, RISK_THRESHOLD, etc.
│   │   │   └── hooks.ts           # Optional strategy hooks (beforeSimulation, afterMev, …)
│   │   ├── server/
│   │   │   └── rpc/
│   │   │       └── index.ts      # Express: POST /rpc, GET /health, GET /metrics
│   │   ├── engine/
│   │   │   ├── mempool/
│   │   │   │   └── index.ts      # WebSocket mempool listener, Redis snapshot
│   │   │   ├── mevGuard/
│   │   │   │   └── index.ts      # Risk scoring, action (safe/increaseGas/bundle/reject)
│   │   │   ├── simulator/
│   │   │   │   └── index.ts      # eth_call, estimateGas
│   │   │   ├── gasManager/
│   │   │   │   └── index.ts      # Priority fee, escalation
│   │   │   ├── bundler/
│   │   │   │   └── index.ts      # broadcastSingle, broadcastBundle
│   │   │   └── worker/
│   │   │       └── index.ts      # Dequeue → simulate → MEV → broadcast
│   │   ├── utils/
│   │   │   ├── logger.ts         # Pino
│   │   │   ├── redis.ts         # Queue + mempool snapshot
│   │   │   ├── nonce.ts         # Nonce validation (replay protection)
│   │   │   └── metrics.ts       # Prometheus
│   │   ├── types.ts
│   │   └── index.ts             # Starts RPC + mempool + worker
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── frontend/                     # React app (swap, vault, DAO, …)
├── packages/
│   ├── sdk/                     # vacuum-sdk
│   └── agent/                   # @vacuum/agent
└── contracts/                   # Solidity (reference)`}
        </pre>
        <p className="mb-2 text-sm font-medium text-zinc-300">Run the Execution Engine locally</p>
        <ol className="list-decimal space-y-1 pl-6 text-sm text-zinc-500">
          <li>Start <strong>Redis</strong> (e.g. <code>docker run -d -p 6379:6379 redis:7-alpine</code>).</li>
          <li><code>cd execution-engine</code> → <code>npm install</code> → <code>cp .env.example .env</code> → set <code>RPC_URL</code>, <code>RPC_WS_URL</code>, <code>REDIS_URL</code>, <code>API_KEYS</code>, <code>CHAIN_ID</code>.</li>
          <li><code>npm run build</code> → <code>npm start</code>. RPC at <code>http://localhost:8545</code>, health at <code>/health</code>, metrics at <code>/metrics</code>.</li>
        </ol>
        <p className="mt-2 text-sm text-zinc-500">
          Full step-by-step (Redis, env, frontend, SDK, agents) is in <Link to="/docs/run-locally" className="text-[#22d3ee] hover:underline">Run everything locally</Link>.
        </p>
      </DocBlock>

      <DocBlock title="How MEV protection works">
        <p className="mb-2">Before any user transaction is broadcast:</p>
        <ol className="mb-4 list-decimal space-y-2 pl-6 text-sm text-zinc-400">
          <li><strong>Mempool listener</strong> (WebSocket) subscribes to pending transactions on Arbitrum, decodes swap calldata (Uniswap V3 / Camelot), and maintains a <strong>snapshot in Redis</strong>: pending swaps per pool, large (“whale”) sizes, same-pool activity.</li>
          <li><strong>Simulation</strong> — The worker runs the user tx with <code>eth_call</code>. If it reverts, the tx is rejected and never sent.</li>
          <li><strong>MEV Guard</strong> evaluates risk using: same-pool pending swaps (sandwich / front-run), large pending swaps, user slippage vs simulated output, and tx gas vs current base fee. It produces a <strong>risk score 0–100</strong> and an <strong>action</strong>:
            <ul className="mt-2 list-inside list-disc text-zinc-500">
              <li><code>safe</code> — Broadcast as-is.</li>
              <li><code>increaseGas</code> — Suggest higher gas (client can re-sign; server does not hold keys).</li>
              <li><code>bundle</code> — Can be sent as part of a bundle (order preserved).</li>
              <li><code>reject</code> — Do not broadcast (risk above <code>RISK_THRESHOLD</code>).</li>
            </ul>
          </li>
          <li>No private keys are stored server-side; only <strong>signed</strong> transactions are accepted. Replay protection is enforced via nonce validation and reservation in Redis.</li>
        </ol>
      </DocBlock>

      <DocBlock title="How bundling works">
        <p className="mb-2">
          The <strong>Bundler</strong> can send multiple transactions in a fixed order: it broadcasts one tx, optionally waits for inclusion (or a timeout), then broadcasts the next. This is used for back-to-back swaps, atomic buy/sell, or buyback + vault deposit. When MEV Guard returns <code>action: "bundle"</code>, the worker can pass the tx into the bundler. If <code>PRIVATE_RELAY_URL</code> is set, the worker tries that first; on failure, it falls back to the main (public) RPC.
        </p>
      </DocBlock>

      <DocBlock title="Connecting the SDK">
        <p className="mb-2">
          Point the Vacuum SDK (or any ethers/viem provider) at the <strong>Private RPC</strong> URL instead of a public RPC. The relay expects <code>X-API-Key</code> on <code>POST /rpc</code>; use a custom fetch that adds this header when using ethers/viem with the relay URL.
        </p>
        <CodeBlock>{`import { ArbiClient } from "vacuum-sdk";
import { JsonRpcProvider, Wallet } from "ethers";

const provider = new JsonRpcProvider("http://localhost:8545", 42161);
const wallet = new Wallet(process.env.PRIVATE_KEY!, provider);

const client = new ArbiClient({
  rpcUrl: "http://localhost:8545",
  chainId: 42161,
  signer: wallet,
});

const { txHash } = await client.execution.swapExactInputSingleWithSlippage({
  exactInputSingle: { ... },
  deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
  beneficiary: wallet.address,
  slippageBps: 50,
});`}</CodeBlock>
      </DocBlock>

      <DocBlock title="Configuration (.env)">
        <p className="mb-2">All behavior is driven by environment variables. Key ones:</p>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-[#1e1e2e] pb-2 pr-4 text-left text-zinc-400">Variable</th>
              <th className="border-b border-[#1e1e2e] pb-2 text-left text-zinc-400">Description</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>RPC_URL</code></td><td className="border-b border-[#1e1e2e] py-2">Arbitrum JSON-RPC for broadcast and simulation</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>RPC_WS_URL</code></td><td className="border-b border-[#1e1e2e] py-2">WebSocket RPC for mempool pending tx</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>PRIVATE_RELAY_URL</code></td><td className="border-b border-[#1e1e2e] py-2">Optional private relay / sequencer</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>REDIS_URL</code></td><td className="border-b border-[#1e1e2e] py-2">Redis for queue and mempool snapshot (e.g. redis://localhost:6379)</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>API_KEYS</code></td><td className="border-b border-[#1e1e2e] py-2">Comma-separated keys for X-API-Key header</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>CHAIN_ID</code></td><td className="border-b border-[#1e1e2e] py-2">42161 (Arbitrum One) or 421614 (Sepolia)</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>RISK_THRESHOLD</code></td><td className="border-b border-[#1e1e2e] py-2">0–100; above this score the tx is rejected</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>PORT</code></td><td className="border-b border-[#1e1e2e] py-2">HTTP server port (default 8545)</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>LOG_LEVEL</code></td><td className="border-b border-[#1e1e2e] py-2">debug | info | warn | error</td></tr>
          </tbody>
        </table>
      </DocBlock>

      <DocBlock title="Observability">
        <p className="mb-2">Structured logging (pino) and Prometheus metrics:</p>
        <ul className="mb-2 list-inside list-disc text-sm text-zinc-400">
          <li><strong>Health:</strong> <code>GET /health</code> — returns status and timestamp.</li>
          <li><strong>Metrics:</strong> <code>GET /metrics</code> — Prometheus format. Counters: <code>execution_engine_txs_received_total</code>, <code>_enqueued_total</code>, <code>_rejected_total</code>, <code>_broadcast_total</code>, <code>execution_engine_simulations_total</code>, <code>execution_engine_mev_evaluations_total</code>; histogram: <code>execution_engine_risk_score</code>; gauge: <code>execution_engine_queue_length</code>.</li>
          <li>Logs include <code>module</code>, <code>id</code>, <code>from</code>, <code>riskScore</code>, <code>txHash</code>, and error details for failed simulations and gas escalation.</li>
        </ul>
      </DocBlock>

      <DocBlock title="Security">
        <ul className="list-inside list-disc text-sm text-zinc-400">
          <li>No private keys on the server; only signed transactions are accepted.</li>
          <li>Nonce is validated and reserved per address (Redis) to prevent replay and out-of-order reuse.</li>
          <li>Rate limit per API key (in-memory; use a Redis-backed limiter for multiple instances).</li>
          <li>API key required (<code>X-API-Key</code>) for <code>POST /rpc</code>.</li>
        </ul>
      </DocBlock>

      <DocBlock title="Repository and tech stack">
        <p className="mb-2">
          Source: <a href="https://github.com/harshdev2909/vacuum" target="_blank" rel="noreferrer" className="text-[#22d3ee] hover:underline">github.com/harshdev2909/vacuum</a> (directory <code>execution-engine/</code>). Stack: Node.js (TypeScript), ethers v6, Redis (ioredis), express, pino, prom-client. Full setup and run: <Link to="/docs/run-locally" className="text-[#22d3ee] hover:underline">Run everything locally</Link>.
        </p>
      </DocBlock>
    </DocPage>
  );
}
