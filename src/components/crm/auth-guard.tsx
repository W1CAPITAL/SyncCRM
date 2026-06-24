
"use client";

import { useState, useEffect } from "react";
import { useUser, googleProvider, useAuth } from "@/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Lock, LogIn, Loader2, AlertCircle, UserCircle, Copyright } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

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
      
      // Captura o token de acesso para permitir a escrita na planilha
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

  if (user || isGuest) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-50 p-4">
      <Card className="w-full max-w-md border-2 shadow-2xl bg-white">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg">
            <Database className="h-7 w-7" />
          </div>
          <CardTitle className="text-3xl font-black text-zinc-900 uppercase tracking-tighter">SyncCRM</CardTitle>
          <CardDescription className="text-[11px] font-bold uppercase text-zinc-400 tracking-widest">
            SaaS de Gestão Inteligente V8
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 py-4">
          {authError && (
            <Alert variant="destructive" className="border-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro de Conexão</AlertTitle>
              <AlertDescription className="text-[11px] leading-tight font-medium">
                {authError}
              </AlertDescription>
            </Alert>
          )}
          <div className="rounded-xl border-2 border-zinc-100 bg-zinc-50 p-5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 font-black text-zinc-900 mb-2 uppercase text-[10px] tracking-widest">
              <Lock className="h-4 w-4 text-zinc-900" />
              Isolamento de Dados
            </div>
            <p className="text-[12px] leading-relaxed">
              O SyncCRM utiliza o protocolo de segurança da W1 Capital para garantir que suas planilhas sejam processadas em um ambiente de silo criptografado.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button 
            className="w-full h-14 text-md font-black text-white bg-zinc-900 hover:bg-zinc-800 shadow-xl transition-all active:scale-[0.98]" 
            onClick={handleLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                AUTENTICANDO...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                CONECTAR COM GOOGLE
              </span>
            )}
          </Button>
          
          <Button 
            variant="ghost" 
            className="w-full h-10 text-[10px] font-black uppercase text-zinc-400 tracking-widest" 
            onClick={handleGuestEntry}
            disabled={isLoggingIn}
          >
            Acesso Restrito para Visitantes
          </Button>

          <div className="mt-8 flex flex-col items-center gap-2 border-t pt-8 text-center w-full">
            <div className="flex items-center gap-2 mb-1">
              <Copyright className="h-3 w-3 text-zinc-300" />
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">
                Todos os direitos Reservados
              </p>
            </div>
            <p className="text-[12px] font-black text-zinc-900 uppercase tracking-tight">
              W1 Capital
            </p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Fundador Davi Alves Figueredo
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
