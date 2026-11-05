"""Generate minimal anchored body and option repairs for approved glyph placements."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

PROJECT_DIR = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--repairs",
        type=Path,
        default=PROJECT_DIR / "seed" / "question-repairs.v1.json",
    )
    parser.add_argument(
        "--proposals",
        type=Path,
        default=PROJECT_DIR / "seed" / "glyph-alignment-proposals.v1.json",
        help="Alignment proposals; only anchored-replacement records are applied.",
    )
    args = parser.parse_args()
    repairs: dict[str, dict[str, Any]] = json.loads(
        args.repairs.read_text(encoding="utf-8")
    )
    proposals = json.loads(args.proposals.read_text(encoding="utf-8"))["proposals"]
    generated = 0
    option_generated = 0
    for proposal in proposals:
        if proposal.get("status") != "anchored-replacement":
            continue
        replacement = proposal["replacement"]
        key = proposal["key"]
        repair = repairs.setdefault(key, {})
        if replacement["field"] == "body":
            target = repair.setdefault("bodyReplacements", [])
        elif replacement["field"].startswith("option:"):
            option_id = replacement["field"].split(":", 1)[1]
            target = repair.setdefault("optionReplacements", {}).setdefault(
                option_id, []
            )
            option_generated += 1
        else:
            raise ValueError(f'Unsupported replacement field: {replacement["field"]}')
        patch = {
            "from": replacement["from"],
            "to": replacement["to"],
            "verifiedFrom": replacement["verifiedFrom"],
            "anchors": proposal["anchors"],
        }
        if patch not in target:
            target.append(patch)
            generated += 1
        repair["reviewStatus"] = "approved"
        repair["reviewedBy"] = "glyph-layout-alignment"
    args.repairs.write_text(json.dumps(repairs, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "anchoredRepairsApplied": generated,
        "optionReplacementsGenerated": option_generated,
        "queuedProposals": sum(
            proposal.get("status") != "anchored-replacement"
            for proposal in proposals
        ),
    }, indent=2))


if __name__ == "__main__":
    main()
