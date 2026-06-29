import "dotenv/config";

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
const ledgerTables = [
  "CrowdlineFill",
  "CrowdlinePosition",
  "CrowdlineOrder",
  "CreditLedgerEntry",
  "WalletAccount",
];

function tableExists(tableName) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName);

  return Boolean(row);
}

function tableIsEmpty(tableName) {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get();

  return row.count === 0;
}

function columnExists(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();

  return columns.some((column) => column.name === columnName);
}

function addColumnIfMissing(tableName, columnName, definition) {
  if (!tableExists(tableName) || columnExists(tableName, columnName)) {
    return;
  }

  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

function rebuildEmptyLedgerTables() {
  const existingLedgerTables = ledgerTables.filter(tableExists);

  if (
    existingLedgerTables.length === 0 ||
    existingLedgerTables.some((tableName) => !tableIsEmpty(tableName))
  ) {
    return;
  }

  db.exec("PRAGMA foreign_keys = OFF;");

  try {
    for (const tableName of existingLedgerTables) {
      db.exec(`DROP TABLE ${tableName};`);
    }
  } finally {
    db.exec("PRAGMA foreign_keys = ON;");
  }
}

function prepareExistingLedgerTables() {
  rebuildEmptyLedgerTables();

  for (const tableName of ledgerTables) {
    addColumnIfMissing(tableName, "deletedAt", "DATETIME");
  }
}

try {
  prepareExistingLedgerTables();
  db.exec(initSql);
  console.log(`Initialized Crowdline SQLite schema at ${databasePath}`);
} finally {
  db.close();
}
