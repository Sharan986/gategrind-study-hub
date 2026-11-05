import json
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "seed" / "question-repairs.v1.json"

def pairs_hook(pairs):
    out = {}
    for key, value in pairs:
        if key not in out:
            out[key] = value
            continue
        old = out[key]
        if not isinstance(old, dict) or not isinstance(value, dict):
            out[key] = value
            continue
        old_approved = old.get("reviewStatus") == "approved"
        new_approved = value.get("reviewStatus") == "approved"
        if new_approved and not old_approved:
            merged = {**old, **value}
        elif old_approved and not new_approved:
            merged = {**value, **old}
        else:
            merged = {**old, **value}
        out[key] = merged
    return out

data = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=pairs_hook)
path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"wrote {len(data)} unique repair keys")
