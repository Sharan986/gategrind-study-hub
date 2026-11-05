"""Create a per-placement editorial ledger from bounded glyph-gap proposals.

This deliberately does not modify question repairs.  A reviewer must provide
the complete replacement for each individual source-backed gap; an approved
asset value is supporting evidence, not a substitute for the full expression.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any


PROJECT_DIR = Path(__file__).resolve().parents[1]


def review_id(proposal: dict[str, Any]) -> str:
    value = "|".join(
        (
            proposal["key"],
            proposal["asset"],
            ",".join(str(value) for value in proposal["bbox"]),
            proposal["fieldGap"]["field"],
            proposal["fieldGap"]["from"],
        )
    )
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--proposals",
        type=Path,
        default=PROJECT_DIR / "seed" / "glyph-alignment-proposals.v1.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=PROJECT_DIR / "seed" / "glyph-field-review-ledger.v1.json",
    )
    args = parser.parse_args()

    proposals = json.loads(args.proposals.read_text(encoding="utf-8"))["proposals"]
    entries: list[dict[str, Any]] = []
    for proposal in proposals:
        if proposal.get("status") != "queued-field-gap-review":
            continue
        gap = proposal["fieldGap"]
        entries.append(
            {
                "id": review_id(proposal),
                "status": "needs-review",
                "source": {
                    "key": proposal["key"],
                    "page": proposal["page"],
                    "asset": proposal["asset"],
                    "bbox": proposal["bbox"],
                    "verifiedFrom": proposal["verifiedFrom"],
                },
                "anchors": proposal["anchors"],
                "field": gap["field"],
                "baselineSpan": gap["from"],
                "baselineGap": gap["gap"],
                "assetCandidate": proposal["value"],
                "replacement": "",
                "reviewEvidence": "",
                "reviewedBy": "",
            }
        )
    payload: dict[str, Any] = {
        "version": 1,
        "generatedBy": "build_glyph_field_review_ledger.py",
        "source": str(args.proposals.relative_to(PROJECT_DIR)).replace("\\", "/"),
        "rule": (
            "Approve only after confirming the whole replacement from the source page. "
            "The assetCandidate alone is insufficient; empty replacements are invalid."
        ),
        "entryCount": len(entries),
        "entries": entries,
    }
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(args.output), "entries": len(entries)}, indent=2))


if __name__ == "__main__":
    main()
