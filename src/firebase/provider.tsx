
'use client';

import React, { createContext, useContext } from 'react';

const FirebaseContext = createContext<any>(undefined);

export const FirebaseProvider: React.FC<{
  firebaseApp: any;
  firestore: any;
  auth: any;
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <FirebaseContext.Provider value={{}}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => ({});
export const useFirebaseApp = () => ({});
export const useFirestore = () => ({});
export const useAuth = () => ({});
