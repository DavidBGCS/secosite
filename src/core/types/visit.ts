// src/core/types/visit.ts

import type {
  AuditFields,
  EntityBase,
  ID,
  ISODateString,
  YesNoUnknown,
} from "./base";

export type VisitType =
  | "routine-service"
  | "fault-visit"
  | "reactive-callout"
  | "commissioning"
  | "small-works"
  | "inspection"
  | "verification"
  | "other";

export type VisitStatus =
  | "draft"
  | "in-progress"
  | "completed"
  | "abandoned"
  | "exported";

export type SystemStatusAtVisit =
  | "normal"
  | "faulted"
  | "partially-faulted"
  | "disabled"
  | "partially-disabled"
  | "unknown";

export type VisitSignatureInfo = {
  captured?: boolean;
  signedBy?: string;
  signedAt?: ISODateString;
  signatureRef?: string;
};

export type VisitRecord = EntityBase &
  AuditFields & {
    id: ID;
    siteId: ID;

    startedAt: ISODateString;
    completedAt?: ISODateString;

    engineerName: string;
    engineerId?: string;

    visitType: VisitType;
    status?: VisitStatus;

    discipline?:
      | "fire-alarm"
      | "emergency-lighting"
      | "intruder-alarm"
      | "cctv"
      | "access-control"
      | "other";

    systemIds?: ID[];

    systemStatus?: SystemStatusAtVisit;
    workCarriedOut?: string;
    faultsFound?: string;
    actionsTaken?: string;
    devicesPartsReplaced?: string;
    zonesAreasInvolved?: string;
    temporaryDisables?: string;
    outstandingIssues?: string;
    recommendations?: string;

    photoIds: ID[];
    faultIds: ID[];
    complianceIds: ID[];
    replacementIds: ID[];

    serviceColumnKey?: string; // q1, q2, h1, h2 etc.
    signature?: VisitSignatureInfo;

    exportPdfCreated?: YesNoUnknown;
  };