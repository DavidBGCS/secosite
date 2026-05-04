// src/core/builder/createSegpack.ts

import type { Segpack } from "../types/segpack";
import type { SegpackManifest } from "../types/manifest";
import type { Site } from "../types/site";
import type { InstalledSystem } from "../types/system";
import type { FaultRecord } from "../types/fault";
import type { PartRecord } from "../types/part";
import type { ReplacementRecord } from "../types/replacement";
import type { ComplianceRecord } from "../types/compliance";
import type { PhotoRecord } from "../types/photo";
import type { MarkupRecord } from "../types/markup";
import { createManifest } from "../packaging/manifestHelpers";
import { validateSegpack } from "../validation/validateSegpack";

export type CreateSegpackInput = {
  manifest?: Partial<SegpackManifest>;
  site: Site;
  systems?: InstalledSystem[];
  faults?: FaultRecord[];
  parts?: PartRecord[];
  replacements?: ReplacementRecord[];
  compliance?: ComplianceRecord[];
  photos?: PhotoRecord[];
  markups?: MarkupRecord[];
  packageId?: string;
  createdBy?: string;
};

export type SegpackBuilder = {
  getPack(): Segpack;
  validate(): ReturnType<typeof validateSegpack>;

  setManifest(manifest: SegpackManifest): SegpackBuilder;
  setSite(site: Site): SegpackBuilder;

  addSystem(system: InstalledSystem): SegpackBuilder;
  addFault(fault: FaultRecord): SegpackBuilder;
  addPart(part: PartRecord): SegpackBuilder;
  addReplacement(replacement: ReplacementRecord): SegpackBuilder;
  addCompliance(record: ComplianceRecord): SegpackBuilder;
  addPhoto(photo: PhotoRecord): SegpackBuilder;
  addMarkup(markup: MarkupRecord): SegpackBuilder;

  addSystems(items: InstalledSystem[]): SegpackBuilder;
  addFaults(items: FaultRecord[]): SegpackBuilder;
  addParts(items: PartRecord[]): SegpackBuilder;
  addReplacements(items: ReplacementRecord[]): SegpackBuilder;
  addComplianceRecords(items: ComplianceRecord[]): SegpackBuilder;
  addPhotos(items: PhotoRecord[]): SegpackBuilder;
  addMarkups(items: MarkupRecord[]): SegpackBuilder;

  upsertSystem(system: InstalledSystem): SegpackBuilder;
  upsertFault(fault: FaultRecord): SegpackBuilder;
  upsertPart(part: PartRecord): SegpackBuilder;
  upsertReplacement(replacement: ReplacementRecord): SegpackBuilder;
  upsertCompliance(record: ComplianceRecord): SegpackBuilder;
  upsertPhoto(photo: PhotoRecord): SegpackBuilder;
  upsertMarkup(markup: MarkupRecord): SegpackBuilder;

  removeSystem(id: string): SegpackBuilder;
  removeFault(id: string): SegpackBuilder;
  removePart(id: string): SegpackBuilder;
  removeReplacement(id: string): SegpackBuilder;
  removeCompliance(id: string): SegpackBuilder;
  removePhoto(id: string): SegpackBuilder;
  removeMarkup(id: string): SegpackBuilder;
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function ensureArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  const index = items.findIndex((x) => x.id === item.id);
  if (index === -1) return [...items, item];

  const copy = [...items];
  copy[index] = item;
  return copy;
}

function removeById<T extends { id: string }>(items: T[], id: string): T[] {
  return items.filter((item) => item.id !== id);
}

function createDefaultManifest(input: CreateSegpackInput): SegpackManifest {
  const packageId =
    input.packageId?.trim() ||
    input.manifest?.packageId?.trim() ||
    `segpack-${Date.now()}`;

  const createdBy =
    input.createdBy?.trim() ||
    input.manifest?.createdBy?.trim() ||
    "unknown";

  return {
    ...createManifest({
      packageId,
      createdBy,
      schemaVersion: input.manifest?.schemaVersion,
      title: input.manifest?.title,
      description: input.manifest?.description,
      sourceApp: input.manifest?.sourceApp,
      sourceAppVersion: input.manifest?.sourceAppVersion,
      exportFormat: input.manifest?.exportFormat,
      tags: input.manifest?.tags,
      now: input.manifest?.createdAt,
    }),
    updatedAt: input.manifest?.updatedAt,
  };
}

export function createSegpack(input: CreateSegpackInput): Segpack {
  return {
    manifest: createDefaultManifest(input),
    site: deepClone(input.site),
    systems: deepClone(ensureArray(input.systems)),
    faults: deepClone(ensureArray(input.faults)),
    parts: deepClone(ensureArray(input.parts)),
    replacements: deepClone(ensureArray(input.replacements)),
    compliance: deepClone(ensureArray(input.compliance)),
    photos: deepClone(ensureArray(input.photos)),
    markups: deepClone(ensureArray(input.markups)),
  };
}

