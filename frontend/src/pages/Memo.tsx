import { Link } from "react-router-dom";
import { motion } from "framer-motion";

function MemoHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#1e1e2e] bg-[#0a0a0f]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link to="/" className="font-semibold text-white transition hover:text-zinc-200">Vacuum</Link>
        <nav className="flex items-center gap-4 text-sm text-zinc-400">
          <Link to="/" className="transition hover:text-white">Home</Link>
          <Link to="/app" className="transition hover:text-white">App</Link>
          <Link to="/docs" className="transition hover:text-white">Docs</Link>
        </nav>
      </div>
    </header>
  );
}

const COMPARISON_ROWS = [
  { param: "Settlement speed (<20ms)", relay: "✓", layerZero: "✗", cctp: "✗", vacuum: "✓" },
  { param: "Permissionless (no backend)", relay: "✗", layerZero: "✗", cctp: "—", vacuum: "✓" },
  { param: "MEV protection (private RPC)", relay: "—", layerZero: "✗", cctp: "✗", vacuum: "✓" },
  { param: "Native L2 (Arbitrum)", relay: "—", layerZero: "✗", cctp: "—", vacuum: "✓" },
  { param: "Swap + Vault + DAO + Agents", relay: "✗", layerZero: "✗", cctp: "✗", vacuum: "✓" },
];

