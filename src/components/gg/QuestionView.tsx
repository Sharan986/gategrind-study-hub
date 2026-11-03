import { Check, X } from "lucide-react";
import type { Question } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CodeBlock, RichText } from "./RichText";

export type Response = string[] | string | undefined;

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
    <div className="space-y-5">
      <RichText text={q.body} className="text-[15px] leading-7 text-text-h" />
      {q.code && <CodeBlock {...q.code} />}

      {q.type !== "NAT" && q.options && (
        <div role={q.type === "MCQ" ? "radiogroup" : "group"} aria-label="Options" className="space-y-2.5">
          {q.type === "MSQ" && <div className="neo-label">Select one or more options</div>}
          {q.options.map((o) => {
            const isSel = selected.includes(o.id);
            const isAns = correct.includes(o.id);
            const state = !revealed ? (isSel ? "sel" : "idle") : isAns ? "right" : isSel ? "wrong" : "dim";
            return (
              <button
                key={o.id}
                type="button"
                role={q.type === "MCQ" ? "radio" : "checkbox"}
                aria-checked={isSel}
                onClick={() => pick(o.id)}
                disabled={revealed}
                className={cn(
                  "neo-box-sm flex w-full items-start gap-3 p-3 text-left transition-transform",
                  !revealed && "hover:-translate-y-px",
                  state === "sel" && "bg-primary text-primary-foreground",
                  state === "right" && "border-success bg-success-bg shadow-[2px_2px_0_var(--success)]",
                  state === "wrong" && "border-danger bg-danger-bg shadow-[2px_2px_0_var(--danger)]",
                  state === "dim" && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center border text-xs font-bold",
                    q.type === "MCQ" && "rounded-full",
                    state === "sel" ? "border-primary-foreground" : "border-border",
                  )}
                >
                  {state === "right" ? <Check className="size-3.5 text-success" /> : state === "wrong" ? <X className="size-3.5 text-danger" /> : o.id}
                </span>
                <RichText as="span" text={o.text} className={cn("pt-0.5 text-sm", state === "sel" ? "text-primary-foreground" : "text-text-h")} />
              </button>
            );
          })}
        </div>
      )}

      {q.type === "NAT" && (
        <div className="max-w-xs space-y-1.5">
          <label htmlFor={`nat-${q.id}`} className="neo-label">Numerical answer</label>
          <input
            id={`nat-${q.id}`}
            inputMode="decimal"
            className={cn(
              "neo-input text-base",
              revealed && (typeof response === "string" && response !== "" && Number(response) >= (q.answer as { min: number }).min && Number(response) <= (q.answer as { max: number }).max ? "border-success bg-success-bg" : "border-danger bg-danger-bg"),
            )}
            placeholder="Type a number"
            value={typeof response === "string" ? response : ""}
            disabled={revealed}
            onChange={(e) => {
              const v = e.target.value;
              if (/^-?\d*\.?\d*$/.test(v)) onChange(v);
            }}
          />
          {revealed && (
            <div className="text-xs text-muted-foreground">
              Accepted: {(q.answer as { min: number; max: number }).min === (q.answer as { min: number; max: number }).max ? (q.answer as { min: number }).min : `${(q.answer as { min: number }).min} – ${(q.answer as { max: number }).max}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SolutionPanel({ q, correct }: { q: Question; correct: boolean }) {
  return (
    <section className="neo-box mt-6" aria-live="polite">
      <div className={cn("mb-3 inline-flex items-center gap-2 border px-2 py-1 text-xs font-bold", correct ? "border-success bg-success-bg text-success" : "border-danger bg-danger-bg text-danger")}>
        {correct ? <Check className="size-3.5" /> : <X className="size-3.5" />}
        {correct ? "Correct" : "Incorrect"}
        {Array.isArray(q.answer) && <span className="font-normal">· Answer: {q.answer.join(", ")}</span>}
      </div>
      <h3 className="mb-2 text-lg">Solution</h3>
      <RichText text={q.solution} className="text-sm leading-7" />
      <p className="mt-4 font-hand text-lg text-text-h">→ revisit this topic if it felt shaky.</p>
    </section>
  );
}
