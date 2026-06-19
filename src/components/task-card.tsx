"use client";

import { useRouter } from "next/navigation";
import { Calendar, Star, ChevronRight } from "lucide-react";
import StatusBadge from "./status-badge";

interface Task {
  id: string;
  customerName: string;
  shootDate: string;
  service: string;
  gender: string;
  isInfluencer: boolean;
  status: string;
  createdBy: string;
}

interface TaskCardProps {
  task: Task;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export default function TaskCard({ task, selectMode, selected, onToggleSelect }: TaskCardProps) {
  const router = useRouter();
  const date = new Date(task.shootDate).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div
      onClick={() => (selectMode ? onToggleSelect?.() : router.push(`/tasks/${task.id}`))}
      className={`bg-white dark:bg-gray-900 border rounded-md p-4 shadow-sm transition-colors cursor-pointer animate-fade-in ${
        selected ? "border-accent bg-accent/5 dark:bg-accent/10" : "border-border dark:border-gray-800 active:bg-surface dark:active:bg-gray-800"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {selectMode && (
          <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
            selected ? "bg-accent border-accent" : "border-border dark:border-gray-600"
          }`}>
            {selected && <span className="text-white text-tiny">✓</span>}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="text-body font-[510] text-fg-primary dark:text-gray-100 truncate">{task.customerName}</h3>
            {task.isInfluencer && <Star className="w-3.5 h-3.5 text-accent flex-shrink-0" fill="currentColor" />}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
            <span className="text-caption text-fg-tertiary dark:text-gray-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />{date}
            </span>
            <span className="text-caption text-fg-tertiary dark:text-gray-400">{task.service}</span>
            <span className="text-caption text-fg-tertiary dark:text-gray-400">{task.gender}</span>
          </div>
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
