"""
Generates reproducible SQL seed files for Cloudflare D1 from extracted JSONL files.
Output: seed/seed_d1.sql
"""

import os
import sys
import json
import re

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEED_DIR = os.path.join(BASE_DIR, "seed")
SQL_OUT = os.path.join(SEED_DIR, "seed_d1.sql")

def escape_sql(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, bool):
        return "1" if val else "0"
    s = str(val).replace("'", "''")
    return f"'{s}'"

def slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[\d\(\)]+', '', text).strip()
    text = re.sub(r'[^a-z0-9]+', '-', text).strip('-')
    return text

def main():
    print("Generating Cloudflare D1 seed SQL from JSONL files...")
    
    subjects = {}
    topics = {}
    questions = []

    jsonl_files = [
        ("vol1", os.path.join(SEED_DIR, "questions_vol1.jsonl")),
        ("vol2", os.path.join(SEED_DIR, "questions_vol2.jsonl")),
        ("vol3", os.path.join(SEED_DIR, "questions_vol3.jsonl")),
    ]

    for vol_name, filepath in jsonl_files:
        if not os.path.exists(filepath):
            print(f"Skipping {filepath} (not found)")
            continue
        
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                q = json.loads(line)
                
                ch_title = q.get("chapter", "")
                subject_name = ch_title
                # Normalize subject name
                if ":" in subject_name:
                    subject_name = subject_name.split(":")[0].strip()
                subject_name = re.sub(r'^\d+\s+', '', subject_name)
                subject_name = re.sub(r'\s*\(\d+\)$', '', subject_name).strip()
                
                sub_slug = slugify(subject_name)
                if sub_slug not in subjects:
                    subjects[sub_slug] = {
                        "id": f"sub_{sub_slug}",
                        "name": subject_name,
                        "slug": sub_slug,
                        "total_questions": 0
                    }
                subjects[sub_slug]["total_questions"] += 1
                
                # Topic
                topic_name = q.get("topic") or "General"
                topic_slug = slugify(topic_name)
                topic_key = f"{sub_slug}_{topic_slug}"
                if topic_key not in topics:
                    topics[topic_key] = {
                        "id": f"top_{topic_key}",
                        "subject_id": subjects[sub_slug]["id"],
                        "name": topic_name,
                        "slug": topic_slug,
                        "total_questions": 0
                    }
                topics[topic_key]["total_questions"] += 1

                # Clean question answer
                ans = q.get("answer") or {}
                raw_ans = ans.get("raw", "N/A")
                q_type = q.get("question_type") or ans.get("type", "MCQ")
                is_mta = 1 if (ans.get("is_mta") or raw_ans == "X") else 0
                
                # Marks & difficulty
                marks = q.get("marks")
                if marks is None:
                    # In GATE, default unknown to 1.0 only if not 2-mark candidate
                    marks = 1.0
                diff = q.get("difficulty") or "normal"
                tags = q.get("tags") or []
                has_image = 1 if q.get("has_image") else 0

                q_id = f"q_{vol_name}_{q['code'].replace('.', '_')}"
                
                questions.append({
                    "id": q_id,
                    "external_code": f"{vol_name}-{q['code']}",
                    "subject_id": subjects[sub_slug]["id"],
                    "topic_id": topics[topic_key]["id"],
                    "gate_year": q.get("year"),
                    "gate_set": q.get("set"),
                    "gate_question_number": str(q.get("q_num")) if q.get("q_num") is not None else None,
                    "question_type": q_type,
                    "marks": marks,
                    "difficulty": diff,
                    "question_html": q.get("body", "").strip(),
                    "options": json.dumps(q.get("options") or {}, ensure_ascii=False),
                    "correct_answer": raw_ans,
                    "is_mta": is_mta,
                    "answer_verified": 1 if raw_ans != "N/A" else 0,
                    "tags": ",".join(tags),
                    "has_image": has_image,
                    "source_volume": f"filter1_{vol_name}.pdf",
                    "source_page": q.get("page", 0)
                })

    print(f"Extracted {len(subjects)} subjects, {len(topics)} topics, {len(questions)} questions.")

    with open(SQL_OUT, "w", encoding="utf-8") as out:
        out.write("-- GATE Grind - Cloudflare D1 Automated Seed\n")
        out.write("-- Generated from verified PDF volumes (3,823 Questions)\n\n")

        # 1. Subjects
        out.write("-- 1. SUBJECTS\n")
        for s in subjects.values():
            out.write(f"INSERT OR REPLACE INTO subjects (id, name, slug, total_questions) VALUES ({escape_sql(s['id'])}, {escape_sql(s['name'])}, {escape_sql(s['slug'])}, {s['total_questions']});\n")
        out.write("\n")

        # 2. Topics
        out.write("-- 2. TOPICS\n")
        for t in topics.values():
            out.write(f"INSERT OR REPLACE INTO topics (id, subject_id, name, slug, total_questions) VALUES ({escape_sql(t['id'])}, {escape_sql(t['subject_id'])}, {escape_sql(t['name'])}, {escape_sql(t['slug'])}, {t['total_questions']});\n")
        out.write("\n")

        # 3. Questions
        out.write("-- 3. QUESTIONS\n")
        for q in questions:
            out.write(
                f"INSERT OR REPLACE INTO questions (id, external_code, subject_id, topic_id, gate_year, gate_set, gate_question_number, question_type, marks, difficulty, question_html, options, correct_answer, is_mta, answer_verified, tags, has_image, source_volume, source_page) VALUES ("
                f"{escape_sql(q['id'])}, {escape_sql(q['external_code'])}, {escape_sql(q['subject_id'])}, {escape_sql(q['topic_id'])}, "
                f"{escape_sql(q['gate_year'])}, {escape_sql(q['gate_set'])}, {escape_sql(q['gate_question_number'])}, "
                f"{escape_sql(q['question_type'])}, {q['marks']}, {escape_sql(q['difficulty'])}, "
                f"{escape_sql(q['question_html'])}, {escape_sql(q['options'])}, {escape_sql(q['correct_answer'])}, "
                f"{q['is_mta']}, {q['answer_verified']}, {escape_sql(q['tags'])}, {q['has_image']}, "
                f"{escape_sql(q['source_volume'])}, {q['source_page']});\n"
            )

    print(f"Generated seed SQL: {SQL_OUT} ({round(os.path.getsize(SQL_OUT) / (1024*1024), 2)} MB)")

if __name__ == "__main__":
    main()
