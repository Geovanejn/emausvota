import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  PlayCircle, 
  XCircle, 
  PlusCircle, 
  ChartBar, 
  LogOut, 
  Users,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  Square,
  UserCheck,
  Download,
} from "lucide-react";
import { useLocation } from "wouter";
import type { Election, Position, CandidateWithDetails, ElectionResults } from "@shared/schema";
import ExportResultsImage, { type ExportResultsImageHandle } from "@/components/ExportResultsImage";

export default function AdminPage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [isCreateElectionOpen, setIsCreateElectionOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [newMember, setNewMember] = useState({
    fullName: "",
    email: "",
  });
  
  const exportImageRef = useRef<ExportResultsImageHandle>(null);
  const [exportAspectRatio, setExportAspectRatio] = useState<"9:16" | "4:5">("9:16");
  const [isForceCloseDialogOpen, setIsForceCloseDialogOpen] = useState(false);
  const [forceCloseReason, setForceCloseReason] = useState("");
  const [forceClosePositionId, setForceClosePositionId] = useState<number | null>(null);

  const { data: activeElection, isLoading: loadingElection } = useQuery<Election | null>({
    queryKey: ["/api/elections/active"],
    staleTime: 15000,
    refetchInterval: 15000,
  });

  const { data: positions = [], isLoading: loadingPositions } = useQuery<Position[]>({
    queryKey: ["/api/positions"],
    staleTime: 60000,
  });

  const { data: candidates = [], isLoading: loadingCandidates } = useQuery<CandidateWithDetails[]>({
    queryKey: ["/api/candidates"],
    enabled: !!activeElection,
    staleTime: 10000,
  });

  const { data: members = [] } = useQuery<Array<{ id: number; fullName: string; email: string; isAdmin: boolean }>>({
    queryKey: ["/api/members"],
    staleTime: 30000,
  });

  // Non-admin members for candidate selection
  const { data: nonAdminMembers = [] } = useQuery<Array<{ id: number; fullName: string; email: string }>>({
    queryKey: ["/api/members/non-admins"],
    enabled: isAddCandidateOpen, // Only fetch when dialog is open
  });

  // Winners of current election
  const { data: electionWinners = [] } = useQuery<Array<{ userId: number; positionId: number; candidateId: number; wonAtScrutiny: number }>>({
    queryKey: ["/api/elections", activeElection?.id, "winners"],
    enabled: !!activeElection && isAddCandidateOpen,
  });

  // Filter out winners from available members
  const availableMembers = nonAdminMembers.filter(m => 
    !electionWinners.some(w => w.userId === m.id)
  );

  // Election results for scrutiny management
  const { data: results } = useQuery<ElectionResults | null>({
    queryKey: ["/api/results/latest"],
    enabled: !!activeElection,
    staleTime: 10000,
  });

  // Election positions for sequential voting
  const { data: electionPositions = [] } = useQuery<Array<{
    id: number;
    electionId: number;
    positionId: number;
    positionName: string;
    status: "pending" | "active" | "completed";
    currentScrutiny: number;
    orderIndex: number;
  }>>({
    queryKey: ["/api/elections", activeElection?.id, "positions"],
    enabled: !!activeElection,
    staleTime: 10000,
  });

  // Active position
  const { data: activePosition } = useQuery<{
    id: number;
    electionId: number;
    positionId: number;
    positionName: string;
    status: "active";
    currentScrutiny: number;
    orderIndex: number;
  } | null>({
    queryKey: ["/api/elections", activeElection?.id, "positions", "active"],
    enabled: !!activeElection,
    staleTime: 10000,
  });

  // Attendance for current election
  const { data: attendance = [] } = useQuery<Array<{
    id: number;
    electionId: number;
    memberId: number;
    memberName: string;
    memberEmail: string;
    isPresent: boolean;
  }>>({
    queryKey: ["/api/elections", activeElection?.id, "attendance"],
    enabled: !!activeElection,
    staleTime: 5000,
  });

  // Present count
  const { data: presentCountData } = useQuery<{ presentCount: number }>({
    queryKey: ["/api/elections", activeElection?.id, "attendance", "count"],
    enabled: !!activeElection,
    staleTime: 5000,
  });

  // Election history
  const { data: electionHistory = [] } = useQuery<Election[]>({
    queryKey: ["/api/elections/history"],
    staleTime: 30000,
  });

  const createElectionMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", "/api/elections", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections/active"] });
      toast({
        title: "Eleição criada com sucesso!",
        description: "A nova eleição está ativa agora",
      });
      setIsCreateElectionOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar eleição",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const closeElectionMutation = useMutation({
    mutationFn: async (electionId: number) => {
      return await apiRequest("PATCH", `/api/elections/${electionId}/close`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections/active"] });
      toast({
        title: "Eleição encerrada",
        description: "A eleição foi encerrada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao encerrar eleição",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const finalizeElectionMutation = useMutation({
    mutationFn: async (electionId: number) => {
      return await apiRequest("POST", `/api/elections/${electionId}/finalize`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/elections/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/results/latest"] });
      toast({
        title: "Eleição finalizada!",
        description: "A eleição foi arquivada no histórico",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao finalizar eleição",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addCandidateMutation = useMutation({
    mutationFn: async (candidate: { name: string; email: string; userId: number; positionId: number; electionId: number }) => {
      return await apiRequest("POST", "/api/candidates", candidate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Candidato adicionado!",
        description: "O candidato foi registrado na eleição",
      });
      setIsAddCandidateOpen(false);
      setSelectedMemberId("");
      setSelectedPositionId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar candidato",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (member: { fullName: string; email: string }) => {
      return await apiRequest("POST", "/api/admin/members", member);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({
        title: "Membro cadastrado!",
        description: "O membro foi cadastrado com sucesso",
      });
      setIsAddMemberOpen(false);
      setNewMember({ fullName: "", email: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao cadastrar membro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      return await apiRequest("DELETE", `/api/admin/members/${memberId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({
        title: "Membro removido!",
        description: "O membro foi removido com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover membro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const initializeAttendanceMutation = useMutation({
    mutationFn: async (electionId: number) => {
      return await apiRequest("POST", `/api/elections/${electionId}/attendance/initialize`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "attendance"] });
      toast({
        title: "Lista de presença inicializada!",
        description: "Todos os membros foram adicionados à lista",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao inicializar presença",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setAttendanceMutation = useMutation({
    mutationFn: async ({ electionId, memberId, isPresent }: { electionId: number; memberId: number; isPresent: boolean }) => {
      return await apiRequest("PATCH", `/api/elections/${electionId}/attendance/${memberId}`, { isPresent });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "attendance", "count"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar presença",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const advanceScrutinyMutation = useMutation({
    mutationFn: async (electionId: number) => {
      return await apiRequest("POST", `/api/elections/${electionId}/positions/advance-scrutiny`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "positions", "active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/results/latest"] });
      toast({
        title: "Escrutínio avançado!",
        description: "A votação passou para o próximo escrutínio",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao avançar escrutínio",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openNextPositionMutation = useMutation({
    mutationFn: async (electionId: number) => {
      return await apiRequest("POST", `/api/elections/${electionId}/positions/open-next`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "positions", "active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/results/latest"] });
      toast({
        title: "Próximo cargo aberto!",
        description: "Votação iniciada para o próximo cargo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao abrir próximo cargo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openPositionMutation = useMutation({
    mutationFn: async (data: { electionId: number; electionPositionId: number }) => {
      return await apiRequest("POST", `/api/elections/${data.electionId}/positions/${data.electionPositionId}/open`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "positions", "active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/results/latest"] });
      toast({
        title: "Cargo aberto!",
        description: "Votação iniciada para o cargo selecionado",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao abrir cargo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setWinnerMutation = useMutation({
    mutationFn: async (data: { electionId: number; candidateId: number; positionId: number }) => {
      return await apiRequest("PATCH", `/api/elections/${data.electionId}/set-winner`, {
        candidateId: data.candidateId,
        positionId: data.positionId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/results/latest"] });
      toast({
        title: "Vencedor definido!",
        description: "O vencedor foi escolhido com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao definir vencedor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const forceClosePositionMutation = useMutation({
    mutationFn: async (data: { electionId: number; electionPositionId: number; reason: string }) => {
      return await apiRequest("POST", `/api/elections/${data.electionId}/positions/${data.electionPositionId}/force-close`, {
        reason: data.reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "positions", "active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/results/latest"] });
      toast({
        title: "Cargo fechado manualmente",
        description: "O cargo foi encerrado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao fechar cargo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const handleExportResults = async () => {
    if (exportImageRef.current) {
      try {
        await exportImageRef.current.exportImage();
        toast({
          title: "Imagem exportada!",
          description: "Os resultados foram salvos como imagem",
        });
      } catch (error) {
        toast({
          title: "Erro ao exportar",
          description: "Não foi possível gerar a imagem",
          variant: "destructive",
        });
      }
    }
  };

  const handleFinalizeElection = () => {
    if (!activeElection) return;
    if (confirm("Tem certeza que deseja finalizar a eleição? Ela será arquivada no histórico e não poderá mais ser modificada.")) {
      finalizeElectionMutation.mutate(activeElection.id);
    }
  };

  const handleCreateElection = () => {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    createElectionMutation.mutate(`Eleição ${currentYear}/${nextYear}`);
  };

  const handleForceClosePosition = () => {
    if (!activeElection || !forceClosePositionId || !forceCloseReason.trim()) {
      return;
    }
    
    forceClosePositionMutation.mutate({
      electionId: activeElection.id,
      electionPositionId: forceClosePositionId,
      reason: forceCloseReason.trim(),
    });
    
    setIsForceCloseDialogOpen(false);
    setForceCloseReason("");
    setForceClosePositionId(null);
  };

  const handleCloseElection = () => {
    if (!activeElection) return;
    if (confirm("Tem certeza que deseja encerrar a eleição atual?")) {
      closeElectionMutation.mutate(activeElection.id);
    }
  };

  const handleAddCandidate = () => {
    if (!selectedMemberId || !selectedPositionId || !activeElection) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione um membro e um cargo",
        variant: "destructive",
      });
      return;
    }

    const selectedMember = nonAdminMembers.find(m => m.id === parseInt(selectedMemberId));
    if (!selectedMember) return;

    addCandidateMutation.mutate({
      name: selectedMember.fullName,
      email: selectedMember.email,
      userId: selectedMember.id,
      positionId: parseInt(selectedPositionId),
      electionId: activeElection.id,
    });
  };

  const handleAddMember = () => {
    if (!newMember.fullName || !newMember.email) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    addMemberMutation.mutate({
      fullName: newMember.fullName,
      email: newMember.email,
    });
  };

  const handleDeleteMember = (memberId: number) => {
    if (confirm("Tem certeza que deseja remover este membro?")) {
      deleteMemberMutation.mutate(memberId);
    }
  };

  const isLoading = loadingElection || loadingPositions || loadingCandidates;

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      <div className="h-2 bg-primary w-full" />
      
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Administração</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Bem-vindo, {user?.fullName}
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout} data-testid="button-logout" className="self-end sm:self-auto">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        <Tabs defaultValue="manage" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="manage" data-testid="tab-manage">Gerenciar</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className={activeElection ? "border-green-500" : "border-border"}>
                <CardHeader>
                  <CardTitle className="text-xl">Status da Eleição</CardTitle>
                  <CardDescription>
                    {activeElection 
                      ? `Eleição ativa: ${activeElection.name}` 
                      : "Nenhuma eleição ativa"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activeElection ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          Eleição em andamento
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={handleCloseElection}
                        disabled={closeElectionMutation.isPending}
                        data-testid="button-close-election"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        {closeElectionMutation.isPending ? "Encerrando..." : "Encerrar Eleição"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => setIsCreateElectionOpen(true)}
                      data-testid="button-create-election"
                    >
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Abrir Nova Eleição
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Ações Rápidas</CardTitle>
                  <CardDescription>Gerenciar eleição e resultados</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setIsAddCandidateOpen(true)}
                    disabled={!activeElection}
                    data-testid="button-add-candidate"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Adicionar Candidato
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setIsAddMemberOpen(true)}
                    data-testid="button-add-member"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Cadastrar Membro
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setLocation("/results")}
                    data-testid="button-view-results"
                  >
                    <ChartBar className="w-4 h-4 mr-2" />
                    Ver Resultados
                  </Button>
                </CardContent>
              </Card>
            </div>

            {activeElection && (
              <Card className="border-purple-500">
                <CardHeader>
                  <CardTitle className="text-xl">Controle de Presença</CardTitle>
                  <CardDescription>
                    Marque os membros presentes antes de iniciar a votação
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {attendance.length === 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Inicialize a lista de presença para marcar quem está presente na assembleia
                        </p>
                        <Button
                          className="w-full"
                          onClick={() => initializeAttendanceMutation.mutate(activeElection.id)}
                          disabled={initializeAttendanceMutation.isPending}
                          data-testid="button-initialize-attendance"
                        >
                          <UserCheck className="w-4 h-4 mr-2" />
                          {initializeAttendanceMutation.isPending ? "Inicializando..." : "Inicializar Lista de Presença"}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg">
                          <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                            Presentes: {presentCountData?.presentCount || 0} de {members.filter(m => !m.isAdmin).length} membros
                          </p>
                          <p className="text-xs text-purple-600 dark:text-purple-300 mt-1">
                            Selecione os presentes e clique em confirmar
                          </p>
                        </div>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {attendance.map((att) => {
                            const member = members.find(m => m.id === att.memberId);
                            const isAdmin = member?.isAdmin || false;
                            
                            // Skip admin in attendance list
                            if (isAdmin) return null;
                            
                            return (
                              <button
                                key={att.memberId}
                                onClick={() => setAttendanceMutation.mutate({
                                  electionId: activeElection.id,
                                  memberId: att.memberId,
                                  isPresent: !att.isPresent
                                })}
                                className="w-full flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors text-left"
                                data-testid={`button-toggle-attendance-${att.memberId}`}
                              >
                                {att.isPresent ? (
                                  <CheckSquare className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                                ) : (
                                  <Square className="w-5 h-5 text-muted-foreground shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className={`font-medium truncate ${att.isPresent ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {att.memberName}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {att.memberEmail}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <Button
                          className="w-full"
                          onClick={() => {
                            toast({
                              title: "Presença confirmada!",
                              description: `${presentCountData?.presentCount || 0} membros marcados como presentes`,
                            });
                          }}
                          data-testid="button-confirm-attendance"
                        >
                          <UserCheck className="w-4 h-4 mr-2" />
                          Confirmar Presença
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeElection && results && (
              <Card className="border-blue-500">
                <CardHeader>
                  <CardTitle className="text-xl">Gerenciamento de Votação por Cargo</CardTitle>
                  <CardDescription>
                    Abra a votação para cada cargo individualmente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activePosition && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Cargo Ativo: {activePosition.positionName}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                          Escrutínio atual: {activePosition.currentScrutiny}º Escrutínio
                        </p>
                      </div>
                    )}

                    {/* Show progress of all positions with individual open buttons */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Cargos da Eleição:</p>
                      {electionPositions.map((pos) => (
                        <div
                          key={pos.id}
                          className={`p-3 border rounded-lg ${
                            pos.status === "completed"
                              ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950"
                              : pos.status === "active"
                              ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950"
                              : "border-border bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <p className={`font-medium ${
                                pos.status === "active" ? "text-blue-900 dark:text-blue-100" :
                                pos.status === "completed" ? "text-green-900 dark:text-green-100" :
                                "text-muted-foreground"
                              }`}>
                                {pos.positionName}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {pos.status === "completed" ? "Concluído" :
                                 pos.status === "active" ? `Escrutínio atual: ${pos.currentScrutiny}º Escrutínio` :
                                 "Pendente"}
                              </p>
                            </div>
                            {pos.status === "pending" && (
                              <Button
                                size="sm"
                                onClick={() => openPositionMutation.mutate({ electionId: activeElection.id, electionPositionId: pos.id })}
                                disabled={openPositionMutation.isPending}
                                data-testid={`button-open-position-${pos.id}`}
                              >
                                <PlayCircle className="w-4 h-4 mr-1" />
                                {openPositionMutation.isPending ? "Abrindo..." : "Abrir"}
                              </Button>
                            )}
                            {pos.status === "active" && (
                              <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            )}
                            {pos.status === "completed" && (
                              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Show active position result */}
                    {activePosition && results.positions
                      .filter(p => p.positionId === activePosition.positionId)
                      .map(position => (
                        <div key={position.positionId}>
                          {position.needsNextScrutiny && activePosition.currentScrutiny < 3 && (
                            <div className="space-y-3">
                              <div className="p-3 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 rounded-lg">
                                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                                  Resultado: Indefinido (nenhum candidato alcançou maioria absoluta)
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                  Necessário avançar para o próximo escrutínio
                                </p>
                              </div>
                              <Button
                                className="w-full"
                                onClick={() => advanceScrutinyMutation.mutate(activeElection.id)}
                                disabled={advanceScrutinyMutation.isPending}
                                data-testid="button-advance-scrutiny"
                              >
                                <ArrowRight className="w-4 h-4 mr-2" />
                                {advanceScrutinyMutation.isPending 
                                  ? "Abrindo..." 
                                  : activePosition.currentScrutiny === 1 
                                    ? "Abrir Segundo Escrutínio" 
                                    : "Abrir Terceiro Escrutínio"}
                              </Button>
                            </div>
                          )}

                          {/* Position completed - show button to open next */}
                          {!position.needsNextScrutiny && position.winnerId && (
                            <div className="space-y-3">
                              <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                      Resultado: Concluído
                                    </p>
                                    {position.candidates.find(c => c.isElected) && (
                                      <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                                        Eleito: {position.candidates.find(c => c.isElected)?.candidateName} com {position.candidates.find(c => c.isElected)?.voteCount} votos
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {electionPositions.some(p => p.status === "pending") && (
                                <Button
                                  className="w-full"
                                  onClick={() => openNextPositionMutation.mutate(activeElection.id)}
                                  disabled={openNextPositionMutation.isPending}
                                  data-testid="button-open-next-position"
                                >
                                  <ArrowRight className="w-4 h-4 mr-2" />
                                  {openNextPositionMutation.isPending ? "Abrindo..." : "Abrir Próximo Cargo"}
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Show tied positions in 3rd scrutiny */}
                          {activePosition.currentScrutiny === 3 && position.needsNextScrutiny && (
                            <div className="space-y-3">
                              <div className="p-3 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 rounded-lg">
                                <p className="text-sm font-medium text-red-900 dark:text-red-100">
                                  Resultado: Indefinido (empate no 3º escrutínio)
                                </p>
                                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                                  Escolha o vencedor manualmente
                                </p>
                              </div>
                              <div className="space-y-2">
                                {position.candidates
                                  .sort((a, b) => b.voteCount - a.voteCount)
                                  .slice(0, 2)
                                  .map(candidate => (
                                    <Button
                                      key={candidate.candidateId}
                                      variant="outline"
                                      className="w-full justify-between"
                                      onClick={() => setWinnerMutation.mutate({
                                        electionId: activeElection.id,
                                        candidateId: candidate.candidateId,
                                        positionId: position.positionId,
                                      })}
                                      disabled={setWinnerMutation.isPending}
                                      data-testid={`button-set-winner-${candidate.candidateId}`}
                                    >
                                      <span>{candidate.candidateName}</span>
                                      <span className="text-xs text-muted-foreground">{candidate.voteCount} votos</span>
                                    </Button>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* Force close button for active positions (in case of abstentions) */}
                          {position.status === 'active' && !position.winnerId && position.totalVoters < (presentCountData?.presentCount || 0) && activePosition && (
                            <div className="mt-3">
                              <div className="p-3 border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950 rounded-lg mb-2">
                                <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                                  Votação em Andamento
                                </p>
                                <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                                  {position.totalVoters} de {presentCountData?.presentCount || 0} presentes votaram
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                className="w-full border-orange-500 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950"
                                onClick={() => {
                                  setForceClosePositionId(activePosition.id);
                                  setIsForceCloseDialogOpen(true);
                                }}
                                disabled={forceClosePositionMutation.isPending}
                                data-testid="button-force-close-position"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Fechar Cargo Manualmente
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}

                    {/* Show success message if all positions are completed */}
                    {electionPositions.every(p => p.status === "completed") && (
                      <div className="space-y-3">
                        <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <p className="text-sm font-medium text-green-800 dark:text-green-200">
                              Todos os cargos foram decididos!
                            </p>
                          </div>
                          <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                            Você pode exportar os resultados e finalizar a eleição.
                          </p>
                        </div>
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={handleExportResults}
                          data-testid="button-export-results"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Exportar Resultados (Imagem)
                        </Button>
                        <Button
                          className="w-full"
                          variant="default"
                          onClick={handleFinalizeElection}
                          disabled={finalizeElectionMutation.isPending}
                          data-testid="button-finalize-election"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          {finalizeElectionMutation.isPending ? "Finalizando..." : "Finalizar Eleição"}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeElection && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Candidatos Registrados</CardTitle>
                  <CardDescription>
                    {candidates.length} candidatos na eleição atual
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {candidates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhum candidato registrado ainda</p>
                      <p className="text-sm mt-1">Adicione candidatos para começar</p>
                    </div>
                  ) : (
                    <>
                      {/* Mobile view - Cards */}
                      <div className="block sm:hidden space-y-3">
                        {candidates.map((candidate) => (
                          <div
                            key={candidate.id}
                            className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                            data-testid={`row-candidate-${candidate.id}`}
                          >
                            <p className="font-medium">{candidate.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">{candidate.positionName}</p>
                          </div>
                        ))}
                      </div>

                      {/* Desktop view - Table */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border bg-muted/50">
                              <th className="text-left px-6 py-3 font-semibold text-sm">Nome</th>
                              <th className="text-left px-6 py-3 font-semibold text-sm">Cargo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {candidates.map((candidate) => (
                              <tr 
                                key={candidate.id} 
                                className="border-b border-border hover:bg-muted/30 transition-colors"
                                data-testid={`row-candidate-${candidate.id}`}
                              >
                                <td className="px-6 py-4">{candidate.name}</td>
                                <td className="px-6 py-4">{candidate.positionName}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Membros Cadastrados</CardTitle>
                <CardDescription>
                  {members.length} membros registrados no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum membro cadastrado ainda</p>
                    <p className="text-sm mt-1">Cadastre membros para permitir votação</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile view - Cards */}
                    <div className="block sm:hidden space-y-3">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          className="p-4 border border-border rounded-lg"
                          data-testid={`row-member-${member.id}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate" data-testid={`text-member-name-${member.id}`}>
                                {member.fullName}
                              </p>
                              <p className="text-sm text-muted-foreground truncate mt-1">
                                {member.email}
                              </p>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteMember(member.id)}
                              data-testid={`button-delete-member-${member.id}`}
                              className="shrink-0"
                            >
                              Remover
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop view - Table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="text-left px-6 py-3 font-semibold text-sm">Nome</th>
                            <th className="text-left px-6 py-3 font-semibold text-sm">Email</th>
                            <th className="text-right px-6 py-3 font-semibold text-sm">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((member) => (
                            <tr 
                              key={member.id} 
                              className="border-b border-border hover:bg-muted/30 transition-colors"
                              data-testid={`row-member-${member.id}`}
                            >
                              <td className="px-6 py-4" data-testid={`text-member-name-${member.id}`}>{member.fullName}</td>
                              <td className="px-6 py-4 text-muted-foreground">{member.email}</td>
                              <td className="px-6 py-4 text-right">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteMember(member.id)}
                                  data-testid={`button-delete-member-${member.id}`}
                                >
                                  Remover
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
          </TabsContent>

          <TabsContent value="history">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Histórico de Eleições</CardTitle>
                  <CardDescription>Visualize eleições finalizadas anteriormente</CardDescription>
                </CardHeader>
                <CardContent>
                  {electionHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma eleição finalizada ainda
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {electionHistory.map((election) => (
                        <Card key={election.id} className="hover-elevate" data-testid={`card-election-${election.id}`}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-lg">{election.name}</CardTitle>
                                <CardDescription className="text-sm">
                                  Finalizada em {new Date(election.closedAt || '').toLocaleDateString('pt-BR')}
                                </CardDescription>
                              </div>
                              <Button
                                variant="outline"
                                onClick={() => setLocation(`/results?electionId=${election.id}`)}
                                data-testid={`button-view-election-${election.id}`}
                              >
                                <ChartBar className="w-4 h-4 mr-2" />
                                Ver Resultados
                              </Button>
                            </div>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isCreateElectionOpen} onOpenChange={setIsCreateElectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Eleição</DialogTitle>
            <DialogDescription>
              Criar eleição para {new Date().getFullYear()}/{new Date().getFullYear() + 1} com todos os cargos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Uma nova eleição será criada para todos os cargos: Presidente, Vice-Presidente, 1º Secretário, 2º Secretário e Tesoureiro.
            </p>
            <p className="text-sm text-muted-foreground">
              Os cargos serão votados sequencialmente, um de cada vez.
            </p>
            <Button
              className="w-full"
              onClick={handleCreateElection}
              disabled={createElectionMutation.isPending}
              data-testid="button-confirm-create-election"
            >
              {createElectionMutation.isPending ? "Criando..." : "Criar Eleição"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddCandidateOpen} onOpenChange={setIsAddCandidateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Candidato</DialogTitle>
            <DialogDescription>
              Selecione um membro cadastrado para concorrer a um cargo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="candidate-member">Membro</Label>
              <Select
                value={selectedMemberId}
                onValueChange={setSelectedMemberId}
              >
                <SelectTrigger id="candidate-member" data-testid="select-member">
                  <SelectValue placeholder="Selecione o membro" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Todos os membros já foram eleitos ou são admins
                    </div>
                  ) : (
                    availableMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.fullName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="candidate-position">Cargo</Label>
              <Select
                value={selectedPositionId}
                onValueChange={setSelectedPositionId}
              >
                <SelectTrigger id="candidate-position" data-testid="select-position">
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((position) => (
                    <SelectItem key={position.id} value={position.id.toString()}>
                      {position.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={handleAddCandidate}
              disabled={addCandidateMutation.isPending}
              data-testid="button-confirm-add-candidate"
            >
              {addCandidateMutation.isPending ? "Adicionando..." : "Adicionar Candidato"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Membro</DialogTitle>
            <DialogDescription>
              Adicione um novo membro que poderá votar nas eleições
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="member-name">Nome Completo</Label>
              <Input
                id="member-name"
                placeholder="Nome completo do membro"
                value={newMember.fullName}
                onChange={(e) =>
                  setNewMember({ ...newMember, fullName: e.target.value })
                }
                data-testid="input-member-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                type="email"
                placeholder="email@exemplo.com"
                value={newMember.email}
                onChange={(e) =>
                  setNewMember({ ...newMember, email: e.target.value })
                }
                data-testid="input-member-email"
              />
            </div>

            <Button
              onClick={handleAddMember}
              className="w-full"
              disabled={addMemberMutation.isPending}
              data-testid="button-submit-member"
            >
              {addMemberMutation.isPending ? "Cadastrando..." : "Cadastrar Membro"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isForceCloseDialogOpen} onOpenChange={setIsForceCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar Cargo Manualmente</DialogTitle>
            <DialogDescription>
              Use esta opção apenas em caso de abstenções. Explique o motivo do fechamento manual.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="force-close-reason">Motivo do Fechamento Manual</Label>
              <Input
                id="force-close-reason"
                placeholder="Ex: Membros saíram antes de votar"
                value={forceCloseReason}
                onChange={(e) => setForceCloseReason(e.target.value)}
                data-testid="input-force-close-reason"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsForceCloseDialogOpen(false);
                  setForceCloseReason("");
                  setForceClosePositionId(null);
                }}
                className="flex-1"
                data-testid="button-cancel-force-close"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleForceClosePosition}
                className="flex-1"
                disabled={!forceCloseReason.trim() || forceClosePositionMutation.isPending}
                data-testid="button-confirm-force-close"
              >
                {forceClosePositionMutation.isPending ? "Fechando..." : "Confirmar Fechamento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Results Component (hidden, used for image generation) */}
      {activeElection && results && electionPositions.every(p => p.status === "completed") && (
        <ExportResultsImage
          ref={exportImageRef}
          electionTitle={activeElection.name}
          aspectRatio={exportAspectRatio}
          winners={results.positions
            .filter(p => p.winnerId)
            .map(p => {
              const winner = p.candidates.find(c => c.isElected);
              return {
                positionId: p.positionId,
                positionName: p.positionName,
                candidateName: winner?.candidateName || '',
                photoUrl: winner?.photoUrl || '',
                voteCount: winner?.voteCount || 0,
                wonAtScrutiny: winner?.electedInScrutiny || 1,
              };
            })}
        />
      )}
    </div>
  );
}
