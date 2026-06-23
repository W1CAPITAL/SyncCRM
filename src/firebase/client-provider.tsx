
'use client';

import React, { useEffect, useState } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';

export const FirebaseClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [services, setServices] = useState<{
    app: FirebaseApp;
    firestore: Firestore;
    auth: Auth;
  } | null>(null);

  useEffect(() => {
    const { app, firestore, auth } = initializeFirebase();
    setServices({ app, firestore, auth });
  }, []);

  if (!services) return null;

  return (
    <FirebaseProvider
      firebaseApp={services.app}
      firestore={services.firestore}
      auth={services.auth}
    >
      {children}
    </FirebaseProvider>
  );
};
