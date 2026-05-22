-- Drop the legacy Schedule model. Every employee already runs on a
-- ScheduleTemplate (default_schedule_template_id was backfilled in the
-- prior add_employee_template_fk migration + the
-- migrate-employees-to-templates.ts script).
--
-- SQLite-safe approach: recreate employees without the legacy column
-- (SQLite < 3.35 can't DROP COLUMN directly), copy data, then drop the
-- schedules table.

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_employees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "full_name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "monthly_salary" INTEGER NOT NULL,
    "hire_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "default_schedule_template_id" TEXT NOT NULL,
    "annual_leave_balance_days" INTEGER NOT NULL DEFAULT 0,
    "pin_hash" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "employees_default_schedule_template_id_fkey"
      FOREIGN KEY ("default_schedule_template_id")
      REFERENCES "schedule_templates" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_employees" (
    "id", "full_name", "position", "monthly_salary", "hire_date",
    "status", "default_schedule_template_id",
    "annual_leave_balance_days", "pin_hash", "created_at", "updated_at"
) SELECT
    "id", "full_name", "position", "monthly_salary", "hire_date",
    "status", "default_schedule_template_id",
    "annual_leave_balance_days", "pin_hash", "created_at", "updated_at"
FROM "employees";

DROP TABLE "employees";
ALTER TABLE "new_employees" RENAME TO "employees";

DROP TABLE "schedules";

PRAGMA foreign_keys=ON;
