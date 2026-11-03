import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/gg/AppShell";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — GATE Grind" },
      { name: "description", content: "Log in to GATE Grind to keep your GATE CSE progress on every device." },
      { property: "og:title", content: "Log in — GATE Grind" },
      { property: "og:description", content: "Keep your GATE preparation in sync." },
    ],
  }),
  component: Login,
});

// UI only — sign-in is not connected yet.
function Login() {
  const [note, setNote] = useState(false);
  return (
    <div className="mx-auto grid max-w-4xl items-center gap-10 py-6 md:grid-cols-2">
      <div className="hidden md:block">
        <div className="neo-label mb-3">Why sign in</div>
        <h1 className="text-4xl leading-tight">Your progress,<br />everywhere.</h1>
        <ul className="mt-6 space-y-3 text-sm">
          {["Keep solved questions and bookmarks on every device", "Get your mock results and analysis back later", "Get a weekly plan based on your weak topics"].map((t, i) => (
            <li key={t} className="flex gap-3"><span className="neo-pill">{String(i + 1).padStart(2, "0")}</span><span className="text-text-h">{t}</span></li>
          ))}
        </ul>
        <p className="mt-8 -rotate-1 font-hand text-2xl text-text-h">one question at a time.</p>
      </div>
      <div className="neo-box p-8">
        <Logo />
        <h2 className="mt-6 text-xl">Log in to continue</h2>
        <p className="mt-1 text-xs text-muted-foreground">Use your Google account. We only read your name and email.</p>
        <button className="neo-btn mt-6 w-full py-3" onClick={() => setNote(true)}>
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden><path fill="currentColor" d="M21.35 11.1H12v2.9h5.35c-.25 1.4-1.6 4.1-5.35 4.1-3.2 0-5.85-2.65-5.85-5.95S8.8 6.2 12 6.2c1.85 0 3.05.75 3.75 1.45l2.55-2.45C16.7 3.7 14.55 2.75 12 2.75 6.9 2.75 2.75 6.9 2.75 12S6.9 21.25 12 21.25c5.35 0 8.9-3.75 8.9-9.05 0-.6-.05-1.05-.15-1.1z" /></svg>
          Continue with Google
        </button>
        {note && (
          <p role="status" className="mt-3 border border-warning bg-warning-bg p-2 text-xs text-warning">Sign-in isn't connected yet. Your progress is saved on this device for now.</p>
        )}
        <p className="mt-6 text-[11px] text-muted-foreground">By continuing you agree to the terms and privacy policy.</p>
        <Link to="/" className="mt-4 inline-block text-xs underline underline-offset-4 hover:text-text-h">Continue without an account →</Link>
      </div>
    </div>
  );
}
