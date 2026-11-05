"""Build a page-coordinate recovery queue for invalid option records."""

from __future__ import annotations

import argparse
import html
import json
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
    source = PROJECT_DIR / "seed" / f"questions_{volume}.jsonl"
    with source.open(encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def invalid_option_reasons(question: dict[str, Any]) -> list[str]:
    if question.get("question_type") not in {"MCQ", "MSQ"}:
        return []
    options = question.get("options") or {}
    answer = question.get("answer") or {}
    values = answer.get("value", [])
    if isinstance(values, str):
        values = [value.strip() for value in values.split(";")]
    reasons = []
    if len(options) < 4:
        reasons.append(f"expected four options, found {len(options)}")
    invalid = [value for value in values if value not in options]
    if invalid:
        reasons.append(f"answer references missing IDs: {invalid}")
    if any(not str(value).strip() or str(value).strip() in {"B.", "C.", "D."} for value in options.values()):
        reasons.append("option text is empty or label-only")
    return reasons


def source_pages_for_question(
    questions: list[dict[str, Any]], index: int
) -> list[int]:
    """Return all pages that may contain this question before the next header.

    The extractor records a question's start page.  Its options can continue
    onto the following page, so a one-page crop is not sufficient evidence for
    option recovery.  Including the next start page is intentional: the target
    options may precede the next header on that page, and the reviewer can see
    the boundary rather than silently losing those options.
    """
    start = int(questions[index]["page"])
    if index + 1 >= len(questions):
        return [start]
    next_start = int(questions[index + 1]["page"])
    return list(range(start, max(start, next_start) + 1))


def triage_categories(question: dict[str, Any], reasons: list[str]) -> list[str]:
    categories = []
    body = str(question.get("body", "")).lower()
    if question.get("has_image") or any(
        marker in body
        for marker in ("figure", "diagram", "circuit", "graph", "shown below")
    ):
        categories.append("image-diagram-dependent")
    options = question.get("options") or {}
    labels = set(options)
    if len(options) < 4 and labels and labels != {"A", "B", "C", "D"}:
        categories.append("merged-multi-column")
    if "option text is empty or label-only" in reasons:
        categories.append("missing-labels-text")
    if any("answer references missing IDs" in reason for reason in reasons):
        categories.append("option-order-ambiguity")
    return categories or ["missing-labels-text"]


def geometry_option_candidates(words: list[dict[str, Any]]) -> dict[str, str]:
    """Group words between visible A-D labels without inventing missing text."""
    labels = []
    for index, word in enumerate(words):
        token = word["text"].strip().upper().rstrip(".)")
        if token in {"A", "B", "C", "D"}:
            labels.append((index, token, word["bbox"]))
    if not labels:
        return {}
    rows: list[list[tuple[int, str, list[float]]]] = []
    for label in sorted(labels, key=lambda item: item[2][1]):
        if not rows or abs(label[2][1] - rows[-1][0][2][1]) > 5:
            rows.append([label])
        else:
            rows[-1].append(label)
    candidates: dict[str, str] = {}
    for row in rows:
        row.sort(key=lambda item: item[2][0])
        for row_index, (word_index, label, bbox) in enumerate(row):
            x_end = (
                row[row_index + 1][2][0]
                if row_index + 1 < len(row)
                else float("inf")
            )
            parts = [
                item["text"]
                for item in words
                if item["bbox"][0] >= bbox[2]
                and item["bbox"][0] < x_end
                and abs(item["bbox"][1] - bbox[1]) <= 18
                and item["text"].strip().upper().rstrip(".)")
                not in {"A", "B", "C", "D"}
            ]
            candidates[label] = " ".join(parts).strip()
    return candidates


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=PROJECT_DIR / "seed" / "option-recovery-queue.json",
    )
    parser.add_argument(
        "--crops-dir",
        type=Path,
        default=PROJECT_DIR / "seed" / "option-recovery-crops",
    )
    parser.add_argument(
        "--keys-file",
        type=Path,
        help="Optional JSON file containing {\"keys\": [\"vol2:1.43.5\", ...]}.",
    )
    parser.add_argument(
        "--source-links",
        type=Path,
        default=PROJECT_DIR / "seed" / "question-source-links.v1.json",
    )
    args = parser.parse_args()
    source_links = (
        {entry["key"]: entry["sourceUrl"] for entry in json.loads(args.source_links.read_text(encoding="utf-8"))["entries"]}
        if args.source_links.exists() else {}
    )
    requested_keys = None
    if args.keys_file:
        requested_keys = set(json.loads(args.keys_file.read_text(encoding="utf-8"))["keys"])
    entries = []
    for volume, pdf_path in VOLUMES.items():
        document = pymupdf.open(pdf_path)
        try:
            questions = load_questions(volume)
            for index, question in enumerate(questions):
                key = f'{volume}:{question["code"]}'
                if requested_keys is not None and key not in requested_keys:
                    continue
                reasons = invalid_option_reasons(question)
                if not reasons:
                    continue
                page_number = int(question["page"])
                source_pages = source_pages_for_question(questions, index)
                crop_paths = []
                words = []
                for source_page in source_pages:
                    page = document[source_page - 1]
                    suffix = "" if source_page == page_number else f"-p{source_page}"
                    crop_path = args.crops_dir / (
                        f"{volume}-{question['code'].replace('.', '_')}{suffix}.png"
                    )
                    crop_path.parent.mkdir(parents=True, exist_ok=True)
                    # The first-page crop already exists for the legacy queue.
                    # Reuse it; only continuation pages need rendering.
                    if not crop_path.exists():
                        page.get_pixmap(
                            matrix=pymupdf.Matrix(1.5, 1.5), alpha=False
                        ).save(crop_path)
                    crop_paths.append(
                        str(crop_path.relative_to(PROJECT_DIR)).replace("\\", "/")
                    )
                    words.extend(
                        {
                            "text": word[4],
                            "bbox": [round(value, 2) for value in word[:4]],
                            "block": word[5],
                            "line": word[6],
                            "page": source_page,
                        }
                        for word in page.get_text("words")
                    )
                geometry_options = geometry_option_candidates(words)
                categories = triage_categories(question, reasons)
                entries.append(
                    {
                        "key": key,
                        "volume": volume,
                        "code": question["code"],
                        "page": page_number,
                        "sourceUrl": source_links.get(key),
                        "sourcePages": source_pages,
                        "questionType": question["question_type"],
                        "answer": question.get("answer"),
                        "extractedOptions": question.get("options", {}),
                        "reasons": reasons,
                        "triage": categories,
                        "geometryOptions": geometry_options,
                        "recovery": {
                            "status": (
                                "visual-preserved"
                                if "image-diagram-dependent" in categories
                                else "needsReview"
                            ),
                            "options": {},
                            "verifiedFrom": [],
                            "reviewedBy": "",
                        },
                        "pageCrop": crop_paths[0],
                        "pageCrops": crop_paths,
                        "pageWords": words,
                        "status": (
                            "visual-preserved"
                            if "image-diagram-dependent" in categories
                            else "needsReview"
                        ),
                    }
                )
        finally:
            document.close()
    args.output.write_text(
        json.dumps(
            {
                "version": 1,
                "generatedBy": "build_option_recovery_queue.py",
                "entryCount": len(entries),
                "entries": sorted(
                    entries,
                    key=lambda entry: (
                        entry["status"] == "visual-preserved",
                        "merged-multi-column" not in entry["triage"],
                        entry["volume"],
                        entry["page"],
                    ),
                ),
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    text_entries = sorted(
        (entry for entry in entries if entry["status"] != "visual-preserved"),
        key=lambda entry: (
            "merged-multi-column" not in entry["triage"],
            entry["volume"],
            entry["page"],
        ),
    )
    text_queue_path = args.output.with_name("option-text-recovery-queue.json")
    text_queue_path.write_text(
        json.dumps(
            {
                "version": 1,
                "generatedBy": "build_option_recovery_queue.py",
                "entryCount": len(text_entries),
                "entries": text_entries,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    render_review_html(
        text_entries,
        args.output.with_name("option-text-recovery-queue.html"),
    )
    print(
        json.dumps(
            {
                "output": str(args.output),
                "entries": len(entries),
                "textRecoveryEntries": len(text_entries),
                "visualPreservedEntries": len(entries) - len(text_entries),
            },
            indent=2,
        )
    )


def render_review_html(entries: list[dict[str, Any]], output: Path) -> None:
    cards = []
    for entry in entries:
        code = html.escape(entry["code"])
        key = html.escape(entry["key"], quote=True)
        source_url = entry.get("sourceUrl")
        extracted = html.escape(json.dumps(entry["extractedOptions"], indent=2))
        categories = html.escape(", ".join(entry["triage"]))
        answer = html.escape(json.dumps(entry["answer"]))
        source = f'{entry["volume"]}:{entry["page"]}:{entry["code"]}'
        cards.append(
            f'<article class="card" data-key="{key}" '
            f'data-source="{html.escape(source)}">'
            f'<h2>{code} <small>{html.escape(entry["volume"])} page {entry["page"]}</small></h2>'
            + (f'<p><a href="{html.escape(source_url, quote=True)}" target="_blank" rel="noopener noreferrer">Open original question</a></p>' if source_url else '')
            +
            f'<p><b>Triage:</b> {categories}</p>'
            f'<p><b>Answer key:</b> <code>{answer}</code></p>'
            + "".join(
                f'<img src="{html.escape(crop.removeprefix("seed/"))}" '
                f'alt="source page {page}">'
                for page, crop in zip(
                    entry.get("sourcePages", [entry["page"]]),
                    entry.get("pageCrops", [entry["pageCrop"]]),
                )
            )
            + f'<details><summary>Extracted options</summary><pre>{extracted}</pre></details>'
            f'<details><summary>Geometry candidates</summary><pre>'
            f'{html.escape(json.dumps(entry["geometryOptions"], indent=2))}</pre></details>'
            f'<div class="options">'
            + "".join(
                f'<label>{label} <textarea data-option="{label}"></textarea></label>'
                for label in "ABCDE"
            )
            + '</div><label>Reviewer <input class="reviewer"></label> '
            '<button data-approve>Approve source recovery</button>'
            '<output>needsReview</output></article>'
        )
    content = """<!doctype html>
<meta charset="utf-8"><title>Option recovery queue</title>
<style>
body{font:14px system-ui;margin:2rem;background:#f5f5f5}
.card{background:white;border:1px solid #ccc;padding:1rem;margin:1rem 0}
.card img{max-width:100%;max-height:700px;border:1px solid #888}
.options{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}
textarea{width:95%;height:4rem} input{min-width:18rem} button{margin:.75rem}
output{color:#555}.approved{border-color:#198754}
</style>
<button id="download">Download option-mappings.v1.json</button>
""" + "\n".join(cards) + r"""
<script>
const mappings = {};
document.querySelectorAll('.card').forEach(card => {
  card.querySelector('[data-approve]').onclick = () => {
    const options = {};
    card.querySelectorAll('[data-option]').forEach(input => {
      const value = input.value.trim();
      if (value || input.dataset.option !== 'E') options[input.dataset.option] = value;
    });
    if (Object.values(options).some(value => !value)) {
      card.querySelector('output').value = 'all A-D option text is required; E is optional';
      return;
    }
    mappings[card.dataset.key] = {
      status: 'approved', options, verifiedFrom: [card.dataset.source],
      sourceUrl: card.querySelector('a[href]')?.href,
      reviewedBy: card.querySelector('.reviewer').value.trim()
    };
    if (!mappings[card.dataset.key].reviewedBy) {
      delete mappings[card.dataset.key];
      card.querySelector('output').value = 'reviewer is required';
      return;
    }
    card.className = 'card approved';
    card.querySelector('output').value = 'approved';
  };
});
document.getElementById('download').onclick = () => {
  const blob = new Blob([JSON.stringify(mappings, null, 2) + '\n'],
    {type:'application/json'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'option-mappings.v1.json';
  link.click();
  URL.revokeObjectURL(link.href);
};
</script>
"""
    output.write_text(content, encoding="utf-8")


if __name__ == "__main__":
    main()
