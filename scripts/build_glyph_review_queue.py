"""Build a globally deduplicated, context-rich glyph review queue.

The queue is editorial input only. It never changes question data. The
generated HTML lets a reviewer approve an OCR candidate, edit its LaTeX,
or mark an asset as diagram-only, then download a mapping file.

Example:
  python scripts/build_glyph_review_queue.py
"""

from __future__ import annotations

import argparse
import html
import json
import shutil
from collections import defaultdict
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


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def candidate_by_asset(volume: str) -> dict[str, dict[str, Any]]:
    path = PROJECT_DIR / "seed" / f"glyph-candidates-{volume}.json"
    if not path.exists():
        return {}
    data = load_json(path)
    return {item["asset"]: item for item in data.get("candidates", [])}


def render_context(
    document: pymupdf.Document,
    page_number: int,
    bbox: list[float],
    destination: Path,
) -> None:
    page = document[page_number - 1]
    rect = pymupdf.Rect(bbox)
    clip = pymupdf.Rect(
        max(0, rect.x0 - 120),
        max(0, rect.y0 - 38),
        min(page.rect.width, rect.x1 + 120),
        min(page.rect.height, rect.y1 + 38),
    )
    pixmap = page.get_pixmap(
        matrix=pymupdf.Matrix(2, 2),
        clip=clip,
        alpha=False,
    )
    destination.parent.mkdir(parents=True, exist_ok=True)
    pixmap.save(destination)


def build_queue(contexts_per_asset: int, output_dir: Path) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    mapping_path = PROJECT_DIR / "seed" / "glyph-mappings.v2.json"
    mapping = load_json(mapping_path) if mapping_path.exists() else {}
    documents = {volume: pymupdf.open(path) for volume, path in VOLUMES.items()}
    try:
        for volume in VOLUMES:
            manifest_path = PROJECT_DIR / "seed" / f"glyph-audit-{volume}.json"
            manifest = load_json(manifest_path)
            counts = manifest["summary"].get("occurrence_counts", {})
            candidates = candidate_by_asset(volume)
            asset_dir = manifest_path.with_suffix("").with_name(
                f"{manifest_path.stem}-assets"
            )
            for page_entry in manifest["pages"]:
                page_number = page_entry["page"]
                for occurrence in page_entry["inline_glyphs"]:
                    asset = occurrence["asset"]
                    entry = merged.setdefault(
                        asset,
                        {
                            "asset": asset,
                            "frequency": 0,
                            "volumes": [],
                            "contexts": [],
                            "candidate": "",
                            "score": None,
                            "status": mapping.get(asset, {}).get("status", "unresolved"),
                            "value": mapping.get(asset, {}).get("value", ""),
                            "format": "latex",
                        },
                    )
                    entry["frequency"] += 1
                    if volume not in entry["volumes"]:
                        entry["volumes"].append(volume)
                    candidate = candidates.get(asset)
                    if candidate and not entry["candidate"]:
                        entry["candidate"] = candidate.get("candidate", "")
                        entry["score"] = candidate.get("score")
                    if len(entry["contexts"]) < contexts_per_asset:
                        context_id = f"{asset}-{len(entry['contexts']) + 1}"
                        context_path = output_dir / "contexts" / f"{context_id}.png"
                        render_context(
                            documents[volume],
                            page_number,
                            occurrence["bbox"],
                            context_path,
                        )
                        entry["contexts"].append(
                            {
                                "id": context_id,
                                "volume": volume,
                                "page": page_number,
                                "questionCodes": page_entry["question_codes"],
                                "bbox": occurrence["bbox"],
                                "assetPath": str(
                                    (asset_dir / f"{asset}.png").relative_to(PROJECT_DIR)
                                ).replace("\\", "/"),
                                "contextPath": str(
                                    context_path.relative_to(PROJECT_DIR)
                                ).replace("\\", "/"),
                            }
                        )
        assets_dir = output_dir / "assets"
        assets_dir.mkdir(parents=True, exist_ok=True)
        for asset, entry in merged.items():
            source = next(
                (
                    PROJECT_DIR
                    / "seed"
                    / f"glyph-audit-{volume}-assets"
                    / f"{asset}.png"
                    for volume in entry["volumes"]
                    if (
                        PROJECT_DIR
                        / "seed"
                        / f"glyph-audit-{volume}-assets"
                        / f"{asset}.png"
                    ).exists()
                ),
                None,
            )
            if source is not None:
                shutil.copyfile(source, assets_dir / f"{asset}.png")
            entry["assetPath"] = str(
                (assets_dir / f"{asset}.png").relative_to(PROJECT_DIR)
            ).replace("\\", "/")
    finally:
        for document in documents.values():
            document.close()
    return sorted(merged.values(), key=lambda item: (-item["frequency"], item["asset"]))


