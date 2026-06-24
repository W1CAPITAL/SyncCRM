/**
 * @fileOverview PURGAÇÃO COMPLETA - Provider Inerte.
 */
import React from 'react';
export const FirebaseProvider: React.FC<{children: React.ReactNode}> = ({ children }) => <>{children}</>;
export const useAuth = () => ({});
export const useFirestore = () => ({});
