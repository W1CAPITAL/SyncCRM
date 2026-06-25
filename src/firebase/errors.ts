
'use client';

/**
 * @fileOverview Erros de Permissão - Refatorado para funções de fábrica.
 * Isso elimina definitivamente o erro de 'super' keyword inesperado em ambientes Next.js/Turbopack.
 */

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

/**
 * Cria um erro de permissão do Firestore sem utilizar a palavra-chave 'class' ou 'super'.
 */
export function createFirestorePermissionError(context: SecurityRuleContext) {
  const error = new Error(`Permission denied: ${context.operation} at ${context.path}`);
  
  // Adiciona propriedades customizadas manualmente
  Object.defineProperty(error, 'name', { value: 'FirestorePermissionError' });
  (error as any).context = context;
  (error as any).isFirestoreError = true;

  return error;
}
