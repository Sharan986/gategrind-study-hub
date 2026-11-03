// Browser-side account state + progress sync. Local storage stays the source the UI reads;
// when signed in, changes are pushed to D1 and the merged server snapshot is written back.
import { useSyncExternalStore } from "react";
import { getAuthStatus, signOut as signOutFn, syncProgress, type PublicUser } from "@/lib/account.functions";
import { mergeProgress, type ProgressKind, type ProgressRow } from "@/lib/sync";
import { onLocalChange, readLocal, writeLocal, type Attempt, type HistoryEntry, type MockResult } from "@/hooks/use-local-store";

export interface AccountState {
  loaded: boolean;
  configured: boolean;
  clientId: string | null;
  user: PublicUser | null;
  syncing: boolean;
  lastSync: number | null;
  error: string | null;
}

let state: AccountState = { loaded: false, configured: false, clientId: null, user: null, syncing: false, lastSync: null, error: null };
const subs = new Set<() => void>();
const set = (p: Partial<AccountState>) => {
  state = { ...state, ...p };
  subs.forEach((s) => s());
};

export function useAccount() {
  return useSyncExternalStore(
    (cb) => (subs.add(cb), () => void subs.delete(cb)),
    () => state,
    () => state,
  );
}

const COLLECTIONS: { kind: ProgressKind; key: string }[] = [
  { kind: "bookmarks", key: "gg:bookmarks" },
  { kind: "syllabus", key: "gg:syllabus" },
  { kind: "planner", key: "gg:planner" },
];
const SYNCED = new Set(["gg:attempts", "gg:history", "gg:mocks", ...COLLECTIONS.map((c) => c.key)]);

export function localSnapshot(): ProgressRow[] {
  const rows: ProgressRow[] = [];
  const meta = readLocal<Record<string, number>>("gg:meta", {});
  Object.values(readLocal<Record<string, Attempt>>("gg:attempts", {})).forEach((a) => rows.push({ kind: "attempt", key: a.qid, payload: a, updatedAt: a.at }));
  readLocal<HistoryEntry[]>("gg:history", []).forEach((h) => rows.push({ kind: "history", key: `${h.qid}@${h.at}`, payload: h, updatedAt: h.at }));
  Object.values(readLocal<Record<string, MockResult>>("gg:mocks", {})).forEach((m) => rows.push({ kind: "mock", key: m.testId, payload: m, updatedAt: m.at }));
  COLLECTIONS.forEach(({ kind, key }) => {
    const v = readLocal<unknown[] | null>(key, null);
    if (v) rows.push({ kind, key: "all", payload: v, updatedAt: meta[key] ?? 0 });
  });
  return rows;
}

function applySnapshot(rows: ProgressRow[]) {
  const attempts: Record<string, Attempt> = {};
  const mocks: Record<string, MockResult> = {};
  const history: HistoryEntry[] = [];
  for (const r of rows) {
    if (r.kind === "attempt") attempts[r.key] = r.payload as Attempt;
    else if (r.kind === "history") history.push(r.payload as HistoryEntry);
    else if (r.kind === "mock") mocks[r.key] = r.payload as MockResult;
  }
  writeLocal("gg:attempts", attempts, true);
  writeLocal("gg:history", history.sort((a, b) => a.at - b.at), true);
  writeLocal("gg:mocks", mocks, true);
  const meta = readLocal<Record<string, number>>("gg:meta", {});
  COLLECTIONS.forEach(({ kind, key }) => {
    const r = rows.find((x) => x.kind === kind);
    if (r) {
      writeLocal(key, r.payload, true);
      meta[key] = r.updatedAt;
    }
  });
  window.localStorage.setItem("gg:meta", JSON.stringify(meta));
}

export async function syncNow(opts: { union?: boolean } = {}) {
  if (!state.user) return;
  set({ syncing: true, error: null });
  try {
    const local = localSnapshot();
    const remote = (await syncProgress({ data: { rows: local } })).map((r) => ({ kind: r.kind, key: r.key, payload: JSON.parse(r.payloadJson) as unknown, updatedAt: r.updatedAt }));
    applySnapshot(mergeProgress(local, remote, opts));
    set({ syncing: false, lastSync: Date.now() });
  } catch (e) {
    console.error("sync failed", e);
    set({ syncing: false, error: "Couldn't sync. Your progress is still saved on this device." });
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
onLocalChange((key) => {
  if (!state.user || !SYNCED.has(key)) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), 2500);
});

export async function loadAccount() {
  try {
    const s = await getAuthStatus();
    set({ loaded: true, configured: s.configured, clientId: s.clientId, user: s.user });
    if (s.user) void syncNow();
  } catch (e) {
    console.error("account status failed", e);
    set({ loaded: true });
  }
}

export async function afterSignIn(user: PublicUser) {
  set({ user });
  await syncNow({ union: true });
}

export async function signOutAccount() {
  await signOutFn().catch(() => {});
  set({ user: null, lastSync: null });
}
