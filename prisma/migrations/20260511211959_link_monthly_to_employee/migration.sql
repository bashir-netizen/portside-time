-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_monthly_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "period_start" DATETIME NOT NULL,
    "period_end" DATETIME NOT NULL,
    "worked_hours" REAL NOT NULL,
    "scheduled_hours" REAL NOT NULL,
    "late_count" INTEGER NOT NULL,
    "late_minutes" INTEGER NOT NULL,
    "late_deduction_djf" INTEGER NOT NULL,
    "overtime_hours" REAL NOT NULL,
    "overtime_amount_djf" INTEGER NOT NULL,
    "sick_days_certified" REAL NOT NULL,
    "sick_days_uncertified" REAL NOT NULL,
    "vacation_days" REAL NOT NULL,
    "holiday_days" REAL NOT NULL,
    "unauth_absence_days" REAL NOT NULL,
    "unauth_absence_djf" INTEGER NOT NULL,
    "adjustments_djf" INTEGER NOT NULL DEFAULT 0,
    "net_deduction_djf" INTEGER NOT NULL,
    "net_addition_djf" INTEGER NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "locked_at" DATETIME,
    "exported_at" DATETIME,
    "exported_by" TEXT,
    "export_path" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "monthly_reports_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_monthly_reports" ("adjustments_djf", "created_at", "employee_id", "export_path", "exported_at", "exported_by", "holiday_days", "id", "late_count", "late_deduction_djf", "late_minutes", "locked", "locked_at", "net_addition_djf", "net_deduction_djf", "overtime_amount_djf", "overtime_hours", "period_end", "period_start", "scheduled_hours", "sick_days_certified", "sick_days_uncertified", "unauth_absence_days", "unauth_absence_djf", "updated_at", "vacation_days", "worked_hours") SELECT "adjustments_djf", "created_at", "employee_id", "export_path", "exported_at", "exported_by", "holiday_days", "id", "late_count", "late_deduction_djf", "late_minutes", "locked", "locked_at", "net_addition_djf", "net_deduction_djf", "overtime_amount_djf", "overtime_hours", "period_end", "period_start", "scheduled_hours", "sick_days_certified", "sick_days_uncertified", "unauth_absence_days", "unauth_absence_djf", "updated_at", "vacation_days", "worked_hours" FROM "monthly_reports";
DROP TABLE "monthly_reports";
ALTER TABLE "new_monthly_reports" RENAME TO "monthly_reports";
CREATE INDEX "monthly_reports_period_start_idx" ON "monthly_reports"("period_start");
CREATE INDEX "monthly_reports_locked_idx" ON "monthly_reports"("locked");
CREATE UNIQUE INDEX "monthly_reports_employee_id_period_start_key" ON "monthly_reports"("employee_id", "period_start");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
