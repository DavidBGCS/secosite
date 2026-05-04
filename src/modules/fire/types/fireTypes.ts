import type { BaseEntity, ISODateString } from "../../../core/types/base";
import type {
  ComplianceDoc,
  SystemFault,
  SystemModule,
  SystemPartUsed,
  SystemReplacement,
  SystemVisit,
} from "../../../core/types/system";

export type FireSystem = SystemModule & {
  systemType: "fire";
  panelMake?: string;
  panelModel?: string;
  systemArchitecture: "addressable" | "conventional";
  loopCount?: number;
  zoneCount?: number;
};

export type FireDeviceType =
  | "optical_detector"
  | "heat_detector"
  | "multi_detector"
  | "beam_detector"
  | "aspirating_point"
  | "mcp"
  | "sounder"
  | "sounder_base"
  | "input_module"
  | "output_module"
  | "interface"
  | "panel"
  | "psu"
  | "other";

export type AccessGroup =
  | "normal"
  | "ceiling_void"
  | "attic"
  | "plant_room"
  | "roof"
  | "external"
  | "atex"
  | "high_level"
  | "confined_space"
  | "other";

export type SpecialAreaType =
  | "none"
  | "atex_zone_1"
  | "atex_zone_2"
  | "atex_dust_zone_21"
  | "atex_dust_zone_22"
  | "permit_required"
  | "high_level_access"
  | "confined_space"
  | "escorted_access"
  | "restricted_hours"
  | "other";

export type FireAsset = BaseEntity & {
  siteId: string;
  systemId: string;
  systemType: "fire";

  loopNo?: number;
  zoneNo?: number;
  addressNo?: number;
  displayAddress: string;

  deviceType: FireDeviceType;
  location: string;
  description?: string;
  notes?: string;

  countsTowardDetectorCoverage: boolean;

  accessGroup: AccessGroup;
  specialAreaType: SpecialAreaType;

  qrCode?: string;

  isActive: boolean;
  dateAdded?: ISODateString;
  dateRemoved?: ISODateString;
};

export type FireVisitType =
  | "quarterly_service"
  | "service_call"
  | "void_access_visit"
  | "atex_access_visit"
  | "full_system_test"
  | "other";

export type FireVisitFocus =
  | "standard_rotation"
  | "void_attic_access"
  | "atex_area_access"
  | "high_level_access"
  | "full_system_coverage";

export type FireQuarter = "Q1" | "Q2" | "Q3" | "Q4";

export type FireVisit = SystemVisit & {
  systemType: "fire";
  visitType: FireVisitType;
  quarter?: FireQuarter;
  visitFocus?: FireVisitFocus;
  accessibleAreas?: AccessGroup[];
};

export type FireTestResult = "pass" | "attention" | "fail";

export type FireTest = BaseEntity & {
  siteId: string;
  systemId: string;
  systemType: "fire";

  visitId: string;
  assetId: string;

  quarter?: FireQuarter;
  testDate: ISODateString;

  tested: boolean;
  result: FireTestResult;

  note?: string;
  actionTaken?: string;

  engineerName: string;
  jobNumber?: string;
};

export type FireFault = SystemFault & {
  systemType: "fire";
};

export type FirePartUsed = SystemPartUsed & {
  systemType: "fire";
};

export type FireReplacement = SystemReplacement & {
  systemType: "fire";
};

export type FireComplianceDocType =
  | "das8"
  | "das9"
  | "service_report"
  | "other";

export type FireComplianceDoc = ComplianceDoc & {
  systemType: "fire";
  docType: FireComplianceDocType;
};