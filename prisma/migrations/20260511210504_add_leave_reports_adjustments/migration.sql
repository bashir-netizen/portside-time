-- CreateTable
CREATE TABLE "punch_corrections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "punch_id" TEXT,
    "employee_id" TEXT NOT NULL,
    "correction_type" TEXT NOT NULL,
    "original_punch_type" TEXT,
    "original_punched_at" DATETIME,
    "new_punch_type" TEXT,
    "new_punched_at" DATETIME,
    "admin_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "punch_corrections_punch_id_fkey" FOREIGN KEY ("punch_id") REFERENCES "punches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "leave_type" TEXT NOT NULL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "days" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "certificate_path" TEXT,
    "approver_id" TEXT,
    "decided_at" DATETIME,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "monthly_reports" (
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
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "adjustments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "applies_to_period_start" DATETIME NOT NULL,
    "amount_djf" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_in_period_start" DATETIME
);

-- CreateIndex
CREATE INDEX "punch_corrections_employee_id_idx" ON "punch_corrections"("employee_id");

-- CreateIndex
CREATE INDEX "punch_corrections_created_at_idx" ON "punch_corrections"("created_at");

-- CreateIndex
CREATE INDEX "leave_requests_employee_id_idx" ON "leave_requests"("employee_id");

-- CreateIndex
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");

-- CreateIndex
CREATE INDEX "leave_requests_start_date_idx" ON "leave_requests"("start_date");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_date_key" ON "holidays"("date");

-- CreateIndex
CREATE INDEX "monthly_reports_period_start_idx" ON "monthly_reports"("period_start");

-- CreateIndex
CREATE INDEX "monthly_reports_locked_idx" ON "monthly_reports"("locked");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_reports_employee_id_period_start_key" ON "monthly_reports"("employee_id", "period_start");

-- CreateIndex
CREATE INDEX "adjustments_employee_id_idx" ON "adjustments"("employee_id");

-- CreateIndex
CREATE INDEX "adjustments_applies_to_period_start_idx" ON "adjustments"("applies_to_period_start");

-- CreateIndex
CREATE INDEX "adjustments_applied_in_period_start_idx" ON "adjustments"("applied_in_period_start");
