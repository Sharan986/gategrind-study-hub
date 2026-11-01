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

/**
 * Regex matching:
 * 1. Display math: $$...$$
 * 2. Escaped dollar: \$ (represented as literal $ in text)
 * 3. Inline math: $...$ where opening $ is not followed by whitespace or closing-bracket, and closing $ is not preceded by whitespace
 * 4. Bold: **...**
 * 5. Italic: *...*
 */
const INLINE_TOKEN_REGEX =
  /(\$\$(?:\\\$|[\s\S])+?\$\$|\\\$|(?<!\\)\$(?!\s|\$|[),\]}])(?:\\\$|[^$\n])+?(?<!\s|\\)\$(?!\$)|\*\*[^*]+\*\*|\*[^*]+\*)/g;

export function inline(text: string, keyBase: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  INLINE_TOKEN_REGEX.lastIndex = 0;

  while ((match = INLINE_TOKEN_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const raw = text.slice(lastIndex, match.index).replace(/\\\$/g, "$");
      parts.push(<Fragment key={`${keyBase}-${idx++}`}>{raw}</Fragment>);
    }
    const token = match[0];
    if (token.startsWith("$$") && token.endsWith("$$") && token.length >= 4) {
      parts.push(
        <span
          key={`${keyBase}-${idx++}`}
          className="my-1 block overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: renderMath(token.slice(2, -2), true) }}
        />,
      );
    } else if (token === "\\$") {
      parts.push(<Fragment key={`${keyBase}-${idx++}`}>$</Fragment>);
    } else if (token.startsWith("$") && token.endsWith("$") && token.length >= 2) {
      parts.push(
        <span
          key={`${keyBase}-${idx++}`}
          dangerouslySetInnerHTML={{ __html: renderMath(token.slice(1, -1), false) }}
        />,
      );
    } else if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={`${keyBase}-${idx++}`} className="font-bold text-text-h">
          {token.slice(2, -2).replace(/\\\$/g, "$")}
        </strong>,
      );
    } else if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
      parts.push(<em key={`${keyBase}-${idx++}`}>{token.slice(1, -1).replace(/\\\$/g, "$")}</em>);
    } else {
      parts.push(<Fragment key={`${keyBase}-${idx++}`}>{token.replace(/\\\$/g, "$")}</Fragment>);
    }
    lastIndex = INLINE_TOKEN_REGEX.lastIndex;
  }

  if (lastIndex < text.length) {
    const raw = text.slice(lastIndex).replace(/\\\$/g, "$");
    parts.push(<Fragment key={`${keyBase}-${idx++}`}>{raw}</Fragment>);
  }

  return parts;
}

/** Renders lightweight rich text: blank-line paragraphs, $$block$$ and $inline$ KaTeX, **bold**, *italic*. */
export function RichText({
  text,
  className,
  as = "div",
}: {
  text: string;
  className?: string;
  as?: "div" | "span";
}) {
  if (as === "span") return <span className={className}>{inline(text, "s")}</span>;
  const blocks = text.split(/\n\n+/);
  return (
    <div className={cn("space-y-3", className)}>
      {blocks.map((b, i) => {
        const trimmed = b.trim();
        const m = trimmed.match(/^\$\$([\s\S]+)\$\$$/);
        if (m) {
          return (
            <div
              key={i}
              className="overflow-x-auto py-1"
              dangerouslySetInnerHTML={{ __html: renderMath(m[1] ?? "", true) }}
            />
          );
        }
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
              <span className="mr-4 w-6 shrink-0 select-none text-right text-muted-foreground">
                {i + 1}
              </span>
              <span className="whitespace-pre">{l}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
