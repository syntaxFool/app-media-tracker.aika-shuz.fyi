"use client";

import { useRouter } from "next/navigation";
import { Calendar, Star, ChevronRight, Users } from "lucide-react";
import StatusBadge from "./status-badge";
import ImagePreview from "./image-preview";
import { getDueDateStatus } from "@/lib/tasks";

interface Task {
  id: string; customerName: string; shootDate: string; dueDate: string | null;
  service: string; gender: string; isInfluencer: boolean; status: string;
  createdBy: string; assignedTo?: string[]; photoPath?: string | null;
  rejectionNote?: string | null;
  seriesId?: string | null;
  partNumber?: number | null;
  seriesTotal?: number;
}

interface TaskCardProps {
  task: Task; selectMode?: boolean; selected?: boolean; onToggleSelect?: () => void;
}

export default function TaskCard({ task, selectMode, selected, onToggleSelect }: TaskCardProps) {
  const router = useRouter();
  const shootDateStr = new Date(task.shootDate).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
  const dueDateStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : null;
  const isTerminal = task.status === "Task Completed" || task.status === "Dropped";
  const dueStatus = getDueDateStatus(task.dueDate, task.status);
  const isOverdue = dueStatus === "overdue";
  const isDueToday = dueStatus === "due-today";
  const isDueSoon = dueStatus === "due-soon";
  const assigned = Array.isArray(task.assignedTo) ? task.assignedTo : [];
  const rejected = !!task.rejectionNote;

  return (
    <div onClick={() => (selectMode ? onToggleSelect?.() : router.push(`/tasks/${task.id}`))}
      className={`bg-white dark:bg-gray-900 border rounded-md px-4 py-3.5 transition-all duration-200 cursor-pointer ${
        rejected ? "border-danger/50 ring-1 ring-danger/20" :
        isOverdue ? "border-danger/30 dark:border-danger/30" :
        selected ? "border-accent bg-accent/5 dark:bg-accent/10 ring-1 ring-accent/20" :
        "border-border dark:border-gray-800 hover:shadow-elev-hover hover:-translate-y-0.5 active:translate-y-0 active:bg-surface dark:active:bg-gray-800"
      }`}>
      <div className="flex items-start gap-3">
        {selectMode && (
          <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors mt-0.5 ${
            selected ? "bg-accent border-accent" : "border-border dark:border-gray-600"
          }`}>{selected && <span className="text-white text-tiny">✓</span>}</div>
        )}

        <div className="flex-1 min-w-0">
          {/* Row 1: Name + influencer star + overdue badge */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-body font-[510] text-fg-primary dark:text-gray-100 truncate">{task.customerName}</h3>
            {task.isInfluencer && <Star className="w-3.5 h-3.5 text-accent flex-shrink-0" fill="currentColor" />}
            {isOverdue && <span className="text-micro bg-danger/10 text-danger px-1.5 py-0.5 rounded font-[590] flex-shrink-0">Overdue</span>}
            {isDueToday && <span className="text-micro bg-warning/10 text-warning px-1.5 py-0.5 rounded-pill font-[590] flex-shrink-0 border border-warning/15">Due today</span>}
            {isDueSoon && <span className="text-micro bg-warning/10 text-warning px-1.5 py-0.5 rounded-pill font-[590] flex-shrink-0 border border-warning/15">Due soon</span>}
          </div>

          {/* Row 2: Dates + Service */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1.5">
            <span className="text-caption text-fg-tertiary dark:text-gray-400 flex items-center gap-1">
              <Calendar className="w-3 h-3"/><span className="text-fg-quaternary dark:text-gray-500">Shoot:</span> {shootDateStr}
            </span>
            {dueDateStr && (
              <span className={`text-caption flex items-center gap-1 ${isOverdue ? "text-danger" : "text-fg-tertiary dark:text-gray-400"}`}>
                <span className="text-fg-quaternary dark:text-gray-500">Due:</span> {dueDateStr}
              </span>
            )}
            <span className="text-caption text-fg-tertiary dark:text-gray-400">{task.service}</span>
          </div>

          {/* Series chip */}
          {task.seriesId && task.seriesTotal && (
            <div className="flex items-center gap-1 mb-1.5">
              <span className="text-micro font-[590] text-primary bg-primary/10 px-1.5 py-0.5 rounded-pill border border-primary/20">
                Part {task.partNumber || "?"} of {task.seriesTotal}
              </span>
            </div>
          )}

          {/* Row 3: Assigned staff */}
          {assigned.length > 0 && (
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              <Users className="w-3 h-3 text-fg-quaternary dark:text-gray-500 flex-shrink-0"/>
              {assigned.slice(0,3).map(u => (
                <span key={u} className="text-micro text-fg-quaternary dark:text-gray-500 bg-surface dark:bg-gray-800 px-1.5 py-0.5 rounded-sm">{u}</span>
              ))}
              {assigned.length > 3 && <span className="text-tiny text-fg-quaternary dark:text-gray-500">+{assigned.length-3}</span>}
            </div>
          )}

          {rejected && task.rejectionNote && (
            <div className="mb-1.5 text-tiny text-fg-quaternary dark:text-gray-400 bg-danger/5 border border-danger/10 rounded-sm px-2 py-1 italic line-clamp-1">
              "{task.rejectionNote}"
            </div>
          )}

          {/* Row 4: ID + thumbnail + Status pill + Fix Required */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-micro font-mono font-[510] text-fg-tertiary dark:text-gray-400">{task.id}</span>
              {task.photoPath && (
                <ImagePreview src={task.photoPath} alt={task.customerName}>
                  <div className="w-6 h-6 rounded-sm overflow-hidden border border-border dark:border-gray-700 flex-shrink-0">
                    <img src={task.photoPath} alt="" className="w-full h-full object-cover" />
                  </div>
                </ImagePreview>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {rejected && (
                <span className="text-micro bg-danger text-white px-1.5 py-0.5 rounded-pill font-[590] shadow-elev-subtle">
                  Fix Required
                </span>
              )}
              <StatusBadge status={task.status} />
            </div>
          </div>
        </div>
        {!selectMode && <ChevronRight className="w-4 h-4 text-fg-quaternary dark:text-gray-500 flex-shrink-0 mt-1" />}
      </div>
    </div>
  );
}
