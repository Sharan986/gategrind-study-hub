# AI explanations, Google login, synced progress and analytics dashboard

## 1. "Get step-by-step explanation" (works for everyone, no login)
- Each question's solution area gets an **Explain step by step** section with two buttons: **Ask ChatGPT** and **Ask Claude**.
- Each button opens a new tab with a ready-written prompt. The prompt includes the question, its options, code, year and subject, plus the user's answer and the correct answer if they've already checked it. It asks for a step-by-step explanation in GATE style.
- The buttons also appear on question review in mock results.
- Links used: `https://chatgpt.com/?q=…` and `https://claude.ai/new?q=…`. Very long prompts are shortened so the link always works.

## 2. Google login (your Cloudflare D1)
- The Log in page gets a real **Continue with Google** button. After sign-in, the header shows the user's photo and a menu with Dashboard and Log out.
- After login a secure session cookie is set and stored in your existing `user_sessions` table. Each login creates or updates a row in `user_profiles`.

## 3. Syncing scores
- When logged in, each answered question, bookmark, syllabus tick, planner task and mock result is saved to D1 and loaded on any device.
- Logged out: progress keeps working on the device as it does now.
- **First login merges** progress from this device into the account. Nothing is lost; for duplicates the newest entry wins.

## 4. Profile and analytics dashboard (`/dashboard`, login required)
- Profile card: name, photo, target GATE year, daily goal (editable).
- Summary: questions solved, accuracy, streak, total study days, mocks taken, average mock score.
- Activity over the last 12 weeks, as a calendar heatmap.
- Accuracy and coverage per subject, plus a topic table sorted from weakest to strongest.
- Breakdown by question type and difficulty (MCQ/MSQ/NAT, easy/medium/hard).
- Mock score trend chart and recent mock list.
- Syllabus completion per subject, and suggested topics to focus on next.
- All in the same black-and-white style, using simple charts.

## What I need from you
1. **Cloudflare connection.** Lovable hosts the app itself, so it can't attach your D1 database directly. The app will reach D1 through Cloudflare's secure API instead. You'll be asked to connect a Cloudflare token with **D1 Edit** permission.
2. **Your real D1 database ID and account ID.** `wrangler.toml` currently has a placeholder (`local-d1-gategrind`).
3. **Google OAuth Client ID** from Google Cloud Console. Add the app's preview and published web addresses as allowed origins. I'll also generate a random session secret.
4. **Apply the new migration** to D1 (`wrangler d1 migrations apply gategrind-db --remote`), or I can run it through the Cloudflare connection.

## Technical details
- **D1 access:** server-only helper `src/server/d1.ts`. It calls `POST /accounts/{id}/d1/database/{db}/query` through the Cloudflare connector gateway with parameterized SQL. It is used only inside `createServerFn` handlers, and secrets are read inside the handlers.
- **Auth:** Google Identity Services sends an ID token to a `signInWithGoogle` server function. That function verifies the token with Google's public keys using `jose`, then checks audience, issuer and expiry. Then it upserts `user_profiles`, inserts `user_sessions`, and sets an HttpOnly, Secure, SameSite=Lax cookie holding a random session ID. Every sync and analytics function looks up the session from the cookie, checks it hasn't expired and uses that `user_id`. Identity never comes from the client. Log out deletes the session row.
- **Migration `0002_sync.sql`:**
  - Seeds `subjects`, `topics` and the demo `questions` with the same IDs as the app, so foreign keys on `attempts` and `bookmarks` work.
  - Adds `mock_results(user_id, test_id, responses JSON, score, max_score, time_taken, submitted_at)`.
  - Adds `syllabus_items_done(user_id, item_key)` and `planner_tasks`.
  - The app's syllabus items are free text, which doesn't fit the existing `syllabus_progress` table keyed by `topic_id`. That table is left untouched.
- **Sync layer:** `useLocalStore` keeps writing to localStorage. When a session exists, it also calls `syncPush` (debounced, batched upserts). On login it calls `syncMerge`, which takes local data and returns the merged server state, and the result is written back locally. Pages don't change.
- **Analytics:** the `getAnalytics` server function runs SQL aggregates over `attempts`, `mock_results` and `syllabus_items_done`. It is shown with the existing shadcn chart (recharts) components.
- **Routes:** `/dashboard` is protected by checking the session in `beforeLoad` and redirecting to `/login`. The header gets an account menu. The login route redirects to `/dashboard` if already signed in.
- **AI links:** `src/lib/ai-prompt.ts` builds the prompt by stripping LaTeX delimiters and capping the length at about 6,000 characters. A `ExplainWithAI` component is used in `SolutionPanel`.
- **Tests:** prompt builder (includes question and answer, respects the length cap), merge rule (newest wins, nothing dropped), GATE score maths stays covered.
- `AGENTS.md`: replace the "frontend-only" rule with the D1-via-API and session-cookie rules.

## Build order
1. AI explain buttons (no dependencies, shipped first)
2. Connect Cloudflare, add secrets, migration 0002
3. Google login + sessions + header account menu
4. Sync and merge
5. Dashboard analytics
6. End-to-end check: log in, answer questions, take a mock, see the dashboard update
