// src/core/builder/siteFileBuilder.ts

import type { SiteFile } from "../types/siteFile";
import type { Site } from "../types/site";
import type { AssetRecord } from "../types/asset";
import type { VisitRecord } from "../types/visit";
import type { DisciplineProfile } from "../types/disciplineProfile";

function makeId(prefix = "id"): string {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createSiteFile(site: Site): SiteFile {
  const now = new Date().toISOString();

  return {
    metadata: {
      siteFileId: makeId("sitefile"),
      schemaVersion: "1.0",
      createdAt: now,
      updatedAt: now,
    },

    site,

    systems: [],
    disciplineProfiles: [],

    assets: [],

    serviceLayout: {
      cycleType: "quarterly",
      columns: [
        { key: "q1", label: "Q1" },
        { key: "q2", label: "Q2" },
        { key: "q3", label: "Q3" },
        { key: "q4", label: "Q4" },
      ],
    },

    visits: [],

    openFaults: [],
    closedFaults: [],

    compliance: [],
    replacementHistory: [],

    photos: [],
    markups: [],

    exportedReports: [],
  };
}

export function addAsset(siteFile: SiteFile, asset: AssetRecord) {
  siteFile.assets.push(asset);
}

export function addVisit(siteFile: SiteFile, visit: VisitRecord) {
  siteFile.visits.push(visit);
}

export function addDisciplineProfile(
  siteFile: SiteFile,
  profile: DisciplineProfile
) {
  siteFile.disciplineProfiles.push(profile);
}

export function updateSiteTimestamp(siteFile: SiteFile) {
  siteFile.metadata.updatedAt = new Date().toISOString();
}