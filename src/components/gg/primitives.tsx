import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Difficulty, Question } from "@/lib/types";
import { subjectById } from "@/data/subjects";
import { questionOriginLabel } from "@/data/question-origin";

export const SUBJECT_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  dm: {
    bg: "bg-amber-100 dark:bg-amber-950/70",
    text: "text-amber-900 dark:text-amber-200",
    badge: "bg-[#FEF08A] text-black border-border shadow-[1.5px_1.5px_0_var(--border)]",
  },
  em: {
    bg: "bg-sky-100 dark:bg-sky-950/70",
    text: "text-sky-900 dark:text-sky-200",
    badge: "bg-[#BAE6FD] text-black border-border shadow-[1.5px_1.5px_0_var(--border)]",
  },
  dl: {
    bg: "bg-orange-100 dark:bg-orange-950/70",
    text: "text-orange-900 dark:text-orange-200",
    badge: "bg-[#FED7AA] text-black border-border shadow-[1.5px_1.5px_0_var(--border)]",
  },
  coa: {
    bg: "bg-purple-100 dark:bg-purple-950/70",
    text: "text-purple-900 dark:text-purple-200",
    badge: "bg-[#E9D5FF] text-black border-border shadow-[1.5px_1.5px_0_var(--border)]",
  },
  pds: {
    bg: "bg-emerald-100 dark:bg-emerald-950/70",
    text: "text-emerald-900 dark:text-emerald-200",
    badge: "bg-[#A7F3D0] text-black border-border shadow-[1.5px_1.5px_0_var(--border)]",
  },
  prog: {
    bg: "bg-teal-100 dark:bg-teal-950/70",
    text: "text-teal-900 dark:text-teal-200",
    badge: "bg-[#99F6E4] text-black border-border shadow-[1.5px_1.5px_0_var(--border)]",
  },
  algo: {
    bg: "bg-rose-100 dark:bg-rose-950/70",
    text: "text-rose-900 dark:text-rose-200",
    badge: "bg-[#FECDD3] text-black border-border shadow-[1.5px_1.5px_0_var(--border)]",
  },
  toc: {
    bg: "bg-violet-100 dark:bg-violet-950/70",
    text: "text-violet-900 dark:text-violet-200",
    badge: "bg-[#DDD6FE] text-black border-border shadow-[1.5px_1.5px_0_var(--border)]",
  },
  cd: {
    bg: "bg-pink-100 dark:bg-pink-950/70",
    text: "text-pink-900 dark:text-pink-200",
    badge: "bg-[#FBCFE8] text-black border-border shadow-[1.5px_1.5px_0_var(--border)]",
  },
  os: {
    bg: "bg-blue-100 dark:bg-blue-950/70",
    text: "text-blue-900 dark:text-blue-200",
    badge: "bg-[#BFDBFE] text-black border-border shadow-[1.5px_1.5px_0_var(--border)]",
  },
  dbms: {
    bg: "bg-yellow-100 dark:bg-yellow-950/70",
    text: "text-yellow-900 dark:text-yellow-200",
    badge: "bg-[#FDE68A] text-black border-border shadow-[1.5px_1.5px_0_var(--border)]",
  },
  cn: {
    bg: "bg-indigo-100 dark:bg-indigo-950/70",
    text: "text-indigo-900 dark:text-indigo-200",
    badge: "bg-[#C7D2FE] text-black border-border shadow-[1.5px_1.5px_0_var(--border)]",
  },
  ga: {
    bg: "bg-lime-100 dark:bg-lime-950/70",
    text: "text-lime-900 dark:text-lime-200",
    badge: "bg-[#D9F99D] text-black border-border shadow-[1.5px_1.5px_0_var(--border)]",
  },
};

export function Pill({
  children,
  className,
  solid,
  color,
}: {
  children: ReactNode;
  className?: string;
  solid?: boolean;
  color?: "yellow" | "cyan" | "pink" | "green" | "purple" | "orange";
}) {
  const colorCls =
    color === "yellow"
      ? "bg-neo-yellow text-black border-border shadow-[1.5px_1.5px_0_var(--border)]"
      : color === "cyan"
        ? "bg-neo-cyan text-black border-border shadow-[1.5px_1.5px_0_var(--border)]"
        : color === "pink"
          ? "bg-neo-pink text-white border-border shadow-[1.5px_1.5px_0_var(--border)]"
          : color === "green"
            ? "bg-neo-green text-black border-border shadow-[1.5px_1.5px_0_var(--border)]"
            : color === "purple"
              ? "bg-neo-purple text-black border-border shadow-[1.5px_1.5px_0_var(--border)]"
              : color === "orange"
                ? "bg-neo-orange text-black border-border shadow-[1.5px_1.5px_0_var(--border)]"
                : solid
                  ? "bg-primary text-primary-foreground border-border shadow-[1.5px_1.5px_0_var(--border)]"
                  : "";

  return <span className={cn("neo-pill font-bold", colorCls, className)}>{children}</span>;
}

