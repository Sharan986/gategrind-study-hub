"""Scope PDF glyph placements to one question before any text patch is proposed.

The earlier candidate dataset attached every inline asset on a PDF page to every
question on that page.  That page-level association is useful for discovery but
is invalid evidence for a field repair.  This script produces a separate,
review-only manifest in which a placement is eligible only when it is fully
inside the question's source rectangle and is not shared by another asset at
the same coordinates.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

import pymupdf

from build_source_strategy_candidate import question_crop_rect
from glyph_alignment import mapping_identity_errors


PROJECT_DIR = Path(__file__).resolve().parents[1]
SOURCE_DIR = PROJECT_DIR.parent
VOLUMES = {
    "vol1": SOURCE_DIR / "filter1_volume1.pdf",
    "vol2": SOURCE_DIR / "filter1_volume2.pdf",
    "vol3": SOURCE_DIR / "filter1_volume3.pdf",
}


def contains(region: list[float], bbox: list[float], tolerance: float = 0.5) -> bool:
    return (
        region[0] - tolerance <= bbox[0]
        and region[1] - tolerance <= bbox[1]
        and bbox[2] <= region[2] + tolerance
        and bbox[3] <= region[3] + tolerance
    )


def bbox_key(bbox: list[float]) -> tuple[float, float, float, float]:
    return tuple(round(value, 2) for value in bbox)


def load_questions(volume: str) -> list[dict[str, Any]]:
    path = PROJECT_DIR / "seed" / f"questions_{volume}.jsonl"
    with path.open(encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def load_glyphs(volume: str) -> dict[int, list[dict[str, Any]]]:
    path = PROJECT_DIR / "seed" / f"glyph-audit-{volume}.json"
    audit = json.loads(path.read_text(encoding="utf-8"))
    return {entry["page"]: entry["inline_glyphs"] for entry in audit["pages"]}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--mapping",
        type=Path,
        default=PROJECT_DIR / "seed" / "glyph-mappings.v3.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=PROJECT_DIR / "seed" / "question-glyph-placements.v1.json",
    )
    args = parser.parse_args()

    mappings: dict[str, dict[str, Any]] = json.loads(
        args.mapping.read_text(encoding="utf-8")
    )
    entries: list[dict[str, Any]] = []
    summary: Counter[str] = Counter()
    for volume, pdf_path in VOLUMES.items():
        glyphs_by_page = load_glyphs(volume)
        document = pymupdf.open(pdf_path)
        page_blocks: dict[int, list[dict[str, Any]]] = {}
        try:
            for question in load_questions(volume):
                page_number = int(question["page"])
                page = document[page_number - 1]
                key = f'{volume}:{question["code"]}'
                try:
                    blocks = page_blocks.setdefault(
                        page_number,
                        sorted(
                            [
                                block
                                for block in page.get_text("dict")["blocks"]
                                if block.get("bbox")
                                and (block.get("lines") or block.get("type") == 1)
                            ],
                            key=lambda block: (block["bbox"][1], block["bbox"][0]),
                        ),
                    )
                    rect, method = question_crop_rect(page, question, blocks)
                except ValueError as error:
                    entries.append({"key": key, "status": "unscoped", "error": str(error)})
                    summary["unscopedQuestions"] += 1
                    continue
                region = [round(value, 2) for value in rect]
                placements = [
                    glyph
                    for glyph in glyphs_by_page.get(page_number, [])
                    if contains(region, glyph["bbox"])
                ]
                by_bbox: dict[tuple[float, float, float, float], list[dict[str, Any]]] = defaultdict(list)
                for glyph in placements:
                    by_bbox[bbox_key(glyph["bbox"])].append(glyph)
                scoped = []
                for glyph in placements:
                    colliding_assets = sorted(
                        {item["asset"] for item in by_bbox[bbox_key(glyph["bbox"])]}
                    )
                    mapping = mappings.get(glyph["asset"], {})
                    identity_errors = mapping_identity_errors(glyph["asset"], mapping)
                    collision = len(colliding_assets) != 1
                    eligible = (
                        mapping.get("status") == "approved"
                        and not identity_errors
                        and not collision
                    )
                    scoped.append(
                        {
                            "asset": glyph["asset"],
                            "bbox": glyph["bbox"],
                            "assetCollision": colliding_assets if collision else [],
                            "approvedValue": mapping.get("value", "") if eligible else "",
                            "applicationStatus": "eligible-for-alignment" if eligible else "review-only",
                            "identityErrors": identity_errors,
                        }
                    )
                    summary["scopedPlacements"] += 1
                    if collision:
                        summary["collidingPlacements"] += 1
                    if eligible:
                        summary["eligiblePlacements"] += 1
                entries.append(
                    {
                        "key": key,
                        "volume": volume,
                        "page": page_number,
                        "questionCode": question["code"],
                        "region": region,
                        "regionMethod": method,
                        "placements": scoped,
                    }
                )
                summary["scopedQuestions"] += 1
        finally:
            document.close()

    payload = {
        "version": 1,
        "generatedBy": "scope_glyph_placements_to_questions.py",
        "rule": "Only non-colliding, identity-verified, approved assets may proceed to lexical alignment.",
        "summary": dict(sorted(summary.items())),
        "entries": entries,
    }
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload["summary"], indent=2))


if __name__ == "__main__":
    main()
