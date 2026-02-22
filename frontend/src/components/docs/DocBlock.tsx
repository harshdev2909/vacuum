import type { ReactNode } from "react";

interface DocBlockProps {
  title?: string;
  children: ReactNode;
  id?: string;
}

export function DocBlock({ title, children, id }: DocBlockProps) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      {title && (
        <h2 className="mb-4 text-xl font-semibold text-white border-b border-[#1e1e2e] pb-2">
          {title}
        </h2>
      )}
      <div className="max-w-none text-zinc-300 [&_pre]:rounded-xl [&_pre]:bg-[#12121a] [&_pre]:p-4 [&_pre]:text-sm [&_code]:rounded [&_code]:bg-[#12121a] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[#22d3ee] [&_table]:w-full [&_th]:text-left [&_th]:text-zinc-400 [&_td]:py-2 [&_td]:pr-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
        {children}
      </div>
    </section>
  );
}

export function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-[#1e1e2e] bg-[#12121a] p-4 text-sm text-zinc-300">
      <code>{children}</code>
    </pre>
  );
}
