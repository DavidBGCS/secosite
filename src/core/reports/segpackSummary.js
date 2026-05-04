// src/core/reports/segpackSummary.ts
import { getSegpackCounts } from "../types/segpack";
import { getComplianceRecords, getFaults, getOpenFaults, getPhotos, getResolvedFaults, getSystems, getAllDevices, getMarkups, getParts, getReplacements, } from "../builder/segpackQueries";
function countBy(items, getKey) {
    const out = {};
    for (const item of items) {
        const raw = getKey(item);
        const key = typeof raw === "string" && raw.trim() ? raw.trim() : "unknown";
        out[key] = (out[key] ?? 0) + 1;
    }
    return out;
}
function sortRecordDesc(record) {
    return Object.fromEntries(Object.entries(record).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}
export function getFaultBreakdown(pack) {
    const faults = getFaults(pack);
    return {
        total: faults.length,
        open: getOpenFaults(pack).length,
        resolved: getResolvedFaults(pack).length,
        byStatus: sortRecordDesc(countBy(faults, (item) => item.status)),
        bySeverity: sortRecordDesc(countBy(faults, (item) => item.severity)),
        byPriority: sortRecordDesc(countBy(faults, (item) => item.priority)),
        byCategory: sortRecordDesc(countBy(faults, (item) => item.category)),
    };
}
export function getSystemBreakdown(pack) {
    const systems = getSystems(pack);
    const devices = getAllDevices(pack);
    return {
        total: systems.length,
        devices: devices.length,
        byDiscipline: sortRecordDesc(countBy(systems, (item) => item.discipline)),
        byStatus: sortRecordDesc(countBy(systems, (item) => item.status)),
    };
}
export function getComplianceBreakdown(pack) {
    const records = getComplianceRecords(pack);
    return {
        total: records.length,
        byStatus: sortRecordDesc(countBy(records, (item) => item.status)),
        byResult: sortRecordDesc(countBy(records, (item) => item.result)),
        byCategory: sortRecordDesc(countBy(records, (item) => item.category)),
    };
}
export function getMediaBreakdown(pack) {
    const photos = getPhotos(pack);
    const markups = getMarkups(pack);
    return {
        photos: photos.length,
        markups: markups.length,
        photosByCategory: sortRecordDesc(countBy(photos, (item) => item.category)),
        markupsByShape: sortRecordDesc(countBy(markups, (item) => item.shape)),
    };
}
export function getInventoryBreakdown(pack) {
    const parts = getParts(pack);
    const replacements = getReplacements(pack);
    return {
        parts: parts.length,
        replacements: replacements.length,
        partsByCategory: sortRecordDesc(countBy(parts, (item) => item.category)),
        replacementsByStatus: sortRecordDesc(countBy(replacements, (item) => item.status)),
    };
}
export function getSegpackSummaryReport(pack) {
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
export function getSegpackHeadlineStats(pack) {
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
