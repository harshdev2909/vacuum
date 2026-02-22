export type TxStatus = "pending" | "success" | "error";

type Props = {
  open: boolean;
  onClose: () => void;
  actionLabel: string;
  status: TxStatus;
  txHash?: string | null;
  errorMessage?: string | null;
  explorerBaseUrl?: string;
};

export function TxStatusModal({
  open,
  onClose,
  actionLabel,
  status,
  txHash,
  errorMessage,
  explorerBaseUrl,
}: Props) {
  if (!open) return null;

  const statusLabel: Record<TxStatus, string> = {
    pending: "Pending",
    success: "Success",
    error: "Failed",
  };
  const statusColor: Record<TxStatus, string> = {
    pending: "text-amber-400",
    success: "text-emerald-400",
    error: "text-red-400",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
    >
      <div
        className="w-full max-w-md rounded-xl border border-[#1e1e2e] bg-[#12121a] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="tx-modal-title" className="text-lg font-semibold text-white">
            Transaction
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-[#1e1e2e] hover:text-white"
            aria-label="Close"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-zinc-500">Action</span>
            <span className="font-medium text-zinc-200">{actionLabel}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-zinc-500">Status</span>
            <span className={`font-medium ${statusColor[status]}`}>
              {statusLabel[status]}
            </span>
          </div>
          {txHash && (
            <div className="flex flex-col gap-1">
              <span className="text-zinc-500">Transaction hash</span>
              <code className="break-all rounded bg-[#0a0a0f] px-2 py-1.5 font-mono text-xs text-zinc-300">
                {txHash}
              </code>
              {explorerBaseUrl && (
                <a
                  href={`${explorerBaseUrl}/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 text-[#22d3ee] hover:underline"
                >
                  View on Explorer →
                </a>
              )}
            </div>
          )}
          {errorMessage && status === "error" && (
            <div className="flex flex-col gap-1">
              <span className="text-zinc-500">Error</span>
              <p className="rounded bg-red-950/40 px-2 py-1.5 text-xs text-red-300">
                {errorMessage}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#1e1e2e] px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-[#2a2a3a]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
