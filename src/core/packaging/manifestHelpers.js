// src/core/packaging/manifestHelpers.ts
import { SEGPACK_SCHEMA_VERSION, } from "../types/manifest";
function toIsoString(value) {
    if (!value)
        return new Date().toISOString();
    if (value instanceof Date)
        return value.toISOString();
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return new Date().toISOString();
    }
    return parsed.toISOString();
}
function cleanOptionalString(value) {
    if (typeof value !== "string")
        return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
}
function cleanTags(value) {
    if (!Array.isArray(value))
        return undefined;
    const tags = value
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
    return tags.length > 0 ? Array.from(new Set(tags)) : undefined;
}
export function createManifest(input) {
    const createdAt = toIsoString(input.now);
    return {
        packageId: input.packageId.trim(),
        schemaVersion: cleanOptionalString(input.schemaVersion) ?? SEGPACK_SCHEMA_VERSION,
        createdAt,
        createdBy: input.createdBy.trim(),
        title: cleanOptionalString(input.title),
        description: cleanOptionalString(input.description),
        sourceApp: cleanOptionalString(input.sourceApp),
        sourceAppVersion: cleanOptionalString(input.sourceAppVersion),
        exportFormat: cleanOptionalString(input.exportFormat),
        tags: cleanTags(input.tags),
    };
}
export function updateManifest(manifest, updates = {}) {
    return {
        ...manifest,
        title: updates.title !== undefined
            ? cleanOptionalString(updates.title)
            : manifest.title,
        description: updates.description !== undefined
            ? cleanOptionalString(updates.description)
            : manifest.description,
        sourceApp: updates.sourceApp !== undefined
            ? cleanOptionalString(updates.sourceApp)
            : manifest.sourceApp,
        sourceAppVersion: updates.sourceAppVersion !== undefined
            ? cleanOptionalString(updates.sourceAppVersion)
            : manifest.sourceAppVersion,
        exportFormat: updates.exportFormat !== undefined
            ? cleanOptionalString(updates.exportFormat)
            : manifest.exportFormat,
        tags: updates.tags !== undefined ? cleanTags(updates.tags) : manifest.tags,
        updatedAt: toIsoString(updates.now),
    };
}
export function touchManifest(manifest, now) {
    return {
        ...manifest,
        updatedAt: toIsoString(now),
    };
}
export function ensureManifestDefaults(manifest) {
    return {
        packageId: manifest.packageId.trim(),
        schemaVersion: cleanOptionalString(manifest.schemaVersion) ?? SEGPACK_SCHEMA_VERSION,
        createdAt: cleanOptionalString(manifest.createdAt) ?? new Date().toISOString(),
        createdBy: manifest.createdBy.trim(),
        updatedAt: cleanOptionalString(manifest.updatedAt),
        title: cleanOptionalString(manifest.title),
        description: cleanOptionalString(manifest.description),
        sourceApp: cleanOptionalString(manifest.sourceApp),
        sourceAppVersion: cleanOptionalString(manifest.sourceAppVersion),
        exportFormat: cleanOptionalString(manifest.exportFormat),
        tags: cleanTags(manifest.tags),
    };
}
