// src/core/export/localDatabaseJson.ts

import type { LocalDatabase } from "../types/localDatabase";
import { validateSiteFile } from "../validation/siteFileValidation";

export type LocalDatabaseExportOptions = {
  pretty?: boolean;
  space?: number;
};

export type LocalDatabaseImportResult = {
  ok: boolean;
  database?: LocalDatabase;
  errors: string[];
  warnings: string[];
};

const DEFAULT_EXPORT_OPTIONS: Required<LocalDatabaseExportOptions> = {
  pretty: true,
  space: 2,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeParseJson(input: string): unknown {
  return JSON.parse(input);
}

function sanitizeFileNamePart(value: string | undefined): string {
  const cleaned = (value ?? "segtools-backup")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || "segtools-backup";
}

function validateLocalDatabaseShape(database: LocalDatabase): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!database.metadata?.databaseId) {
    errors.push("metadata.databaseId is required.");
  }

  if (!database.metadata?.schemaVersion) {
    errors.push("metadata.schemaVersion is required.");
  }

  if (!Array.isArray(database.sites)) {
    errors.push("sites must be an array.");
    return { errors, warnings };
  }

  if (!Array.isArray(database.importExportHistory)) {
    warnings.push("importExportHistory should be an array.");
  }

  database.sites.forEach((siteFile, index) => {
    const result = validateSiteFile(siteFile);
    if (!result.valid) {
      result.errors.forEach((issue) => {
        errors.push(
          `sites[${index}]${issue.path ? `.${issue.path}` : ""}: ${issue.message}`
        );
      });
    }

    result.warnings.forEach((issue) => {
      warnings.push(
        `sites[${index}]${issue.path ? `.${issue.path}` : ""}: ${issue.message}`
      );
    });
  });

  return { errors, warnings };
}

export function stringifyLocalDatabase(
  database: LocalDatabase,
  options: LocalDatabaseExportOptions = {}
): string {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  return JSON.stringify(database, null, opts.pretty ? opts.space : 0);
}

export function exportLocalDatabaseJson(
  database: LocalDatabase,
  options: LocalDatabaseExportOptions = {}
): string {
  const validation = validateLocalDatabaseShape(database);

  if (validation.errors.length > 0) {
    throw new Error(
      `Local database validation failed before export.\n${validation.errors.join("\n")}`
    );
  }

  return stringifyLocalDatabase(database, options);
}

export function parseLocalDatabaseJson(input: string): LocalDatabaseImportResult {
  try {
    const parsed = safeParseJson(input);

    if (!isRecord(parsed)) {
      return {
        ok: false,
        errors: ["Imported local database is not a valid object."],
        warnings: [],
      };
    }

    const database = parsed as LocalDatabase;
    const validation = validateLocalDatabaseShape(database);

    return {
      ok: validation.errors.length === 0,
      database,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  } catch (error) {
    return {
      ok: false,
      errors: [
        error instanceof Error
          ? `Failed to parse local database JSON: ${error.message}`
          : "Failed to parse local database JSON.",
      ],
      warnings: [],
    };
  }
}

export function getLocalDatabaseDownloadName(database?: LocalDatabase): string {
  const version = sanitizeFileNamePart(database?.metadata?.schemaVersion ?? "v1");
  const date = new Date().toISOString().slice(0, 10);
  return `segtools-backup-${version}-${date}.json`;
}