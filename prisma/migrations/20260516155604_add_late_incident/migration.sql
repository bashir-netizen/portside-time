-- CreateTable
CREATE TABLE "late_incidents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "punch_id" TEXT,
    "incident_date" DATETIME NOT NULL,
    "kind" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_justification',
    "reason" TEXT,
    "submitted_at" DATETIME,
    "decided_at" DATETIME,
    "decided_by" TEXT,
    "decision_notes" TEXT,
    "auto_flipped_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "late_incidents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "late_incidents_punch_id_fkey" FOREIGN KEY ("punch_id") REFERENCES "punches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "late_incidents_employee_id_incident_date_idx" ON "late_incidents"("employee_id", "incident_date");

-- CreateIndex
CREATE INDEX "late_incidents_status_idx" ON "late_incidents"("status");

-- CreateIndex
CREATE INDEX "late_incidents_incident_date_idx" ON "late_incidents"("incident_date");
