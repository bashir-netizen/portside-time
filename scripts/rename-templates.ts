// One-off: rename the two templates away from real employee names.
// Fathi and Hawa are people, not schedules. Also set hasBusyDayExtension=true
// on the split-day pattern — when a Fathi-style employee is on a busy day,
// they stay for lunch on-site (not off-site), so busy-day applies to both
// templates, not only the continuous one.
//
// Idempotent — safe to re-run. Templates are looked up by EITHER the old
// name OR the new name so this works whether or not the rename has happened.
import { db } from "../src/lib/db";

const RENAMES = [
  {
    oldName: "Fathi pattern",
    newName: "Split day (long lunch)",
    newDescription:
      "Sun–Thu 08:30 → 12:00, then 16:15 → 18:30 (off-site lunch). Fri off. Sat half-day 08:30–12:00. ~32h15/week. On busy days, employees stay on-site for lunch — per diem owed.",
    hasBusyDayExtension: true,
    busyDayEndTime: "18:30",
  },
  {
    oldName: "Hawa pattern",
    newName: "Continuous day (on-site lunch)",
    newDescription:
      "Sun–Wed 08:30 → 15:30 with 75-min on-site lunch. Thu half-day 08:30–12:00. Fri off. Sat split-day. ~32h15/week. Busy days extend end to 18:30 — per diem owed.",
    hasBusyDayExtension: true,
    busyDayEndTime: "18:30",
  },
];

async function main() {
  for (const r of RENAMES) {
    const found = await db.scheduleTemplate.findFirst({
      where: { OR: [{ name: r.oldName }, { name: r.newName }] },
    });
    if (!found) {
      console.log(`  ! skipped ${r.oldName} — not found`);
      continue;
    }
    if (found.name === r.newName) {
      // Already renamed; just freshen the description + busy-day flag.
      await db.scheduleTemplate.update({
        where: { id: found.id },
        data: {
          description: r.newDescription,
          hasBusyDayExtension: r.hasBusyDayExtension,
          busyDayEndTime: r.busyDayEndTime,
        },
      });
      console.log(`  ↻ refreshed: ${r.newName}`);
    } else {
      await db.scheduleTemplate.update({
        where: { id: found.id },
        data: {
          name: r.newName,
          description: r.newDescription,
          hasBusyDayExtension: r.hasBusyDayExtension,
          busyDayEndTime: r.busyDayEndTime,
        },
      });
      console.log(`  ✓ ${r.oldName} → ${r.newName}`);
    }
  }
  console.log("\nDone.");
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
