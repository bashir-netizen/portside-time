/**
 * Annual-leave accrual per CLAUDE.md §6: N days/month of completed service,
 * capped at 30 days/year. N defaults to 2.5 per spec (Djibouti Article 99)
 * and is overridable per `accrualPerMonth` (read from CompanyConfig in the
 * server-side caller).
 *
 * Returns the *current* expected balance given the hire date — used when
 * seeding new employees and when admin views the profile. We don't store a
 * running counter; we derive it on demand and adjust it when leave is taken.
 */
export function accruedDaysSinceHire(
  hireDate: Date,
  now: Date = new Date(),
  accrualPerMonth: number = 2.5,
): number {
  if (now <= hireDate) return 0;
  const monthsCompleted = monthDiff(hireDate, now);
  return Math.min(30, monthsCompleted * accrualPerMonth);
}

function monthDiff(from: Date, to: Date): number {
  const years = to.getUTCFullYear() - from.getUTCFullYear();
  const months = to.getUTCMonth() - from.getUTCMonth();
  let total = years * 12 + months;
  // Only count a month as completed if we've passed the anniversary day.
  if (to.getUTCDate() < from.getUTCDate()) total -= 1;
  return Math.max(0, total);
}

/**
 * Count business days (Sat–Thu inclusive, Friday excluded) between two
 * dates inclusive. Used to compute requested leave days from start/end.
 */
export function djiboutiBusinessDays(startYmd: string, endYmd: string): number {
  const start = parseYmd(startYmd);
  const end = parseYmd(endYmd);
  let count = 0;
  for (
    let cursor = start;
    cursor.getTime() <= end.getTime();
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  ) {
    // getUTCDay() returns 5 for Friday in UTC; since we anchor to UTC noon
    // this won't drift even at Djibouti's UTC+3 offset.
    if (cursor.getUTCDay() !== 5) count++;
  }
  return count;
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
  // Anchor at UTC noon so timezone offsets don't shift the day.
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}
