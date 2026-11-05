"""Export the current release blockers with source-linked evidence."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


PROJECT_DIR = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--report",
        type=Path,
        default=PROJECT_DIR / "seed" / "glyph-fidelity-report.json",
    )
    parser.add_argument(
        "--candidate",
        type=Path,
        default=PROJECT_DIR / "seed" / "questions-recovered-candidate.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=PROJECT_DIR / "seed" / "release-blocker-queue.json",
    )
    args = parser.parse_args()
    report: dict[str, Any] = json.loads(args.report.read_text(encoding="utf-8"))
    questions = json.loads(args.candidate.read_text(encoding="utf-8"))
    option_queue_path = PROJECT_DIR / "seed" / "option-recovery-queue.json"
    option_queue = {}
    if option_queue_path.exists():
        option_queue = {
            f'{entry["volume"]}:{entry["code"]}': entry
            for entry in json.loads(option_queue_path.read_text(encoding="utf-8"))[
                "entries"
            ]
        }
    by_key = {
        f'{question["volume"]}:{question["code"]}': question for question in questions
    }
    entries = []
    for key, errors in (
        (key, value)
        for key, value in _errors_by_key(report.get("errors", [])).items()
    ):
        question = by_key.get(key)
        if question is None:
            continue
        categories = []
        if any("answer references" in error for error in errors):
            categories.append("answer-key-option-mismatch")
        if any("no options" in error for error in errors):
            categories.append("missing-option-structure")
        if any("page-furniture" in error for error in errors):
            categories.append("page-furniture")
        if not categories:
            categories.append("other")
        option_recovery = question.get("optionRecovery", {})
        queued_option = option_queue.get(key, {})
        entries.append(
            {
                "key": key,
                "volume": question["volume"],
                "code": question["code"],
                "page": question["page"],
                "questionType": question.get("question_type"),
                "categories": categories,
                "errors": errors,
                "answer": question.get("answer"),
                "options": question.get("options", {}),
                "sourceCrop": (
                    option_recovery.get("sourceCrop")
                    or queued_option.get("pageCrop")
                ),
                "glyphNeedsReview": len(
                    question.get("glyphRecovery", {}).get("needsReview", [])
                ),
                "status": "needsReview",
            }
        )
    entries.sort(
        key=lambda entry: (
            "answer-key-option-mismatch" not in entry["categories"],
            entry["volume"],
            entry["page"],
            entry["code"],
        )
    )
    payload = {
        "version": 1,
        "generatedBy": "build_release_blocker_queue.py",
        "entryCount": len(entries),
        "entries": entries,
    }
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(args.output), "entries": len(entries)}, indent=2))


def _errors_by_key(errors: list[str]) -> dict[str, list[str]]:
    grouped: dict[str, list[str]] = {}
    for error in errors:
        key, separator, message = error.partition(": ")
        if not separator or ":" not in key:
            continue
        grouped.setdefault(key, []).append(message)
    return grouped


if __name__ == "__main__":
    main()
