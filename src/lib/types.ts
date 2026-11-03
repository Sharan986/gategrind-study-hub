// Shared frontend models. Shapes mirror the D1 schema loosely so real API data can replace demo data later.
export type QuestionType = "MCQ" | "MSQ" | "NAT";
export type Difficulty = "Easy" | "Medium" | "Hard";

export interface Topic {
  id: string;
  name: string;
  questionCount: number;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  short: string;
  description: string;
  weightage: string;
  topics: Topic[];
  slug?: string;
}

export interface Option {
  id: string; // "A" | "B" | ...
  text: string; // may contain $...$ math
}

export interface Question {
  id: string;
  subjectId: string;
  topicId: string;
  year: number;
  set?: number;
  number: number;
  type: QuestionType;
  marks: 1 | 2;
  difficulty: Difficulty;
  /** Rich text: paragraphs separated by blank lines, $...$ inline / $$...$$ block math. */
  body: string;
  code?: { lang: string; source: string };
  options?: Option[];
  /** MCQ: ["B"], MSQ: ["A","C"], NAT: range */
  answer: string[] | { min: number; max: number };
  solution: string;
  tags?: string[];
}

export interface Paper {
  id: string;
  year: number;
  set?: number;
  title: string;
  questionIds: string[];
  durationMin: number;
  totalMarks: number;
}

export interface MockTest {
  id: string;
  title: string;
  category: "Full Length" | "Subject" | "Topic" | "Aptitude";
  description: string;
  durationMin: number;
  questionIds: string[];
  difficulty: Difficulty;
}

export interface SyllabusUnit {
  subjectId: string;
  sections: { title: string; items: string[] }[];
}

export interface AptitudeConcept {
  id: string;
  category: "Verbal" | "Quantitative" | "Analytical" | "Spatial";
  title: string;
  summary: string;
  keyPoints: string[];
  formula?: string;
  questionIds: string[];
}
