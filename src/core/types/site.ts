// src/core/types/site.ts

import type {
  AuditFields,
  ContactInfo,
  Coordinates,
  EntityBase,
  ExternalReference,
  ID,
  PostalAddress,
  YesNoUnknown,
} from "./base";

export type SiteType =
  | "commercial"
  | "industrial"
  | "residential"
  | "education"
  | "healthcare"
  | "retail"
  | "mixed-use"
  | "public-sector"
  | "infrastructure"
  | "other";

export type BuildingUse =
  | "office"
  | "warehouse"
  | "apartment"
  | "house"
  | "school"
  | "hospital"
  | "shop"
  | "hotel"
  | "car-park"
  | "plant-room"
  | "mixed"
  | "other";

export type SiteStatus =
  | "active"
  | "inactive"
  | "survey"
  | "maintenance"
  | "decommissioned";

export type SiteAccessInfo = {
  accessHours?: string;
  inductionRequired?: YesNoUnknown;
  permitRequired?: YesNoUnknown;
  ppeRequired?: YesNoUnknown;
  escortRequired?: YesNoUnknown;
  parkingNotes?: string;
  arrivalNotes?: string;
  gateCode?: string;
  keyholderNotes?: string;
};

export type SiteContact = ContactInfo & {
  role?: string;
  primary?: boolean;
};

export type SiteBuilding = EntityBase & {
  name: string;
  buildingRef?: string;
  use?: BuildingUse;
  storeys?: number;
  basementLevels?: number;
  occupancyNotes?: string;
};

export type SiteArea = EntityBase & {
  name: string;
  buildingId?: ID;
  level?: string;
  zone?: string;
  areaRef?: string;
};

export type SiteAssetRef = ExternalReference & {
  assetType?: string;
};

export type Site = EntityBase &
  AuditFields & {
    id: ID;
    name: string;
    siteCode?: string;
    clientName?: string;
    siteType?: SiteType;
    status?: SiteStatus;

    address?: PostalAddress | string;
    coordinates?: Coordinates;

    buildingName?: string;
    campusName?: string;
    buildingUse?: BuildingUse;

    contacts?: SiteContact[];
    access?: SiteAccessInfo;

    buildings?: SiteBuilding[];
    areas?: SiteArea[];

    externalRefs?: SiteAssetRef[];

    serviceNotes?: string;
    hazards?: string[];
    responderInfo?: string;
  };

export type SiteSummary = Pick<
  Site,
  | "id"
  | "name"
  | "siteCode"
  | "clientName"
  | "siteType"
  | "status"
  | "address"
  | "buildingName"
>;

export type SiteLookup = {
  siteId: ID;
  siteName?: string;
  buildingId?: ID;
  buildingName?: string;
  areaId?: ID;
  areaName?: string;
};