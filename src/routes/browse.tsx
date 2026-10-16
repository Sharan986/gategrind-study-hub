import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, BookOpen } from "lucide-react";
import { useState } from "react";
import { Chip, EmptyState, PageHeader, Pill, SUBJECT_COLORS } from "@/components/gg/primitives";
import { questions } from "@/data/questions";
import { matchesSubject, matchesTopic, subjects } from "@/data/subjects";
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
  const questionCount = (subjectId: string) =>
    questions.filter((question) => matchesSubject(question.subjectId, subjectId)).length;
  const topicCount = (subjectId: string, topicId: string) =>
    questions.filter(
      (question) =>
        matchesSubject(question.subjectId, subjectId) &&
        matchesTopic(question.topicId, topicId, subjectId),
    ).length;
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
        eyebrow="Subject Catalog"
        title="Browse by Subject"
        description="All 11 GATE CSE technical disciplines plus general aptitude. Select any subject to explore its chapters and launch instant practice."
      >
        <span className="neo-sticker bg-neo-yellow text-black rotate-[-1deg] text-xs font-black">
          ★ {questions.length} QUESTIONS
        </span>
      </PageHeader>
      <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-center">
        <input
          className="neo-input font-bold md:max-w-md shadow-[3px_3px_0_var(--border)]"
          placeholder="Search subjects or specific topics…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search subjects"
        />
        <div className="flex flex-wrap gap-2">
          {(["all", "core", "math", "ga"] as const).map((g) => (
            <Chip key={g} active={group === g} onClick={() => setGroup(g)}>
              {
                {
                  all: "All Subjects",
                  core: "Core CS",
                  math: "Mathematics",
                  ga: "General Aptitude",
                }[g]
              }
            </Chip>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="No subjects match your search"
          description="Try a different topic name or clear your search query."
          action={
            <button
              className="neo-btn neo-btn-primary font-black"
              onClick={() => {
                setQ("");
                setGroup("all");
              }}
            >
              Clear Search
            </button>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {list.map((s) => {
            const isOpen = open === s.id || !!term;
            const counts = new Map(s.topics.map((t) => [t.id, topicCount(s.id, t.id)]));
            const max = Math.max(1, ...counts.values());
            const conf = SUBJECT_COLORS[s.id] ?? {
              bg: "bg-surface",
              badge: "bg-neo-yellow text-black",
            };
            return (
              <article
                key={s.id}
                className="neo-box p-0 border-2 border-border bg-surface shadow-[4px_4px_0_var(--border)] hover:shadow-[6px_6px_0_var(--border)] transition-all"
              >
                <button
                  className="flex w-full items-start justify-between gap-4 p-5 text-left cursor-pointer hover:bg-subtle transition-colors"
                  onClick={() => setOpen(isOpen && !term ? null : s.id)}
                  aria-expanded={isOpen}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "neo-pill font-black text-xs border-border shadow-[1px_1px_0_var(--border)]",
                          conf.badge,
                        )}
                      >
                        {s.code}
                      </span>
                      <span className="neo-label text-[10px] font-black">{s.weightage}</span>
                    </div>
                    <h2 className="mt-2 text-xl font-black text-text-h">{s.name}</h2>
                    <p className="mt-1 text-xs text-muted-foreground font-medium leading-relaxed">
                      {s.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="neo-sticker bg-neo-yellow text-black rotate-[-1deg] text-xs font-black px-2 py-0.5">
                      {questionCount(s.id)} Qs
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-4 stroke-[3] transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </div>
                </button>
                {isOpen && (
                  <ul className="border-t-2 border-border bg-subtle/50">
                    {s.topics.map((t) => (
                      <li key={t.id} className="border-b-2 border-border last:border-b-0">
                        <Link
                          to="/pyq"
                          search={{ subject: s.id, topic: t.id }}
                          className="flex items-center gap-3 px-5 py-3 text-xs font-bold hover:bg-neo-yellow/30 transition-colors group"
                        >
                          <span
                            className={cn(
                              "flex-1 text-text-h group-hover:underline",
                              term && t.name.toLowerCase().includes(term) && "underline font-black",
                            )}
                          >
                            {t.name}
                          </span>
                          <span className="hidden h-2.5 w-24 border-2 border-border bg-surface sm:block shadow-[1px_1px_0_var(--border)]">
                            <span
                              className="block h-full bg-neo-green"
                              style={{ width: `${((counts.get(t.id) ?? 0) / max) * 100}%` }}
                            />
                          </span>
                          <span className="w-10 text-right font-black text-text-h">
                            {counts.get(t.id) ?? 0}
                          </span>
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
