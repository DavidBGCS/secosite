// src/core/packaging/readSegpack.ts

import type { Segpack } from "../types/segpack";
import {
  validateSegpack,
  type ValidateSegpackOptions,
  type ValidationIssue,
} from "../validation/validateSegpack";

export type ReadSegpackSuccess<T = Segpack> = {
  ok: true;
  value: T;
  issues: ValidationIssue[];
  warnings: ValidationIssue[];
};

export type ReadSegpackFailure = {
  ok: false;
  error: string;
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
};

export type ReadSegpackResult<T = Segpack> =
  | ReadSegpackSuccess<T>
  | ReadSegpackFailure;

export type ReadSegpackOptions<T = Segpack> = ValidateSegpackOptions & {
  reviver?: (this: unknown, key: string, value: unknown) => unknown;
  transform?: (value: Segpack) => T;
};

function normalizeJsonError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Failed to parse JSON.";
}

function normalizeReadError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Failed to read segpack.";
}

export function parseSegpackJson(
  input: string,
  reviver?: (this: unknown, key: string, value: unknown) => unknown
): unknown {
  return JSON.parse(input, reviver);
}

export function readSegpack<T = Segpack>(
  input: unknown,
  options: ReadSegpackOptions<T> = {}
): ReadSegpackResult<T> {
  const { reviver, transform, ...validateOptions } = options;

  let parsed: unknown;

  try {
    parsed = typeof input === "string" ? parseSegpackJson(input, reviver) : input;
  } catch (error) {
    return {
      ok: false,
      error: `Invalid JSON: ${normalizeJsonError(error)}`,
      issues: [],
      errors: [],
      warnings: [],
    };
  }

  try {
    const validation = validateSegpack<Segpack>(parsed, validateOptions);

    if (!validation.ok || !validation.value) {
      return {
        ok: false,
        error: "Segpack validation failed.",
        issues: validation.issues,
        errors: validation.errors,
        warnings: validation.warnings,
      };
    }

    const value = transform ? transform(validation.value) : (validation.value as unknown as T);

    return {
      ok: true,
      value,
      issues: validation.issues,
      warnings: validation.warnings,
    };
  } catch (error) {
    return {
      ok: false,
      error: normalizeReadError(error),
      issues: [],
      errors: [],
      warnings: [],
    };
  }
}

export function readSegpackOrThrow<T = Segpack>(
  input: unknown,
  options: ReadSegpackOptions<T> = {}
): T {
  const result = readSegpack<T>(input, options);

  if (!result.ok) {
    const issueText =
      result.issues.length > 0
        ? "\n" +
          result.issues
            .map((issue) => `[${issue.severity}] ${issue.path} (${issue.code}): ${issue.message}`)
            .join("\n")
        : "";

    throw new Error(`${result.error}${issueText}`);
  }

  return result.value;
}

export function isProbablySegpack(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return "manifest" in obj && "site" in obj && ("systems" in obj || "faults" in obj);
}