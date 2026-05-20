// src/app/hooks/useStockItems.ts

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";

import { db } from "../../firebase";

export type StockItem = {
  id: string;
  name: string;
  code?: string;
  manufacturer?: string;
  category?: string;
  subcategory?: string;
};

export function useStockItems() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const q = query(
          collection(db, "items"),
          orderBy("name")
        );

        const snap = await getDocs(q);

        const loaded: StockItem[] = snap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<StockItem, "id">),
        }));

        setItems(loaded);
      } catch (err) {
        console.error("Failed loading stock items", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return {
    items,
    loading,
  };
}