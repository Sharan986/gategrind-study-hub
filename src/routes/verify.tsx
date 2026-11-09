import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  Download,
  ExternalLink,
  Filter,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Chip, EmptyState, PageHeader } from "@/components/gg/primitives";
import { QuestionVerificationBanner } from "@/components/gg/QuestionView";
import { RichText } from "@/components/gg/RichText";
import { questionOriginLabel } from "@/data/question-origin";
import { questions } from "@/data/questions";
import { matchesSubject, subjectById, subjects } from "@/data/subjects";
import { useQuestionVerifications } from "@/hooks/use-local-store";
import type { QuestionType } from "@/lib/types";

interface VerifySearch {
  subject?: string | undefined;
  year?: number | undefined;
  type?: QuestionType | undefined;
  filter?: "all-pending" | "approved-by-you" | "flagged-issues" | "missing-options" | undefined;
  q?: string | undefined;
}

export const Route = createFileRoute("/verify")({
  validateSearch: (s: Record<string, unknown>): VerifySearch => ({
    subject: typeof s["subject"] === "string" ? s["subject"] : undefined,
    year: s["year"] ? Number(s["year"]) : undefined,
    type: ["MCQ", "MSQ", "NAT", "DESCRIPTIVE"].includes(s["type"] as string)
      ? (s["type"] as QuestionType)
      : undefined,
    filter: ["all-pending", "approved-by-you", "flagged-issues", "missing-options"].includes(
      s["filter"] as string,
    )
      ? (s["filter"] as VerifySearch["filter"])
      : undefined,
    q: typeof s["q"] === "string" ? s["q"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Question Verification Hub — GATE Grind" },
      {
        name: "description",
        content:
          "Help review and verify unverified GATE past year questions. Solve, compare with official sources, and approve question records.",
      },
    ],
  }),
  component: VerifyHub,
});

const YEARS = [...new Set(questions.map((q) => q.year))].sort((a, b) => b - a);

