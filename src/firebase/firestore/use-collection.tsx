
'use client';

import { useEffect, useState } from 'react';
import {
  Query,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';

export function useCollection<T = DocumentData>(query: Query<T> | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Se não houver query (ex: por erro de cota), para o listener
    if (!query) {
      setLoading(false);
      return;
    }

    let unsubscribe: () => void = () => {};

    try {
      unsubscribe = onSnapshot(
        query,
        (snapshot: QuerySnapshot<T>) => {
          const items = snapshot.docs.map((doc) => ({
            ...(doc.data() as any),
            id: doc.id,
          }));
          setData(items);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Firestore useCollection Error:', err);
          setError(err);
          setLoading(false);
          
          // Emite o erro para o listener global (FirebaseErrorListener)
          errorEmitter.emit('permission-error', err);
        }
      );
    } catch (e: any) {
      setLoading(false);
      setError(e);
      errorEmitter.emit('permission-error', e);
    }

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}
