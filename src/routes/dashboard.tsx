import { createFileRoute, Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState, PageHeader, Pill, ProgressBar, Stat } from "@/components/gg/primitives";
import { subjectById } from "@/data/subjects";
import { useAttempts, useHistory, useMockResults, useSyllabusProgress } from "@/hooks/use-local-store";
import { syncNow, useAccount } from "@/lib/account-client";
import { updateProfile } from "@/lib/account.functions";
import { computeAnalytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — GATE Grind" },
      { name: "description", content: "Detailed analytics of your GATE CSE preparation: accuracy, streaks, weak topics and mock scores." },
      { property: "og:title", content: "Preparation dashboard — GATE Grind" },
      { property: "og:description", content: "Track accuracy, streaks, weak topics and mock trends." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Bars({ rows }: { rows: { label: string; attempted: number; accuracy: number }[] }) {
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-text-h">{r.label}</span>
            <span>{r.attempted ? `${r.accuracy}% · ${r.attempted} Qs` : "—"}</span>
          </div>
          <ProgressBar value={r.accuracy} label={`${r.label} accuracy`} />
        </li>
      ))}
    </ul>
  );
}

function Dashboard() {
  const account = useAccount();
  const [attempts] = useAttempts();
  const [history] = useHistory();
  const [mocks] = useMockResults();
  const { done } = useSyllabusProgress();
  const a = computeAnalytics({ attempts, history, mocks, syllabusDone: done });
  const max = Math.max(1, ...a.heatmap.map((d) => d.count));
  const u = account.user;

  return (
    <>
      <PageHeader eyebrow="Your preparation" title="Dashboard" description={u ? "Synced to your account and available on every device." : "Based on progress saved on this device."}>
        {u && (
          <button className="neo-btn" onClick={() => void syncNow()} disabled={account.syncing}>
            <RefreshCw className={cn("size-4", account.syncing && "animate-spin")} /> {account.syncing ? "Syncing…" : "Sync now"}
          </button>
        )}
      </PageHeader>

      {account.error && <p role="alert" className="mb-6 border border-danger bg-danger-bg p-3 text-xs text-danger">{account.error}</p>}

      <div className="mb-8 grid gap-6 lg:grid-cols-[320px_1fr]">
        {u ? <ProfileCard /> : (
          <div className="neo-box">
            <h2 className="text-lg">Save progress to an account</h2>
            <p className="mt-1 text-xs text-muted-foreground">Log in to sync your scores across devices. Progress on this device is merged in when you first log in.</p>
            <Link to="/login" className="neo-btn neo-btn-primary mt-4 w-full">Log in</Link>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Stat label="Solved" value={a.solved} hint={`${a.totalAttempts} total attempts`} />
          <Stat label="Accuracy" value={`${a.accuracy}%`} hint={`${a.correct} correct`} />
          <Stat label="Streak" value={`${a.streak}d`} hint={`${a.studyDays} study days`} />
          <Stat label="Mocks taken" value={a.mocks.length} />
          <Stat label="Avg mock" value={`${a.avgMock}%`} />
          <Stat label="Syllabus" value={`${a.syllabusPct}%`} hint="topics ticked off" />
        </div>
      </div>

      <section className="neo-box mb-8">
        <h2 className="mb-4 text-lg">Activity · last 12 weeks</h2>
        <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto" role="img" aria-label="Daily activity heatmap">
          {a.heatmap.map((d) => (
            <div key={d.day} title={`${d.day}: ${d.count} questions`} className="size-3.5 border border-border sm:size-4" style={{ background: d.count ? `color-mix(in oklab, var(--text-h) ${20 + (d.count / max) * 80}%, transparent)` : "transparent" }} />
          ))}
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground">Each square is a day. Darker squares mean more questions.</div>
      </section>

      {a.solved === 0 ? (
        <EmptyState title="No practice yet" description="Answer a few questions and your analytics will appear here." action={<Link to="/pyq" className="neo-btn neo-btn-primary">Start practising</Link>} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="neo-box">
            <h2 className="mb-4 text-lg">By subject</h2>
            <Bars rows={a.subjects.map((s) => ({ label: s.name, attempted: s.attempted, accuracy: s.accuracy }))} />
          </section>
          <section className="neo-box">
            <h2 className="mb-4 text-lg">Topics · weakest first</h2>
            <table className="w-full text-xs">
              <thead><tr className="neo-label text-left"><th className="pb-2 font-normal">Topic</th><th className="pb-2 font-normal">Qs</th><th className="pb-2 text-right font-normal">Accuracy</th></tr></thead>
              <tbody className="divide-y divide-border border-t border-border">
                {a.topics.slice(0, 8).map((t) => (
                  <tr key={t.subjectId + t.name}>
                    <td className="py-2"><Link to="/pyq" search={{ subject: t.subjectId }} className="text-text-h hover:underline">{t.name}</Link> <span className="text-muted-foreground">· {subjectById(t.subjectId)?.code}</span></td>
                    <td>{t.attempted}</td>
                    <td className={cn("text-right", t.accuracy < 50 ? "text-danger" : "text-success")}>{t.accuracy}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="neo-box">
            <h2 className="mb-4 text-lg">By question type</h2>
            <Bars rows={a.byType} />
            <h2 className="mb-4 mt-6 text-lg">By difficulty</h2>
            <Bars rows={a.byDifficulty} />
          </section>
          <section className="neo-box">
            <h2 className="mb-4 text-lg">Mock score trend</h2>
            {a.mocks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No mock tests yet. <Link to="/mocks" className="underline">Take one</Link>.</p>
            ) : (
              <>
                <div className="flex h-32 items-end gap-2 border-b border-l border-border p-2" role="img" aria-label="Mock score trend">
                  {a.mocks.map((m) => (
                    <div key={m.testId + m.at} className="flex-1 bg-primary" style={{ height: `${Math.max(4, m.pct)}%` }} title={`${m.title}: ${m.pct}%`} />
                  ))}
                </div>
                <ul className="mt-4 divide-y divide-border border-y border-border text-xs">
                  {[...a.mocks].reverse().slice(0, 5).map((m) => (
                    <li key={m.testId + m.at} className="flex justify-between py-2">
                      <Link to="/mocks/$testId/result" params={{ testId: m.testId }} className="text-text-h hover:underline">{m.title}</Link>
                      <span>{m.score} / {m.max}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
          <section className="neo-box lg:col-span-2">
            <h2 className="mb-4 text-lg">Syllabus completion</h2>
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {a.syllabus.map((s) => (
                <div key={s.subjectId}>
                  <div className="mb-1 flex justify-between text-xs"><span className="text-text-h">{subjectById(s.subjectId)?.short}</span><span>{s.done}/{s.total}</span></div>
                  <ProgressBar value={s.pct} label={`${subjectById(s.subjectId)?.short} syllabus`} />
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function ProfileCard() {
  const { user } = useAccount();
  const [year, setYear] = useState(user?.targetGateYear ?? 2027);
  const [goal, setGoal] = useState(user?.dailyGoal ?? 15);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (user) {
      setYear(user.targetGateYear);
      setGoal(user.dailyGoal);
    }
  }, [user]);
  if (!user) return null;
  const save = async () => {
    setMsg(null);
    try {
      await updateProfile({ data: { targetGateYear: year, dailyGoal: goal } });
      setMsg("Saved");
    } catch {
      setMsg("Couldn't save. Try again.");
    }
  };
  return (
    <div className="neo-box">
      <div className="flex items-center gap-3">
        {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-12 border border-border" referrerPolicy="no-referrer" /> : <div className="size-12 border border-border bg-subtle" />}
        <div className="min-w-0">
          <h2 className="truncate text-lg">{user.name}</h2>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <label className="text-xs"><span className="neo-label mb-1 block">Target GATE</span>
          <input type="number" className="neo-input" value={year} min={2025} max={2035} onChange={(e) => setYear(Number(e.target.value))} />
        </label>
        <label className="text-xs"><span className="neo-label mb-1 block">Daily goal</span>
          <input type="number" className="neo-input" value={goal} min={1} max={200} onChange={(e) => setGoal(Number(e.target.value))} />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button className="neo-btn neo-btn-primary" onClick={() => void save()}>Save</button>
        {msg && <span className="text-xs">{msg}</span>}
        <Pill className="ml-auto">{user.streakDays}d streak</Pill>
      </div>
    </div>
  );
}
