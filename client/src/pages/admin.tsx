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
  const [newElectionName, setNewElectionName] = useState("");
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    positionId: "",
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
      setNewElectionName("");
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
      setNewCandidate({ name: "", positionId: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar candidato",
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
    if (!newElectionName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome da eleição",
        variant: "destructive",
      });
      return;
    }
    createElectionMutation.mutate(newElectionName);
  };

  const handleCloseElection = () => {
    if (!activeElection) return;
    if (confirm("Tem certeza que deseja encerrar a eleição atual?")) {
      closeElectionMutation.mutate(activeElection.id);
    }
  };

  const handleAddCandidate = () => {
    if (!newCandidate.name || !newCandidate.positionId || !activeElection) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    addCandidateMutation.mutate({
      name: newCandidate.name,
      positionId: parseInt(newCandidate.positionId),
      electionId: activeElection.id,
    });
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
                    <Users className="w-4 h-4 mr-2" />
                    Adicionar Candidato
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
          </div>
        )}
      </div>

      <Dialog open={isCreateElectionOpen} onOpenChange={setIsCreateElectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Eleição</DialogTitle>
            <DialogDescription>
              Inicie uma nova eleição para a UMP Emaús
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="election-name">Nome da Eleição</Label>
              <Input
                id="election-name"
                placeholder="Ex: Eleição 2025"
                value={newElectionName}
                onChange={(e) => setNewElectionName(e.target.value)}
                data-testid="input-election-name"
              />
            </div>
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
              Registre um novo candidato na eleição atual
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="candidate-name">Nome do Candidato</Label>
              <Input
                id="candidate-name"
                placeholder="Nome completo"
                value={newCandidate.name}
                onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                data-testid="input-candidate-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="candidate-position">Cargo</Label>
              <Select
                value={newCandidate.positionId}
                onValueChange={(value) => setNewCandidate({ ...newCandidate, positionId: value })}
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
    </div>
  );
}
