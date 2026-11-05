"""Annotate recovered questions with a conservative source-of-truth strategy.

This does not infer text and does not promote the result. Official-paper
records are applied only when an explicit, reviewed anchor exists; all other
uncertain questions retain the original PDF crop as their visual authority.
"""

from __future__ import annotations

import argparse
import json
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


def key_for(question: dict[str, Any]) -> str:
    return f'{question["volume"]}:{question["code"]}'


def official_key(question: dict[str, Any]) -> str:
    year = question.get("year")
    paper = question.get("paper") or "CSE"
    gate_set = question.get("set")
    q_num = question.get("q_num") or question.get("code")
    return f"{year}:{paper}:{gate_set or 'default'}:{q_num}"


def is_uncertain(question: dict[str, Any]) -> bool:
    option_recovery = question.get("optionRecovery", {})
    if option_recovery.get("status") in {"visual-preserved", "source-preserved"}:
        return True
    if question.get("glyphRecovery", {}).get("needsReview"):
        return True
    options = question.get("options") or {}
    answer = question.get("answer") or {}
    values = answer.get("value", [])
    if isinstance(values, str):
        values = [value.strip() for value in values.split(";")]
    return (
        question.get("question_type") in {"MCQ", "MSQ"}
        and (set(options) != {"A", "B", "C", "D"} or any(value not in options for value in values))
    )


def block_text(block: dict[str, Any]) -> str:
    return " ".join(
        span.get("text", "")
        for line in block.get("lines", [])
        for span in line.get("spans", [])
    ).strip()


def is_question_header(text: str, question: dict[str, Any]) -> bool:
    q_num = str(question.get("q_num") or "").strip()
    code = str(question.get("code") or "").strip()
    return bool(
        (q_num and q_num in text and "question:" in text.lower())
        or (not q_num and code and code in text)
        or (not q_num and "question:" in text.lower() and any(char.isdigit() for char in text))
    )


