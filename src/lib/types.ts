// Shared frontend models. Shapes mirror the D1 schema loosely so real API data can replace demo data later.
export type QuestionType = "MCQ" | "MSQ" | "NAT" | "DESCRIPTIVE";
export type Difficulty = "Easy" | "Medium" | "Hard";
export type SourcePaper =
  | "CSE"
  | "IT"
  | "DA"
  | "DS&AI"
  | "DS&AI SAMPLE"
  | "AE"
  | "AG"
  | "MN"
  | "CE"
  | "GG"
  | "AR"
  | "CY"
  | "TF"
  | "EE"
  | "ME"
  | "ST"
  | "PRACTICE"
  | "UGCNET"
  | "unclassified";

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
  sourcePaper?: SourcePaper | undefined;
  sourceUrl?: string | undefined;
  quality?: { status: "structurally-complete" | "needs-review"; issues: string[] } | undefined;
}

export interface Paper {
  id: string;
  year: number;
  set?: number;
  title: string;
  sourcePaper?: SourcePaper;
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
