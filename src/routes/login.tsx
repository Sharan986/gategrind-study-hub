import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/gg/AppShell";
import { afterSignIn, useAccount } from "@/lib/account-client";
import { signInWithGoogle } from "@/lib/account.functions";
import { ShieldCheck, Cloud, Laptop, Sparkles } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — GATE Grind" },
      {
        name: "description",
        content: "Log in to GATE Grind with Google to sync your GATE CSE progress across devices.",
      },
      { property: "og:title", content: "Log in — GATE Grind" },
      { property: "og:description", content: "Keep your GATE preparation in sync." },
    ],
  }),
  component: Login,
});

interface GoogleId {
  accounts: {
    id: {
      initialize: (o: { client_id: string; callback: (r: { credential: string }) => void }) => void;
      renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
    };
  };
}

function loadGis(): Promise<GoogleId> {
  const w = window as unknown as { google?: GoogleId };
  if (w.google?.accounts) return Promise.resolve(w.google);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => (w.google ? resolve(w.google) : reject(new Error("Google failed to load")));
    s.onerror = () => reject(new Error("Google failed to load"));
    document.head.appendChild(s);
  });
}

function Login() {
  const account = useAccount();
  const navigate = useNavigate();
  const btn = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (account.user) void navigate({ to: "/dashboard", replace: true });
  }, [account.user, navigate]);

  useEffect(() => {
    if (!account.configured || !account.clientId || !btn.current) return;
    let cancelled = false;
    loadGis()
      .then((g) => {
        if (cancelled || !btn.current) return;
        g.accounts.id.initialize({
          client_id: account.clientId!,
          callback: async ({ credential }) => {
            setStatus("Signing you in…");
            try {
              const user = await signInWithGoogle({ data: { idToken: credential } });
              setStatus("Syncing your progress…");
              await afterSignIn(user);
              void navigate({ to: "/dashboard" });
            } catch (e) {
              console.error(e);
              setStatus("Sign-in failed. Please try again.");
            }
          },
        });
        g.accounts.id.renderButton(btn.current, {
          theme: "outline",
          size: "large",
          shape: "rectangular",
          width: 300,
          text: "continue_with",
        });
      })
      .catch(() => setStatus("Couldn't load Google sign-in. Check your connection."));
    return () => {
      cancelled = true;
    };
  }, [account.configured, account.clientId, navigate]);

  return (
    <div className="mx-auto grid max-w-4xl items-center gap-10 py-10 md:grid-cols-2">
      <div className="hidden md:block">
        <span className="neo-sticker bg-neo-yellow text-black rotate-[-1deg] text-[10.5px] font-black mb-3 inline-block">
          SEAMLESS SYNC
        </span>
        <h1 className="text-4xl font-black leading-tight tracking-tight">
          Your preparation,
          <br />
          <span className="inline-block border-2 border-border bg-neo-pink px-2.5 py-0.5 text-white shadow-[4px_4px_0_var(--border)] rotate-[-1deg] mt-1">
            everywhere.
          </span>
        </h1>
        <ul className="mt-8 space-y-4 text-sm font-semibold">
          {[
            {
              title: "Cross-Device Sync",
              desc: "Solve questions on your laptop, review bookmarks on your phone.",
              icon: Laptop,
            },
            {
              title: "Comprehensive Analytics",
              desc: "Track subject accuracy, consistency streaks, and mock scorecards.",
              icon: Sparkles,
            },
            {
              title: "Zero Progress Loss",
              desc: "Existing offline work merges cleanly into your account on first login.",
              icon: ShieldCheck,
            },
          ].map(({ title, desc, icon: Icon }, i) => (
            <li
              key={title}
              className="flex items-start gap-3 border-2 border-border p-3.5 bg-surface shadow-[3px_3px_0_var(--border)]"
            >
              <div className="size-8 shrink-0 bg-neo-yellow border-2 border-border flex items-center justify-center font-black text-black">
                {i + 1}
              </div>
              <div>
                <div className="text-sm font-black text-text-h">{title}</div>
                <div className="text-xs text-muted-foreground font-medium mt-0.5">{desc}</div>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-7 inline-block border-2 border-border bg-amber-50 dark:bg-amber-950/40 p-2.5 shadow-[3px_3px_0_var(--border)] rotate-1">
          <p className="font-hand text-xl font-bold text-text-h">
            "grind daily, not occasionally."
          </p>
        </div>
      </div>
      <div className="neo-box border-2 border-border bg-surface p-8 shadow-[6px_6px_0_var(--border)]">
        <Logo />
        <h2 className="mt-6 text-2xl font-black tracking-tight">Log in to GATE Grind</h2>
        <p className="mt-1.5 text-xs text-muted-foreground font-medium leading-relaxed">
          Sign in with your Google account to sync your test scores and question bookmarks across
          devices.
        </p>
        <div className="mt-7 min-h-12">
          {!account.loaded ? (
            <div
              className="h-12 animate-pulse border-2 border-border bg-subtle"
              aria-label="Loading"
            />
          ) : account.configured ? (
            <div ref={btn} />
          ) : (
            <p
              role="status"
              className="border-2 border-warning bg-warning-bg p-3.5 text-xs font-bold text-warning shadow-[2px_2px_0_var(--warning)]"
            >
              Sign-in is running in local-first demo mode. Your progress is saved safely on this
              device.
            </p>
          )}
        </div>
        {status && (
          <p role="status" className="mt-3.5 text-xs font-bold text-text-h">
            {status}
          </p>
        )}
        <p className="mt-7 text-[11px] text-muted-foreground font-medium">
          By continuing you agree to the terms of service and preparation guidelines.
        </p>
        <Link
          to="/dashboard"
          className="mt-4 inline-block text-xs font-black underline underline-offset-4 text-text-h hover:text-neo-pink"
        >
          Continue to Dashboard without account →
        </Link>
      </div>
    </div>
  );
}
