"use client";

import { useRouter } from "next/navigation";
import { Calendar, Star, ChevronRight, Clock, Users } from "lucide-react";
import StatusBadge from "./status-badge";

interface Task {
  id: string;
  customerName: string;
  shootDate: string;
  dueDate: string | null;
  service: string;
  gender: string;
  isInfluencer: boolean;
  status: string;
  createdBy: string;
  assignedTo?: string[];
}

interface TaskCardProps {
  task: Task;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export default function TaskCard({ task, selectMode, selected, onToggleSelect }: TaskCardProps) {
  const router = useRouter();
  const date = new Date(task.shootDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const isDueSoon = task.dueDate && !isOverdue && (new Date(task.dueDate).getTime() - Date.now() < 24*60*60*1000);
  const assigned = Array.isArray(task.assignedTo) ? task.assignedTo : [];

  return (
    <div
      onClick={() => (selectMode ? onToggleSelect?.() : router.push(`/tasks/${task.id}`))}
      className={`bg-white dark:bg-gray-900 border rounded-md p-4 shadow-sm transition-all duration-200 cursor-pointer animate-fade-in hover:shadow-md hover:-translate-y-0.5 ${
        isOverdue ? "border-danger/30 dark:border-danger/30" :
        selected ? "border-accent bg-accent/5 dark:bg-accent/10" :
        "border-border dark:border-gray-800 active:bg-surface dark:active:bg-gray-800"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {selectMode && (
          <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
            selected ? "bg-accent border-accent" : "border-border dark:border-gray-600"
          }`}>
            {selected && <span className="text-white text-tiny">✓</span>}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="text-body font-[510] text-fg-primary dark:text-gray-100 truncate">{task.customerName}</h3>
            {task.isInfluencer && <Star className="w-3.5 h-3.5 text-accent flex-shrink-0" fill="currentColor" />}
            {isOverdue && <span className="text-micro bg-danger/10 text-danger px-1.5 py-0.5 rounded-sm font-[590] flex-shrink-0">Overdue</span>}
            {isDueSoon && <span className="text-micro bg-warning/10 text-warning px-1.5 py-0.5 rounded-sm font-[590] flex-shrink-0">Soon</span>}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
            <span className="text-caption text-fg-tertiary dark:text-gray-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />{date}
            </span>
            {task.dueDate && (
              <span className={`text-caption flex items-center gap-1 ${isOverdue ? "text-danger" : "text-fg-tertiary dark:text-gray-400"}`}>
                <Clock className="w-3 h-3" />
                {new Date(task.dueDate).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}
              </span>
            )}
            <span className="text-caption text-fg-tertiary dark:text-gray-400">{task.service}</span>
          </div>

          {/* Assigned staff */}
          {assigned.length > 0 && (
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              <Users className="w-3 h-3 text-fg-quaternary dark:text-gray-500 flex-shrink-0" />
              {assigned.slice(0, 3).map((u) => (
                <span key={u} className="text-micro text-fg-quaternary dark:text-gray-500 bg-surface dark:bg-gray-800 px-1.5 py-0.5 rounded-sm">
                  {u}
                </span>
              ))}
              {assigned.length > 3 && (
                <span className="text-tiny text-fg-quaternary dark:text-gray-500">+{assigned.length - 3}</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-micro text-fg-quaternary dark:text-gray-500 font-mono">{task.id}</span>
            <StatusBadge status={task.status} />
          </div>
        </div>

        {!selectMode && <ChevronRight className="w-4 h-4 text-fg-quaternary dark:text-gray-500 flex-shrink-0 mt-1" />}
      </div>
    </div>
  );
}
