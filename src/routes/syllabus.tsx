import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { PageHeader, ProgressBar } from "@/components/gg/primitives";
import { syllabus } from "@/data/catalog";
import { subjectById } from "@/data/subjects";
import { useSyllabusProgress } from "@/hooks/use-local-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/syllabus")({
  head: () => ({
    meta: [
      { title: "GATE CSE syllabus tracker — GATE Grind" },
      { name: "description", content: "The full GATE CSE syllabus, with a tick-box for every topic you finish." },
      { property: "og:title", content: "GATE CSE syllabus — GATE Grind" },
      { property: "og:description", content: "Track your progress through the official GATE CSE syllabus." },
    ],
  }),
  component: Syllabus,
});

function Syllabus() {
  const { done, toggle } = useSyllabusProgress();
  const [open, setOpen] = useState<Set<string>>(new Set(["ga"]));
  const all = syllabus.flatMap((u) => u.sections.flatMap((s) => s.items.map((it) => `${u.subjectId}:${it}`)));
  const pct = (done.filter((d) => all.includes(d)).length / all.length) * 100;

  return (
    <>
      <PageHeader eyebrow="Official syllabus" title="Syllabus" description="Tick topics off as you finish them. Your progress is saved on this device.">
        <div className="w-56">
          <div className="mb-1 flex justify-between text-xs"><span>Overall</span><span className="text-text-h">{Math.round(pct)}%</span></div>
          <ProgressBar value={pct} label="Overall syllabus progress" />
        </div>
      </PageHeader>
      <div className="space-y-3">
        {syllabus.map((u) => {
          const keys = u.sections.flatMap((s) => s.items.map((it) => `${u.subjectId}:${it}`));
          const n = keys.filter((k) => done.includes(k)).length;
          const isOpen = open.has(u.subjectId);
          const sub = subjectById(u.subjectId)!;
          return (
            <section key={u.subjectId} className="neo-box p-0">
              <button className="flex w-full items-center gap-4 p-4 text-left" aria-expanded={isOpen} onClick={() => setOpen((o) => { const x = new Set(o); x.has(u.subjectId) ? x.delete(u.subjectId) : x.add(u.subjectId); return x; })}>
                <span className="neo-pill w-12 justify-center">{sub.code}</span>
                <h2 className="flex-1 text-base">{sub.name}</h2>
                <span className="hidden w-32 sm:block"><ProgressBar value={(n / keys.length) * 100} label={`${sub.name} progress`} /></span>
                <span className="w-12 text-right text-xs">{n}/{keys.length}</span>
                <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="grid gap-6 border-t border-border p-4 md:grid-cols-2">
                  {u.sections.map((s) => (
                    <div key={s.title}>
                      <h3 className="neo-label mb-2">{s.title}</h3>
                      <ul className="space-y-1">
                        {s.items.map((it) => {
                          const k = `${u.subjectId}:${it}`;
                          const on = done.includes(k);
                          return (
                            <li key={k}>
                              <button role="checkbox" aria-checked={on} onClick={() => toggle(k)} className="flex w-full items-start gap-2.5 py-1 text-left text-sm">
                                <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center border border-border", on && "bg-primary text-primary-foreground")}>{on && <Check className="size-3" />}</span>
                                <span className={cn(on ? "text-muted-foreground line-through" : "text-text-h")}>{it}</span>
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
