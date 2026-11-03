import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Chip, EmptyState, PageHeader, Pill } from "@/components/gg/primitives";
import { aptitudeConcepts, mocks, papers } from "@/data/catalog";
import { questions } from "@/data/questions";
import { subjects, subjectById } from "@/data/subjects";

type Kind = "all" | "questions" | "topics" | "papers" | "mocks";
export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): { q?: string | undefined; kind?: Kind | undefined } => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    kind: ["all", "questions", "topics", "papers", "mocks"].includes(s["kind"] as string) ? (s["kind"] as Kind) : undefined,
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
  return <>{text.slice(0, i)}<mark className="bg-primary px-0.5 text-primary-foreground">{text.slice(i, i + term.length)}</mark>{text.slice(i + term.length)}</>;
}

function SearchPage() {
  const { q = "", kind = "all" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const term = q.trim().toLowerCase();
  const clean = (s: string) => s.replace(/\$|\\|\*/g, "");

  const qs = term ? questions.filter((x) => clean(x.body).toLowerCase().includes(term) || subjectById(x.subjectId)?.name.toLowerCase().includes(term) || String(x.year) === term) : [];
  const topics = term ? subjects.flatMap((s) => s.topics.filter((t) => t.name.toLowerCase().includes(term) || s.name.toLowerCase().includes(term)).map((t) => ({ s, t }))) : [];
  const ps = term ? papers.filter((p) => p.title.toLowerCase().includes(term)) : [];
  const ms = term ? [...mocks.filter((m) => m.title.toLowerCase().includes(term) || m.description.toLowerCase().includes(term)), ...[]] : [];
  const apt = term ? aptitudeConcepts.filter((c) => c.title.toLowerCase().includes(term)) : [];
  const total = qs.length + topics.length + ps.length + ms.length + apt.length;
  const show = (k: Kind) => kind === "all" || kind === k;

  return (
    <>
      <PageHeader eyebrow="Search" title="Search everything" description="Questions, subjects, topics, papers and mock tests." />
      <input ref={ref} className="neo-input mb-4 py-3 text-base" placeholder="Try ‘paging’, ‘2023’ or ‘regular’…" value={q} onChange={(e) => navigate({ search: { q: e.target.value || undefined, kind }, replace: true })} aria-label="Search" />
      <div className="mb-8 flex flex-wrap gap-1.5">
        {(["all", "questions", "topics", "papers", "mocks"] as const).map((k) => <Chip key={k} active={kind === k} onClick={() => navigate({ search: { q: q || undefined, kind: k }, replace: true })}>{k}</Chip>)}
      </div>

      {!term ? (
        <div className="flex flex-wrap gap-2 text-xs"><span className="neo-label mr-2 self-center">Popular</span>{["paging", "regular", "normal form", "2024", "subnet"].map((s) => <button key={s} className="neo-pill" onClick={() => navigate({ search: { q: s, kind } })}>{s}</button>)}</div>
      ) : total === 0 ? (
        <EmptyState title={`Nothing found for “${q}”`} description="Check the spelling, or try a broader word like a subject name." />
      ) : (
        <div className="space-y-8">
          {show("questions") && qs.length > 0 && (
            <section><h2 className="neo-label mb-2">Questions · {qs.length}</h2>
              <ul className="divide-y divide-border border-y border-border">{qs.map((x) => (
                <li key={x.id}><Link to="/practice/$questionId" params={{ questionId: x.id }} className="flex items-center gap-3 py-3 text-sm hover:bg-subtle">
                  <Pill solid>{x.type}</Pill><span className="min-w-0 flex-1 truncate text-text-h"><Mark text={clean(x.body)} term={term} /></span><Pill>GATE {x.year}</Pill>
                </Link></li>))}</ul>
            </section>
          )}
          {show("topics") && (topics.length > 0 || apt.length > 0) && (
            <section><h2 className="neo-label mb-2">Topics · {topics.length + apt.length}</h2>
              <div className="flex flex-wrap gap-2">
                {topics.map(({ s, t }) => <Link key={s.id + t.id} to="/pyq" search={{ subject: s.id, topic: t.id }} className="neo-box-sm px-3 py-2 text-xs text-text-h hover:-translate-y-px">{s.code} · <Mark text={t.name} term={term} /></Link>)}
                {apt.map((c) => <Link key={c.id} to="/aptitude" className="neo-box-sm px-3 py-2 text-xs text-text-h">GA · <Mark text={c.title} term={term} /></Link>)}
              </div>
            </section>
          )}
          {show("papers") && ps.length > 0 && (
            <section><h2 className="neo-label mb-2">Papers · {ps.length}</h2>
              <div className="flex flex-wrap gap-2">{ps.map((p) => <Link key={p.id} to="/papers/$paperId" params={{ paperId: p.id }} className="neo-box-sm px-3 py-2 text-xs text-text-h"><Mark text={p.title} term={term} /></Link>)}</div>
            </section>
          )}
          {show("mocks") && ms.length > 0 && (
            <section><h2 className="neo-label mb-2">Mock tests · {ms.length}</h2>
              <div className="flex flex-wrap gap-2">{ms.map((m) => <Link key={m.id} to="/mocks" className="neo-box-sm px-3 py-2 text-xs text-text-h"><Mark text={m.title} term={term} /></Link>)}</div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
