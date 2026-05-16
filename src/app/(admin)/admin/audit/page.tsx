import { ScrollText, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const metadata = { title: "Audit log — Portside Time" };

const TZ = "Africa/Djibouti";
const PAGE_SIZE = 50;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string }>;
}) {
  const { action, page } = await searchParams;
  const pageNum = Math.max(1, Number(page ?? "1") || 1);

  const where = action ? { action } : {};
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.auditLog.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const prevHref = `/admin/audit?${new URLSearchParams({
    ...(action ? { action } : {}),
    page: String(Math.max(1, pageNum - 1)),
  })}`;
  const nextHref = `/admin/audit?${new URLSearchParams({
    ...(action ? { action } : {}),
    page: String(Math.min(totalPages, pageNum + 1)),
  })}`;

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <div className="label-eyebrow">Compliance · append-only</div>
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          Audit log
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every action, automatically. Triggers in SQLite block updates and
          deletes — entries here are permanent.
        </p>
      </header>

      <div className="rule-double" aria-hidden />

      <Card className="bg-card p-4">
        <form
          action="/admin/audit"
          className="flex flex-col gap-3 md:flex-row md:items-end"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="action-filter" className="label-eyebrow">
              Filter by action
            </Label>
            <Input
              id="action-filter"
              name="action"
              defaultValue={action ?? ""}
              placeholder="e.g. login_success, punch_recorded, employee_login_blocked"
              className="bg-background font-mono text-xs"
            />
          </div>
          <Button type="submit" className="gap-1.5 md:self-end">
            <Filter className="h-4 w-4" />
            Apply
          </Button>
        </form>
      </Card>

      <div className="flex items-baseline justify-between">
        <p className="text-xs text-muted-foreground">
          Showing{" "}
          <span className="font-mono tabular-nums text-foreground">
            {rows.length}
          </span>{" "}
          of{" "}
          <span className="font-mono tabular-nums text-foreground">{total}</span>{" "}
          matching rows · Page {pageNum} / {totalPages}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-sm border border-dashed border-border bg-muted/30 px-4 py-10 text-center">
          <ScrollText
            className="mx-auto h-6 w-6 text-muted-foreground"
            strokeWidth={1.5}
          />
          <p className="mt-2 text-sm text-muted-foreground">
            No matching rows.
          </p>
        </div>
      ) : (
        <Card className="overflow-x-auto bg-card p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="label-eyebrow">Time</TableHead>
                <TableHead className="label-eyebrow">Action</TableHead>
                <TableHead className="label-eyebrow">Entity</TableHead>
                <TableHead className="label-eyebrow">Actor</TableHead>
                <TableHead className="label-eyebrow">IP</TableHead>
                <TableHead className="label-eyebrow">Check failed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="border-border">
                  <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground tabular-nums">
                    {formatInTimeZone(row.createdAt, TZ, "d LLL · HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {row.action}
                    </code>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {row.entityType ?? "—"}
                    {row.entityId ? ` · ${row.entityId.slice(0, 8)}…` : ""}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {row.actorUserId
                      ? `user:${row.actorUserId.slice(0, 6)}…`
                      : row.actorEmployeeId
                        ? `emp:${row.actorEmployeeId.slice(0, 6)}…`
                        : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                    {row.sourceIp ?? "—"}
                  </TableCell>
                  <TableCell>
                    {row.checkFailed ? (
                      <Badge className="border-destructive/30 bg-destructive/15 font-mono text-[10px] uppercase tracking-wider text-destructive hover:bg-destructive/15">
                        {row.checkFailed}
                      </Badge>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground/60">
                        —
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <nav className="flex items-center justify-between gap-3 text-sm">
        <Button
          asChild
          variant="outline"
          disabled={pageNum === 1}
          className={cn("gap-1.5", pageNum === 1 && "pointer-events-none opacity-50")}
        >
          <a href={prevHref}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </a>
        </Button>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          Page {pageNum} / {totalPages}
        </span>
        <Button
          asChild
          variant="outline"
          disabled={pageNum === totalPages}
          className={cn(
            "gap-1.5",
            pageNum === totalPages && "pointer-events-none opacity-50"
          )}
        >
          <a href={nextHref}>
            Next <ChevronRight className="h-4 w-4" />
          </a>
        </Button>
      </nav>
    </div>
  );
}
