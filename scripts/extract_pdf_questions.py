import os
import sys
import re
import json
import pymupdf

sys.stdout.reconfigure(encoding='utf-8')

PROJECTS_DIR = r"c:\Users\shara\Desktop\Projects\Gate"
BASE_DIR = os.path.join(PROJECTS_DIR, "gategrind-study-hub")
SEED_DIR = os.path.join(BASE_DIR, "seed")
os.makedirs(SEED_DIR, exist_ok=True)

VOLUMES = [
    {"name": "vol1", "file": os.path.join(PROJECTS_DIR, "filter1_volume1.pdf"),
     "out_file": os.path.join(SEED_DIR, "questions_vol1.jsonl"), "expected": 1125},
    {"name": "vol2", "file": os.path.join(PROJECTS_DIR, "filter1_volume2.pdf"),
     "out_file": os.path.join(SEED_DIR, "questions_vol2.jsonl"), "expected": 1263},
    {"name": "vol3", "file": os.path.join(PROJECTS_DIR, "filter1_volume3.pdf"),
     "out_file": os.path.join(SEED_DIR, "questions_vol3.jsonl"), "expected": 1435},
]

Q_START_RE = re.compile(r'^(\d+\.\d+\.\d+)(?:\s+(.*))?$')
HEADER_RE = re.compile(
    r'^(?:(?P<topic>.+?):\s*)?GATE\s*(?P<paper>[A-Za-z&\s]+?)?\s*(?P<year>\d{4})(?:\s*\|\s*Set\s*(?P<set>\d+))?(?:.*?Question:\s*(?P<qnum>[^|\n]+))?',
    re.I
)
TAG_YEAR_RE = re.compile(r'gate(?:cse|it|da|ds-ai|ds&ai|da|ds_ai)?[-_]?(\d{4})', re.I)
YEAR_ANY_RE = re.compile(r'\b(19\d{2}|20\d{2})\b')


def parse_answer_keys(doc, start_page, end_page):
    """Parse answer key block returning {X.Y.Z: answer_obj}."""
    answers = {}
    text = ""
    for p in range(start_page - 1, min(end_page, len(doc))):
        text += doc[p].get_text("text") + "\n"

    lines = [l.strip() for l in text.split('\n') if l.strip()]
    i = 0
    while i < len(lines):
        if re.match(r'^\d+\.\d+\.\d+$', lines[i]):
            idx = lines[i]
            if i + 1 < len(lines):
                raw = lines[i + 1]
                answers[idx] = classify_answer(raw)
                i += 2
                continue
        i += 1
    return answers


def classify_answer(raw):
    ans = {"raw": raw, "type": "MCQ", "value": raw, "is_mta": False, "is_descriptive": False}
    if raw == "X":
        ans.update(type="MTA", is_mta=True)
    elif raw == "N/A":
        ans.update(type="DESCRIPTIVE", is_descriptive=True)
    elif ";" in raw:
        ans.update(type="MSQ", value=[x.strip() for x in raw.split(";")])
    elif ":" in raw:
        ans["type"] = "NAT"
        parts = raw.split(":")
        try:
            ans["min"], ans["max"] = float(parts[0].strip()), float(parts[1].strip())
        except ValueError:
            pass
    elif re.match(r'^-?\d+(\.\d+)?$', raw):
        ans["type"] = "NAT"
        try:
            v = float(raw)
            ans["min"], ans["max"] = v, v
        except ValueError:
            pass
    return ans


def parse_options(lines):
    options = {}
    clean_lines = []
    in_options = False
    current_key = None

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if not in_options:
                clean_lines.append(line)
            continue

        # Check inline options: e.g. "A. foo   B. bar   C. baz   D. qux"
        matches = list(re.finditer(r'(?:^|\s{2,})([A-E])\.\s*', line))
        if len(matches) >= 2:
            in_options = True
            for i, m in enumerate(matches):
                opt_key = m.group(1)
                start_idx = m.end()
                end_idx = matches[i+1].start() if i + 1 < len(matches) else len(line)
                opt_val = line[start_idx:end_idx].strip()
                options[opt_key] = opt_val
                current_key = opt_key
            continue

        # Check single option start: e.g. "A. text"
        single_m = re.match(r'^([A-E])\.\s*(.*)', stripped)
        if single_m and (single_m.group(1) == 'A' or in_options):
            in_options = True
            current_key = single_m.group(1)
            options[current_key] = single_m.group(2).strip()
            continue

        if in_options and current_key:
            if not re.match(r'^(?:gate[a-z0-9_-]|answer key|\d+\.\d+)', stripped, re.I):
                options[current_key] = (options[current_key] + " " + stripped).strip()
                continue
            else:
                in_options = False
                clean_lines.append(line)
        else:
            clean_lines.append(line)

    return options, clean_lines


