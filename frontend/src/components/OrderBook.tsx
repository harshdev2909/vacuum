import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

const COINGECKO_ETH_USD = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd";
const FALLBACK_MID = 3243;
const SPREAD = 4;
const LEVELS = 5;
const SIZES = [1.25, 2.1, 0.8, 3.0, 1.5];

function buildLevels(mid: number): { asks: { price: number; size: number }[]; bids: { price: number; size: number }[] } {
  const step = SPREAD / LEVELS;
  const asks = Array.from({ length: LEVELS }, (_, i) => ({
    price: Math.round((mid + step * (i + 1)) * 10) / 10,
    size: SIZES[i % SIZES.length],
  })).reverse();
  const bids = Array.from({ length: LEVELS }, (_, i) => ({
    price: Math.round((mid - step * (i + 1)) * 10) / 10,
    size: SIZES[(i + 1) % SIZES.length],
  }));
  return { asks, bids };
}

export function OrderBook() {
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchPrice = async () => {
      try {
        setError(null);
        const res = await fetch(COINGECKO_ETH_USD);
        if (!res.ok) throw new Error("Price fetch failed");
        const data = (await res.json()) as { ethereum?: { usd?: number } };
        const usd = data?.ethereum?.usd;
        if (typeof usd !== "number" || usd <= 0) throw new Error("Invalid price");
        if (!cancelled) setEthPrice(usd);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load price");
          setEthPrice(null);
        }
      }
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const { asks, bids } = useMemo(
    () => buildLevels(ethPrice ?? FALLBACK_MID),
    [ethPrice]
  );

  return (
    <motion.section
      className="rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-4 md:p-6 text-zinc-200"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Order book</h2>
        <a
          href="https://app.gmx.io"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-[var(--color-accent)] transition hover:underline"
        >
          Powered by GMX
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4 md:gap-6">
        <div>
          <div className="mb-2 grid grid-cols-2 gap-2 text-xs text-zinc-400">
            <span>Price</span>
            <span className="text-right">Size</span>
          </div>
          <div className="space-y-0.5">
            {asks.map((row, i) => (
              <div
                key={`ask-${i}`}
                className="grid grid-cols-2 gap-2 text-sm text-zinc-100"
                style={{
                  background: `linear-gradient(90deg, rgba(239,68,68,${0.08 - i * 0.012}) 0%, transparent 100%)`,
                }}
              >
                <span className="text-red-400 font-medium">{row.price.toLocaleString()}</span>
                <span className="text-right text-zinc-300">{row.size}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 grid grid-cols-2 gap-2 text-xs text-zinc-400">
            <span>Price</span>
            <span className="text-right">Size</span>
          </div>
          <div className="space-y-0.5">
            {bids.map((row, i) => (
              <div
                key={`bid-${i}`}
                className="grid grid-cols-2 gap-2 text-sm text-zinc-100"
                style={{
                  background: `linear-gradient(90deg, rgba(34,197,94,${0.08 - i * 0.012}) 0%, transparent 100%)`,
                }}
              >
                <span className="text-green-400 font-medium">{row.price.toLocaleString()}</span>
                <span className="text-right text-zinc-300">{row.size}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-zinc-400">
        ETH/USD
        {ethPrice != null && !error && ` · Live: $${ethPrice.toLocaleString()} from `}
        {ethPrice != null && !error && (
          <a href="https://www.coingecko.com/en/coins/ethereum" target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] hover:underline">CoinGecko</a>
        )}
        {error && " · Price unavailable"}
        {" · "}
        Trade on{" "}
        <a href="https://app.gmx.io" target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] hover:underline">
          GMX
        </a>
      </p>
    </motion.section>
  );
}
