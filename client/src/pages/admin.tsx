import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Users 
} from "lucide-react";
import { useLocation } from "wouter";
import type { Election, Position, CandidateWithDetails } from "@shared/schema";

export default function AdminPage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [isCreateElectionOpen, setIsCreateElectionOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedElectionPosition, setSelectedElectionPosition] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [newMember, setNewMember] = useState({
    fullName: "",
    email: "",
  });

  const { data: activeElection, isLoading: loadingElection } = useQuery<Election | null>({
    queryKey: ["/api/elections/active"],
  });

  const { data: positions = [], isLoading: loadingPositions } = useQuery<Position[]>({
    queryKey: ["/api/positions"],
  });

  const { data: candidates = [], isLoading: loadingCandidates } = useQuery<CandidateWithDetails[]>({
    queryKey: ["/api/candidates"],
    enabled: !!activeElection,
  });

  const { data: members = [] } = useQuery<Array<{ id: number; fullName: string; email: string }>>({
    queryKey: ["/api/members"],
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
      setSelectedElectionPosition("");
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

  const addCandidateMutation = useMutation({
    mutationFn: async (candidate: { name: string; positionId: number; electionId: number }) => {
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

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const handleCreateElection = () => {
    if (!selectedElectionPosition) {
      toast({
        title: "Cargo obrigatório",
        description: "Selecione o cargo da eleição",
        variant: "destructive",
      });
      return;
    }
    const selectedPosition = positions.find(p => p.id === parseInt(selectedElectionPosition));
    if (!selectedPosition) return;
    
    createElectionMutation.mutate(`Eleição ${selectedPosition.name} ${new Date().getFullYear()}`);
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

    const selectedMember = members.find(m => m.id === parseInt(selectedMemberId));
    if (!selectedMember) return;

    addCandidateMutation.mutate({
      name: selectedMember.fullName,
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
    <div className="min-h-screen bg-background">
      <div className="h-2 bg-primary w-full" />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Administração</h1>
            <p className="text-muted-foreground mt-1">
              Bem-vindo, {user?.fullName}
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

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
                    <div className="overflow-x-auto">
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
                  <div className="overflow-x-auto">
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
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={isCreateElectionOpen} onOpenChange={setIsCreateElectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Eleição</DialogTitle>
            <DialogDescription>
              Selecione o cargo para a nova eleição
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="election-position">Cargo da Eleição</Label>
              <Select
                value={selectedElectionPosition}
                onValueChange={setSelectedElectionPosition}
              >
                <SelectTrigger id="election-position" data-testid="select-election-position">
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
              onClick={handleCreateElection}
              disabled={createElectionMutation.isPending || loadingPositions}
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
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.fullName}
                    </SelectItem>
                  ))}
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
    </div>
  );
}
