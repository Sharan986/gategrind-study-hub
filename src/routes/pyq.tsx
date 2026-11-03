import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, Check, Filter, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Chip, EmptyState, PageHeader, QuestionMeta } from "@/components/gg/primitives";
import { questions } from "@/data/questions";
import { sourcePaperName } from "@/data/question-origin";
import { matchesSubject, matchesTopic, subjectById, subjects, topicName } from "@/data/subjects";
import { useAttempts, useBookmarks } from "@/hooks/use-local-store";
import type { QuestionType, SourcePaper } from "@/lib/types";

interface Search {
  subject?: string | undefined;
  topic?: string | undefined;
  year?: number | undefined;
  type?: QuestionType | undefined;
  paper?: SourcePaper | undefined;
  status?: "unsolved" | "solved" | "bookmarked" | undefined;
}

const SOURCE_PAPERS = [
  ...new Set(
    questions
      .map((question) => question.sourcePaper)
      .filter((paper): paper is SourcePaper => !!paper),
  ),
].sort((a, b) => {
  const rank = (paper: SourcePaper) => ["CSE", "IT", "DA", "DS&AI"].indexOf(paper);
  const aRank = rank(a);
  const bRank = rank(b);
  return (aRank < 0 ? 99 : aRank) - (bRank < 0 ? 99 : bRank) || a.localeCompare(b);
});

