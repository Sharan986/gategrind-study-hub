import katex from "katex";
import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

function renderMath(tex: string, display: boolean) {
  try {
    return katex.renderToString(tex, { displayMode: display, throwOnError: false });
  } catch {
    return tex;
  }
}

function inline(text: string, keyBase: string): ReactNode[] {
  // split on $...$ first, then **bold** / *italic*
  const parts = text.split(/(\$[^$]+\$)/g);
  return parts.map((p, i) => {
    if (p.startsWith("$") && p.endsWith("$") && p.length > 2) {
      return <span key={`${keyBase}-${i}`} dangerouslySetInnerHTML={{ __html: renderMath(p.slice(1, -1), false) }} />;
    }
    const seg = p.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return (
      <Fragment key={`${keyBase}-${i}`}>
        {seg.map((s, j) =>
          s.startsWith("**") ? (
            <strong key={j} className="font-bold text-text-h">{s.slice(2, -2)}</strong>
          ) : s.startsWith("*") && s.length > 2 ? (
            <em key={j}>{s.slice(1, -1)}</em>
          ) : (
            s
          ),
        )}
      </Fragment>
    );
  });
}

/** Renders lightweight rich text: blank-line paragraphs, $$block$$ and $inline$ KaTeX, **bold**, *italic*. */
export function RichText({ text, className, as = "div" }: { text: string; className?: string; as?: "div" | "span" }) {
  if (as === "span") return <span className={className}>{inline(text, "s")}</span>;
  const blocks = text.split(/\n\n+/);
  return (
    <div className={cn("space-y-3", className)}>
      {blocks.map((b, i) => {
        const m = b.trim().match(/^\$\$([\s\S]+)\$\$$/);
        if (m) return <div key={i} className="overflow-x-auto py-1" dangerouslySetInnerHTML={{ __html: renderMath(m[1] ?? "", true) }} />;
        return <p key={i}>{inline(b, String(i))}</p>;
      })}
    </div>
  );
}

export function CodeBlock({ source, lang }: { source: string; lang: string }) {
  return (
    <div className="border border-border bg-subtle">
      <div className="flex items-center justify-between border-b border-border px-3 py-1">
        <span className="neo-label">{lang}</span>
        <button
          className="neo-label hover:text-text-h"
          onClick={() => navigator.clipboard?.writeText(source)}
          aria-label="Copy code"
        >
          copy
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[13px] leading-relaxed text-text-h">
        <code>
          {source.split("\n").map((l, i) => (
            <div key={i} className="flex">
              <span className="mr-4 w-6 shrink-0 select-none text-right text-muted-foreground">{i + 1}</span>
              <span className="whitespace-pre">{l}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
