import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Chip, EmptyState, PageHeader, Pill } from "@/components/gg/primitives";
import { papers } from "@/data/catalog";
import { useMockResults } from "@/hooks/use-local-store";
import { ArrowRight, FileText } from "lucide-react";

export const Route = createFileRoute("/papers")({
  head: () => ({
    meta: [
      { title: "GATE paper collections — GATE Grind" },
      {
        name: "description",
        content: "Browse available questions grouped by source exam, year and set.",
      },
      { property: "og:title", content: "GATE paper collections — GATE Grind" },
      {
        property: "og:description",
        content: "Available GATE questions organised by source exam and year.",
      },
    ],
  }),
  component: Papers,
});

function Papers() {
  const [decade, setDecade] = useState<"all" | "recent" | "older">("all");
  const [results] = useMockResults();
  const list = papers.filter(
    (p) => decade === "all" || (decade === "recent" ? p.year >= 2023 : p.year < 2023),
  );

  return (
    <>
      <PageHeader
        eyebrow="Past Official Papers"
        title="Previous Year Papers"
        description="Browse the available questions by source exam, year and set."
      >
        <span className="neo-sticker bg-neo-cyan text-black rotate-[-1deg] text-xs font-black">
          ★ {papers.length} SESSIONS
        </span>
      </PageHeader>
      <div className="mb-7 flex gap-2">
        {(["all", "recent", "older"] as const).map((d) => (
          <Chip key={d} active={decade === d} onClick={() => setDecade(d)}>
            {
              {
                all: "All Exam Years",
                recent: "Recent (2023–2025)",
                older: "Archive (Before 2023)",
              }[d]
            }
          </Chip>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState title="No papers found for this filter" />
      ) : (
        <div className="space-y-3.5">
          {list.map((p) => {
            const done = results[`paper-${p.id}`];
            return (
              <Link
                key={p.id}
                to="/papers/$paperId"
                params={{ paperId: p.id }}
                className="grid grid-cols-[85px_1fr_auto] items-center gap-4 border-2 border-border bg-surface p-4.5 shadow-[3px_3px_0_var(--border)] hover:-translate-x-0.5 hover:-translate-y-1 hover:shadow-[5px_5px_0_var(--border)] transition-all sm:grid-cols-[110px_1fr_auto_auto] group"
              >
                <div className="font-heading text-3xl font-black text-text-h tracking-tight flex items-center gap-1.5">
                  <span className="neo-sticker bg-neo-yellow text-black rotate-[-1deg] text-base font-black px-2 py-0.5">
                    {p.year}
                  </span>
                </div>
                <div>
                  <div className="text-base font-extrabold text-text-h group-hover:underline">
                    {p.title}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground font-semibold">
                    {p.questionIds.length} questions · {p.totalMarks} marks represented
                  </div>
                </div>
                <span className="hidden sm:inline">
                  {p.set ? (
                    <span className="neo-pill bg-neo-cyan text-black border-border shadow-[1px_1px_0_var(--border)] font-bold text-xs">
                      Set {p.set}
                    </span>
                  ) : (
                    <span className="neo-pill bg-surface text-text-h border-border shadow-[1px_1px_0_var(--border)] font-bold text-xs">
                      Single Set
                    </span>
                  )}
                </span>
                {done ? (
                  <span className="neo-pill bg-neo-green text-black border-border shadow-[1.5px_1.5px_0_var(--border)] font-black text-xs">
                    Completed ✓
                  </span>
                ) : (
                  <span className="neo-btn neo-btn-primary font-black text-xs px-4">
                    Open Paper <ArrowRight className="size-3.5 stroke-[3]" />
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
