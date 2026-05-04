// src/core/types/segpack.ts

import type { SegpackManifest } from "./manifest";
import type { Site } from "./site";
import type { InstalledSystem } from "./system";
import type { FaultRecord } from "./fault";
import type { PartRecord } from "./part";
import type { ReplacementRecord } from "./replacement";
import type { ComplianceRecord } from "./compliance";
import type { PhotoRecord } from "./photo";
import type { MarkupRecord } from "./markup";

export type SegpackSectionName =
  | "manifest"
  | "site"
  | "systems"
  | "faults"
  | "parts"
  | "replacements"
  | "compliance"
  | "photos"
  | "markups";

export type SegpackCounts = {
  systems: number;
  faults: number;
  parts: number;
  replacements: number;
  compliance: number;
  photos: number;
  markups: number;
};

export type SegpackLinks = {
  parentPackageId?: string;
  derivedFromPackageId?: string;
  previousPackageId?: string;
  relatedPackageIds?: string[];
};

export type SegpackMeta = {
  exportProfile?: string;
  localOnly?: boolean;
  compressed?: boolean;
  encrypted?: boolean;
  checksum?: string;
  notes?: string;
};

export type Segpack = {
  manifest: SegpackManifest;
  site: Site;
  systems: InstalledSystem[];
  faults: FaultRecord[];
  parts?: PartRecord[];
  replacements?: ReplacementRecord[];
  compliance?: ComplianceRecord[];
  photos?: PhotoRecord[];
  markups?: MarkupRecord[];
  links?: SegpackLinks;
  meta?: SegpackMeta;
};

export type SegpackSummary = {
  packageId: string;
  title?: string;
  siteId?: string;
  siteName?: string;
  schemaVersion?: string;
  createdAt?: string;
  updatedAt?: string;
  counts: SegpackCounts;
};

export type SegpackPartial = Partial<Segpack> &
  Pick<Segpack, "manifest" | "site"> & {
    systems?: InstalledSystem[];
    faults?: FaultRecord[];
  };

export type SegpackSectionMap = {
  manifest: SegpackManifest;
  site: Site;
  systems: InstalledSystem[];
  faults: FaultRecord[];
  parts: PartRecord[];
  replacements: ReplacementRecord[];
  compliance: ComplianceRecord[];
  photos: PhotoRecord[];
  markups: MarkupRecord[];
};

export function createEmptySegpackCounts(): SegpackCounts {
  return {
    systems: 0,
    faults: 0,
    parts: 0,
    replacements: 0,
    compliance: 0,
    photos: 0,
    markups: 0,
  };
}

export function getSegpackCounts(pack: Partial<Segpack> | null | undefined): SegpackCounts {
  return {
    systems: Array.isArray(pack?.systems) ? pack!.systems.length : 0,
    faults: Array.isArray(pack?.faults) ? pack!.faults.length : 0,
    parts: Array.isArray(pack?.parts) ? pack!.parts.length : 0,
    replacements: Array.isArray(pack?.replacements) ? pack!.replacements.length : 0,
    compliance: Array.isArray(pack?.compliance) ? pack!.compliance.length : 0,
    photos: Array.isArray(pack?.photos) ? pack!.photos.length : 0,
    markups: Array.isArray(pack?.markups) ? pack!.markups.length : 0,
  };
}

export function getSegpackSummary(pack: Segpack): SegpackSummary {
  return {
    packageId: pack.manifest.packageId,
    title: pack.manifest.title,
    siteId: pack.site.id,
    siteName: pack.site.name,
    schemaVersion: pack.manifest.schemaVersion,
    createdAt: pack.manifest.createdAt,
    updatedAt: pack.manifest.updatedAt,
    counts: getSegpackCounts(pack),
  };
}