import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageHeader, Pill, Stat, SubjectBadge } from "@/components/gg/primitives";
import { papers } from "@/data/catalog";
import { questionById } from "@/data/questions";
import { subjectById } from "@/data/subjects";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/papers_/$paperId")({
  loader: ({ params }) => {
    const paper = papers.find((p) => p.id === params.paperId);
    if (!paper) throw notFound();
    return { paper };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.paper.title} — GATE Grind` },
          {
            name: "description",
            content: `Browse the verified, answerable questions available from ${loaderData.paper.title}.`,
          },
          { property: "og:title", content: `${loaderData.paper.title} — GATE Grind` },
          {
            property: "og:description",
            content: "Available GATE questions, organised by source exam and set.",
          },
        ]
      : [{ title: "Paper unavailable — GATE Grind" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <div className="neo-box mx-auto max-w-md text-center border-2 border-border shadow-[6px_6px_0_var(--border)]">
      <h1 className="text-xl font-black">Paper not found</h1>
      <Link to="/papers" className="neo-btn neo-btn-primary mt-4 font-black">
        All papers
      </Link>
    </div>
  ),
  component: PaperDetail,
});

function PaperDetail() {
  const { paper } = Route.useLoaderData();
  const qs = paper.questionIds
    .map((id) => questionById(id))
    .filter((q): q is NonNullable<typeof q> => !!q);
  const marks = qs.reduce((n, q) => n + q.marks, 0);
  return (
    <>
      <Link
        to="/papers"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold hover:text-neo-pink"
      >
        <ArrowLeft className="size-3.5" /> All past papers
      </Link>
      <PageHeader
        eyebrow={`GATE ${paper.year}`}
        title={paper.title}
        description="Practise the available questions in timed mode, or browse the collection."
      >
        <Link
          to="/mocks/$testId/attempt"
          params={{ testId: `paper-${paper.id}` }}
          className="neo-btn neo-btn-primary font-black"
        >
          Practise Collection →
        </Link>
      </PageHeader>
      <div className="mb-9 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Questions" value={qs.length} color="yellow" />
        <Stat label="Marks Represented" value={marks} color="cyan" />
        <Stat
          label="MCQ / MSQ / NAT"
          value={`${qs.filter((q) => q.type === "MCQ").length}/${qs.filter((q) => q.type === "MSQ").length}/${qs.filter((q) => q.type === "NAT").length}`}
          color="pink"
        />
        <Stat label="Negative Marking" value="MCQ only" hint="−⅓ or −⅔ penalty" color="green" />
      </div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black tracking-tight">Questions in this Session</h2>
        <span className="neo-pill bg-neo-yellow text-black border-border shadow-[1px_1px_0_var(--border)] font-black text-xs">
          {qs.length} Questions
        </span>
      </div>
      <ol className="divide-y-2 divide-border border-y-2 border-border bg-surface shadow-[4px_4px_0_var(--border)]">
        {qs.map((q, i) => (
          <li key={q.id}>
            <Link
              to="/practice/$questionId"
              params={{ questionId: q.id }}
              className="flex items-center gap-4 p-4 text-sm font-semibold hover:bg-subtle transition-colors group"
            >
              <span className="w-10 font-mono text-xs font-black text-muted-foreground">
                Q{i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-text-h font-medium group-hover:underline">
                {q.body.replace(/\$|\\/g, "")}
              </span>
              <SubjectBadge subjectId={q.subjectId} />
              <span className="neo-pill bg-neo-yellow text-black border-border shadow-[1px_1px_0_var(--border)] font-black text-[10px]">
                {q.type}
              </span>
              <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}
