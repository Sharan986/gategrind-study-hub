import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageHeader, Pill, Stat } from "@/components/gg/primitives";
import { papers } from "@/data/catalog";
import { questionById } from "@/data/questions";
import { subjectById } from "@/data/subjects";

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
          { name: "description", content: `Attempt ${loaderData.paper.title} or practise its questions one at a time.` },
          { property: "og:title", content: `${loaderData.paper.title} — GATE Grind` },
          { property: "og:description", content: "Full GATE CSE paper with a timer, GATE marking and solutions." },
        ]
      : [{ title: "Paper unavailable — GATE Grind" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => <div className="neo-box mx-auto max-w-md text-center"><h1 className="text-xl">Paper not found</h1><Link to="/papers" className="neo-btn mt-4">All papers</Link></div>,
  component: PaperDetail,
});

function PaperDetail() {
  const { paper } = Route.useLoaderData();
  const qs = paper.questionIds.map((id) => questionById(id)!);
  const marks = qs.reduce((n, q) => n + q.marks, 0);
  return (
    <>
      <Link to="/papers" className="mb-4 inline-block text-xs hover:text-text-h">← All papers</Link>
      <PageHeader eyebrow={`GATE ${paper.year}`} title={paper.title} description="Attempt the full paper under exam conditions, or browse the questions with solutions.">
        <Link to="/mocks/$testId/attempt" params={{ testId: `paper-${paper.id}` }} className="neo-btn neo-btn-primary">Start paper</Link>
      </PageHeader>
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Questions" value={qs.length} />
        <Stat label="Marks" value={marks} />
        <Stat label="MCQ / MSQ / NAT" value={`${qs.filter((q) => q.type === "MCQ").length}/${qs.filter((q) => q.type === "MSQ").length}/${qs.filter((q) => q.type === "NAT").length}`} />
        <Stat label="Negative marking" value="MCQ only" hint="−⅓ or −⅔" />
      </div>
      <h2 className="mb-3 text-lg">Questions in this paper</h2>
      <ol className="divide-y divide-border border-y border-border">
        {qs.map((q, i) => (
          <li key={q.id}>
            <Link to="/practice/$questionId" params={{ questionId: q.id }} className="flex items-center gap-4 py-3 text-sm hover:bg-subtle">
              <span className="w-8 text-muted-foreground">{i + 1}.</span>
              <span className="min-w-0 flex-1 truncate text-text-h">{q.body.replace(/\$|\\/g, "")}</span>
              <Pill>{subjectById(q.subjectId)?.code}</Pill>
              <Pill solid>{q.type}</Pill>
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}
