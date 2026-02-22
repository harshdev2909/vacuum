import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { OrderBook } from "../components/OrderBook";
import { Footer } from "../components/Footer";

export function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f] text-zinc-100">
      <main className="flex-1 px-4 py-12 md:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="mb-12 text-center md:mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
              SuperApp on 
              <br />
              <span className="text-[var(--color-accent)]">Arbitrum</span>
            </h1>
            <p className="mx-auto max-w-xl text-lg text-zinc-300">
              Trade in less than 20ms. Completely permissionless. Swap, vault, strategies, and DAO automation — no backend, no database. Just smart contracts and you.
            </p>
            <p className="mx-auto mt-3 max-w-lg text-sm font-medium text-[var(--color-accent)]">
              Mainnet soon!
            </p>
            <motion.div
              className="mt-8 flex flex-wrap justify-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Link
                to="/app"
                className="rounded-xl bg-[var(--color-accent)] px-6 py-3 font-semibold text-[var(--color-background)] transition hover:opacity-90"
              >
                Enter App
              </Link>
            </motion.div>
          </motion.div>

          <div className="mx-auto max-w-2xl">
            <OrderBook />
          </div>

          <section className="mx-auto mt-16 max-w-3xl border-t border-[#1e1e2e] pt-12">
            <h2 className="mb-6 text-center text-lg font-semibold text-white">What builders say</h2>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="rounded-xl border border-[#1e1e2e] bg-[#12121a] p-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--color-accent)]">Solvers</p>
                <p className="text-sm italic text-zinc-300">&ldquo;Vacuum gives us a single execution layer we can plug into — fast, predictable, and no middlemen.&rdquo;</p>
                <p className="mt-2 text-sm italic text-zinc-300">&ldquo;Sub-20ms intent-to-fill. That&apos;s the bar. Vacuum is there.&rdquo;</p>
              </div>
              <div className="rounded-xl border border-[#1e1e2e] bg-[#12121a] p-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--color-accent)]">Liquidity providers</p>
                <p className="text-sm italic text-zinc-300">&ldquo;We deploy liquidity; Vacuum routes it fairly. No special access, no hidden order flow.&rdquo;</p>
                <p className="mt-2 text-sm italic text-zinc-300">&ldquo;ERC-4626 vaults with real yield and one-click exposure. Exactly what LPs asked for.&rdquo;</p>
              </div>
            </div>
          </section>

          <section className="mx-auto mt-12 max-w-2xl border-t border-[#1e1e2e] pt-10">
            <h2 className="mb-4 text-center text-lg font-semibold text-white">Standards we use</h2>
            <p className="text-center text-sm text-zinc-400">
              Vacuum is built on open, auditable standards: <strong className="text-zinc-300">ERC-20</strong> (tokens), <strong className="text-zinc-300">ERC-4626</strong> (vaults), <strong className="text-zinc-300">EIP-712</strong> (typed signing &amp; delegate auth). No proprietary lock-in — compose with any protocol that speaks the same standards.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
