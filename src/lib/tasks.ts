// ── Task Business Logic ────────────────────────────────
import prisma from "./db";

export const STATUS_FLOW: Record<string, string[]> = {
  New: ["Video Shot"],
  "Video Shot": ["Data Copied"],
  "Data Copied": ["Video Edited"],
  "Video Edited": ["Reviewed"],
  Reviewed: ["Uploaded"],
  Uploaded: ["Task Completed"],
  "Task Completed": [],
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
    Uploaded: "Admin",
    "Task Completed": "—",
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
