import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Chip, DifficultyPill, PageHeader, Pill } from "@/components/gg/primitives";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mocks } from "@/data/catalog";
import { useMockResults } from "@/hooks/use-local-store";
import type { MockTest } from "@/lib/types";

export const Route = createFileRoute("/mocks")({
  head: () => ({
    meta: [
      { title: "Mock tests — GATE Grind" },
      { name: "description", content: "Timed GATE CSE mock tests with GATE-style marking and detailed results." },
      { property: "og:title", content: "GATE CSE mock tests — GATE Grind" },
      { property: "og:description", content: "Full-length, subject and topic mocks with an exam-style interface." },
    ],
  }),
  component: Mocks,
});

const CATS = ["All", "Full Length", "Subject", "Topic", "Aptitude"] as const;

function Mocks() {
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const [sel, setSel] = useState<MockTest | null>(null);
  const [results] = useMockResults();
  const list = mocks.filter((m) => cat === "All" || m.category === cat);
  return (
    <>
      <PageHeader eyebrow="Test series" title="Mock tests" description="Timed tests with a question palette, mark-for-review and GATE marking. Your results stay on this device." />
      <div className="mb-6 flex flex-wrap gap-1.5">{CATS.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}</div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {list.map((m) => (
          <article key={m.id} className="neo-box flex flex-col">
            <div className="flex items-center justify-between"><Pill solid>{m.category}</Pill><DifficultyPill d={m.difficulty} /></div>
            <h2 className="mt-3 text-lg">{m.title}</h2>
            <p className="mt-1 flex-1 text-xs text-muted-foreground">{m.description}</p>
            <div className="mt-4 flex gap-4 border-t border-border pt-3 text-xs">
              <span><b className="text-text-h">{m.questionIds.length}</b> Qs</span>
              <span><b className="text-text-h">{m.durationMin}</b> min</span>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="neo-btn neo-btn-primary flex-1" onClick={() => setSel(m)}>{results[m.id] ? "Retake" : "Start test"}</button>
              {results[m.id] && <Link to="/mocks/$testId/result" params={{ testId: m.id }} className="neo-btn">Result</Link>}
            </div>
          </article>
        ))}
      </div>

      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="rounded-none border-border shadow-[4px_4px_0_var(--border)]">
          <DialogHeader>
            <DialogTitle className="font-heading">{sel?.title}</DialogTitle>
            <DialogDescription>Read the instructions before you start.</DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-1.5 pl-5 text-xs">
            <li>{sel?.questionIds.length} questions · {sel?.durationMin} minutes. The test submits itself when time runs out.</li>
            <li>MCQ: +1/+2 for a correct answer, −⅓/−⅔ for a wrong one.</li>
            <li>MSQ and NAT have no negative marking. MSQ needs every correct option selected.</li>
            <li>Use <b>Mark for review</b> to come back to a question. The palette shows each question's status.</li>
          </ul>
          <div className="mt-2 flex justify-end gap-2">
            <button className="neo-btn" onClick={() => setSel(null)}>Cancel</button>
            {sel && <Link to="/mocks/$testId/attempt" params={{ testId: sel.id }} className="neo-btn neo-btn-primary">I'm ready, begin</Link>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
