import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type {
  User,
  InsertUser,
  Position,
  Election,
  InsertElection,
  Candidate,
  InsertCandidate,
  Vote,
  InsertVote,
  VerificationCode,
  InsertVerificationCode,
  CandidateWithDetails,
  ElectionResults,
} from "@shared/schema";

const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "emaus-vota.db");
const db = new Database(dbPath);

export interface IStorage {
  getUserByEmail(email: string): User | undefined;
  getUserById(id: number): User | undefined;
  createUser(user: InsertUser): User;
  getAllMembers(excludeAdmins?: boolean): User[];
  deleteMember(id: number): void;
  
  getAllPositions(): Position[];
  
  getActiveElection(): Election | null;
  getElectionById(id: number): Election | undefined;
  createElection(name: string): Election;
  closeElection(id: number): void;
  advanceScrutiny(electionId: number): void;
  setWinner(electionId: number, candidateId: number, scrutiny: number): void;
  
  getAllCandidates(): Candidate[];
  getCandidatesByElection(electionId: number): CandidateWithDetails[];
  getCandidatesByPosition(positionId: number, electionId: number): Candidate[];
  createCandidate(candidate: InsertCandidate): Candidate;
  
  createVote(vote: InsertVote): Vote;
  hasUserVoted(voterId: number, positionId: number, electionId: number, scrutinyRound: number): boolean;
  
  getElectionResults(electionId: number): ElectionResults | null;
  getLatestElectionResults(): ElectionResults | null;
  
  createVerificationCode(data: InsertVerificationCode): VerificationCode;
  getValidVerificationCode(email: string, code: string): VerificationCode | null;
  deleteVerificationCodesByEmail(email: string): void;
}

export class SQLiteStorage implements IStorage {
  getUserByEmail(email: string): User | undefined {
    const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
    const row = stmt.get(email) as any;
    if (!row) return undefined;
    
    return {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      password: row.password,
      isAdmin: Boolean(row.is_admin),
      isMember: Boolean(row.is_member),
    };
  }

  getUserById(id: number): User | undefined {
    const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
    const row = stmt.get(id) as any;
    if (!row) return undefined;
    
    return {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      password: row.password,
      isAdmin: Boolean(row.is_admin),
      isMember: Boolean(row.is_member),
    };
  }

  createUser(user: InsertUser): User {
    const stmt = db.prepare(
      "INSERT INTO users (full_name, email, password, is_admin, is_member) VALUES (?, ?, ?, ?, ?) RETURNING *"
    );
    const row = stmt.get(
      user.fullName,
      user.email,
      user.password,
      user.isAdmin ? 1 : 0,
      user.isMember ? 1 : 0
    ) as any;
    
    return {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      password: row.password,
      isAdmin: Boolean(row.is_admin),
      isMember: Boolean(row.is_member),
    };
  }

