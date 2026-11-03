import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageHeader, Pill, ProgressBar } from "@/components/gg/primitives";
import { questionById } from "@/data/questions";
import { subjectById, subjects } from "@/data/subjects";
import { useAttempts, useLocalStore } from "@/hooks/use-local-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Study planner — GATE Grind" },
      { name: "description", content: "Plan your GATE CSE week, set daily goals and see which topics need more work." },
      { property: "og:title", content: "GATE study planner — GATE Grind" },
      { property: "og:description", content: "A weekly GATE CSE study plan with daily goals." },
    ],
  }),
  component: Planner,
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
interface Task { id: string; day: number; subjectId: string; text: string; done: boolean }

const DEFAULT: Task[] = [
  { id: "1", day: 0, subjectId: "os", text: "Scheduling PYQs", done: false },
  { id: "2", day: 0, subjectId: "ga", text: "10 quant questions", done: true },
  { id: "3", day: 1, subjectId: "dbms", text: "Normal forms revision", done: false },
  { id: "4", day: 2, subjectId: "toc", text: "Pumping lemma problems", done: false },
  { id: "5", day: 3, subjectId: "cn", text: "Subnetting drill", done: false },
  { id: "6", day: 5, subjectId: "algo", text: "Full length mock", done: false },
];

function Planner() {
  const [tasks, setTasks] = useLocalStore<Task[]>("gg:planner", DEFAULT);
  const [attempts] = useAttempts();
  const [day, setDay] = useState((new Date().getDay() + 6) % 7);
  const [text, setText] = useState("");
  const [sub, setSub] = useState("pds");
  const done = tasks.filter((t) => t.done).length;

  const add = () => {
    if (!text.trim()) return;
    setTasks((t) => [...t, { id: String(Date.now()), day, subjectId: sub, text: text.trim(), done: false }]);
    setText("");
  };

  const stats = new Map<string, { n: number; c: number }>();
  Object.values(attempts).forEach((a) => {
    const q = questionById(a.qid);
    if (!q) return;
    const s = stats.get(q.subjectId) ?? { n: 0, c: 0 };
    s.n++; if (a.correct) s.c++;
    stats.set(q.subjectId, s);
  });
  const recs = subjects
    .map((s) => ({ s, st: stats.get(s.id) }))
    .sort((a, b) => (a.st ? a.st.c / a.st.n : -1) - (b.st ? b.st.c / b.st.n : -1))
    .slice(0, 4);

  return (
    <>
      <PageHeader eyebrow="Plan" title="Study planner" description="Plan your week one subject at a time. Your plan is saved on this device.">
        <div className="w-56"><div className="mb-1 flex justify-between text-xs"><span>This week</span><span className="text-text-h">{done}/{tasks.length}</span></div><ProgressBar value={tasks.length ? (done / tasks.length) * 100 : 0} label="Weekly progress" /></div>
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="grid grid-cols-7 border-l border-t border-border">
            {DAYS.map((d, i) => {
              const n = tasks.filter((t) => t.day === i);
              return (
                <button key={d} onClick={() => setDay(i)} aria-pressed={day === i} className={cn("border-b border-r border-border p-2 text-left", day === i ? "bg-primary text-primary-foreground" : "hover:bg-subtle")}>
                  <div className="text-xs font-bold">{d}</div>
                  <div className="mt-1 text-[10px] opacity-70">{n.filter((t) => t.done).length}/{n.length}</div>
                </button>
              );
            })}
          </div>

          <div className="neo-box mt-5">
            <h2 className="mb-3 text-lg">{DAYS[day]}'s plan</h2>
            <form className="mb-4 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); add(); }}>
              <select className="neo-input sm:w-40" value={sub} onChange={(e) => setSub(e.target.value)} aria-label="Subject">
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.short}</option>)}
              </select>
              <input className="neo-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. 20 PYQs on paging" aria-label="Task" />
              <button className="neo-btn neo-btn-primary" type="submit"><Plus className="size-4" /> Add</button>
            </form>
            {tasks.filter((t) => t.day === day).length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Nothing planned for this day yet.</p>
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {tasks.filter((t) => t.day === day).map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    <button role="checkbox" aria-checked={t.done} aria-label={t.text} onClick={() => setTasks((l) => l.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))} className={cn("flex size-5 items-center justify-center border border-border", t.done && "bg-primary text-primary-foreground")}>
                      {t.done && <Check className="size-3.5" />}
                    </button>
                    <Pill>{subjectById(t.subjectId)?.code}</Pill>
                    <span className={cn("flex-1 text-sm", t.done ? "text-muted-foreground line-through" : "text-text-h")}>{t.text}</span>
                    <button onClick={() => setTasks((l) => l.filter((x) => x.id !== t.id))} aria-label="Delete task" className="text-muted-foreground hover:text-danger"><Trash2 className="size-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="neo-box h-fit">
          <h2 className="mb-1 text-lg">Focus next</h2>
          <p className="mb-4 text-xs text-muted-foreground">Based on your practice accuracy. Subjects you haven't tried come first.</p>
          <ul className="space-y-3">
            {recs.map(({ s, st }) => (
              <li key={s.id} className="neo-box-sm p-3">
                <div className="flex items-center justify-between"><span className="text-sm text-text-h">{s.name}</span><Pill>{st ? `${Math.round((st.c / st.n) * 100)}%` : "new"}</Pill></div>
                <Link to="/pyq" search={{ subject: s.id }} className="mt-2 inline-block text-xs underline underline-offset-4 hover:text-text-h">Practise →</Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
