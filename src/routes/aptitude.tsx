import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Chip, PageHeader, Pill, ProgressBar, QuestionMeta } from "@/components/gg/primitives";
import { RichText } from "@/components/gg/RichText";
import { aptitudeConcepts } from "@/data/catalog";
import { aptitudeQuestions } from "@/data/questions";
import { useAttempts } from "@/hooks/use-local-store";
import { cn } from "@/lib/utils";
import { Sparkles, Brain, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/aptitude")({
  head: () => ({
    meta: [
      { title: "General aptitude — GATE Grind" },
      {
        name: "description",
        content:
          "Verbal, quantitative, analytical and spatial aptitude for GATE, with concept notes and daily practice.",
      },
      { property: "og:title", content: "GATE general aptitude — GATE Grind" },
      {
        property: "og:description",
        content: "Concept cards and daily practice for the 15 aptitude marks in GATE.",
      },
    ],
  }),
  component: Aptitude,
});

const CATS = ["All", "Verbal", "Quantitative", "Analytical", "Spatial"] as const;
type AptitudeCategory = Exclude<(typeof CATS)[number], "All">;

const TOPICS_BY_CATEGORY: Record<AptitudeCategory, string[]> = {
  Verbal: [
    "grammar",
    "reading-comprehension",
    "vocabulary",
    "sentence-completion",
    "idiom",
    "phrase-meaning",
    "word-meaning",
    "articles",
    "prepositions",
    "sentence-ordering",
    "narrative-sequencing",
    "comparative-forms",
  ],
  Quantitative: [
    "probability",
    "numerical-computation",
    "ratio-proportion",
    "percentage",
    "venn-diagram",
    "quadratic-equations",
    "logarithms",
    "geometry",
    "number-series",
    "number-system",
    "cartesian-coordinates",
    "speed-time-distance",
    "maxima-minima",
    "profit-loss",
    "statistics",
    "triangles",
    "work-time",
    "data-interpretation",
    "compound-interest",
    "factors",
    "arithmetic-series",
    "circle",
    "alligation-mixture",
    "absolute-value",
    "permutation-and-combination",
    "cost-market-price",
    "conditional-probability",
    "area",
    "bayes-theorem",
    "volume",
    "system-of-equations",
    "algebra",
    "average",
    "prime-numbers",
    "clock-time",
    "mensuration",
    "modular-arithmetic",
    "fractions",
    "number-theory",
    "polynomials",
    "powers",
    "currency-notes",
  ],
  Analytical: [
    "logical-reasoning",
    "verbal-reasoning",
    "statements-follow",
    "sequence-series",
    "statement-sufficiency",
    "code-words",
    "odd-one",
    "round-table-arrangement",
    "seating-arrangement",
    "analogy",
    "shortest-path",
    "graph-coloring",
    "logical-inference",
    "coding-decoding",
    "family-relationship",
    "number-relations",
    "no-classified-topic",
  ],
  Spatial: [
    "patterns-in-two-dimensions",
    "patterns-in-three-dimensions",
    "paper-folding",
    "image-rotation",
    "mirror-image",
    "direction-sense",
    "assembling-pieces",
    "assembling",
    "cubes",
    "maps",
    "contour-plots",
    "digital-image-processing",
  ],
};

const categoryForTopic = (topicId: string): AptitudeCategory =>
  (Object.entries(TOPICS_BY_CATEGORY).find(([, topics]) => topics.includes(topicId))?.[0] as
    AptitudeCategory | undefined) ?? "Analytical";

