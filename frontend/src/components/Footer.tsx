import { useMemo } from "react";
import { motion } from "framer-motion";

const QUOTES = [
  "The best way to predict the future is to build permissionless infrastructure for it.",
  "Trust in code, not in gatekeepers.",
  "Execution should be neutral, open, and composable.",
];

const PHILOSOPHY = [
  "We build an execution layer that anyone can use—no permissions, no middlemen. Swap, vault, strategies, and DAO automation live on-chain on Arbitrum.",
  "Simplicity and realism over hype: real contracts, real liquidity, real utility.",
];

export function Footer() {
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

  return (
    <footer className="border-t border-[#1e1e2e] bg-[#12121a]">
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <motion.blockquote
          className="mb-10 text-center text-lg italic text-zinc-300 md:text-xl"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          &ldquo;{quote}&rdquo;
        </motion.blockquote>

        <div className="mb-10 space-y-4 text-center text-sm text-zinc-400 md:text-base">
          {PHILOSOPHY.map((p, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
            >
              {p}
            </motion.p>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 border-t border-[var(--color-border)] pt-8">
          <a
            href="https://arbitrum.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-400 transition hover:text-[var(--color-accent)]"
          >
            Arbitrum
          </a>
          <a
            href="https://docs.gmx.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-400 transition hover:text-[var(--color-accent)]"
          >
            GMX
          </a>
          <span className="text-zinc-500">·</span>
          <span className="text-xs text-zinc-500">
            Built with love on Arbitrum · Completely permissionless · Mainnet soon!
          </span>
        </div>
      </div>
    </footer>
  );
}
