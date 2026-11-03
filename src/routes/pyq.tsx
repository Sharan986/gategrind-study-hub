import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Chip, EmptyState, PageHeader, QuestionMeta } from "@/components/gg/primitives";
import { questions } from "@/data/questions";
import { subjectById, subjects, topicName } from "@/data/subjects";
import { useAttempts, useBookmarks } from "@/hooks/use-local-store";
import type { QuestionType } from "@/lib/types";

interface Search {
  subject?: string | undefined;
  topic?: string | undefined;
  year?: number | undefined;
  type?: QuestionType | undefined;
  status?: "unsolved" | "solved" | "bookmarked" | undefined;
}

export const Route = createFileRoute("/pyq")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    subject: typeof s["subject"] === "string" ? s["subject"] : undefined,
    topic: typeof s["topic"] === "string" ? s["topic"] : undefined,
    year: s["year"] ? Number(s["year"]) : undefined,
    type: ["MCQ", "MSQ", "NAT"].includes(s["type"] as string)
      ? (s["type"] as QuestionType)
      : undefined,
    status: ["unsolved", "solved", "bookmarked"].includes(s["status"] as string)
      ? (s["status"] as Search["status"])
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Previous year questions — GATE Grind" },
      {
        name: "description",
        content:
          "GATE CSE previous-year questions you can filter by year, subject, topic and question type.",
      },
      { property: "og:title", content: "GATE CSE PYQs — GATE Grind" },
      {
        property: "og:description",
        content: "Filter and practise GATE CSE previous-year questions.",
      },
    ],
  }),
  component: Pyq,
});

const YEARS = [...new Set(questions.map((q) => q.year))].sort((a, b) => b - a);

function Pyq() {
  const s = Route.useSearch();
  const navigate = Route.useNavigate();
  const [attempts] = useAttempts();
  const { has } = useBookmarks();
  const [visibleCount, setVisibleCount] = useState(40);
  const set = (patch: Partial<Search>) =>
    navigate({ search: (p: Search) => ({ ...p, ...patch }), replace: true });

  useEffect(() => {
    setVisibleCount(40);
  }, [s.subject, s.topic, s.year, s.type, s.status]);

  const list = questions.filter((q) => {
    const subjectMatches =
      !s.subject ||
      q.subjectId === s.subject ||
      subjectById(q.subjectId)?.slug === s.subject ||
      subjectById(s.subject)?.id === q.subjectId;
    const topicMatches = !s.topic || q.topicId === s.topic;
    const yearMatches = !s.year || q.year === s.year;
    const typeMatches = !s.type || q.type === s.type;
    const statusMatches =
      !s.status ||
      (s.status === "solved"
        ? !!attempts[q.id]
        : s.status === "unsolved"
          ? !attempts[q.id]
          : has(q.id));
    return subjectMatches && topicMatches && yearMatches && typeMatches && statusMatches;
  });

  return (
    <>
      <PageHeader
        eyebrow="Practice"
        title="Previous year questions"
        description="Every question links to study mode, where you'll find a worked solution."
      >
        <Link to="/papers" className="neo-btn">
          Attempt full papers
        </Link>
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start" aria-label="Filters">
          <div>
            <label className="neo-label mb-1.5 block" htmlFor="f-subject">
              Subject
            </label>
            <select
              id="f-subject"
              className="neo-input"
              value={s.subject ?? ""}
              onChange={(e) => set({ subject: e.target.value || undefined, topic: undefined })}
            >
              <option value="">All subjects</option>
              {subjects.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
            {s.topic && s.subject && (
              <button className="neo-pill mt-2" onClick={() => set({ topic: undefined })}>
                {topicName(s.subject, s.topic)} ✕
              </button>
            )}
          </div>
          <div>
            <div className="neo-label mb-1.5">Year</div>
            <div className="flex max-h-52 flex-wrap gap-1.5 overflow-y-auto pr-1">
              <Chip active={!s.year} onClick={() => set({ year: undefined })}>
                All
              </Chip>
              {YEARS.map((y) => (
                <Chip key={y} active={s.year === y} onClick={() => set({ year: y })}>
                  {y}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <div className="neo-label mb-1.5">Type</div>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={!s.type} onClick={() => set({ type: undefined })}>
                All
              </Chip>
              {(["MCQ", "MSQ", "NAT"] as const).map((t) => (
                <Chip key={t} active={s.type === t} onClick={() => set({ type: t })}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <div className="neo-label mb-1.5">Status</div>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={!s.status} onClick={() => set({ status: undefined })}>
                All
              </Chip>
              {(["unsolved", "solved", "bookmarked"] as const).map((t) => (
                <Chip key={t} active={s.status === t} onClick={() => set({ status: t })}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>
        </aside>

        <section>
          <div className="mb-3 text-xs text-muted-foreground">
            {list.length} question{list.length === 1 ? "" : "s"}
          </div>
          {list.length === 0 ? (
            <EmptyState
              title="No questions match these filters"
              description="Try removing a filter."
              action={
                <Link to="/pyq" search={{}} className="neo-btn">
                  Reset filters
                </Link>
              }
            />
          ) : (
            <>
              <ol className="space-y-3">
                {list.slice(0, visibleCount).map((q) => {
                  const a = attempts[q.id];
                  return (
                    <li key={q.id}>
                      <Link
                        to="/practice/$questionId"
                        params={{ questionId: q.id }}
                        className="neo-box-sm flex gap-4 p-4 hover:-translate-y-px"
                      >
                        <div className="w-10 shrink-0 font-heading text-lg font-semibold text-text-h">
                          Q{q.number}
                        </div>
                        <div className="min-w-0 flex-1">
                          <QuestionMeta q={q} />
                          <p className="mt-2 line-clamp-2 text-sm text-text-h">
                            {q.body.replace(/\$|\\/g, "")}
                          </p>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {topicName(q.subjectId, q.topicId)}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          {a &&
                            (a.correct ? (
                              <Check
                                className="size-4 text-success"
                                aria-label="Solved correctly"
                              />
                            ) : (
                              <X className="size-4 text-danger" aria-label="Answered wrong" />
                            ))}
                          {has(q.id) && (
                            <Bookmark
                              className="size-4 fill-current text-text-h"
                              aria-label="Bookmarked"
                            />
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
              {visibleCount < list.length && (
                <div className="mt-6 flex justify-center">
                  <button className="neo-btn" onClick={() => setVisibleCount((c) => c + 40)}>
                    Load more questions ({list.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
