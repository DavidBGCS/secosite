// src/core/types/fault.ts

import type {
  EntityBase,
  ID,
  PassFailNA,
  SeverityLevel,
  YesNoUnknown,
} from "./base";

export type FaultStatus =
  | "open"
  | "in-progress"
  | "awaiting-parts"
  | "monitor"
  | "resolved"
  | "closed"
  | "deferred"
  | "not-a-fault";

export type FaultCategory =
  | "alarm"
  | "fault"
  | "warning"
  | "disablement"
  | "damage"
  | "commissioning"
  | "programming"
  | "configuration"
  | "network"
  | "power"
  | "battery"
  | "device"
  | "cabling"
  | "containment"
  | "signal-loss"
  | "environmental"
  | "compliance"
  | "maintenance"
  | "other";

export type FaultSource =
  | "engineer-observed"
  | "panel-indication"
  | "client-reported"
  | "monitoring-centre"
  | "test-result"
  | "commissioning"
  | "remote-diagnostics"
  | "other";

export type FaultPriority =
  | "p4"
  | "p3"
  | "p2"
  | "p1"
  | "critical";

export type FaultImpact =
  | "none"
  | "minor"
  | "moderate"
  | "major"
  | "critical"
  | "unknown";

export type FaultVerificationStatus =
  | "unverified"
  | "observed"
  | "tested"
  | "confirmed"
  | "could-not-reproduce";

export type RootCauseType =
  | "device-failure"
  | "cable-fault"
  | "power-loss"
  | "battery-fault"
  | "network-issue"
  | "configuration-error"
  | "programming-error"
  | "installer-error"
  | "mechanical-damage"
  | "water-ingress"
  | "contamination"
  | "environmental"
  | "third-party-interface"
  | "unknown"
  | "other";

export type RemedialActionStatus =
  | "recommended"
  | "approved"
  | "scheduled"
  | "in-progress"
  | "completed"
  | "not-required"
  | "declined";

export type FaultLocation = {
  buildingId?: ID;
  areaId?: ID;
  level?: string;
  room?: string;
  locationText?: string;
};

export type FaultEffect = {
  affectedZones?: string[];
  affectedLoops?: string[];
  affectedCircuits?: string[];
  affectedDoors?: string[];
  affectedCameras?: string[];
  affectedAreas?: string[];
  partialSystemLoss?: YesNoUnknown;
  fullSystemLoss?: YesNoUnknown;
  monitoringImpacted?: YesNoUnknown;
  causeAndEffectImpacted?: YesNoUnknown;
  complianceImpact?: PassFailNA;
};

export type FaultRootCause = {
  type?: RootCauseType;
  summary?: string;
  detail?: string;
  confirmed?: YesNoUnknown;
};

export type FaultSymptom = {
  summary: string;
  code?: string;
  panelText?: string;
  observedBehaviour?: string;
};

export type FaultTestResult = {
  testName: string;
  result?: PassFailNA;
  measuredValue?: string;
  expectedValue?: string;
  notes?: string;
};

export type RemedialAction = EntityBase & {
  id: ID;
  faultId: ID;
  title: string;
  status?: RemedialActionStatus;
  priority?: FaultPriority;
  description?: string;

  requiresParts?: YesNoUnknown;
  partIds?: ID[];
  replacementIds?: ID[];

  labourEstimateHours?: number;
  targetDate?: string;
  completedAt?: string;
  completedBy?: string;

  outcome?: string;
  verificationNotes?: string;
};

export type FaultRecord = EntityBase & {
  id: ID;
  siteId?: ID;
  systemId?: ID;
  subsystemId?: ID;
  deviceId?: ID;
  circuitId?: ID;
  zoneId?: ID;

  title: string;
  category?: FaultCategory;
  source?: FaultSource;
  status?: FaultStatus;

  severity?: SeverityLevel;
  priority?: FaultPriority;
  impact?: FaultImpact;

  verificationStatus?: FaultVerificationStatus;
  location?: FaultLocation;

  symptom?: FaultSymptom;
  rootCause?: FaultRootCause;
  effect?: FaultEffect;

  firstObservedAt?: string;
  lastObservedAt?: string;
  resolvedAt?: string;

  clientVisible?: YesNoUnknown;
  engineerActionRequired?: YesNoUnknown;
  monitoringReported?: YesNoUnknown;
  falseAlarmRisk?: YesNoUnknown;
  repeatIssue?: YesNoUnknown;

  photoIds?: ID[];
  markupIds?: ID[];
  partIds?: ID[];
  replacementIds?: ID[];

  recommendedActions?: RemedialAction[];
  testResults?: FaultTestResult[];

  panelReference?: string;
  eventReference?: string;
  standardRefs?: string[];
};

export type FaultSummary = Pick<
  FaultRecord,
  | "id"
  | "siteId"
  | "systemId"
  | "deviceId"
  | "title"
  | "category"
  | "status"
  | "severity"
  | "priority"
  | "impact"
  | "firstObservedAt"
>;

export type FaultLookup = {
  faultId: ID;
  title?: string;
  systemId?: ID;
  deviceId?: ID;
  status?: FaultStatus;
};