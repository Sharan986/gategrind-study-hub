import type { Question } from "@/lib/types";
import { subjectById, topicName } from "@/data/subjects";

export const MAX_PROMPT = 6000;

const plain = (s: string) => s.replace(/\$\$?/g, "").replace(/\*\*?/g, "").trim();

/** Builds a self-contained step-by-step explanation prompt for an external AI assistant. */
export function buildExplainPrompt(
  q: Question,
  userAnswer?: string[] | string,
  revealed?: boolean,
): string {
  const parts: string[] = [];
  parts.push(
    `You are an expert GATE CSE tutor. Explain the following GATE ${q.year}${q.set ? ` (Set ${q.set})` : ""} question step by step.`,
    `Subject: ${subjectById(q.subjectId)?.name ?? q.subjectId} — Topic: ${topicName(q.subjectId, q.topicId)}`,
    `Type: ${q.type} (${q.marks} mark${q.marks > 1 ? "s" : ""})`,
    "",
    "Question:",
    plain(q.body),
  );
  if (q.code) parts.push("", `Code (${q.code.lang}):`, q.code.source);
  if (q.options?.length) {
    parts.push("", "Options:");
    q.options.forEach((o) => parts.push(`(${o.id}) ${plain(o.text)}`));
  }
  const ua = Array.isArray(userAnswer) ? userAnswer.join(", ") : userAnswer;
  if (ua) parts.push("", `My answer: ${ua}`);
  if (revealed) {
    const ans = Array.isArray(q.answer)
      ? q.answer.join(", ")
      : q.answer.min === q.answer.max
        ? String(q.answer.min)
        : `${q.answer.min} to ${q.answer.max}`;
    parts.push(`Correct answer: ${ans}`);
  }
  parts.push(
    "",
    "Please: 1) state the key concept, 2) solve it step by step showing all working, 3) explain why each wrong option is wrong" +
      (ua ? ", 4) point out where my reasoning likely went wrong if my answer is incorrect" : "") +
      ", and finish with a one-line takeaway / shortcut for the exam.",
  );
  let text = parts.join("\n");
  if (text.length > MAX_PROMPT) text = text.slice(0, MAX_PROMPT - 1) + "…";
  return text;
}

export const chatgptUrl = (p: string) => `https://chatgpt.com/?q=${encodeURIComponent(p)}`;
export const claudeUrl = (p: string) => `https://claude.ai/new?q=${encodeURIComponent(p)}`;
