// src/core/types/siteFile.ts

import type { ID, ISODateString } from "./base";
import type { Site } from "./site";
import type { InstalledSystem } from "./system";
import type { FaultRecord } from "./fault";
import type { ComplianceRecord } from "./compliance";
import type { ReplacementRecord } from "./replacement";
import type { PhotoRecord } from "./photo";
import type { MarkupRecord } from "./markup";
import type { VisitRecord } from "./visit";
import type { DisciplineProfile } from "./disciplineProfile";
import type { AssetRecord } from "./asset";
import type { QrIdentity } from "./qr";
import type { InstalledPartRecord, PartActionRecord } from "./parts";

export type SiteFileMetadata = {
  siteFileId: ID;
  schemaVersion: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  createdBy?: string;
  updatedBy?: string;
  fileLabel?: string;
  notes?: string;
};

export type ServiceCycleType =
  | "quarterly"
  | "bi-yearly"
  | "annual"
  | "custom";

export type ServiceColumn = {
  key: string; // q1, q2, h1, h2, annual, custom-1...
  label: string; // Q1, Q2, H1, H2, Annual...
  serviceDate?: ISODateString;
  locked?: boolean;
};

export type ServiceLayout = {
  cycleType: ServiceCycleType;
  columns: ServiceColumn[];
};

export type ExportedReportType = "visit-pdf" | "site-summary-pdf";

export type ExportedReportRecord = {
  id: ID;
  visitId?: ID;
  fileName: string;
  createdAt: ISODateString;
  createdBy?: string;
  reportType: ExportedReportType;
  notes?: string;
};

export type SiteFile = {
  metadata: SiteFileMetadata;

  site: Site;

  systems: InstalledSystem[];
  disciplineProfiles: DisciplineProfile[];

  assets: AssetRecord[];
  serviceLayout: ServiceLayout;

  visits: VisitRecord[];

  openFaults: FaultRecord[];
  closedFaults: FaultRecord[];

  compliance: ComplianceRecord[];
  replacementHistory: ReplacementRecord[];

  photos: PhotoRecord[];
  markups: MarkupRecord[];

  exportedReports: ExportedReportRecord[];

  installedParts: InstalledPartRecord[];
  partActions: PartActionRecord[];

  qrIdentity?: QrIdentity;
};