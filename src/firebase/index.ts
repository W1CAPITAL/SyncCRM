
/**
 * ARQUIVO DE COMPATIBILIDADE - MODO INDEPENDENTE V12
 * Este arquivo foi mantido para evitar erros de importação, mas agora retorna cascas vazias.
 * O SyncCRM não depende mais do Firebase Firestore, Auth ou Storage.
 */

export function initializeFirebase() {
  return { app: {}, auth: {}, firestore: {} };
}

export const useUser = () => ({ user: { displayName: "Analista Sênior" }, loading: false });
export const useAuth = () => ({});
export const useFirestore = () => ({});
export const useCollection = (query: any) => ({ data: [], loading: false, error: null });
export const useDoc = (ref: any) => ({ data: null, loading: false, error: null });

export const googleProvider = {
  setCustomParameters: () => {},
  addScope: () => {}
};
