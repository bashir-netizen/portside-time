-- CreateTable
CREATE TABLE "company_config" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "grace_period_minutes" INTEGER NOT NULL DEFAULT 15,
    "justification_window_hours" INTEGER NOT NULL DEFAULT 48,
    "annual_leave_accrual_per_month" REAL NOT NULL DEFAULT 2.5,
    "per_diem_default_djf" INTEGER,
    "week_start_day" INTEGER NOT NULL DEFAULT 0,
    "day_off_default" INTEGER NOT NULL DEFAULT 5,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Djibouti',
    "updated_at" DATETIME NOT NULL,
    "updated_by" TEXT
);
