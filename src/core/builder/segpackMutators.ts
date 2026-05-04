// src/core/builder/segpackMutators.ts

import type { Segpack } from "../types/segpack";
import type { FaultRecord } from "../types/fault";
import type { PhotoRecord } from "../types/photo";
import type { MarkupRecord } from "../types/markup";
import type { ReplacementRecord } from "../types/replacement";
import type { ComplianceRecord } from "../types/compliance";
import type { PartRecord } from "../types/part";
import type { InstalledSystem } from "../types/system";

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  return Array.from(
    new Set(
      values.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    )
  );
}

function updateById<T extends { id: string }>(
  items: T[] | undefined,
  id: string,
  updater: (item: T) => T
): T[] {
  const list = Array.isArray(items) ? items : [];
  return list.map((item) => (item.id === id ? updater(item) : item));
}

function findById<T extends { id: string }>(
  items: T[] | undefined,
  id: string
): T | undefined {
  return Array.isArray(items) ? items.find((item) => item.id === id) : undefined;
}

function ensureFault(pack: Segpack, faultId: string): FaultRecord {
  const fault = findById(pack.faults, faultId);
  if (!fault) {
    throw new Error(`Fault "${faultId}" not found.`);
  }
  return fault;
}

function ensurePhoto(pack: Segpack, photoId: string): PhotoRecord {
  const photo = findById(pack.photos, photoId);
  if (!photo) {
    throw new Error(`Photo "${photoId}" not found.`);
  }
  return photo;
}

function ensureMarkup(pack: Segpack, markupId: string): MarkupRecord {
  const markup = findById(pack.markups, markupId);
  if (!markup) {
    throw new Error(`Markup "${markupId}" not found.`);
  }
  return markup;
}

function ensureReplacement(pack: Segpack, replacementId: string): ReplacementRecord {
  const replacement = findById(pack.replacements, replacementId);
  if (!replacement) {
    throw new Error(`Replacement "${replacementId}" not found.`);
  }
  return replacement;
}

function ensureCompliance(pack: Segpack, complianceId: string): ComplianceRecord {
  const compliance = findById(pack.compliance, complianceId);
  if (!compliance) {
    throw new Error(`Compliance record "${complianceId}" not found.`);
  }
  return compliance;
}

function ensurePart(pack: Segpack, partId: string): PartRecord {
  const part = findById(pack.parts, partId);
  if (!part) {
    throw new Error(`Part "${partId}" not found.`);
  }
  return part;
}

function ensureSystem(pack: Segpack, systemId: string): InstalledSystem {
  const system = findById(pack.systems, systemId);
  if (!system) {
    throw new Error(`System "${systemId}" not found.`);
  }
  return system;
}

export function attachPhotoToFault(
  pack: Segpack,
  faultId: string,
  photoId: string
): Segpack {
  ensureFault(pack, faultId);
  ensurePhoto(pack, photoId);

  const next = deepClone(pack);

  next.faults = updateById(next.faults, faultId, (fault) => ({
    ...fault,
    photoIds: uniqueStrings([...(fault.photoIds ?? []), photoId]),
  }));

  next.photos = updateById(next.photos, photoId, (photo) => ({
    ...photo,
    refs: {
      ...(photo.refs ?? {}),
      faultId,
      systemId: photo.refs?.systemId ?? findById(next.faults, faultId)?.systemId,
      deviceId: photo.refs?.deviceId ?? findById(next.faults, faultId)?.deviceId,
    },
  }));

  return next;
}

export function attachMarkupToFault(
  pack: Segpack,
  faultId: string,
  markupId: string
): Segpack {
  ensureFault(pack, faultId);
  ensureMarkup(pack, markupId);

  const next = deepClone(pack);

  next.faults = updateById(next.faults, faultId, (fault) => ({
    ...fault,
    markupIds: uniqueStrings([...(fault.markupIds ?? []), markupId]),
  }));

  next.markups = updateById(next.markups, markupId, (markup) => ({
    ...markup,
    refs: {
      ...(markup.refs ?? {}),
      faultId,
      systemId: markup.refs?.systemId ?? findById(next.faults, faultId)?.systemId,
      deviceId: markup.refs?.deviceId ?? findById(next.faults, faultId)?.deviceId,
    },
    subjectType: markup.subjectType ?? "fault",
    subjectId: markup.subjectId ?? faultId,
  }));

  return next;
}

export function attachMarkupToPhoto(
  pack: Segpack,
  photoId: string,
  markupId: string
): Segpack {
  ensurePhoto(pack, photoId);
  ensureMarkup(pack, markupId);

  const next = deepClone(pack);

  next.photos = updateById(next.photos, photoId, (photo) => ({
    ...photo,
    refs: {
      ...(photo.refs ?? {}),
      markupIds: uniqueStrings([...(photo.refs?.markupIds ?? []), markupId]),
    },
  }));

  next.markups = updateById(next.markups, markupId, (markup) => ({
    ...markup,
    refs: {
      ...(markup.refs ?? {}),
      photoId,
      systemId: markup.refs?.systemId ?? findById(next.photos, photoId)?.refs?.systemId,
      deviceId: markup.refs?.deviceId ?? findById(next.photos, photoId)?.refs?.deviceId,
      faultId: markup.refs?.faultId ?? findById(next.photos, photoId)?.refs?.faultId,
      replacementId:
        markup.refs?.replacementId ?? findById(next.photos, photoId)?.refs?.replacementId,
      complianceId:
        markup.refs?.complianceId ?? findById(next.photos, photoId)?.refs?.complianceId,
    },
  }));

  return next;
}