  getAllMembers(excludeAdmins: boolean = false): User[] {
    const query = excludeAdmins 
      ? "SELECT * FROM users WHERE is_member = 1 AND is_admin = 0 ORDER BY full_name"
      : "SELECT * FROM users WHERE is_member = 1 ORDER BY full_name";
    const stmt = db.prepare(query);
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      password: row.password,
      isAdmin: Boolean(row.is_admin),
      isMember: Boolean(row.is_member),
    }));
  }

  deleteMember(id: number): void {
    const stmt = db.prepare("DELETE FROM users WHERE id = ? AND is_admin = 0");
    stmt.run(id);
  }

  getAllPositions(): Position[] {
    const stmt = db.prepare("SELECT * FROM positions ORDER BY id");
    return stmt.all() as Position[];
  }

  getActiveElection(): Election | null {
    const stmt = db.prepare("SELECT * FROM elections WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1");
    const row = stmt.get() as any;
    if (!row) return null;
    
    return {
      id: row.id,
      name: row.name,
      isActive: Boolean(row.is_active),
      currentScrutiny: row.current_scrutiny,
      winnerCandidateId: row.winner_candidate_id,
      winnerScrutiny: row.winner_scrutiny,
      createdAt: row.created_at,
    };
  }

  getElectionById(id: number): Election | undefined {
    const stmt = db.prepare("SELECT * FROM elections WHERE id = ?");
    const row = stmt.get(id) as any;
    if (!row) return undefined;
    
    return {
      id: row.id,
      name: row.name,
      isActive: Boolean(row.is_active),
      currentScrutiny: row.current_scrutiny,
      winnerCandidateId: row.winner_candidate_id,
      winnerScrutiny: row.winner_scrutiny,
      createdAt: row.created_at,
    };
  }

  createElection(name: string): Election {
    db.prepare("UPDATE elections SET is_active = 0 WHERE is_active = 1").run();
    
    const stmt = db.prepare(
      "INSERT INTO elections (name, is_active) VALUES (?, 1) RETURNING *"
    );
    const row = stmt.get(name) as any;
    
    return {
      id: row.id,
      name: row.name,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
    };
  }

  closeElection(id: number): void {
    const stmt = db.prepare("UPDATE elections SET is_active = 0 WHERE id = ?");
    stmt.run(id);
  }

  advanceScrutiny(electionId: number): void {
    const stmt = db.prepare("UPDATE elections SET current_scrutiny = current_scrutiny + 1 WHERE id = ? AND current_scrutiny < 3");
    stmt.run(electionId);
  }

  setWinner(electionId: number, candidateId: number, scrutiny: number): void {
    const stmt = db.prepare("UPDATE elections SET winner_candidate_id = ?, winner_scrutiny = ? WHERE id = ?");
    stmt.run(candidateId, scrutiny, electionId);
  }

  getAllCandidates(): Candidate[] {
    const stmt = db.prepare("SELECT * FROM candidates");
    const rows = stmt.all() as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      userId: row.user_id,
      positionId: row.position_id,
      electionId: row.election_id,
    }));
  }

  getCandidatesByElection(electionId: number): CandidateWithDetails[] {
    const stmt = db.prepare(`
      SELECT 
        c.*,
        p.name as positionName,
        e.name as electionName
      FROM candidates c
      JOIN positions p ON c.position_id = p.id
      JOIN elections e ON c.election_id = e.id
      WHERE c.election_id = ?
      ORDER BY p.id, c.name
    `);
    const rows = stmt.all(electionId) as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      userId: row.user_id,
      positionId: row.position_id,
      electionId: row.election_id,
      positionName: row.positionName,
      electionName: row.electionName,
    }));
  }

  getCandidatesByPosition(positionId: number, electionId: number): Candidate[] {
    const stmt = db.prepare(
      "SELECT * FROM candidates WHERE position_id = ? AND election_id = ?"
    );
    const rows = stmt.all(positionId, electionId) as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      userId: row.user_id,
      positionId: row.position_id,
      electionId: row.election_id,
    }));
  }

  createCandidate(candidate: InsertCandidate): Candidate {
    const stmt = db.prepare(
      "INSERT INTO candidates (name, email, user_id, position_id, election_id) VALUES (?, ?, ?, ?, ?) RETURNING *"
    );
    const row = stmt.get(
      candidate.name,
      candidate.email,
      candidate.userId,
      candidate.positionId,
      candidate.electionId
    ) as any;
    
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      userId: row.user_id,
      positionId: row.position_id,
      electionId: row.election_id,
    };
  }

  createVote(vote: InsertVote): Vote {
    const stmt = db.prepare(
      "INSERT INTO votes (voter_id, candidate_id, position_id, election_id, scrutiny_round) VALUES (?, ?, ?, ?, ?) RETURNING *"
    );
    const row = stmt.get(
      vote.voterId,
      vote.candidateId,
      vote.positionId,
      vote.electionId,
      vote.scrutinyRound || 1
    ) as any;
    
    return {
      id: row.id,
      voterId: row.voter_id,
      candidateId: row.candidate_id,
      positionId: row.position_id,
      electionId: row.election_id,
      scrutinyRound: row.scrutiny_round,
      createdAt: row.created_at,
    };
  }

  hasUserVoted(voterId: number, positionId: number, electionId: number, scrutinyRound: number): boolean {
    const stmt = db.prepare(
      "SELECT COUNT(*) as count FROM votes WHERE voter_id = ? AND position_id = ? AND election_id = ? AND scrutiny_round = ?"
    );
    const result = stmt.get(voterId, positionId, electionId, scrutinyRound) as { count: number };
    return result.count > 0;
  }

  getElectionResults(electionId: number): ElectionResults | null {
    const election = this.getElectionById(electionId);
    if (!election) return null;

    const positions = this.getAllPositions();
    const currentScrutiny = election.currentScrutiny;
    
    const results: ElectionResults = {
      electionId: election.id,
      electionName: election.name,
      currentScrutiny,
      positions: [],
    };

    for (const position of positions) {
      // Get candidates for this position
      let candidates = this.getCandidatesByPosition(position.id, electionId);
      
      // Count total voters who voted for this position in current scrutiny
      const totalVotersStmt = db.prepare(
        "SELECT COUNT(DISTINCT voter_id) as count FROM votes WHERE position_id = ? AND election_id = ? AND scrutiny_round = ?"
      );
      const totalVotersResult = totalVotersStmt.get(position.id, electionId, currentScrutiny) as { count: number };
      const totalVoters = totalVotersResult.count;
      const majorityThreshold = Math.floor(totalVoters / 2) + 1;
      
      // Get vote counts for each candidate in current scrutiny
      const candidateResults = candidates.map((candidate) => {
        const voteStmt = db.prepare(
          "SELECT COUNT(*) as count FROM votes WHERE candidate_id = ? AND election_id = ? AND scrutiny_round = ?"
        );
        const voteResult = voteStmt.get(candidate.id, electionId, currentScrutiny) as { count: number };
        
        return {
          candidateId: candidate.id,
          candidateName: candidate.name,
          candidateEmail: candidate.email,
          photoUrl: "", // Will be filled with Gravatar URL in route
          voteCount: voteResult.count,
          isElected: false,
          electedInScrutiny: undefined as number | undefined,
        };
      });

      // Sort by vote count descending
      candidateResults.sort((a, b) => b.voteCount - a.voteCount);

      // Determine if someone won
      let winnerId: number | undefined;
      let winnerScrutiny: number | undefined;
      let needsNextScrutiny = false;

      // Check if there's a winner from previous scrutinies or current
      if (election.winnerCandidateId) {
        winnerId = election.winnerCandidateId;
        winnerScrutiny = election.winnerScrutiny || currentScrutiny;
      } else if (candidateResults.length > 0 && candidateResults[0].voteCount >= majorityThreshold) {
        // Someone reached majority in current scrutiny
        winnerId = candidateResults[0].candidateId;
        winnerScrutiny = currentScrutiny;
      } else if (currentScrutiny < 3) {
        // No winner yet, need next scrutiny
        needsNextScrutiny = true;
      } else if (currentScrutiny === 3) {
        // Third scrutiny - either top candidate wins or tie needs admin resolution
        if (candidateResults.length > 1 && candidateResults[0].voteCount === candidateResults[1].voteCount) {
          // Tie - admin must choose
          needsNextScrutiny = false; // Can't advance further
        } else if (candidateResults.length > 0) {
          // Top candidate wins even without majority
          winnerId = candidateResults[0].candidateId;
          winnerScrutiny = 3;
        }
      }

      // Mark elected candidate
      if (winnerId) {
        const electedCandidate = candidateResults.find(c => c.candidateId === winnerId);
        if (electedCandidate) {
          electedCandidate.isElected = true;
          electedCandidate.electedInScrutiny = winnerScrutiny;
        }
      }

      // For 3rd scrutiny, only show top 2 candidates if we're in 3rd scrutiny
      // Actually, we need to show all candidates but filter who can be voted for
      // The filtering will happen in the frontend/voting logic

      results.positions.push({
        positionId: position.id,
        positionName: position.name,
        totalVoters,
        majorityThreshold,
        needsNextScrutiny,
        winnerId,
        winnerScrutiny,
        candidates: candidateResults,
      });
    }

    return results;
  }

  getLatestElectionResults(): ElectionResults | null {
    const stmt = db.prepare("SELECT * FROM elections WHERE is_active = 0 ORDER BY created_at DESC LIMIT 1");
    const row = stmt.get() as any;
    
    if (!row) return null;
    
    return this.getElectionResults(row.id);
  }

  createVerificationCode(data: InsertVerificationCode): VerificationCode {
    const stmt = db.prepare(
      "INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?) RETURNING *"
    );
    const row = stmt.get(data.email, data.code, data.expiresAt) as any;
    
    return {
      id: row.id,
      email: row.email,
      code: row.code,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }

  getValidVerificationCode(email: string, code: string): VerificationCode | null {
    const stmt = db.prepare(
      "SELECT * FROM verification_codes WHERE email = ? AND code = ? AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1"
    );
    const row = stmt.get(email, code) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      email: row.email,
      code: row.code,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }

  deleteVerificationCodesByEmail(email: string): void {
    const stmt = db.prepare("DELETE FROM verification_codes WHERE email = ?");
    stmt.run(email);
  }
}

export const storage = new SQLiteStorage();
