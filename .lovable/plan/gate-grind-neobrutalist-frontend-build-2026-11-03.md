# GATE Grind — Neobrutalist Frontend Build

## Current state
- TanStack Start + Tailwind v4 + shadcn UI primitives, lucide icons. Only a placeholder home page exists.
- A D1 schema in `migrations/` and Python import scripts exist. They will stay as they are.
- KaTeX is not installed yet.

## Scope
This covers only the screens and how they look and behave. No real login, server code, database changes or API calls. All data comes from local demo files, organized so real data can replace it later. The login page is just the screen design.

## Design system
- Use the exact colour values from your brief, in light and dark versions, plus success, danger, warning and focus colours.
- Fonts: JetBrains Mono for body text and the interface, Inter Tight for headings, Jersey 10 for the logo, Caveat for handwritten notes. They load from Google Fonts in the page header.
- Shared styles: `neo-box`, `neo-box-sm`, `neo-btn`, `neo-btn-primary`, `neo-btn-ghost`, `neo-pill`, `neo-input`. They use hard offset shadows, square corners, a press effect when clicked and no gradients.
- A light/dark switch that is saved in the browser and doesn't flash the wrong theme on load.

## App shell
- Header with the logo, main menu (Home, Browse, PYQ, Papers, Mocks, Syllabus, Planner, Aptitude), search, theme switch and login.
- A slide-out menu on phones, plus a footer.

## Pages (each has its own address, title and description)
| Page | Contents |
|---|---|
| `/` | Main banner + study dashboard: overview cards, continue learning, daily target, weak areas, quick access, recent activity |
| `/browse` | Expandable cards for every GATE CSE subject, with topics, question counts, search and filters |
| `/pyq` | Previous-year questions by year, subject, type and difficulty, shown as a list |
| `/practice/$questionId` | Study mode: question with KaTeX maths and code blocks, MCQ/MSQ/NAT answers, Check/Next/Bookmark buttons, worked solution, question navigator, keyboard shortcuts |
| `/papers` and `/papers/$paperId` | List of year papers with filters, plus a detail and start screen for each paper |
| `/mocks` | Test categories and test cards, an instructions dialog |
| `/mocks/$testId/attempt` | GATE-style exam screen: timer, palette, mark-for-review, confirm before submitting |
| `/mocks/$testId/result` | Score, accuracy, subject breakdown, review of each question |
| `/syllabus` | Collapsible syllabus tree with progress tick-offs |
| `/planner` | Weekly plan, daily goals, weak-topic suggestions |
| `/aptitude` | Category tabs, concept cards, expanded concept view, daily practice, progress |
| `/search` | Search across everything with filters and grouped results |
| `/login` | Login screen design only, with a note that sign-in isn't connected yet |

Every list has loading, empty and error states. Progress, bookmarks and attempts are saved in the browser.

## Technical details
- Tokens and utilities go in `src/styles.css`. Tailwind/shadcn colours are mapped to the brief's tokens so existing UI parts pick up the theme.
- Demo data: `src/data/` (subjects, topics, questions, papers, mocks, aptitude, syllabus) with typed models in `src/lib/types.ts`.
- Shared components: `src/components/gg/` (AppShell, Header, MobileNav, ThemeToggle, Pill, QuestionCard, OptionSelector, NatInput, SolutionPanel, QuestionNavigator, Math, CodeBlock, EmptyState, ProgressBar).
- Local state: small hooks backed by browser storage (`useProgress`, `useBookmarks`, `useAttempts`, `useTheme`).
- Add the `katex` package.
- Record the frontend-only / demo-data rule in `AGENTS.md`.
- Update the existing routing test if needed and run it.

## Build order
1. Design system, fonts, theme switch, app shell
2. Demo data + shared components
3. Home, Browse, PYQ
4. Practice mode
5. Papers, Mocks (attempt + results)
6. Syllabus, Planner, Aptitude, Search, Login
7. Check phone/tablet layouts, accessibility, page titles, screenshots of both themes
