"""Apply only explicitly approved, source-traceable glyph field reviews."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


PROJECT_DIR = Path(__file__).resolve().parents[1]


def load_baseline() -> dict[str, dict[str, Any]]:
    questions: dict[str, dict[str, Any]] = {}
    for volume in ("vol1", "vol2", "vol3"):
        path = PROJECT_DIR / "seed" / f"questions_{volume}.jsonl"
        with path.open(encoding="utf-8") as handle:
            for line in handle:
                if line.strip():
                    question = json.loads(line)
                    questions[f'{volume}:{question["code"]}'] = question
    return questions


def field_value(question: dict[str, Any], field: str) -> str:
    if field == "body":
        return str(question.get("body", ""))
    if field.startswith("option:"):
        return str((question.get("options") or {}).get(field.split(":", 1)[1], ""))
    raise ValueError(f"Unsupported review field: {field}")


def validate_review(
    entry: dict[str, Any], questions: dict[str, dict[str, Any]]
) -> tuple[str, str] | None:
    if entry.get("status") != "approved":
        return None
    replacement = entry.get("replacement")
    if not isinstance(replacement, str) or not replacement.strip():
        raise ValueError(f'{entry["id"]}: approved replacement is empty')
    if not entry.get("reviewEvidence") or not entry.get("reviewedBy"):
        raise ValueError(f'{entry["id"]}: approval lacks review evidence or reviewer')
    source = entry.get("source") or {}
    key = source.get("key")
    question = questions.get(key)
    if not question:
        raise ValueError(f'{entry["id"]}: baseline question {key!r} is missing')
    field = entry.get("field")
    current = field_value(question, field)
    baseline_span = entry.get("baselineSpan")
    if not baseline_span or current.count(baseline_span) != 1:
        raise ValueError(
            f'{entry["id"]}: baseline span is not unique in {key}:{field}'
        )
    return key, field


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--ledger",
        type=Path,
        default=PROJECT_DIR / "seed" / "glyph-field-review-ledger.v1.json",
    )
    parser.add_argument(
        "--repairs",
        type=Path,
        default=PROJECT_DIR / "seed" / "question-repairs.v1.json",
    )
    args = parser.parse_args()

    ledger = json.loads(args.ledger.read_text(encoding="utf-8"))
    repairs: dict[str, dict[str, Any]] = json.loads(
        args.repairs.read_text(encoding="utf-8")
    )
    questions = load_baseline()
    applied = 0
    for entry in ledger["entries"]:
        result = validate_review(entry, questions)
        if result is None:
            continue
        key, field = result
        repair = repairs.setdefault(key, {})
        replacement = {
            "from": entry["baselineSpan"],
            "to": entry["replacement"],
            "verifiedFrom": entry["source"]["verifiedFrom"],
            "reviewEvidence": entry["reviewEvidence"],
            "reviewedBy": entry["reviewedBy"],
            "asset": entry["source"]["asset"],
        }
        if field == "body":
            target = repair.setdefault("bodyReplacements", [])
        elif field.startswith("option:"):
            option_id = field.split(":", 1)[1]
            target = repair.setdefault("optionReplacements", {}).setdefault(
                option_id, []
            )
        else:
            raise ValueError(f"{entry['id']}: unsupported field {field!r}")
        if replacement not in target:
            target.append(replacement)
            applied += 1
        repair["reviewStatus"] = "approved"
        repair["reviewedBy"] = "glyph-field-review-ledger"
    args.repairs.write_text(json.dumps(repairs, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "ledgerEntries": len(ledger["entries"]),
        "approvedReviewsApplied": applied,
        "pendingReviews": sum(
            entry.get("status") != "approved" for entry in ledger["entries"]
        ),
    }, indent=2))


if __name__ == "__main__":
    main()
