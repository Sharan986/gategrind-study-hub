"""Reject approved glyph mappings whose evidence does not identify the same asset."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from glyph_alignment import mapping_identity_errors


PROJECT_DIR = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--mapping",
        type=Path,
        default=PROJECT_DIR / "seed" / "glyph-mappings.v3.json",
    )
    args = parser.parse_args()
    mappings = json.loads(args.mapping.read_text(encoding="utf-8"))
    errors = {
        asset: mapping_identity_errors(asset, record)
        for asset, record in mappings.items()
        if mapping_identity_errors(asset, record)
    }
    print(json.dumps({"approvedMappings": sum(
        record.get("status") == "approved" for record in mappings.values()
    ), "identityErrors": errors}, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
