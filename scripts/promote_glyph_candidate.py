"""Promote a passing candidate dataset while preserving a rollback baseline."""

from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--candidate",
        type=Path,
        default=PROJECT_DIR / "seed" / "questions-glyph-candidate.json",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=PROJECT_DIR / "seed" / "glyph-fidelity-report.json",
    )
    parser.add_argument(
        "--target",
        type=Path,
        default=PROJECT_DIR / "src" / "data" / "d1-questions.json",
    )
    args = parser.parse_args()
    report = json.loads(args.report.read_text(encoding="utf-8"))
    classes = report.get("releaseClasses", {})
    if report.get("status") != "pass" or not classes.get("glyph-complete") or not classes.get("question-complete"):
        raise SystemExit(
            "Refusing promotion: glyph-complete and question-complete must both pass."
        )
    archive_dir = PROJECT_DIR / "seed" / "release-archive"
    archive_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    baseline = archive_dir / f"d1-questions.baseline.{stamp}.json"
    archived_report = archive_dir / f"glyph-fidelity-report.{stamp}.json"
    shutil.copyfile(args.target, baseline)
    shutil.copyfile(args.report, archived_report)
    shutil.copyfile(args.candidate, args.target)
    print(
        json.dumps(
            {
                "target": str(args.target),
                "baseline": str(baseline),
                "report": str(archived_report),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
