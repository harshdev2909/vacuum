import { Link, useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Header() {
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const isApp = location.pathname === "/app";
  const showAppCta = isLanding || (!isApp && (location.pathname === "/how" || location.pathname === "/why"));

  return (
    <header className="sticky top-0 z-50 border-b border-[#1e1e2e] bg-[#0a0a0f] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-white transition hover:text-zinc-200">
          <span className="text-xl">Vacuum</span>
        </Link>
        <nav className="flex items-center gap-3 md:gap-4">
          {!isLanding && (
            <Link to="/" className="text-sm text-zinc-400 transition hover:text-white">
              Home
            </Link>
          )}
          {showAppCta && (
            <Link
              to="/app"
              className={isLanding ? "rounded-lg bg-[#0891b2] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90" : "text-sm text-zinc-400 transition hover:text-white"}
            >
              {isLanding ? "Enter App" : "App"}
            </Link>
          )}
          <Link to="/how" className="text-sm text-zinc-400 transition hover:text-white">
            How to use
          </Link>
          <Link to="/why" className="text-sm text-zinc-400 transition hover:text-white">
            Why fastest
          </Link>
          <Link to="/memo" className="text-sm text-zinc-400 transition hover:text-white">
            Memo
          </Link>
          <Link to="/docs" className="text-sm text-zinc-400 transition hover:text-white">
            Docs
          </Link>
          <Link to="/docs/run-locally" className="text-sm text-zinc-400 transition hover:text-white">
            Run locally
          </Link>
          <ConnectButton showBalance={false} />
        </nav>
      </div>
    </header>
  );
}
