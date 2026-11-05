"""Build review-only queues for field-level, source-traceable repairs."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


PROJECT_DIR = Path(__file__).resolve().parents[1]
QUEUE_NAMES = {
    "body-glyph-fragments": "body-glyph-fragments.v1.json",
    "page-furniture": "page-furniture.v1.json",
    "options": "option-repairs.v1.json",
    "code": "code-formatting.v1.json",
    "diagrams": "diagram-references.v1.json",
}


def evidence(entry: dict[str, Any]) -> dict[str, Any]:
    return {
        "volume": entry["volume"],
        "page": entry["page"],
        "verifiedFrom": f'{entry["volume"]} page {entry["page"]}',
        "reviewStatus": "needsReview",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--audit",
        type=Path,
        default=PROJECT_DIR / "seed" / "question-field-audit.v1.json",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=PROJECT_DIR / "seed" / "repair-queues",
    )
    parser.add_argument(
        "--repairs",
        type=Path,
        default=PROJECT_DIR / "seed" / "question-repairs.v1.json",
    )
    parser.add_argument(
        "--source-links",
        type=Path,
        default=PROJECT_DIR / "seed" / "question-source-links.v1.json",
    )
    args = parser.parse_args()
    audit = json.loads(args.audit.read_text(encoding="utf-8"))["entries"]
    repairs = json.loads(args.repairs.read_text(encoding="utf-8"))
    links = (
        {entry["key"]: entry for entry in json.loads(args.source_links.read_text(encoding="utf-8"))["entries"]}
        if args.source_links.exists() else {}
    )
    queues: dict[str, list[dict[str, Any]]] = {name: [] for name in QUEUE_NAMES}
    for entry in audit:
        base = {
            "key": entry["key"],
            "volume": entry["volume"],
            "code": entry["questionCode"],
            "page": entry["page"],
            "sourceUrl": links.get(entry["key"], {}).get("sourceUrl"),
            "sourcePaper": links.get(entry["key"], {}).get("sourcePaper"),
            "sourceEvidence": evidence(entry),
        }
        repair = repairs.get(entry["key"], {})
        repair = repair if repair.get("reviewStatus") == "approved" else {}
        if entry["body"] == "missing-glyphs" and not repair.get("bodyPatch"):
            queues["body-glyph-fragments"].append(
                {
                    **base,
                    "classification": entry["bodyGapKind"],
                    "bodyPatch": "",
                }
            )
        if entry["body"] == "page-furniture" and not repair.get("bodyPatch"):
            queues["page-furniture"].append({**base, "bodyPatch": ""})
        if entry["options"] != "complete" and not repair.get("optionPatch"):
            queues["options"].append(
                {
                    **base,
                    "classification": entry["options"],
                    "optionPatch": {},
                }
            )
        if entry["code"] == "formatting-only" and not repair.get("codePatch"):
            queues["code"].append({**base, "codePatch": {}})
        if entry["diagram"] == "required asset":
            queues["diagrams"].append(
                {
                    **base,
                    "status": "needsReview",
                    "asset": None,
                }
            )
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for name, filename in QUEUE_NAMES.items():
        payload = {
            "version": 1,
            "generatedBy": "build_field_repair_queues.py",
            "queue": name,
            "entryCount": len(queues[name]),
            "entries": queues[name],
        }
        (args.output_dir / filename).write_text(
            json.dumps(payload, indent=2) + "\n", encoding="utf-8"
        )
    print(json.dumps({name: len(items) for name, items in queues.items()}, indent=2))


if __name__ == "__main__":
    main()
