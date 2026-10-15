import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronDown, CheckSquare } from "lucide-react";
import { useState } from "react";
import { PageHeader, ProgressBar, SUBJECT_COLORS } from "@/components/gg/primitives";
import { syllabus } from "@/data/catalog";
import { subjectById } from "@/data/subjects";
import { useSyllabusProgress } from "@/hooks/use-local-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/syllabus")({
  head: () => ({
    meta: [
      { title: "GATE CSE syllabus tracker — GATE Grind" },
      {
        name: "description",
        content: "The full GATE CSE syllabus, with a tick-box for every topic you finish.",
      },
      { property: "og:title", content: "GATE CSE syllabus — GATE Grind" },
      {
        property: "og:description",
        content: "Track your progress through the official GATE CSE syllabus.",
      },
    ],
  }),
  component: Syllabus,
});

function Syllabus() {
  const { done, toggle } = useSyllabusProgress();
  const [open, setOpen] = useState<Set<string>>(new Set(["ga"]));
  const all = syllabus.flatMap((u) =>
    u.sections.flatMap((s) => s.items.map((it) => `${u.subjectId}:${it}`)),
  );
  const pct = (done.filter((d) => all.includes(d)).length / all.length) * 100;

  return (
    <>
      <PageHeader
        eyebrow="Official Curriculum"
        title="Syllabus Tracker"
        description="Tick topics off as you master them. Your completion milestones are persisted locally."
      >
        <div className="w-64 border-2 border-border bg-surface p-3 shadow-[3px_3px_0_var(--border)]">
          <div className="mb-1.5 flex justify-between text-xs font-black">
            <span>Overall Completion</span>
            <span className="neo-pill bg-neo-green text-black border-border shadow-[1px_1px_0_var(--border)] font-black text-[10px]">
              {Math.round(pct)}%
            </span>
          </div>
          <ProgressBar value={pct} label="Overall syllabus progress" color="green" />
        </div>
      </PageHeader>
      <div className="space-y-4">
        {syllabus.map((u) => {
          const keys = u.sections.flatMap((s) => s.items.map((it) => `${u.subjectId}:${it}`));
          const n = keys.filter((k) => done.includes(k)).length;
          const isOpen = open.has(u.subjectId);
          const sub = subjectById(u.subjectId)!;
          const conf = SUBJECT_COLORS[u.subjectId] ?? {
            bg: "bg-surface",
            badge: "bg-neo-yellow text-black",
          };
          const subPct = (n / keys.length) * 100;
          return (
            <section
              key={u.subjectId}
              className="neo-box p-0 border-2 border-border bg-surface shadow-[4px_4px_0_var(--border)]"
            >
              <button
                className="flex w-full items-center gap-4 p-4.5 text-left cursor-pointer hover:bg-subtle transition-colors"
                aria-expanded={isOpen}
                onClick={() =>
                  setOpen((o) => {
                    const x = new Set(o);
                    if (x.has(u.subjectId)) {
                      x.delete(u.subjectId);
                    } else {
                      x.add(u.subjectId);
                    }
                    return x;
                  })
                }
              >
                <span
                  className={cn(
                    "neo-pill w-14 justify-center font-black text-xs border-border shadow-[1px_1px_0_var(--border)]",
                    conf.badge,
                  )}
                >
                  {sub.code}
                </span>
                <h2 className="flex-1 text-base font-extrabold text-text-h">{sub.name}</h2>
                <span className="hidden w-36 sm:block">
                  <ProgressBar
                    value={subPct}
                    label={`${sub.name} progress`}
                    color={subPct > 80 ? "green" : "primary"}
                  />
                </span>
                <span className="neo-pill bg-neo-yellow text-black border-border shadow-[1px_1px_0_var(--border)] font-black text-[11px] w-16 justify-center">
                  {n}/{keys.length}
                </span>
                <ChevronDown
                  className={cn("size-4 stroke-[3] transition-transform", isOpen && "rotate-180")}
                />
              </button>
              {isOpen && (
                <div className="grid gap-6 border-t-2 border-border bg-subtle/40 p-5 md:grid-cols-2">
                  {u.sections.map((s) => (
                    <div
                      key={s.title}
                      className="border-2 border-border bg-surface p-4 shadow-[2px_2px_0_var(--border)]"
                    >
                      <h3 className="neo-label mb-3 font-black text-xs text-text-h border-b-2 border-border pb-1">
                        {s.title}
                      </h3>
                      <ul className="space-y-1.5">
                        {s.items.map((it) => {
                          const k = `${u.subjectId}:${it}`;
                          const on = done.includes(k);
                          return (
                            <li key={k}>
                              <button
                                role="checkbox"
                                aria-checked={on}
                                onClick={() => toggle(k)}
                                className="flex w-full items-start gap-2.5 py-1 text-left text-sm cursor-pointer group"
                              >
                                <span
                                  className={cn(
                                    "mt-0.5 flex size-4.5 shrink-0 items-center justify-center border-2 border-border font-black transition-all",
                                    on
                                      ? "bg-neo-green text-black border-border shadow-[1px_1px_0_var(--border)]"
                                      : "bg-surface group-hover:bg-neo-yellow/30",
                                  )}
                                >
                                  {on && <Check className="size-3.5 stroke-[3]" />}
                                </span>
                                <span
                                  className={cn(
                                    "text-xs leading-relaxed font-semibold",
                                    on
                                      ? "text-muted-foreground line-through decoration-2"
                                      : "text-text-h group-hover:underline",
                                  )}
                                >
                                  {it}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
