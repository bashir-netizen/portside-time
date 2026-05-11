-- CreateTable
CREATE TABLE "punches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "punch_type" TEXT NOT NULL,
    "punched_at" DATETIME NOT NULL,
    "source_ip" TEXT,
    "device_id" TEXT,
    "user_agent" TEXT,
    "is_corrected" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "punches_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "punches_employee_id_punched_at_idx" ON "punches"("employee_id", "punched_at");

-- CreateIndex
CREATE INDEX "punches_punched_at_idx" ON "punches"("punched_at");

-- Append-only enforcement (same pattern as audit_log). The only legitimate
-- post-insert change is `is_corrected`, which the correction tool sets via
-- a NEW INSERT row pair on `punches` + `punch_corrections` in Phase 2 step 8.
CREATE TRIGGER "punches_no_delete"
  BEFORE DELETE ON "punches"
  BEGIN SELECT RAISE(ABORT, 'punches is append-only'); END;

-- Allow UPDATE only when the only change is `is_corrected` flipping.
-- Anything else aborts. (Implemented via a guard on the diff.)
CREATE TRIGGER "punches_no_update_except_is_corrected"
  BEFORE UPDATE ON "punches"
  WHEN OLD.employee_id <> NEW.employee_id
    OR OLD.punch_type <> NEW.punch_type
    OR OLD.punched_at <> NEW.punched_at
    OR COALESCE(OLD.source_ip, '') <> COALESCE(NEW.source_ip, '')
    OR COALESCE(OLD.device_id, '') <> COALESCE(NEW.device_id, '')
    OR COALESCE(OLD.user_agent, '') <> COALESCE(NEW.user_agent, '')
    OR OLD.created_at <> NEW.created_at
  BEGIN SELECT RAISE(ABORT, 'punches: only is_corrected may change post-insert'); END;
