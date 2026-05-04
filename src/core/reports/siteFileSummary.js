// src/core/reports/siteFileSummary.ts
import { getAutomaticDetectorProgress, getAvailableAssetCategories, getAvailableAssetTags, } from "../builder/assetServiceMatrix";
const DEFAULT_OPTIONS = {
    currentServiceColumnKey: "",
    thresholdPercentage: 25,
    recentVisitsLimit: 5,
    openFaultsLimit: 10,
    closedFaultsLimit: 10,
};
function clean(value) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function joinAddress(address) {
    if (!address)
        return undefined;
    if (typeof address === "string")
        return clean(address);
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
        .filter((v) => Boolean(v));
    return parts.length ? parts.join(", ") : undefined;
}
function getSiteReference(siteFile) {
    return clean(siteFile.site.siteCode) ?? clean(siteFile.site.id);
}
function countAssetsByDiscipline(siteFile, discipline) {
    return siteFile.assets.filter((asset) => asset.discipline === discipline).length;
}
function countFaultsByDiscipline(faults, siteFile, discipline) {
    const systemIds = new Set(siteFile.systems
        .filter((system) => system.discipline === discipline)
        .map((system) => system.id));
    return faults.filter((fault) => {
        if (fault.systemId && systemIds.has(fault.systemId))
            return true;
        return false;
    }).length;
}
function latestVisitForDiscipline(siteFile, discipline) {
    const matching = siteFile.visits
        .filter((visit) => visit.discipline === discipline)
        .sort((a, b) => {
        const ad = new Date(a.completedAt ?? a.startedAt).getTime();
        const bd = new Date(b.completedAt ?? b.startedAt).getTime();
        return bd - ad;
    });
    return matching[0]?.completedAt ?? matching[0]?.startedAt;
}
function summarizeDiscipline(siteFile) {
    const disciplineCounts = new Map();
    for (const profile of siteFile.disciplineProfiles) {
        disciplineCounts.set(profile.discipline, (disciplineCounts.get(profile.discipline) ?? 0) + 1);
    }
    return Array.from(disciplineCounts.entries())
        .map(([discipline, count]) => {
        const systemsCount = siteFile.systems.filter((system) => system.discipline === discipline).length;
        return {
            discipline,
            count,
            systemsCount,
            assetsCount: countAssetsByDiscipline(siteFile, discipline),
            openFaultsCount: countFaultsByDiscipline(siteFile.openFaults, siteFile, discipline),
            closedFaultsCount: countFaultsByDiscipline(siteFile.closedFaults, siteFile, discipline),
            latestVisitAt: latestVisitForDiscipline(siteFile, discipline),
        };
    })
        .sort((a, b) => a.discipline.localeCompare(b.discipline));
}
function summarizeAssetCategories(siteFile) {
    const categories = getAvailableAssetCategories(siteFile);
    return categories
        .map((category) => ({
        category,
        count: siteFile.assets.filter((asset) => asset.category === category).length,
    }))
        .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}
function summarizeAssetTags(siteFile) {
    const tags = getAvailableAssetTags(siteFile);
    return tags
        .map((tag) => ({
        tag,
        count: siteFile.assets.filter((asset) => (asset.tags ?? []).some((t) => t.trim().toLowerCase() === tag.trim().toLowerCase())).length,
    }))
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
function summarizeRecentVisits(siteFile, limit) {
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
function summarizeFaults(siteFile, faults, limit) {
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
function getMaintainedBy(siteFile) {
    const firstProfileWithMaintainer = siteFile.disciplineProfiles.find((p) => clean(p.maintainedBy));
    return firstProfileWithMaintainer?.maintainedBy;
}
export function getSiteHeadlineStats(siteFile) {
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
export function getCurrentServiceProgress(siteFile, columnKey, thresholdPercentage = 25) {
    if (!columnKey)
        return undefined;
    const column = siteFile.serviceLayout.columns.find((c) => c.key === columnKey);
    if (!column)
        return undefined;
    const progress = getAutomaticDetectorProgress(siteFile, columnKey, {
        activeOnly: true,
        serviceTrackableOnly: true,
    }, thresholdPercentage);
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
export function getSiteFileSummaryReport(siteFile, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    return {
        headline: getSiteHeadlineStats(siteFile),
        serviceProgress: opts.currentServiceColumnKey
            ? getCurrentServiceProgress(siteFile, opts.currentServiceColumnKey, opts.thresholdPercentage)
            : undefined,
        disciplines: summarizeDiscipline(siteFile),
        assetCategories: summarizeAssetCategories(siteFile),
        assetTags: summarizeAssetTags(siteFile),
        recentVisits: summarizeRecentVisits(siteFile, opts.recentVisitsLimit),
        openFaults: summarizeFaults(siteFile, siteFile.openFaults, opts.openFaultsLimit),
        closedFaults: summarizeFaults(siteFile, siteFile.closedFaults, opts.closedFaultsLimit),
    };
}
