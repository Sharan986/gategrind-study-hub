"""Create a reviewed matching queue for official GATE papers from 2007 onward."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


PROJECT_DIR = Path(__file__).resolve().parents[1]
ARCHIVE_URL = "https://gate2026.iitg.ac.in/download.html"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--candidate",
        type=Path,
        default=PROJECT_DIR / "seed" / "questions-recovered-candidate.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=PROJECT_DIR / "seed" / "official-paper-anchor-queue.json",
    )
    args = parser.parse_args()
    questions = json.loads(args.candidate.read_text(encoding="utf-8"))
    entries: list[dict[str, Any]] = []
    for question in questions:
        year = question.get("year")
        if not isinstance(year, int) or year < 2007:
            continue
        entries.append(
            {
                "key": f'{year}:{question.get("paper") or "CSE"}:{question.get("set") or "default"}:{question.get("q_num") or question["code"]}',
                "volume": question["volume"],
                "code": question["code"],
                "year": year,
                "set": question.get("set"),
                "qNum": question.get("q_num"),
                "page": question.get("page"),
                "status": "needsOfficialReview",
                "archiveUrl": ARCHIVE_URL,
                "verifiedFrom": [],
                "reviewedBy": "",
            }
        )
    payload = {
        "version": 1,
        "generatedBy": "build_official_anchor_queue.py",
        "sourceArchive": ARCHIVE_URL,
        "reviewRule": "Match year, set, question number, complete body, options, and answer key before approving.",
        "entryCount": len(entries),
        "entries": entries,
    }
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(args.output), "entries": len(entries)}, indent=2))


if __name__ == "__main__":
    main()
