import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Chip, EmptyState, PageHeader, Pill, SubjectBadge } from "@/components/gg/primitives";
import { aptitudeConcepts, mocks, papers } from "@/data/catalog";
import { questions } from "@/data/questions";
import { subjects, subjectById } from "@/data/subjects";
import { Search as SearchIcon } from "lucide-react";

type Kind = "all" | "questions" | "topics" | "papers" | "mocks";
export const Route = createFileRoute("/search")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { q?: string | undefined; kind?: Kind | undefined } => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    kind: ["all", "questions", "topics", "papers", "mocks"].includes(s["kind"] as string)
      ? (s["kind"] as Kind)
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Search — GATE Grind" },
      { name: "description", content: "Search GATE CSE questions, topics, papers and mock tests." },
      { property: "og:title", content: "Search — GATE Grind" },
      { property: "og:description", content: "Find any question, topic, paper or mock test." },
    ],
  }),
  component: SearchPage,
});

function Mark({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const i = text.toLowerCase().indexOf(term);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-neo-yellow text-black font-black px-1 border border-border">
        {text.slice(i, i + term.length)}
      </mark>
      {text.slice(i + term.length)}
    </>
  );
}

function SearchPage() {
  const { q = "", kind = "all" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const term = q.trim().toLowerCase();
  const clean = (s: string) => s.replace(/\$|\\|\*/g, "");

  const qs = term
    ? questions.filter(
        (x) =>
          clean(x.body).toLowerCase().includes(term) ||
          subjectById(x.subjectId)?.name.toLowerCase().includes(term) ||
          String(x.year) === term,
      )
    : [];
  const topics = term
    ? subjects.flatMap((s) =>
        s.topics
          .filter((t) => t.name.toLowerCase().includes(term) || s.name.toLowerCase().includes(term))
          .map((t) => ({ s, t })),
      )
    : [];
  const ps = term ? papers.filter((p) => p.title.toLowerCase().includes(term)) : [];
  const ms = term
    ? mocks.filter(
        (m) => m.title.toLowerCase().includes(term) || m.description.toLowerCase().includes(term),
      )
    : [];
  const apt = term ? aptitudeConcepts.filter((c) => c.title.toLowerCase().includes(term)) : [];
  const total = qs.length + topics.length + ps.length + ms.length + apt.length;
  const show = (k: Kind) => kind === "all" || kind === k;

  return (
    <>
      <PageHeader
        eyebrow="Global Index"
        title="Search Catalog"
        description="Search across 3,823 questions, subjects, syllabus topics, past exam papers, and mocks."
      />
      <div className="relative mb-4">
        <input
          ref={ref}
          className="neo-input py-3.5 pl-11 text-base font-bold shadow-[4px_4px_0_var(--border)]"
          placeholder="Try ‘paging’, ‘2024’, ‘dijkstra’, ‘normal form’…"
          value={q}
          onChange={(e) =>
            navigate({ search: { q: e.target.value || undefined, kind }, replace: true })
          }
          aria-label="Search"
        />
        <SearchIcon className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      </div>
      <div className="mb-8 flex flex-wrap gap-2">
        {(["all", "questions", "topics", "papers", "mocks"] as const).map((k) => (
          <Chip
            key={k}
            active={kind === k}
            onClick={() => navigate({ search: { q: q || undefined, kind: k }, replace: true })}
          >
            {k.charAt(0).toUpperCase() + k.slice(1)}
          </Chip>
        ))}
      </div>

      {!term ? (
        <div className="border-2 border-border bg-surface p-5 shadow-[4px_4px_0_var(--border)]">
          <div className="neo-label mb-3 font-black text-xs">Popular Search Topics</div>
          <div className="flex flex-wrap gap-2">
            {[
              "paging",
              "regular expression",
              "normal form",
              "2024",
              "subnet",
              "b+ tree",
              "deadlock",
              "pipelining",
              "quick sort",
            ].map((s) => (
              <button
                key={s}
                className="neo-pill bg-subtle hover:bg-neo-yellow text-text-h font-bold px-2.5 py-1 transition-colors cursor-pointer"
                onClick={() => navigate({ search: { q: s, kind } })}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : total === 0 ? (
        <EmptyState
          title={`No results found for “${q}”`}
          description="Try checking for typos or searching a broader term like a subject name or year."
        />
      ) : (
        <div className="space-y-8">
          {show("questions") && qs.length > 0 && (
            <section className="border-2 border-border bg-surface p-5 shadow-[4px_4px_0_var(--border)]">
              <div className="flex items-center justify-between mb-3 border-b-2 border-border pb-2">
                <h2 className="neo-label font-black text-xs">Questions Found</h2>
                <span className="neo-pill bg-neo-yellow text-black border-border shadow-[1px_1px_0_var(--border)] font-bold text-xs">
                  {qs.length}
                </span>
              </div>
              <ul className="divide-y-2 divide-border">
                {qs.slice(0, 30).map((x) => (
                  <li key={x.id}>
                    <Link
                      to="/practice/$questionId"
                      params={{ questionId: x.id }}
                      className="flex items-center gap-3 py-3 text-sm hover:bg-subtle transition-colors group"
                    >
                      <span className="neo-pill bg-neo-yellow text-black border-border shadow-[1px_1px_0_var(--border)] font-black text-[10px]">
                        {x.type}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-text-h font-medium group-hover:underline">
                        <Mark text={clean(x.body)} term={term} />
                      </span>
                      <SubjectBadge subjectId={x.subjectId} />
                      <Pill className="bg-surface font-bold">GATE {x.year}</Pill>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {show("topics") && (topics.length > 0 || apt.length > 0) && (
            <section className="border-2 border-border bg-surface p-5 shadow-[4px_4px_0_var(--border)]">
              <h2 className="neo-label mb-3 font-black text-xs">
                Topics · {topics.length + apt.length}
              </h2>
              <div className="flex flex-wrap gap-2.5">
                {topics.map(({ s, t }) => (
                  <Link
                    key={s.id + t.id}
                    to="/pyq"
                    search={{ subject: s.id, topic: t.id }}
                    className="neo-box-sm border-2 border-border px-3.5 py-2 text-xs font-bold text-text-h hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--border)] transition-all bg-surface"
                  >
                    <span className="font-black text-neo-pink mr-1">{s.code}</span> ·{" "}
                    <Mark text={t.name} term={term} />
                  </Link>
                ))}
                {apt.map((c) => (
                  <Link
                    key={c.id}
                    to="/aptitude"
                    className="neo-box-sm border-2 border-border px-3.5 py-2 text-xs font-bold text-text-h hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--border)] transition-all bg-[#FFF9C4]/40"
                  >
                    <span className="font-black text-neo-yellow mr-1">GA</span> ·{" "}
                    <Mark text={c.title} term={term} />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {show("papers") && ps.length > 0 && (
            <section className="border-2 border-border bg-surface p-5 shadow-[4px_4px_0_var(--border)]">
              <h2 className="neo-label mb-3 font-black text-xs">Past Papers · {ps.length}</h2>
              <div className="flex flex-wrap gap-2.5">
                {ps.map((p) => (
                  <Link
                    key={p.id}
                    to="/papers/$paperId"
                    params={{ paperId: p.id }}
                    className="neo-box-sm border-2 border-border px-3.5 py-2 text-xs font-bold text-text-h hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--border)] transition-all bg-surface"
                  >
                    <Mark text={p.title} term={term} />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {show("mocks") && ms.length > 0 && (
            <section className="border-2 border-border bg-surface p-5 shadow-[4px_4px_0_var(--border)]">
              <h2 className="neo-label mb-3 font-black text-xs">Mock Exams · {ms.length}</h2>
              <div className="flex flex-wrap gap-2.5">
                {ms.map((m) => (
                  <Link
                    key={m.id}
                    to="/mocks"
                    className="neo-box-sm border-2 border-border px-3.5 py-2 text-xs font-bold text-text-h hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--border)] transition-all bg-surface"
                  >
                    <Mark text={m.title} term={term} />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
