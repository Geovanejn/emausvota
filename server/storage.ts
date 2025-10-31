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
  getElectionPositionById(id: number): ElectionPosition | null;
  advancePositionScrutiny(electionPositionId: number): void;
  openNextPosition(electionId: number): ElectionPosition | null;
  openPosition(electionPositionId: number): ElectionPosition;
  completePosition(electionPositionId: number): void;
  forceCompletePosition(electionPositionId: number, reason: string): void;
  
  // Election Attendance management
  getElectionAttendance(electionId: number): ElectionAttendance[];
  getPresentCount(electionId: number): number;
  getPresentCountForPosition(electionPositionId: number): number;
  isMemberPresent(electionId: number, memberId: number): boolean;
  setMemberAttendance(electionId: number, memberId: number, isPresent: boolean): void;
  initializeAttendance(electionId: number): void;
  createAttendanceSnapshot(electionPositionId: number): void;
  
  getAllCandidates(): Candidate[];
  getCandidatesByElection(electionId: number): CandidateWithDetails[];
  getCandidatesByPosition(positionId: number, electionId: number): Candidate[];
  createCandidate(candidate: InsertCandidate): Candidate;
  clearCandidatesForPosition(positionId: number, electionId: number): void;
  
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
  // Apaga votos onde o usuário foi votante
  db.prepare("DELETE FROM votes WHERE voter_id = ?").run(id);

  // Apaga votos onde o usuário foi candidato
  db.prepare(`
    DELETE FROM votes 
    WHERE candidate_id IN (SELECT id FROM candidates WHERE user_id = ?)
  `).run(id);

  // Apaga vencedores ligados às candidaturas do usuário
  db.prepare(`
    DELETE FROM election_winners 
    WHERE candidate_id IN (SELECT id FROM candidates WHERE user_id = ?)
  `).run(id);

  // Apaga candidaturas do usuário
  db.prepare("DELETE FROM candidates WHERE user_id = ?").run(id);

  // Apaga registros de presença
  db.prepare("DELETE FROM election_attendance WHERE member_id = ?").run(id);

  // Finalmente, remove o usuário (se não for admin)
  db.prepare("DELETE FROM users WHERE id = ? AND is_admin = 0").run(id);
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
      closedAt: row.closed_at,
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
      closedAt: row.closed_at,
    };
  }

  createElection(name: string): Election {
    db.prepare("UPDATE elections SET is_active = 0 WHERE is_active = 1").run();
    
    const stmt = db.prepare(
      "INSERT INTO elections (name, is_active) VALUES (?, 1) RETURNING *"
    );
    const row = stmt.get(name) as any;
    
    // Create election_positions for all positions, all starting as pending
    const positions = this.getAllPositions();
    for (let i = 0; i < positions.length; i++) {
      db.prepare(`
        INSERT INTO election_positions (election_id, position_id, order_index, status, current_scrutiny)
        VALUES (?, ?, ?, 'pending', 1)
      `).run(row.id, positions[i].id, i);
    }
    
    return {
      id: row.id,
      name: row.name,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      closedAt: row.closed_at,
    };
  }

  closeElection(id: number): void {
    const stmt = db.prepare("UPDATE elections SET is_active = 0 WHERE id = ?");
    stmt.run(id);
    
    // Close all election_positions
    db.prepare("UPDATE election_positions SET status = 'completed', closed_at = datetime('now') WHERE election_id = ?").run(id);
  }

  finalizeElection(id: number): void {
    // Clear all candidates and votes for this election
    db.prepare(`
      DELETE FROM votes WHERE election_id = ?
    `).run(id);
    
    db.prepare(`
      DELETE FROM candidates WHERE election_id = ?
    `).run(id);
    
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
    // Get the position details before updating
    const positionStmt = db.prepare("SELECT * FROM election_positions WHERE id = ?");
    const position = positionStmt.get(electionPositionId) as any;
    
    if (!position) return;
    
    const newScrutiny = position.current_scrutiny + 1;
    
    // Note: We do NOT clear candidates when advancing to 2nd scrutiny
    // Candidates remain the same across scrutiny rounds
    // The UNIQUE constraint on (user_id, position_id, election_id) prevents duplicates
    
    // If advancing to 3rd scrutiny, keep only top 2 candidates from 2nd scrutiny
    if (newScrutiny === 3) {
      // Get vote counts for all candidates in 2nd scrutiny
      const candidatesStmt = db.prepare(`
        SELECT c.id, c.user_id, COUNT(v.id) as vote_count
        FROM candidates c
        LEFT JOIN votes v ON v.candidate_id = c.id AND v.scrutiny_round = 2
        WHERE c.position_id = ? AND c.election_id = ?
        GROUP BY c.id
        ORDER BY vote_count DESC
        LIMIT 2
      `);
      const topCandidates = candidatesStmt.all(position.position_id, position.election_id) as any[];
      
      if (topCandidates.length === 2) {
        // Keep only these top 2 candidates, remove all others
        const candidateIds = topCandidates.map((c: any) => c.id);
        db.prepare(`
          DELETE FROM candidates 
          WHERE position_id = ? AND election_id = ? AND id NOT IN (?, ?)
        `).run(position.position_id, position.election_id, candidateIds[0], candidateIds[1]);
      }
    }
    
    // Update scrutiny
    db.prepare(`
      UPDATE election_positions 
      SET current_scrutiny = ? 
      WHERE id = ? AND current_scrutiny < 3
    `).run(newScrutiny, electionPositionId);
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
        // Clear any existing candidates for this new position before opening
        this.clearCandidatesForPosition(nextRow.position_id, electionId);
        
        db.prepare(`
          UPDATE election_positions 
          SET status = 'active', opened_at = datetime('now')
          WHERE id = ?
        `).run(nextRow.id);
        
        return this.getActiveElectionPosition(electionId);
      }
      
      return null;
    }
    
    // Complete current position and clear its data
    this.clearCandidatesForPosition(currentActive.positionId, electionId);
    
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
      // Clear any existing candidates for this new position before opening
      this.clearCandidatesForPosition(nextRow.position_id, electionId);
      
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

  forceCompletePosition(electionPositionId: number, reason: string): void {
    // Admin override to manually complete a position when stuck due to abstentions
    console.log(`[ADMIN OVERRIDE] Forcing completion of position ${electionPositionId}. Reason: ${reason}`);
    
    // Mark the position as completed
    db.prepare(`
      UPDATE election_positions 
      SET status = 'completed', closed_at = datetime('now')
      WHERE id = ?
    `).run(electionPositionId);
  }

  getElectionPositionById(id: number): ElectionPosition | null {
    const stmt = db.prepare("SELECT * FROM election_positions WHERE id = ?");
    const row = stmt.get(id) as any;
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

  openPosition(electionPositionId: number): ElectionPosition {
    const position = this.getElectionPositionById(electionPositionId);
    if (!position) {
      throw new Error("Cargo não encontrado");
    }

    // Can only open pending positions
    if (position.status !== 'pending') {
      throw new Error("Este cargo já foi aberto ou concluído.");
    }

    // Check if there's an active position in this election
    const activePosition = this.getActiveElectionPosition(position.electionId);
    if (activePosition) {
      throw new Error("Não é possível abrir um novo cargo enquanto outro ainda está ativo. Aguarde até que o cargo atual seja decidido pela votação ou complete o processo de votação.");
    }

    // Clear old votes for this position (but keep candidates)
    db.prepare(`
      DELETE FROM votes 
      WHERE position_id = ? AND election_id = ?
    `).run(position.positionId, position.electionId);
    
    // Clear any existing attendance snapshots for this position
    db.prepare(`
      DELETE FROM election_attendance 
      WHERE election_position_id = ?
    `).run(electionPositionId);

    // Open this position
    db.prepare(`
      UPDATE election_positions 
      SET status = 'active', opened_at = datetime('now'), current_scrutiny = 1
      WHERE id = ?
    `).run(electionPositionId);

    // Create attendance snapshot for this position
    this.createAttendanceSnapshot(electionPositionId);

    return this.getElectionPositionById(electionPositionId)!;
  }

  // Election Attendance management
  getElectionAttendance(electionId: number): ElectionAttendance[] {
    const stmt = db.prepare(`
      SELECT * FROM election_attendance 
      WHERE election_id = ? AND election_position_id IS NULL
      ORDER BY member_id
    `);
    const rows = stmt.all(electionId) as any[];
    return rows.map(row => ({
      id: row.id,
      electionId: row.election_id,
      electionPositionId: row.election_position_id || null,
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
      WHERE election_id = ? AND is_present = 1 AND election_position_id IS NULL
    `);
    const result = stmt.get(electionId) as { count: number };
    return result.count;
  }

  isMemberPresent(electionId: number, memberId: number): boolean {
    const stmt = db.prepare(`
      SELECT is_present 
      FROM election_attendance 
      WHERE election_id = ? AND member_id = ?
    `);
    const result = stmt.get(electionId, memberId) as any;
    return result ? Boolean(result.is_present) : false;
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

  getPresentCountForPosition(electionPositionId: number): number {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM election_attendance 
      WHERE election_position_id = ? AND is_present = 1
    `);
    const result = stmt.get(electionPositionId) as { count: number };
    return result.count;
  }

  createAttendanceSnapshot(electionPositionId: number): void {
    const position = this.getElectionPositionById(electionPositionId);
    if (!position) return;

    // Get the current attendance state for this election
    // We use a GROUP BY to get the latest attendance record for each member
    const presentMembers = db.prepare(`
      SELECT member_id
      FROM election_attendance
      WHERE election_id = ? 
        AND election_position_id IS NULL
        AND is_present = 1
      GROUP BY member_id
    `).all(position.electionId) as Array<{ member_id: number }>;

    // Create attendance snapshot for this position
    for (const { member_id } of presentMembers) {
      db.prepare(`
        INSERT INTO election_attendance (election_id, election_position_id, member_id, is_present, marked_at)
        VALUES (?, ?, ?, 1, datetime('now'))
      `).run(position.electionId, electionPositionId, member_id);
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

  clearCandidatesForPosition(positionId: number, electionId: number): void {
    // Delete votes for candidates of this position first
    db.prepare(`
      DELETE FROM votes 
      WHERE candidate_id IN (
        SELECT id FROM candidates WHERE position_id = ? AND election_id = ?
      )
    `).run(positionId, electionId);
    
    // Then delete the candidates
    db.prepare(
      "DELETE FROM candidates WHERE position_id = ? AND election_id = ?"
    ).run(positionId, electionId);
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
    
    const createdVote = {
      id: row.id,
      voterId: row.voter_id,
      candidateId: row.candidate_id,
      positionId: row.position_id,
      electionId: row.election_id,
      scrutinyRound: row.scrutiny_round,
      createdAt: row.created_at,
    };

    // Check for automatic winner after vote
    this.checkAndSetAutomaticWinner(vote.electionId, vote.positionId, vote.scrutinyRound || 1);
    
    return createdVote;
  }

  private checkAndSetAutomaticWinner(electionId: number, positionId: number, scrutinyRound: number): void {
    // Get the active election position
    const activePosition = this.getActiveElectionPosition(electionId);
    if (!activePosition || activePosition.positionId !== positionId) return;

    // Get present count for this position from attendance snapshot
    const presentCount = this.getPresentCountForPosition(activePosition.id);
    if (presentCount === 0) return;

    // First, check if ALL present members have voted
    const totalVotesStmt = db.prepare(
      "SELECT COUNT(DISTINCT voter_id) as count FROM votes WHERE position_id = ? AND election_id = ? AND scrutiny_round = ?"
    );
    const totalVotesResult = totalVotesStmt.get(positionId, electionId, scrutinyRound) as { count: number };
    
    // Only check for winner if all present members have voted
    if (totalVotesResult.count < presentCount) {
      return; // Wait for all votes
    }

    const majorityThreshold = Math.floor(presentCount / 2) + 1;

    // Use a single optimized query with GROUP BY to find candidate with majority
    const winnerStmt = db.prepare(`
      SELECT candidate_id, COUNT(*) as vote_count
      FROM votes 
      WHERE position_id = ? AND election_id = ? AND scrutiny_round = ?
      GROUP BY candidate_id
      HAVING vote_count >= ?
      ORDER BY vote_count DESC
      LIMIT 1
    `);
    const winner = winnerStmt.get(positionId, electionId, scrutinyRound, majorityThreshold) as { candidate_id: number; vote_count: number } | undefined;

    if (winner) {
      // This candidate has reached majority - set as winner
      this.setWinner(electionId, winner.candidate_id, positionId, scrutinyRound);
      // Complete this position
      this.completePosition(activePosition.id);
    }
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

    // Get all election positions with position names in one query
    const electionPositions = db.prepare(`
      SELECT ep.*, p.name as positionName
      FROM election_positions ep
      JOIN positions p ON ep.position_id = p.id
      WHERE ep.election_id = ?
      ORDER BY ep.order_index
    `).all(electionId) as any[];
    
    // Get present count
    const presentCount = this.getPresentCount(electionId);
    
    const results: ElectionResults = {
      electionId: election.id,
      electionName: election.name,
      isActive: election.isActive,
      currentScrutiny: electionPositions.find(ep => ep.status === 'active')?.current_scrutiny || 1,
      presentCount,
      positions: [],
    };

    // Get all candidates with vote counts for current scrutiny
    const candidatesWithVotes = db.prepare(`
      SELECT 
        c.id as candidateId,
        c.name as candidateName,
        c.email as candidateEmail,
        c.position_id as positionId,
        ep.current_scrutiny as currentScrutiny,
        COALESCE(v.vote_count, 0) as voteCount
      FROM candidates c
      INNER JOIN election_positions ep ON c.position_id = ep.position_id AND c.election_id = ep.election_id
      LEFT JOIN (
        SELECT v.candidate_id, v.scrutiny_round, COUNT(*) as vote_count
        FROM votes v
        INNER JOIN election_positions ep2 ON v.position_id = ep2.position_id AND v.election_id = ep2.election_id
        WHERE v.election_id = ? AND v.scrutiny_round = ep2.current_scrutiny
        GROUP BY v.candidate_id, v.scrutiny_round
      ) v ON c.id = v.candidate_id AND v.scrutiny_round = ep.current_scrutiny
      WHERE c.election_id = ?
      ORDER BY c.position_id, voteCount DESC
    `).all(electionId, electionId) as any[];

    // Get all winners in one query
    const winners = db.prepare(`
      SELECT position_id as positionId, candidate_id as candidateId, won_at_scrutiny as wonAtScrutiny
      FROM election_winners
      WHERE election_id = ?
    `).all(electionId) as any[];
    
    const winnersMap = new Map(winners.map(w => [w.positionId, { candidateId: w.candidateId, wonAtScrutiny: w.wonAtScrutiny }]));

    // Get total voters per position in one query
    const votersPerPosition = db.prepare(`
      SELECT position_id, scrutiny_round, COUNT(DISTINCT voter_id) as count
      FROM votes
      WHERE election_id = ?
      GROUP BY position_id, scrutiny_round
    `).all(electionId) as any[];
    
    const votersMap = new Map(votersPerPosition.map(v => [`${v.position_id}_${v.scrutiny_round}`, v.count]));

    for (const electionPosition of electionPositions) {
      const currentScrutiny = electionPosition.current_scrutiny;
      const positionId = electionPosition.position_id;
      
      // Calculate majority threshold
      let majorityThreshold: number;
      if (currentScrutiny === 3) {
        majorityThreshold = 1;
      } else {
        majorityThreshold = Math.floor(presentCount / 2) + 1;
      }
      
      // Get candidates for this position from pre-fetched data
      const positionCandidates = candidatesWithVotes
        .filter(c => c.positionId === positionId && c.currentScrutiny === currentScrutiny)
        .map(c => ({
          candidateId: c.candidateId,
          candidateName: c.candidateName,
          candidateEmail: c.candidateEmail,
          photoUrl: "",
          voteCount: c.voteCount,
          isElected: false,
          electedInScrutiny: undefined as number | undefined,
        }));

      const totalVoters = votersMap.get(`${positionId}_${currentScrutiny}`) || 0;

      // Determine if someone won
      let winnerId: number | undefined;
      let winnerScrutiny: number | undefined;
      let needsNextScrutiny = false;

      const winner = winnersMap.get(positionId);
      if (winner) {
        winnerId = winner.candidateId;
        winnerScrutiny = winner.wonAtScrutiny;
      } else if (currentScrutiny < 3 && positionCandidates.length > 0 && positionCandidates[0].voteCount >= majorityThreshold) {
        winnerId = positionCandidates[0].candidateId;
        winnerScrutiny = currentScrutiny;
      } else if (currentScrutiny === 3) {
        if (positionCandidates.length > 1 && positionCandidates[0].voteCount === positionCandidates[1].voteCount) {
          needsNextScrutiny = false;
        } else if (positionCandidates.length > 0 && positionCandidates[0].voteCount > 0) {
          winnerId = positionCandidates[0].candidateId;
          winnerScrutiny = 3;
        }
      } else if (currentScrutiny < 3 && electionPosition.status === 'active') {
        needsNextScrutiny = true;
      }

      // Mark elected candidate
      if (winnerId) {
        const electedCandidate = positionCandidates.find(c => c.candidateId === winnerId);
        if (electedCandidate) {
          electedCandidate.isElected = true;
          electedCandidate.electedInScrutiny = winnerScrutiny;
        }
      }

      results.positions.push({
        positionId: electionPosition.position_id,
        positionName: electionPosition.positionName,
        status: electionPosition.status,
        currentScrutiny,
        orderIndex: electionPosition.order_index,
        totalVoters,
        majorityThreshold,
        needsNextScrutiny,
        winnerId,
        winnerScrutiny,
        candidates: positionCandidates,
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
