import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Chip, EmptyState, PageHeader, Pill } from "@/components/gg/primitives";
import { papers } from "@/data/catalog";
import { useMockResults } from "@/hooks/use-local-store";

export const Route = createFileRoute("/papers")({
  head: () => ({
    meta: [
      { title: "GATE CSE papers — GATE Grind" },
      { name: "description", content: "Attempt complete GATE CSE papers from every year and set." },
      { property: "og:title", content: "GATE CSE papers — GATE Grind" },
      { property: "og:description", content: "Full previous-year GATE CSE papers to attempt under exam conditions." },
    ],
  }),
  component: Papers,
});

function Papers() {
  const [decade, setDecade] = useState<"all" | "recent" | "older">("all");
  const [results] = useMockResults();
  const list = papers.filter((p) => decade === "all" || (decade === "recent" ? p.year >= 2023 : p.year < 2023));
  return (
    <>
      <PageHeader eyebrow="Papers" title="Previous year papers" description="Work through each paper as it was set: in order, with a timer and GATE marking." />
      <div className="mb-6 flex gap-1.5">
        {(["all", "recent", "older"] as const).map((d) => <Chip key={d} active={decade === d} onClick={() => setDecade(d)}>{{ all: "All years", recent: "2023+", older: "Before 2023" }[d]}</Chip>)}
      </div>
      {list.length === 0 ? <EmptyState title="No papers" /> : (
        <div className="border-t border-border">
          {list.map((p) => {
            const done = results[`paper-${p.id}`];
            return (
              <Link key={p.id} to="/papers/$paperId" params={{ paperId: p.id }} className="grid grid-cols-[80px_1fr_auto] items-center gap-4 border-b border-border py-4 hover:bg-subtle sm:grid-cols-[100px_1fr_auto_auto]">
                <span className="font-heading text-3xl font-semibold text-text-h">{p.year}</span>
                <div>
                  <div className="text-sm text-text-h">{p.title}</div>
                  <div className="text-xs text-muted-foreground">{p.questionIds.length} questions in demo · {p.durationMin} min · {p.totalMarks} marks</div>
                </div>
                <span className="hidden sm:inline">{p.set ? <Pill>Set {p.set}</Pill> : <Pill>Single set</Pill>}</span>
                {done ? <Pill solid>Attempted</Pill> : <span className="neo-btn">Open</span>}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
