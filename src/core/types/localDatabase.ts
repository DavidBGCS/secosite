// src/core/types/localDatabase.ts

import type { ID, ISODateString } from "./base";
import type { SiteFile } from "./siteFile";

export type LocalDatabaseMetadata = {
  databaseId: ID;
  schemaVersion: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  createdBy?: string;
  updatedBy?: string;
  appName?: string;
  appVersion?: string;
  notes?: string;
};

export type LocalDatabaseSettings = {
  defaultEngineerName?: string;
  defaultCompanyName?: string;
  defaultDiscipline?:
    | "fire-alarm"
    | "emergency-lighting"
    | "intruder-alarm"
    | "cctv"
    | "access-control"
    | "other";

  autoCompressPhotos?: boolean;
  maxPhotosPerVisit?: number;
  maxPhotoLongestEdgePx?: number;

  dateFormat?: "dd/mm/yy" | "dd/mm/yyyy" | "yyyy-mm-dd";
  localBackupReminderEnabled?: boolean;
};

export type ImportExportRecordType =
  | "import-site"
  | "export-site"
  | "import-backup"
  | "export-backup";

export type ImportExportRecord = {
  id: ID;
  type: ImportExportRecordType;
  occurredAt: ISODateString;
  performedBy?: string;

  fileName?: string;
  siteFileId?: ID;
  siteId?: ID;

  success?: boolean;
  notes?: string;
};

export type LocalDatabase = {
  metadata: LocalDatabaseMetadata;
  settings: LocalDatabaseSettings;
  sites: SiteFile[];
  importExportHistory: ImportExportRecord[];
};