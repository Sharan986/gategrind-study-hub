"""Build a source-linked CSE/IT bank and release only complete records.

The source PDFs and the extracted baseline are inputs. This script never edits
either. Unresolved records remain in the bank with explicit review reasons.
"""

from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "data" / "cse-it-question-bank.v1.json"
QUALITY_OUT = ROOT / "src" / "data" / "cse-it-question-quality.v1.json"
ID = re.compile(r"^q_(vol[123])_(\d+(?:_\d+)+)$")


def read(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def key_for(question: dict) -> str:
    match = ID.fullmatch(question["id"])
    if not match:
        raise ValueError(f"Unrecognized baseline question ID: {question['id']}")
    return f"{match[1]}:{match[2].replace('_', '.')}"


def apply_repair(question: dict, repair: dict) -> dict:
    result = dict(question)
    if repair.get("reviewStatus") != "approved":
        return result
    if "bodyPatch" in repair:
        result["body"] = repair["bodyPatch"]
    else:
        body = result.get("body", "")
        for replacement in repair.get("bodyReplacements", []):
            old = replacement.get("from", "")
            if not old or old not in body:
                raise ValueError(f"Approved body replacement cannot be applied to {question['id']}")
            body = body.replace(old, replacement["to"])
        result["body"] = body
    if "optionPatch" in repair:
        result["options"] = [
            {"id": option_id, "text": text}
            for option_id, text in repair["optionPatch"].items()
        ]
    if "codePatch" in repair:
        result["code"] = repair["codePatch"]
    return result


def structural_issues(question: dict, audit: dict) -> list[str]:
    issues = []
    if audit["body"] != "complete" or not question.get("body", "").strip():
        issues.append("body")
    if audit["diagram"] != "none":
        issues.append("diagram")
    if audit["code"] == "missing":
        issues.append("code")
    if question["type"] in ("MCQ", "MSQ"):
        options = question.get("options") or []
        ids = [option.get("id") for option in options]
        answers = question.get("answer")
        if (
            ids not in (["A", "B", "C", "D"], ["A", "B", "C", "D", "E"])
            or any(not isinstance(option.get("text"), str) or not option["text"].strip() for option in options)
            or not isinstance(answers, list)
            or not answers
            or any(answer not in ids for answer in answers)
            or (question["type"] == "MCQ" and len(answers) != 1)
            or audit["options"] != "complete"
        ):
            issues.append("options-or-answer")
    elif question["type"] == "NAT":
        answer = question.get("answer")
        if not isinstance(answer, dict) or not all(
            isinstance(answer.get(bound), (int, float)) and not isinstance(answer.get(bound), bool)
            for bound in ("min", "max")
        ) or answer["min"] > answer["max"]:
            issues.append("answer")
    else:
        issues.append("question-type")
    if any(marker in question.get("body", "").lower() for marker in ("practice tests:", "answer key", "gate overflow")):
        issues.append("page-furniture")
    return issues


def main() -> None:
    baseline = read(ROOT / "src" / "data" / "d1-questions.json")
    source = read(ROOT / "seed" / "question-source-links.v1.json")
    audit = read(ROOT / "seed" / "question-field-audit.v1.json")
    repairs = read(ROOT / "seed" / "question-repairs.v1.json")
    origins = {entry["key"]: entry for entry in source["entries"]}
    audits = {entry["key"]: entry for entry in audit["entries"]}
    extracted = {}
    for volume in ("vol1", "vol2", "vol3"):
        with (ROOT / "seed" / f"questions_{volume}.jsonl").open(encoding="utf-8") as handle:
            for line in handle:
                item = json.loads(line)
                extracted[f'{volume}:{item["code"]}'] = item
    if len(baseline) != len(origins) or len(origins) != len(audits) or len(set(origins)) != len(origins):
        raise ValueError("Baseline, source link, and audit keys do not align")
    if len(extracted) != len(baseline):
        raise ValueError("Extracted question identities do not match the baseline")
    for volume in ("vol1", "vol2", "vol3"):
        pdf = ROOT.parent / f"filter1_volume{volume[-1]}.pdf"
        digest = hashlib.sha256(pdf.read_bytes()).hexdigest()
        if digest != source["sourcePdfSha256"][volume]:
            raise ValueError(f"Source PDF hash changed: {pdf}")

    records = []
    seen = set()
    for raw in baseline:
        key = key_for(raw)
        if key in seen or key not in origins or key not in audits:
            raise ValueError(f"Duplicate or unmapped baseline key: {key}")
        seen.add(key)
        origin = origins[key]
        if origin["sourcePaper"] not in ("CSE", "IT"):
            continue
        question = apply_repair(raw, repairs.get(key, {}))
        question["sourcePaper"] = origin["sourcePaper"]
        question["sourceUrl"] = origin["sourceUrl"]
        issues = structural_issues(question, audits[key])
        source_answer = (extracted[key].get("answer") or {}).get("value")
        if question["type"] in ("MCQ", "MSQ"):
            expected = [part.strip() for part in re.split(r"[;,]", source_answer)] if isinstance(source_answer, str) else source_answer
            if not isinstance(expected, list) or sorted(expected) != sorted(question.get("answer", [])):
                issues.append("source-answer-mismatch")
        elif source_answer in (None, "", "N/A", "TBA"):
            issues.append("source-answer-unverified")
        records.append({
            "key": key,
            "source": {"volume": origin["volume"], "page": origin["page"], "url": origin["sourceUrl"]},
            "quality": {"status": "structurally-complete" if not issues else "needs-review", "issues": issues},
            "question": question,
        })
    if len(seen) != len(baseline):
        raise ValueError("Baseline identity count changed")
    counts = Counter(record["quality"]["status"] for record in records)
    payload = {
        "version": 1,
        "sourcePdfSha256": source["sourcePdfSha256"],
        "sourceBaselineSha256": hashlib.sha256((ROOT / "src" / "data" / "d1-questions.json").read_bytes()).hexdigest(),
        "scope": ["CSE", "IT"],
        "counts": {"total": len(records), "structurallyComplete": counts["structurally-complete"], "needsReview": counts["needs-review"]},
        "records": records,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    QUALITY_OUT.write_text(json.dumps({
        record["question"]["id"]: record["quality"] for record in records
    }, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps(payload["counts"], indent=2))


if __name__ == "__main__":
    main()
