// src/core/types/asset.ts

import type {
  AuditFields,
  EntityBase,
  ID,
  ISODateString,
  YesNoUnknown,
} from "./base";

export type AssetSource = "manual" | "panel-import" | "csv-import" | "other";

export type AssetCategory =
  | "detector"
  | "heat-detector"
  | "optical-detector"
  | "multisensor"
  | "beam"
  | "aspirating"
  | "mcp"
  | "sounder"
  | "sounder-beacon"
  | "interface"
  | "io"
  | "psu"
  | "panel"
  | "repeater"
  | "void"
  | "attic"
  | "atex"
  | "other";

/**
 * Represents a service/test entry for an asset within a given service column (Q1, Q2, etc)
 */
export type AssetServiceTick = {
  columnKey: string; // q1, q2, q3, q4, h1, h2

  // core state
  ticked: boolean;

  // planned vs actual
  serviceDate?: ISODateString; // planned (from column)
  testedAt?: ISODateString;    // actual timestamp when tested

  // linkage to visit/report
  visitId?: ID;
  jobRef?: string;

  // audit
  testedBy?: string;

  // locking (prevents accidental edits after completion)
  locked?: boolean;
  lockedAt?: ISODateString;
};

export type AssetRecord = EntityBase &
  AuditFields & {
    id: ID;
    siteId: ID;
    systemId?: ID;

    discipline:
      | "fire-alarm"
      | "emergency-lighting"
      | "intruder-alarm"
      | "cctv"
      | "access-control"
      | "other";

    // identification
    reference: string; // e.g. L1-A11
    loop?: string;
    address?: string;
    zone?: string;

    // classification
    assetType: string; // e.g. Optical Detector
    category: AssetCategory;

    // details
    description?: string;
    locationText?: string;

    // flexible tagging (void, attic, atex, etc)
    tags: string[];

    // import/source tracking
    source: AssetSource;
    sourceFileName?: string;

    // lifecycle
    active: boolean;
    serviceTrackable: boolean;
    countsTowardAutoDetectionPercentage: boolean;

    // service tracking
    serviceTicks: AssetServiceTick[];

    // removal tracking
    removed?: YesNoUnknown;
    removedAt?: ISODateString;
  };