import { Link, Outlet, useLocation } from "react-router-dom";

const SIDEBAR = [
  { label: "Overview", path: "/docs" },
  { label: "Getting started", path: "/docs/getting-started" },
  {
    label: "SDK",
    children: [
      { label: "Overview", path: "/docs/sdk/overview" },
      { label: "Execution", path: "/docs/sdk/execution" },
      { label: "Vaults", path: "/docs/sdk/vaults" },
      { label: "Strategies", path: "/docs/sdk/strategies" },
      { label: "DAO", path: "/docs/sdk/dao" },
      { label: "Agents", path: "/docs/sdk/agents" },
    ],
  },
  {
    label: "Guides",
    children: [
      { label: "Examples", path: "/docs/guides/examples" },
      { label: "Contract-to-contract calls", path: "/docs/contract-to-contract" },
    ],
  },
  {
    label: "Infrastructure",
    children: [
      { label: "Execution Engine (Private RPC + MEV)", path: "/docs/execution-engine" },
      { label: "Run everything locally", path: "/docs/run-locally" },
    ],
  },
  { label: "Error handling", path: "/docs/errors" },
  { label: "Security", path: "/docs/security" },
];

export function DocLayout() {
  const location = useLocation();

  return (
    <div className="mx-auto flex max-w-7xl gap-12 px-4 py-10">
      <aside className="w-56 shrink-0 border-r border-[#1e1e2e] pr-6">
        <nav className="sticky top-24 space-y-1">
          {SIDEBAR.map((item) =>
            "children" in item ? (
              <div key={item.label} className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  {item.label}
                </p>
                <div className="space-y-0.5">
                  {(item.children ?? []).map((child) => (
                    <Link
                      key={child.path}
                      to={child.path}
                      className={`block rounded-lg px-3 py-2 text-sm transition ${
                        location.pathname === child.path
                          ? "bg-[#12121a] text-white"
                          : "text-zinc-400 hover:bg-[#12121a] hover:text-zinc-200"
                      }`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                key={item.path}
                to={item.path}
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  location.pathname === item.path
                    ? "bg-[#12121a] text-white"
                    : "text-zinc-400 hover:bg-[#12121a] hover:text-zinc-200"
                }`}
              >
                {item.label}
              </Link>
            )
          )}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 pb-20">
        <Outlet />
      </main>
    </div>
  );
}
