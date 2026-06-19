"use client";

import { useRouter } from "next/navigation";
import { Calendar, User, Star, ChevronRight } from "lucide-react";
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

export default function TaskCard({ task }: { task: Task }) {
  const router = useRouter();
  const date = new Date(task.shootDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      onClick={() => router.push(`/tasks/${task.id}`)}
      className="card-linear p-4 active:bg-white/[0.03] transition-colors cursor-pointer animate-fade-in"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Top row: Name + Influencer */}
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="text-body font-[510] text-fg-primary truncate">
              {task.customerName}
            </h3>
            {task.isInfluencer && (
              <Star className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" fill="currentColor" />
            )}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
            <span className="text-caption text-fg-tertiary flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {date}
            </span>
            <span className="text-caption text-fg-tertiary">{task.service}</span>
            <span className="text-caption text-fg-tertiary">{task.gender}</span>
          </div>

          {/* Bottom row: ID + Status */}
          <div className="flex items-center justify-between">
            <span className="text-micro text-fg-quaternary font-mono">{task.id}</span>
            <StatusBadge status={task.status} />
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-fg-quaternary flex-shrink-0 mt-1" />
      </div>
    </div>
  );
}
