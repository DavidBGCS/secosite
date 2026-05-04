// src/core/assets/serviceTicks.ts

import type { ID, ISODateString } from "../types/base";
import type { AssetRecord, AssetServiceTick } from "../types/asset";
import type { SiteFile } from "../types/siteFile";

export type TickAssetForServiceOptions = {
  testedAt?: ISODateString;
  visitId?: ID;
  jobRef?: string;
  testedBy?: string;
  lockAfterTick?: boolean;
};

export type UntickAssetForServiceOptions = {
  force?: boolean;
};

function nowIso(): ISODateString {
  return new Date().toISOString();
}

function findAssetOrThrow(siteFile: SiteFile, assetId: ID): AssetRecord {
  const asset = siteFile.assets.find((item) => item.id === assetId);
  if (!asset) {
    throw new Error(`Asset "${assetId}" not found.`);
  }
  return asset;
}

function findColumnOrThrow(siteFile: SiteFile, columnKey: string) {
  const column = siteFile.serviceLayout.columns.find((item) => item.key === columnKey);
  if (!column) {
    throw new Error(`Service column "${columnKey}" not found.`);
  }
  return column;
}

function getOrCreateServiceTick(
  asset: AssetRecord,
  columnKey: string,
  serviceDate?: ISODateString
): AssetServiceTick {
  const existing = asset.serviceTicks.find((tick) => tick.columnKey === columnKey);
  if (existing) {
    if (!existing.serviceDate && serviceDate) {
      existing.serviceDate = serviceDate;
    }
    return existing;
  }

  const created: AssetServiceTick = {
    columnKey,
    ticked: false,
    serviceDate,
  };

  asset.serviceTicks.push(created);
  return created;
}

function ensureServiceTicksArray(asset: AssetRecord) {
  if (!Array.isArray(asset.serviceTicks)) {
    asset.serviceTicks = [];
  }
}

export function tickAssetForService(
  siteFile: SiteFile,
  assetId: ID,
  columnKey: string,
  options: TickAssetForServiceOptions = {}
): AssetServiceTick {
  const asset = findAssetOrThrow(siteFile, assetId);
  const column = findColumnOrThrow(siteFile, columnKey);

  ensureServiceTicksArray(asset);

  const tick = getOrCreateServiceTick(asset, columnKey, column.serviceDate);

  if (tick.locked) {
    throw new Error(
      `Service entry for ${asset.reference} in ${column.label} is locked and cannot be changed.`
    );
  }

  const testedAt = options.testedAt ?? nowIso();

  tick.ticked = true;
  tick.serviceDate = column.serviceDate ?? tick.serviceDate;
  tick.testedAt = testedAt;
  tick.visitId = options.visitId ?? tick.visitId;
  tick.jobRef = options.jobRef ?? tick.jobRef;
  tick.testedBy = options.testedBy ?? tick.testedBy;

  if (options.lockAfterTick) {
    tick.locked = true;
    tick.lockedAt = nowIso();
  }

  asset.updatedAt = nowIso();
  siteFile.metadata.updatedAt = nowIso();

  return tick;
}

export function untickAssetForService(
  siteFile: SiteFile,
  assetId: ID,
  columnKey: string,
  options: UntickAssetForServiceOptions = {}
): AssetServiceTick {
  const asset = findAssetOrThrow(siteFile, assetId);
  const column = findColumnOrThrow(siteFile, columnKey);

  ensureServiceTicksArray(asset);

  const tick = getOrCreateServiceTick(asset, columnKey, column.serviceDate);

  if (tick.locked && !options.force) {
    throw new Error(
      `Service entry for ${asset.reference} in ${column.label} is locked and cannot be unticked.`
    );
  }

  tick.ticked = false;
  tick.testedAt = undefined;
  tick.visitId = undefined;
  tick.jobRef = undefined;
  tick.testedBy = undefined;

  asset.updatedAt = nowIso();
  siteFile.metadata.updatedAt = nowIso();

  return tick;
}

export function lockAssetServiceTick(
  siteFile: SiteFile,
  assetId: ID,
  columnKey: string
): AssetServiceTick {
  const asset = findAssetOrThrow(siteFile, assetId);
  const column = findColumnOrThrow(siteFile, columnKey);

  ensureServiceTicksArray(asset);

  const tick = getOrCreateServiceTick(asset, columnKey, column.serviceDate);

  tick.locked = true;
  tick.lockedAt = nowIso();

  asset.updatedAt = nowIso();
  siteFile.metadata.updatedAt = nowIso();

  return tick;
}

export function unlockAssetServiceTick(
  siteFile: SiteFile,
  assetId: ID,
  columnKey: string
): AssetServiceTick {
  const asset = findAssetOrThrow(siteFile, assetId);
  const column = findColumnOrThrow(siteFile, columnKey);

  ensureServiceTicksArray(asset);

  const tick = getOrCreateServiceTick(asset, columnKey, column.serviceDate);

  tick.locked = false;
  tick.lockedAt = undefined;

  asset.updatedAt = nowIso();
  siteFile.metadata.updatedAt = nowIso();

  return tick;
}