export const Route = createFileRoute("/pyq")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    subject: typeof s["subject"] === "string" ? s["subject"] : undefined,
    topic: typeof s["topic"] === "string" ? s["topic"] : undefined,
    year: s["year"] ? Number(s["year"]) : undefined,
    type: ["MCQ", "MSQ", "NAT"].includes(s["type"] as string)
      ? (s["type"] as QuestionType)
      : undefined,
    paper: SOURCE_PAPERS.includes(s["paper"] as SourcePaper)
      ? (s["paper"] as SourcePaper)
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
          "GATE questions you can filter by source paper, year, subject, topic and question type.",
      },
      { property: "og:title", content: "GATE PYQs — GATE Grind" },
      {
        property: "og:description",
        content: "Filter and practise source-labelled GATE questions.",
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
  const selectedSubject = s.subject ? subjectById(s.subject) : undefined;

  useEffect(() => {
    setVisibleCount(40);
  }, [s.subject, s.topic, s.year, s.type, s.paper, s.status]);

  const list = questions.filter((q) => {
    const subjectMatches = matchesSubject(q.subjectId, s.subject);
    const topicMatches = matchesTopic(q.topicId, s.topic, s.subject);
    const yearMatches = !s.year || q.year === s.year;
    const typeMatches = !s.type || q.type === s.type;
    const paperMatches = !s.paper || q.sourcePaper === s.paper;
    const statusMatches =
      !s.status ||
      (s.status === "solved"
        ? !!attempts[q.id]
        : s.status === "unsolved"
          ? !attempts[q.id]
          : has(q.id));
    return (
      subjectMatches && topicMatches && yearMatches && typeMatches && paperMatches && statusMatches
    );
  });

  return (
    <>
      <PageHeader
        eyebrow="Practice"
        title="Previous year questions"
        description="CSE and IT questions with source links. Content verification is in progress; check the original source when a formula or diagram looks incomplete."
      >
        <Link
          to="/papers"
          className="neo-btn bg-neo-yellow text-black font-black hover:bg-neo-yellow/85"
        >
          Attempt full papers →
        </Link>
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside
          className="space-y-5 border-2 border-border bg-surface p-4.5 shadow-[4px_4px_0_var(--border)] lg:sticky lg:top-20 lg:self-start"
          aria-label="Filters"
        >
          <div className="flex items-center gap-2 border-b-2 border-border pb-2.5">
            <Filter className="size-4 text-neo-pink" />
            <span className="neo-label text-xs font-black">Filter Questions</span>
          </div>

          <div>
            <label className="neo-label mb-1.5 block font-black" htmlFor="f-subject">
              Subject
            </label>
            <select
              id="f-subject"
              className="neo-input font-bold"
              value={s.subject ?? ""}
              onChange={(e) => set({ subject: e.target.value || undefined, topic: undefined })}
            >
              <option value="">All subjects ({questions.length})</option>
              {subjects.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
            {selectedSubject && (
              <div className="mt-3.5">
                <label className="neo-label mb-1.5 block font-black" htmlFor="f-topic">
                  Topic
                </label>
                <select
                  id="f-topic"
                  className="neo-input font-bold"
                  value={s.topic ?? ""}
                  onChange={(e) => set({ topic: e.target.value || undefined })}
                >
                  <option value="">All topics</option>
                  {selectedSubject.topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="neo-label mb-1.5 block font-black" htmlFor="f-paper">
              Source paper
            </label>
            <select
              id="f-paper"
              className="neo-input font-bold"
              value={s.paper ?? ""}
              onChange={(e) =>
                set({ paper: (e.target.value || undefined) as SourcePaper | undefined })
              }
            >
              <option value="">All source papers</option>
              {SOURCE_PAPERS.map((paper) => (
                <option key={paper} value={paper}>
                  {paper === "unclassified" || paper === "PRACTICE" || paper === "UGCNET"
                    ? sourcePaperName(paper)
                    : `GATE ${sourcePaperName(paper)}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="neo-label mb-1.5 font-black">Exam Year</div>
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
            <div className="neo-label mb-1.5 font-black">Question Type</div>
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
            <div className="neo-label mb-1.5 font-black">Progress Status</div>
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
          <div className="mb-3.5 flex items-center justify-between">
            <span className="neo-pill bg-neo-yellow text-black border-border shadow-[1.5px_1.5px_0_var(--border)] font-black text-xs">
              Showing {Math.min(visibleCount, list.length)} of {list.length} questions
            </span>
            {(s.subject || s.topic || s.year || s.type || s.paper || s.status) && (
              <button
                className="text-xs font-bold underline hover:text-neo-pink"
                onClick={() =>
                  navigate({
                    search: () => ({}),
                    replace: true,
                  })
                }
              >
                Clear all filters
              </button>
            )}
          </div>

          {list.length === 0 ? (
            <EmptyState
              title="No questions match these filters"
              description="Try adjusting your subject, year, or question type filters."
              action={
                <Link to="/pyq" search={{}} className="neo-btn neo-btn-primary font-black">
                  Reset filters
                </Link>
              }
            />
          ) : (
            <>
              <ol className="space-y-3.5">
                {list.slice(0, visibleCount).map((q) => {
                  const a = attempts[q.id];
                  return (
                    <li key={q.id}>
                      <Link
                        to="/practice/$questionId"
                        params={{ questionId: q.id }}
                        className="flex gap-4 border-2 border-border bg-surface p-4.5 shadow-[3px_3px_0_var(--border)] hover:-translate-x-0.5 hover:-translate-y-1 hover:shadow-[5px_5px_0_var(--border)] transition-all group"
                      >
                        <div className="w-12 shrink-0">
                          <span className="neo-sticker bg-neo-yellow text-black rotate-[-1deg] text-xs font-black px-1.5 py-0.5 block text-center">
                            Q{q.number}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <QuestionMeta q={q} />
                          <p className="mt-2 line-clamp-2 text-sm text-text-h font-medium group-hover:underline">
                            {q.body.replace(/\$|\\/g, "")}
                          </p>
                          <div className="mt-1.5 text-[11px] text-muted-foreground font-semibold">
                            {topicName(q.subjectId, q.topicId)}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          {a &&
                            (a.correct ? (
                              <span className="neo-pill bg-neo-green text-black border-border shadow-[1px_1px_0_var(--border)] font-bold text-[10px]">
                                <Check className="size-3.5 stroke-[3]" /> SOLVED
                              </span>
                            ) : (
                              <span className="neo-pill bg-neo-pink text-white border-border shadow-[1px_1px_0_var(--border)] font-bold text-[10px]">
                                <X className="size-3.5 stroke-[3]" /> WRONG
                              </span>
                            ))}
                          {has(q.id) && (
                            <span className="neo-pill bg-neo-purple text-black border-border shadow-[1px_1px_0_var(--border)] font-bold text-[10px]">
                              <Bookmark className="size-3 fill-current" /> SAVED
                            </span>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
              {visibleCount < list.length && (
                <div className="mt-8 flex justify-center">
                  <button
                    className="neo-btn bg-neo-yellow text-black font-black hover:bg-neo-yellow/85 px-6 py-2.5 shadow-[4px_4px_0_var(--border)] text-sm"
                    onClick={() => setVisibleCount((c) => c + 40)}
                  >
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
