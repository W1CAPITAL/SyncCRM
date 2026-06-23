
"use client";

import { useState, useEffect } from "react";
import { useUser, googleProvider, useAuth } from "@/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Lock, LogIn, Loader2, AlertCircle, UserCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  // Verifica se o usuário já escolheu ser visitante nesta sessão
  useEffect(() => {
    const guestStatus = sessionStorage.getItem('is_guest_mode') === 'true';
    if (guestStatus) setIsGuest(true);
  }, []);

  const handleLogin = async () => {
    if (isLoggingIn) return;

    setIsLoggingIn(true);
    setAuthError(null);
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        sessionStorage.setItem('google_access_token', credential.accessToken);
        sessionStorage.removeItem('is_guest_mode');
      }

      toast({
        title: "Login realizado",
        description: "Bem-vindo ao SyncCRM!",
      });
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        setAuthError("O login foi cancelado porque a janela foi fechada. Tente novamente clicando no botão abaixo.");
        return;
      }
      setAuthError(error.message || "Não foi possível conectar com o Google.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGuestEntry = () => {
    setIsGuest(true);
    sessionStorage.setItem('is_guest_mode', 'true');
    toast({
      title: "Modo Público",
      description: "Você entrou sem login. Algumas funções de sincronização podem estar limitadas.",
    });
  };

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Permitir acesso se estiver logado OU se estiver em modo visitante
  if (user || isGuest) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-2 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold font-headline">SyncCRM</CardTitle>
          <CardDescription>
            Gerenciamento inteligente de processos via Google Sheets.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 py-4">
          {authError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro de Conexão</AlertTitle>
              <AlertDescription className="text-[11px] leading-tight">
                {authError}
              </AlertDescription>
            </Alert>
          )}
          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground mb-1">
              <Lock className="h-4 w-4" />
              Proteção via Google Identity
            </div>
            O SyncCRM acessa com segurança as planilhas vinculadas.
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button 
            className="w-full h-12 text-md font-semibold text-white bg-zinc-900 hover:bg-zinc-800" 
            onClick={handleLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Conectando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                {user ? "Renovar Acesso ao Google" : "Entrar com Google"}
              </span>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-12 text-md" 
            onClick={handleGuestEntry}
            disabled={isLoggingIn}
          >
            <UserCircle className="h-5 w-5 mr-2" />
            Continuar em Modo Público
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
