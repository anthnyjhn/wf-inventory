import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "inventory.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- tracking = 'roll'  -> stock is individual tagged items (boxes/rolls), each measured in this unit
-- tracking = 'count' -> stock is a simple quantity in this unit (sheets, pieces...)
CREATE TABLE IF NOT EXISTS units (
  id       INTEGER PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE,
  abbr     TEXT NOT NULL,
  tracking TEXT NOT NULL CHECK (tracking IN ('roll', 'count'))
);

CREATE TABLE IF NOT EXISTS materials (
  id          INTEGER PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT '',
  unit_id     INTEGER NOT NULL REFERENCES units(id),
  roll_length REAL,
  min_stock   REAL NOT NULL DEFAULT 0,
  max_stock   REAL NOT NULL DEFAULT 0,
  quantity    REAL NOT NULL DEFAULT 0,
  notes       TEXT NOT NULL DEFAULT '',
  archived    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rolls (
  id             INTEGER PRIMARY KEY,
  material_id    INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  tag            TEXT NOT NULL UNIQUE COLLATE NOCASE,
  status         TEXT NOT NULL CHECK (status IN ('sealed', 'open', 'finished')),
  initial_length REAL NOT NULL,
  remaining      REAL NOT NULL,
  received_at    TEXT NOT NULL DEFAULT (datetime('now')),
  opened_at      TEXT,
  finished_at    TEXT
);
CREATE INDEX IF NOT EXISTS rolls_material_status ON rolls (material_id, status);

CREATE TABLE IF NOT EXISTS activity (
  id          INTEGER PRIMARY KEY,
  material_id INTEGER REFERENCES materials(id) ON DELETE CASCADE,
  roll_id     INTEGER REFERENCES rolls(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  detail      TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS activity_material ON activity (material_id, id);
`;

function open(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(SCHEMA);

  const unitCount = db.prepare("SELECT COUNT(*) AS n FROM units").get() as { n: number };
  if (unitCount.n === 0) {
    const insert = db.prepare("INSERT INTO units (name, abbr, tracking) VALUES (?, ?, ?)");
    insert.run("Metres (rolls)", "m", "roll");
    insert.run("Sheets", "sheets", "count");
    insert.run("Pieces", "pcs", "count");
  }
  return db;
}

// Reuse one connection across hot reloads in dev.
const globalForDb = globalThis as unknown as { __wfDb?: Database.Database };

export function getDb(): Database.Database {
  if (!globalForDb.__wfDb) globalForDb.__wfDb = open();
  return globalForDb.__wfDb;
}
