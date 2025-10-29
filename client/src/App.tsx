import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import LoginPage from "@/pages/login";
import AdminPage from "@/pages/admin";
import VotePage from "@/pages/vote";
import ResultsPage from "@/pages/results";

function Router() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/results" component={ResultsPage} />
        <Route path="/" component={LoginPage} />
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    );
  }

  if (isAdmin) {
    return (
      <Switch>
        <Route path="/admin" component={AdminPage} />
        <Route path="/vote" component={VotePage} />
        <Route path="/results" component={ResultsPage} />
        <Route>
          <Redirect to="/admin" />
        </Route>
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/vote" component={VotePage} />
      <Route path="/results" component={ResultsPage} />
      <Route>
        <Redirect to="/vote" />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
