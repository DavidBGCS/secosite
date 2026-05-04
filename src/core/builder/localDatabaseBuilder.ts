// src/core/builder/localDatabaseBuilder.ts

import type { LocalDatabase } from "../types/localDatabase";
import type { SiteFile } from "../types/siteFile";

function makeId(prefix = "id"): string {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createLocalDatabase(): LocalDatabase {
  const now = new Date().toISOString();

  return {
    metadata: {
      databaseId: makeId("db"),
      schemaVersion: "1.0",
      createdAt: now,
      updatedAt: now,
    },

    settings: {
      autoCompressPhotos: true,
      maxPhotosPerVisit: 5,
      maxPhotoLongestEdgePx: 1600,
    },

    sites: [],
    importExportHistory: [],
  };
}

export function addSite(database: LocalDatabase, siteFile: SiteFile) {
  database.sites.push(siteFile);
  database.metadata.updatedAt = new Date().toISOString();
}

export function removeSite(database: LocalDatabase, siteFileId: string) {
  database.sites = database.sites.filter(
    (s) => s.metadata.siteFileId !== siteFileId
  );

  database.metadata.updatedAt = new Date().toISOString();
}

export function findSite(database: LocalDatabase, siteFileId: string) {
  return database.sites.find((s) => s.metadata.siteFileId === siteFileId);
}