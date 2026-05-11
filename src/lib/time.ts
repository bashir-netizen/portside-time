import { format, parseISO } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

export const TZ = "Africa/Djibouti";

export function formatDate(d: Date): string {
  return formatInTimeZone(d, TZ, "dd MMM yyyy");
}

export function formatDateTime(d: Date): string {
  return formatInTimeZone(d, TZ, "dd MMM yyyy HH:mm");
}

export function formatTime(d: Date): string {
  return formatInTimeZone(d, TZ, "HH:mm");
}

export function toDjiboutiZoned(d: Date): Date {
  return toZonedTime(d, TZ);
}

export function parseYmdInDjibouti(ymd: string): Date {
  // "YYYY-MM-DD" → 00:00 local Djibouti time → UTC instant
  const local = parseISO(`${ymd}T00:00:00+03:00`);
  return local;
}

export function startOfDjiboutiDay(d: Date): Date {
  const ymd = formatInTimeZone(d, TZ, "yyyy-MM-dd");
  return parseYmdInDjibouti(ymd);
}

export function todayYmd(): string {
  return formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
}

export function formatDjf(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(Math.round(amount));
}

// Re-export format/formatInTimeZone for callers that need custom patterns.
export { format, formatInTimeZone };
