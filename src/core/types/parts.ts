export type PartDiscipline =
  | "fire-alarm"
  | "intruder-alarm"
  | "cctv"
  | "access-control"
  | "emergency-lighting"
  | "other";

export type PartActionType =
  | "add"
  | "replace"
  | "remove"
  | "temporary-add"
  | "return";

export type PartSourceType =
  | "van-stock"
  | "site-stock"
  | "supplier"
  | "other";

export type PartCatalogueSource =
  | "secostock"
  | "manual";

export type InstalledPartStatus =
  | "installed"
  | "temporary"
  | "removed";

export type InstalledPartRecord = {
  id: string;
  siteId: string;

  discipline: PartDiscipline;

  /**
   * Optional reference back to the master SeCoStock catalogue item.
   *
   * Existing/manual records may not have this.
   */
  catalogueItemId?: string;

  /**
   * Indicates whether the part came from the SeCoStock catalogue
   * or was manually entered.
   */
  catalogueSource?: PartCatalogueSource;

  /**
   * Snapshot fields.
   *
   * These are intentionally retained even when catalogueItemId exists,
   * so historical records do not change if the catalogue item is edited
   * in the future.
   */
  title: string;
  manufacturer?: string;
  partCode?: string;
  category?: string;

  quantity: number;

  locationText?: string;

  linkedAssetId?: string;
  linkedAssetReference?: string;

  status: InstalledPartStatus;
  notes?: string;

  createdAt: string;
  updatedAt: string;
  lastActionId?: string;
};

export type PartActionRecord = {
  id: string;
  siteId: string;
  visitId?: string;

  discipline: PartDiscipline;
  actionType: PartActionType;

  engineerName: string;
  engineerUserId?: string;

  /**
   * Optional reference back to the master SeCoStock catalogue item.
   *
   * Existing/manual records may not have this.
   */
  catalogueItemId?: string;

  /**
   * Indicates whether the engineer selected a catalogue item
   * or entered the part manually.
   */
  catalogueSource?: PartCatalogueSource;

  /**
   * Snapshot fields retained for historical accuracy.
   */
  title: string;
  manufacturer?: string;
  partCode?: string;
  category?: string;

  quantity: number;

  locationText?: string;

  linkedAssetId?: string;
  linkedAssetReference?: string;

  sourceType?: PartSourceType;
  note?: string;

  createdAt: string;
};

export const PART_DISCIPLINE_OPTIONS: Array<{
  value: PartDiscipline;
  label: string;
}> = [
  { value: "fire-alarm", label: "Fire Alarm" },
  { value: "intruder-alarm", label: "Intruder" },
  { value: "cctv", label: "CCTV" },
  { value: "access-control", label: "Access Control" },
  { value: "emergency-lighting", label: "Emergency Lighting" },
  { value: "other", label: "Other" },
];

export const PART_ACTION_OPTIONS: Array<{
  value: PartActionType;
  label: string;
}> = [
  { value: "add", label: "Add" },
  { value: "replace", label: "Replace" },
  { value: "remove", label: "Remove" },
  { value: "temporary-add", label: "Temporary Add" },
  { value: "return", label: "Return" },
];

export const PART_SOURCE_OPTIONS: Array<{
  value: PartSourceType;
  label: string;
}> = [
  { value: "van-stock", label: "Van Stock" },
  { value: "site-stock", label: "Site Stock" },
  { value: "supplier", label: "Supplier" },
  { value: "other", label: "Other" },
];

export const PART_CATEGORY_OPTIONS: Record<
  PartDiscipline,
  string[]
> = {
  "fire-alarm": [
    "detector",
    "base",
    "mcp",
    "sounder",
    "sounder-beacon",
    "interface",
    "io",
    "panel-part",
    "psu",
    "cable",
    "other",
  ],

  "intruder-alarm": [
    "pir",
    "contact",
    "shock",
    "keypad",
    "expander",
    "panel-part",
    "bell",
    "psu",
    "signalling",
    "cable",
    "other",
  ],

  cctv: [
    "camera",
    "nvr",
    "switch",
    "psu",
    "injector",
    "storage",
    "networking",
    "mount",
    "housing",
    "cable",
    "other",
  ],

  "access-control": [
    "reader",
    "controller",
    "lock",
    "maglock",
    "exit-button",
    "break-glass",
    "door-contact",
    "psu",
    "cable",
    "other",
  ],

  "emergency-lighting": [
    "fitting",
    "battery",
    "driver",
    "test-key",
    "sign",
    "cable",
    "other",
  ],

  other: ["other"],
};