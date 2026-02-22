import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const SECTIONS = [
  {
    title: "Swap",
    description: "Execute ETH → WETH or USDC on Arbitrum Sepolia. Connect your wallet, choose the execution router, set output token and amount, then confirm the swap. Fees are split between protocol and referrer when you have a referrer set.",
  },
  {
    title: "Vault",
    description: "Deposit USDC into the vault to earn yield. You receive vault shares (e.g. vUSDC). Use Deposit to add assets, Withdraw to redeem by amount, or Redeem to burn shares. Harvest runs the strategy to compound gains; only when the vault is unpaused.",
  },
  {
    title: "Strategy",
    description: "Strategy NFTs represent on-chain strategies. Register a strategy (registry owner), subscribe with USDC for a duration to receive an NFT, list or buy strategy NFTs on the marketplace, and claim royalty payouts as a creator.",
  },
  {
    title: "DAO",
    description: "DAO Automation includes RiskGuard (daily spend and slippage limits), PolicyEngine (rule-based execution), TreasuryAutomationController (treasury exposure and automated swap/harvest), BuybackModule (schedules), and GovernanceExecutorAdapter (executor address). Use the DAO tab to view state and, if you are the owner, update parameters or trigger rules.",
  },
  {
    title: "Referral",
    description: "Register a referrer address (once per wallet). Swaps then send a share of the fee to that referrer. As a referrer, claim accumulated WETH or USDC rewards. Use the balance snapshot to compare before/after when testing.",
  },
  {
    title: "Delegate",
    description: "As an owner: sign an EIP-712 message to authorize a delegate address. As the delegate: connect with that wallet, enter the owner (beneficiary) address, set amount and output token, and execute the trade. The owner receives the output; the delegate pays gas and ETH. Nonces prevent replay.",
  },
  {
    title: "Protocol",
    description: "View protocol fee, referral split, and treasury. FeeManager owner can withdraw collected WETH or USDC to the treasury. Use the snapshot to verify treasury balance changes after a withdraw.",
  },
];

export function HowToUse() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
          How to use Vacuum
        </h1>
        <p className="mb-10 text-zinc-400">
          Connect your wallet on Arbitrum Sepolia and use the app tabs to swap, vault, manage strategies, run DAO automation, referrals, and delegation.
        </p>

        <div className="space-y-8">
          {SECTIONS.map((section, i) => (
            <motion.section
              key={section.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="rounded-xl border border-[#1e1e2e] bg-[#12121a] p-6"
            >
              <h2 className="mb-3 text-lg font-semibold text-white">
                {section.title}
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                {section.description}
              </p>
            </motion.section>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0891b2] px-6 py-3 font-medium text-white transition hover:opacity-90"
          >
            Open App
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