export function Memo() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      <MemoHeader />
      <div className="mx-auto max-w-4xl px-4 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-16 text-center"
        >
          <p className="mb-2 text-sm font-medium uppercase tracking-wider text-[var(--color-accent)]">Vacuum is raising</p>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl">What are we building</h1>
          <p className="mx-auto max-w-2xl text-lg text-zinc-300">
            Making execution <strong className="text-white">net-positive</strong>: sub-20ms settlement, MEV protection, and completely permissionless. We pay attention to speed and fairness—no backend, no gatekeepers—so users and solvers win.
          </p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mb-16 rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-6 md:p-8"
        >
          <h2 className="mb-4 text-xl font-semibold text-white">The opportunity</h2>
          <p className="mb-4 text-zinc-300">
            Arbitrum leads L2 with <strong className="text-white">$19B+ TVL</strong> and <strong className="text-white">37%+ L2 market share</strong>. Execution layers and DEX aggregators generate hundreds of millions in volume and millions in fees annually—but most force tradeoffs between speed, MEV risk, and permissionlessness.
          </p>
          <p className="text-zinc-300">
            At Vacuum we deliver <strong className="text-[var(--color-accent)]">sub-20ms intent-to-fill</strong>, <strong className="text-[var(--color-accent)]">90%+ cheaper</strong> than median execution overhead where it matters, and <strong className="text-[var(--color-accent)]">full permissionlessness</strong>: swap, vault (ERC-4626), strategy NFTs, DAO automation, and agent execution—all on-chain, no backend, no database.
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mb-16"
        >
          <h2 className="mb-6 text-center text-xl font-semibold text-white">Market opportunity</h2>
          <p className="mx-auto mb-8 max-w-2xl text-center text-zinc-300">
            L2 DeFi is growing at exceptional rates with billions in monthly volume. Current leaders either rely on off-chain solvers (slow, opaque) or expose users to MEV. Vacuum captures this by eliminating tradeoffs: <strong className="text-white">sub-second settlement</strong> (private RPC + simulation), <strong className="text-white">low cost</strong> (native Arbitrum + efficient contracts), and <strong className="text-white">80+ chain coverage potential</strong> via the same SDK pattern on other chains.
          </p>
          <p className="mx-auto max-w-2xl text-center text-sm text-zinc-400">
            This also opens an underserved segment: <strong className="text-zinc-300">ICM apps</strong> (prediction markets, perp DEXs, launchpads) that need atomic, fast execution and MEV-safe flows. They move $100B+ monthly but can&apos;t integrate execution layers that are both fast and permissionless. Vacuum is built for them.
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mb-16 overflow-x-auto rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-4 md:p-6"
        >
          <h2 className="mb-4 text-lg font-semibold text-white">Competitive comparison</h2>
          <p className="mb-4 text-xs text-zinc-400">Relay = solver-based relay; LayerZero = cross-chain messaging; CCTP = Circle; Vacuum = our stack.</p>
          <div className="min-w-[600px]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#1e1e2e] text-zinc-400">
                  <th className="pb-3 pr-4">Parameter</th>
                  <th className="pb-3 pr-4">Relay</th>
                  <th className="pb-3 pr-4">LayerZero</th>
                  <th className="pb-3 pr-4">CCTP</th>
                  <th className="pb-3 text-[var(--color-accent)]">Vacuum</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={i} className="border-b border-[#1e1e2e] text-zinc-300">
                    <td className="py-3 pr-4">{row.param}</td>
                    <td className="py-3 pr-4">{row.relay}</td>
                    <td className="py-3 pr-4">{row.layerZero}</td>
                    <td className="py-3 pr-4">{row.cctp}</td>
                    <td className="py-3 font-medium text-[var(--color-accent)]">{row.vacuum}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-xs text-zinc-500">Vacuum is the only stack that checks every box: fast, permissionless, MEV-aware, full product (swap, vault, DAO, agents).</p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mb-16 rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-6 md:p-8"
        >
          <h2 className="mb-4 text-xl font-semibold text-white">Product</h2>
          <p className="mb-4 text-zinc-300">
            <strong className="text-white">TL;DR:</strong> We are an Arbitrum-native execution layer. Swap (Uniswap V3), ERC-4626 vaults, strategy NFTs, DAO automation, and non-custodial agents—all permissionless, with an optional private RPC + MEV guard for sub-20ms, sandwich-resistant execution.
          </p>
          <p className="mb-4 text-zinc-300">
            Instead of &ldquo;another aggregator with a backend,&rdquo; we focus on <strong className="text-white">transfer of value on-chain</strong>: minimal hops, clear token flow, no off-chain dependency. You sign with your wallet; the chain executes. Our Execution Engine (private RPC, simulation, MEV guard, bundler) sits in front only when you want speed and protection—never as a gatekeeper.
          </p>
          <p className="mb-4 text-zinc-300">
            <strong className="text-white">Competitive positioning:</strong> High route coverage + fast + cheap lives in the top-right quadrant. Messaging (LayerZero, Wormhole) and burn-mint (CCTP) are cross-chain but slow or narrow. Solver relays are fast but not permissionless. <strong className="text-[var(--color-accent)]">Vacuum is the only solution that is native L2, sub-20ms-capable, MEV-protected, and fully permissionless</strong> with a single SDK: swap, vault, strategies, DAO, agents.
          </p>
          <p className="text-sm text-zinc-400">
            🔗 Architecture &amp; run locally: <Link to="/docs/execution-engine" className="text-[var(--color-accent)] hover:underline">Execution Engine</Link> · <Link to="/docs/run-locally" className="text-[var(--color-accent)] hover:underline">Run everything locally</Link>
            <br />
            📚 <Link to="/docs" className="text-[var(--color-accent)] hover:underline">Docs</Link>
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="mb-16 rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-6 md:p-8"
        >
          <h2 className="mb-6 text-xl font-semibold text-white">Team</h2>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-start gap-4 rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] p-4">
              <div className="h-12 w-12 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center text-lg font-bold text-[var(--color-accent)]">H</div>
              <div>
                <p className="font-semibold text-white">Harsh Sharma</p>
                <p className="text-sm text-zinc-400">Founder</p>
                <p className="mt-2 text-sm text-zinc-500">Leads product, contracts, execution engine, and SDK. Built Vacuum from the ground up—execution router, vaults, strategies, DAO automation, and MEV protection.</p>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mb-16 grid gap-6 md:grid-cols-2"
        >
          <div className="rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">What&apos;s built</h2>
            <p className="mb-4 text-zinc-300">Working MVP on Arbitrum Sepolia: contracts deployed, frontend, SDK, Execution Engine, and agent framework.</p>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>· ExecutionRouter (Uniswap V3), FeeManager, ReferralRegistry, WalletAuth</li>
              <li>· ERC-4626 vaults + Uniswap V3 LP strategies</li>
              <li>· Strategy NFTs, marketplace, subscriptions, royalty distributor</li>
              <li>· RiskGuard, PolicyEngine, TreasuryAutomationController, buyback</li>
              <li>· Private RPC + MEV guard + simulation + bundler (execution-engine/)</li>
              <li>· vacuum-sdk (Node + browser), agent package (non-custodial)</li>
            </ul>
            <div className="mt-6 flex gap-4 text-sm">
              <span className="rounded-lg bg-[#1e1e2e] px-3 py-1.5 text-zinc-300">Bootstrapped</span>
              <span className="rounded-lg bg-[#1e1e2e] px-3 py-1.5 text-zinc-300">P90 &lt;20ms (engine)</span>
            </div>
          </div>
          <div className="rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">What&apos;s next</h2>
            <p className="mb-4 text-zinc-300">Mainnet launch on Arbitrum One. Audit, infrastructure hardening, and GTM.</p>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>· Arbitrum One deployment (ExecutionRouter, vaults, DAO, agents)</li>
              <li>· Audit and security review</li>
              <li>· Day-1 GTM: docs, integrations, solver/LP outreach</li>
            </ul>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="mb-16 rounded-2xl border border-[var(--color-accent)]/30 bg-[#12121a] p-6 md:p-8"
        >
          <h2 className="mb-4 text-xl font-semibold text-white">Raising</h2>
          <p className="mb-1 text-3xl font-bold text-[var(--color-accent)]">$500K</p>
          <p className="mb-4 text-zinc-300">at <strong className="text-white">$5M</strong> valuation</p>
          <p className="mb-6 text-sm text-zinc-400">Safe + token warrant (1:1)</p>
          <p className="mb-4 text-zinc-300">Use of funds:</p>
          <ul className="mb-6 list-inside list-disc space-y-1 text-sm text-zinc-400">
            <li>Audit and infrastructure for mainnet launch</li>
            <li>Immediate hiring (candidates identified)</li>
            <li>Day-1 GTM across Crypto Twitter and builder communities</li>
          </ul>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/app"
              className="rounded-xl bg-[var(--color-accent)] px-6 py-3 font-semibold text-[var(--color-background)] transition hover:opacity-90"
            >
              Try the app
            </Link>
            <Link
              to="/docs"
              className="rounded-xl border border-[#1e1e2e] bg-[#12121a] px-6 py-3 font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
            >
              View docs
            </Link>
            <a
              href="#"
              className="rounded-xl border border-[#1e1e2e] bg-[#12121a] px-6 py-3 font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
              aria-label="Pitch deck link (add URL when ready)"
            >
              View full pitch deck →
            </a>
          </div>
        </motion.section>

        <p className="text-center text-xs text-zinc-500">
          Built with love on Arbitrum · Completely permissionless · Mainnet soon!
        </p>
      </div>
    </div>
  );
}
