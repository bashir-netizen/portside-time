import { formatInTimeZone } from "date-fns-tz";
import { TZ, parseYmdInDjibouti } from "../time";

/**
 * Compute the [start, end) UTC window for the Africa/Djibouti calendar day
 * that contains the given instant.
 *
 * Used to scope "today's punches" without leaking into yesterday or tomorrow
 * across the UTC midnight boundary.
 */
export function djiboutiDayWindow(now: Date = new Date()): {
  start: Date;
  end: Date;
  ymd: string;
} {
  const ymd = formatInTimeZone(now, TZ, "yyyy-MM-dd");
  const start = parseYmdInDjibouti(ymd);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end, ymd };
}
