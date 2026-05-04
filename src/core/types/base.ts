// src/core/types/base.ts

export type ID = string;
export type ISODateString = string;
export type URLString = string;
export type MimeTypeString = string;

export type Nullable<T> = T | null;
export type Maybe<T> = T | undefined;
export type ValueOf<T> = T[keyof T];

export type Point2D = {
  x: number;
  y: number;
};

export type Size2D = {
  width: number;
  height: number;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Coordinates = {
  lat: number;
  lng: number;
};

export type PostalAddress = {
  line1?: string;
  line2?: string;
  line3?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
};

export type ContactInfo = {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
};

export type AuditFields = {
  createdAt?: ISODateString;
  createdBy?: string;
  updatedAt?: ISODateString;
  updatedBy?: string;
};

export type NamedEntity = {
  id: ID;
  name?: string;
};

export type DescribedEntity = {
  description?: string;
  notes?: string;
};

export type TaggedEntity = {
  tags?: string[];
};

export type StatusEntity<TStatus extends string = string> = {
  status?: TStatus;
};

export type NumberRange = {
  min?: number;
  max?: number;
};

export type KeyValueMeta = Record<string, string | number | boolean | null>;

export type WithMeta = {
  meta?: KeyValueMeta;
};

export type FilePointer = {
  fileName?: string;
  uri?: URLString;
  mimeType?: MimeTypeString;
  sizeBytes?: number;
  checksum?: string;
};

export type ExternalReference = {
  system?: string;
  ref?: string;
  label?: string;
};

export type SoftDelete = {
  deleted?: boolean;
  deletedAt?: ISODateString;
  deletedBy?: string;
};

export type SortDirection = "asc" | "desc";

export type SeverityLevel =
  | "unknown"
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type YesNoUnknown = "yes" | "no" | "unknown";

export type PassFailNA = "pass" | "fail" | "na" | "unknown";

export type LifecycleState =
  | "draft"
  | "active"
  | "archived"
  | "deleted";

export type EntityBase = NamedEntity &
  AuditFields &
  DescribedEntity &
  TaggedEntity &
  WithMeta;

export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;