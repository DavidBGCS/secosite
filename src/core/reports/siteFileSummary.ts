// src/core/reports/siteFileSummary.ts

import type { SiteFile } from "../types/siteFile";
import type { AssetRecord } from "../types/asset";
import type { VisitRecord } from "../types/visit";
import type { FaultRecord } from "../types/fault";
import type { DisciplineProfile } from "../types/disciplineProfile";
import {
  getAutomaticDetectorProgress,
  getAvailableAssetCategories,
  getAvailableAssetTags,
} from "../builder/assetServiceMatrix";

export type SiteHeadlineStats = {
  siteName: string;
  siteReference?: string;
  address?: string;
  maintainedBy?: string;

  systemsCount: number;
  disciplineProfilesCount: number;
  assetsCount: number;
  activeAssetsCount: number;

  visitsCount: number;
  openFaultsCount: number;
  closedFaultsCount: number;
  replacementsCount: number;

  photosCount: number;
  exportedReportsCount: number;
};

export type DisciplineSummary = {
  discipline: DisciplineProfile["discipline"];
  count: number;
  systemsCount: number;
  assetsCount: number;
  openFaultsCount: number;
  closedFaultsCount: number;
  latestVisitAt?: string;
};

export type ServiceProgressSummary = {
  columnKey: string;
  label: string;
  serviceDate?: string;

  eligibleAutomaticDetectors: number;
  testedAutomaticDetectors: number;
  detectorPercentage: number;

  thresholdPercentage: number;
  thresholdMet: boolean;
  remainingToThreshold: number;
};

export type AssetCategorySummary = {
  category: AssetRecord["category"];
  count: number;
};

export type AssetTagSummary = {
  tag: string;
  count: number;
};

export type RecentVisitSummary = {
  id: string;
  startedAt: string;
  completedAt?: string;
  engineerName: string;
  visitType: VisitRecord["visitType"];
  status?: VisitRecord["status"];
  discipline?: VisitRecord["discipline"];
  serviceColumnKey?: string;
};

export type FaultSummaryItem = {
  id: string;
  title: string;
  severity?: string;
  priority?: string;
  status?: string;
  discipline?: string;
  systemId?: string;
};

export type SiteFileSummaryReport = {
  headline: SiteHeadlineStats;
  serviceProgress?: ServiceProgressSummary;
  disciplines: DisciplineSummary[];
  assetCategories: AssetCategorySummary[];
  assetTags: AssetTagSummary[];
  recentVisits: RecentVisitSummary[];
  openFaults: FaultSummaryItem[];
  closedFaults: FaultSummaryItem[];
};

export type SiteFileSummaryOptions = {
  currentServiceColumnKey?: string;
  thresholdPercentage?: number;
  recentVisitsLimit?: number;
  openFaultsLimit?: number;
  closedFaultsLimit?: number;
};

const DEFAULT_OPTIONS: Required<SiteFileSummaryOptions> = {
  currentServiceColumnKey: "",
  thresholdPercentage: 25,
  recentVisitsLimit: 5,
  openFaultsLimit: 10,
  closedFaultsLimit: 10,
};

