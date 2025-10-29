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
      current_scrutiny INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS election_winners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      election_id INTEGER NOT NULL,
      position_id INTEGER NOT NULL,
      candidate_id INTEGER NOT NULL,
      won_at_scrutiny INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (election_id) REFERENCES elections(id),
      FOREIGN KEY (position_id) REFERENCES positions(id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      user_id INTEGER NOT NULL DEFAULT 0,
      position_id INTEGER NOT NULL,
      election_id INTEGER NOT NULL,
      FOREIGN KEY (position_id) REFERENCES positions(id),
      FOREIGN KEY (election_id) REFERENCES elections(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voter_id INTEGER NOT NULL,
      candidate_id INTEGER NOT NULL,
      position_id INTEGER NOT NULL,
      election_id INTEGER NOT NULL,
      scrutiny_round INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(voter_id, position_id, election_id, scrutiny_round),
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

  // Migration: Add new columns if they don't exist
  try {
    // Check and add columns to elections table
    const electionsColumns = sqlite.prepare("PRAGMA table_info(elections)").all() as Array<{ name: string }>;
    const electionsColumnNames = electionsColumns.map(col => col.name);
    
    if (!electionsColumnNames.includes('current_scrutiny')) {
      sqlite.exec("ALTER TABLE elections ADD COLUMN current_scrutiny INTEGER NOT NULL DEFAULT 1");
      console.log("Added current_scrutiny column to elections table");
    }
    
    // Remove old columns if they exist (we now use election_winners table)
    if (electionsColumnNames.includes('winner_candidate_id') || electionsColumnNames.includes('winner_scrutiny')) {
      console.log("Migrating from old winner columns to election_winners table...");
      // SQLite doesn't support DROP COLUMN, so we need to recreate the table
      // First, drop the temp table if it exists from a previous failed migration
      sqlite.exec("DROP TABLE IF EXISTS elections_new");
      
      // Temporarily disable foreign keys for migration
      sqlite.exec("PRAGMA foreign_keys = OFF");
      
      sqlite.exec(`
        CREATE TABLE elections_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          current_scrutiny INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        
        INSERT INTO elections_new (id, name, is_active, current_scrutiny, created_at)
        SELECT id, name, is_active, current_scrutiny, created_at FROM elections;
        
        DROP TABLE elections;
        ALTER TABLE elections_new RENAME TO elections;
      `);
      
      // Re-enable foreign keys
      sqlite.exec("PRAGMA foreign_keys = ON");
      console.log("Elections table migrated successfully");
    }

    // Check and add columns to candidates table
    const candidatesColumns = sqlite.prepare("PRAGMA table_info(candidates)").all() as Array<{ name: string }>;
    const candidatesColumnNames = candidatesColumns.map(col => col.name);
    
    if (!candidatesColumnNames.includes('email')) {
      sqlite.exec("ALTER TABLE candidates ADD COLUMN email TEXT NOT NULL DEFAULT ''");
      console.log("Added email column to candidates table");
    }
    if (!candidatesColumnNames.includes('user_id')) {
      sqlite.exec("ALTER TABLE candidates ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0");
      console.log("Added user_id column to candidates table");
    }

    // Check and add columns to votes table
    const votesColumns = sqlite.prepare("PRAGMA table_info(votes)").all() as Array<{ name: string }>;
    const votesColumnNames = votesColumns.map(col => col.name);
    
    if (!votesColumnNames.includes('scrutiny_round')) {
      sqlite.exec("ALTER TABLE votes ADD COLUMN scrutiny_round INTEGER NOT NULL DEFAULT 1");
      console.log("Added scrutiny_round column to votes table");
      
      // Need to recreate UNIQUE constraint to include scrutiny_round
      // SQLite doesn't support dropping constraints, so we need to recreate the table
      sqlite.exec(`
        CREATE TABLE votes_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          voter_id INTEGER NOT NULL,
          candidate_id INTEGER NOT NULL,
          position_id INTEGER NOT NULL,
          election_id INTEGER NOT NULL,
          scrutiny_round INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(voter_id, position_id, election_id, scrutiny_round),
          FOREIGN KEY (voter_id) REFERENCES users(id),
          FOREIGN KEY (candidate_id) REFERENCES candidates(id),
          FOREIGN KEY (position_id) REFERENCES positions(id),
          FOREIGN KEY (election_id) REFERENCES elections(id)
        );
        
        INSERT INTO votes_new (id, voter_id, candidate_id, position_id, election_id, scrutiny_round, created_at)
        SELECT id, voter_id, candidate_id, position_id, election_id, scrutiny_round, created_at FROM votes;
        
        DROP TABLE votes;
        ALTER TABLE votes_new RENAME TO votes;
      `);
      console.log("Recreated votes table with new UNIQUE constraint");
    }
  } catch (error) {
    console.error("Migration error:", error);
  }

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
