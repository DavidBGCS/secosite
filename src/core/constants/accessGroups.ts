export const ACCESS_GROUP_OPTIONS = [
  "normal",
  "ceiling_void",
  "attic",
  "plant_room",
  "roof",
  "external",
  "atex",
  "high_level",
  "confined_space",
  "other",
] as const;

export type AccessGroup = (typeof ACCESS_GROUP_OPTIONS)[number];

export const ACCESS_GROUP_LABELS: Record<AccessGroup, string> = {
  normal: "Normal access",
  ceiling_void: "Ceiling void",
  attic: "Attic",
  plant_room: "Plant room",
  roof: "Roof",
  external: "External",
  atex: "ATEX area",
  high_level: "High level access",
  confined_space: "Confined space",
  other: "Other",
};