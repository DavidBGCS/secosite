// src/core/types/photo.ts

import type {
  EntityBase,
  ExternalReference,
  FilePointer,
  ID,
  Point2D,
  Rect,
  YesNoUnknown,
} from "./base";

export type PhotoCategory =
  | "overview"
  | "device"
  | "fault"
  | "repair"
  | "replacement"
  | "compliance"
  | "test"
  | "panel"
  | "screen-capture"
  | "label"
  | "cable"
  | "containment"
  | "location"
  | "before"
  | "after"
  | "other";

export type PhotoSource =
  | "camera"
  | "tablet"
  | "phone"
  | "export"
  | "screenshot"
  | "upload"
  | "other";

export type PhotoOrientation =
  | "portrait"
  | "landscape"
  | "square"
  | "unknown";

export type PhotoSubjectType =
  | "site"
  | "building"
  | "area"
  | "system"
  | "device"
  | "fault"
  | "replacement"
  | "compliance"
  | "document"
  | "other";

export type PhotoSubjectRef = {
  subjectType: PhotoSubjectType;
  id?: ID;
  label?: string;
};

export type PhotoGeo = {
  lat?: number;
  lng?: number;
  accuracyM?: number;
};

export type PhotoDimensions = {
  width?: number;
  height?: number;
  orientation?: PhotoOrientation;
};

export type PhotoCaptureInfo = {
  capturedAt?: string;
  capturedBy?: string;
  deviceName?: string;
  source?: PhotoSource;
  geo?: PhotoGeo;
};

export type PhotoLinkRefs = {
  siteId?: ID;
  buildingId?: ID;
  areaId?: ID;
  systemId?: ID;
  deviceId?: ID;
  faultId?: ID;
  replacementId?: ID;
  complianceId?: ID;
  markupIds?: ID[];
};

export type PhotoViewContext = {
  level?: string;
  room?: string;
  locationText?: string;
  viewpoint?: string;
  directionFacing?: string;
};

export type PhotoFocus = {
  point?: Point2D;
  rect?: Rect;
  highlighted?: YesNoUnknown;
};

export type PhotoRecord = EntityBase &
  FilePointer & {
    id: ID;
    title?: string;
    category?: PhotoCategory;

    capture?: PhotoCaptureInfo;
    dimensions?: PhotoDimensions;
    context?: PhotoViewContext;
    focus?: PhotoFocus;

    refs?: PhotoLinkRefs;
    subjects?: PhotoSubjectRef[];
    externalRefs?: ExternalReference[];

    checksumSha256?: string;
    archived?: YesNoUnknown;
    redacted?: YesNoUnknown;
  };

export type PhotoSummary = Pick<
  PhotoRecord,
  | "id"
  | "title"
  | "category"
  | "fileName"
  | "uri"
  | "mimeType"
> & {
  systemId?: ID;
  faultId?: ID;
  deviceId?: ID;
  complianceId?: ID;
};

export type PhotoLookup = {
  photoId: ID;
  title?: string;
  category?: PhotoCategory;
  systemId?: ID;
  faultId?: ID;
  deviceId?: ID;
};