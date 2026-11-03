/**
 * GATE Grind - Unified Cloudflare D1 & Local SQLite Client
 * ========================================================
 * Production: Binds directly to `env.DB` (Cloudflare D1).
 * Local / Tests: Uses native `node:sqlite` (DatabaseSync), supported in both
 * Node 22+ and Bun 1.1+.
 * Zero external native C dependencies required.
 */

import path from "node:path";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[]; success: boolean }>;
  run<T = unknown>(): Promise<{ success: boolean; meta?: unknown }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(
    statements: D1PreparedStatement[],
  ): Promise<{ results: T[]; success: boolean }[]>;
  exec(query: string): Promise<{ count: number; duration: number }>;
}

let localDbInstance: D1Database | null = null;

function createD1AdapterFromEngine(engine: {
  get: (query: string, params: unknown[]) => Record<string, unknown> | null;
  all: (query: string, params: unknown[]) => unknown[];
  run: (query: string, params: unknown[]) => unknown;
  exec: (sql: string) => void;
}): D1Database {
  return {
    prepare(query: string): D1PreparedStatement {
      let boundValues: unknown[] = [];
      const stmt: D1PreparedStatement = {
        bind(...values: unknown[]): D1PreparedStatement {
          boundValues = values;
          return stmt;
        },
        async first<T = unknown>(colName?: string): Promise<T | null> {
          try {
            const row = engine.get(query, boundValues);
            if (!row) return null;
            if (colName) return (row[colName] ?? null) as T;
            return row as T;
          } catch (err) {
            console.error("Local D1 first() error:", err, "Query:", query, "Values:", boundValues);
            throw err;
          }
        },
        async all<T = unknown>(): Promise<{ results: T[]; success: boolean }> {
          try {
            const rows = engine.all(query, boundValues) as T[];
            return { results: rows, success: true };
          } catch (err) {
            console.error("Local D1 all() error:", err, "Query:", query, "Values:", boundValues);
            throw err;
          }
        },
        async run<T = unknown>(): Promise<{ success: boolean; meta?: unknown }> {
          try {
            const res = engine.run(query, boundValues);
            return { success: true, meta: res };
          } catch (err) {
            console.error("Local D1 run() error:", err, "Query:", query, "Values:", boundValues);
            throw err;
          }
        },
      };
      return stmt;
    },
    async batch<T = unknown>(
      statements: D1PreparedStatement[],
    ): Promise<{ results: T[]; success: boolean }[]> {
      const results: { results: T[]; success: boolean }[] = [];
      engine.exec("BEGIN TRANSACTION;");
      try {
        for (const s of statements) {
          const r = await s.all<T>();
          results.push(r);
        }
        engine.exec("COMMIT;");
      } catch (err) {
        engine.exec("ROLLBACK;");
        throw err;
      }
      return results;
    },
    async exec(query: string): Promise<{ count: number; duration: number }> {
      engine.exec(query);
      return { count: 1, duration: 0 };
    },
  };
}

export function getDatabase(env?: { DB?: D1Database }): D1Database {
  if (env?.DB) {
    return env.DB;
  }

  if (localDbInstance) {
    return localDbInstance;
  }

  const rootDir = process.cwd();
  const localDbPath = path.resolve(rootDir, "gategrind-local.db");

  const db = fs.existsSync(localDbPath)
    ? new DatabaseSync(localDbPath)
    : new DatabaseSync(":memory:");
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 10000;");
  db.exec("PRAGMA foreign_keys = ON;");

  if (!fs.existsSync(localDbPath)) {
    const schemaPath = path.resolve(rootDir, "migrations", "0001_initial_schema.sql");
    if (fs.existsSync(schemaPath)) db.exec(fs.readFileSync(schemaPath, "utf-8"));
  }

  localDbInstance = createD1AdapterFromEngine({
    get: (q, params) =>
      db.prepare(q).get(...(params as (string | number | bigint | null)[])) as Record<
        string,
        unknown
      > | null,
    all: (q, params) => db.prepare(q).all(...(params as (string | number | bigint | null)[])),
    run: (q, params) => db.prepare(q).run(...(params as (string | number | bigint | null)[])),
    exec: (sql) => db.exec(sql),
  });

  return localDbInstance;
}
