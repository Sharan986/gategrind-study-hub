import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/gg/AppShell";
import { afterSignIn, useAccount } from "@/lib/account-client";
import { signInWithGoogle } from "@/lib/account.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — GATE Grind" },
      { name: "description", content: "Log in to GATE Grind with Google to sync your GATE CSE progress across devices." },
      { property: "og:title", content: "Log in — GATE Grind" },
      { property: "og:description", content: "Keep your GATE preparation in sync." },
    ],
  }),
  component: Login,
});

interface GoogleId {
  accounts: { id: { initialize: (o: { client_id: string; callback: (r: { credential: string }) => void }) => void; renderButton: (el: HTMLElement, o: Record<string, unknown>) => void } };
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
        g.accounts.id.renderButton(btn.current, { theme: "outline", size: "large", shape: "rectangular", width: 300, text: "continue_with" });
      })
      .catch(() => setStatus("Couldn't load Google sign-in. Check your connection."));
    return () => {
      cancelled = true;
    };
  }, [account.configured, account.clientId, navigate]);

  return (
    <div className="mx-auto grid max-w-4xl items-center gap-10 py-6 md:grid-cols-2">
      <div className="hidden md:block">
        <div className="neo-label mb-3">Why sign in</div>
        <h1 className="text-4xl leading-tight">Your progress,<br />everywhere.</h1>
        <ul className="mt-6 space-y-3 text-sm">
          {["Keep solved questions and bookmarks on every device", "See detailed analytics of your preparation", "Progress on this device is merged in at your first login"].map((t, i) => (
            <li key={t} className="flex gap-3"><span className="neo-pill">{String(i + 1).padStart(2, "0")}</span><span className="text-text-h">{t}</span></li>
          ))}
        </ul>
        <p className="mt-8 -rotate-1 font-hand text-2xl text-text-h">one question at a time.</p>
      </div>
      <div className="neo-box p-8">
        <Logo />
        <h2 className="mt-6 text-xl">Log in to continue</h2>
        <p className="mt-1 text-xs text-muted-foreground">Use your Google account. We only read your name, email and photo.</p>
        <div className="mt-6 min-h-11">
          {!account.loaded ? (
            <div className="h-11 animate-pulse border border-border bg-subtle" aria-label="Loading" />
          ) : account.configured ? (
            <div ref={btn} />
          ) : (
            <p role="status" className="border border-warning bg-warning-bg p-3 text-xs text-warning">
              Sign-in isn't switched on yet. Your progress is saved on this device for now.
            </p>
          )}
        </div>
        {status && <p role="status" className="mt-3 text-xs text-text-h">{status}</p>}
        <p className="mt-6 text-[11px] text-muted-foreground">By continuing you agree to the terms and privacy policy.</p>
        <Link to="/dashboard" className="mt-4 inline-block text-xs underline underline-offset-4 hover:text-text-h">Continue without an account →</Link>
      </div>
    </div>
  );
}
