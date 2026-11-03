/**
 * GATE Grind - D1 to Frontend Shape Adapters
 * ==========================================
 * Converts Cloudflare D1 relational records into the frontend Question,
 * Subject, and Topic models defined in `src/lib/types.ts`.
 */

import type { Question, QuestionType, Difficulty, Option, Subject, Topic } from "@/lib/types";

export function toFrontendDifficulty(diff?: string | null): Difficulty {
  const d = (diff || "normal").toLowerCase();
  if (d === "easy") return "Easy";
  if (d === "hard" || d === "difficult") return "Hard";
  return "Medium";
}

export function toFrontendQuestion(d1Row: any): Question {
  const rawType = (d1Row.question_type || "MCQ").toUpperCase();
  const qType: QuestionType = rawType === "MSQ" ? "MSQ" : rawType === "NAT" ? "NAT" : "MCQ";

  // Parse options: { "A": "text", "B": "text" } -> [{ id: "A", text: "text" }, ...]
  let optionsObj: Record<string, string> = {};
  if (typeof d1Row.options === "string") {
    try {
      optionsObj = JSON.parse(d1Row.options);
    } catch {
      optionsObj = {};
    }
  } else if (d1Row.options && typeof d1Row.options === "object") {
    optionsObj = d1Row.options;
  }

  const optionsList: Option[] = Object.entries(optionsObj)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, text]) => ({ id, text }));

  // Parse answer: MCQ ["B"], MSQ ["A","C"], NAT { min, max }
  const rawAns = d1Row.correct_answer || "A";
  let answer: string[] | { min: number; max: number } = [rawAns];

  if (qType === "MSQ") {
    answer = rawAns.split(";").map((s: string) => s.trim().toUpperCase());
  } else if (qType === "NAT") {
    if (rawAns.includes(":")) {
      const parts = rawAns.split(":");
      answer = { min: parseFloat(parts[0].trim()) || 0, max: parseFloat(parts[1].trim()) || 0 };
    } else {
      const v = parseFloat(rawAns.trim()) || 0;
      answer = { min: v, max: v };
    }
  }

  const qNumber = parseInt(String(d1Row.gate_question_number || "").replace(/\D/g, ""), 10) || 1;
  const setNumber = d1Row.gate_set ? parseInt(String(d1Row.gate_set).replace(/\D/g, ""), 10) || undefined : undefined;
  const marks = Number(d1Row.marks) === 2.0 ? 2 : 1;

  return {
    id: d1Row.id || d1Row.external_code,
    subjectId: d1Row.subject_slug || d1Row.subject_id,
    topicId: d1Row.topic_slug || d1Row.topic_id,
    year: d1Row.gate_year || 2024,
    set: setNumber,
    number: qNumber,
    type: qType,
    marks,
    difficulty: toFrontendDifficulty(d1Row.difficulty),
    body: d1Row.question_html || "",
    options: optionsList.length > 0 ? optionsList : undefined,
    answer,
    solution: d1Row.explanation_html || "Official answer key verified from GATE official examination paper.",
    tags: typeof d1Row.tags === "string" ? d1Row.tags.split(",").filter(Boolean) : d1Row.tags || [],
  };
}

export function toFrontendSubject(d1Sub: any, topics: any[] = []): Subject {
  return {
    id: d1Sub.slug || d1Sub.id,
    code: d1Sub.code || (d1Sub.name ? d1Sub.name.slice(0, 4).toUpperCase() : "CS"),
    name: d1Sub.name,
    short: d1Sub.name.split(" ")[0] || d1Sub.name,
    description: d1Sub.description || `Comprehensive GATE previous year questions for ${d1Sub.name}.`,
    weightage: `${d1Sub.weightage_marks || 10}%`,
    topics: topics.map((t) => ({
      id: t.slug || t.id,
      name: t.name,
      questionCount: Number(t.total_questions) || 0,
    })),
  };
}
