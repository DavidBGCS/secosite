// src/core/types/disciplineProfile.ts

import type { AuditFields, EntityBase, ID } from "./base";
import type { ServiceCycleType } from "./siteFile";

export type DisciplineType =
  | "fire-alarm"
  | "emergency-lighting"
  | "intruder-alarm"
  | "cctv"
  | "access-control"
  | "other";

export type DisciplineProfile = EntityBase &
  AuditFields & {
    id: ID;
    siteId: ID;

    discipline: DisciplineType;
    systemId?: ID;

    panelMake?: string;
    panelModel?: string;
    systemType?: string;
    zonesLoopsSummary?: string;
    maintainedBy?: string;

    serviceInterval: ServiceCycleType;
    visitsPerYear: number;

    notes?: string;
  };