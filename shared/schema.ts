import { sql } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import crypto from "crypto";

// Utility function to generate Gravatar URL from email
export function getGravatarUrl(email: string): string {
  const hash = crypto
    .createHash("md5")
    .update(email.toLowerCase().trim())
    .digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?d=mp&s=200`;
}

// Users table
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  isMember: integer("is_member", { mode: "boolean" }).notNull().default(true),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Positions table (fixed positions)
export const positions = sqliteTable("positions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const insertPositionSchema = createInsertSchema(positions).omit({
  id: true,
});

export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type Position = typeof positions.$inferSelect;

// Elections table
export const elections = sqliteTable("elections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  currentScrutiny: integer("current_scrutiny").notNull().default(1), // 1, 2, or 3
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// Election Winners table - tracks which candidate won each position (for tie resolution in 3rd scrutiny)
export const electionWinners = sqliteTable("election_winners", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  electionId: integer("election_id").notNull().references(() => elections.id),
  positionId: integer("position_id").notNull().references(() => positions.id),
  candidateId: integer("candidate_id").notNull().references(() => candidates.id),
  wonAtScrutiny: integer("won_at_scrutiny").notNull(), // Which scrutiny this winner was chosen (1, 2, or 3)
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const insertElectionSchema = createInsertSchema(elections).omit({
  id: true,
  isActive: true,
  createdAt: true,
});

export type InsertElection = z.infer<typeof insertElectionSchema>;
export type Election = typeof elections.$inferSelect;

export const insertElectionWinnerSchema = createInsertSchema(electionWinners).omit({
  id: true,
  createdAt: true,
});

export type InsertElectionWinner = z.infer<typeof insertElectionWinnerSchema>;
export type ElectionWinner = typeof electionWinners.$inferSelect;

// Candidates table
export const candidates = sqliteTable("candidates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(), // Email to fetch Gravatar photo
  userId: integer("user_id").notNull().references(() => users.id), // Reference to user
  positionId: integer("position_id").notNull().references(() => positions.id),
  electionId: integer("election_id").notNull().references(() => elections.id),
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
});

export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidates.$inferSelect;

// Votes table
export const votes = sqliteTable("votes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  voterId: integer("voter_id").notNull().references(() => users.id),
  candidateId: integer("candidate_id").notNull().references(() => candidates.id),
  positionId: integer("position_id").notNull().references(() => positions.id),
  electionId: integer("election_id").notNull().references(() => elections.id),
  scrutinyRound: integer("scrutiny_round").notNull().default(1), // 1, 2, or 3
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  createdAt: true,
});

export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votes.$inferSelect;

// Verification Codes table
export const verificationCodes = sqliteTable("verification_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const insertVerificationCodeSchema = createInsertSchema(verificationCodes).omit({
  id: true,
  createdAt: true,
});

export type InsertVerificationCode = z.infer<typeof insertVerificationCodeSchema>;
export type VerificationCode = typeof verificationCodes.$inferSelect;

// Auth schemas
export const requestCodeSchema = z.object({
  email: z.string().email("Email inválido"),
});

export type RequestCodeData = z.infer<typeof requestCodeSchema>;

export const verifyCodeSchema = z.object({
  email: z.string().email("Email inválido"),
  code: z.string().length(6, "Código deve ter 6 dígitos"),
});

export type VerifyCodeData = z.infer<typeof verifyCodeSchema>;

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export type LoginData = z.infer<typeof loginSchema>;

export const registerSchema = loginSchema.extend({
  fullName: z.string().min(2, "Nome completo é obrigatório"),
});

export type RegisterData = z.infer<typeof registerSchema>;

export const addMemberSchema = z.object({
  fullName: z.string().min(2, "Nome completo é obrigatório"),
  email: z.string().email("Email inválido"),
});

export type AddMemberData = z.infer<typeof addMemberSchema>;

// Response types
export type AuthResponse = {
  user: Omit<User, "password">;
  token: string;
};

export type CandidateWithDetails = Candidate & {
  positionName: string;
  electionName: string;
  voteCount?: number;
  photoUrl?: string;
};

export type PositionWithCandidates = Position & {
  candidates: Candidate[];
};

export type ElectionResults = {
  electionId: number;
  electionName: string;
  currentScrutiny: number;
  positions: Array<{
    positionId: number;
    positionName: string;
    totalVoters: number; // Total number of voters in this scrutiny
    majorityThreshold: number; // Half + 1
    needsNextScrutiny: boolean; // If no candidate reached majority
    winnerId?: number; // ID of elected candidate (if any)
    winnerScrutiny?: number; // Which scrutiny elected the winner
    candidates: Array<{
      candidateId: number;
      candidateName: string;
      candidateEmail: string;
      photoUrl: string;
      voteCount: number;
      isElected: boolean;
      electedInScrutiny?: number; // 1, 2, or 3
    }>;
  }>;
};
