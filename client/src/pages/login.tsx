import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { requestCodeSchema, verifyCodeSchema, type RequestCodeData, type VerifyCodeData, type AuthResponse } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { UserCircle, Mail, KeyRound } from "lucide-react";

export default function LoginPage() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const emailForm = useForm<RequestCodeData>({
    resolver: zodResolver(requestCodeSchema),
    defaultValues: {
      email: "",
    },
  });

  const codeForm = useForm<VerifyCodeData>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: {
      email: "",
      code: "",
    },
  });

  const onRequestCode = async (data: RequestCodeData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao solicitar código");
      }

      setEmail(data.email);
      setStep("code");
      codeForm.setValue("email", data.email);

      toast({
        title: "Código enviado!",
        description: "Verifique seu email e digite o código de 6 dígitos",
      });
    } catch (error) {
      toast({
        title: "Erro ao solicitar código",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifyCode = async (data: VerifyCodeData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao verificar código");
      }

      const result: AuthResponse = await response.json();
      login(result.user, result.token);

      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo, ${result.user.fullName}`,
      });

      if (result.user.isAdmin) {
        setLocation("/admin");
      } else {
        setLocation("/vote");
      }
    } catch (error) {
      toast({
        title: "Erro ao verificar código",
        description: error instanceof Error ? error.message : "Código inválido ou expirado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    codeForm.reset();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="h-2 bg-primary w-full" />
      
      <div className="container mx-auto px-4 py-4 sm:py-0">
        <div className="max-w-md mx-auto mt-8 sm:mt-16">
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-3 sm:mb-4">
              <img 
                src="/logo.png" 
                alt="Emaús Vota Logo" 
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Emaús Vota</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Sistema de votação da UMP Emaús</p>
          </div>

          <Card className="border-border shadow-md">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                {step === "email" ? (
                  <>
                    <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
                    Entrar
                  </>
                ) : (
                  <>
                    <KeyRound className="w-5 h-5 sm:w-6 sm:h-6" />
                    Verificar Código
                  </>
                )}
              </CardTitle>
              <CardDescription className="text-sm">
                {step === "email" 
                  ? "Digite seu email para receber o código de verificação" 
                  : `Código enviado para ${email}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {step === "email" ? (
                <form onSubmit={emailForm.handleSubmit(onRequestCode)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      data-testid="input-email"
                      {...emailForm.register("email")}
                    />
                    {emailForm.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {emailForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                    data-testid="button-request-code"
                  >
                    {isLoading ? "Enviando..." : "Enviar Código"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={codeForm.handleSubmit(onVerifyCode)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Código de Verificação</Label>
                    <Input
                      id="code"
                      type="text"
                      placeholder="000000"
                      maxLength={6}
                      className="text-center text-xl sm:text-2xl tracking-widest"
                      data-testid="input-code"
                      {...codeForm.register("code")}
                    />
                    {codeForm.formState.errors.code && (
                      <p className="text-sm text-destructive">
                        {codeForm.formState.errors.code.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground text-center">
                      Digite o código de 6 dígitos enviado para seu email
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                      data-testid="button-verify-code"
                    >
                      {isLoading ? "Verificando..." : "Verificar e Entrar"}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleBackToEmail}
                      disabled={isLoading}
                      data-testid="button-back"
                    >
                      Voltar
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Código válido por 15 minutos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
