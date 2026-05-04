// src/core/packaging/writeSegpack.ts

import type { Segpack } from "../types/segpack";
import {
  validateSegpack,
  type ValidateSegpackOptions,
  type ValidationIssue,
} from "../validation/validateSegpack";

export type WriteSegpackSuccess = {
  ok: true;
  json: string;
  value: Segpack;
  issues: ValidationIssue[];
  warnings: ValidationIssue[];
};

export type WriteSegpackFailure = {
  ok: false;
  error: string;
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
};

export type WriteSegpackResult = WriteSegpackSuccess | WriteSegpackFailure;

export type WriteSegpackOptions = ValidateSegpackOptions & {
  pretty?: boolean;
  space?: number;
  replacer?: (this: unknown, key: string, value: unknown) => unknown;
  transform?: (value: Segpack) => Segpack;
};

function normalizeWriteError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Failed to write segpack.";
}

function safeCloneJsonLike<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function stringifySegpack(
  value: Segpack,
  options: Pick<WriteSegpackOptions, "pretty" | "space" | "replacer"> = {}
): string {
  const { pretty = true, space, replacer } = options;
  const indent = typeof space === "number" ? space : pretty ? 2 : 0;
  return JSON.stringify(value, replacer, indent);
}

export function writeSegpack(
  input: Segpack,
  options: WriteSegpackOptions = {}
): WriteSegpackResult {
  const {
    pretty = true,
    space,
    replacer,
    transform,
    ...validateOptions
  } = options;

  try {
    const prepared = transform ? transform(input) : input;

    const validation = validateSegpack<Segpack>(prepared, validateOptions);

    if (!validation.ok || !validation.value) {
      return {
        ok: false,
        error: "Segpack validation failed.",
        issues: validation.issues,
        errors: validation.errors,
        warnings: validation.warnings,
      };
    }

    const cleanValue = safeCloneJsonLike(validation.value);
    const json = stringifySegpack(cleanValue, { pretty, space, replacer });

    return {
      ok: true,
      json,
      value: cleanValue,
      issues: validation.issues,
      warnings: validation.warnings,
    };
  } catch (error) {
    return {
      ok: false,
      error: normalizeWriteError(error),
      issues: [],
      errors: [],
      warnings: [],
    };
  }
}

export function writeSegpackOrThrow(
  input: Segpack,
  options: WriteSegpackOptions = {}
): string {
  const result = writeSegpack(input, options);

  if (!result.ok) {
    const issueText =
      result.issues.length > 0
        ? "\n" +
          result.issues
            .map(
              (issue) =>
                `[${issue.severity}] ${issue.path} (${issue.code}): ${issue.message}`
            )
            .join("\n")
        : "";

    throw new Error(`${result.error}${issueText}`);
  }

  return result.json;
}

export function createSegpackBlob(
  input: Segpack,
  options: WriteSegpackOptions = {}
): Blob {
  const json = writeSegpackOrThrow(input, options);
  return new Blob([json], { type: "application/json" });
}

export function createSegpackFileName(
  packageId?: string,
  extension = "segpack.json"
): string {
  const safeId =
    typeof packageId === "string" && packageId.trim()
      ? packageId.trim().replace(/[^\w.-]+/g, "-")
      : "segpack";

  return `${safeId}.${extension.replace(/^\.+/, "")}`;
}