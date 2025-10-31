import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  generateToken, 
  hashPassword, 
  comparePassword, 
  authenticateToken, 
  requireAdmin, 
  requireMember,
  type AuthRequest 
} from "./auth";
import { 
  loginSchema, 
  registerSchema, 
  insertCandidateSchema,
  requestCodeSchema,
  verifyCodeSchema,
  addMemberSchema,
  getGravatarUrl,
} from "@shared/schema";
import type { AuthResponse } from "@shared/schema";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  if (!resend) {
    console.log(`[EMAIL DISABLED] Verification code for ${email}: ${code}`);
    return false;
  }
  
  try {
    await resend.emails.send({
      from: "Emaús Vota <suporte@emausvota.com.br>" ,
      to: email,
      subject: "Seu código de verificação - Emaús Vota",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FFA500;">Emaús Vota</h2>
          <p>Olá,</p>
          <p>Seu código de verificação é:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #FFA500; font-size: 32px; letter-spacing: 8px; margin: 0;">${code}</h1>
          </div>
          <p>Este código expira em 15 minutos.</p>
          <p>Se você não solicitou este código, ignore este email.</p>
          <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 12px;">UMP Emaús - Sistema de Votação</p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const user = storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      const isPasswordValid = await comparePassword(
        validatedData.password,
        user.password
      );
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      const { password, ...userWithoutPassword } = user;
      const token = generateToken(userWithoutPassword);

      const response: AuthResponse = {
        user: userWithoutPassword,
        token,
      };

      res.json(response);
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao fazer login" 
      });
    }
  });

  app.post("/api/auth/request-code", async (req, res) => {
    try {
      const validatedData = requestCodeSchema.parse(req.body);
      
      const user = storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(404).json({ message: "Este e-mail não está cadastrado no sistema. Entre em contato com o administrador." });
      }

      storage.deleteVerificationCodesByEmail(validatedData.email);

      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      storage.createVerificationCode({
        email: validatedData.email,
        code,
        expiresAt,
      });

      const emailSent = await sendVerificationEmail(validatedData.email, code);

      if (!emailSent) {
        console.log(`[FALLBACK] Código de verificação para ${validatedData.email}: ${code}`);
      }

      res.json({ message: "Código enviado para seu email" });
    } catch (error) {
      console.error("Request code error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao solicitar código" 
      });
    }
  });

  app.post("/api/auth/verify-code", async (req, res) => {
    try {
      const validatedData = verifyCodeSchema.parse(req.body);
      
      const verificationCode = storage.getValidVerificationCode(
        validatedData.email,
        validatedData.code
      );

      if (!verificationCode) {
        return res.status(401).json({ message: "Código inválido ou expirado" });
      }

      const user = storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(404).json({ message: "Este e-mail não está cadastrado no sistema" });
      }

      storage.deleteVerificationCodesByEmail(validatedData.email);

      const { password, ...userWithoutPassword } = user;
      const token = generateToken(userWithoutPassword);

      const response: AuthResponse = {
        user: userWithoutPassword,
        token,
      };

      res.json(response);
    } catch (error) {
      console.error("Verify code error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao verificar código" 
      });
    }
  });

  app.post("/api/admin/members", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const validatedData = addMemberSchema.parse(req.body);
      
      const existingUser = storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }

      const user = storage.createUser({
        fullName: validatedData.fullName,
        email: validatedData.email,
        password: Math.random().toString(36),
        isAdmin: false,
        isMember: true,
      } as any);

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Add member error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao adicionar membro" 
      });
    }
  });

  app.delete("/api/admin/members/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const memberId = parseInt(req.params.id);
      
      if (isNaN(memberId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      storage.deleteMember(memberId);
      res.json({ message: "Membro removido com sucesso" });
    } catch (error) {
      console.error("Delete member error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao remover membro" 
      });
    }
  });

  app.post("/api/elections", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { name } = req.body;
      
      if (!name || typeof name !== "string") {
        return res.status(400).json({ message: "Nome da eleição é obrigatório" });
      }

      const election = storage.createElection(name);
      res.json(election);
    } catch (error) {
      console.error("Create election error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao criar eleição" 
      });
    }
  });

  app.patch("/api/elections/:id/close", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      
      const election = storage.getElectionById(electionId);
      if (!election) {
        return res.status(404).json({ message: "Eleição não encontrada" });
      }

      storage.closeElection(electionId);
      res.json({ message: "Eleição encerrada com sucesso" });
    } catch (error) {
      console.error("Close election error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao encerrar eleição" 
      });
    }
  });

  app.post("/api/elections/:id/finalize", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      
      const election = storage.getElectionById(electionId);
      if (!election) {
        return res.status(404).json({ message: "Eleição não encontrada" });
      }

      // Verificar se todos os cargos estão decididos
      const positions = storage.getElectionPositions(electionId);
      const allCompleted = positions.every(p => p.status === 'completed');
      
      if (!allCompleted) {
        return res.status(400).json({ message: "Todos os cargos devem estar decididos antes de finalizar a eleição" });
      }

      storage.finalizeElection(electionId);
      res.json({ message: "Eleição finalizada com sucesso" });
    } catch (error) {
      console.error("Finalize election error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao finalizar eleição" 
      });
    }
  });

  app.get("/api/elections/history", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const history = storage.getElectionHistory();
      res.json(history);
    } catch (error) {
      console.error("Get election history error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar histórico de eleições" 
      });
    }
  });

  // Election Attendance endpoints
  app.get("/api/elections/:id/attendance", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      const attendance = storage.getElectionAttendance(electionId);
      
      // Join with user information
      const attendanceWithUsers = attendance.map(att => {
        const user = storage.getUserById(att.memberId);
        return {
          ...att,
          memberName: user?.fullName || '',
          memberEmail: user?.email || '',
        };
      });
      
      res.json(attendanceWithUsers);
    } catch (error) {
      console.error("Get attendance error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar presença" 
      });
    }
  });

  app.post("/api/elections/:id/attendance/initialize", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      storage.initializeAttendance(electionId);
      res.json({ message: "Lista de presença inicializada" });
    } catch (error) {
      console.error("Initialize attendance error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao inicializar presença" 
      });
    }
  });

  app.patch("/api/elections/:id/attendance/:memberId", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      const memberId = parseInt(req.params.memberId);
      const { isPresent } = req.body;
      
      if (typeof isPresent !== 'boolean') {
        return res.status(400).json({ message: "isPresent deve ser booleano" });
      }
      
      storage.setMemberAttendance(electionId, memberId, isPresent);
      res.json({ message: "Presença atualizada" });
    } catch (error) {
      console.error("Set attendance error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao atualizar presença" 
      });
    }
  });

  app.get("/api/elections/:id/attendance/count", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      const count = storage.getPresentCount(electionId);
      res.json({ presentCount: count });
    } catch (error) {
      console.error("Get present count error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao contar presentes" 
      });
    }
  });

  // Election Positions endpoints
  app.get("/api/elections/:id/positions", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      const electionPositions = storage.getElectionPositions(electionId);
      
      // Join with position names
      const positionsWithNames = electionPositions.map(ep => {
        const allPositions = storage.getAllPositions();
        const position = allPositions.find(p => p.id === ep.positionId);
        return {
          ...ep,
          positionName: position?.name || '',
        };
      });
      
      res.json(positionsWithNames);
    } catch (error) {
      console.error("Get election positions error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar cargos da eleição" 
      });
    }
  });

  app.get("/api/elections/:id/positions/active", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      const activePosition = storage.getActiveElectionPosition(electionId);
      
      if (!activePosition) {
        return res.json(null);
      }
      
      // Join with position name
      const allPositions = storage.getAllPositions();
      const position = allPositions.find(p => p.id === activePosition.positionId);
      
      res.json({
        ...activePosition,
        positionName: position?.name || '',
      });
    } catch (error) {
      console.error("Get active position error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar cargo ativo" 
      });
    }
  });

  app.post("/api/elections/:id/positions/advance-scrutiny", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      const activePosition = storage.getActiveElectionPosition(electionId);
      
      if (!activePosition) {
        return res.status(404).json({ message: "Nenhum cargo ativo encontrado" });
      }
      
      storage.advancePositionScrutiny(activePosition.id);
      res.json({ message: "Escrutínio avançado com sucesso" });
    } catch (error) {
      console.error("Advance scrutiny error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao avançar escrutínio" 
      });
    }
  });

  app.post("/api/elections/:id/positions/open-next", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      
      // Check if there are any present members before opening position
      const presentCount = storage.getPresentCount(electionId);
      if (presentCount === 0) {
        return res.status(400).json({ message: "Registre primeiro a presença dos membros antes de abrir a votação" });
      }
      
      const nextPosition = storage.openNextPosition(electionId);
      
      if (!nextPosition) {
        return res.status(404).json({ message: "Nenhum próximo cargo disponível" });
      }
      
      // Join with position name
      const allPositions = storage.getAllPositions();
      const position = allPositions.find(p => p.id === nextPosition.positionId);
      
      res.json({
        ...nextPosition,
        positionName: position?.name || '',
      });
    } catch (error) {
      console.error("Open next position error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao abrir próximo cargo" 
      });
    }
  });

  app.post("/api/elections/:id/positions/:positionId/open", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      const electionPositionId = parseInt(req.params.positionId);
      
      // Check if there are any present members before opening position
      const presentCount = storage.getPresentCount(electionId);
      if (presentCount === 0) {
        return res.status(400).json({ message: "Confirme primeiro a presença dos membros antes de abrir a votação." });
      }
      
      // Open the specific position
      const openedPosition = storage.openPosition(electionPositionId);
      
      // Join with position name
      const allPositions = storage.getAllPositions();
      const position = allPositions.find(p => p.id === openedPosition.positionId);
      
      res.json({
        ...openedPosition,
        positionName: position?.name || '',
      });
    } catch (error) {
      console.error("Open position error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao abrir cargo" 
      });
    }
  });

  app.post("/api/elections/:id/positions/:positionId/force-close", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      const electionPositionId = parseInt(req.params.positionId);
      const { reason } = req.body;
      
      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        return res.status(400).json({ message: "É necessário fornecer um motivo para fechar manualmente" });
      }
      
      // Verify this is an active position
      const activePosition = storage.getActiveElectionPosition(electionId);
      if (!activePosition || activePosition.id !== electionPositionId) {
        return res.status(400).json({ message: "Esta posição não está ativa" });
      }
      
      // Force complete the position
      storage.forceCompletePosition(electionPositionId, reason);
      
      res.json({ message: "Cargo fechado manualmente com sucesso" });
    } catch (error) {
      console.error("Force close position error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao fechar cargo manualmente" 
      });
    }
  });

  app.post("/api/candidates", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const validatedData = insertCandidateSchema.parse(req.body);
      
      // Validate that the user is not an admin
      const user = storage.getUserById(validatedData.userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      if (user.isAdmin) {
        return res.status(400).json({ message: "Administradores não podem ser candidatos" });
      }

      // Check if user is present
      const isPresent = storage.isMemberPresent(validatedData.electionId, validatedData.userId);
      if (!isPresent) {
        return res.status(400).json({ message: "Apenas membros com presença confirmada podem ser candidatos" });
      }
      
      // Validate that the user is not already a winner in this election
      const winners = storage.getElectionWinners(validatedData.electionId);
      const isAlreadyWinner = winners.some(w => w.userId === validatedData.userId);
      if (isAlreadyWinner) {
        return res.status(400).json({ message: "Este membro já foi eleito para um cargo nesta eleição" });
      }

      // Check if candidate is already added to this position
      const existingCandidates = storage.getCandidatesByPosition(validatedData.positionId, validatedData.electionId);
      const isDuplicate = existingCandidates.some(c => c.userId === validatedData.userId);
      if (isDuplicate) {
        return res.status(400).json({ message: "Este candidato já foi adicionado para este cargo" });
      }

      // Check if the position is active before adding candidates
      const activePosition = storage.getActiveElectionPosition(validatedData.electionId);
      if (!activePosition || activePosition.positionId !== validatedData.positionId) {
        return res.status(400).json({ message: "A votação para este cargo ainda não foi aberta" });
      }
      
      const candidate = storage.createCandidate(validatedData);
      res.json(candidate);
    } catch (error) {
      console.error("Create candidate error:", error);
      
      // Handle UNIQUE constraint violation
      if (error instanceof Error && error.message.includes("UNIQUE constraint")) {
        return res.status(409).json({ message: "Este candidato já foi adicionado para este cargo" });
      }
      
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao adicionar candidato" 
      });
    }
  });

  app.get("/api/elections/active", async (req, res) => {
    try {
      const election = storage.getActiveElection();
      res.json(election);
    } catch (error) {
      console.error("Get active election error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar eleição ativa" 
      });
    }
  });

  app.get("/api/members", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const members = storage.getAllMembers();
      const membersWithoutPasswords = members.map(({ password, ...user }) => user);
      res.json(membersWithoutPasswords);
    } catch (error) {
      console.error("Get members error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar membros" 
      });
    }
  });

  app.get("/api/members/non-admins", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const members = storage.getAllMembers(true); // Exclude admins
      const membersWithoutPasswords = members.map(({ password, ...user }) => user);
      res.json(membersWithoutPasswords);
    } catch (error) {
      console.error("Get non-admin members error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar membros" 
      });
    }
  });

  app.get("/api/positions", async (req, res) => {
    try {
      const positions = storage.getAllPositions();
      res.json(positions);
    } catch (error) {
      console.error("Get positions error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar cargos" 
      });
    }
  });

  app.get("/api/candidates", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const activeElection = storage.getActiveElection();
      if (!activeElection) {
        return res.json([]);
      }

      const candidates = storage.getCandidatesByElection(activeElection.id);
      res.json(candidates);
    } catch (error) {
      console.error("Get candidates error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar candidatos" 
      });
    }
  });

  app.get("/api/elections/:electionId/positions/:positionId/candidates", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.electionId);
      const positionId = parseInt(req.params.positionId);
      
      if (isNaN(electionId) || isNaN(positionId)) {
        return res.status(400).json({ message: "IDs inválidos" });
      }

      const candidates = storage.getCandidatesByPosition(positionId, electionId);
      const candidatesWithPhotos = candidates.map(candidate => ({
        ...candidate,
        photoUrl: getGravatarUrl(candidate.email),
      }));
      
      res.json(candidatesWithPhotos);
    } catch (error) {
      console.error("Get position candidates error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar candidatos" 
      });
    }
  });

  app.post("/api/vote", authenticateToken, requireMember, async (req: AuthRequest, res) => {
    try {
      const { candidateId, positionId, electionId } = req.body;
      const voterId = req.user!.id;

      if (!candidateId || !positionId || !electionId) {
        return res.status(400).json({ message: "Dados incompletos" });
      }

      // Check if voter is present
      const isPresent = storage.isMemberPresent(electionId, voterId);
      if (!isPresent) {
        return res.status(403).json({ message: "Apenas membros com presença confirmada podem votar" });
      }

      // Get active position for this election to determine scrutiny round
      const activePosition = storage.getActiveElectionPosition(electionId);
      if (!activePosition) {
        return res.status(400).json({ message: "Nenhum cargo ativo no momento" });
      }

      // Verify user is voting for the active position
      if (activePosition.positionId !== positionId) {
        return res.status(400).json({ message: "Este cargo não está ativo no momento" });
      }

      const scrutinyRound = activePosition.currentScrutiny;

      const hasVoted = storage.hasUserVoted(voterId, positionId, electionId, scrutinyRound);
      if (hasVoted) {
        return res.status(403).json({ message: "Você já votou para esse cargo neste escrutínio." });
      }

      const vote = storage.createVote({
        voterId,
        candidateId,
        positionId,
        electionId,
        scrutinyRound,
      });

      res.json({ 
        message: "Voto registrado com sucesso!",
        vote 
      });
    } catch (error) {
      console.error("Vote error:", error);
      
      if (error instanceof Error && error.message.includes("UNIQUE constraint")) {
        return res.status(403).json({ message: "Você já votou para esse cargo neste escrutínio." });
      }
      
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao registrar voto" 
      });
    }
  });

  app.get("/api/results/latest", async (req, res) => {
    try {
      const results = storage.getLatestElectionResults();
      if (results) {
        // Add Gravatar URLs to candidates
        results.positions.forEach(position => {
          position.candidates.forEach(candidate => {
            candidate.photoUrl = getGravatarUrl(candidate.candidateEmail);
          });
        });
      }
      res.json(results);
    } catch (error) {
      console.error("Get latest results error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar resultados" 
      });
    }
  });

  app.get("/api/results/:electionId", async (req, res) => {
    try {
      const electionId = parseInt(req.params.electionId);
      const results = storage.getElectionResults(electionId);
      
      if (!results) {
        return res.status(404).json({ message: "Eleição não encontrada" });
      }

      // Add Gravatar URLs to candidates
      results.positions.forEach(position => {
        position.candidates.forEach(candidate => {
          candidate.photoUrl = getGravatarUrl(candidate.candidateEmail);
        });
      });

      res.json(results);
    } catch (error) {
      console.error("Get results error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar resultados" 
      });
    }
  });

  app.get("/api/elections/:electionId/winners", async (req, res) => {
    try {
      const electionId = parseInt(req.params.electionId);
      const winners = storage.getElectionWinners(electionId);
      const results = storage.getElectionResults(electionId);
      
      if (!results) {
        return res.status(404).json({ message: "Eleição não encontrada" });
      }
      
      // Get position, user details, and vote count for each winner
      const formattedWinners = winners.map(w => {
        const user = storage.getUserById(w.userId);
        const positions = storage.getAllPositions();
        const position = positions.find(p => p.id === w.positionId);
        
        // Find vote count from results
        const positionResults = results.positions.find(p => p.positionId === w.positionId);
        const candidateResults = positionResults?.candidates.find(c => c.candidateId === w.candidateId);
        
        return {
          positionId: w.positionId,
          positionName: position?.name || '',
          candidateName: user?.fullName || '',
          photoUrl: user?.email ? getGravatarUrl(user.email) : undefined,
          voteCount: candidateResults?.voteCount || 0,
          wonAtScrutiny: w.wonAtScrutiny
        };
      });

      res.json(formattedWinners);
    } catch (error) {
      console.error("Get winners error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar vencedores" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
