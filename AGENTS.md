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
- Frontend is UI-only for now: all content comes from typed demo data in `src/data/` and user progress lives in localStorage via `src/hooks/use-local-store.ts` — so real D1/API data can replace it without touching pages. Do not add server functions or touch `migrations/` without an explicit request.
- Design tokens (brief's exact `--bg/--text-h/--border/...`) and `neo-*` utilities live in `src/styles.css`; shadcn tokens map onto them so primitives inherit the theme.
- Detail sub-pages that sit beside a list page use un-nested route files (`papers_.$paperId.tsx`, `mocks_.$testId.*.tsx`) because list pages have no `<Outlet />`.
