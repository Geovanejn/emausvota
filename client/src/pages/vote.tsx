import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CheckCircle, LogOut, Vote } from "lucide-react";
import { useLocation } from "wouter";
import type { Election, Position, Candidate } from "@shared/schema";

export default function VotePage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [votedPositions, setVotedPositions] = useState<Set<number>>(new Set());

  const { data: activeElection, isLoading: loadingElection } = useQuery<Election | null>({
    queryKey: ["/api/elections/active"],
  });

  const { data: positions = [], isLoading: loadingPositions } = useQuery<Position[]>({
    queryKey: ["/api/positions"],
  });

  const { data: allCandidates = [] } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates/all"],
    enabled: !!activeElection,
  });

  const voteMutation = useMutation({
    mutationFn: async (data: { candidateId: number; positionId: number; electionId: number }) => {
      return await apiRequest("POST", "/api/vote", data);
    },
    onSuccess: (_, variables) => {
      setVotedPositions(prev => new Set(prev).add(variables.positionId));
      toast({
        title: "Voto registrado com sucesso!",
        description: "Seu voto foi computado com segurança",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao votar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleVote = (candidateId: number, positionId: number) => {
    if (!activeElection) return;

    if (confirm("Confirma seu voto? Esta ação não pode ser desfeita.")) {
      voteMutation.mutate({
        candidateId,
        positionId,
        electionId: activeElection.id,
      });
    }
  };

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const getCandidatesByPosition = (positionId: number) => {
    return allCandidates.filter(c => c.positionId === positionId);
  };

  const isLoading = loadingElection || loadingPositions;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!activeElection) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-2 bg-primary w-full" />
        <div className="container mx-auto px-4 py-4 sm:py-8 max-w-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold">Votação</h1>
            <Button variant="outline" onClick={handleLogout} data-testid="button-logout" className="self-end sm:self-auto">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Nenhuma eleição ativa</CardTitle>
              <CardDescription>
                Não há eleições abertas no momento. Aguarde o administrador abrir uma nova eleição.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="h-2 bg-primary w-full" />
      
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Votação</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {activeElection.name}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Escolha seu candidato para cada cargo
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout} data-testid="button-logout" className="self-end sm:self-auto">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        <div className="space-y-6 sm:space-y-8">
          {positions.map((position) => {
            const candidates = getCandidatesByPosition(position.id);
            const hasVoted = votedPositions.has(position.id);

            return (
              <Card key={position.id} className="border-border">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg sm:text-xl">{position.name}</CardTitle>
                    {hasVoted && (
                      <div className="flex items-center gap-1 sm:gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-xs sm:text-sm font-medium">Votado</span>
                      </div>
                    )}
                  </div>
                  <CardDescription className="text-sm">
                    {candidates.length} candidatos disponíveis
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  {candidates.length === 0 ? (
                    <p className="text-center py-6 text-muted-foreground text-sm">
                      Nenhum candidato registrado para este cargo
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {candidates.map((candidate) => (
                        <Card 
                          key={candidate.id} 
                          className="border-border hover-elevate transition-shadow"
                          data-testid={`card-candidate-${candidate.id}`}
                        >
                          <CardContent className="p-4">
                            <p className="font-medium mb-3">{candidate.name}</p>
                            <Button
                              className="w-full"
                              onClick={() => handleVote(candidate.id, position.id)}
                              disabled={hasVoted || voteMutation.isPending}
                              data-testid={`button-vote-${candidate.id}`}
                            >
                              {hasVoted ? (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Votado
                                </>
                              ) : (
                                <>
                                  <Vote className="w-4 h-4 mr-2" />
                                  Votar
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          <Card className="bg-muted/30 border-muted">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <div>
                  <p className="font-medium mb-1">Lembre-se</p>
                  <p className="text-sm text-muted-foreground">
                    Você pode votar uma vez por cargo. Escolha com cuidado, pois seu voto não pode ser alterado.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/results")}
              data-testid="button-view-results"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Ver Resultados
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
