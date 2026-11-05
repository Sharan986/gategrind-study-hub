import type { Question, SourcePaper } from "@/lib/types";

export const sourcePaperName = (paper: SourcePaper | undefined) =>
  paper === "unclassified" || !paper
    ? "Paper unverified"
    : paper === "ST"
      ? "Statistics"
      : paper === "PRACTICE"
        ? "CS practice"
        : paper === "UGCNET"
          ? "UGC NET"
          : paper === "DS&AI SAMPLE"
            ? "DS&AI sample paper"
            : paper;

export const questionOriginLabel = (question: Question) =>
  !question.sourcePaper || question.sourcePaper === "unclassified"
    ? `GATE ${question.year} · paper unverified`
    : question.sourcePaper === "PRACTICE"
      ? "CS practice question"
      : question.sourcePaper === "UGCNET"
        ? "UGC NET question"
        : question.sourcePaper === "DS&AI SAMPLE"
          ? `GATE DS&AI sample paper ${question.year}`
          : `GATE ${sourcePaperName(question.sourcePaper)} ${question.year}`;
