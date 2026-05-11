import { formatInTimeZone } from "date-fns-tz";
import { TZ, parseYmdInDjibouti } from "../time";

/**
 * Compute the [start, end) UTC window for a calendar month in Africa/Djibouti.
 * `ymd` is "YYYY-MM-01" — caller passes the first of the target month.
 */
export function periodWindow(periodFirstYmd: string): {
  start: Date;
  end: Date;
  label: string;
  ymd: string;
} {
  const start = parseYmdInDjibouti(periodFirstYmd);
  const next = new Date(start);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const label = formatInTimeZone(start, TZ, "MMMM yyyy");
  return { start, end: next, label, ymd: periodFirstYmd };
}

export function currentPeriodYmd(now: Date = new Date()): string {
  const yyyyMm = formatInTimeZone(now, TZ, "yyyy-MM");
  return `${yyyyMm}-01`;
}

export function previousPeriodYmd(periodYmd: string): string {
  const start = parseYmdInDjibouti(periodYmd);
  const prev = new Date(start);
  prev.setUTCMonth(prev.getUTCMonth() - 1);
  return formatInTimeZone(prev, TZ, "yyyy-MM") + "-01";
}
