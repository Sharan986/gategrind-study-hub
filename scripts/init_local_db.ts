import { Database } from "bun:sqlite";
import fs from "node:fs";
import path from "node:path";

const BASE_DIR = path.resolve(import.meta.dir, "..");
const DB_PATH = path.join(BASE_DIR, "gategrind-local.db");
const SCHEMA_PATH = path.join(BASE_DIR, "migrations", "0001_initial_schema.sql");
const SEED_PATH = path.join(BASE_DIR, "seed", "seed_d1.sql");

console.log("Creating local SQLite database at:", DB_PATH);
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
}

const db = new Database(DB_PATH);
db.run("PRAGMA journal_mode = WAL;");
db.run("PRAGMA foreign_keys = ON;");

console.log("Applying schema...");
const schemaSql = fs.readFileSync(SCHEMA_PATH, "utf-8");
db.run(schemaSql);

console.log("Applying seed (3,823 questions)...");
const seedSql = fs.readFileSync(SEED_PATH, "utf-8");
db.run(seedSql);

const subCount = db.query("SELECT count(*) as count FROM subjects").get() as { count: number };
const topCount = db.query("SELECT count(*) as count FROM topics").get() as { count: number };
const qCount = db.query("SELECT count(*) as count FROM questions").get() as { count: number };

console.log(`Local DB initialized successfully:`);
console.log(`- Subjects: ${subCount.count}`);
console.log(`- Topics: ${topCount.count}`);
console.log(`- Questions: ${qCount.count}`);
console.log(`Database size: ${(fs.statSync(DB_PATH).size / (1024 * 1024)).toFixed(2)} MB`);
db.close();
