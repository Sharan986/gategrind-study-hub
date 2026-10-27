import { Check, X, Sparkles, ShieldCheck, AlertTriangle, ExternalLink } from "lucide-react";
import { useState } from "react";
import type { Question } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CodeBlock, RichText } from "./RichText";
import { buildExplainPrompt, chatgptUrl, claudeUrl } from "@/lib/ai-prompt";
import { useQuestionVerifications, type SolverIssueCategory } from "@/hooks/use-local-store";

export type Response = string[] | string | undefined;

/** Solver Verification Banner allowing solvers to review, approve, or report issues for unverified questions. */
export function QuestionVerificationBanner({ q }: { q: Question }) {
  const { isApproved, isFlagged, getRecord, approve, flagIssue, revoke } =
    useQuestionVerifications();
  const [formOpen, setFormOpen] = useState(false);
  const [mode, setMode] = useState<"approve" | "issue">("approve");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState<SolverIssueCategory>("wrong_answer_key");
  const [proposedAnswer, setProposedAnswer] = useState("");

  const record = getRecord(q.id);
  const approved = isApproved(q.id);
  const flagged = isFlagged(q.id);

  if (approved) {
    return (
      <div className="border-2 border-success bg-[#DCFCE7] dark:bg-[#064E3B]/60 p-3.5 text-sm text-text-h shadow-[3px_3px_0_var(--success)] space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold text-success dark:text-emerald-400">
            <ShieldCheck className="size-4 stroke-[2.5]" />
            <span>Verified by Question Solver (You)</span>
          </div>
          <button
            type="button"
            onClick={() => revoke(q.id)}
            className="text-xs font-semibold underline text-muted-foreground hover:text-text-h"
          >
            Revoke Approval
          </button>
        </div>
        <p className="text-xs text-text-h leading-relaxed">
          You confirmed this question's text, options, and answer key are correct.
          {record?.solverNotes && (
            <span className="block mt-1 font-medium italic text-muted-foreground">
              Notes: "{record.solverNotes}"
            </span>
          )}
        </p>
      </div>
    );
  }

  if (flagged) {
    return (
      <div className="border-2 border-danger bg-[#FFE4E6] dark:bg-[#4C0519]/60 p-3.5 text-sm text-text-h shadow-[3px_3px_0_var(--danger)] space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold text-danger dark:text-rose-400">
            <AlertTriangle className="size-4 stroke-[2.5]" />
            <span>Issue Reported by You ({record?.issueCategory?.replace(/_/g, " ")})</span>
          </div>
          <button
            type="button"
            onClick={() => revoke(q.id)}
            className="text-xs font-semibold underline text-muted-foreground hover:text-text-h"
          >
            Edit / Revoke Report
          </button>
        </div>
        {record?.solverNotes && (
          <p className="text-xs text-text-h">Feedback: "{record.solverNotes}"</p>
        )}
      </div>
    );
  }

  // Question needs review / unverified
  if (q.quality?.status !== "needs-review") {
    return null;
  }

  return (
    <div className="border-2 border-border bg-neo-yellow/20 p-3.5 text-sm text-text-h shadow-[3px_3px_0_var(--border)] space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="font-bold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
            Verification Pending
          </span>
          <p className="text-xs text-text-h mt-0.5">
            The text or answer choices for this question are still being checked against the source.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {q.sourceUrl && (
            <a
              href={q.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="neo-btn text-xs py-1 px-2.5 flex items-center gap-1 font-bold bg-surface hover:bg-surface/80"
            >
              <span>Source</span>
              <ExternalLink className="size-3" />
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              setMode("approve");
              setFormOpen(true);
            }}
            className="neo-btn text-xs py-1 px-2.5 font-bold bg-neo-green text-black hover:bg-neo-green/90"
          >
            ✓ Approve
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("issue");
              setFormOpen(true);
            }}
            className="neo-btn text-xs py-1 px-2.5 font-bold bg-neo-pink text-white hover:bg-neo-pink/90"
          >
            ⚠ Report Issue
          </button>
        </div>
      </div>

      {formOpen && (
        <div className="mt-3 border-t-2 border-border/40 pt-3 space-y-3">
          {mode === "approve" ? (
            <div className="space-y-2">
              <span className="font-extrabold text-xs block">Approve Question as Solver</span>
              <p className="text-xs text-muted-foreground">
                Confirm that you solved or checked this question and that the question text, options
                (if any), and answer key are accurate.
              </p>
              <input
                type="text"
                placeholder="Optional solver notes (e.g., Verified against official GATE key / solved manually)"
                className="neo-input text-xs w-full py-1.5 px-2.5"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    approve(q.id, notes.trim() || undefined);
                    setFormOpen(false);
                    setNotes("");
                  }}
                  className="neo-btn text-xs py-1 px-3 bg-neo-green text-black font-bold"
                >
                  Confirm & Approve
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="neo-btn text-xs py-1 px-3 bg-surface font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="font-extrabold text-xs block">
                Report Issue / Propose Correction
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  className="neo-select text-xs py-1.5 px-2 font-medium"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SolverIssueCategory)}
                >
                  <option value="wrong_answer_key">Wrong Answer Key</option>
                  <option value="missing_options">Missing Option Choices</option>
                  <option value="typo_latex">Typo / LaTeX Math Error</option>
                  <option value="truncated_body">Truncated Question Text</option>
                  <option value="other">Other Content Defect</option>
                </select>
                <input
                  type="text"
                  placeholder="Proposed correct answer (e.g. C, or range 15-18)"
                  className="neo-input text-xs flex-1 py-1.5 px-2.5"
                  value={proposedAnswer}
                  onChange={(e) => setProposedAnswer(e.target.value)}
                />
              </div>
              <textarea
                rows={2}
                placeholder="Describe the issue or suggested fix..."
                className="neo-input text-xs w-full py-1.5 px-2.5"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    flagIssue(
                      q.id,
                      category,
                      notes.trim() || undefined,
                      proposedAnswer.trim() || undefined,
                    );
                    setFormOpen(false);
                    setNotes("");
                    setProposedAnswer("");
                  }}
                  className="neo-btn text-xs py-1 px-3 bg-neo-pink text-white font-bold"
                >
                  Submit Issue Report
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="neo-btn text-xs py-1 px-3 bg-surface font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Question body + answer inputs. `revealed` shows correct/incorrect state. */
export function QuestionView({
  q,
  response,
  onChange,
  revealed,
}: {
  q: Question;
  response: Response;
  onChange: (r: Response) => void;
  revealed?: boolean;
}) {
  const selected = Array.isArray(response) ? response : [];
  const correct = Array.isArray(q.answer) ? q.answer : [];

  const pick = (id: string) => {
    if (revealed) return;
    if (q.type === "MCQ") onChange([id]);
    else onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  return (
    <div className="space-y-6">
      <QuestionVerificationBanner q={q} />
      <RichText text={q.body} className="text-[15px] leading-relaxed text-text-h font-medium" />
      {q.code && <CodeBlock {...q.code} />}

      {q.type !== "NAT" && q.options && (
        <div
          role={q.type === "MCQ" ? "radiogroup" : "group"}
          aria-label="Options"
          className="space-y-3"
        >
          {q.type === "MSQ" && (
            <div className="neo-sticker bg-neo-purple text-black rotate-[-0.5deg] text-[10.5px]">
              Select one or more options (MSQ)
            </div>
          )}
          {q.options.map((o) => {
            const isSel = selected.includes(o.id);
            const isAns = correct.includes(o.id);
            const state = !revealed
              ? isSel
                ? "sel"
                : "idle"
              : isAns
                ? "right"
                : isSel
                  ? "wrong"
                  : "dim";
            return (
              <button
                key={o.id}
                type="button"
                role={q.type === "MCQ" ? "radio" : "checkbox"}
                aria-checked={isSel}
                onClick={() => pick(o.id)}
                disabled={revealed}
                className={cn(
                  "flex w-full items-start gap-3.5 border-2 border-border p-3.5 text-left transition-all cursor-pointer",
                  !revealed &&
                    "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--border)]",
                  state === "idle" && "bg-surface shadow-[3px_3px_0_var(--border)]",
                  state === "sel" &&
                    "bg-neo-yellow text-black shadow-[4px_4px_0_var(--border)] font-bold",
                  state === "right" &&
                    "border-success bg-[#DCFCE7] dark:bg-[#064E3B] text-black dark:text-white shadow-[4px_4px_0_var(--success)] font-semibold",
                  state === "wrong" &&
                    "border-danger bg-[#FFE4E6] dark:bg-[#4C0519] text-black dark:text-white shadow-[4px_4px_0_var(--danger)] font-semibold",
                  state === "dim" && "opacity-60 bg-surface shadow-[2px_2px_0_var(--border)]",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center border-2 border-border text-xs font-black shadow-[1.5px_1.5px_0_var(--border)]",
                    q.type === "MCQ" ? "rounded-full" : "rounded-none",
                    state === "sel"
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "bg-surface text-text-h",
                    state === "right" && "bg-neo-green text-black border-black",
                    state === "wrong" && "bg-neo-pink text-white border-black",
                  )}
                >
                  {state === "right" ? (
                    <Check className="size-4 stroke-[3]" />
                  ) : state === "wrong" ? (
                    <X className="size-4 stroke-[3]" />
                  ) : (
                    o.id
                  )}
                </span>
                <RichText
                  as="span"
                  text={o.text}
                  className={cn(
                    "pt-0.5 text-sm leading-relaxed",
                    state === "sel" ? "text-black font-semibold" : "text-text-h",
                  )}
                />
              </button>
            );
          })}
        </div>
      )}

      {q.type === "NAT" && (
        <div className="max-w-sm space-y-2 border-2 border-border bg-surface p-4 shadow-[4px_4px_0_var(--border)]">
          <label htmlFor={`nat-${q.id}`} className="neo-label text-xs font-black">
            Numerical answer (NAT)
          </label>
          <input
            id={`nat-${q.id}`}
            inputMode="decimal"
            className={cn(
              "neo-input text-lg font-bold",
              revealed &&
                (typeof response === "string" &&
                response !== "" &&
                Number(response) >= (q.answer as { min: number }).min &&
                Number(response) <= (q.answer as { max: number }).max
                  ? "border-success bg-success-bg text-success"
                  : "border-danger bg-danger-bg text-danger"),
            )}
            placeholder="Type your number"
            value={typeof response === "string" ? response : ""}
            disabled={revealed}
            onChange={(e) => {
              const v = e.target.value;
              if (/^-?\d*\.?\d*$/.test(v)) onChange(v);
            }}
          />
          {revealed && (
            <div className="neo-pill bg-neo-yellow text-black border-border shadow-[1.5px_1.5px_0_var(--border)] font-bold text-xs mt-1">
              Official range:{" "}
              {(q.answer as { min: number; max: number }).min ===
              (q.answer as { min: number; max: number }).max
                ? (q.answer as { min: number }).min
                : `${(q.answer as { min: number }).min} – ${(q.answer as { max: number }).max}`}
            </div>
          )}
        </div>
      )}

      {q.type === "DESCRIPTIVE" && (
        <div className="max-w-xl space-y-2 border-2 border-border bg-surface p-4 shadow-[4px_4px_0_var(--border)]">
          <div className="flex items-center justify-between">
            <label htmlFor={`desc-${q.id}`} className="neo-label text-xs font-black">
              Descriptive Answer / Notes (Ungraded)
            </label>
            <span className="neo-pill bg-neo-yellow text-black text-[10px] font-bold">
              Subjective Proof
            </span>
          </div>
          <textarea
            id={`desc-${q.id}`}
            rows={4}
            className="neo-input text-sm font-medium w-full resize-y"
            placeholder="Type your derivation, proof outline, or solution notes here..."
            value={
              typeof response === "string"
                ? response
                : Array.isArray(response)
                  ? response.join("\n")
                  : ""
            }
            disabled={revealed}
            onChange={(e) => onChange(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground font-medium">
            Subjective question from Section B. Review the worked solution below to self-evaluate
            your answer.
          </p>
        </div>
      )}
    </div>
  );
}

export function SolutionPanel({
  q,
  correct,
  response,
}: {
  q: Question;
  correct: boolean;
  response?: Response;
}) {
  return (
    <section
      className="neo-box mt-8 border-2 border-border bg-surface shadow-[6px_6px_0_var(--border)]"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div
          className={cn(
            "neo-sticker text-xs font-black rotate-[-1deg]",
            q.type === "DESCRIPTIVE"
              ? "bg-neo-yellow text-black"
              : correct
                ? "bg-neo-green text-black"
                : "bg-neo-pink text-white",
          )}
        >
          {q.type === "DESCRIPTIVE" ? (
            "SELF-EVALUATED"
          ) : correct ? (
            <Check className="size-4 stroke-[3]" />
          ) : (
            <X className="size-4 stroke-[3]" />
          )}
          {q.type === "DESCRIPTIVE" ? "UNGRADED" : correct ? "CORRECT" : "INCORRECT"}
        </div>
        {q.type !== "DESCRIPTIVE" && Array.isArray(q.answer) && (
          <span className="neo-pill bg-neo-yellow text-black border-border shadow-[1.5px_1.5px_0_var(--border)] font-bold">
            Official Answer: {q.answer.join(", ")}
          </span>
        )}
      </div>
      <h3 className="mb-2.5 text-xl font-extrabold tracking-tight">Worked Solution</h3>
      <RichText text={q.solution} className="text-sm leading-relaxed" />
      {q.type === "DESCRIPTIVE" && (
        <div className="mt-4 border-2 border-border bg-amber-50/60 dark:bg-amber-950/20 p-4 shadow-[3px_3px_0_var(--border)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-sm text-text-h">
              Manual Self-Evaluation & Marking Rubric
            </span>
            <span className="neo-pill bg-neo-yellow text-black text-xs font-bold">
              Max: {q.marks} Mark{q.marks > 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            Compare your proof, code, or derivation with the official worked solution above. Award
            marks based on accuracy, completeness of intermediate steps, and final result. (Zero
            negative marking).
          </p>
          <div className="flex items-center gap-3 pt-1">
            <label htmlFor={`self-eval-marks-${q.id}`} className="text-xs font-bold text-text-h">
              Awarded Marks:
            </label>
            <input
              id={`self-eval-marks-${q.id}`}
              type="number"
              min={0}
              max={q.marks}
              step={0.5}
              placeholder={`0 - ${q.marks}`}
              className="neo-input text-sm font-bold w-24 py-1 px-2"
              defaultValue={q.marks}
            />
            <span className="text-xs font-medium text-text-muted">/ {q.marks}</span>
          </div>
        </div>
      )}
      <ExplainWithAI q={q} response={response} revealed />
      <div className="mt-5 inline-block border-2 border-border bg-amber-50 dark:bg-amber-950/40 p-2 shadow-[2px_2px_0_var(--border)] rotate-1">
        <p className="font-hand text-lg font-bold text-text-h">
          → revisit this topic if you felt unconfident.
        </p>
      </div>
    </section>
  );
}

export function ExplainWithAI({
  q,
  response,
  revealed,
}: {
  q: Question;
  response?: Response;
  revealed?: boolean;
}) {
  const prompt = buildExplainPrompt(q, response, revealed);
  return (
    <div className="mt-6 border-t-2 border-border pt-4">
      <div className="neo-label mb-2.5 font-bold flex items-center gap-1.5">
        <Sparkles className="size-3.5 text-neo-pink" />
        Need a deeper conceptual breakdown?
      </div>
      <div className="flex flex-wrap gap-2.5">
        <a
          href={chatgptUrl(prompt)}
          target="_blank"
          rel="noopener noreferrer"
          className="neo-btn bg-[#E0F7FA] text-black hover:bg-neo-cyan font-bold"
        >
          Ask ChatGPT ↗
        </a>
        <a
          href={claudeUrl(prompt)}
          target="_blank"
          rel="noopener noreferrer"
          className="neo-btn bg-[#FFE4E8] text-black hover:bg-neo-pink hover:text-white font-bold"
        >
          Ask Claude ↗
        </a>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground font-medium">
        Opens in a new tab with the entire question and options automatically pre-filled.
      </p>
    </div>
  );
}
