// src/core/import/assetsImport.ts

import type { AssetCategory, AssetRecord, AssetSource } from "../types/asset";
import type { ID } from "../types/base";

export type ImportedAssetRow = {
  reference?: string;
  loop?: string;
  address?: string;
  zone?: string;
  assetType?: string;
  description?: string;
  locationText?: string;
  tags?: string[];
  source?: AssetSource;
  sourceFileName?: string;
};

export type AssetImportResult = {
  assets: AssetRecord[];
  warnings: string[];
  errors: string[];
};

export type AssetImportContext = {
  siteId: ID;
  systemId?: ID;
  discipline:
    | "fire-alarm"
    | "emergency-lighting"
    | "intruder-alarm"
    | "cctv"
    | "access-control"
    | "other";
  createdBy?: string;
  source?: AssetSource;
  sourceFileName?: string;
};

export type AssetImportMapping = {
  reference?: string;
  loop?: string;
  address?: string;
  zone?: string;
  assetType?: string;
  description?: string;
  locationText?: string;
  tags?: string;
};

function makeId(prefix = "asset"): ID {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${rand}`;
}

function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeText(value: unknown): string {
  return clean(value)?.toLowerCase() ?? "";
}

function splitDelimited(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[;,|]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferReference(loop?: string, address?: string, fallback?: string): string {
  const l = clean(loop);
  const a = clean(address);
  if (l && a) return `L${l}-A${a}`;
  return clean(fallback) ?? makeId("ref");
}

function normalizeAssetType(raw?: string): string {
  const value = clean(raw);
  if (!value) return "Unknown Device";

  const key = normalizeText(value);

  const map: Record<string, string> = {
    "optical": "Optical Detector",
    "optical detector": "Optical Detector",
    "smoke detector": "Optical Detector",
    "photo detector": "Optical Detector",
    "photoelectric detector": "Optical Detector",

    "heat detector": "Heat Detector",
    "heat": "Heat Detector",
    "rate of rise detector": "Heat Detector",

    "multisensor": "Multisensor Detector",
    "multi sensor": "Multisensor Detector",
    "multi-sensor": "Multisensor Detector",

    "beam": "Beam Detector",
    "beam detector": "Beam Detector",

    "aspirating": "Aspirating Detector",
    "aspirating detector": "Aspirating Detector",
    "asd": "Aspirating Detector",

    "mcp": "Manual Call Point",
    "manual call point": "Manual Call Point",
    "call point": "Manual Call Point",

    "sounder": "Sounder",
    "sounder beacon": "Sounder Beacon",
    "sounder/beacon": "Sounder Beacon",
    "beacon": "Beacon",

    "interface": "Interface",
    "input module": "Input Module",
    "output module": "Output Module",
    "i/o": "I/O Module",
    "io": "I/O Module",
    "input/output": "I/O Module",

    "panel": "Control Panel",
    "fire alarm panel": "Control Panel",
    "repeater": "Repeater Panel",
    "psu": "Power Supply Unit",
    "power supply": "Power Supply Unit",
  };

  return map[key] ?? value;
}

function inferCategory(assetType: string, tags: string[]): AssetCategory {
  const t = normalizeText(assetType);
  const all = [t, ...tags.map(normalizeText)].join(" ");

  if (all.includes("optical")) return "optical-detector";
  if (all.includes("heat")) return "heat-detector";
  if (all.includes("multisensor") || all.includes("multi sensor")) return "multisensor";
  if (all.includes("beam")) return "beam";
  if (all.includes("aspirating") || all.includes("asd")) return "aspirating";

  if (all.includes("detector")) return "detector";
  if (all.includes("manual call point") || all.includes("mcp")) return "mcp";
  if (all.includes("sounder beacon")) return "sounder-beacon";
  if (all.includes("sounder")) return "sounder";
  if (all.includes("interface")) return "interface";
  if (all.includes("i/o") || all.includes(" io ") || all.includes("input module") || all.includes("output module")) {
    return "io";
  }
  if (all.includes("psu") || all.includes("power supply")) return "psu";
  if (all.includes("panel")) return "panel";
  if (all.includes("repeater")) return "repeater";
  if (all.includes("atex")) return "atex";
  if (all.includes("void")) return "void";
  if (all.includes("attic")) return "attic";

  return "other";
}

function countsTowardAutoDetectionPercentage(category: AssetCategory): boolean {
  return (
    category === "detector" ||
    category === "optical-detector" ||
    category === "heat-detector" ||
    category === "multisensor" ||
    category === "beam" ||
    category === "aspirating"
  );
}

function autoTags(assetType: string, description?: string, locationText?: string): string[] {
  const text = [assetType, description, locationText]
    .map((v) => normalizeText(v))
    .join(" ");

  const tags = new Set<string>();

  if (text.includes("void")) tags.add("void");
  if (text.includes("attic")) tags.add("attic");
  if (text.includes("roof")) tags.add("roof");
  if (text.includes("atex")) tags.add("atex");
  if (text.includes("plant")) tags.add("plantroom");
  if (text.includes("interface")) tags.add("interface");
  if (text.includes("i/o") || text.includes("input module") || text.includes("output module")) tags.add("io");
  if (text.includes("sounder")) tags.add("sounder");
  if (text.includes("detector")) tags.add("detector");
  if (text.includes("mcp") || text.includes("manual call point")) tags.add("mcp");

  return Array.from(tags);
}

function uniqueTags(tags: string[]): string[] {
  return Array.from(
    new Set(tags.map((tag) => tag.trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
}

export function buildAssetRecord(
  row: ImportedAssetRow,
  ctx: AssetImportContext
): AssetRecord {
  const assetType = normalizeAssetType(row.assetType);
  const baseTags = [
    ...autoTags(assetType, row.description, row.locationText),
    ...(row.tags ?? []),
  ];
  const tags = uniqueTags(baseTags);
  const category = inferCategory(assetType, tags);
  const now = new Date().toISOString();

  return {
    id: makeId("asset"),
    siteId: ctx.siteId,
    systemId: ctx.systemId,
    discipline: ctx.discipline,

    reference: inferReference(row.loop, row.address, row.reference),
    loop: clean(row.loop),
    address: clean(row.address),
    zone: clean(row.zone),

    assetType,
    category,
    description: clean(row.description),
    locationText: clean(row.locationText),

    tags,

    source: row.source ?? ctx.source ?? "manual",
    sourceFileName: row.sourceFileName ?? ctx.sourceFileName,

    active: true,
    serviceTrackable: true,
    countsTowardAutoDetectionPercentage: countsTowardAutoDetectionPercentage(category),

    serviceTicks: [],

    removed: "no",

    createdAt: now,
    createdBy: ctx.createdBy,
    updatedAt: now,
    updatedBy: ctx.createdBy,
    name: clean(row.reference) ?? inferReference(row.loop, row.address),
  };
}

export function importAssetRows(
  rows: ImportedAssetRow[],
  ctx: AssetImportContext
): AssetImportResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const assets: AssetRecord[] = [];
  const seenRefs = new Set<string>();

  rows.forEach((row, index) => {
    try {
      if (!clean(row.reference) && !(clean(row.loop) && clean(row.address))) {
        warnings.push(
          `Row ${index + 1}: no explicit reference found, generated from available data.`
        );
      }

      if (!clean(row.assetType)) {
        warnings.push(`Row ${index + 1}: asset type missing, defaulted to "Unknown Device".`);
      }

      const asset = buildAssetRecord(row, ctx);

      if (seenRefs.has(asset.reference)) {
        warnings.push(`Row ${index + 1}: duplicate reference "${asset.reference}".`);
      }
      seenRefs.add(asset.reference);

      assets.push(asset);
    } catch (error) {
      errors.push(
        `Row ${index + 1}: ${error instanceof Error ? error.message : "Import failed."}`
      );
    }
  });

  return { assets, warnings, errors };
}

export function parseBulkAddText(
  input: string,
  ctx: AssetImportContext
): AssetImportResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const lines = input
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows: ImportedAssetRow[] = lines.map((line) => {
    // Supported loose patterns like:
    // "Loop 1 A11 Optical Detector Corridor"
    // "L1 A11 Optical Detector - Corridor"
    // "L1-A11, Optical Detector, Corridor"
    const csvish = line.split(",").map((s) => s.trim());

    if (csvish.length >= 2) {
      return {
        reference: csvish[0],
        assetType: csvish[1],
        locationText: csvish[2],
        source: "manual",
      };
    }

    const refMatch = line.match(/\bL(?:oop)?\s*([0-9]+)[\s-]*A(?:ddr(?:ess)?)?\s*([0-9]+)\b/i);
    const loop = refMatch?.[1];
    const address = refMatch?.[2];

    let remainder = line;
    if (refMatch) {
      remainder = line.replace(refMatch[0], "").trim();
    }

    const parts = remainder.split(/\s+-\s+|\s{2,}/).map((s) => s.trim()).filter(Boolean);

    return {
      loop,
      address,
      assetType: parts[0] ?? remainder,
      locationText: parts[1],
      source: "manual",
    };
  });

  const result = importAssetRows(rows, ctx);
  return {
    assets: result.assets,
    warnings: [...warnings, ...result.warnings],
    errors: [...errors, ...result.errors],
  };
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === `"`) {
      if (inQuotes && line[i + 1] === `"`) {
        current += `"`;
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  values.push(current.trim());
  return values;
}

export function parseCsvText(
  csvText: string,
  mapping: AssetImportMapping,
  ctx: AssetImportContext
): AssetImportResult {
  const lines = csvText
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      assets: [],
      warnings: [],
      errors: ["CSV must include a header row and at least one data row."],
    };
  }

  const headers = splitCsvLine(lines[0]);
  const headerIndex = new Map<string, number>();
  headers.forEach((header, index) => headerIndex.set(header.trim(), index));

  const getMappedValue = (values: string[], headerName?: string): string | undefined => {
    if (!headerName) return undefined;
    const idx = headerIndex.get(headerName);
    if (idx === undefined) return undefined;
    return values[idx];
  };

  const rows: ImportedAssetRow[] = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);

    return {
      reference: getMappedValue(values, mapping.reference),
      loop: getMappedValue(values, mapping.loop),
      address: getMappedValue(values, mapping.address),
      zone: getMappedValue(values, mapping.zone),
      assetType: getMappedValue(values, mapping.assetType),
      description: getMappedValue(values, mapping.description),
      locationText: getMappedValue(values, mapping.locationText),
      tags: splitDelimited(getMappedValue(values, mapping.tags)),
      source: "csv-import",
      sourceFileName: ctx.sourceFileName,
    };
  });

  return importAssetRows(rows, {
    ...ctx,
    source: ctx.source ?? "csv-import",
  });
}