function clean(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function joinAddress(address: SiteFile["site"]["address"]): string | undefined {
  if (!address) return undefined;
  if (typeof address === "string") return clean(address);

  const parts = [
    address.line1,
    address.line2,
    address.line3,
    address.city,
    address.county,
    address.postcode,
    address.country,
  ]
    .map(clean)
    .filter((v): v is string => Boolean(v));

  return parts.length ? parts.join(", ") : undefined;
}

function getSiteReference(siteFile: SiteFile): string | undefined {
  return clean(siteFile.site.siteCode) ?? clean(siteFile.site.id);
}

function countAssetsByDiscipline(siteFile: SiteFile, discipline: string): number {
  return siteFile.assets.filter((asset) => asset.discipline === discipline).length;
}

function countFaultsByDiscipline(
  faults: FaultRecord[],
  siteFile: SiteFile,
  discipline: string
): number {
  const systemIds = new Set(
    siteFile.systems
      .filter((system) => system.discipline === discipline)
      .map((system) => system.id)
  );

  return faults.filter((fault) => {
    if (fault.systemId && systemIds.has(fault.systemId)) return true;
    return false;
  }).length;
}

function latestVisitForDiscipline(
  siteFile: SiteFile,
  discipline: string
): string | undefined {
  const matching = siteFile.visits
    .filter((visit) => visit.discipline === discipline)
    .sort((a, b) => {
      const ad = new Date(a.completedAt ?? a.startedAt).getTime();
      const bd = new Date(b.completedAt ?? b.startedAt).getTime();
      return bd - ad;
    });

  return matching[0]?.completedAt ?? matching[0]?.startedAt;
}

function summarizeDiscipline(siteFile: SiteFile): DisciplineSummary[] {
  const disciplineCounts = new Map<DisciplineProfile["discipline"], number>();

  for (const profile of siteFile.disciplineProfiles) {
    disciplineCounts.set(
      profile.discipline,
      (disciplineCounts.get(profile.discipline) ?? 0) + 1
    );
  }

  return Array.from(disciplineCounts.entries())
    .map(([discipline, count]) => {
      const systemsCount = siteFile.systems.filter(
        (system) => system.discipline === discipline
      ).length;

      return {
        discipline,
        count,
        systemsCount,
        assetsCount: countAssetsByDiscipline(siteFile, discipline),
        openFaultsCount: countFaultsByDiscipline(
          siteFile.openFaults,
          siteFile,
          discipline
        ),
        closedFaultsCount: countFaultsByDiscipline(
          siteFile.closedFaults,
          siteFile,
          discipline
        ),
        latestVisitAt: latestVisitForDiscipline(siteFile, discipline),
      };
    })
    .sort((a, b) => a.discipline.localeCompare(b.discipline));
}

function summarizeAssetCategories(siteFile: SiteFile): AssetCategorySummary[] {
  const categories = getAvailableAssetCategories(siteFile);

  return categories
    .map((category) => ({
      category,
      count: siteFile.assets.filter((asset) => asset.category === category).length,
    }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

function summarizeAssetTags(siteFile: SiteFile): AssetTagSummary[] {
  const tags = getAvailableAssetTags(siteFile);

  return tags
    .map((tag) => ({
      tag,
      count: siteFile.assets.filter((asset) =>
        (asset.tags ?? []).some((t) => t.trim().toLowerCase() === tag.trim().toLowerCase())
      ).length,
    }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

function summarizeRecentVisits(
  siteFile: SiteFile,
  limit: number
): RecentVisitSummary[] {
  return [...siteFile.visits]
    .sort((a, b) => {
      const ad = new Date(a.completedAt ?? a.startedAt).getTime();
      const bd = new Date(b.completedAt ?? b.startedAt).getTime();
      return bd - ad;
    })
    .slice(0, limit)
    .map((visit) => ({
      id: visit.id,
      startedAt: visit.startedAt,
      completedAt: visit.completedAt,
      engineerName: visit.engineerName,
      visitType: visit.visitType,
      status: visit.status,
      discipline: visit.discipline,
      serviceColumnKey: visit.serviceColumnKey,
    }));
}

function summarizeFaults(
  siteFile: SiteFile,
  faults: FaultRecord[],
  limit: number
): FaultSummaryItem[] {
  return faults.slice(0, limit).map((fault) => {
    const system = fault.systemId
      ? siteFile.systems.find((s) => s.id === fault.systemId)
      : undefined;

    return {
      id: fault.id,
      title: fault.title,
      severity: fault.severity,
      priority: fault.priority,
      status: fault.status,
      discipline: system?.discipline,
      systemId: fault.systemId,
    };
  });
}

function getMaintainedBy(siteFile: SiteFile): string | undefined {
  const firstProfileWithMaintainer = siteFile.disciplineProfiles.find((p) =>
    clean(p.maintainedBy)
  );
  return firstProfileWithMaintainer?.maintainedBy;
}

export function getSiteHeadlineStats(siteFile: SiteFile): SiteHeadlineStats {
  return {
    siteName: siteFile.site.name,
    siteReference: getSiteReference(siteFile),
    address: joinAddress(siteFile.site.address),
    maintainedBy: getMaintainedBy(siteFile),

    systemsCount: siteFile.systems.length,
    disciplineProfilesCount: siteFile.disciplineProfiles.length,
    assetsCount: siteFile.assets.length,
    activeAssetsCount: siteFile.assets.filter((asset) => asset.active).length,

    visitsCount: siteFile.visits.length,
    openFaultsCount: siteFile.openFaults.length,
    closedFaultsCount: siteFile.closedFaults.length,
    replacementsCount: siteFile.replacementHistory.length,

    photosCount: siteFile.photos.length,
    exportedReportsCount: siteFile.exportedReports.length,
  };
}

export function getCurrentServiceProgress(
  siteFile: SiteFile,
  columnKey: string,
  thresholdPercentage = 25
): ServiceProgressSummary | undefined {
  if (!columnKey) return undefined;

  const column = siteFile.serviceLayout.columns.find((c) => c.key === columnKey);
  if (!column) return undefined;

  const progress = getAutomaticDetectorProgress(
    siteFile,
    columnKey,
    {
      activeOnly: true,
      serviceTrackableOnly: true,
    },
    thresholdPercentage
  );

  return {
    columnKey: column.key,
    label: column.label,
    serviceDate: column.serviceDate,
    eligibleAutomaticDetectors: progress.eligibleTotal,
    testedAutomaticDetectors: progress.testedCount,
    detectorPercentage: progress.percentage,
    thresholdPercentage: progress.thresholdPercentage,
    thresholdMet: progress.thresholdMet,
    remainingToThreshold: progress.remainingToThreshold,
  };
}

export function getSiteFileSummaryReport(
  siteFile: SiteFile,
  options: SiteFileSummaryOptions = {}
): SiteFileSummaryReport {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return {
    headline: getSiteHeadlineStats(siteFile),
    serviceProgress: opts.currentServiceColumnKey
      ? getCurrentServiceProgress(
          siteFile,
          opts.currentServiceColumnKey,
          opts.thresholdPercentage
        )
      : undefined,
    disciplines: summarizeDiscipline(siteFile),
    assetCategories: summarizeAssetCategories(siteFile),
    assetTags: summarizeAssetTags(siteFile),
    recentVisits: summarizeRecentVisits(siteFile, opts.recentVisitsLimit),
    openFaults: summarizeFaults(
      siteFile,
      siteFile.openFaults,
      opts.openFaultsLimit
    ),
    closedFaults: summarizeFaults(
      siteFile,
      siteFile.closedFaults,
      opts.closedFaultsLimit
    ),
  };
}