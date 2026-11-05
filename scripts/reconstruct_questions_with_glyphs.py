"""Create a separate question candidate dataset with explicit glyph states."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

import pymupdf


PROJECT_DIR = Path(__file__).resolve().parents[1]
SOURCE_DIR = PROJECT_DIR.parent
VOLUMES = {
    "vol1": SOURCE_DIR / "filter1_volume1.pdf",
    "vol2": SOURCE_DIR / "filter1_volume2.pdf",
    "vol3": SOURCE_DIR / "filter1_volume3.pdf",
}
OPTION_QUEUE = PROJECT_DIR / "seed" / "option-recovery-queue.json"


def load_mapping(path: Path) -> dict[str, dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Mapping file must contain an object")
    return data


def page_text_runs(page: pymupdf.Page) -> list[dict[str, Any]]:
    runs = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                runs.append(
                    {
                        "kind": "text",
                        "text": span.get("text", ""),
                        "bbox": [round(value, 2) for value in span["bbox"]],
                    }
                )
    return runs


def remove_page_furniture(body: str) -> str:
    markers = ("Practice Test:", "Answer Key", "GATE Overflow")
    return "\n".join(
        line for line in body.splitlines()
        if not any(marker.lower() in line.lower() for marker in markers)
    ).strip()


def reconstruct(
    volume: str,
    questions: list[dict[str, Any]],
    mapping: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    manifest = json.loads(
        (PROJECT_DIR / "seed" / f"glyph-audit-{volume}.json").read_text(
            encoding="utf-8"
        )
    )
    by_page: dict[int, list[dict[str, Any]]] = {}
    for page_entry in manifest["pages"]:
        by_page[page_entry["page"]] = page_entry["inline_glyphs"]
    document = pymupdf.open(VOLUMES[volume])
    try:
        page_cache: dict[int, dict[str, Any]] = {}
        for page_number, glyphs in by_page.items():
            page = document[page_number - 1]
            runs = page_text_runs(page)
            needs_review = []
            for glyph in glyphs:
                asset = glyph["asset"]
                record = mapping.get(asset)
                status = record.get("status") if record else "unresolved"
                if status not in {"approved", "diagram", "unresolved"}:
                    raise ValueError(f"Invalid mapping status for {asset}: {status}")
                value = record.get("value", "") if record else ""
                token = (
                    value
                    if status == "approved" and value
                    else f"[{status}:{asset}]"
                )
                runs.append(
                    {
                        "kind": "glyph",
                        "asset": asset,
                        "status": status,
                        "value": value,
                        "text": token,
                        "bbox": glyph["bbox"],
                    }
                )
                if status == "unresolved":
                    needs_review.append(
                        {
                            "asset": asset,
                            "bbox": glyph["bbox"],
                            "reason": "No approved or diagram mapping exists",
                        }
                    )
            runs.sort(key=lambda run: (run["bbox"][1], run["bbox"][0], run["kind"]))
            page_cache[page_number] = {
                "sourcePageText": page.get_text("text"),
                "runs": runs,
                "needsReview": needs_review,
                "coordinateText": "".join(run["text"] for run in runs),
            }
        output = []
        for question in questions:
            page_data = page_cache.get(int(question["page"]))
            if page_data is None:
                page_data = {
                    "sourcePageText": "",
                    "runs": [],
                    "needsReview": [],
                    "coordinateText": "",
                }
            candidate = dict(question)
            candidate["body"] = remove_page_furniture(candidate.get("body", ""))
            candidate["glyphRecovery"] = {
                "sourcePage": question["page"],
                "sourcePageText": page_data["sourcePageText"],
                "coordinateText": page_data["coordinateText"],
                "runs": page_data["runs"],
                "needsReview": page_data["needsReview"],
            }
            output.append(candidate)
        return output
    finally:
        document.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--mapping",
        type=Path,
        default=PROJECT_DIR / "seed" / "glyph-mappings.v2.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=PROJECT_DIR / "seed" / "questions-glyph-candidate.json",
    )
    args = parser.parse_args()
    mapping = load_mapping(args.mapping)
    option_queue = {}
    if OPTION_QUEUE.exists():
        queue = json.loads(OPTION_QUEUE.read_text(encoding="utf-8"))
        option_queue = {
            (entry["volume"], entry["code"]): entry for entry in queue["entries"]
        }
    questions = []
    for volume in VOLUMES:
        source = PROJECT_DIR / "seed" / f"questions_{volume}.jsonl"
        with source.open(encoding="utf-8") as handle:
            volume_questions = [json.loads(line) for line in handle if line.strip()]
        recovered = reconstruct(volume, volume_questions, mapping)
        for question in recovered:
            queue_entry = option_queue.get((volume, question["code"]))
            if queue_entry and queue_entry["status"] == "visual-preserved":
                question["visualPreservation"] = {
                    "status": "visual-preserved",
                    "sourcePage": queue_entry["page"],
                    "sourceCrop": queue_entry["pageCrop"],
                    "verifiedFrom": [
                        f'{volume}:{queue_entry["page"]}:{question["code"]}'
                    ],
                    "reason": "Original page is retained as the authoritative visual",
                }
                question["optionRecovery"] = {
                    "status": "visual-preserved",
                    "triage": queue_entry["triage"],
                    "sourceCrop": queue_entry["pageCrop"],
                }
        questions.extend(recovered)
    args.output.write_text(json.dumps(questions, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(args.output), "questions": len(questions)}, indent=2))


if __name__ == "__main__":
    main()
