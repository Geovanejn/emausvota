import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireMember?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  requireMember = false 
}: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, isMember, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    setIsAuthorized(false);
    
    if (isLoading) return;

    if (!isAuthenticated) {
      setLocation("/");
      return;
    }

    if (requireAdmin && !isAdmin) {
      setLocation("/vote");
      return;
    }

    if (requireMember && !isMember && !isAdmin) {
      setLocation("/");
      return;
    }

    setIsAuthorized(true);
  }, [isAuthenticated, isAdmin, isMember, requireAdmin, requireMember, setLocation, isLoading]);

  if (isLoading || !isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return <>{children}</>;
}
