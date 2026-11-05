"""Apply only reviewed, source-traceable option recoveries to the candidate set."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


PROJECT_DIR = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--candidate",
        type=Path,
        default=PROJECT_DIR / "seed" / "questions-glyph-candidate.json",
    )
    parser.add_argument(
        "--mapping",
        type=Path,
        default=PROJECT_DIR / "seed" / "option-mappings.v3.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=PROJECT_DIR / "seed" / "questions-recovered-candidate.json",
    )
    args = parser.parse_args()
    questions = json.loads(args.candidate.read_text(encoding="utf-8"))
    mappings: dict[str, dict[str, Any]] = json.loads(
        args.mapping.read_text(encoding="utf-8")
    )
    by_key = {
        f'{question["volume"]}:{question["code"]}': question for question in questions
    }
    for key, recovery in mappings.items():
        if key not in by_key:
            raise ValueError(f"Option mapping references unknown question {key}")
        if recovery.get("status") == "source-preserved":
            if not recovery.get("verifiedFrom") or not recovery.get("reviewedBy"):
                raise ValueError(f"{key}: source-preserved recovery lacks traceability")
            by_key[key]["optionRecovery"] = recovery
            continue
        if recovery.get("status") != "approved":
            continue
        options = recovery.get("options")
        verified_from = recovery.get("verifiedFrom")
        reviewer = recovery.get("reviewedBy")
        required_labels = {"A", "B", "C", "D"}
        if not isinstance(options, dict) or set(options) not in (required_labels, required_labels | {"E"}):
            raise ValueError(f"{key}: approved recovery must contain A-D and optionally E")
        if not verified_from or not reviewer:
            raise ValueError(f"{key}: approved recovery lacks source/reviewer metadata")
        answer = by_key[key].get("answer") or {}
        values = answer.get("value", [])
        if isinstance(values, str):
            values = [value.strip() for value in values.split(";")]
        if any(value not in options for value in values):
            raise ValueError(f"{key}: answer key does not reference recovered options")
        by_key[key]["options"] = options
        by_key[key]["optionRecovery"] = recovery
    args.output.write_text(
        json.dumps(list(by_key.values()), indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"output": str(args.output), "questions": len(by_key)}, indent=2))


if __name__ == "__main__":
    main()