export function attachPartToFault(
  pack: Segpack,
  faultId: string,
  partId: string
): Segpack {
  ensureFault(pack, faultId);
  ensurePart(pack, partId);

  const next = deepClone(pack);

  next.faults = updateById(next.faults, faultId, (fault) => ({
    ...fault,
    partIds: uniqueStrings([...(fault.partIds ?? []), partId]),
  }));

  return next;
}

export function attachReplacementToFault(
  pack: Segpack,
  faultId: string,
  replacementId: string
): Segpack {
  ensureFault(pack, faultId);
  ensureReplacement(pack, replacementId);

  const next = deepClone(pack);

  next.faults = updateById(next.faults, faultId, (fault) => ({
    ...fault,
    replacementIds: uniqueStrings([...(fault.replacementIds ?? []), replacementId]),
  }));

  next.replacements = updateById(next.replacements, replacementId, (replacement) => ({
    ...replacement,
    faultId,
    systemId: replacement.systemId ?? findById(next.faults, faultId)?.systemId,
    deviceId: replacement.deviceId ?? findById(next.faults, faultId)?.deviceId,
    circuitId: replacement.circuitId ?? findById(next.faults, faultId)?.circuitId,
    zoneId: replacement.zoneId ?? findById(next.faults, faultId)?.zoneId,
  }));

  return next;
}

export function attachPhotoToReplacement(
  pack: Segpack,
  replacementId: string,
  photoId: string
): Segpack {
  ensureReplacement(pack, replacementId);
  ensurePhoto(pack, photoId);

  const replacement = findById(pack.replacements, replacementId)!;
  const next = deepClone(pack);

  next.photos = updateById(next.photos, photoId, (photo) => ({
    ...photo,
    refs: {
      ...(photo.refs ?? {}),
      replacementId,
      faultId: photo.refs?.faultId ?? replacement.faultId,
      systemId: photo.refs?.systemId ?? replacement.systemId,
      deviceId: photo.refs?.deviceId ?? replacement.deviceId,
    },
  }));

  return next;
}

export function linkComplianceToSystem(
  pack: Segpack,
  complianceId: string,
  systemId: string
): Segpack {
  ensureCompliance(pack, complianceId);
  ensureSystem(pack, systemId);

  const next = deepClone(pack);

  next.compliance = updateById(next.compliance, complianceId, (record) => ({
    ...record,
    subject: {
      ...(record.subject ?? { scope: "system" }),
      scope: "system",
      systemId,
    },
  }));

  return next;
}

export function linkComplianceToDevice(
  pack: Segpack,
  complianceId: string,
  systemId: string,
  deviceId: string
): Segpack {
  ensureCompliance(pack, complianceId);
  ensureSystem(pack, systemId);

  const system = findById(pack.systems, systemId);
  const device = system?.devices?.find((item) => item.id === deviceId);

  if (!device) {
    throw new Error(`Device "${deviceId}" not found in system "${systemId}".`);
  }

  const next = deepClone(pack);

  next.compliance = updateById(next.compliance, complianceId, (record) => ({
    ...record,
    subject: {
      ...(record.subject ?? { scope: "device" }),
      scope: "device",
      systemId,
      deviceId,
    },
  }));

  return next;
}

export function linkComplianceToFault(
  pack: Segpack,
  complianceId: string,
  faultId: string
): Segpack {
  ensureCompliance(pack, complianceId);
  const fault = ensureFault(pack, faultId);

  const next = deepClone(pack);

  next.compliance = updateById(next.compliance, complianceId, (record) => ({
    ...record,
    subject: {
      ...(record.subject ?? { scope: "fault" }),
      scope: "fault",
      systemId: fault.systemId,
      deviceId: fault.deviceId,
      circuitId: fault.circuitId,
      zoneId: fault.zoneId,
      faultId,
    },
    faultIds: uniqueStrings([...(record.faultIds ?? []), faultId]),
  }));

  return next;
}

export function attachPhotoToCompliance(
  pack: Segpack,
  complianceId: string,
  photoId: string
): Segpack {
  ensureCompliance(pack, complianceId);
  ensurePhoto(pack, photoId);

  const compliance = findById(pack.compliance, complianceId)!;
  const next = deepClone(pack);

  next.compliance = updateById(next.compliance, complianceId, (record) => ({
    ...record,
    photoIds: uniqueStrings([...(record.photoIds ?? []), photoId]),
  }));

  next.photos = updateById(next.photos, photoId, (photo) => ({
    ...photo,
    refs: {
      ...(photo.refs ?? {}),
      complianceId,
      systemId: photo.refs?.systemId ?? compliance.subject?.systemId,
      deviceId: photo.refs?.deviceId ?? compliance.subject?.deviceId,
      faultId: photo.refs?.faultId ?? compliance.subject?.faultId,
    },
  }));

  return next;
}

export function attachMarkupToCompliance(
  pack: Segpack,
  complianceId: string,
  markupId: string
): Segpack {
  ensureCompliance(pack, complianceId);
  ensureMarkup(pack, markupId);

  const compliance = findById(pack.compliance, complianceId)!;
  const next = deepClone(pack);

  next.compliance = updateById(next.compliance, complianceId, (record) => ({
    ...record,
    markupIds: uniqueStrings([...(record.markupIds ?? []), markupId]),
  }));

  next.markups = updateById(next.markups, markupId, (markup) => ({
    ...markup,
    refs: {
      ...(markup.refs ?? {}),
      complianceId,
      systemId: markup.refs?.systemId ?? compliance.subject?.systemId,
      deviceId: markup.refs?.deviceId ?? compliance.subject?.deviceId,
      faultId: markup.refs?.faultId ?? compliance.subject?.faultId,
    },
    subjectType: markup.subjectType ?? "other",
    subjectId: markup.subjectId ?? complianceId,
  }));

  return next;
}