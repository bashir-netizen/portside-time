-- CreateTable
CREATE TABLE "schedule_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "has_busy_day_extension" BOOLEAN NOT NULL DEFAULT false,
    "busy_day_end_time" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "day_patterns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schedule_template_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "lunch_out_time" TEXT,
    "lunch_in_time" TEXT,
    "lunch_break_minutes" INTEGER,
    "lunch_on_site" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "day_patterns_schedule_template_id_fkey" FOREIGN KEY ("schedule_template_id") REFERENCES "schedule_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "schedule_templates_name_key" ON "schedule_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX "day_patterns_schedule_template_id_day_of_week_key" ON "day_patterns"("schedule_template_id", "day_of_week");
