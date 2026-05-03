import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";

const cwd = process.cwd();
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

if (!databaseUrl.startsWith("file:")) {
  console.log("Skipping SQLite init because DATABASE_URL is not file: based.");
  process.exit(0);
}

const rawPath = databaseUrl.slice("file:".length);
const databasePath = path.isAbsolute(rawPath)
  ? rawPath
  : path.resolve(cwd, rawPath);
const initSqlPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../prisma/init.sql",
);

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
const initSql = fs.readFileSync(initSqlPath, "utf8");

try {
  db.exec(initSql);
  console.log(`Initialized SQLite schema at ${databasePath}`);
} finally {
  db.close();
}
