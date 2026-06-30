// ── Task Business Logic ────────────────────────────────
import prisma from "./db";
import { getConfig } from "./config";

export const STATUS_FLOW: Record<string, string[]> = {
  New: ["Video Shot"],
  "Video Shot": ["Data Copied"],
  "Data Copied": ["Video Edited"],
  "Video Edited": ["Reviewed"],
  Reviewed: ["Approved"],
  Approved: ["Uploaded"],
  Uploaded: ["Task Completed"],
  "Task Completed": [],
  Dropped: [],
};

export const ALL_STATUSES = Object.keys(STATUS_FLOW);

/** Validate that a transition is allowed */
export function isValidTransition(from: string, to: string): boolean {
  const allowed = STATUS_FLOW[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/** Get the staff member responsible for a given status */
export async function getResponsibleForStatus(status: string): Promise<string> {
  try {
    const map = await getConfig("status_responsible");
    return (map as Record<string, string>)[status] || "Admin";
  } catch {
    return "Admin";
  }
}

/** Generate next sequential task ID */
export async function generateTaskId(): Promise<string> {
  let prefix = "SHANUZZ";
  try {
    const branding = await getConfig("branding");
    prefix = (branding as any).taskIdPrefix || prefix;
  } catch { /* use default */ }

  const last = await prisma.task.findFirst({
    orderBy: { id: "desc" },
    select: { id: true },
  });

  if (!last) return `${prefix}-0001`;

  const num = parseInt(last.id.replace(`${prefix}-`, ""), 10);
  if (isNaN(num)) return `${prefix}-0001`;

  return `${prefix}-${String(num + 1).padStart(4, "0")}`;
}

export type DueDateStatus = "overdue" | "due-today" | "due-soon" | "normal";

/**
 * Compare a task's due date to "now" at calendar-day granularity.
 * - "overdue"   : due date is strictly before today
 * - "due-today" : due date is today
 * - "due-soon"  : due date is within the next 2 days (not including today)
 * - "normal"    : due date is further out, or task is terminal, or no due date
 */
export function getDueDateStatus(
  dueDate: string | Date | null | undefined,
  status: string,
  now: Date = new Date(),
): DueDateStatus {
  if (!dueDate) return "normal";
  if (status === "Task Completed" || status === "Dropped") return "normal";

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  if (due.getTime() < today.getTime()) return "overdue";
  if (due.getTime() === today.getTime()) return "due-today";
  const diffMs = due.getTime() - today.getTime();
  if (diffMs <= 2 * 24 * 60 * 60 * 1000) return "due-soon";
  return "normal";
}

/** Check if a task has been rejected */
export function isRejected(task: { rejectionNote?: string | null }): boolean {
  return !!task.rejectionNote;
}

/** Get allowed next statuses for a task based on role and rejection state */
export function getAllowedNextStatuses(
  task: { status: string; rejectionNote?: string | null },
  role: string,
): string[] {
  const base = STATUS_FLOW[task.status] || [];

  if (role === "admin" || role === "su") {
    return base;
  }

  // Staff: only forward through the pipeline. They cannot approve (Reviewed→Approved
  // is an admin decision). They can rework if rejected (Data Copied→Reviewed).
  // They CAN continue forward after Approved (Approved→Uploaded→Task Completed).
  if (task.status === "Reviewed") {
    // Staff can't approve — admin must decide
    return [];
  }

  // Staff: allow rejected tasks to go Data Copied → Reviewed
  if (isRejected(task) && task.status === "Data Copied") {
    return [...base, "Reviewed"];
  }

  return base;
}
