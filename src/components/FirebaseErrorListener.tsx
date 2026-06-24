
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: any) => {
      // Log centralizado para depuração controlada
      console.warn('Monitoramento de Banco de Dados:', error.code || error.message);
      
      // Identificação específica de Cota Excedida (Plano Gratuito Spark atingiu limites)
      const isQuotaError = 
        error?.code === 'resource-exhausted' || 
        error?.message?.toLowerCase().includes('quota') ||
        error?.message?.toLowerCase().includes('resource-exhausted');

      // Identificação de Backoff (O Firestore está tentando se reconectar após sobrecarga)
      const isBackoffError = 
        error?.message?.toLowerCase().includes('backoff') ||
        error?.message?.toLowerCase().includes('overloading');

      if (isQuotaError) {
        toast({
          variant: 'destructive',
          title: 'LIMITE DE COTA ATINGIDO',
          description: 'O SyncCRM atingiu o limite diário de uso gratuito do Google Cloud (Firestore). O sistema voltará a operar normalmente em 24h ou ao realizar o upgrade para o plano escalável (Blaze).',
          duration: 10000,
        });
        return;
      }

      if (isBackoffError) {
        toast({
          variant: 'default',
          className: 'bg-amber-600 text-white border-none',
          title: 'ESTABILIZAÇÃO DE REDE',
          description: 'O motor de dados está recalibrando a conexão para evitar sobrecarga. Aguarde alguns instantes.',
          duration: 5000,
        });
        return;
      }

      // Erros de permissão padrão
      if (error?.code === 'permission-denied' || error?.message?.includes('permissions')) {
        toast({
          variant: 'destructive',
          title: 'ACESSO RESTRITO',
          description: 'Você não possui permissão para realizar esta operação no seu silo de dados.',
        });
        return;
      }

      // Outros erros técnicos
      toast({
        variant: 'destructive',
        title: 'ERRO TÉCNICO NO BANCO',
        description: `Ocorreu um problema de conexão: ${error.message || 'Erro desconhecido'}`,
      });
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => errorEmitter.off('permission-error', handlePermissionError);
  }, [toast]);

  return null;
}
