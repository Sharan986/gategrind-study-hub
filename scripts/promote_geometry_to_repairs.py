"""Promote only complete, answer-key-consistent PDF geometry recoveries."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--queue", type=Path, default=PROJECT_DIR / "seed" / "option-recovery-queue.json")
    parser.add_argument("--ledger", type=Path, default=PROJECT_DIR / "seed" / "question-repairs.v1.json")
    args = parser.parse_args()
    queue = json.loads(args.queue.read_text(encoding="utf-8"))
    ledger = json.loads(args.ledger.read_text(encoding="utf-8"))
    promoted = 0
    skipped = 0
    for entry in queue["entries"]:
        if entry.get("status") == "visual-preserved":
            continue
        options = entry.get("geometryOptions") or {}
        if set(options) != {"A", "B", "C", "D"} or any(not str(value).strip() for value in options.values()):
            continue
        answer = entry.get("answer") or {}
        values = answer.get("value", [])
        if isinstance(values, str):
            values = [value.strip() for value in values.split(";")]
        if any(value not in options for value in values):
            continue
        key = f'{entry["volume"]}:{entry["code"]}'
        existing = ledger.get(key)
        if existing and existing.get("reviewStatus") == "approved":
            skipped += 1
            continue
        ledger[key] = {
            "reviewStatus": "approved",
            "optionPatch": options,
            "verifiedFrom": f'{entry["volume"]}:{entry["page"]}:{entry["code"]}',
            "contextEvidence": entry.get("pageCrop"),
            "reviewedBy": "pdf-word-geometry-answer-key-consistent",
        }
        promoted += 1
    args.ledger.write_text(json.dumps(ledger, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"promoted": promoted, "alreadyApproved": skipped}, indent=2))


if __name__ == "__main__":
    main()
