// src/core/builder/localDatabaseBuilder.ts
function makeId(prefix = "id") {
    if (globalThis.crypto?.randomUUID) {
        return `${prefix}-${globalThis.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
export function createLocalDatabase() {
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
export function addSite(database, siteFile) {
    database.sites.push(siteFile);
    database.metadata.updatedAt = new Date().toISOString();
}
export function removeSite(database, siteFileId) {
    database.sites = database.sites.filter((s) => s.metadata.siteFileId !== siteFileId);
    database.metadata.updatedAt = new Date().toISOString();
}
export function findSite(database, siteFileId) {
    return database.sites.find((s) => s.metadata.siteFileId === siteFileId);
}
