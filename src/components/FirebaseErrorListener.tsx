
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: any) => {
      console.error('Firestore Permission Error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro de Permissão',
        description: `Você não tem permissão para realizar esta operação em: ${error.context?.path || 'caminho desconhecido'}`,
      });
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => errorEmitter.off('permission-error', handlePermissionError);
  }, [toast]);

  return null;
}
