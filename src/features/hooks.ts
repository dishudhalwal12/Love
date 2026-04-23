import { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─────────────────────────────────────────────────────────
// useFirestore — realtime collection hook
// ─────────────────────────────────────────────────────────

export function useFirestore<T>(
  collectionName: string,
  queryConstraints: QueryConstraint[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;

    const q = query(collection(db, collectionName), ...queryConstraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results: T[] = [];
        snapshot.forEach((d) => {
          results.push({ id: d.id, ...d.data() } as T);
        });
        setData(results);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`Error fetching ${collectionName}:`, err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, JSON.stringify(queryConstraints)]);

  const add = useCallback(
    async (item: Omit<T, "id">) => {
      try {
        const docRef = await addDoc(collection(db, collectionName), item);
        return docRef.id;
      } catch (e) {
        console.error("Error adding document: ", e);
        throw e;
      }
    },
    [collectionName]
  );

  const update = useCallback(
    async (id: string, item: Partial<T>) => {
      try {
        const docRef = doc(db, collectionName, id);
        await updateDoc(docRef, { ...(item as any), updatedAt: Date.now() });
      } catch (e) {
        console.error("Error updating document: ", e);
        throw e;
      }
    },
    [collectionName]
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await deleteDoc(doc(db, collectionName, id));
      } catch (e) {
        console.error("Error deleting document: ", e);
        throw e;
      }
    },
    [collectionName]
  );

  return { data, loading, error, add, update, remove };
}

// ─────────────────────────────────────────────────────────
// useSmartSearch — fast fuzzy search over multiple fields
// ─────────────────────────────────────────────────────────

/**
 * Fuzzy multi-field search with priority scoring.
 * Fields listed first score higher on exact match.
 */
export function useSmartSearch<T extends Record<string, any>>(
  items: T[],
  fields: (keyof T)[],
  query: string
): T[] {
  return useMemo(() => {
    if (!query.trim()) return items;

    const q = query.toLowerCase().trim();

    const scored = items
      .map((item) => {
        let score = 0;
        for (let i = 0; i < fields.length; i++) {
          const fieldWeight = fields.length - i; // higher weight for earlier fields
          const value = String(item[fields[i]] ?? "").toLowerCase();
          if (value === q) score += fieldWeight * 10; // exact match
          else if (value.startsWith(q)) score += fieldWeight * 5; // prefix match
          else if (value.includes(q)) score += fieldWeight * 2; // substring match
        }
        return { item, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.item);

    return scored;
  }, [items, fields, query]);
}
