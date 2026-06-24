
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Lock, LogIn, Loader2, Copyright } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const authStatus = sessionStorage.getItem('is_authenticated') === 'true';
    if (authStatus) setIsAuthenticated(true);
  }, []);

  const handleLoginSimulation = async () => {
    setIsLoggingIn(true);
    // Simulação de autenticação rápida para modo independente
    setTimeout(() => {
      setIsAuthenticated(true);
      sessionStorage.setItem('is_authenticated', 'true');
      setIsLoggingIn(false);
      toast({
        title: "Acesso Autorizado",
        description: "Bem-vindo ao SyncCRM V12 Independente!",
      });
    }, 800);
  };

  if (isAuthenticated) {
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
            SaaS de Gestão Inteligente Independente
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 py-4">
          <div className="rounded-xl border-2 border-zinc-100 bg-zinc-50 p-5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 font-black text-zinc-900 mb-2 uppercase text-[10px] tracking-widest">
              <Lock className="h-4 w-4 text-zinc-900" />
              Silo de Dados Privado
            </div>
            <p className="text-[12px] leading-relaxed">
              O SyncCRM opera agora em modo independente. Seus dados são processados localmente e sincronizados diretamente com seu backend proprietário.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button 
            className="w-full h-14 text-md font-black text-white bg-zinc-900 hover:bg-zinc-800 shadow-xl transition-all active:scale-[0.98]" 
            onClick={handleLoginSimulation}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                CONECTANDO...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                ENTRAR NO SISTEMA
              </span>
            )}
          </Button>
          
          <div className="mt-8 flex flex-col items-center gap-2 border-t pt-8 text-center w-full">
            <div className="flex items-center gap-2 mb-1">
              <Copyright className="h-3 w-3 text-zinc-300" />
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">
                Todos os direitos Reservados | W1 Capital
              </p>
            </div>
            <p className="text-[12px] font-black text-zinc-900 uppercase tracking-tight">
              Davi Alves Figueredo
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