def infer_marks(q_num, year, tags):
    """Explicit tag > Question number + year pattern > None."""
    for tag in tags:
        tl = tag.lower()
        if tl in ('two-marks', '2-marks'):
            return 2.0
        if tl in ('one-mark', '1-mark'):
            return 1.0
        if tl in ('5-marks', '5-mark'):
            return 5.0

    if q_num and year:
        try:
            m = re.match(r'(\d+)', str(q_num))
            if m:
                num = int(m.group(1))
                if year >= 2010:
                    return 1.0 if num <= 25 else 2.0
                elif year >= 2000:
                    return 1.0 if num <= 30 else 2.0
        except (ValueError, AttributeError):
            pass
    return None


def extract_metadata_from_tags(tags):
    difficulty = "normal"
    q_type = "MCQ"
    year = None
    for tag in tags:
        tl = tag.lower()
        if tl == 'easy':
            difficulty = 'easy'
        elif tl in ('hard', 'difficult'):
            difficulty = 'hard'
        elif tl == 'multiple-selects':
            q_type = 'MSQ'
        elif tl == 'numerical-answers':
            q_type = 'NAT'
        elif tl in ('descriptive', 'proof'):
            q_type = 'DESCRIPTIVE'
        ym = TAG_YEAR_RE.match(tag)
        if ym:
            year = int(ym.group(1))
    return difficulty, q_type, year


def check_page_has_diagram(doc, page_num, body_text):
    """Check if question has diagrams/figures."""
    # Check diagram keywords in body text
    diagram_kw = re.search(r'\b(shown in the figure|shown below|given below|following diagram|following graph|following circuit|in the table below|consider the figure|following truth table)\b', body_text, re.I)
    if diagram_kw:
        return True

    # Check for large non-icon images on page
    page = doc[page_num - 1]
    for img in page.get_images():
        xref = img[0]
        base_img = doc.extract_image(xref)
        w, h = base_img["width"], base_img["height"]
        if w >= 150 and h >= 80:
            # Check if this is the answer key button (which is roughly 93x93 or at right edge)
            rects = page.get_image_rects(xref)
            for r in rects:
                if r.x0 < 500: # Not the right margin answer key button
                    return True
    return False


