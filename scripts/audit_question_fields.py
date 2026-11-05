"""Audit question completeness at field level without changing the source dataset."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


PROJECT_DIR = Path(__file__).resolve().parents[1]


def key_for(question: dict[str, Any]) -> str:
    return f'{question["volume"]}:{question["code"]}'


def body_status(
    question: dict[str, Any],
    candidate: dict[str, Any] | None,
    repair: dict[str, Any] | None,
) -> str:
    if repair and (repair.get("bodyPatch") or repair.get("bodyReplacements")):
        return "complete"
    body = str(question.get("body", ""))
    if any(marker.lower() in body.lower() for marker in ("practice test:", "answer key", "gate overflow")):
        return "page-furniture"
    if candidate and candidate.get("glyphRecovery", {}).get("needsReview"):
        return "missing-glyphs"
    return "complete"


def option_status(question: dict[str, Any], repair: dict[str, Any] | None) -> str:
    if repair and repair.get("optionPatch"):
        return "complete"
    if question.get("question_type") not in {"MCQ", "MSQ"}:
        return "complete"
    options = question.get("options") or {}
    if not options:
        answer_value = (question.get("answer") or {}).get("value")
        if isinstance(answer_value, list) or answer_value in {"A", "B", "C", "D", "E"}:
            return "missing"
        return "complete"
    if set(options) not in ({"A", "B", "C", "D"}, {"A", "B", "C", "D", "E"}):
        return "merged"
    if any(not str(value).strip() or str(value).strip() in {"A.", "B.", "C.", "D."} for value in options.values()):
        return "missing"
    answer = question.get("answer") or {}
    values = answer.get("value", [])
    if isinstance(values, str):
        values = [value.strip() for value in values.split(";")]
    if any(value not in options for value in values):
        return "order-ambiguous"
    return "complete"


def code_status(
    question: dict[str, Any],
    candidate: dict[str, Any] | None,
    repair: dict[str, Any] | None,
) -> str:
    if candidate and candidate.get("code") or repair and repair.get("codePatch"):
        return "complete"
    body = str(question.get("body", "")).lower()
    if any(marker in body for marker in ("#include", "void ", "int main", "function f(")):
        return "formatting-only"
    return "missing"


def body_gap_kind(question: dict[str, Any], candidate: dict[str, Any] | None) -> str:
    if not candidate or not candidate.get("glyphRecovery", {}).get("needsReview"):
        return "none"
    body = str(question.get("body", "")).lower()
    visual_markers = (
        "figure",
        "diagram",
        "circuit",
        "graph",
        "shown below",
        "shown in the figure",
        "image",
    )
    if question.get("has_image") or any(marker in body for marker in visual_markers):
        return "visual-asset"
    return "semantic-text-or-math"


def audit(
    question: dict[str, Any],
    candidate: dict[str, Any] | None,
    repair: dict[str, Any] | None,
) -> dict[str, Any]:
    # Production applies only source-approved ledger entries. Keeping this gate
    # here prevents a queued draft from being reported as a completed field.
    repair = repair if repair and repair.get("reviewStatus") == "approved" else None
    diagram = "required asset" if question.get("has_image") else "none"
    body = body_status(question, candidate, repair)
    options = option_status(question, repair)
    code = code_status(question, candidate, repair)
    return {
        "key": key_for(question),
        "volume": question["volume"],
        "questionCode": question["code"],
        "page": question["page"],
        "body": body,
        "bodyGapKind": body_gap_kind(question, candidate),
        "options": options,
        "code": code,
        "diagram": diagram,
        "repairRequired": body != "complete"
        or options != "complete"
        or code == "missing"
        or diagram != "none",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=PROJECT_DIR / "seed" / "question-field-audit.v1.json",
    )
    args = parser.parse_args()
    candidate_by_key: dict[str, dict[str, Any]] = {}
    candidate_path = PROJECT_DIR / "seed" / "questions-recovered-candidate.json"
    if candidate_path.exists():
        candidate_by_key = {
            f'{item["volume"]}:{item["code"]}': item
            for item in json.loads(candidate_path.read_text(encoding="utf-8"))
        }
    repairs_path = PROJECT_DIR / "seed" / "question-repairs.v1.json"
    repairs = (
        json.loads(repairs_path.read_text(encoding="utf-8"))
        if repairs_path.exists()
        else {}
    )
    entries = []
    for volume in ("vol1", "vol2", "vol3"):
        source = PROJECT_DIR / "seed" / f"questions_{volume}.jsonl"
        with source.open(encoding="utf-8") as handle:
            entries.extend(
                (
                    lambda question: audit(
                        question,
                        candidate_by_key.get(key_for(question)),
                        repairs.get(key_for(question)),
                    )
                )(json.loads(line))
                for line in handle
                if line.strip()
            )
    payload = {
        "version": 1,
        "generatedBy": "audit_question_fields.py",
        "entries": entries,
    }
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(args.output), "entries": len(entries)}, indent=2))


if __name__ == "__main__":
    main()
