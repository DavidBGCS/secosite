// src/core/export/siteFileJson.ts

import type { SiteFile } from "../types/siteFile";
import { validateSiteFile } from "../validation/siteFileValidation";

export type SiteFileExportOptions = {
  pretty?: boolean;
  space?: number;
};

export type SiteFileImportResult = {
  ok: boolean;
  siteFile?: SiteFile;
  errors: string[];
  warnings: string[];
};

const DEFAULT_EXPORT_OPTIONS: Required<SiteFileExportOptions> = {
  pretty: true,
  space: 2,
};

function safeParseJson(input: string): unknown {
  return JSON.parse(input);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeFileNamePart(value: string | undefined): string {
  const cleaned = (value ?? "site")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || "site";
}

export function stringifySiteFile(
  siteFile: SiteFile,
  options: SiteFileExportOptions = {}
): string {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  return JSON.stringify(siteFile, null, opts.pretty ? opts.space : 0);
}

export function exportSiteFileJson(
  siteFile: SiteFile,
  options: SiteFileExportOptions = {}
): string {
  const validation = validateSiteFile(siteFile);

  if (!validation.valid) {
    const text = validation.errors
      .map((issue) => `${issue.path ? `${issue.path}: ` : ""}${issue.message}`)
      .join("\n");

    throw new Error(`Site file validation failed before export.\n${text}`);
  }

  return stringifySiteFile(siteFile, options);
}

export function parseSiteFileJson(input: string): SiteFileImportResult {
  try {
    const parsed = safeParseJson(input);

    if (!isRecord(parsed)) {
      return {
        ok: false,
        errors: ["Imported site file is not a valid object."],
        warnings: [],
      };
    }

    const siteFile = parsed as SiteFile;
    const validation = validateSiteFile(siteFile);

    return {
      ok: validation.valid,
      siteFile,
      errors: validation.errors.map((issue) =>
        `${issue.path ? `${issue.path}: ` : ""}${issue.message}`
      ),
      warnings: validation.warnings.map((issue) =>
        `${issue.path ? `${issue.path}: ` : ""}${issue.message}`
      ),
    };
  } catch (error) {
    return {
      ok: false,
      errors: [
        error instanceof Error
          ? `Failed to parse site file JSON: ${error.message}`
          : "Failed to parse site file JSON.",
      ],
      warnings: [],
    };
  }
}

export function getSiteFileDownloadName(siteFile: SiteFile): string {
  const siteName = sanitizeFileNamePart(siteFile.site.name);
  const siteRef = sanitizeFileNamePart(siteFile.site.siteCode ?? siteFile.site.id);
  return `${siteName}-${siteRef}.segsite.json`;
}