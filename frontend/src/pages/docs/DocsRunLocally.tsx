import { Link } from "react-router-dom";
import { DocPage } from "./DocPage";
import { DocBlock, CodeBlock } from "../../components/docs/DocBlock";

export function DocsRunLocally() {
  return (
    <DocPage
      title="Run everything locally"
      description="Step-by-step guide to run the Vacuum frontend, SDK, Execution Engine (Private RPC + MEV), and Agent framework on your machine with full control over RPC, Redis, and environment."
    >
      <DocBlock title="What you can run locally">
        <p className="mb-4">
          The Vacuum repo contains several runnable pieces. This guide covers how to run each one and in what order, with detailed environment and troubleshooting notes.
        </p>
        <ul className="list-inside list-disc space-y-1 text-sm text-zinc-400">
          <li><strong>Frontend (web app)</strong> — React app for swap, vault, strategy, DAO, referral, delegate, agent, and protocol tabs. Connects to Arbitrum via RPC (public or your private relay).</li>
          <li><strong>Execution Engine</strong> — Private RPC + MEV protection service. Requires Redis. Accepts signed txs, simulates, runs MEV guard, then broadcasts. See <Link to="/docs/execution-engine" className="text-[#22d3ee] hover:underline">Execution Engine</Link> for architecture.</li>
          <li><strong>SDK (vacuum-sdk)</strong> — TypeScript library used by the frontend and by the agent package. You do not “run” it as a server; you use it in Node or in the browser.</li>
          <li><strong>Agent package (@vacuum/agent)</strong> — Node.js automation (StrategyAgent, VaultAgent, DaoAutomationAgent). Run via <code>npx ts-node</code> or Docker; it uses the SDK and your RPC (public or Execution Engine).</li>
        </ul>
      </DocBlock>

      <DocBlock title="Prerequisites">
        <p className="mb-2">Install once on your machine:</p>
        <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-zinc-400">
          <li><strong>Node.js</strong> — v18 or newer (LTS recommended). Check with <code>node -v</code>.</li>
          <li><strong>npm</strong> — Comes with Node. Check with <code>npm -v</code>.</li>
          <li><strong>Git</strong> — To clone the repo. Check with <code>git --version</code>.</li>
          <li><strong>Docker</strong> (optional but recommended) — For running Redis and optionally the Execution Engine in containers. Check with <code>docker --version</code>.</li>
        </ul>
        <p className="text-sm text-zinc-500">
          If you do not use Docker, you need a local <strong>Redis</strong> server (e.g. install via Homebrew on macOS: <code>brew install redis</code>, then <code>brew services start redis</code>).
        </p>
      </DocBlock>

      <DocBlock title="Repository structure">
        <p className="mb-2">From the repo root you will use these directories:</p>
        <pre className="mb-4 overflow-x-auto rounded-lg bg-[#0a0a0f] p-4 font-mono text-xs text-zinc-300">
{`arbitrum/
├── frontend/           # React app (Vite + React Router + wagmi)
├── packages/
│   ├── sdk/            # vacuum-sdk (TypeScript, ethers v6)
│   └── agent/         # @vacuum/agent (StrategyAgent, VaultAgent, DaoAutomationAgent)
├── execution-engine/  # Private RPC + MEV protection (Node, Redis, express)
└── contracts/         # Solidity (for reference; no need to run for local app/engine)`}
        </pre>
      </DocBlock>

      <DocBlock title="Step 1 — Start Redis">
        <p className="mb-2">
          The <strong>Execution Engine</strong> uses Redis for the transaction queue and for the mempool snapshot. You must start Redis before starting the engine.
        </p>
        <p className="mb-2 text-sm text-zinc-500">Option A: Docker (recommended)</p>
        <CodeBlock>{`# From any directory. Exposes Redis on localhost:6379
docker run -d --name vacuum-redis -p 6379:6379 redis:7-alpine

# Check it's running
docker ps
# Optional: connect to Redis CLI
docker exec -it vacuum-redis redis-cli PING
# Should reply: PONG`}</CodeBlock>
        <p className="mt-4 mb-2 text-sm text-zinc-500">Option B: Local Redis (e.g. macOS)</p>
        <CodeBlock>{`brew install redis
brew services start redis
# Default: localhost:6379`}</CodeBlock>
        <p className="mt-2 text-sm text-zinc-500">
          If Redis is on another host or port, set <code>REDIS_URL</code> when running the Execution Engine (e.g. <code>redis://host:6379</code>).
        </p>
      </DocBlock>

      <DocBlock title="Step 2 — Run the Execution Engine (optional but recommended)">
        <p className="mb-2">
          If you want to use the Private RPC with MEV protection, run the Execution Engine. It will listen on a port (default <code>8545</code>) and enqueue incoming txs, run simulation and MEV guard, then broadcast. If you skip this, the frontend and agents will use the public RPC URL you configure (e.g. Arbitrum Sepolia or Arbitrum One).
        </p>
        <p className="mb-2 font-medium text-zinc-300">2.1 Install and configure</p>
        <CodeBlock>{`cd execution-engine
npm install
cp .env.example .env`}</CodeBlock>
        <p className="mt-2 mb-2 text-sm text-zinc-500">Edit <code>.env</code> and set at least:</p>
        <ul className="mb-2 list-inside list-disc text-sm text-zinc-500">
          <li><code>RPC_URL</code> — Arbitrum JSON-RPC (e.g. <code>https://sepolia-rollup.arbitrum.io/rpc</code> for Sepolia, or <code>https://arb1.arbitrum.io/rpc</code> for One).</li>
          <li><code>RPC_WS_URL</code> — WebSocket URL for mempool (e.g. <code>wss://sepolia-rollup.arbitrum.io/ws</code> or derive from RPC_URL by replacing <code>https</code> with <code>wss</code>).</li>
          <li><code>REDIS_URL</code> — <code>redis://localhost:6379</code> (or your Redis host/port).</li>
          <li><code>API_KEYS</code> — Comma-separated keys for <code>X-API-Key</code> (e.g. <code>dev-key</code>).</li>
          <li><code>CHAIN_ID</code> — <code>421614</code> for Arbitrum Sepolia or <code>42161</code> for Arbitrum One.</li>
        </ul>
        <p className="mb-2 font-medium text-zinc-300">2.2 Build and start</p>
        <CodeBlock>{`npm run build
npm start`}</CodeBlock>
        <p className="mt-2 text-sm text-zinc-500">
          You should see logs like “RPC relay listening” and “Mempool listener starting”. The RPC relay is at <code>http://localhost:8545</code>. Health: <code>GET http://localhost:8545/health</code>. Metrics: <code>GET http://localhost:8545/metrics</code>.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          To run only the RPC server (no mempool/worker), use: <code>RUN_MEMPOOL=false RUN_WORKER=false node dist/index.js</code>.
        </p>
      </DocBlock>

      <DocBlock title="Step 3 — Run the frontend">
        <p className="mb-2">
          The web app lets you connect a wallet (e.g. Rainbow), switch to Arbitrum Sepolia (or One), and use the Swap, Vault, Strategy, DAO, Referral, Delegate, Agent, and Protocol tabs. By default it uses the RPC configured in the frontend (see <code>frontend/src/wagmi.ts</code> or env); you can point it at your local Execution Engine by setting the RPC URL to <code>http://localhost:8545</code> in your wagmi/config (and adding <code>X-API-Key</code> if you use the relay).
        </p>
        <CodeBlock>{`# From repo root
cd frontend
npm install
npm run dev`}</CodeBlock>
        <p className="mt-2 text-sm text-zinc-500">
          The dev server usually runs at <code>http://localhost:5173</code>. Open it in the browser, connect your wallet, and ensure the network is Arbitrum Sepolia (or the chain your contracts and Execution Engine use).
        </p>
      </DocBlock>

      <DocBlock title="Step 4 — Using the SDK in your own script">
        <p className="mb-2">
          To use <code>vacuum-sdk</code> from Node (e.g. a script or the agent package), install it and point <code>rpcUrl</code> at either a public RPC or your local Execution Engine (<code>http://localhost:8545</code>). If you use the relay, authenticated requests require <code>X-API-Key</code>; you may need a custom provider that adds this header.
        </p>
        <CodeBlock>{`cd packages/sdk
npm install
npm run build

# In your script or app
import { ArbiClient } from "vacuum-sdk";
import { JsonRpcProvider, Wallet } from "ethers";

const provider = new JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc", 421614);
const wallet = new Wallet(process.env.PRIVATE_KEY!, provider);
const client = new ArbiClient({ rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc", chainId: 421614, signer: wallet });
// Or use http://localhost:8545 and your API key for the Execution Engine
const { txHash } = await client.execution.swapExactInputSingleWithSlippage({ ... });`}</CodeBlock>
      </DocBlock>

      <DocBlock title="Step 5 — Run an agent (Node)">
        <p className="mb-2">
          Agents (StrategyAgent, VaultAgent, DaoAutomationAgent) run in Node. They use the SDK and your signer; they never hold keys. Run an example from the agent package:
        </p>
        <CodeBlock>{`cd packages/agent
npm install
# Ensure packages/sdk is built (dependency)
cd ../sdk && npm run build && cd ../agent

# Set env (see .env.example)
export RPC_URL="https://sepolia-rollup.arbitrum.io/rpc"
export CHAIN_ID=421614
export PRIVATE_KEY=0x...

# Optional: use Execution Engine as RPC
# export RPC_URL="http://localhost:8545"

npx ts-node examples/SimpleBuybackBot.ts
# Or: SimpleMomentumAgent.ts, SimpleAPRRebalancer.ts`}</CodeBlock>
        <p className="mt-2 text-sm text-zinc-500">
          For more agent options (RULE_ID, VAULT_ADDRESS, STRATEGY_TOKEN_ID, DRY_RUN, LOG_LEVEL), see <code>packages/agent/.env.example</code>.
        </p>
      </DocBlock>

      <DocBlock title="Step 6 — Run the Execution Engine with Docker (optional)">
        <p className="mb-2">
          You can run the Execution Engine in Docker so you do not need Node installed for it. Redis must be reachable (e.g. host network or another container).
        </p>
        <CodeBlock>{`cd execution-engine
docker build -t vacuum-execution-engine .

docker run -p 8545:8545 \\
  -e RPC_URL=https://sepolia-rollup.arbitrum.io/rpc \\
  -e RPC_WS_URL=wss://sepolia-rollup.arbitrum.io/ws \\
  -e REDIS_URL=redis://host.docker.internal:6379 \\
  -e API_KEYS=dev-key \\
  -e CHAIN_ID=421614 \\
  vacuum-execution-engine`}</CodeBlock>
        <p className="mt-2 text-sm text-zinc-500">
          <code>host.docker.internal</code> points to the host’s localhost from inside the container (macOS/Windows). On Linux you may need to use the host’s IP or run Redis in a container on the same network and set <code>REDIS_URL=redis://redis:6379</code>.
        </p>
      </DocBlock>

      <DocBlock title="Order of operations (summary)">
        <ol className="list-decimal space-y-1 pl-6 text-sm text-zinc-400">
          <li>Start <strong>Redis</strong> (Docker or local).</li>
          <li>Optionally start the <strong>Execution Engine</strong> (Node or Docker), using the same Redis.</li>
          <li>Start the <strong>frontend</strong> (<code>npm run dev</code> in <code>frontend/</code>).</li>
          <li>Run <strong>agents</strong> or SDK scripts as needed; point their RPC at public or <code>http://localhost:8545</code>.</li>
        </ol>
      </DocBlock>

      <DocBlock title="Environment variables quick reference">
        <p className="mb-2">Execution Engine (<code>execution-engine/.env</code>):</p>
        <table className="mb-4 w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-[#1e1e2e] pb-2 pr-4 text-left text-zinc-400">Variable</th>
              <th className="border-b border-[#1e1e2e] pb-2 text-left text-zinc-400">Example</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>RPC_URL</code></td><td className="border-b border-[#1e1e2e] py-2">https://sepolia-rollup.arbitrum.io/rpc</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>RPC_WS_URL</code></td><td className="border-b border-[#1e1e2e] py-2">wss://sepolia-rollup.arbitrum.io/ws</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>REDIS_URL</code></td><td className="border-b border-[#1e1e2e] py-2">redis://localhost:6379</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>API_KEYS</code></td><td className="border-b border-[#1e1e2e] py-2">dev-key</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>CHAIN_ID</code></td><td className="border-b border-[#1e1e2e] py-2">421614 (Sepolia) or 42161 (One)</td></tr>
          </tbody>
        </table>
        <p className="mb-2">Agent (<code>packages/agent</code>):</p>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-[#1e1e2e] pb-2 pr-4 text-left text-zinc-400">Variable</th>
              <th className="border-b border-[#1e1e2e] pb-2 text-left text-zinc-400">Example</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>RPC_URL</code></td><td className="border-b border-[#1e1e2e] py-2">Public RPC or http://localhost:8545</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>CHAIN_ID</code></td><td className="border-b border-[#1e1e2e] py-2">421614 or 42161</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>PRIVATE_KEY</code></td><td className="border-b border-[#1e1e2e] py-2">0x... (wallet that will sign)</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>DRY_RUN</code></td><td className="border-b border-[#1e1e2e] py-2">true to skip sending txs</td></tr>
          </tbody>
        </table>
      </DocBlock>

      <DocBlock title="Troubleshooting">
        <ul className="space-y-2 text-sm text-zinc-400">
          <li><strong>Redis connection refused</strong> — Ensure Redis is running on the host/port you set in <code>REDIS_URL</code>. For Dockerized engine, use <code>host.docker.internal</code> or the correct container network.</li>
          <li><strong>Execution Engine “RPC relay listening” but txs not broadcast</strong> — Check that the worker is running (default: yes). Look for “Worker started” in logs. Ensure the chain and RPC match (e.g. Sepolia vs One).</li>
          <li><strong>Frontend “Wrong network” or no balance</strong> — Switch the wallet to Arbitrum Sepolia (or the chain your RPC and contracts use). Ensure the frontend’s wagmi config uses the same chain and RPC.</li>
          <li><strong>Agent fails with “invalid nonce” or RPC error</strong> — If using the Execution Engine, ensure the same wallet is not sending txs from another client at the same time (nonce is reserved per address). Try with a fresh address or wait for pending txs to confirm.</li>
          <li><strong>MEV guard rejects (risk score too high)</strong> — Adjust <code>RISK_THRESHOLD</code> in the Execution Engine .env (default 85), or reduce same-pool competition by using a different pool/time. Check <code>GET /metrics</code> for <code>execution_engine_mev_evaluations_total</code> and <code>execution_engine_risk_score</code>.</li>
        </ul>
      </DocBlock>

      <DocBlock title="See also">
        <ul className="space-y-1 text-sm text-zinc-400">
          <li><Link to="/docs/execution-engine" className="text-[#22d3ee] hover:underline">Execution Engine (Private RPC + MEV Protection)</Link> — Architecture, MEV protection, bundling, config.</li>
          <li><Link to="/docs/getting-started" className="text-[#22d3ee] hover:underline">Getting started</Link> — SDK configuration and first calls.</li>
          <li><Link to="/docs/sdk/agents" className="text-[#22d3ee] hover:underline">SDK: Agents</Link> — Agent registry and subscription from the SDK.</li>
        </ul>
      </DocBlock>
    </DocPage>
  );
}
