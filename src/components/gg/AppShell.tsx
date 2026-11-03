import { Link, useNavigate } from "@tanstack/react-router";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { loadAccount, signOutAccount, useAccount } from "@/lib/account-client";
import { Menu, Moon, Search, Sun, X } from "lucide-react";
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
] as const;

export function Logo() {
  return (
    <Link to="/" className="flex items-baseline gap-1 font-brand text-[28px] leading-none text-text-h" aria-label="GATE Grind home">
      GATE<span className="border border-border bg-primary px-1 text-primary-foreground">GRIND</span>
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
    <button onClick={flip} className="neo-btn px-2" aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}>
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

const navCls = "px-2.5 py-1.5 text-[13px] text-muted-foreground hover:text-text-h border border-transparent";
const activeCls = "!text-text-h !border-border bg-surface shadow-[2px_2px_0_var(--border)]";

function AccountButton() {
  const { user } = useAccount();
  const navigate = useNavigate();
  useEffect(() => void loadAccount(), []);
  if (!user) return <Link to="/login" className="neo-btn neo-btn-primary hidden sm:inline-flex">Log in</Link>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="neo-btn px-1.5" aria-label="Account menu">
        {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-6" referrerPolicy="no-referrer" /> : <span className="px-1 text-xs">{user.name.slice(0, 1)}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-none border-border shadow-[3px_3px_0_var(--border)]">
        <DropdownMenuLabel className="text-xs">{user.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void navigate({ to: "/dashboard" })}>Dashboard</DropdownMenuItem>
        <DropdownMenuItem onSelect={async () => { await signOutAccount(); void navigate({ to: "/login", replace: true }); }}>Log out</DropdownMenuItem>
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
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Logo />
        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={navCls} activeProps={{ className: activeCls }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/search" className="neo-btn hidden px-2.5 md:inline-flex" aria-label="Search">
            <Search className="size-4" />
            <span className="text-muted-foreground">Search</span>
            <kbd className="neo-pill ml-2 px-1">/</kbd>
          </Link>
          <ThemeToggle />
          <AccountButton />
          <button className="neo-btn px-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-4" />
          </button>
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-foreground/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-72 flex-col border-l border-border bg-background p-4">
            <div className="mb-6 flex items-center justify-between">
              <Logo />
              <button className="neo-btn px-2" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="size-4" />
              </button>
            </div>
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {[{ to: "/", label: "Home" }, ...NAV, { to: "/search", label: "Search" }].map((n) => (
                <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="border border-transparent px-3 py-2 text-sm text-text-h hover:border-border" activeProps={{ className: "!border-border bg-subtle" }} activeOptions={{ exact: n.to === "/" }}>
                  {n.label}
                </Link>
              ))}
            </nav>
            <Link to="/dashboard" onClick={() => setOpen(false)} className="neo-btn neo-btn-primary mt-auto">Dashboard</Link>
          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-xs md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-muted-foreground">A focused place to prepare for GATE CSE: previous-year questions, papers, mocks and the syllabus, without distractions.</p>
          <p className="mt-2 font-hand text-lg text-text-h">grind daily, not occasionally.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="neo-label mb-1">Practice</div>
          <Link to="/pyq" className="hover:text-text-h">Previous year questions</Link>
          <Link to="/papers" className="hover:text-text-h">Papers</Link>
          <Link to="/mocks" className="hover:text-text-h">Mock tests</Link>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="neo-label mb-1">Plan</div>
          <Link to="/syllabus" className="hover:text-text-h">Syllabus</Link>
          <Link to="/planner" className="hover:text-text-h">Planner</Link>
          <Link to="/aptitude" className="hover:text-text-h">Aptitude</Link>
        </div>
      </div>
    </footer>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2">Skip to content</a>
      <Header />
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</main>
      <Footer />
    </div>
  );
}
