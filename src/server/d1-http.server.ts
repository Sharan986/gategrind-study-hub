/**
 * Cloudflare D1 over the REST API.
 * Lovable hosting cannot bind `env.DB`, so production talks to D1 through
 * POST /accounts/{account}/d1/database/{db}/query with parameterised SQL.
 * Configure: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_D1_API_TOKEN (D1 Edit).
 */
import type { D1Database, D1PreparedStatement } from "./db";

interface D1Config {
  accountId: string;
  databaseId: string;
  token: string;
}

export function readD1Config(): D1Config | null {
  const accountId = process.env["CLOUDFLARE_ACCOUNT_ID"];
  const databaseId = process.env["CLOUDFLARE_D1_DATABASE_ID"];
  const token = process.env["CLOUDFLARE_D1_API_TOKEN"];
  if (!accountId || !databaseId || !token) return null;
  return { accountId, databaseId, token };
}

async function query<T>(cfg: D1Config, sql: string, params: unknown[]): Promise<T[]> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/d1/database/${cfg.databaseId}/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql, params: params.map((p) => (p === undefined ? null : p)) }),
    },
  );
  const body = (await res.json().catch(() => null)) as
    | { success: boolean; errors?: { message: string }[]; result?: { results: T[]; success: boolean }[] }
    | null;
  if (!res.ok || !body?.success) {
    const msg = body?.errors?.map((e) => e.message).join("; ") || res.statusText;
    console.error(`D1 query failed [${res.status}]: ${msg}`);
    throw new Error(res.status === 403 ? "D1 access denied — check the API token has D1 Edit permission." : `Database error: ${msg}`);
  }
  return body.result?.[0]?.results ?? [];
}

export function createHttpD1(cfg: D1Config): D1Database {
  return {
    prepare(sql: string): D1PreparedStatement {
      let bound: unknown[] = [];
      const stmt: D1PreparedStatement = {
        bind(...values: unknown[]) {
          bound = values;
          return stmt;
        },
        async first<T = unknown>(col?: string) {
          const rows = await query<Record<string, unknown>>(cfg, sql, bound);
          const row = rows[0];
          if (!row) return null;
          return (col ? (row[col] ?? null) : row) as T;
        },
        async all<T = unknown>() {
          return { results: await query<T>(cfg, sql, bound), success: true };
        },
        async run() {
          await query(cfg, sql, bound);
          return { success: true };
        },
      };
      return stmt;
    },
    async batch<T = unknown>(statements: D1PreparedStatement[]) {
      const out: { results: T[]; success: boolean }[] = [];
      for (const s of statements) out.push(await s.all<T>());
      return out;
    },
    async exec(sql: string) {
      await query(cfg, sql, []);
      return { count: 1, duration: 0 };
    },
  };
}

/** Returns the production D1 client, or null when credentials aren't configured yet. */
export function getAppDatabase(): D1Database | null {
  const cfg = readD1Config();
  return cfg ? createHttpD1(cfg) : null;
}
