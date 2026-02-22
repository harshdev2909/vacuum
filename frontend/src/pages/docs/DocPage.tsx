import type { ReactNode } from "react";

interface DocPageProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function DocPage({ title, description, children }: DocPageProps) {
  return (
    <article className="max-w-3xl">
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">
        {title}
      </h1>
      {description && (
        <p className="mb-8 text-zinc-400">{description}</p>
      )}
      {children}
    </article>
  );
}
