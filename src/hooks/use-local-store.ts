import { useCallback, useEffect, useState } from "react";

// Demo-state persistence in localStorage. Hydration-safe: reads after mount.
const listeners = new Map<string, Set<() => void>>();

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useLocalStore<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setValue(read(key, fallback));
    setReady(true);
    const fn = () => setValue(read(key, fallback));
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(fn);
    return () => void listeners.get(key)?.delete(fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = read(key, fallback);
      const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      window.localStorage.setItem(key, JSON.stringify(v));
      listeners.get(key)?.forEach((l) => l());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return [value, update, ready] as const;
}

export interface Attempt {
  qid: string;
  correct: boolean;
  at: number;
}

export function useAttempts() {
  return useLocalStore<Record<string, Attempt>>("gg:attempts", {});
}
export function useBookmarks() {
  const [list, set] = useLocalStore<string[]>("gg:bookmarks", []);
  const toggle = (id: string) => set((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  return { bookmarks: list, toggle, has: (id: string) => list.includes(id) };
}
export function useSyllabusProgress() {
  const [done, set] = useLocalStore<string[]>("gg:syllabus", []);
  const toggle = (k: string) => set((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]));
  return { done, toggle };
}
export interface MockResult {
  testId: string;
  responses: Record<string, string[] | string>;
  timeTakenSec: number;
  at: number;
}
export function useMockResults() {
  return useLocalStore<Record<string, MockResult>>("gg:mocks", {});
}
