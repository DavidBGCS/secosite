// src/core/types/markup.ts

import type {
  EntityBase,
  ID,
  Point2D,
  Rect,
  SeverityLevel,
  YesNoUnknown,
} from "./base";

export type MarkupShapeType =
  | "arrow"
  | "line"
  | "rectangle"
  | "circle"
  | "ellipse"
  | "polygon"
  | "text"
  | "label"
  | "highlight"
  | "measurement"
  | "freehand"
  | "other";

export type MarkupColour =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "white"
  | "black";

export type MarkupSubjectType =
  | "device"
  | "fault"
  | "replacement"
  | "cable"
  | "zone"
  | "panel"
  | "component"
  | "location"
  | "other";

export type MarkupText = {
  text?: string;
  fontSize?: number;
  bold?: YesNoUnknown;
};

export type MarkupStyle = {
  colour?: MarkupColour;
  strokeWidth?: number;
  fillOpacity?: number;
  dashed?: YesNoUnknown;
};

export type MarkupGeometry = {
  point?: Point2D;
  start?: Point2D;
  end?: Point2D;
  rect?: Rect;
  radius?: number;
  points?: Point2D[];
};

export type MarkupLinkRefs = {
  photoId?: ID;
  systemId?: ID;
  deviceId?: ID;
  faultId?: ID;
  replacementId?: ID;
  complianceId?: ID;
};

export type MarkupMeasurement = {
  label?: string;
  value?: number;
  unit?: string;
};

export type MarkupRecord = EntityBase & {
  id: ID;

  shape: MarkupShapeType;

  geometry?: MarkupGeometry;
  style?: MarkupStyle;
  text?: MarkupText;

  subjectType?: MarkupSubjectType;
  subjectId?: ID;

  severity?: SeverityLevel;

  measurement?: MarkupMeasurement;

  refs?: MarkupLinkRefs;

  visible?: YesNoUnknown;
  locked?: YesNoUnknown;
};

export type MarkupSummary = Pick<
  MarkupRecord,
  | "id"
  | "shape"
  | "subjectType"
  | "subjectId"
> & {
  photoId?: ID;
  faultId?: ID;
  deviceId?: ID;
};

export type MarkupLookup = {
  markupId: ID;
  shape?: MarkupShapeType;
  subjectType?: MarkupSubjectType;
  subjectId?: ID;
  photoId?: ID;
};