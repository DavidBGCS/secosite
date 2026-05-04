// src/core/types/manifest.ts

export const SEGPACK_SCHEMA_VERSION = "1.0.0" as const;

export type SegpackSchemaVersion = typeof SEGPACK_SCHEMA_VERSION;

export type SegpackExportFormat =
  | "segpack-json"
  | "segpack-bundle"
  | "segpack-local"
  | "unknown";

export type SegpackManifest = {
  packageId: string;
  schemaVersion: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  title?: string;
  description?: string;
  sourceApp?: string;
  sourceAppVersion?: string;
  exportFormat?: SegpackExportFormat | string;
  tags?: string[];
};

export type CreateSegpackManifestInput = {
  packageId: string;
  createdBy: string;
  schemaVersion?: string;
  title?: string;
  description?: string;
  sourceApp?: string;
  sourceAppVersion?: string;
  exportFormat?: SegpackExportFormat | string;
  tags?: string[];
  now?: Date | string;
};

export type UpdateSegpackManifestInput = {
  title?: string;
  description?: string;
  sourceApp?: string;
  sourceAppVersion?: string;
  exportFormat?: SegpackExportFormat | string;
  tags?: string[];
  updatedBy?: string;
  now?: Date | string;
};

export type SegpackManifestLike = Partial<SegpackManifest> &
  Pick<SegpackManifest, "packageId" | "createdBy">;