"""Propose only uniquely anchored replacements from scoped PDF glyph placements."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any

import pymupdf

from glyph_alignment import mapping_identity_errors


PROJECT_DIR = Path(__file__).resolve().parents[1]
SOURCE_DIR = PROJECT_DIR.parent
VOLUMES = {
    "vol1": SOURCE_DIR / "filter1_volume1.pdf",
    "vol2": SOURCE_DIR / "filter1_volume2.pdf",
    "vol3": SOURCE_DIR / "filter1_volume3.pdf",
}


def text_runs(page: pymupdf.Page) -> list[dict[str, Any]]:
    runs = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                text = span.get("text", "").strip()
                if text:
                    runs.append(
                        {
                            "text": text,
                            "bbox": [round(value, 2) for value in span["bbox"]],
                        }
                    )
    return runs


def same_line(left: list[float], right: list[float]) -> bool:
    height = max(left[3] - left[1], right[3] - right[1])
    return abs((left[1] + left[3]) / 2 - (right[1] + right[3]) / 2) <= max(
        2.0, height * 0.6
    )


def anchors(
    bbox: list[float],
    runs: list[dict[str, Any]],
    region: list[float],
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    candidates = [
        run
        for run in runs
        if region[0] <= run["bbox"][0] <= region[2]
        and region[1] <= run["bbox"][1] <= region[3]
        and same_line(bbox, run["bbox"])
    ]
    before = sorted(
        (run for run in candidates if run["bbox"][2] <= bbox[0]),
        key=lambda run: bbox[0] - run["bbox"][2],
    )
    after = sorted(
        (run for run in candidates if run["bbox"][0] >= bbox[2]),
        key=lambda run: run["bbox"][0] - bbox[2],
    )
    if not before or not after:
        return None, None
    before_distance = bbox[0] - before[0]["bbox"][2]
    after_distance = after[0]["bbox"][0] - bbox[2]
    before_ties = [run for run in before if abs(bbox[0] - run["bbox"][2] - before_distance) < 0.01]
    after_ties = [run for run in after if abs(run["bbox"][0] - bbox[2] - after_distance) < 0.01]
    return (
        before[0] if len(before_ties) == 1 else None,
        after[0] if len(after_ties) == 1 else None,
    )


def field_gap_candidates(
    question: dict[str, Any], before: str, after: str
) -> list[dict[str, str]]:
    """Find a unique baseline span bracketed by the PDF's two text anchors.

    The base dataset contains spaces where an inline PDF asset was omitted; it
    never contains an ``[unresolved:...]`` token.  Returning this candidate is
    deliberately not a repair: whether the blank should become a glyph, a
    multi-glyph expression, or remain whitespace still needs source review.
    """
    if not before or not after:
        return []
    fields = [("body", str(question.get("body", "")))]
    fields.extend(
        (f"option:{option_id}", str(value))
        for option_id, value in (question.get("options") or {}).items()
    )
    candidates = []
    for field, text in fields:
        starts = []
        offset = 0
        while True:
            index = text.find(before, offset)
            if index < 0:
                break
            starts.append(index)
            offset = index + 1
        for start in starts:
            end = text.find(after, start + len(before))
            if end < 0:
                continue
            # The closest right anchor must be the only one after this left
            # anchor; otherwise a repeated phrase could select the wrong gap.
            if text.find(after, end + 1) >= 0:
                continue
            candidates.append(
                {
                    "field": field,
                    "from": text[start : end + len(after)],
                    "before": before,
                    "gap": text[start + len(before) : end],
                    "after": after,
                }
            )
    return candidates


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--mapping",
        type=Path,
        default=PROJECT_DIR / "seed" / "glyph-mappings.v3.json",
    )
    parser.add_argument(
        "--candidate",
        type=Path,
        default=PROJECT_DIR / "seed" / "questions-recovered-candidate.json",
    )
    parser.add_argument(
        "--placements",
        type=Path,
        default=PROJECT_DIR / "seed" / "question-glyph-placements.v1.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=PROJECT_DIR / "seed" / "glyph-alignment-proposals.v1.json",
    )
    args = parser.parse_args()

    mappings = json.loads(args.mapping.read_text(encoding="utf-8"))
    questions = {
        f'{item["volume"]}:{item["code"]}': item
        for item in json.loads(args.candidate.read_text(encoding="utf-8"))
    }
    scoped = json.loads(args.placements.read_text(encoding="utf-8"))["entries"]
    documents = {volume: pymupdf.open(path) for volume, path in VOLUMES.items()}
    runs_by_page: dict[tuple[str, int], list[dict[str, Any]]] = {}
    counts: Counter[str] = Counter()
    proposals: list[dict[str, Any]] = []
    try:
        for entry in scoped:
            question = questions.get(entry["key"])
            if not question or entry.get("status") == "unscoped":
                counts["unscoped"] += 1
                continue
            page_number = int(entry["page"])
            page_key = (entry["volume"], page_number)
            runs = runs_by_page.get(page_key)
            if runs is None:
                page = documents[entry["volume"]][page_number - 1]
                runs = text_runs(page)
                runs_by_page[page_key] = runs
            for placement in entry.get("placements", []):
                if placement.get("applicationStatus") != "eligible-for-alignment":
                    continue
                asset = placement["asset"]
                mapping = mappings.get(asset, {})
                identity_errors = mapping_identity_errors(asset, mapping)
                if identity_errors:
                    counts["identity-rejected"] += 1
                    continue
                before, after = anchors(placement["bbox"], runs, entry["region"])
                base = {
                    "key": entry["key"],
                    "volume": entry["volume"],
                    "page": entry["page"],
                    "questionCode": entry["questionCode"],
                    "asset": asset,
                    "bbox": placement["bbox"],
                    "value": mapping["value"],
                    "anchors": {
                        "before": before["text"] if before else "",
                        "after": after["text"] if after else "",
                    },
                }
                if before is None or after is None:
                    base["status"] = "queued-ambiguous-anchors"
                    counts["ambiguous-anchors"] += 1
                else:
                    candidates = field_gap_candidates(
                        question, before["text"], after["text"]
                    )
                    if len(candidates) == 1:
                        # A reviewer can now verify an exact, bounded baseline
                        # substring rather than a whole question.  Do not turn
                        # this into a patch until the intended expression is
                        # confirmed for this *placement*.
                        base["status"] = "queued-field-gap-review"
                        base["fieldGap"] = candidates[0]
                        base["verifiedFrom"] = (
                            f'{entry["volume"]}:{entry["page"]}:{entry["questionCode"]}'
                        )
                        counts["field-gap-review"] += 1
                    else:
                        base["status"] = "queued-no-unique-baseline-gap"
                        counts["no-unique-baseline-gap"] += 1
                proposals.append(base)
    finally:
        for document in documents.values():
            document.close()
    payload = {
        "version": 1,
        "generatedBy": "propose_glyph_alignments.py",
        "rule": (
            "Only identity-verified, non-colliding placements with unique same-line "
            "PDF anchors and one bounded baseline gap may enter editorial review. "
            "This generator never applies a repair."
        ),
        "summary": dict(sorted(counts.items())),
        "proposals": proposals,
    }
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload["summary"], indent=2))


if __name__ == "__main__":
    main()
