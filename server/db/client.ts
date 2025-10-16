import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const DB_PATH = process.env.DATABASE_URL?.trim() || "./data/app.db";

// ensure folder exists
const abs = path.resolve(process.cwd(), DB_PATH);
fs.mkdirSync(path.dirname(abs), { recursive: true });

export const sqlite = new Database(abs);
export const db = drizzle(sqlite);

export function exec(sql: string) {
  try { sqlite.exec(sql); } catch {}
}
