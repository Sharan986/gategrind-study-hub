"""Validate glyph mappings and candidate question data before release."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any

import pymupdf


PROJECT_DIR = Path(__file__).resolve().parents[1]
VOLUMES = ("vol1", "vol2", "vol3")
SOURCE_DIR = PROJECT_DIR.parent
SOURCE_PDFS = {
    "vol1": SOURCE_DIR / "filter1_volume1.pdf",
    "vol2": SOURCE_DIR / "filter1_volume2.pdf",
    "vol3": SOURCE_DIR / "filter1_volume3.pdf",
}
REGRESSIONS = ("3.12.13", "3.12.15")
PAGE_FURNITURE_RE = (
    "Practice Test:",
    "Answer Key",
    "GATE Overflow",
)


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_mapping(mapping: dict[str, Any], assets: set[str]) -> list[str]:
    errors = []
    for asset in sorted(assets):
        record = mapping.get(asset)
        if not isinstance(record, dict):
            errors.append(f"{asset}: missing mapping")
            continue
        if record.get("status") not in {"approved", "diagram", "unresolved"}:
            errors.append(f"{asset}: invalid status")
        if record.get("status") == "approved" and not record.get("value"):
            errors.append(f"{asset}: approved mapping has no value")
    for asset in mapping:
        if asset.startswith("_") or asset in assets:
            continue
        errors.append(f"{asset}: mapping is not present in the audit manifests")
    return errors


def classify_release(
    mapping: dict[str, Any],
    assets: set[str],
    question_errors: dict[str, list[str]],
) -> dict[str, Any]:
    unresolved = [
        asset
        for asset in assets
        if mapping.get(asset, {}).get("status") == "unresolved"
    ]
    return {
        "glyph-complete": not unresolved,
        "question-complete": not question_errors,
        "unresolvedAssets": unresolved,
    }


def validate_question(question: dict[str, Any]) -> list[str]:
    errors = []
    kind = question.get("question_type")
    options = question.get("options") or {}
    answer = question.get("answer") or {}
    if kind in {"MCQ", "MSQ"}:
        raw_answer = str(answer.get("raw", "")).strip()
        body = str(question.get("body", ""))
        tags = {str(tag).lower() for tag in question.get("tags", [])}
        source_non_choice = (
            answer.get("is_mta")
            or raw_answer == "TBA"
            or raw_answer in {"True", "False"}
            or "true-false" in tags
            or "numerical-answers" in tags
            or ("true or false" in body.lower() and raw_answer in {"True", "False"})
            or (
                ";" in raw_answer
                and all(":" in part for part in raw_answer.split(";"))
                and all(
                    part.replace(":", "").replace(".", "").replace("-", "").strip().isdigit()
                    for part in raw_answer.split(";")
                )
            )
        )
        option_status = question.get("optionRecovery", {}).get("status")
        visual_preserved = option_status in {"visual-preserved", "source-preserved"}
        if not options and not visual_preserved and not source_non_choice:
            errors.append("MCQ/MSQ has no options")
        values = answer.get("value", [])
        if isinstance(values, str):
            values = [value.strip() for value in values.split(";")]
        invalid = [value for value in values if value not in options]
        if invalid and not visual_preserved and not source_non_choice:
            errors.append(f"answer references invalid option IDs: {invalid}")
        recovery = question.get("optionRecovery")
        if recovery and recovery.get("status") in {"approved", "source-preserved"}:
            if not recovery.get("verifiedFrom") or not recovery.get("reviewedBy"):
                errors.append("approved option recovery lacks source traceability")
        if recovery and recovery.get("status") == "visual-preserved":
            if not recovery.get("sourceCrop"):
                errors.append("visual option recovery lacks source crop")
    recovery = question.get("glyphRecovery", {})
    runs = recovery.get("runs", [])
    glyph_runs = [run for run in runs if run.get("kind") == "glyph"]
    if any(not run.get("text") for run in glyph_runs):
        errors.append("blank run remains for an embedded glyph")
    visual = question.get("visualPreservation")
    if visual:
        if visual.get("status") != "visual-preserved" or not visual.get("sourceCrop"):
            errors.append("invalid visual preservation record")
    body = str(question.get("body", ""))
    if any(marker.lower() in body.lower() for marker in PAGE_FURNITURE_RE):
        errors.append("page-furniture leakage in body")
    return errors


def question_fidelity(question: dict[str, Any], errors: list[str]) -> dict[str, Any]:
    recovery = question.get("glyphRecovery", {})
    glyph_runs = [
        run for run in recovery.get("runs", []) if run.get("kind") == "glyph"
    ]
    return {
        "volume": question.get("volume"),
        "code": question.get("code"),
        "page": question.get("page"),
        "glyphCount": len(glyph_runs),
        "approvedGlyphs": sum(run.get("status") == "approved" for run in glyph_runs),
        "diagramGlyphs": sum(run.get("status") == "diagram" for run in glyph_runs),
        "unresolvedGlyphs": sum(
            run.get("status") == "unresolved" for run in glyph_runs
        ),
        "optionCount": len(question.get("options") or {}),
        "gateErrors": errors,
        "status": "pass" if not errors else "fail",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--mapping",
        type=Path,
        default=PROJECT_DIR / "seed" / "glyph-mappings.v2.json",
    )
    parser.add_argument(
        "--candidate",
        type=Path,
        default=PROJECT_DIR / "seed" / "questions-recovered-candidate.json",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=PROJECT_DIR / "seed" / "glyph-fidelity-report.json",
    )
    args = parser.parse_args()
    mapping = read_json(args.mapping)
    assets = set()
    for volume in VOLUMES:
        manifest = read_json(PROJECT_DIR / "seed" / f"glyph-audit-{volume}.json")
        assets.update(manifest["summary"]["occurrence_counts"])
    errors = validate_mapping(mapping, assets)
    questions = read_json(args.candidate)
    by_key = {
        f'{question["volume"]}:{question["code"]}': question for question in questions
    }
    question_errors = {}
    fidelity = []
    for question in questions:
        current = validate_question(question)
        fidelity.append(question_fidelity(question, current))
        if current:
            question_errors[f'{question["volume"]}:{question["code"]}'] = current
    errors.extend(
        f"{code}: {message}"
        for code, messages in question_errors.items()
        for message in messages
    )
    for code in REGRESSIONS:
        question = next(
            (item for item in questions if item.get("code") == code),
            None,
        )
        if question is None:
            errors.append(f"{code}: regression question missing")
        elif not question.get("page") or not question["glyphRecovery"].get("coordinateText"):
            errors.append(f"{code}: source page reconstruction is empty")
        else:
            document = pymupdf.open(SOURCE_PDFS[question["volume"]])
            try:
                source_text = document[question["page"] - 1].get_text("text")
            finally:
                document.close()
            if source_text != question["glyphRecovery"].get("sourcePageText"):
                errors.append(f"{code}: reconstructed source page differs from PDF")
    golden_path = PROJECT_DIR / "seed" / "golden-questions.v1.json"
    golden = read_json(golden_path)
    for golden_question in golden["questions"]:
        if not any(
            question.get("code") == golden_question["code"]
            for question in questions
        ):
            errors.append(f"{golden_question['code']}: golden question missing")
    report = {
        "version": 1,
        "mapping": str(args.mapping),
        "candidate": str(args.candidate),
        "assetCount": len(assets),
        "mappedAssetCount": sum(asset in mapping for asset in assets),
        "questionCount": len(questions),
        "questionsWithErrors": len(question_errors),
        "questionErrorCount": len(errors),
        "status": "pass" if not errors else "fail",
        "errors": errors,
        "releaseClasses": classify_release(mapping, assets, question_errors),
        "goldenSet": golden,
        "questionFidelity": fidelity,
        "fidelityByVolume": dict(
            Counter(question["volume"] for question in questions)
        ),
    }
    args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
