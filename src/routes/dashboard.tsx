import { createFileRoute, Link } from "@tanstack/react-router";
import { RefreshCw, TrendingUp, BarChart2, Calendar, Award } from "lucide-react";
import { useEffect, useState } from "react";
import {
  EmptyState,
  PageHeader,
  Pill,
  ProgressBar,
  Stat,
  SubjectBadge,
} from "@/components/gg/primitives";
import { subjectById } from "@/data/subjects";
import {
  useAttempts,
  useHistory,
  useMockResults,
  useSyllabusProgress,
} from "@/hooks/use-local-store";
import { syncNow, useAccount } from "@/lib/account-client";
import { updateProfile } from "@/lib/account.functions";
import { computeAnalytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Dashboard — GATE Grind" },
      {
        name: "description",
        content:
          "Detailed analytics of your GATE CSE preparation: accuracy, streaks, weak topics and mock scores.",
      },
      { property: "og:title", content: "Preparation dashboard — GATE Grind" },
      {
        property: "og:description",
        content: "Track accuracy, streaks, weak topics and mock trends.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Bars({ rows }: { rows: { label: string; attempted: number; accuracy: number }[] }) {
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => {
        const color = r.accuracy >= 70 ? "green" : r.accuracy >= 45 ? "primary" : "pink";
        return (
          <li
            key={r.label}
            className="border-2 border-border p-3 bg-surface shadow-[2px_2px_0_var(--border)]"
          >
            <div className="mb-1.5 flex justify-between text-xs font-bold">
              <span className="text-text-h">{r.label}</span>
              <span>{r.attempted ? `${r.accuracy}% · ${r.attempted} Qs` : "—"}</span>
            </div>
            <ProgressBar value={r.accuracy} label={`${r.label} accuracy`} color={color} />
          </li>
        );
      })}
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
      <PageHeader
        eyebrow="Your Preparation"
        title="Analytics Dashboard"
        description={
          u
            ? "Synced securely to your account across all your devices."
            : "Based on local preparation progress saved on this device."
        }
      >
        {u && (
          <button
            className="neo-btn bg-neo-yellow text-black font-black hover:bg-neo-yellow/85"
            onClick={() => void syncNow()}
            disabled={account.syncing}
          >
            <RefreshCw className={cn("size-4", account.syncing && "animate-spin")} />{" "}
            {account.syncing ? "Syncing…" : "Sync Now"}
          </button>
        )}
      </PageHeader>

      {account.error && (
        <p
          role="alert"
          className="mb-6 border-2 border-danger bg-danger-bg p-3.5 text-xs font-bold text-danger shadow-[3px_3px_0_var(--danger)]"
        >
          {account.error}
        </p>
      )}

      <div className="mb-8 grid gap-6 lg:grid-cols-[330px_1fr]">
        {u ? (
          <ProfileCard />
        ) : (
          <div className="neo-box border-2 border-border bg-[#FFF9C4]/40 dark:bg-[#2A240A]/40 shadow-[5px_5px_0_var(--border)]">
            <span className="neo-sticker bg-neo-yellow text-black rotate-[-1deg] text-[10px] font-black">
              CLOUD SYNC
            </span>
            <h2 className="mt-2 text-xl font-black">Save progress to cloud</h2>
            <p className="mt-1.5 text-xs text-muted-foreground font-medium leading-relaxed">
              Log in to sync your attempts and bookmarks across your phone and laptop. Progress on
              this device is automatically merged.
            </p>
            <Link
              to="/login"
              className="neo-btn neo-btn-primary mt-4 w-full font-black text-center block"
            >
              Log in / Sign up →
            </Link>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Stat
            label="Solved"
            value={a.solved}
            hint={`${a.totalAttempts} total attempts`}
            color="yellow"
          />
          <Stat
            label="Accuracy"
            value={`${a.accuracy}%`}
            hint={`${a.correct} correct`}
            color="green"
          />
          <Stat
            label="Streak"
            value={`${a.streak}d`}
            hint={`${a.studyDays} study days`}
            color="pink"
          />
          <Stat
            label="Mocks Taken"
            value={a.mocks.length}
            hint="Full GATE simulations"
            color="cyan"
          />
          <Stat
            label="Avg Mock"
            value={`${a.avgMock}%`}
            hint="Across past attempts"
            color="purple"
          />
          <Stat
            label="Syllabus"
            value={`${a.syllabusPct}%`}
            hint="Topics completed"
            color="yellow"
          />
        </div>
      </div>

      {/* Heatmap Activity */}
      <section className="neo-box mb-8 border-2 border-border bg-surface shadow-[6px_6px_0_var(--border)]">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="size-5 text-neo-pink" />
          <h2 className="text-xl font-black tracking-tight">Activity · Last 12 Weeks</h2>
        </div>
        <div
          className="grid w-fit max-w-full auto-cols-max grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto p-1"
          role="img"
          aria-label="Daily activity heatmap"
        >
          {a.heatmap.map((d) => {
            const bg =
              d.count === 0
                ? "bg-surface"
                : d.count > 10
                  ? "bg-[#00F090]"
                  : d.count > 5
                    ? "bg-[#4ADE80]"
                    : "bg-[#A7F3D0]";
            return (
              <div
                key={d.day}
                title={`${d.day}: ${d.count} questions`}
                className={cn(
                  "size-4 border-2 border-border transition-transform hover:scale-125 hover:z-10",
                  bg,
                )}
              />
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-muted-foreground border-t-2 border-border pt-2.5">
          <span>Daily study consistency grid</span>
          <div className="flex items-center gap-1.5">
            <span>Less</span>
            <span className="size-3 border border-border bg-surface inline-block" />
            <span className="size-3 border border-border bg-[#A7F3D0] inline-block" />
            <span className="size-3 border border-border bg-[#4ADE80] inline-block" />
            <span className="size-3 border border-border bg-[#00F090] inline-block" />
            <span>More</span>
          </div>
        </div>
      </section>

      {a.solved === 0 ? (
        <EmptyState
          title="No practice logged yet"
          description="Answer a few previous year questions and your performance charts will activate here."
          action={
            <Link to="/pyq" className="neo-btn neo-btn-primary font-black">
              Start Practising →
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* By subject */}
          <section className="neo-box border-2 border-border bg-surface shadow-[5px_5px_0_var(--border)]">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="size-5 text-neo-yellow" />
              <h2 className="text-xl font-black tracking-tight">Accuracy by Subject</h2>
            </div>
            <Bars
              rows={a.subjects.map((s) => ({
                label: s.name,
                attempted: s.attempted,
                accuracy: s.accuracy,
              }))}
            />
          </section>

          {/* Topics weakest first */}
          <section className="neo-box border-2 border-border bg-surface shadow-[5px_5px_0_var(--border)]">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="size-5 text-neo-pink" />
              <h2 className="text-xl font-black tracking-tight">Target Topics · Weakest First</h2>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="neo-label text-left border-b-2 border-border">
                  <th className="pb-2.5 font-black">Topic</th>
                  <th className="pb-2.5 font-black">Attempted</th>
                  <th className="pb-2.5 text-right font-black">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-border">
                {a.topics.slice(0, 8).map((t) => (
                  <tr key={t.subjectId + t.name} className="hover:bg-subtle transition-colors">
                    <td className="py-2.5 font-bold">
                      <Link
                        to="/pyq"
                        search={{ subject: t.subjectId }}
                        className="text-text-h hover:text-neo-pink hover:underline"
                      >
                        {t.name}
                      </Link>{" "}
                      <span className="text-[10px]">
                        <SubjectBadge subjectId={t.subjectId} />
                      </span>
                    </td>
                    <td className="font-semibold">{t.attempted}</td>
                    <td className="text-right">
                      <span
                        className={cn(
                          "neo-pill font-black text-[10px]",
                          t.accuracy < 50
                            ? "bg-neo-pink text-white border-border shadow-[1px_1px_0_var(--border)]"
                            : "bg-neo-green text-black border-border shadow-[1px_1px_0_var(--border)]",
                        )}
                      >
                        {t.accuracy}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* By Type and Difficulty */}
          <section className="neo-box border-2 border-border bg-surface shadow-[5px_5px_0_var(--border)]">
            <h2 className="mb-4 text-xl font-black tracking-tight">By Question Type</h2>
            <Bars rows={a.byType} />
            <h2 className="mb-4 mt-7 text-xl font-black tracking-tight">By Difficulty</h2>
            <Bars rows={a.byDifficulty} />
          </section>

          {/* Mock Score Trend */}
          <section className="neo-box border-2 border-border bg-surface shadow-[5px_5px_0_var(--border)]">
            <div className="flex items-center gap-2 mb-4">
              <Award className="size-5 text-neo-purple" />
              <h2 className="text-xl font-black tracking-tight">Mock Score Trend</h2>
            </div>
            {a.mocks.length === 0 ? (
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                No mock exams completed yet. Take a 65-question timed simulation in{" "}
                <Link to="/mocks" className="font-bold underline text-text-h hover:text-neo-pink">
                  Mocks
                </Link>
                .
              </p>
            ) : (
              <>
                <div
                  className="flex h-36 items-end gap-2 border-b-2 border-l-2 border-border p-2.5 bg-subtle"
                  role="img"
                  aria-label="Mock score trend"
                >
                  {a.mocks.map((m) => (
                    <div
                      key={m.testId + m.at}
                      className="flex-1 bg-neo-yellow border-2 border-border shadow-[2px_2px_0_var(--border)] hover:bg-neo-cyan transition-colors"
                      style={{ height: `${Math.max(8, m.pct)}%` }}
                      title={`${m.title}: ${m.pct}%`}
                    />
                  ))}
                </div>
                <ul className="mt-4 divide-y-2 divide-border border-y-2 border-border text-xs">
                  {[...a.mocks]
                    .reverse()
                    .slice(0, 5)
                    .map((m) => (
                      <li key={m.testId + m.at} className="flex justify-between py-2.5 font-bold">
                        <Link
                          to="/mocks/$testId/result"
                          params={{ testId: m.testId }}
                          className="text-text-h hover:underline"
                        >
                          {m.title}
                        </Link>
                        <span className="neo-pill bg-neo-yellow text-black border-border shadow-[1px_1px_0_var(--border)] font-black text-[10px]">
                          {m.score} / {m.max}
                        </span>
                      </li>
                    ))}
                </ul>
              </>
            )}
          </section>

          {/* Syllabus Progress */}
          <section className="neo-box border-2 border-border bg-surface shadow-[5px_5px_0_var(--border)] lg:col-span-2">
            <h2 className="mb-4 text-xl font-black tracking-tight">
              Syllabus Completion by Subject
            </h2>
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {a.syllabus.map((s) => (
                <div
                  key={s.subjectId}
                  className="border-2 border-border p-3 bg-surface shadow-[2px_2px_0_var(--border)]"
                >
                  <div className="mb-1.5 flex justify-between text-xs font-bold">
                    <span className="text-text-h">{subjectById(s.subjectId)?.short}</span>
                    <span className="neo-pill bg-neo-yellow text-black border-border shadow-[1px_1px_0_var(--border)] font-bold text-[10px]">
                      {s.done}/{s.total}
                    </span>
                  </div>
                  <ProgressBar
                    value={s.pct}
                    label={`${subjectById(s.subjectId)?.short} syllabus`}
                    color={s.pct > 75 ? "green" : "primary"}
                  />
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
      setMsg("Saved!");
    } catch {
      setMsg("Couldn't save. Try again.");
    }
  };
  return (
    <div className="neo-box border-2 border-border bg-surface shadow-[5px_5px_0_var(--border)]">
      <div className="flex items-center gap-3.5">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="size-13 border-2 border-border shadow-[2px_2px_0_var(--border)]"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="size-13 border-2 border-border bg-neo-yellow shadow-[2px_2px_0_var(--border)] flex items-center justify-center font-black text-lg">
            {user.name.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-lg font-black text-text-h">{user.name}</h2>
          <p className="truncate text-xs text-muted-foreground font-semibold">{user.email}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <label className="text-xs font-bold">
          <span className="neo-label mb-1.5 block font-black">Target GATE</span>
          <input
            type="number"
            className="neo-input font-bold"
            value={year}
            min={2025}
            max={2035}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </label>
        <label className="text-xs font-bold">
          <span className="neo-label mb-1.5 block font-black">Daily Goal</span>
          <input
            type="number"
            className="neo-input font-bold"
            value={goal}
            min={1}
            max={200}
            onChange={(e) => setGoal(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className="neo-btn neo-btn-primary font-black" onClick={() => void save()}>
          Save Preferences
        </button>
        {msg && <span className="text-xs font-black text-neo-pink">{msg}</span>}
        <span className="neo-pill bg-neo-yellow text-black border-border shadow-[1.5px_1.5px_0_var(--border)] font-black text-xs ml-auto">
          🔥 {user.streakDays}d streak
        </span>
      </div>
    </div>
  );
}