function Aptitude() {
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const [open, setOpen] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);
  const [attempts] = useAttempts();
  const ga = aptitudeQuestions;
  const solved = ga.filter((q) => attempts[q.id]).length;
  const daily = ga[new Date().getDate() % ga.length]!;
  const list = aptitudeConcepts.filter((c) => cat === "All" || c.category === cat);
  const active = aptitudeConcepts.find((c) => c.id === open);
  const questionBank = useMemo(
    () => ga.filter((question) => cat === "All" || categoryForTopic(question.topicId) === cat),
    [cat, ga],
  );

  useEffect(() => {
    setVisibleCount(24);
  }, [cat]);

  return (
    <>
      <PageHeader
        eyebrow="15 Marks Guaranteed"
        title="General Aptitude Desk"
        description="Concept summaries and verified past questions for verbal, quantitative, analytical, and spatial reasoning."
      >
        <span className="neo-sticker bg-neo-yellow text-black rotate-[-1deg] text-xs font-black">
          ★ 15 MARKS IN EVERY PAPER
        </span>
      </PageHeader>
      <div className="mb-10 grid gap-5 md:grid-cols-[1fr_1fr]">
        <Link
          to="/practice/$questionId"
          params={{ questionId: daily.id }}
          className="neo-box block border-2 border-border bg-[#FFF9C4]/35 dark:bg-[#2A240A]/40 shadow-[5px_5px_0_var(--border)] hover:-translate-x-0.5 hover:-translate-y-1 hover:shadow-[7px_7px_0_var(--border)] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="neo-sticker bg-neo-yellow text-black rotate-[-1deg] text-[10.5px] font-black">
              DAILY APTITUDE DRILL
            </span>
            <span className="neo-pill bg-neo-cyan text-black border-border shadow-[1px_1px_0_var(--border)] font-bold text-[10px]">
              {daily.type}
            </span>
          </div>
          <p className="mt-3 line-clamp-2 text-sm text-text-h font-medium group-hover:underline">
            {daily.body.replace(/\$|\*/g, "")}
          </p>
          <span className="mt-4 inline-block text-xs font-black text-text-h">
            Solve Daily Question →
          </span>
        </Link>
        <div className="neo-box border-2 border-border bg-surface shadow-[5px_5px_0_var(--border)]">
          <div className="neo-label text-xs font-black">Your Aptitude Coverage</div>
          <div className="mt-2 font-heading text-4xl font-black text-text-h">
            {solved}
            <span className="text-xl text-muted-foreground font-bold">/{ga.length}</span>
          </div>
          <ProgressBar
            value={(solved / ga.length) * 100}
            className="mt-3.5"
            label="Aptitude progress"
            color="green"
          />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {CATS.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
          </Chip>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_390px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((c) => (
            <button
              key={c.id}
              onClick={() => setOpen(c.id)}
              aria-pressed={open === c.id}
              className={cn(
                "neo-box-sm p-4.5 text-left border-2 border-border transition-all cursor-pointer",
                open === c.id
                  ? "bg-neo-yellow text-black font-black shadow-[4px_4px_0_var(--border)] scale-[1.02]"
                  : "bg-surface shadow-[3px_3px_0_var(--border)] hover:-translate-x-0.5 hover:-translate-y-1 hover:shadow-[5px_5px_0_var(--border)]",
              )}
            >
              <div
                className={cn(
                  "neo-label font-black text-[10px]",
                  open === c.id ? "text-black" : "text-muted-foreground",
                )}
              >
                {c.category}
              </div>
              <h2
                className={cn(
                  "mt-1.5 text-base font-black",
                  open === c.id ? "text-black" : "text-text-h",
                )}
              >
                {c.title}
              </h2>
              <p className="mt-1 text-xs opacity-85 font-medium leading-relaxed">{c.summary}</p>
            </button>
          ))}
        </div>
        <aside
          className="neo-box h-fit border-2 border-border bg-surface shadow-[6px_6px_0_var(--border)] lg:sticky lg:top-20"
          aria-live="polite"
        >
          {active ? (
            <>
              <span className="neo-sticker bg-neo-cyan text-black rotate-[-1deg] text-[10.5px] font-black">
                {active.category}
              </span>
              <h2 className="mt-3 text-2xl font-black text-text-h">{active.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground font-medium leading-relaxed">
                {active.summary}
              </p>
              {active.formula && (
                <div className="relative my-5 border-2 border-border bg-amber-50 dark:bg-amber-950/40 p-4 shadow-[3px_3px_0_var(--border)]">
                  <RichText text={`$$${active.formula}$$`} />
                  <span className="absolute -top-3.5 right-3 rotate-2 bg-neo-pink px-2 py-0.5 font-hand text-base font-bold text-white border-2 border-border shadow-[2px_2px_0_var(--border)]">
                    formula
                  </span>
                </div>
              )}
              <ul className="space-y-1.5 pl-4 text-xs font-semibold list-disc">
                {active.keyPoints.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
              {active.questionIds.length > 0 ? (
                <Link
                  to="/practice/$questionId"
                  params={{ questionId: active.questionIds[0]! }}
                  className="neo-btn neo-btn-primary mt-6 w-full font-black text-center block text-sm"
                >
                  Practise this Concept →
                </Link>
              ) : (
                <p className="mt-5 text-xs text-muted-foreground font-medium">
                  Practice questions for this concept will be highlighted here.
                </p>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground font-bold">
              <Brain className="size-8 mx-auto mb-2 text-neo-pink" />
              Select any aptitude concept on the left to reveal formula summaries and flashcards.
            </div>
          )}
        </aside>
      </div>

      <section className="mt-12 border-t-2 border-border pt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="neo-label text-xs font-black">Aptitude Repository</div>
            <h2 className="mt-1 text-2xl font-black">General Aptitude Questions</h2>
          </div>
          <span className="neo-pill bg-neo-yellow text-black border-border shadow-[1.5px_1.5px_0_var(--border)] font-bold text-xs">
            {questionBank.length} question{questionBank.length === 1 ? "" : "s"}
            {cat !== "All" ? ` · ${cat}` : ""}
          </span>
        </div>
        {questionBank.length === 0 ? (
          <p className="neo-box border-2 border-border p-4 text-sm text-muted-foreground font-semibold">
            No aptitude questions match this category.
          </p>
        ) : (
          <>
            <ol className="space-y-3.5">
              {questionBank.slice(0, visibleCount).map((question) => (
                <li key={question.id}>
                  <Link
                    to="/practice/$questionId"
                    params={{ questionId: question.id }}
                    className="flex gap-4 border-2 border-border bg-surface p-4 shadow-[3px_3px_0_var(--border)] hover:-translate-x-0.5 hover:-translate-y-1 hover:shadow-[5px_5px_0_var(--border)] transition-all group"
                  >
                    <div className="w-12 shrink-0">
                      <span className="neo-sticker bg-neo-yellow text-black rotate-[-1deg] text-xs font-black px-1.5 py-0.5 block text-center">
                        Q{question.number}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <QuestionMeta q={question} />
                      <p className="mt-2 line-clamp-2 text-sm text-text-h font-medium group-hover:underline">
                        {question.body.replace(/\$|\\/g, "")}
                      </p>
                      <div className="mt-1.5 text-[11px] text-muted-foreground font-bold">
                        {question.topicId.replace(/-/g, " ")}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
            {visibleCount < questionBank.length && (
              <div className="mt-8 flex justify-center">
                <button
                  className="neo-btn bg-neo-yellow text-black font-black hover:bg-neo-yellow/85 px-6 py-2.5 shadow-[4px_4px_0_var(--border)] text-sm"
                  onClick={() => setVisibleCount((count) => count + 24)}
                >
                  Load more questions ({questionBank.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
