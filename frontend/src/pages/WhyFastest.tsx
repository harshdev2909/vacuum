import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const POINTS = [
  {
    title: "Native to Arbitrum",
    body: "Vacuum runs entirely on Arbitrum. Every swap, vault deposit, and DAO action is a single L2 transaction—no extra bridges, no mainnet round-trips. You get Arbitrum’s low latency and low gas by design.",
  },
  {
    title: "Execution-optimized contracts",
    body: "Our ExecutionRouter and fee path are built for one thing: fast, predictable execution. Minimal hops, clear token flow, and no off-chain dependency means your transaction is submitted and confirmed in one step.",
  },
  {
    title: "No backend, no wait",
    body: "There is no server in the loop. No API to slow you down, no database to sync. You sign with your wallet and the chain executes. Permissionless from first byte to final confirmation.",
  },
  {
    title: "Composable and transparent",
    body: "Vault, strategy NFT, referral, and DAO modules are on-chain and composable. What you see in the app is what the contracts do. No hidden queues or proprietary order flow—just public, verifiable execution.",
  },
];

export function WhyFastest() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
          Why we are the fastest execution layer on Arbitrum
        </h1>
        <p className="mb-10 text-zinc-400">
          Speed here means minimal latency and no unnecessary steps—from your wallet to settlement, all on Arbitrum.
        </p>

        <div className="space-y-8">
          {POINTS.map((point, i) => (
            <motion.section
              key={point.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.35 }}
              className="rounded-xl border border-[#1e1e2e] bg-[#12121a] p-6"
            >
              <h2 className="mb-3 text-lg font-semibold text-[#22d3ee]">
                {point.title}
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                {point.body}
              </p>
            </motion.section>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Link
            to="/app"
            className="inline-flex items-center rounded-xl bg-[#0891b2] px-6 py-3 font-medium text-white transition hover:opacity-90"
          >
            Open App
          </Link>
          <Link
            to="/how"
            className="inline-flex items-center rounded-xl border border-[#1e1e2e] bg-[#12121a] px-6 py-3 font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            How to use
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
