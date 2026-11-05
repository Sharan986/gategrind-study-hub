"""Build a descending-frequency semantic glyph review queue with distinct contexts."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


PROJECT_DIR = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--review-queue",
        type=Path,
        default=PROJECT_DIR / "seed" / "glyph-review" / "review-queue.json",
    )
    parser.add_argument(
        "--audit",
        type=Path,
        default=PROJECT_DIR / "seed" / "question-field-audit.v1.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=PROJECT_DIR / "seed" / "repair-queues" / "semantic-glyph-assets.v1.json",
    )
    parser.add_argument("--contexts-per-asset", type=int, default=3)
    args = parser.parse_args()

    audit = json.loads(args.audit.read_text(encoding="utf-8"))["entries"]
    semantic_keys = {
        entry["key"]
        for entry in audit
        if entry["bodyGapKind"] == "semantic-text-or-math"
    }
    queue = json.loads(args.review_queue.read_text(encoding="utf-8"))["entries"]
    entries: list[dict[str, Any]] = []
    for asset in queue:
        if asset["status"] != "unresolved":
            continue
        contexts = []
        seen_questions: set[str] = set()
        for context in asset["contexts"]:
            keys = [
                f'{context["volume"]}:{code}'
                for code in context.get("questionCodes", [])
            ]
            semantic = [key for key in keys if key in semantic_keys]
            if not semantic or any(key in seen_questions for key in semantic):
                continue
            seen_questions.update(semantic)
            contexts.append({**context, "semanticQuestionKeys": semantic})
            if len(contexts) >= args.contexts_per_asset:
                break
        if contexts:
            entries.append(
                {
                    "asset": asset["asset"],
                    "frequency": asset["frequency"],
                    "candidate": asset["candidate"],
                    "format": asset["format"],
                    "status": "needsReview",
                    "reviewStatus": "needsReview",
                    "value": "",
                    "contexts": contexts,
                    "bodyPatchPlan": {
                        "operation": "replace-inline-asset-placements",
                        "requiresApprovedValue": True,
                    },
                }
            )
    entries.sort(key=lambda item: (-item["frequency"], item["asset"]))
    payload = {
        "version": 1,
        "generatedBy": "build_semantic_glyph_queue.py",
        "reviewRule": "Approve only when the same value is consistent across distinct source contexts.",
        "entryCount": len(entries),
        "entries": entries,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(args.output), "entries": len(entries)}, indent=2))


if __name__ == "__main__":
    main()
