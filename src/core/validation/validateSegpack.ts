// src/core/validation/validateSegpack.ts

import type { Segpack } from "../types/segpack";

export type ValidationSeverity = "error" | "warning";

export type ValidationIssue = {
  severity: ValidationSeverity;
  path: string;
  code: string;
  message: string;
};

export type ValidationResult<T> = {
  ok: boolean;
  value?: T;
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
};

export type ValidateSegpackOptions = {
  requireSystems?: boolean;
  requireSite?: boolean;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pushIssue(
  issues: ValidationIssue[],
  severity: ValidationSeverity,
  path: string,
  code: string,
  message: string
) {
  issues.push({ severity, path, code, message });
}

function validateManifest(pack: any, issues: ValidationIssue[]) {
  if (!isObject(pack.manifest)) {
    pushIssue(
      issues,
      "error",
      "manifest",
      "missing",
      "Manifest section is required."
    );
    return;
  }

  if (!pack.manifest.packageId) {
    pushIssue(
      issues,
      "error",
      "manifest.packageId",
      "missing",
      "Manifest.packageId is required."
    );
  }

  if (!pack.manifest.schemaVersion) {
    pushIssue(
      issues,
      "error",
      "manifest.schemaVersion",
      "missing",
      "Manifest.schemaVersion is required."
    );
  }

  if (!pack.manifest.createdAt) {
    pushIssue(
      issues,
      "warning",
      "manifest.createdAt",
      "missing",
      "Manifest.createdAt not specified."
    );
  }
}

function validateSite(pack: any, issues: ValidationIssue[], requireSite: boolean) {
  if (!pack.site) {
    if (requireSite) {
      pushIssue(
        issues,
        "error",
        "site",
        "missing",
        "Site section is required."
      );
    }
    return;
  }

  if (!isObject(pack.site)) {
    pushIssue(
      issues,
      "error",
      "site",
      "type",
      "Site must be an object."
    );
    return;
  }

  if (!pack.site.id) {
    pushIssue(
      issues,
      "error",
      "site.id",
      "missing",
      "Site.id is required."
    );
  }

  if (!pack.site.name) {
    pushIssue(
      issues,
      "warning",
      "site.name",
      "missing",
      "Site.name is recommended."
    );
  }
}

function validateArraySection(
  pack: any,
  key: string,
  issues: ValidationIssue[],
  required = false
) {
  const value = pack[key];

  if (!value) {
    if (required) {
      pushIssue(
        issues,
        "error",
        key,
        "missing",
        `${key} array is required.`
      );
    }
    return;
  }

  if (!Array.isArray(value)) {
    pushIssue(
      issues,
      "error",
      key,
      "type",
      `${key} must be an array.`
    );
    return;
  }

  value.forEach((item: any, index: number) => {
    if (!isObject(item)) {
      pushIssue(
        issues,
        "error",
        `${key}[${index}]`,
        "type",
        "Item must be an object."
      );
      return;
    }

    if (!item.id) {
      pushIssue(
        issues,
        "warning",
        `${key}[${index}].id`,
        "missing",
        "Item id missing."
      );
    }
  });
}

function validateReferences(pack: any, issues: ValidationIssue[]) {
  const systemIds = new Set<string>();
  const faultIds = new Set<string>();
  const partIds = new Set<string>();
  const photoIds = new Set<string>();
  const markupIds = new Set<string>();

  pack.systems?.forEach((s: any) => s.id && systemIds.add(s.id));
  pack.faults?.forEach((f: any) => f.id && faultIds.add(f.id));
  pack.parts?.forEach((p: any) => p.id && partIds.add(p.id));
  pack.photos?.forEach((p: any) => p.id && photoIds.add(p.id));
  pack.markups?.forEach((m: any) => m.id && markupIds.add(m.id));

  pack.faults?.forEach((fault: any, i: number) => {
    if (fault.systemId && !systemIds.has(fault.systemId)) {
      pushIssue(
        issues,
        "warning",
        `faults[${i}].systemId`,
        "ref",
        `System reference ${fault.systemId} not found.`
      );
    }

    fault.photoIds?.forEach((id: string, pIndex: number) => {
      if (!photoIds.has(id)) {
        pushIssue(
          issues,
          "warning",
          `faults[${i}].photoIds[${pIndex}]`,
          "ref",
          `Photo reference ${id} not found.`
        );
      }
    });

    fault.markupIds?.forEach((id: string, mIndex: number) => {
      if (!markupIds.has(id)) {
        pushIssue(
          issues,
          "warning",
          `faults[${i}].markupIds[${mIndex}]`,
          "ref",
          `Markup reference ${id} not found.`
        );
      }
    });

    fault.partIds?.forEach((id: string, pIndex: number) => {
      if (!partIds.has(id)) {
        pushIssue(
          issues,
          "warning",
          `faults[${i}].partIds[${pIndex}]`,
          "ref",
          `Part reference ${id} not found.`
        );
      }
    });
  });
}

export function validateSegpack(
  input: unknown,
  options: ValidateSegpackOptions = {}
): ValidationResult<Segpack> {

  const issues: ValidationIssue[] = [];
  const { requireSystems = true, requireSite = true } = options;

  if (!isObject(input)) {
    pushIssue(
      issues,
      "error",
      "segpack",
      "type",
      "Segpack must be an object."
    );

    return {
      ok: false,
      issues,
      errors: issues,
      warnings: [],
    };
  }

  const pack = input as any;

  validateManifest(pack, issues);
  validateSite(pack, issues, requireSite);

  validateArraySection(pack, "systems", issues, requireSystems);
  validateArraySection(pack, "faults", issues);
  validateArraySection(pack, "parts", issues);
  validateArraySection(pack, "replacements", issues);
  validateArraySection(pack, "compliance", issues);
  validateArraySection(pack, "photos", issues);
  validateArraySection(pack, "markups", issues);

  validateReferences(pack, issues);

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  return {
    ok: errors.length === 0,
    value: errors.length === 0 ? (pack as Segpack) : undefined,
    issues,
    errors,
    warnings,
  };
}