import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Difficulty, Question } from "@/lib/types";
import { subjectById } from "@/data/subjects";

export function Pill({ children, className, solid }: { children: ReactNode; className?: string; solid?: boolean }) {
  return <span className={cn("neo-pill", solid && "bg-primary text-primary-foreground", className)}>{children}</span>;
}

export function DifficultyPill({ d }: { d: Difficulty }) {
  const dots = d === "Easy" ? 1 : d === "Medium" ? 2 : 3;
  return (
    <Pill>
      <span aria-hidden className="tracking-[-0.15em]">{"●".repeat(dots)}{"○".repeat(3 - dots)}</span>
      <span className="ml-1">{d}</span>
    </Pill>
  );
}

export function QuestionMeta({ q }: { q: Question }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Pill solid>{q.type}</Pill>
      <Pill>GATE {q.year}{q.set ? ` · S${q.set}` : ""}</Pill>
      <Pill>{q.marks} mark{q.marks > 1 ? "s" : ""}</Pill>
      <Pill>{subjectById(q.subjectId)?.code}</Pill>
      <DifficultyPill d={q.difficulty} />
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <div className="neo-label mb-2">{eyebrow}</div>}
        <h1 className="text-3xl md:text-4xl">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}

export function ProgressBar({ value, className, label }: { value: number; className?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2.5 w-full border border-border bg-surface", className)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full bg-primary transition-[width]" style={{ width: `${v}%` }} />
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="neo-box flex flex-col items-center gap-2 py-12 text-center">
      <div className="font-brand text-4xl text-text-h">∅</div>
      <h3 className="text-lg">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function SkeletonRows({ n = 4 }: { n?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse border border-border bg-subtle" />
      ))}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="neo-box-sm p-4">
      <div className="neo-label">{label}</div>
      <div className="mt-1 font-heading text-2xl font-semibold text-text-h">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn("border border-border px-2.5 py-1 text-xs transition-colors", active ? "bg-primary text-primary-foreground" : "bg-surface text-text-h hover:bg-subtle")}
    >
      {children}
    </button>
  );
}