export function createSegpackBuilder(input: CreateSegpackInput): SegpackBuilder {
  let pack = createSegpack(input);

  const api: SegpackBuilder = {
    getPack() {
      return deepClone(pack);
    },

    validate() {
      return validateSegpack(pack);
    },

    setManifest(manifest) {
      pack = { ...pack, manifest: deepClone(manifest) };
      return api;
    },

    setSite(site) {
      pack = { ...pack, site: deepClone(site) };
      return api;
    },

    addSystem(system) {
      pack = { ...pack, systems: [...pack.systems, deepClone(system)] };
      return api;
    },

    addFault(fault) {
      pack = { ...pack, faults: [...pack.faults, deepClone(fault)] };
      return api;
    },

    addPart(part) {
      pack = { ...pack, parts: [...ensureArray(pack.parts), deepClone(part)] };
      return api;
    },

    addReplacement(replacement) {
      pack = {
        ...pack,
        replacements: [...ensureArray(pack.replacements), deepClone(replacement)],
      };
      return api;
    },

    addCompliance(record) {
      pack = {
        ...pack,
        compliance: [...ensureArray(pack.compliance), deepClone(record)],
      };
      return api;
    },

    addPhoto(photo) {
      pack = {
        ...pack,
        photos: [...ensureArray(pack.photos), deepClone(photo)],
      };
      return api;
    },

    addMarkup(markup) {
      pack = {
        ...pack,
        markups: [...ensureArray(pack.markups), deepClone(markup)],
      };
      return api;
    },

    addSystems(items) {
      pack = { ...pack, systems: [...pack.systems, ...deepClone(items)] };
      return api;
    },

    addFaults(items) {
      pack = { ...pack, faults: [...pack.faults, ...deepClone(items)] };
      return api;
    },

    addParts(items) {
      pack = { ...pack, parts: [...ensureArray(pack.parts), ...deepClone(items)] };
      return api;
    },

    addReplacements(items) {
      pack = {
        ...pack,
        replacements: [...ensureArray(pack.replacements), ...deepClone(items)],
      };
      return api;
    },

    addComplianceRecords(items) {
      pack = {
        ...pack,
        compliance: [...ensureArray(pack.compliance), ...deepClone(items)],
      };
      return api;
    },

    addPhotos(items) {
      pack = {
        ...pack,
        photos: [...ensureArray(pack.photos), ...deepClone(items)],
      };
      return api;
    },

    addMarkups(items) {
      pack = {
        ...pack,
        markups: [...ensureArray(pack.markups), ...deepClone(items)],
      };
      return api;
    },

    upsertSystem(system) {
      pack = { ...pack, systems: upsertById(pack.systems, deepClone(system)) };
      return api;
    },

    upsertFault(fault) {
      pack = { ...pack, faults: upsertById(pack.faults, deepClone(fault)) };
      return api;
    },

    upsertPart(part) {
      pack = {
        ...pack,
        parts: upsertById(ensureArray(pack.parts), deepClone(part)),
      };
      return api;
    },

    upsertReplacement(replacement) {
      pack = {
        ...pack,
        replacements: upsertById(
          ensureArray(pack.replacements),
          deepClone(replacement)
        ),
      };
      return api;
    },

    upsertCompliance(record) {
      pack = {
        ...pack,
        compliance: upsertById(ensureArray(pack.compliance), deepClone(record)),
      };
      return api;
    },

    upsertPhoto(photo) {
      pack = {
        ...pack,
        photos: upsertById(ensureArray(pack.photos), deepClone(photo)),
      };
      return api;
    },

    upsertMarkup(markup) {
      pack = {
        ...pack,
        markups: upsertById(ensureArray(pack.markups), deepClone(markup)),
      };
      return api;
    },

    removeSystem(id) {
      pack = { ...pack, systems: removeById(pack.systems, id) };
      return api;
    },

    removeFault(id) {
      pack = { ...pack, faults: removeById(pack.faults, id) };
      return api;
    },

    removePart(id) {
      pack = { ...pack, parts: removeById(ensureArray(pack.parts), id) };
      return api;
    },

    removeReplacement(id) {
      pack = {
        ...pack,
        replacements: removeById(ensureArray(pack.replacements), id),
      };
      return api;
    },

    removeCompliance(id) {
      pack = {
        ...pack,
        compliance: removeById(ensureArray(pack.compliance), id),
      };
      return api;
    },

    removePhoto(id) {
      pack = {
        ...pack,
        photos: removeById(ensureArray(pack.photos), id),
      };
      return api;
    },

    removeMarkup(id) {
      pack = {
        ...pack,
        markups: removeById(ensureArray(pack.markups), id),
      };
      return api;
    },
  };

  return api;
}