def render_html(entries: list[dict[str, Any]], output: Path) -> None:
    cards = []
    for entry in entries:
        asset = html.escape(entry["asset"])
        candidate = html.escape(entry["candidate"])
        score = "" if entry["score"] is None else f"{entry['score']:.3f}"
        context_ids = html.escape(
            json.dumps([context["id"] for context in entry["contexts"]])
        )
        contexts = "".join(
            f'<figure><img src="contexts/{html.escape(context["id"])}.png" '
            f'alt="PDF context {html.escape(context["volume"])} page {context["page"]}">'
            f'<figcaption>{html.escape(context["volume"])}:{context["page"]} '
            f'{html.escape(", ".join(context["questionCodes"]))} '
            f' bbox={html.escape(str(context["bbox"]))}</figcaption></figure>'
            for context in entry["contexts"]
        )
        cards.append(
            f'<article class="card" data-asset="{asset}" data-contexts="{context_ids}">'
            f'<h2>{asset} <small>{entry["frequency"]} occurrences</small></h2>'
            f'<img class="glyph" src="assets/{asset}.png" alt="glyph {asset}">'
            f'<p>OCR candidate: <code>{candidate}</code> '
            f'<span>score={score or "n/a"}</span></p>'
            f'<section class="contexts">{contexts}</section>'
            f'<label>LaTeX/value <input class="value" value="{candidate}"></label>'
            f'<label>Reviewer <input class="reviewer" placeholder="name"></label>'
            f'<button data-action="approved">Approve</button>'
            f'<button data-action="diagram">Diagram-only</button>'
            f'<button data-action="unresolved">Unresolved</button>'
            f'<output class="state">unresolved</output></article>'
        )
    content = f"""<!doctype html>
<meta charset="utf-8">
<title>Glyph review queue</title>
<style>
body {{ font: 14px system-ui; margin: 2rem; background: #f5f5f5 }}
.toolbar {{ position: sticky; top: 0; background: white; padding: 1rem; z-index: 2 }}
.card {{ background: white; margin: 1rem 0; padding: 1rem; border: 1px solid #ccc }}
.glyph {{ max-width: 180px; max-height: 120px; image-rendering: pixelated; background: #eee }}
.contexts {{ display: flex; gap: .75rem; flex-wrap: wrap }}
figure {{ margin: 0; max-width: 480px }} figure img {{ max-width: 100%; border: 1px solid #888 }}
figcaption, small, output, span {{ color: #555 }} button {{ margin: .4rem }}
input {{ min-width: 24rem }} .approved {{ border-color: #198754 }}
.diagram {{ border-color: #6f42c1 }} .unresolved {{ border-color: #dc3545 }}
</style>
<div class="toolbar"><button id="download">Download glyph-mappings.v1.json</button>
<span>{len(entries)} globally deduplicated assets</span></div>
{"".join(cards)}
<script>
const mapping = {{}};
document.querySelectorAll('.card').forEach(card => {{
  const asset = card.dataset.asset;
  const state = card.querySelector('.state');
  const value = card.querySelector('.value');
  card.querySelectorAll('button[data-action]').forEach(button => button.onclick = () => {{
    const status = button.dataset.action;
    mapping[asset] = {{
      value: status === 'diagram' ? '' : value.value,
      format: 'latex',
      status,
      verifiedFrom: JSON.parse(card.dataset.contexts),
      reviewedBy: card.querySelector('.reviewer').value
    }};
    state.value = status;
    card.className = 'card ' + status;
  }});
}});
document.getElementById('download').onclick = () => {{
  const blob = new Blob([JSON.stringify(mapping, null, 2) + '\\n'],
    {{type: 'application/json'}});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'glyph-mappings.v1.json';
  a.click();
  URL.revokeObjectURL(a.href);
}};
</script>
"""
    output.write_text(content, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--contexts-per-asset", type=int, default=3)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=PROJECT_DIR / "seed" / "glyph-review",
    )
    args = parser.parse_args()
    if not 2 <= args.contexts_per_asset <= 3:
        raise ValueError("--contexts-per-asset must be 2 or 3")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    entries = build_queue(args.contexts_per_asset, args.output_dir)
    queue_path = args.output_dir / "review-queue.json"
    queue_path.write_text(
        json.dumps(
            {
                "version": 1,
                "generatedBy": "build_glyph_review_queue.py",
                "assetCount": len(entries),
                "entries": entries,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    render_html(entries, args.output_dir / "review-queue.html")
    print(json.dumps({"queue": str(queue_path), "assets": len(entries)}, indent=2))


if __name__ == "__main__":
    main()
