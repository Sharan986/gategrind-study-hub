"""Validate the glyph field ledger without applying any repairs."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from apply_glyph_field_reviews import load_baseline, validate_review


PROJECT_DIR = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--ledger",
        type=Path,
        default=PROJECT_DIR / "seed" / "glyph-field-review-ledger.v1.json",
    )
    args = parser.parse_args()
    ledger = json.loads(args.ledger.read_text(encoding="utf-8"))
    questions = load_baseline()
    invalid = 0
    approved = 0
    for entry in ledger["entries"]:
        try:
            result = validate_review(entry, questions)
        except ValueError:
            invalid += 1
            continue
        if result:
            approved += 1
    print(json.dumps({
        "entries": len(ledger["entries"]),
        "approved": approved,
        "invalidApprovedEntries": invalid,
        "pending": len(ledger["entries"]) - approved - invalid,
    }, indent=2))
    if invalid:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
