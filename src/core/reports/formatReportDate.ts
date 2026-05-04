// src/core/reports/formatReportDate.ts

const IRISH_TIME_ZONE = "Europe/Dublin";
const IRISH_LOCALE = "en-IE";

function toDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatReportDate(value?: string | Date | null): string {
  const date = toDate(value);
  if (!date) return "—";

  return new Intl.DateTimeFormat(IRISH_LOCALE, {
    timeZone: IRISH_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatReportDateTime(value?: string | Date | null): string {
  const date = toDate(value);
  if (!date) return "—";

  return new Intl.DateTimeFormat(IRISH_LOCALE, {
    timeZone: IRISH_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}