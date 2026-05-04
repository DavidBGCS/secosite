// src/core/types/qr.ts

import type { ID, ISODateString } from "./base";

export type QrIdentity = {
  qrId: ID;
  siteId: ID;
  generatedAt: ISODateString;
  printableLabelText?: string;
  encodedValue: string;
};