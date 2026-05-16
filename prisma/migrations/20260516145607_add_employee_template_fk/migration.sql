-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_employees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "full_name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "monthly_salary" INTEGER NOT NULL,
    "hire_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "default_schedule_id" TEXT NOT NULL,
    "default_schedule_template_id" TEXT,
    "annual_leave_balance_days" INTEGER NOT NULL DEFAULT 0,
    "pin_hash" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "employees_default_schedule_id_fkey" FOREIGN KEY ("default_schedule_id") REFERENCES "schedules" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "employees_default_schedule_template_id_fkey" FOREIGN KEY ("default_schedule_template_id") REFERENCES "schedule_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_employees" ("annual_leave_balance_days", "created_at", "default_schedule_id", "full_name", "hire_date", "id", "monthly_salary", "pin_hash", "position", "status", "updated_at") SELECT "annual_leave_balance_days", "created_at", "default_schedule_id", "full_name", "hire_date", "id", "monthly_salary", "pin_hash", "position", "status", "updated_at" FROM "employees";
DROP TABLE "employees";
ALTER TABLE "new_employees" RENAME TO "employees";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
