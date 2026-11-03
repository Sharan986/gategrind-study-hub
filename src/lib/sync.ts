// Pure progress-sync helpers shared by the browser and server.
export type ProgressKind = "attempt" | "history" | "mock" | "bookmarks" | "syllabus" | "planner";

export interface ProgressRow {
  kind: ProgressKind;
  key: string;
  payload: unknown;
  updatedAt: number;
}

export const COLLECTION_KINDS: ProgressKind[] = ["bookmarks", "syllabus", "planner"];

const id = (r: ProgressRow) => `${r.kind}\u0000${r.key}`;

function unionCollection(kind: ProgressKind, a: unknown, b: unknown): unknown {
  const la = Array.isArray(a) ? a : [];
  const lb = Array.isArray(b) ? b : [];
  if (kind === "planner") {
    const map = new Map<string, unknown>();
    [...la, ...lb].forEach((t) => map.set(String((t as { id: string }).id), t));
    return [...map.values()];
  }
  return [...new Set([...la, ...lb].map(String))];
}

/**
 * Merge two snapshots. Per item the newest `updatedAt` wins.
 * With `union` (first login on a device) collection kinds are unioned instead, so nothing is dropped.
 */
export function mergeProgress(local: ProgressRow[], remote: ProgressRow[], opts: { union?: boolean } = {}): ProgressRow[] {
  const out = new Map<string, ProgressRow>();
  for (const r of remote) out.set(id(r), r);
  for (const l of local) {
    const r = out.get(id(l));
    if (!r) out.set(id(l), l);
    else if (opts.union && COLLECTION_KINDS.includes(l.kind))
      out.set(id(l), { ...l, payload: unionCollection(l.kind, l.payload, r.payload), updatedAt: Math.max(l.updatedAt, r.updatedAt) });
    else if (l.updatedAt > r.updatedAt) out.set(id(l), l);
  }
  return [...out.values()];
}
