import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";
import path from "path";
import fs from "fs";

const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "emaus-vota.db");
const sqlite = new Database(dbPath);

sqlite.exec("PRAGMA foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export function initializeDatabase() {
  console.log("Initializing database...");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      is_member INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS elections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      position_id INTEGER NOT NULL,
      election_id INTEGER NOT NULL,
      FOREIGN KEY (position_id) REFERENCES positions(id),
      FOREIGN KEY (election_id) REFERENCES elections(id)
    );

    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voter_id INTEGER NOT NULL,
      candidate_id INTEGER NOT NULL,
      position_id INTEGER NOT NULL,
      election_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(voter_id, position_id, election_id),
      FOREIGN KEY (voter_id) REFERENCES users(id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id),
      FOREIGN KEY (position_id) REFERENCES positions(id),
      FOREIGN KEY (election_id) REFERENCES elections(id)
    );

    CREATE TABLE IF NOT EXISTS verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const fixedPositions = [
    "Presidente",
    "Vice-Presidente", 
    "1º Secretário",
    "2º Secretário",
    "Tesoureiro"
  ];

  const existingPositions = sqlite.prepare("SELECT COUNT(*) as count FROM positions").get() as { count: number };

  if (existingPositions.count === 0) {
    console.log("Initializing fixed positions...");
    const insertPosition = sqlite.prepare("INSERT INTO positions (name) VALUES (?)");
    
    for (const position of fixedPositions) {
      insertPosition.run(position);
    }
    
    console.log(`Created ${fixedPositions.length} fixed positions`);
  }

  console.log("Database initialized successfully");
}
