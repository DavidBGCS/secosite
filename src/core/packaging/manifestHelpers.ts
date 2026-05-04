// src/core/packaging/manifestHelpers.ts

import {
  SEGPACK_SCHEMA_VERSION,
  type CreateSegpackManifestInput,
  type SegpackManifest,
  type SegpackManifestLike,
  type UpdateSegpackManifestInput,
} from "../types/manifest";

function toIsoString(value?: Date | string): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function cleanOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function cleanTags(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const tags = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return tags.length > 0 ? Array.from(new Set(tags)) : undefined;
}

export function createManifest(
  input: CreateSegpackManifestInput
): SegpackManifest {
  const createdAt = toIsoString(input.now);

  return {
    packageId: input.packageId.trim(),
    schemaVersion:
      cleanOptionalString(input.schemaVersion) ?? SEGPACK_SCHEMA_VERSION,
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

export function updateManifest(
  manifest: SegpackManifest,
  updates: UpdateSegpackManifestInput = {}
): SegpackManifest {
  return {
    ...manifest,
    title:
      updates.title !== undefined
        ? cleanOptionalString(updates.title)
        : manifest.title,
    description:
      updates.description !== undefined
        ? cleanOptionalString(updates.description)
        : manifest.description,
    sourceApp:
      updates.sourceApp !== undefined
        ? cleanOptionalString(updates.sourceApp)
        : manifest.sourceApp,
    sourceAppVersion:
      updates.sourceAppVersion !== undefined
        ? cleanOptionalString(updates.sourceAppVersion)
        : manifest.sourceAppVersion,
    exportFormat:
      updates.exportFormat !== undefined
        ? cleanOptionalString(updates.exportFormat)
        : manifest.exportFormat,
    tags: updates.tags !== undefined ? cleanTags(updates.tags) : manifest.tags,
    updatedAt: toIsoString(updates.now),
  };
}

export function touchManifest(
  manifest: SegpackManifest,
  now?: Date | string
): SegpackManifest {
  return {
    ...manifest,
    updatedAt: toIsoString(now),
  };
}

export function ensureManifestDefaults(
  manifest: SegpackManifestLike
): SegpackManifest {
  return {
    packageId: manifest.packageId.trim(),
    schemaVersion:
      cleanOptionalString(manifest.schemaVersion) ?? SEGPACK_SCHEMA_VERSION,
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