def run_pipeline():
    grand = {"total": 0, "matched": 0, "with_options": 0, "with_year": 0, "marks_known": 0, "with_images": 0}

    for vol in VOLUMES:
        pdf_path = vol["file"]
        if not os.path.exists(pdf_path):
            print(f"Not found: {pdf_path}")
            continue

        print(f"\n{'='*60}")
        print(f"Processing {vol['name']}: {os.path.basename(pdf_path)}")
        print(f"{'='*60}")

        doc = pymupdf.open(pdf_path)
        toc = doc.get_toc()

        # Build chapters and topic sections mapping
        chapters = []
        current_ch = None
        topic_map = {}

        for level, title, page in toc:
            t = title.strip()
            if level == 1 and 'table of contents' not in t.lower() and 'contributors' not in t.lower():
                ch_name = re.sub(r'^\d+\s+', '', t)
                ch_name = re.sub(r'\s*\(\d+\)$', '', ch_name).strip()
                current_ch = {
                    "title": ch_name,
                    "start_page": page,
                    "ak_page": None,
                    "sections": []
                }
                chapters.append(current_ch)
            elif current_ch:
                if 'answer key' in t.lower():
                    current_ch["ak_page"] = page
                else:
                    sm = re.match(r'^(\d+\.\d+)\s+(.+?)\s*\((\d+)\)$', t)
                    if sm:
                        pfx = sm.group(1)
                        name = sm.group(2).strip()
                        count = int(sm.group(3))
                        current_ch["sections"].append({"prefix": pfx, "name": name, "count": count, "page": page})
                        topic_map[pfx] = {"topic_name": name, "chapter_name": current_ch["title"], "expected": count}

        for i in range(len(chapters)):
            if i + 1 < len(chapters):
                chapters[i]["end_page"] = chapters[i+1]["start_page"] - 1
            else:
                chapters[i]["end_page"] = len(doc)

        # Parse all answer keys for all chapters
        all_answers = {}
        for ch in chapters:
            if ch["ak_page"]:
                ch_answers = parse_answer_keys(doc, ch["ak_page"], ch["end_page"])
                all_answers.update(ch_answers)

        print(f"  Parsed {len(all_answers)} answer keys across chapters.")

        # Extract all questions
        vol_questions = []
        stats = {"total": 0, "matched": 0, "with_options": 0, "with_year": 0, "marks_known": 0, "with_images": 0}

        for ch in chapters:
            if not ch["sections"]:
                continue
            first_sec_page = ch["sections"][0]["page"]
            ak_page = ch["ak_page"]

            lines = []
            for pno in range(first_sec_page - 1, ak_page):
                page_text = doc[pno].get_text("text", sort=True)
                for l in page_text.split('\n'):
                    stripped = l.strip()
                    if pno + 1 == ak_page and stripped == "Answer Keys":
                        break
                    lines.append((pno + 1, l))
                else:
                    continue
                break

            current_q = None
            for pno, line in lines:
                stripped = line.strip()
                if not stripped:
                    if current_q:
                        current_q["raw_lines"].append(line)
                    continue

                m = Q_START_RE.match(stripped)
                if m:
                    code = m.group(1)
                    pfx = '.'.join(code.split('.')[:2])
                    if pfx in topic_map:
                        if current_q:
                            vol_questions.append(current_q)
                        rest = (m.group(2) or "").strip()
                        current_q = {
                            "code": code,
                            "page": pno,
                            "header_rest": rest,
                            "raw_lines": [],
                            "topic": topic_map[pfx]["topic_name"],
                            "chapter": topic_map[pfx]["chapter_name"]
                        }
                        continue

                if current_q:
                    current_q["raw_lines"].append(line)

            if current_q:
                vol_questions.append(current_q)

        # Now process each raw question into full question object
        with open(vol["out_file"], "w", encoding="utf-8") as out_f:
            for q in vol_questions:
                # Parse header
                rest = q["header_rest"]
                topic = q["topic"]
                paper = ""
                year = None
                gate_set = None
                q_num = None

                hm = HEADER_RE.search(rest)
                if hm:
                    if hm.group("paper"):
                        paper = hm.group("paper").strip()
                    if hm.group("year"):
                        year = int(hm.group("year"))
                    if hm.group("set"):
                        gate_set = f"Set {hm.group('set')}"
                    if hm.group("qnum"):
                        q_num = hm.group("qnum").strip()

                # Separate tags and body lines
                tags = []
                body_candidate_lines = []

                for l in q["raw_lines"]:
                    stripped = l.strip()
                    if not stripped:
                        body_candidate_lines.append(l)
                        continue

                    # Check for tags line
                    if re.match(r'^gate[a-z0-9_-]', stripped, re.I) and len(stripped.split()) <= 15:
                        tags = stripped.split()
                        continue

                    if stripped.startswith("Answer key"):
                        continue

                    body_candidate_lines.append(l)

                # Extract options from body lines
                options, clean_body_lines = parse_options(body_candidate_lines)
                body_text = '\n'.join(clean_body_lines).strip()

                # Fallbacks from tags
                diff_tag, qtype_tag, year_tag = extract_metadata_from_tags(tags)
                if not year:
                    year = year_tag
                if not year:
                    ym = YEAR_ANY_RE.search(rest)
                    if ym:
                        year = int(ym.group(1))

                # Answer match
                ans = all_answers.get(q["code"])
                q_type = ans["type"] if ans else qtype_tag
                if q_type == "MTA":
                    q_type = "MCQ"

                # Marks
                marks = infer_marks(q_num, year, tags)

                # Diagram check
                has_image = check_page_has_diagram(doc, q["page"], body_text)

                question_obj = {
                    "code": q["code"],
                    "volume": vol["name"],
                    "chapter": q["chapter"],
                    "topic": q["topic"],
                    "page": q["page"],
                    "year": year,
                    "paper": paper or "CSE",
                    "set": gate_set,
                    "q_num": q_num,
                    "question_type": q_type,
                    "marks": marks,
                    "difficulty": diff_tag,
                    "body": body_text,
                    "options": options,
                    "tags": tags,
                    "has_image": has_image,
                    "answer": ans,
                }

                out_f.write(json.dumps(question_obj, ensure_ascii=False) + "\n")

                stats["total"] += 1
                if ans:
                    stats["matched"] += 1
                if options:
                    stats["with_options"] += 1
                if year:
                    stats["with_year"] += 1
                if marks is not None:
                    stats["marks_known"] += 1
                if has_image:
                    stats["with_images"] += 1

        doc.close()

        t = stats["total"] or 1
        print(f"\n  RESULTS for {vol['name']}:")
        print(f"    Questions extracted:  {stats['total']} / {vol['expected']} expected ({100*stats['total']/vol['expected']:.1f}%)")
        print(f"    Answers matched:     {stats['matched']} ({100*stats['matched']/t:.1f}%)")
        print(f"    With parsed options:  {stats['with_options']} ({100*stats['with_options']/t:.1f}%)")
        print(f"    With year:           {stats['with_year']} ({100*stats['with_year']/t:.1f}%)")
        print(f"    With known marks:    {stats['marks_known']} ({100*stats['marks_known']/t:.1f}%)")
        print(f"    With diagrams/images: {stats['with_images']} ({100*stats['with_images']/t:.1f}%)")

        for k in grand:
            grand[k] += stats[k]

    gt = grand["total"] or 1
    print(f"\n{'='*60}")
    print(f"GRAND TOTAL ACROSS ALL VOLUMES:")
    print(f"  Questions: {grand['total']} / 3823 ({100*grand['total']/3823:.1f}%)")
    print(f"  Answers Matched: {grand['matched']} ({100*grand['matched']/gt:.1f}%)")
    print(f"  With Options: {grand['with_options']} ({100*grand['with_options']/gt:.1f}%)")
    print(f"  With Year: {grand['with_year']} ({100*grand['with_year']/gt:.1f}%)")
    print(f"  With Known Marks: {grand['marks_known']} ({100*grand['marks_known']/gt:.1f}%)")
    print(f"  With Diagrams: {grand['with_images']} ({100*grand['with_images']/gt:.1f}%)")


if __name__ == "__main__":
    run_pipeline()
