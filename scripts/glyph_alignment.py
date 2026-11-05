"""Conservative identity and coordinate-to-text alignment helpers."""

from __future__ import annotations

from pathlib import Path
from typing import Any


def mapping_identity_errors(asset: str, record: dict[str, Any]) -> list[str]:
    """Return errors that make an approved mapping ineligible for application."""
    if record.get("status") != "approved":
        return []
    errors = []
    if not record.get("value"):
        errors.append("approved mapping has no value")
    evidence = record.get("contextEvidence", [])
    if not evidence:
        errors.append("approved mapping has no contextEvidence")
    for path in evidence:
        stem = Path(path).stem.rsplit("-", 1)[0]
        if stem != asset:
            errors.append(f"context evidence {path!r} does not match asset {asset}")
    if not record.get("verifiedFrom"):
        errors.append("approved mapping has no verifiedFrom")
    return errors


def _overlap(a: list[float], b: list[float], tolerance: float = 1.0) -> bool:
    return a[1] <= b[3] + tolerance and a[3] >= b[1] - tolerance


def anchored_token(
    field: str,
    asset: str,
    glyph_run: dict[str, Any],
    text_runs: list[dict[str, Any]],
    region: list[float] | None,
) -> dict[str, str] | None:
    """Return a replacement only for one unique token bracketed by text anchors."""
    if region is None:
        return None
    bbox = glyph_run.get("bbox")
    if not bbox or not (
        region[0] <= bbox[0] and bbox[2] <= region[2]
        and region[1] <= bbox[1] and bbox[3] <= region[3]
    ):
        return None
    token = f"[unresolved:{asset}]"
    if field.count(token) != 1:
        return None
    candidates = [
        run for run in text_runs
        if run.get("kind") == "text"
        and run.get("text", "").strip()
        and _overlap(run["bbox"], bbox)
        and region[0] <= run["bbox"][0] <= region[2]
    ]
    before = [run for run in candidates if run["bbox"][2] <= bbox[0]]
    after = [run for run in candidates if run["bbox"][0] >= bbox[2]]
    if len(before) != 1 or len(after) != 1:
        return None
    return {
        "from": token,
        "to": "",
        "before": before[0]["text"].strip(),
        "after": after[0]["text"].strip(),
    }
