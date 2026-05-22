import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { todayYmd } from "@/lib/time";
import { Card } from "@/components/ui/card";
import { EmployeeCreateForm } from "./EmployeeCreateForm";

export const metadata = { title: "New employee — Portside Time" };

export default async function NewEmployeePage() {
  const templates = await db.scheduleTemplate.findMany({
    select: { id: true, name: true, description: true },
    orderBy: { name: "asc" },
  });

  // Default the template picker to "Split day (long lunch)" if present —
  // it's the most common pattern for office staff. Otherwise pick whatever
  // is first.
  const preferredTemplate =
    templates.find((t) => t.name.startsWith("Split day")) ?? templates[0];

  return (
    <div className="flex flex-col gap-7">
      <div className="label-eyebrow flex items-center gap-1.5">
        <Link href="/admin" className="hover:text-foreground">
          Admin
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <Link href="/admin/employees" className="hover:text-foreground">
          Employees
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span>New</span>
      </div>

      <header>
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          New employee
        </h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          A 6-digit PIN is generated and shown once after the employee is
          created. Write it down or copy it before dismissing — they'll need
          it to punch in.
        </p>
      </header>

      <Card className="bg-card p-5 md:p-6">
        <EmployeeCreateForm
          templates={templates}
          defaultTemplateId={preferredTemplate?.id ?? ""}
          today={todayYmd()}
        />
      </Card>
    </div>
  );
}
