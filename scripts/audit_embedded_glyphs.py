"""Audit non-text glyph assets embedded in the three source PDFs.

Some formula characters in the GATE volumes are small image masks rather than
PDF text glyphs. They look like digital text on the page but deliberately do
not appear in a PDF text extractor's Unicode output. This script creates a
reviewable manifest of those assets and their placements, linked to the
question records on the same source page.

It does not guess a character. A replacement may be applied only after a
recognizer or a reviewer supplies a verified value for an asset occurrence.

Examples:
  python scripts/audit_embedded_glyphs.py --volume vol2
  python scripts/audit_embedded_glyphs.py --volume vol2 --page 243 --extract-assets
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter, defaultdict
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


def load_questions(volume: str) -> list[dict[str, Any]]:
    """Load the generated records, retaining their source page and code."""
    source = PROJECT_DIR / "seed" / f"questions_{volume}.jsonl"
    with source.open(encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def is_inline_glyph(width: int, height: int, rect: pymupdf.Rect) -> bool:
    """Exclude QR codes, diagrams and page artwork; retain inline symbols."""
    return (
        width <= 96
        and height <= 96
        and rect.width <= 16
        and rect.height <= 16
        and rect.width > 0
        and rect.height > 0
    )


def extract_image_bytes(document: pymupdf.Document, image: tuple[Any, ...]) -> tuple[bytes, str]:
    """Extract an image, compositing its soft mask when the PDF uses one."""
    xref, soft_mask = image[0], image[1]
    if soft_mask:
        base = pymupdf.Pixmap(document, xref)
        mask = pymupdf.Pixmap(document, soft_mask)
        return pymupdf.Pixmap(base, mask).tobytes("png"), "png"

    extracted = document.extract_image(xref)
    return extracted["image"], extracted.get("ext", "bin")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--volume", choices=VOLUMES, required=True)
    parser.add_argument("--page", type=int, help="One-indexed source page to audit")
    parser.add_argument(
        "--extract-assets",
        action="store_true",
        help="Write each unique inline image asset beside the manifest for visual review",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Manifest path (default: seed/glyph-audit-<volume>.json)",
    )
    args = parser.parse_args()

    questions_by_page: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for question in load_questions(args.volume):
        questions_by_page[int(question["page"])].append(question)

    pdf_path = VOLUMES[args.volume]
    output = args.output or PROJECT_DIR / "seed" / f"glyph-audit-{args.volume}.json"
    assets_dir = output.with_suffix("").with_name(f"{output.stem}-assets")
    if args.extract_assets:
        assets_dir.mkdir(parents=True, exist_ok=True)

    document = pymupdf.open(pdf_path)
    selected_pages = [args.page] if args.page else sorted(questions_by_page)
    manifest: dict[str, Any] = {
        "volume": args.volume,
        "source_pdf": pdf_path.name,
        "generated_by": "audit_embedded_glyphs.py",
        "pages": [],
        "summary": {},
    }
    asset_occurrences: Counter[str] = Counter()
    all_occurrences = 0

    for page_number in selected_pages:
        if page_number < 1 or page_number > len(document):
            raise ValueError(f"Page {page_number} is outside {pdf_path.name}")
        page = document[page_number - 1]
        page_assets: list[dict[str, Any]] = []

        for image in page.get_images(full=True):
            xref, soft_mask, width, height = image[0], image[1], image[2], image[3]
            for rect in page.get_image_rects(xref):
                if not is_inline_glyph(width, height, rect):
                    continue
                image_bytes, extension = extract_image_bytes(document, image)
                digest = hashlib.sha256(image_bytes).hexdigest()[:16]
                asset_occurrences[digest] += 1
                all_occurrences += 1
                if args.extract_assets:
                    asset_path = assets_dir / f"{digest}.{extension}"
                    if not asset_path.exists():
                        asset_path.write_bytes(image_bytes)
                page_assets.append(
                    {
                        "asset": digest,
                        "xref": xref,
                        "soft_mask": soft_mask or None,
                        "pixel_size": [width, height],
                        "bbox": [round(rect.x0, 2), round(rect.y0, 2), round(rect.x1, 2), round(rect.y1, 2)],
                    }
                )

        if page_assets:
            manifest["pages"].append(
                {
                    "page": page_number,
                    "question_codes": [question["code"] for question in questions_by_page[page_number]],
                    "inline_glyphs": page_assets,
                }
            )

    manifest["summary"] = {
        "pages_with_inline_glyphs": len(manifest["pages"]),
        "inline_glyph_occurrences": all_occurrences,
        "unique_inline_glyph_assets": len(asset_occurrences),
        "occurrence_counts": dict(sorted(asset_occurrences.items())),
        "most_reused_assets": [
            {"asset": asset, "occurrences": count}
            for asset, count in asset_occurrences.most_common(25)
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"manifest": str(output), **manifest["summary"]}, indent=2))


if __name__ == "__main__":
    main()
