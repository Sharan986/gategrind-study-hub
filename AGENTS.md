<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Content comes from typed demo data in `src/data/`; the UI always reads progress from localStorage (`src/hooks/use-local-store.ts`) so it works signed-out. When signed in, `src/lib/account-client.ts` pushes/pulls rows to the D1 `user_progress` table (newest wins; first login unions collections) — keep pages unaware of sync.
- Production D1 is reached over the Cloudflare REST API (`src/server/d1-http.server.ts`, env CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_D1_DATABASE_ID / CLOUDFLARE_D1_API_TOKEN) because Lovable hosting can't bind `env.DB`; `src/server/db.ts` (bun/node sqlite) is for local tests only — never call it from server functions.
- Auth: Google ID tokens are verified with Google JWKS via `jose` (no unverified fallback); sessions are HMAC-signed HttpOnly cookies backed by `user_sessions`, requiring SESSION_SECRET (32+ chars) and GOOGLE_CLIENT_ID. Missing config must degrade to "sign-in not switched on", never to a dev default.
- Analytics are computed client-side from synced local data (`src/lib/analytics.ts`) so guests and signed-in users see the same dashboard.
- Design tokens (brief's exact `--bg/--text-h/--border/...`) and `neo-*` utilities live in `src/styles.css`; shadcn tokens map onto them so primitives inherit the theme.
- Detail sub-pages that sit beside a list page use un-nested route files (`papers_.$paperId.tsx`, `mocks_.$testId.*.tsx`) because list pages have no `<Outlet />`.