def question_crop_rect(
    page: pymupdf.Page,
    question: dict[str, Any],
    blocks: list[dict[str, Any]] | None = None,
) -> tuple[pymupdf.Rect, str]:
    if blocks is None:
        blocks = [
            block
            for block in page.get_text("dict")["blocks"]
            if block.get("bbox") and (block.get("lines") or block.get("type") == 1)
        ]
        blocks.sort(key=lambda block: (block["bbox"][1], block["bbox"][0]))
    header_index = next(
        (
            index
            for index, block in enumerate(blocks)
            if is_question_header(block_text(block), question)
        ),
        None,
    )
    body_tokens = {
        token.lower()
        for token in str(question.get("body", "")).split()
        if len(token.strip(".,:;()[]")) >= 3
    }
    body_index = next(
        (
            index
            for index, block in enumerate(blocks)
            if body_tokens
            and len(
                body_tokens.intersection(
                    {token.lower().strip(".,:;()[]") for token in block_text(block).split()}
                )
            )
            >= min(3, len(body_tokens))
        ),
        None,
    )
    start = header_index if header_index is not None else body_index
    if start is None:
        raise ValueError(f'Cannot locate source blocks for {question["volume"]}:{question["code"]}')

    next_header = len(blocks)
    for index in range(start + 1, len(blocks)):
        text = block_text(blocks[index]).lower()
        if "question:" in text or any(
            marker in text for marker in ("answer key", "gate overflow", "gate199")
        ):
            next_header = index
            break
    selected = blocks[start:next_header]
    if not selected:
        raise ValueError(f'Empty source crop for {question["volume"]}:{question["code"]}')
    rect = pymupdf.Rect(
        min(block["bbox"][0] for block in selected),
        min(block["bbox"][1] for block in selected),
        max(block["bbox"][2] for block in selected),
        max(block["bbox"][3] for block in selected),
    )
    page_rect = page.rect
    rect = pymupdf.Rect(
        max(page_rect.x0, rect.x0 - 8),
        max(page_rect.y0, rect.y0 - 8),
        min(page_rect.x1, rect.x1 + 8),
        min(page_rect.y1, rect.y1 + 8),
    )
    return rect, "text-blocks-until-next-question"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--candidate",
        type=Path,
        default=PROJECT_DIR / "seed" / "questions-recovered-candidate.json",
    )
    parser.add_argument(
        "--official-map",
        type=Path,
        default=PROJECT_DIR / "seed" / "official-paper-map.v1.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=PROJECT_DIR / "seed" / "questions-source-strategy-candidate.json",
    )
    parser.add_argument(
        "--visual-base-url",
        default="",
        help="Deployable URL prefix for source crops; empty keeps filesystem paths only.",
    )
    parser.add_argument(
        "--crops-dir",
        type=Path,
        default=PROJECT_DIR / "public" / "source-crops",
    )
    args = parser.parse_args()

    questions = json.loads(args.candidate.read_text(encoding="utf-8"))
    official_map = json.loads(args.official_map.read_text(encoding="utf-8"))
    if not isinstance(official_map, dict):
        raise ValueError("Official paper map must be an object")

    anchored = 0
    visual = 0
    pending = 0
    documents: dict[str, pymupdf.Document] = {}
    try:
        for question in questions:
            q_key = key_for(question)
            anchor = official_map.get(official_key(question))
            if anchor:
                if not anchor.get("sourceUrl") or not anchor.get("verifiedFrom"):
                    raise ValueError(f"{q_key}: official anchor lacks source traceability")
                question["sourceStrategy"] = {
                    "class": "official-paper",
                    "status": "anchored",
                    "sourceUrl": anchor["sourceUrl"],
                    "verifiedFrom": anchor["verifiedFrom"],
                    "reviewedBy": anchor.get("reviewedBy", ""),
                    "transcript": anchor.get("transcript"),
                    "searchable": True,
                }
                anchored += 1
                continue

            if is_uncertain(question):
                recovery = question.get("optionRecovery", {})
                crop = (
                    question.get("visualPreservation", {}).get("sourceCrop")
                    or recovery.get("sourceCrop")
                )
                document = documents.setdefault(
                    question["volume"], pymupdf.open(VOLUMES[question["volume"]])
                )
                page = document[int(question["page"]) - 1]
                rect, crop_method = question_crop_rect(page, question)
                crop_name = (
                    f'{question["volume"]}-{question["code"].replace(".", "_")}.png'
                )
                crop_path = args.crops_dir / crop_name
                crop_path.parent.mkdir(parents=True, exist_ok=True)
                page.get_pixmap(
                    matrix=pymupdf.Matrix(1.5, 1.5),
                    clip=rect,
                    alpha=False,
                ).save(crop_path)
                source = {
                    "path": str(crop_path.relative_to(PROJECT_DIR)).replace("\\", "/"),
                    "url": f'/source-crops/{crop_name}',
                    "kind": "question-source-crop",
                    "bbox": [round(value, 2) for value in rect],
                    "cropMethod": crop_method,
                }
                if args.visual_base_url:
                    source["url"] = f'{args.visual_base_url.rstrip("/")}/{crop_name}'
                visual_source = {
                    "class": "visual-source",
                    "status": "source-authoritative",
                    "source": source,
                    "verifiedFrom": [
                        f'{question["volume"]}:{question["page"]}:{question["code"]}'
                    ],
                    "searchable": False,
                    "transcriptStatus": "pending",
                }
                question["sourceStrategy"] = visual_source
                question["visualSource"] = visual_source
                visual += 1
                continue

            question["sourceStrategy"] = {
                "class": "transcript",
                "status": "candidate",
                "searchable": True,
                "transcriptStatus": "machine-recovered",
            }
    finally:
        for document in documents.values():
            document.close()

    args.output.write_text(json.dumps(questions, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "output": str(args.output),
        "questions": len(questions),
        "officialAnchored": anchored,
        "visualSource": visual,
        "transcriptPendingWithoutCrop": pending,
    }, indent=2))


if __name__ == "__main__":
    main()
