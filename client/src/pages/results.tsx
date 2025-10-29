import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChartBar, LogOut, Trophy, ArrowLeft, Share2 } from "lucide-react";
import { useLocation } from "wouter";
import { useRef, useState } from "react";
import type { ElectionResults } from "@shared/schema";
import ExportResultsImage, { type ExportResultsImageHandle, type AspectRatio } from "@/components/ExportResultsImage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Winner {
  positionId: number;
  positionName: string;
  candidateName: string;
  photoUrl?: string;
  voteCount: number;
  wonAtScrutiny: number;
}

export default function ResultsPage() {
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const exportRef = useRef<ExportResultsImageHandle>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  
  // Get electionId from query string
  const searchParams = new URLSearchParams(window.location.search);
  const electionId = searchParams.get('electionId');

  const { data: results, isLoading } = useQuery<ElectionResults | null>({
    queryKey: electionId ? ["/api/results", electionId] : ["/api/results/latest"],
    queryFn: electionId 
      ? async () => {
          const response = await fetch(`/api/results/${electionId}`);
          if (!response.ok) throw new Error('Failed to fetch results');
          return response.json();
        }
      : undefined,
  });

  const { data: winners } = useQuery<Winner[]>({
    queryKey: results?.electionId ? ["/api/elections", results.electionId, "winners"] : [],
    queryFn: async () => {
      if (!results?.electionId) return [];
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(`/api/elections/${results.electionId}/winners`, {
        headers,
        credentials: "include",
      });
      if (!response.ok) throw new Error('Failed to fetch winners');
      return response.json();
    },
    enabled: !!results?.electionId && !results?.isActive,
  });

  const handleExportImage = async () => {
    if (exportRef.current) {
      await exportRef.current.exportImage();
    }
  };

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const handleBack = () => {
    if (user?.isAdmin) {
      setLocation("/admin");
    } else {
      setLocation("/vote");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando resultados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="h-2 bg-primary w-full" />
      
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-4xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
              <ChartBar className="w-6 h-6 sm:w-8 sm:h-8" />
              Resultados
            </h1>
            {results && (
              <>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">{results.electionName}</p>
                {results.isActive && (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {results.currentScrutiny}º Escrutínio • Eleição em andamento
                  </p>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2 self-end sm:self-auto">
            {!results?.isActive && winners && winners.length > 0 && user?.isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="default" 
                    data-testid="button-export-results" 
                    size="sm" 
                    className="sm:h-9"
                    aria-label="Compartilhar Resultados"
                  >
                    <Share2 className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Compartilhar</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Escolha o formato</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => {
                      setAspectRatio("9:16");
                      setTimeout(() => handleExportImage(), 100);
                    }}
                    data-testid="menu-export-9-16"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">9:16 (Stories)</span>
                      <span className="text-xs text-muted-foreground">Instagram/Facebook Stories</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      setAspectRatio("5:4");
                      setTimeout(() => handleExportImage(), 100);
                    }}
                    data-testid="menu-export-5-4"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">5:4 (Feed)</span>
                      <span className="text-xs text-muted-foreground">Instagram/Facebook Feed</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {isAuthenticated && (
              <Button 
                variant="outline" 
                onClick={handleBack} 
                data-testid="button-back" 
                size="sm" 
                className="sm:h-9"
                aria-label="Voltar"
              >
                <ArrowLeft className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
            )}
            {isAuthenticated && (
              <Button 
                variant="outline" 
                onClick={handleLogout} 
                data-testid="button-logout" 
                size="sm" 
                className="sm:h-9"
                aria-label="Sair"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            )}
          </div>
        </div>

        {!results ? (
          <Card>
            <CardHeader>
              <CardTitle>Nenhum resultado disponível</CardTitle>
              <CardDescription>
                Não há eleições finalizadas para exibir resultados
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-8 sm:space-y-12">
            {results.positions.map((position) => {
              const sortedCandidates = [...position.candidates].sort(
                (a, b) => b.voteCount - a.voteCount
              );
              const winner = sortedCandidates[0];
              const totalVotes = sortedCandidates.reduce((sum, c) => sum + c.voteCount, 0);

              return (
                <div key={position.positionId} data-testid={`position-${position.positionId}`}>
                  <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span>{position.positionName}</span>
                    <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                      ({totalVotes} votos)
                    </span>
                  </h2>

                  <div className="space-y-3">
                    {sortedCandidates.map((candidate, index) => {
                      const isWinner = index === 0 && candidate.voteCount > 0;
                      const percentage = totalVotes > 0 
                        ? ((candidate.voteCount / totalVotes) * 100).toFixed(1) 
                        : "0.0";

                      // Helper function to get scrutiny label
                      const getScrutinyLabel = (scrutiny?: number) => {
                        if (!scrutiny) return null;
                        const ordinals = ["1º", "2º", "3º"];
                        return `Eleito no ${ordinals[scrutiny - 1]} Escrutínio`;
                      };

                      return (
                        <Card
                          key={candidate.candidateId}
                          className={
                            isWinner
                              ? "bg-amber-50 dark:bg-amber-950/30 border-l-4 border-l-primary shadow-md"
                              : "border-border"
                          }
                          data-testid={`candidate-result-${candidate.candidateId}`}
                        >
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                {isWinner && (
                                  <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
                                )}
                                <Avatar className="w-10 h-10 sm:w-12 sm:h-12 shrink-0">
                                  <AvatarImage 
                                    src={candidate.photoUrl} 
                                    alt={candidate.candidateName}
                                  />
                                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                    {candidate.candidateName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-medium text-base sm:text-lg truncate">
                                    {candidate.candidateName}
                                  </p>
                                  {isWinner && candidate.wonAtScrutiny && (
                                    <p className="text-xs sm:text-sm text-primary font-medium">
                                      {getScrutinyLabel(candidate.wonAtScrutiny)}
                                    </p>
                                  )}
                                  {isWinner && !candidate.wonAtScrutiny && (
                                    <p className="text-xs sm:text-sm text-primary font-medium">
                                      Vencedor
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xl sm:text-2xl font-bold" data-testid={`vote-count-${candidate.candidateId}`}>
                                  {candidate.voteCount}
                                </p>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                  {percentage}%
                                </p>
                              </div>
                            </div>
                            
                            <div className="mt-3 sm:mt-4 bg-muted/30 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-primary h-full transition-all duration-500 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <Card className="bg-muted/30 border-muted">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <ChartBar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium mb-1 text-sm sm:text-base">Resultados finais</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Estes são os resultados oficiais da eleição. Todos os votos foram contabilizados de forma segura e transparente.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Hidden export component */}
      {!results?.isActive && winners && winners.length > 0 && (
        <ExportResultsImage
          ref={exportRef}
          electionTitle={results?.electionName || ''}
          winners={winners}
          aspectRatio={aspectRatio}
        />
      )}
    </div>
  );
}