export function SubjectBadge({ subjectId }: { subjectId: string }) {
  const sub = subjectById(subjectId);
  const conf = SUBJECT_COLORS[subjectId] ?? {
    bg: "bg-surface",
    text: "text-text-h",
    badge: "bg-surface text-text-h border-border shadow-[1.5px_1.5px_0_var(--border)]",
  };
  return (
    <span className={cn("neo-pill font-bold", conf.badge)}>
      {sub?.code ?? subjectId.toUpperCase()}
    </span>
  );
}

export function DifficultyPill({ d }: { d: Difficulty }) {
  const dots = d === "Easy" ? 1 : d === "Medium" ? 2 : 3;
  const style =
    d === "Easy"
      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-border"
      : d === "Medium"
        ? "bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-yellow-300 border-border"
        : "bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 border-border";

  return (
    <span className={cn("neo-pill font-bold shadow-[1.5px_1.5px_0_var(--border)]", style)}>
      <span aria-hidden className="tracking-[-0.15em] font-extrabold">
        {"●".repeat(dots)}
        {"○".repeat(3 - dots)}
      </span>
      <span className="ml-1">{d}</span>
    </span>
  );
}

export function QuestionMeta({ q }: { q: Question }) {
  const typeColor = q.type === "MCQ" ? "cyan" : q.type === "MSQ" ? "purple" : "orange";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Pill color={typeColor as "cyan" | "purple" | "orange"}>{q.type}</Pill>
      <Pill className="bg-surface">
        {questionOriginLabel(q)}
        {q.set ? ` · S${q.set}` : ""}
      </Pill>
      <Pill className="bg-surface">
        {q.marks} mark{q.marks > 1 ? "s" : ""}
      </Pill>
      <SubjectBadge subjectId={q.subjectId} />
      <DifficultyPill d={q.difficulty} />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b-2 border-border pb-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && (
          <div className="neo-sticker mb-2.5 inline-flex bg-neo-yellow text-black rotate-[-1deg] text-[10px]">
            {eyebrow}
          </div>
        )}
        <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2.5">{children}</div>}
    </header>
  );
}

export function ProgressBar({
  value,
  className,
  label,
  color = "primary",
}: {
  value: number;
  className?: string;
  label?: string;
  color?: "primary" | "green" | "pink" | "cyan";
}) {
  const v = Math.max(0, Math.min(100, value));
  const fill =
    color === "green"
      ? "bg-neo-green"
      : color === "pink"
        ? "bg-neo-pink"
        : color === "cyan"
          ? "bg-neo-cyan"
          : "bg-neo-yellow";

  return (
    <div
      className={cn(
        "h-3 w-full border-2 border-border bg-surface shadow-[2px_2px_0_var(--border)]",
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn("h-full border-r-2 border-border transition-[width]", fill)}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="neo-box flex flex-col items-center gap-2 py-12 text-center bg-surface border-2 border-border shadow-[6px_6px_0_var(--border)]">
      <div className="inline-flex size-14 items-center justify-center border-2 border-border bg-neo-yellow text-2xl font-black text-black shadow-[3px_3px_0_var(--border)] rotate-[-3deg]">
        ∅
      </div>
      <h3 className="mt-2 text-xl font-bold">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SkeletonRows({ n = 4 }: { n?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse border-2 border-border bg-subtle shadow-[3px_3px_0_var(--border)]"
        />
      ))}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  color = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  color?: "yellow" | "cyan" | "pink" | "green" | "purple" | "default";
}) {
  const colorMap = {
    yellow: "bg-[#FFF9C4] dark:bg-[#2A240A]",
    cyan: "bg-[#E0F7FA] dark:bg-[#082832]",
    pink: "bg-[#FFE4E8] dark:bg-[#34111A]",
    green: "bg-[#DCFCE7] dark:bg-[#0F2E1E]",
    purple: "bg-[#F3E8FF] dark:bg-[#261538]",
    default: "bg-surface",
  };

  return (
    <div
      className={cn(
        "neo-box-sm border-2 border-border p-4.5 transition-all hover:-translate-x-0.5 hover:-translate-y-1 hover:shadow-[5px_5px_0_var(--border)]",
        colorMap[color],
      )}
    >
      <div className="neo-label text-[10.5px] font-extrabold text-foreground/80">{label}</div>
      <div className="mt-1.5 font-heading text-3xl font-extrabold tracking-tight text-text-h">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground font-medium">{hint}</div>}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "border-2 border-border px-3 py-1 font-mono text-xs font-bold transition-all cursor-pointer",
        active
          ? "bg-neo-yellow text-black shadow-[3px_3px_0_var(--border)] -translate-y-0.5"
          : "bg-surface text-text-h shadow-[2px_2px_0_var(--border)] hover:bg-subtle hover:-translate-y-0.5",
      )}
    >
      {children}
    </button>
  );
}