function VerifyHub() {
  const s = Route.useSearch();
  const navigate = Route.useNavigate();
  const { verifications, isApproved, isFlagged } = useQuestionVerifications();

  const [visibleCount, setVisibleCount] = useState(30);
  const [searchTerm, setSearchTerm] = useState(s.q || "");

  const set = (patch: Partial<VerifySearch>) =>
    navigate({ search: (p: VerifySearch) => ({ ...p, ...patch }), replace: true });

  const activeFilter = s.filter || "all-pending";

  useEffect(() => {
    setVisibleCount(30);
  }, [s.subject, s.year, s.type, s.filter, s.q]);

  // Total unverified questions in bank
  const unverifiedQuestions = useMemo(
    () => questions.filter((q) => q.quality?.status === "needs-review"),
    [],
  );

  const approvedCount = useMemo(
    () => Object.values(verifications).filter((v) => v.status === "approved").length,
    [verifications],
  );

  const flaggedCount = useMemo(
    () => Object.values(verifications).filter((v) => v.status === "flagged_issue").length,
    [verifications],
  );

  // Filter questions list
  const list = useMemo(() => {
    return questions.filter((q) => {
      // 1. Verification filter
      if (activeFilter === "approved-by-you") {
        if (!isApproved(q.id)) return false;
      } else if (activeFilter === "flagged-issues") {
        if (!isFlagged(q.id)) return false;
      } else if (activeFilter === "missing-options") {
        if (!q.quality?.issues.includes("missing-options")) return false;
      } else {
        // 'all-pending': show questions needing review
        if (q.quality?.status !== "needs-review") return false;
      }

      // 2. Subject match
      if (s.subject && !matchesSubject(q.subjectId, s.subject)) return false;

      // 3. Year match
      if (s.year && q.year !== s.year) return false;

      // 4. Type match
      if (s.type && q.type !== s.type) return false;

      // 5. Search query
      if (s.q) {
        const query = s.q.toLowerCase().trim();
        const inId = q.id.toLowerCase().includes(query);
        const inBody = q.body.toLowerCase().includes(query);
        if (!inId && !inBody) return false;
      }

      return true;
    });
  }, [activeFilter, isApproved, isFlagged, s.subject, s.year, s.type, s.q]);

  const exportReviews = () => {
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(verifications, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `gategrind_solver_verifications_${new Date().toISOString().slice(0, 10)}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        eyebrow="Community Review & Verification"
        title="Question Verification Hub"
        description="Review unverified past year questions, verify content against official sources, and approve correct questions or report errors."
      >
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={exportReviews}
            className="neo-btn neo-btn-secondary text-xs flex items-center gap-1.5 font-bold"
            title="Download JSON of all verification decisions you made"
          >
            <Download className="size-3.5" />
            <span>Export Verifications (.json)</span>
          </button>
        </div>
      </PageHeader>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="neo-box border-2 border-border bg-surface shadow-[4px_4px_0_var(--border)] p-4">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Needs Verification
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black">{unverifiedQuestions.length}</span>
            <span className="text-xs text-muted-foreground font-medium">in question bank</span>
          </div>
        </div>

        <div className="neo-box border-2 border-border bg-[#DCFCE7] dark:bg-[#064E3B]/40 shadow-[4px_4px_0_var(--success)] p-4">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
            Approved by You
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {approvedCount}
            </span>
            <span className="text-xs text-emerald-900 dark:text-emerald-200 font-medium">
              questions approved
            </span>
          </div>
        </div>

        <div className="neo-box border-2 border-border bg-[#FFE4E6] dark:bg-[#4C0519]/40 shadow-[4px_4px_0_var(--danger)] p-4">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 block">
            Issues Flagged
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700 dark:text-rose-400">
              {flaggedCount}
            </span>
            <span className="text-xs text-rose-900 dark:text-rose-200 font-medium">
              corrections submitted
            </span>
          </div>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase text-muted-foreground mr-1 flex items-center gap-1">
            <Filter className="size-3" /> Mode:
          </span>
          <Chip
            active={activeFilter === "all-pending"}
            onClick={() => set({ filter: "all-pending" })}
          >
            All Pending ({unverifiedQuestions.length})
          </Chip>
          <Chip
            active={activeFilter === "approved-by-you"}
            onClick={() => set({ filter: "approved-by-you" })}
          >
            Approved by You ({approvedCount})
          </Chip>
          <Chip
            active={activeFilter === "flagged-issues"}
            onClick={() => set({ filter: "flagged-issues" })}
          >
            Issues Reported ({flaggedCount})
          </Chip>
          <Chip
            active={activeFilter === "missing-options"}
            onClick={() => set({ filter: "missing-options" })}
          >
            Missing Options
          </Chip>
        </div>

        {/* Search & Secondary Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search unverified questions by text or ID (e.g. 1987, handshaking, q_vol1_2_2_1)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  set({ q: searchTerm.trim() || undefined });
                }
              }}
              className="neo-input pl-9 text-xs w-full py-2 font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  set({ q: undefined });
                }}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-text-h"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <select
            className="neo-select text-xs py-2 px-2.5 font-bold"
            value={s.subject || ""}
            onChange={(e) => set({ subject: e.target.value || undefined })}
          >
            <option value="">All Subjects</option>
            {subjects.map((subj) => (
              <option key={subj.id} value={subj.id}>
                {subj.name}
              </option>
            ))}
          </select>

          <select
            className="neo-select text-xs py-2 px-2.5 font-bold"
            value={s.year || ""}
            onChange={(e) => set({ year: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">All Years</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                GATE {y}
              </option>
            ))}
          </select>

          <select
            className="neo-select text-xs py-2 px-2.5 font-bold"
            value={s.type || ""}
            onChange={(e) => set({ type: (e.target.value as QuestionType) || undefined })}
          >
            <option value="">All Types</option>
            <option value="MCQ">MCQ</option>
            <option value="MSQ">MSQ</option>
            <option value="NAT">NAT</option>
            <option value="DESCRIPTIVE">DESCRIPTIVE</option>
          </select>
        </div>
      </div>

      {/* Question Results List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
          <span>
            Showing {Math.min(list.length, visibleCount)} of {list.length} questions
          </span>
          {(s.subject || s.year || s.type || s.filter || s.q) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                navigate({ search: {}, replace: true });
              }}
              className="underline hover:text-text-h"
            >
              Reset all filters
            </button>
          )}
        </div>

        {list.length === 0 ? (
          <EmptyState
            title="No questions match your filter criteria"
            description="Try choosing a different subject, clearing your search query, or switching verification mode."
            action={
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  navigate({ search: {}, replace: true });
                }}
                className="neo-btn neo-btn-primary text-xs font-bold"
              >
                Reset Filters
              </button>
            }
          />
        ) : (
          <div className="space-y-5">
            {list.slice(0, visibleCount).map((q) => {
              const subj = subjectById(q.subjectId);
              const approved = isApproved(q.id);
              const flagged = isFlagged(q.id);

              return (
                <article
                  key={q.id}
                  className="neo-box border-2 border-border bg-surface p-5 shadow-[5px_5px_0_var(--border)] space-y-4"
                >
                  {/* Question Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border/20 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="neo-pill bg-neo-yellow text-black text-xs font-black">
                        {questionOriginLabel(q)} Q{q.number}
                      </span>
                      {subj && (
                        <span className="neo-pill bg-surface text-text-h text-xs font-bold">
                          {subj.short}
                        </span>
                      )}
                      <span className="neo-pill bg-surface text-muted-foreground text-xs font-semibold">
                        {q.marks} Mark{q.marks > 1 ? "s" : ""}
                      </span>
                      <span className="neo-pill bg-surface text-muted-foreground text-xs font-semibold">
                        {q.type}
                      </span>
                      {approved && (
                        <span className="neo-pill bg-neo-green text-black text-xs font-bold flex items-center gap-1">
                          <Check className="size-3 stroke-[3]" />
                          Approved by You
                        </span>
                      )}
                      {flagged && (
                        <span className="neo-pill bg-neo-pink text-white text-xs font-bold flex items-center gap-1">
                          <ShieldAlert className="size-3" />
                          Issue Flagged
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {q.sourceUrl && (
                        <a
                          href={q.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="neo-btn text-xs py-1 px-2.5 font-bold bg-surface flex items-center gap-1 hover:bg-surface/80"
                        >
                          <span>Compare Source</span>
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                      <Link
                        to="/practice/$questionId"
                        params={{ questionId: q.id }}
                        className="neo-btn neo-btn-primary text-xs py-1 px-3 font-bold"
                      >
                        Solve ↗
                      </Link>
                    </div>
                  </div>

                  {/* Solver Verification Banner / Action Option */}
                  <QuestionVerificationBanner q={q} />

                  {/* Question Body */}
                  <div className="pt-1">
                    <RichText
                      text={q.body}
                      className="text-sm leading-relaxed text-text-h font-medium line-clamp-4"
                    />
                  </div>

                  {/* Options Preview (if any) */}
                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/20">
                      {q.options.map((opt) => (
                        <div
                          key={opt.id}
                          className="text-xs p-2 border border-border/50 bg-background/50 flex items-start gap-2"
                        >
                          <span className="font-bold shrink-0">{opt.id}.</span>
                          <RichText text={opt.text} className="text-xs text-text-h" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Official Answer & Issues Metadata */}
                  <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/20 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-h">
                        Official Answer:{" "}
                        {Array.isArray(q.answer)
                          ? q.answer.join(", ")
                          : typeof q.answer === "object"
                            ? `[${q.answer.min}, ${q.answer.max}]`
                            : String(q.answer)}
                      </span>
                    </div>

                    {q.quality?.issues && q.quality.issues.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold">Issues:</span>
                        {q.quality.issues.map((iss) => (
                          <span
                            key={iss}
                            className="text-[10px] px-1.5 py-0.5 border border-border bg-amber-500/10 text-amber-900 dark:text-amber-300 font-mono font-medium"
                          >
                            {iss}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}

            {visibleCount < list.length && (
              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + 30)}
                  className="neo-btn neo-btn-secondary px-6 py-2.5 font-bold text-xs"
                >
                  Load More Questions ({list.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
