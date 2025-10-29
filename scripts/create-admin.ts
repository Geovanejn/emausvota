import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "emaus-vota.db");
const db = new Database(dbPath);

const email = "admin@emaus.com";
const password = "admin123";
const fullName = "Admin Emaús";

// Hash the password
const hashedPassword = bcrypt.hashSync(password, 10);

// Check if admin already exists
const existingAdmin = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

if (existingAdmin) {
  console.log("Admin already exists!");
  console.log(`Email: ${email}`);
} else {
  // Insert admin user
  const insert = db.prepare(
    "INSERT INTO users (full_name, email, password, is_admin, is_member) VALUES (?, ?, ?, 1, 1)"
  );
  
  insert.run(fullName, email, hashedPassword);
  
  console.log("Admin user created successfully!");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

db.close();
