import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Chip, EmptyState, PageHeader, Pill } from "@/components/gg/primitives";
import { subjects, totalQuestions } from "@/data/subjects";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse subjects — GATE Grind" },
      { name: "description", content: "Every GATE CSE subject and topic, with question counts." },
      { property: "og:title", content: "Browse GATE CSE subjects — GATE Grind" },
      {
        property: "og:description",
        content: "Explore subjects and topics, then jump straight into practice.",
      },
    ],
  }),
  component: Browse,
});

function Browse() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>("pds");
  const [group, setGroup] = useState<"all" | "core" | "math" | "ga">("all");
  const groups = {
    core: ["coa", "pds", "prog", "algo", "toc", "cd", "os", "dbms", "cn", "dl"],
    math: ["dm", "em"],
    ga: ["ga"],
  };
  const term = q.toLowerCase();
  const list = subjects.filter(
    (s) =>
      (group === "all" || groups[group].includes(s.id)) &&
      (!term ||
        s.name.toLowerCase().includes(term) ||
        s.topics.some((t) => t.name.toLowerCase().includes(term))),
  );

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Browse subjects"
        description="All 11 GATE CSE subjects plus general aptitude. Open a subject to see its topics and start practising one."
      >
        <Pill>{subjects.reduce((n, s) => n + totalQuestions(s), 0)} questions</Pill>
      </PageHeader>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <input
          className="neo-input md:max-w-sm"
          placeholder="Search subjects or topics…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search subjects"
        />
        <div className="flex flex-wrap gap-1.5">
          {(["all", "core", "math", "ga"] as const).map((g) => (
            <Chip key={g} active={group === g} onClick={() => setGroup(g)}>
              {{ all: "All", core: "Core CS", math: "Mathematics", ga: "Aptitude" }[g]}
            </Chip>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="No subjects match"
          description="Try a different keyword or clear the filter."
          action={
            <button
              className="neo-btn"
              onClick={() => {
                setQ("");
                setGroup("all");
              }}
            >
              Clear
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((s) => {
            const isOpen = open === s.id || !!term;
            const max = Math.max(...s.topics.map((t) => t.questionCount));
            return (
              <article key={s.id} className="neo-box p-0">
                <button
                  className="flex w-full items-start justify-between gap-4 p-5 text-left"
                  onClick={() => setOpen(isOpen && !term ? null : s.id)}
                  aria-expanded={isOpen}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Pill solid>{s.code}</Pill>
                      <span className="neo-label">{s.weightage}</span>
                    </div>
                    <h2 className="mt-2 text-lg">{s.name}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="font-heading text-xl font-semibold text-text-h">
                      {totalQuestions(s)}
                    </span>
                    <ChevronDown
                      className={cn("size-4 transition-transform", isOpen && "rotate-180")}
                    />
                  </div>
                </button>
                {isOpen && (
                  <ul className="border-t border-border">
                    {s.topics.map((t) => (
                      <li key={t.id} className="border-b border-border last:border-b-0">
                        <Link
                          to="/pyq"
                          search={{ subject: s.id, topic: t.id }}
                          className="flex items-center gap-3 px-5 py-2.5 text-xs hover:bg-subtle"
                        >
                          <span
                            className={cn(
                              "flex-1 text-text-h",
                              term && t.name.toLowerCase().includes(term) && "underline",
                            )}
                          >
                            {t.name}
                          </span>
                          <span className="hidden h-1.5 w-20 border border-border sm:block">
                            <span
                              className="block h-full bg-primary"
                              style={{ width: `${(t.questionCount / max) * 100}%` }}
                            />
                          </span>
                          <span className="w-8 text-right">{t.questionCount}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
