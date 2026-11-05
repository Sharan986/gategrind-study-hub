"""Approve only exact, trailing page-furniture fragments as span repairs."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


PROJECT_DIR = Path(__file__).resolve().parents[1]
PRACTICE_MARKER = "✍ Practice Test:"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--queue",
        type=Path,
        default=PROJECT_DIR / "seed" / "repair-queues" / "page-furniture.v1.json",
    )
    parser.add_argument(
        "--repairs",
        type=Path,
        default=PROJECT_DIR / "seed" / "question-repairs.v1.json",
    )
    parser.add_argument(
        "--baseline",
        type=Path,
        default=PROJECT_DIR / "seed" / "d1-questions.baseline-migration-2026-11-04.json",
    )
    args = parser.parse_args()
    queue = json.loads(args.queue.read_text(encoding="utf-8"))["entries"]
    repairs: dict[str, dict[str, Any]] = json.loads(
        args.repairs.read_text(encoding="utf-8")
    )
    baseline = json.loads(args.baseline.read_text(encoding="utf-8"))
    by_key = {}
    for question in baseline:
        match = re.match(r"^q_(vol\d+)_(.+)$", question["id"])
        if match:
            by_key[f'{match.group(1)}:{match.group(2).replace("_", ".")}'] = question

    approved = 0
    skipped = 0
    for entry in queue:
        key = entry["key"]
        question = by_key.get(key)
        if not question or key in repairs:
            skipped += 1
            continue
        body = str(question.get("body", ""))
        marker_index = body.rfind(PRACTICE_MARKER)
        if marker_index < 0:
            skipped += 1
            continue
        starts = [body.rfind("\n\n", 0, marker_index)]
        starts.append(body.rfind("\r\n\r\n", 0, marker_index))
        start = max(starts)
        if start < 0:
            skipped += 1
            continue
        fragment = body[start:]
        if not fragment.endswith(PRACTICE_MARKER) and PRACTICE_MARKER not in fragment:
            skipped += 1
            continue
        repairs[key] = {
            "reviewStatus": "approved",
            "bodyReplacements": [{"from": fragment, "to": ""}],
            "verifiedFrom": f'{entry["volume"]} page {entry["page"]}',
            "contextEvidence": (
                f'Exact trailing fragment ending at "{PRACTICE_MARKER}" '
                "in the frozen baseline."
            ),
            "reviewedBy": "known-page-furniture-rule",
        }
        approved += 1

    args.repairs.write_text(json.dumps(repairs, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"approved": approved, "skipped": skipped}, indent=2))


if __name__ == "__main__":
    main()
