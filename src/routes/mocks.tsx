import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Chip, DifficultyPill, PageHeader, Pill } from "@/components/gg/primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { mocks } from "@/data/catalog";
import { useMockResults } from "@/hooks/use-local-store";
import type { MockTest } from "@/lib/types";
import { Clock, HelpCircle, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mocks")({
  head: () => ({
    meta: [
      { title: "Mock tests — GATE Grind" },
      {
        name: "description",
        content: "Timed GATE CSE mock tests with GATE-style marking and detailed results.",
      },
      { property: "og:title", content: "GATE CSE mock tests — GATE Grind" },
      {
        property: "og:description",
        content: "Full-length, subject and topic mocks with an exam-style interface.",
      },
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

  const catBadge = (category: string) => {
    switch (category) {
      case "Full Length":
        return "bg-neo-pink text-white";
      case "Subject":
        return "bg-neo-cyan text-black";
      case "Topic":
        return "bg-neo-purple text-black";
      case "Aptitude":
        return "bg-neo-yellow text-black";
      default:
        return "bg-neo-yellow text-black";
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Exam Simulations"
        title="Timed Mock Tests"
        description="Official GATE scoring engine (+1/+2 MCQ, −⅓/−⅔ negative marking, zero negative marking on MSQ/NAT). Timed with an exam palette."
      >
        <span className="neo-sticker bg-neo-yellow text-black rotate-[-1deg] text-xs font-black">
          ★ {mocks.length} CURATED TESTS
        </span>
      </PageHeader>
      <div className="mb-7 flex flex-wrap gap-2">
        {CATS.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
          </Chip>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {list.map((m) => {
          const isDone = !!results[m.id];
          return (
            <article
              key={m.id}
              className={cn(
                "neo-box flex flex-col border-2 border-border bg-surface shadow-[4px_4px_0_var(--border)] hover:-translate-x-0.5 hover:-translate-y-1 hover:shadow-[6px_6px_0_var(--border)] transition-all",
                m.category === "Full Length" && "border-t-[6px] border-t-neo-pink",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "neo-sticker text-[10px] font-black rotate-[-1deg]",
                    catBadge(m.category),
                  )}
                >
                  {m.category}
                </span>
                <DifficultyPill d={m.difficulty} />
              </div>
              <h2 className="mt-3.5 text-xl font-black text-text-h">{m.title}</h2>
              <p className="mt-1.5 flex-1 text-xs text-muted-foreground font-medium leading-relaxed">
                {m.description}
              </p>
              <div className="mt-5 flex items-center justify-between border-t-2 border-border pt-3 text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="size-3.5 text-neo-pink" />
                  <b className="text-text-h font-black">{m.questionIds.length}</b> Questions
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-neo-cyan" />
                  <b className="text-text-h font-black">{m.durationMin}</b> Minutes
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  className="neo-btn neo-btn-primary flex-1 font-black shadow-[3px_3px_0_var(--border)]"
                  onClick={() => setSel(m)}
                >
                  {isDone ? "Retake Test" : "Start Test →"}
                </button>
                {isDone && (
                  <Link
                    to="/mocks/$testId/result"
                    params={{ testId: m.id }}
                    className="neo-btn bg-neo-cyan text-black font-bold shadow-[2px_2px_0_var(--border)]"
                  >
                    Scorecard
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="rounded-none border-2 border-border bg-surface shadow-[6px_6px_0_var(--border)] p-6 max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="neo-sticker bg-neo-yellow text-black rotate-[-1deg] text-[10px] font-black">
                EXAM INSTRUCTIONS
              </span>
            </div>
            <DialogTitle className="font-heading text-2xl font-black">{sel?.title}</DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground">
              Review standard GATE CSE examination guidelines before timer begins:
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 border-2 border-border bg-subtle p-3.5 text-xs font-semibold">
            <li className="flex items-start gap-2">
              <span className="neo-pill bg-neo-yellow text-black font-black text-[10px] size-5 justify-center">
                1
              </span>
              <span>
                <b>{sel?.questionIds.length} questions</b> in <b>{sel?.durationMin} minutes</b>.
                Test auto-submits when time expires.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="neo-pill bg-neo-cyan text-black font-black text-[10px] size-5 justify-center">
                2
              </span>
              <span>
                <b>MCQ Scoring</b>: +1 or +2 for correct. Negative ⅓ or ⅔ for wrong selections.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="neo-pill bg-neo-purple text-black font-black text-[10px] size-5 justify-center">
                3
              </span>
              <span>
                <b>MSQ & NAT</b>: ZERO negative marking. MSQ requires all correct options to be
                selected.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="neo-pill bg-neo-green text-black font-black text-[10px] size-5 justify-center">
                4
              </span>
              <span>
                Use <b>Mark for Review</b> on questions you wish to revisit in the palette.
              </span>
            </li>
          </ul>
          <div className="mt-3 flex justify-end gap-2.5">
            <button className="neo-btn font-bold" onClick={() => setSel(null)}>
              Cancel
            </button>
            {sel && (
              <Link
                to="/mocks/$testId/attempt"
                params={{ testId: sel.id }}
                className="neo-btn neo-btn-primary font-black px-5"
              >
                I'm Ready, Begin Test →
              </Link>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
