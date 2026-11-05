"""Approve only complete geometry recoveries whose answer key is valid."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


PROJECT_DIR = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--queue",
        type=Path,
        default=PROJECT_DIR / "seed" / "option-recovery-queue.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=PROJECT_DIR / "seed" / "option-mappings.v2.json",
    )
    args = parser.parse_args()
    queue = json.loads(args.queue.read_text(encoding="utf-8"))
    mappings: dict[str, dict[str, Any]] = {}
    for entry in queue["entries"]:
        if entry["status"] == "visual-preserved":
            continue
        options = entry.get("geometryOptions", {})
        if set(options) != {"A", "B", "C", "D"} or any(
            not str(value).strip() for value in options.values()
        ):
            continue
        answer = entry.get("answer") or {}
        values = answer.get("value", [])
        if isinstance(values, str):
            values = [value.strip() for value in values.split(";")]
        if any(value not in options for value in values):
            continue
        mapping_key = f'{entry["volume"]}:{entry["code"]}'
        mappings[mapping_key] = {
            "status": "approved",
            "method": "pdf-word-geometry",
            "options": options,
            "verifiedFrom": [f'{entry["volume"]}:{entry["page"]}:{entry["code"]}'],
            "reviewedBy": "geometry-recovery-v1",
        }
    args.output.write_text(json.dumps(mappings, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(args.output), "approved": len(mappings)}, indent=2))


if __name__ == "__main__":
    main()
