// src/app/state/useSites.ts

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { SiteFile } from "../../core/types/siteFile";
import { cleanFirestoreData } from "../../utils/cleanFirestoreData";

const COMPANY_ID = "securityco";

export function useSites() {
  const [sites, setSites] = useState<SiteFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const collectionRef = collection(db, "companies", COMPANY_ID, "sites");

  const loadSites = async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(collectionRef);

      const data: SiteFile[] = snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as SiteFile),
        metadata: {
          ...((docSnap.data() as SiteFile).metadata ?? {}),
          siteFileId: docSnap.id,
        },
      }));

      setSites(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sites");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  const addSite = async (siteFile: SiteFile) => {
    try {
      const siteId = siteFile.metadata.siteFileId;
      if (!siteId) throw new Error("Missing siteFileId");

      const docRef = doc(db, "companies", COMPANY_ID, "sites", siteId);

      const cleaned = cleanFirestoreData({
        ...siteFile,
        metadata: {
          ...siteFile.metadata,
          updatedAt: new Date().toISOString(),
        },
      });

      await setDoc(docRef, cleaned, { merge: true });

      const newSite: SiteFile = {
        ...siteFile,
        metadata: {
          ...siteFile.metadata,
          siteFileId: siteId,
        },
      };

      setSites((prev) => {
        const exists = prev.some((s) => s.metadata.siteFileId === siteId);
        return exists ? prev : [...prev, newSite];
      });

      return siteId;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to add site");
    }
  };

  const saveSite = async (siteFile: SiteFile) => {
    try {
      const siteId = siteFile.metadata.siteFileId;
      if (!siteId) throw new Error("Missing siteFileId");

      const docRef = doc(db, "companies", COMPANY_ID, "sites", siteId);

      const cleaned = cleanFirestoreData({
        ...siteFile,
        metadata: {
          ...siteFile.metadata,
          updatedAt: new Date().toISOString(),
        },
      });

      await setDoc(docRef, cleaned, { merge: true });

      setSites((prev) =>
        prev.map((s) => (s.metadata.siteFileId === siteId ? cleaned : s))
      );
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to save site");
    }
  };

  const updateSite = async (siteFile: SiteFile) => {
    await saveSite(siteFile);
  };

  const deleteSite = async (siteId: string) => {
    try {
      const docRef = doc(db, "companies", COMPANY_ID, "sites", siteId);
      await deleteDoc(docRef);

      setSites((prev) => prev.filter((s) => s.metadata.siteFileId !== siteId));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to delete site");
    }
  };

  const findSite = (siteId: string) => {
    return sites.find((s) => s.metadata.siteFileId === siteId);
  };

  return {
    sites,
    loading,
    error,
    reload: loadSites,
    addSite,
    saveSite,
    updateSite,
    deleteSite,
    findSite,
  };
}