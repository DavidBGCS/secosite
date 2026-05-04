// src/core/reports/segpackSummary.ts

import type { Segpack } from "../types/segpack";
import type { FaultStatus } from "../types/fault";
import type { SystemDiscipline } from "../types/system";
import { getSegpackCounts } from "../types/segpack";
import {
  getComplianceRecords,
  getFaults,
  getOpenFaults,
  getPhotos,
  getResolvedFaults,
  getSystems,
  getAllDevices,
  getMarkups,
  getParts,
  getReplacements,
} from "../builder/segpackQueries";

export type SegpackFaultBreakdown = {
  total: number;
  open: number;
  resolved: number;
  byStatus: Partial<Record<FaultStatus, number>>;
  bySeverity: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
};

export type SegpackSystemBreakdown = {
  total: number;
  devices: number;
  byDiscipline: Partial<Record<SystemDiscipline, number>>;
  byStatus: Record<string, number>;
};

export type SegpackComplianceBreakdown = {
  total: number;
  byStatus: Record<string, number>;
  byResult: Record<string, number>;
  byCategory: Record<string, number>;
};

export type SegpackMediaBreakdown = {
  photos: number;
  markups: number;
  photosByCategory: Record<string, number>;
  markupsByShape: Record<string, number>;
};

export type SegpackInventoryBreakdown = {
  parts: number;
  replacements: number;
  partsByCategory: Record<string, number>;
  replacementsByStatus: Record<string, number>;
};

export type SegpackSummaryReport = {
  packageId: string;
  title?: string;
  description?: string;
  schemaVersion: string;
  createdAt: string;
  updatedAt?: string;

  site: {
    id: string;
    name: string;
    clientName?: string;
    siteType?: string;
    status?: string;
    buildingName?: string;
  };

  counts: ReturnType<typeof getSegpackCounts>;
  systems: SegpackSystemBreakdown;
  faults: SegpackFaultBreakdown;
  compliance: SegpackComplianceBreakdown;
  media: SegpackMediaBreakdown;
  inventory: SegpackInventoryBreakdown;

  tags: string[];
  sourceApp?: string;
  sourceAppVersion?: string;
};

function countBy<T>(
  items: T[],
  getKey: (item: T) => string | undefined | null
): Record<string, number> {
  const out: Record<string, number> = {};

  for (const item of items) {
    const raw = getKey(item);
    const key = typeof raw === "string" && raw.trim() ? raw.trim() : "unknown";
    out[key] = (out[key] ?? 0) + 1;
  }

  return out;
}

function sortRecordDesc(record: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(record).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  );
}

export function getFaultBreakdown(pack: Segpack): SegpackFaultBreakdown {
  const faults = getFaults(pack);

  return {
    total: faults.length,
    open: getOpenFaults(pack).length,
    resolved: getResolvedFaults(pack).length,
    byStatus: sortRecordDesc(countBy(faults, (item) => item.status)) as Partial<
      Record<FaultStatus, number>
    >,
    bySeverity: sortRecordDesc(countBy(faults, (item) => item.severity)),
    byPriority: sortRecordDesc(countBy(faults, (item) => item.priority)),
    byCategory: sortRecordDesc(countBy(faults, (item) => item.category)),
  };
}

export function getSystemBreakdown(pack: Segpack): SegpackSystemBreakdown {
  const systems = getSystems(pack);
  const devices = getAllDevices(pack);

  return {
    total: systems.length,
    devices: devices.length,
    byDiscipline: sortRecordDesc(
      countBy(systems, (item) => item.discipline)
    ) as Partial<Record<SystemDiscipline, number>>,
    byStatus: sortRecordDesc(countBy(systems, (item) => item.status)),
  };
}

export function getComplianceBreakdown(pack: Segpack): SegpackComplianceBreakdown {
  const records = getComplianceRecords(pack);

  return {
    total: records.length,
    byStatus: sortRecordDesc(countBy(records, (item) => item.status)),
    byResult: sortRecordDesc(countBy(records, (item) => item.result)),
    byCategory: sortRecordDesc(countBy(records, (item) => item.category)),
  };
}

export function getMediaBreakdown(pack: Segpack): SegpackMediaBreakdown {
  const photos = getPhotos(pack);
  const markups = getMarkups(pack);

  return {
    photos: photos.length,
    markups: markups.length,
    photosByCategory: sortRecordDesc(countBy(photos, (item) => item.category)),
    markupsByShape: sortRecordDesc(countBy(markups, (item) => item.shape)),
  };
}

export function getInventoryBreakdown(pack: Segpack): SegpackInventoryBreakdown {
  const parts = getParts(pack);
  const replacements = getReplacements(pack);

  return {
    parts: parts.length,
    replacements: replacements.length,
    partsByCategory: sortRecordDesc(countBy(parts, (item) => item.category)),
    replacementsByStatus: sortRecordDesc(
      countBy(replacements, (item) => item.status)
    ),
  };
}

export function getSegpackSummaryReport(pack: Segpack): SegpackSummaryReport {
  return {
    packageId: pack.manifest.packageId,
    title: pack.manifest.title,
    description: pack.manifest.description,
    schemaVersion: pack.manifest.schemaVersion,
    createdAt: pack.manifest.createdAt,
    updatedAt: pack.manifest.updatedAt,

    site: {
      id: pack.site.id,
      name: pack.site.name,
      clientName: pack.site.clientName,
      siteType: pack.site.siteType,
      status: pack.site.status,
      buildingName: pack.site.buildingName,
    },

    counts: getSegpackCounts(pack),
    systems: getSystemBreakdown(pack),
    faults: getFaultBreakdown(pack),
    compliance: getComplianceBreakdown(pack),
    media: getMediaBreakdown(pack),
    inventory: getInventoryBreakdown(pack),

    tags: pack.manifest.tags ?? [],
    sourceApp: pack.manifest.sourceApp,
    sourceAppVersion: pack.manifest.sourceAppVersion,
  };
}

export function getSegpackHeadlineStats(pack: Segpack) {
  const summary = getSegpackSummaryReport(pack);

  return {
    packageId: summary.packageId,
    siteName: summary.site.name,
    title: summary.title,
    totalSystems: summary.systems.total,
    totalDevices: summary.systems.devices,
    totalFaults: summary.faults.total,
    openFaults: summary.faults.open,
    resolvedFaults: summary.faults.resolved,
    totalCompliance: summary.compliance.total,
    totalPhotos: summary.media.photos,
    totalMarkups: summary.media.markups,
    totalParts: summary.inventory.parts,
    totalReplacements: summary.inventory.replacements,
  };
}