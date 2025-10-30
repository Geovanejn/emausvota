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
  ElectionPosition,
  InsertElectionPosition,
  ElectionAttendance,
  InsertElectionAttendance,
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
  finalizeElection(id: number): void;
  getElectionHistory(): Election[];
  setWinner(electionId: number, candidateId: number, positionId: number, scrutiny: number): void;
  
  // Election Positions management
  getElectionPositions(electionId: number): ElectionPosition[];
  getActiveElectionPosition(electionId: number): ElectionPosition | null;
  advancePositionScrutiny(electionPositionId: number): void;
  openNextPosition(electionId: number): ElectionPosition | null;
  completePosition(electionPositionId: number): void;
  
  // Election Attendance management
  getElectionAttendance(electionId: number): ElectionAttendance[];
  getPresentCount(electionId: number): number;
  setMemberAttendance(electionId: number, memberId: number, isPresent: boolean): void;
  initializeAttendance(electionId: number): void;
  
  getAllCandidates(): Candidate[];
  getCandidatesByElection(electionId: number): CandidateWithDetails[];
  getCandidatesByPosition(positionId: number, electionId: number): Candidate[];
  createCandidate(candidate: InsertCandidate): Candidate;
  
  createVote(vote: InsertVote): Vote;
  hasUserVoted(voterId: number, positionId: number, electionId: number, scrutinyRound: number): boolean;
  
  getElectionResults(electionId: number): ElectionResults | null;
  getLatestElectionResults(): ElectionResults | null;
  getElectionWinners(electionId: number): Array<{ userId: number; positionId: number; candidateId: number; wonAtScrutiny: number }>;
  
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
  // Apaga votos do membro (se ele votou em alguma eleição)
  db.prepare("DELETE FROM votes WHERE voter_id = ?").run(id);

  // Apaga candidaturas (se ele foi candidato em alguma eleição)
  db.prepare("DELETE FROM candidates WHERE user_id = ?").run(id);

  // Apaga registros de presença (attendance)
  db.prepare("DELETE FROM election_attendance WHERE member_id = ?").run(id);

  // Finalmente, remove o usuário (desde que não seja admin)
  db.prepare("DELETE FROM users WHERE id = ? AND is_admin = 0").run(id);
}
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
      createdAt: row.created_at,
    };
  }

  createElection(name: string): Election {
    db.prepare("UPDATE elections SET is_active = 0 WHERE is_active = 1").run();
    
    const stmt = db.prepare(
      "INSERT INTO elections (name, is_active) VALUES (?, 1) RETURNING *"
    );
    const row = stmt.get(name) as any;
    
    // Create election_positions for all positions
    const positions = this.getAllPositions();
    for (let i = 0; i < positions.length; i++) {
      db.prepare(`
        INSERT INTO election_positions (election_id, position_id, order_index, status, current_scrutiny)
        VALUES (?, ?, ?, ?, 1)
      `).run(row.id, positions[i].id, i, i === 0 ? 'active' : 'pending');
    }
    
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
    
    // Close all election_positions
    db.prepare("UPDATE election_positions SET status = 'completed', closed_at = datetime('now') WHERE election_id = ?").run(id);
  }

  finalizeElection(id: number): void {
    const stmt = db.prepare("UPDATE elections SET is_active = 0, closed_at = datetime('now') WHERE id = ?");
    stmt.run(id);
    
    // Close all election_positions if not already closed
    db.prepare("UPDATE election_positions SET status = 'completed', closed_at = datetime('now') WHERE election_id = ? AND status != 'completed'").run(id);
  }

  getElectionHistory(): Election[] {
    const stmt = db.prepare("SELECT * FROM elections WHERE is_active = 0 AND closed_at IS NOT NULL ORDER BY closed_at DESC");
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      closedAt: row.closed_at,
    }));
  }

  setWinner(electionId: number, candidateId: number, positionId: number, scrutiny: number): void {
    // Insert or update winner for this position
    const checkStmt = db.prepare("SELECT id FROM election_winners WHERE election_id = ? AND position_id = ?");
    const existing = checkStmt.get(electionId, positionId) as any;
    
    if (existing) {
      const updateStmt = db.prepare("UPDATE election_winners SET candidate_id = ?, won_at_scrutiny = ? WHERE election_id = ? AND position_id = ?");
      updateStmt.run(candidateId, scrutiny, electionId, positionId);
    } else {
      const insertStmt = db.prepare("INSERT INTO election_winners (election_id, position_id, candidate_id, won_at_scrutiny) VALUES (?, ?, ?, ?)");
      insertStmt.run(electionId, positionId, candidateId, scrutiny);
    }
    
    // Mark the election_position as completed
    db.prepare("UPDATE election_positions SET status = 'completed', closed_at = datetime('now') WHERE election_id = ? AND position_id = ?")
      .run(electionId, positionId);
  }

  // Election Positions management
  getElectionPositions(electionId: number): ElectionPosition[] {
    const stmt = db.prepare(`
      SELECT * FROM election_positions 
      WHERE election_id = ? 
      ORDER BY order_index
    `);
    const rows = stmt.all(electionId) as any[];
    return rows.map(row => ({
      id: row.id,
      electionId: row.election_id,
      positionId: row.position_id,
      orderIndex: row.order_index,
      status: row.status,
      currentScrutiny: row.current_scrutiny,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
      createdAt: row.created_at,
    }));
  }

  getActiveElectionPosition(electionId: number): ElectionPosition | null {
    const stmt = db.prepare(`
      SELECT * FROM election_positions 
      WHERE election_id = ? AND status = 'active'
      ORDER BY order_index
      LIMIT 1
    `);
    const row = stmt.get(electionId) as any;
    if (!row) return null;
    
    return {
      id: row.id,
      electionId: row.election_id,
      positionId: row.position_id,
      orderIndex: row.order_index,
      status: row.status,
      currentScrutiny: row.current_scrutiny,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
      createdAt: row.created_at,
    };
  }

  advancePositionScrutiny(electionPositionId: number): void {
    db.prepare(`
      UPDATE election_positions 
      SET current_scrutiny = current_scrutiny + 1 
      WHERE id = ? AND current_scrutiny < 3
    `).run(electionPositionId);
  }

  openNextPosition(electionId: number): ElectionPosition | null {
    // Get the current active position
    const currentActive = this.getActiveElectionPosition(electionId);
    
    if (!currentActive) {
      // If no active position, open the first pending one
      const nextStmt = db.prepare(`
        SELECT * FROM election_positions 
        WHERE election_id = ? AND status = 'pending'
        ORDER BY order_index
        LIMIT 1
      `);
      const nextRow = nextStmt.get(electionId) as any;
      
      if (nextRow) {
        db.prepare(`
          UPDATE election_positions 
          SET status = 'active', opened_at = datetime('now')
          WHERE id = ?
        `).run(nextRow.id);
        
        return this.getActiveElectionPosition(electionId);
      }
      
      return null;
    }
    
    // Complete current position and open next one
    db.prepare(`
      UPDATE election_positions 
      SET status = 'completed', closed_at = datetime('now')
      WHERE id = ?
    `).run(currentActive.id);
    
    // Find and open next position
    const nextStmt = db.prepare(`
      SELECT * FROM election_positions 
      WHERE election_id = ? AND order_index > ? AND status = 'pending'
      ORDER BY order_index
      LIMIT 1
    `);
    const nextRow = nextStmt.get(electionId, currentActive.orderIndex) as any;
    
    if (nextRow) {
      db.prepare(`
        UPDATE election_positions 
        SET status = 'active', opened_at = datetime('now')
        WHERE id = ?
      `).run(nextRow.id);
      
      return this.getActiveElectionPosition(electionId);
    }
    
    return null;
  }

  completePosition(electionPositionId: number): void {
    db.prepare(`
      UPDATE election_positions 
      SET status = 'completed', closed_at = datetime('now')
      WHERE id = ?
    `).run(electionPositionId);
  }

  // Election Attendance management
  getElectionAttendance(electionId: number): ElectionAttendance[] {
    const stmt = db.prepare(`
      SELECT * FROM election_attendance 
      WHERE election_id = ?
      ORDER BY member_id
    `);
    const rows = stmt.all(electionId) as any[];
    return rows.map(row => ({
      id: row.id,
      electionId: row.election_id,
      memberId: row.member_id,
      isPresent: Boolean(row.is_present),
      markedAt: row.marked_at,
      createdAt: row.created_at,
    }));
  }

  getPresentCount(electionId: number): number {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM election_attendance 
      WHERE election_id = ? AND is_present = 1
    `);
    const result = stmt.get(electionId) as { count: number };
    return result.count;
  }

  setMemberAttendance(electionId: number, memberId: number, isPresent: boolean): void {
    const checkStmt = db.prepare(`
      SELECT id FROM election_attendance 
      WHERE election_id = ? AND member_id = ?
    `);
    const existing = checkStmt.get(electionId, memberId) as any;
    
    if (existing) {
      db.prepare(`
        UPDATE election_attendance 
        SET is_present = ?, marked_at = datetime('now')
        WHERE id = ?
      `).run(isPresent ? 1 : 0, existing.id);
    } else {
      db.prepare(`
        INSERT INTO election_attendance (election_id, member_id, is_present, marked_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run(electionId, memberId, isPresent ? 1 : 0);
    }
  }

  initializeAttendance(electionId: number): void {
    // Create attendance records for all members
    const members = this.getAllMembers();
    
    for (const member of members) {
      // Check if attendance already exists
      const checkStmt = db.prepare(`
        SELECT id FROM election_attendance 
        WHERE election_id = ? AND member_id = ?
      `);
      const existing = checkStmt.get(electionId, member.id) as any;
      
      if (!existing) {
        db.prepare(`
          INSERT INTO election_attendance (election_id, member_id, is_present)
          VALUES (?, ?, 0)
        `).run(electionId, member.id);
      }
    }
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

    // Get all election positions for this election
    const electionPositions = this.getElectionPositions(electionId);
    
    // Get present count
    const presentCount = this.getPresentCount(electionId);
    
    const results: ElectionResults = {
      electionId: election.id,
      electionName: election.name,
      presentCount,
      positions: [],
    };

    for (const electionPosition of electionPositions) {
      // Get position details
      const positionStmt = db.prepare("SELECT * FROM positions WHERE id = ?");
      const positionRow = positionStmt.get(electionPosition.positionId) as any;
      if (!positionRow) continue;
      
      const position = {
        id: positionRow.id,
        name: positionRow.name,
      };
      
      const currentScrutiny = electionPosition.currentScrutiny;
      
      // Get candidates for this position
      let candidates = this.getCandidatesByPosition(position.id, electionId);
      
      // Count total voters who voted for this position in current scrutiny
      const totalVotersStmt = db.prepare(
        "SELECT COUNT(DISTINCT voter_id) as count FROM votes WHERE position_id = ? AND election_id = ? AND scrutiny_round = ?"
      );
      const totalVotersResult = totalVotersStmt.get(position.id, electionId, currentScrutiny) as { count: number };
      const totalVoters = totalVotersResult.count;
      
      // Calculate majority threshold based on present members
      // For scrutiny 1 and 2: half + 1
      // For scrutiny 3: simple majority (whoever has more votes wins)
      let majorityThreshold: number;
      if (currentScrutiny === 3) {
        // Scrutiny 3: simple majority (just need most votes)
        majorityThreshold = 1;
      } else {
        // Scrutiny 1 and 2: half + 1 of present members
        majorityThreshold = Math.floor(presentCount / 2) + 1;
      }
      
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

      // Check if there's a winner override from admin (from election_winners table)
      const winnerStmt = db.prepare("SELECT candidate_id, won_at_scrutiny FROM election_winners WHERE election_id = ? AND position_id = ?");
      const winnerRow = winnerStmt.get(electionId, position.id) as any;
      
      if (winnerRow) {
        winnerId = winnerRow.candidate_id;
        winnerScrutiny = winnerRow.won_at_scrutiny;
      } else if (currentScrutiny < 3 && candidateResults.length > 0 && candidateResults[0].voteCount >= majorityThreshold) {
        // Scrutiny 1 or 2: Someone reached half+1 of present members
        winnerId = candidateResults[0].candidateId;
        winnerScrutiny = currentScrutiny;
      } else if (currentScrutiny === 3) {
        // Third scrutiny - simple majority (most votes wins)
        if (candidateResults.length > 1 && candidateResults[0].voteCount === candidateResults[1].voteCount) {
          // Tie - admin must choose
          needsNextScrutiny = false; // Can't advance further
        } else if (candidateResults.length > 0 && candidateResults[0].voteCount > 0) {
          // Top candidate wins with simple majority
          winnerId = candidateResults[0].candidateId;
          winnerScrutiny = 3;
        }
      } else if (currentScrutiny < 3 && electionPosition.status === 'active') {
        // No winner yet, need next scrutiny
        needsNextScrutiny = true;
      }

      // Mark elected candidate
      if (winnerId) {
        const electedCandidate = candidateResults.find(c => c.candidateId === winnerId);
        if (electedCandidate) {
          electedCandidate.isElected = true;
          electedCandidate.electedInScrutiny = winnerScrutiny;
        }
      }

      results.positions.push({
        positionId: position.id,
        positionName: position.name,
        status: electionPosition.status,
        currentScrutiny,
        orderIndex: electionPosition.orderIndex,
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

  getElectionWinners(electionId: number): Array<{ userId: number; positionId: number; candidateId: number; wonAtScrutiny: number }> {
    const stmt = db.prepare(`
      SELECT 
        c.user_id as userId,
        ew.position_id as positionId,
        ew.candidate_id as candidateId,
        ew.won_at_scrutiny as wonAtScrutiny
      FROM election_winners ew
      INNER JOIN candidates c ON c.id = ew.candidate_id
      WHERE ew.election_id = ?
    `);
    
    return stmt.all(electionId) as any[];
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
