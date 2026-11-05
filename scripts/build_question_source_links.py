"""Map every extracted question to the publisher URL embedded in its PDF header."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

import pymupdf


PROJECT_DIR = Path(__file__).resolve().parents[1]
PDF_DIR = PROJECT_DIR.parent
HEADER_URL = re.compile(r"^https://gateoverflow\.in/(?P<id>\d+)/gate[^/?#]*", re.I)


def source_paper(url: str) -> str:
    slug = url.split("/", 4)[-1].lower()
    if slug.startswith("gate-cse-"):
        return "CSE"
    if slug.startswith("gate-it-"):
        return "IT"
    if slug.startswith("gate-da-"):
        return "DA"
    if slug.startswith("gate-data-science-and-artificial-intelligence-") and "sample-paper" in slug:
        return "DS&AI SAMPLE"
    if slug.startswith(("gate-ds&ai-", "gate-data-science-and-artificial-intelligence-")):
        return "DS&AI"
    if slug.startswith("gate-cs-practice-"):
        return "PRACTICE"
    if "ugcnet" in slug:
        return "UGCNET"
    if slug.startswith(("gate-statistics-", "gate-2023-stats-")):
        return "ST"
    older_paper = re.match(r"^gate(?:19|20)\d{2}-([a-z]+)(?:-ga(?:-|$)|$)", slug)
    if older_paper:
        return older_paper.group(1).upper()
    return "unclassified"


def questions_for_volume(volume: str) -> dict[int, list[dict]]:
    by_page: dict[int, list[dict]] = defaultdict(list)
    path = PROJECT_DIR / "seed" / f"questions_{volume}.jsonl"
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                question = json.loads(line)
                by_page[int(question["page"])].append(question)
    return by_page


def map_page(volume: str, page_number: int, page: pymupdf.Page, questions: list[dict]) -> list[dict]:
    headers = sorted(
        (
            (link, HEADER_URL.match(link.get("uri") or ""))
            for link in page.get_links()
        ),
        key=lambda item: item[0]["from"].y0,
    )
    headers = [(link, match) for link, match in headers if match]
    if len(headers) != len(questions):
        raise ValueError(
            f"{volume} page {page_number}: {len(questions)} questions but {len(headers)} heading links"
        )

    words = page.get_text("words")
    entries = []
    for question, (link, match) in zip(questions, headers, strict=True):
        code = question["code"]
        code_words = [word for word in words if word[4].rstrip(":") == code]
        matching_words = [
            word for word in code_words
            if abs(word[1] - link["from"].y0) <= 2.5
        ]
        if len(matching_words) != 1:
            raise ValueError(
                f"{volume} page {page_number} question {code}: cannot align its heading with URL {link['uri']}"
            )
        entries.append({
            "key": f"{volume}:{code}",
            "volume": volume,
            "code": code,
            "page": page_number,
            "sourceUrl": link["uri"],
            "sourceQuestionId": match.group("id"),
            "sourcePaper": source_paper(link["uri"]),
            "headerBbox": [round(value, 2) for value in link["from"]],
        })
    return entries


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output", type=Path,
        default=PROJECT_DIR / "seed" / "question-source-links.v1.json",
    )
    parser.add_argument(
        "--runtime-output", type=Path,
        default=PROJECT_DIR / "src" / "data" / "question-origins.json",
    )
    args = parser.parse_args()
    entries = []
    pdf_sha256 = {}
    for volume in ("vol1", "vol2", "vol3"):
        pdf_path = PDF_DIR / f"filter1_volume{volume[-1]}.pdf"
        pdf_sha256[volume] = hashlib.sha256(pdf_path.read_bytes()).hexdigest()
        questions = questions_for_volume(volume)
        with pymupdf.open(pdf_path) as document:
            for page_number, group in sorted(questions.items()):
                entries.extend(map_page(volume, page_number, document[page_number - 1], group))
    keys = [entry["key"] for entry in entries]
    if len(keys) != 3823 or len(set(keys)) != len(keys):
        raise ValueError(f"Expected 3823 unique question keys; got {len(keys)} entries, {len(set(keys))} unique")
    payload = {
        "version": 1,
        "generatedBy": "build_question_source_links.py",
        "sourcePdfSha256": pdf_sha256,
        "entryCount": len(entries),
        "sourcePaperCounts": dict(Counter(entry["sourcePaper"] for entry in entries)),
        "entries": entries,
    }
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    runtime_origins = {
        entry["key"]: {"paper": entry["sourcePaper"], "url": entry["sourceUrl"]}
        for entry in entries
    }
    args.runtime_output.write_text(
        json.dumps(runtime_origins, separators=(",", ":")) + "\n", encoding="utf-8"
    )
    print(json.dumps({"output": str(args.output), "entries": len(entries)}, indent=2))


if __name__ == "__main__":
    main()
