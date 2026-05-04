// src/core/types/segpack.ts
export function createEmptySegpackCounts() {
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
export function getSegpackCounts(pack) {
    return {
        systems: Array.isArray(pack?.systems) ? pack.systems.length : 0,
        faults: Array.isArray(pack?.faults) ? pack.faults.length : 0,
        parts: Array.isArray(pack?.parts) ? pack.parts.length : 0,
        replacements: Array.isArray(pack?.replacements) ? pack.replacements.length : 0,
        compliance: Array.isArray(pack?.compliance) ? pack.compliance.length : 0,
        photos: Array.isArray(pack?.photos) ? pack.photos.length : 0,
        markups: Array.isArray(pack?.markups) ? pack.markups.length : 0,
    };
}
export function getSegpackSummary(pack) {
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
