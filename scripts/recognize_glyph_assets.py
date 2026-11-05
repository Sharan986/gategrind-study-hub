"""Generate reviewable OCR candidates for audited embedded glyph assets.

This script deliberately does not modify question data. Every result remains a
candidate until a reviewer verifies the glyph and records an explicit mapping.

The installed Pix2Text release currently imports an older RapidOCR symbol, so
the compatibility alias is applied in memory before Pix2Text is imported.

Examples:
  python scripts/recognize_glyph_assets.py --volume vol2 --limit 25
  python scripts/recognize_glyph_assets.py --volume vol2 --all
"""

from __future__ import annotations

import argparse
import json
import tempfile
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps


PROJECT_DIR = Path(__file__).resolve().parents[1]


def load_pix2text() -> Any:
    """Load Pix2Text while tolerating the installed RapidOCR API rename."""
    import rapidocr.utils.model_resolver as resolver

    if not hasattr(resolver, "resolve_model_key"):
        resolver.resolve_model_key = resolver.route_to_model_key

    from pix2text import Pix2Text

    return Pix2Text.from_config(enable_table=False, device="cpu")


def enlarge_asset(source: Path, destination: Path, scale: int) -> None:
    """Make a small bitmap legible to the formula recognizer."""
    source_image = Image.open(source).convert("RGBA")
    image = Image.new("RGB", source_image.size, "white")
    image.paste(source_image, mask=source_image.getchannel("A"))
    enlarged = image.resize(
        (image.width * scale, image.height * scale),
        Image.Resampling.NEAREST,
    )
    ImageOps.expand(enlarged, border=scale * 2, fill="white").save(destination)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--volume", choices=("vol1", "vol2", "vol3"), required=True)
    parser.add_argument(
        "--limit",
        type=int,
        help="Recognize only the N most frequently used assets (default: 25)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Recognize every unique asset instead of the default top 25",
    )
    parser.add_argument("--scale", type=int, default=12)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    if args.scale < 2:
        raise ValueError("--scale must be at least 2")
    if args.limit is not None and args.limit < 1:
        raise ValueError("--limit must be positive")

    manifest_path = PROJECT_DIR / "seed" / f"glyph-audit-{args.volume}.json"
    assets_dir = manifest_path.with_suffix("").with_name(
        f"{manifest_path.stem}-assets"
    )
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    counts = manifest["summary"].get("occurrence_counts")
    if not isinstance(counts, dict):
        counts = {
            item["asset"]: item["occurrences"]
            for item in manifest["summary"]["most_reused_assets"]
        }
    all_assets = {
        item["asset"]
        for page in manifest["pages"]
        for item in page["inline_glyphs"]
    }
    ordered_assets = sorted(
        all_assets,
        key=lambda asset: (-counts.get(asset, 0), asset),
    )
    if not args.all:
        ordered_assets = ordered_assets[: args.limit or 25]

    recognizer = load_pix2text()
    output = args.output or PROJECT_DIR / "seed" / f"glyph-candidates-{args.volume}.json"
    candidates: list[dict[str, Any]] = []

    with tempfile.TemporaryDirectory(prefix="glyph-ocr-") as temporary_dir:
        temporary_path = Path(temporary_dir)
        for index, asset in enumerate(ordered_assets, start=1):
            source = next(assets_dir.glob(f"{asset}.*"), None)
            if source is None:
                raise FileNotFoundError(f"Asset image not found for {asset}")
            enlarged = temporary_path / f"{asset}.png"
            enlarge_asset(source, enlarged, args.scale)
            try:
                result = recognizer.recognize_formula(
                    enlarged,
                    return_text=False,
                )
                text = result.get("text", "") if isinstance(result, dict) else str(result)
                score = result.get("score") if isinstance(result, dict) else None
                error = None
            except Exception as exc:
                text = ""
                score = None
                error = f"{type(exc).__name__}: {exc}"
            candidates.append(
                {
                    "asset": asset,
                    "occurrences": counts.get(asset, 0),
                    "candidate": text,
                    "score": score,
                    "status": "review",
                    "error": error,
                }
            )
            print(f"[{index}/{len(ordered_assets)}] {asset}: {text!r} ({score})")

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(
            {
                "volume": args.volume,
                "source_manifest": manifest_path.name,
                "generated_by": "recognize_glyph_assets.py",
                "scale": args.scale,
                "mapping_applied": False,
                "candidates": candidates,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"output": str(output), "candidates": len(candidates)}, indent=2))


if __name__ == "__main__":
    main()