export function parsePastedTable(
  input: string,
  ctx: AssetImportContext
): AssetImportResult {
  const lines = input
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      assets: [],
      warnings: [],
      errors: ["No pasted content found."],
    };
  }

  const rows: ImportedAssetRow[] = lines.map((line) => {
    const cols = line.includes("\t")
      ? line.split("\t").map((c) => c.trim())
      : line.split(/\s{2,}/).map((c) => c.trim());

    return {
      reference: cols[0],
      assetType: cols[1],
      locationText: cols[2],
      zone: cols[3],
      source: "panel-import",
      sourceFileName: ctx.sourceFileName,
    };
  });

  return importAssetRows(rows, {
    ...ctx,
    source: ctx.source ?? "panel-import",
  });
}

export function getSuggestedCsvMapping(headers: string[]): AssetImportMapping {
  const normalized = headers.map((h) => h.trim());

  const pick = (...candidates: string[]) =>
    normalized.find((header) =>
      candidates.some((candidate) => header.toLowerCase() === candidate.toLowerCase())
    );

  return {
    reference: pick("reference", "ref", "point", "device reference"),
    loop: pick("loop"),
    address: pick("address", "addr"),
    zone: pick("zone"),
    assetType: pick("type", "device type", "point type"),
    description: pick("description", "text", "point text"),
    locationText: pick("location", "location text", "area"),
    tags: pick("tags"),
  };
}

export function mergeImportedAssets(
  existing: AssetRecord[],
  imported: AssetRecord[],
  mode: "append" | "replace-duplicates" = "append"
): AssetRecord[] {
  if (mode === "append") {
    return [...existing, ...imported];
  }

  const map = new Map<string, AssetRecord>();
  for (const asset of existing) {
    map.set(asset.reference, asset);
  }
  for (const asset of imported) {
    map.set(asset.reference, asset);
  }

  return Array.from(map.values());
}