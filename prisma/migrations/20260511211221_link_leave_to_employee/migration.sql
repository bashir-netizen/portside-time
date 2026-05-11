-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_leave_requests" (
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
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_leave_requests" ("approver_id", "certificate_path", "created_at", "days", "decided_at", "employee_id", "end_date", "id", "leave_type", "notes", "start_date", "status", "updated_at") SELECT "approver_id", "certificate_path", "created_at", "days", "decided_at", "employee_id", "end_date", "id", "leave_type", "notes", "start_date", "status", "updated_at" FROM "leave_requests";
DROP TABLE "leave_requests";
ALTER TABLE "new_leave_requests" RENAME TO "leave_requests";
CREATE INDEX "leave_requests_employee_id_idx" ON "leave_requests"("employee_id");
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");
CREATE INDEX "leave_requests_start_date_idx" ON "leave_requests"("start_date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
