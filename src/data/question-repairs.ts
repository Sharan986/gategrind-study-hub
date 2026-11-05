import type { Option, Question } from "@/lib/types";
import repairLedger from "../../seed/question-repairs.v1.json";

type Repair = {
  reviewStatus?: "approved" | "unresolved";
  bodyPatch?: string;
  bodyReplacements?: Array<{ from: string; to: string }>;
  optionPatch?: Record<string, string>;
  codePatch?: { lang: string; source: string };
};

/**
 * The JSON ledger is the sole production source for approved repairs. It keeps
 * source evidence beside every patch and prevents the app from silently
 * diverging from the audit/release pipeline.
 */
const repairs = Object.fromEntries(
  Object.entries(repairLedger as Record<string, Repair>).filter(
    ([key, repair]) => key !== "_schema" && repair.reviewStatus === "approved",
  ),
) as Record<string, Repair>;

const repairKeyForId = (id: string) => {
  const match = /^q_(vol\d+)_(\d+(?:_\d+)+)$/u.exec(id);
  return match && match[1] && match[2] ? `${match[1]}:${match[2].replace(/_/g, ".")}` : undefined;
};

export const mergeQuestionRepair = (question: Question): Question => {
  const key = repairKeyForId(question.id);
  const repair = key ? repairs[key] : undefined;
  if (!repair) return question;

  const options = repair.optionPatch
    ? Object.entries(repair.optionPatch).map(([id, text]) => ({ id, text }) satisfies Option)
    : question.options;

  const body =
    repair.bodyPatch ??
    repair.bodyReplacements?.reduce(
      (value, replacement) => value.replaceAll(replacement.from, replacement.to),
      question.body,
    );

  return {
    ...question,
    ...(body !== undefined ? { body } : {}),
    ...(options ? { options } : {}),
    ...(repair.codePatch ? { code: repair.codePatch } : {}),
  };
};
