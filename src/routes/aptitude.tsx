import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Chip, PageHeader, Pill, ProgressBar } from "@/components/gg/primitives";
import { RichText } from "@/components/gg/RichText";
import { aptitudeConcepts } from "@/data/catalog";
import { questions } from "@/data/questions";
import { useAttempts } from "@/hooks/use-local-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/aptitude")({
  head: () => ({
    meta: [
      { title: "General aptitude — GATE Grind" },
      { name: "description", content: "Verbal, quantitative, analytical and spatial aptitude for GATE, with concept notes and daily practice." },
      { property: "og:title", content: "GATE general aptitude — GATE Grind" },
      { property: "og:description", content: "Concept cards and daily practice for the 15 aptitude marks in GATE." },
    ],
  }),
  component: Aptitude,
});

const CATS = ["All", "Verbal", "Quantitative", "Analytical", "Spatial"] as const;

function Aptitude() {
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const [open, setOpen] = useState<string | null>(null);
  const [attempts] = useAttempts();
  const ga = questions.filter((q) => q.subjectId === "ga");
  const solved = ga.filter((q) => attempts[q.id]).length;
  const daily = ga[new Date().getDate() % ga.length];
  const list = aptitudeConcepts.filter((c) => cat === "All" || c.category === cat);
  const active = aptitudeConcepts.find((c) => c.id === open);

  return (
    <>
      <PageHeader eyebrow="15 marks · every paper" title="General aptitude" description="Short concept notes and practice for the aptitude section, which is the same in every GATE paper." />
      <div className="mb-10 grid gap-4 md:grid-cols-[1fr_1fr]">
        <Link to="/practice/$questionId" params={{ questionId: daily.id }} className="neo-box block hover:-translate-y-px">
          <div className="flex items-center justify-between"><span className="neo-label">Daily question</span><Pill solid>{daily.type}</Pill></div>
          <p className="mt-2 line-clamp-2 text-sm text-text-h">{daily.body.replace(/\$|\*/g, "")}</p>
          <span className="mt-3 inline-block text-xs font-bold text-text-h">Solve now →</span>
        </Link>
        <div className="neo-box">
          <div className="neo-label">Your aptitude progress</div>
          <div className="mt-2 font-heading text-3xl font-semibold text-text-h">{solved}<span className="text-lg text-muted-foreground">/{ga.length}</span></div>
          <ProgressBar value={(solved / ga.length) * 100} className="mt-3" label="Aptitude progress" />
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">{CATS.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}</div>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((c) => (
            <button key={c.id} onClick={() => setOpen(c.id)} aria-pressed={open === c.id} className={cn("neo-box-sm p-4 text-left hover:-translate-y-px", open === c.id && "bg-primary text-primary-foreground")}>
              <div className={cn("neo-label", open === c.id && "text-primary-foreground/70")}>{c.category}</div>
              <h2 className={cn("mt-1 text-base", open === c.id && "text-primary-foreground")}>{c.title}</h2>
              <p className="mt-1 text-xs opacity-80">{c.summary}</p>
            </button>
          ))}
        </div>
        <aside className="neo-box h-fit lg:sticky lg:top-20" aria-live="polite">
          {active ? (
            <>
              <Pill>{active.category}</Pill>
              <h2 className="mt-2 text-xl">{active.title}</h2>
              <p className="mt-1 text-sm">{active.summary}</p>
              {active.formula && (
                <div className="relative my-4 border border-border bg-subtle p-4">
                  <RichText text={`$$${active.formula}$$`} />
                  <span className="absolute -top-3 right-3 rotate-2 bg-background px-1 font-hand text-base text-text-h">remember this</span>
                </div>
              )}
              <ul className="list-disc space-y-1 pl-5 text-sm">{active.keyPoints.map((k) => <li key={k}>{k}</li>)}</ul>
              {active.questionIds.length > 0 ? (
                <Link to="/practice/$questionId" params={{ questionId: active.questionIds[0] }} className="neo-btn neo-btn-primary mt-5 w-full">Practise this concept</Link>
              ) : (
                <p className="mt-5 text-xs text-muted-foreground">Practice questions for this concept are coming soon.</p>
              )}
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Pick a concept to see its notes.</p>
          )}
        </aside>
      </div>
    </>
  );
}
