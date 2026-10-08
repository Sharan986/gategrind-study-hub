import { Link, useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { loadAccount, signOutAccount, useAccount } from "@/lib/account-client";
import { Menu, Moon, Search, Sun, X, Sparkles } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/browse", label: "Browse" },
  { to: "/pyq", label: "PYQ" },
  { to: "/papers", label: "Papers" },
  { to: "/mocks", label: "Mocks" },
  { to: "/syllabus", label: "Syllabus" },
  { to: "/planner", label: "Planner" },
  { to: "/aptitude", label: "Aptitude" },
  { to: "/verify", label: "Verify" },
] as const;

export function Logo() {
  return (
    <Link
      to="/"
      className="flex items-center gap-1 font-brand text-[30px] leading-none text-text-h transition-transform hover:scale-[1.02]"
      aria-label="GATE Grind home"
    >
      <span className="font-bold tracking-tight">GATE</span>
      <span className="ml-1 inline-block rotate-[-1.5deg] border-2 border-border bg-neo-yellow px-1.5 py-0.5 font-brand text-[24px] font-bold text-black shadow-[2px_2px_0_var(--border)]">
        GRIND
      </span>
    </Link>
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const flip = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("gg:theme", next ? "dark" : "light");
    setDark(next);
  };
  return (
    <button
      onClick={flip}
      className="neo-btn px-2.5 hover:bg-neo-yellow/30"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {dark ? <Sun className="size-4 text-neo-yellow" /> : <Moon className="size-4 text-black" />}
    </button>
  );
}

const navCls =
  "px-2.5 py-1.5 text-[13px] font-bold text-muted-foreground hover:text-text-h border-2 border-transparent transition-all";
const activeCls =
  "!text-black !border-border bg-neo-yellow shadow-[2px_2px_0_var(--border)] font-bold";

function AccountButton() {
  const { user } = useAccount();
  const navigate = useNavigate();
  useEffect(() => void loadAccount(), []);
  if (!user)
    return (
      <Link to="/login" className="neo-btn neo-btn-primary hidden sm:inline-flex">
        Log in
      </Link>
    );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="neo-btn px-1.5 bg-neo-pink text-white hover:bg-neo-pink/90"
        aria-label="Account menu"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="size-6 border border-border"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="px-1 text-xs font-bold">{user.name.slice(0, 1)}</span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="rounded-none border-2 border-border shadow-[4px_4px_0_var(--border)] bg-surface"
      >
        <DropdownMenuLabel className="text-xs font-bold">{user.name}</DropdownMenuLabel>
        <DropdownMenuSeparator className="border-border" />
        <DropdownMenuItem onSelect={() => void navigate({ to: "/dashboard" })}>
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={async () => {
            await signOutAccount();
            void navigate({ to: "/login", replace: true });
          }}
        >
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target as HTMLElement).closest("input,textarea")) {
        e.preventDefault();
        navigate({ to: "/search" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <header className="sticky top-0 z-40 border-b-2 border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Logo />
        <nav className="ml-4 hidden items-center gap-1.5 lg:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={navCls} activeProps={{ className: activeCls }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/search"
            className="neo-btn hidden px-2.5 md:inline-flex hover:bg-neo-cyan/20"
            aria-label="Search"
          >
            <Search className="size-4" />
            <span className="text-muted-foreground font-medium">Search</span>
            <kbd className="neo-pill ml-2 px-1.5 bg-neo-yellow text-black border-border shadow-[1px_1px_0_var(--border)] font-bold">
              /
            </kbd>
          </Link>
          <ThemeToggle />
          <AccountButton />
          <button
            className="neo-btn px-2 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </button>
        </div>
      </div>
      {open && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <button
            className="absolute inset-0 bg-foreground/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-72 flex-col border-l-2 border-border bg-background p-5 shadow-[-4px_0_0_var(--border)]">
            <div className="mb-6 flex items-center justify-between">
              <Logo />
              <button
                className="neo-btn px-2"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <X className="size-4" />
              </button>
            </div>
            <nav className="flex flex-col gap-1.5" aria-label="Mobile">
              {[{ to: "/", label: "Home" }, ...NAV, { to: "/search", label: "Search" }].map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="border-2 border-transparent px-3 py-2 text-sm font-bold text-text-h hover:border-border hover:bg-subtle"
                  activeProps={{
                    className:
                      "!border-border !bg-neo-yellow !text-black shadow-[2px_2px_0_var(--border)]",
                  }}
                  activeOptions={{ exact: n.to === "/" }}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <Link
              to="/dashboard"
              onClick={() => setOpen(false)}
              className="neo-btn neo-btn-primary mt-auto font-bold"
            >
              Dashboard
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t-2 border-border bg-surface">
      <div className="neo-tape" />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 text-xs md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3.5 max-w-sm text-muted-foreground font-medium leading-relaxed">
            The hyper-focused, distraction-free GATE CSE preparation desk. 3,823 authentic
            questions, chapter-wise PYQs, full papers, and timed mock tests.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="neo-sticker bg-neo-yellow text-black rotate-[-1deg] text-[10px]">
              ★ 3,823 PYQs
            </span>
            <span className="neo-sticker bg-neo-cyan text-black rotate-[1deg] text-[10px]">
              ⚡ Timed Mocks
            </span>
            <span className="neo-sticker bg-neo-green text-black rotate-[-1deg] text-[10px]">
              ✓ Free & Open
            </span>
          </div>
          <div className="mt-5 inline-block border-2 border-border bg-amber-50 dark:bg-amber-950/40 p-2.5 shadow-[3px_3px_0_var(--border)] rotate-1">
            <p className="font-hand text-xl font-bold text-text-h">
              "grind daily, not occasionally."
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="neo-label mb-1 text-[11px] font-black">Practice</div>
          <Link
            to="/pyq"
            className="font-bold hover:text-neo-pink hover:underline underline-offset-4"
          >
            Previous year questions
          </Link>
          <Link
            to="/papers"
            className="font-bold hover:text-neo-pink hover:underline underline-offset-4"
          >
            Past Papers
          </Link>
          <Link
            to="/mocks"
            className="font-bold hover:text-neo-pink hover:underline underline-offset-4"
          >
            Mock tests
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          <div className="neo-label mb-1 text-[11px] font-black">Plan & Prep</div>
          <Link
            to="/syllabus"
            className="font-bold hover:text-neo-cyan hover:underline underline-offset-4"
          >
            Syllabus Tracker
          </Link>
          <Link
            to="/planner"
            className="font-bold hover:text-neo-cyan hover:underline underline-offset-4"
          >
            Study Planner
          </Link>
          <Link
            to="/aptitude"
            className="font-bold hover:text-neo-cyan hover:underline underline-offset-4"
          >
            General Aptitude
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2">
        Skip to content
      </a>
      <Header />
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
