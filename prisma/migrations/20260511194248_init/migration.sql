-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "full_name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "monthly_salary" INTEGER NOT NULL,
    "hire_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "default_schedule_id" TEXT NOT NULL,
    "annual_leave_balance_days" INTEGER NOT NULL DEFAULT 0,
    "pin_hash" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "employees_default_schedule_id_fkey" FOREIGN KEY ("default_schedule_id") REFERENCES "schedules" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "shift_start" TEXT NOT NULL,
    "lunch_start" TEXT NOT NULL,
    "lunch_end" TEXT NOT NULL,
    "shift_end" TEXT NOT NULL,
    "work_days" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "status" TEXT NOT NULL DEFAULT 'active',
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "lockout_until" DATETIME,
    "force_password_reset" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "employee_id" TEXT,
    "role" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "last_sensitive_action_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_ip" TEXT,
    "device_id" TEXT,
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "sessions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fingerprint_hash" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "screen_resolution" TEXT,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "approved_by" TEXT,
    "approved_at" DATETIME,
    "revoked_at" DATETIME,
    "revoke_reason" TEXT,
    "last_seen_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_ip" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ip_allowlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ip_address" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "added_by" TEXT NOT NULL,
    "added_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivated_at" DATETIME,
    "last_seen_at" DATETIME
);

-- CreateTable
CREATE TABLE "pending_ips" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ip_address" TEXT NOT NULL,
    "first_seen_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggering_device_id" TEXT,
    "approval_token" TEXT,
    "token_expires_at" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolved_at" DATETIME,
    "observation_count" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor_user_id" TEXT,
    "actor_employee_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "before_json" TEXT,
    "after_json" TEXT,
    "source_ip" TEXT,
    "device_id" TEXT,
    "user_agent" TEXT,
    "check_failed" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_employee_id_idx" ON "sessions"("employee_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "devices_fingerprint_hash_key" ON "devices"("fingerprint_hash");

-- CreateIndex
CREATE UNIQUE INDEX "ip_allowlist_ip_address_active_key" ON "ip_allowlist"("ip_address", "active");

-- CreateIndex
CREATE UNIQUE INDEX "pending_ips_ip_address_key" ON "pending_ips"("ip_address");

-- CreateIndex
CREATE INDEX "pending_ips_status_idx" ON "pending_ips"("status");

-- CreateIndex
CREATE INDEX "audit_log_action_idx" ON "audit_log"("action");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- Append-only enforcement: SQLite has no per-table grants, so use triggers.
-- Same pattern will be added to the `punches` table when it lands in Phase 2.
CREATE TRIGGER "audit_log_no_update"
  BEFORE UPDATE ON "audit_log"
  BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;

CREATE TRIGGER "audit_log_no_delete"
  BEFORE DELETE ON "audit_log"
  BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;
