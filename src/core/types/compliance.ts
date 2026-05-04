// src/core/types/compliance.ts

import type {
  EntityBase,
  ID,
  PassFailNA,
  SeverityLevel,
  YesNoUnknown,
} from "./base";

export type ComplianceScope =
  | "site"
  | "building"
  | "area"
  | "system"
  | "subsystem"
  | "device"
  | "circuit"
  | "zone"
  | "fault"
  | "replacement"
  | "document"
  | "other";

export type ComplianceStatus =
  | "pass"
  | "fail"
  | "na"
  | "advisory"
  | "observation"
  | "requires-review"
  | "unknown";

export type ComplianceCategory =
  | "design"
  | "installation"
  | "commissioning"
  | "maintenance"
  | "documentation"
  | "labelling"
  | "identification"
  | "testing"
  | "cause-and-effect"
  | "monitoring"
  | "power"
  | "battery"
  | "cabling"
  | "containment"
  | "coverage"
  | "programming"
  | "network"
  | "environmental"
  | "access"
  | "fire-stopping"
  | "other";

export type StandardAuthority =
  | "is"
  | "bs"
  | "en"
  | "iec"
  | "psa"
  | "nsai"
  | "srgd"
  | "manufacturer"
  | "client-spec"
  | "other";

export type ComplianceEvidenceType =
  | "visual-inspection"
  | "functional-test"
  | "measurement"
  | "document-review"
  | "client-confirmation"
  | "photo"
  | "markup"
  | "panel-log"
  | "other";

export type ComplianceRiskLevel =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "critical"
  | "unknown";

export type ComplianceReference = {
  authority?: StandardAuthority;
  standard?: string;
  clause?: string;
  title?: string;
  excerpt?: string;
};

export type ComplianceSubject = {
  scope: ComplianceScope;
  siteId?: ID;
  buildingId?: ID;
  areaId?: ID;
  systemId?: ID;
  subsystemId?: ID;
  deviceId?: ID;
  circuitId?: ID;
  zoneId?: ID;
  faultId?: ID;
  replacementId?: ID;
  documentId?: ID;
  locationText?: string;
};

export type ComplianceEvidence = {
  type?: ComplianceEvidenceType;
  summary?: string;
  value?: string;
  unit?: string;
  result?: PassFailNA;
  photoIds?: ID[];
  markupIds?: ID[];
  documentRefs?: string[];
  capturedAt?: string;
  capturedBy?: string;
};

export type ComplianceRecommendation = {
  action?: string;
  priority?: "p4" | "p3" | "p2" | "p1" | "critical";
  targetDate?: string;
  mandatory?: YesNoUnknown;
};

export type ComplianceRecord = EntityBase & {
  id: ID;
  subject: ComplianceSubject;

  category?: ComplianceCategory;
  status?: ComplianceStatus;
  result?: PassFailNA;
  severity?: SeverityLevel;
  riskLevel?: ComplianceRiskLevel;

  title: string;
  summary?: string;
  finding?: string;
  implication?: string;

  reference?: ComplianceReference;
  additionalRefs?: ComplianceReference[];

  evidence?: ComplianceEvidence[];
  recommendation?: ComplianceRecommendation;

  verified?: YesNoUnknown;
  verifiedAt?: string;
  verifiedBy?: string;

  photoIds?: ID[];
  markupIds?: ID[];
  faultIds?: ID[];

  dueDate?: string;
  closedAt?: string;
  closedBy?: string;
};

export type ComplianceSummary = Pick<
  ComplianceRecord,
  | "id"
  | "title"
  | "category"
  | "status"
  | "result"
  | "severity"
  | "riskLevel"
  | "dueDate"
> & {
  scope?: ComplianceScope;
  systemId?: ID;
  deviceId?: ID;
  faultId?: ID;
};

export type ComplianceLookup = {
  complianceId: ID;
  title?: string;
  scope?: ComplianceScope;
  systemId?: ID;
  deviceId?: ID;
  faultId?: ID;
  status?: ComplianceStatus;
};