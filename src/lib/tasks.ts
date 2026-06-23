// ── Task Business Logic ────────────────────────────────
import prisma from "./db";

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
export function getResponsibleForStatus(status: string): string {
  const map: Record<string, string> = {
    New: "Admin",
    "Video Shot": "Videographer",
    "Data Copied": "Editor",
    "Video Edited": "Reviewer",
    Reviewed: "Uploader",
    Approved: "Admin",
    Uploaded: "Admin",
    "Task Completed": "—",
    Dropped: "—",
  };
  return map[status] || "Admin";
}

/** Generate next sequential task ID */
export async function generateTaskId(): Promise<string> {
  const last = await prisma.task.findFirst({
    orderBy: { id: "desc" },
    select: { id: true },
  });

  if (!last) return "SHANUZZ-0001";

  const num = parseInt(last.id.replace("SHANUZZ-", ""), 10);
  if (isNaN(num)) return "SHANUZZ-0001";

  return `SHANUZZ-${String(num + 1).padStart(4, "0")}`;
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
    // Admin gets the full STATUS_FLOW
    return base;
  }

  // Staff: forward-only, but allow Data Copied → Reviewed if rejected
  if (isRejected(task) && task.status === "Data Copied") {
    return [...base, "Reviewed"];
  }

  return base;
}
