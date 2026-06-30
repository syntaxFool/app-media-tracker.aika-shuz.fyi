"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Star, Clock, Users } from "lucide-react";
import ImagePreview from "@/components/image-preview";
import { ALL_STATUSES, isRejected, getAllowedNextStatuses, getDueDateStatus } from "@/lib/tasks";

const STATUS_COLORS: Record<string, string> = {
  New: "bg-ocean",
  "Video Shot": "bg-accent",
  "Data Copied": "bg-primary",
  "Video Edited": "bg-indigo-500",
  Reviewed: "bg-orange-500",
  Approved: "bg-teal-500",
  Uploaded: "bg-emerald-500",
  "Task Completed": "bg-green-500",
  Dropped: "bg-gray-400",
};

interface SeriesCardProps {
  seriesId: string;
  parts: any[];
  userRole: string;
  onMoveTask: (taskId: string, newStatus: string) => void;
  onNavigate: (taskId: string) => void;
}

export default function SeriesCard({ seriesId, parts, userRole, onMoveTask, onNavigate }: SeriesCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Sort parts by partNumber
  const sortedParts = [...parts].sort((a, b) => (a.partNumber || 0) - (b.partNumber || 0));

  // Compute progress
  const completedCount = sortedParts.filter(p => p.status === "Task Completed").length;
  const totalCount = sortedParts.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-white dark:bg-gray-800 border border-primary/30 rounded-md shadow-sm hover:shadow-elev-raised hover:border-primary/40 transition-all group">
      {/* Series Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-3 flex items-center gap-2"
      >
        <span className="text-lg">{expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-[590] text-fg-primary dark:text-gray-100 truncate">
              📹 {seriesId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
            </span>
            <span className="text-tiny text-fg-quaternary bg-surface dark:bg-gray-900 px-2 py-0.5 rounded-pill border border-border dark:border-gray-700">
              {totalCount} part{totalCount > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {/* Mini progress bar */}
            <div className="flex-1 h-1.5 bg-black/[0.06] dark:bg-gray-700 rounded-full overflow-hidden max-w-[120px]">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-fg-quaternary dark:text-gray-500 font-mono">
              {completedCount}/{totalCount} done
            </span>
          </div>
        </div>
      </button>

      {/* Expanded Parts */}
      {expanded && (
        <div className="border-t border-border dark:border-gray-700 divide-y divide-border dark:divide-gray-700/50 animate-fade-in">
          {sortedParts.map((part) => {
            const dueStatus = getDueDateStatus(part.dueDate, part.status);
            const isOverdue = dueStatus === "overdue";
            const isDueToday = dueStatus === "due-today";
            const assigned = Array.isArray(part.assignedTo) ? part.assignedTo : [];
            const isRejectedTask = isRejected(part);
            const allowedNext = getAllowedNextStatuses(part, userRole).slice(0, 3);

            return (
              <div
                key={part.id}
                className="p-3 hover:bg-black/[0.02] dark:hover:bg-gray-700/30 transition-colors"
              >
                {/* Part header */}
                <div className="flex items-start gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-micro font-[590] text-fg-quaternary dark:text-gray-500 flex-shrink-0">
                      P{part.partNumber || "?"}:
                    </span>
                    <button
                      onClick={() => onNavigate(part.id)}
                      className="text-sm font-[510] text-fg-primary dark:text-gray-100 truncate hover:text-primary transition-colors"
                    >
                      {part.customerName}
                    </button>
                  </div>
                  {part.isInfluencer && (
                    <Star className="w-3 h-3 text-accent flex-shrink-0 mt-0.5" fill="currentColor" />
                  )}
                  {/* Status dot + label */}
                  <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[part.status] || "bg-gray-400"}`} />
                    <span className="text-tiny text-fg-tertiary dark:text-gray-400">{part.status}</span>
                  </div>
                </div>

                {/* Rejection badge */}
                {isRejectedTask && part.rejectionNote && (
                  <div className="mb-1.5 text-tiny text-danger bg-danger/5 border border-danger/10 rounded-sm px-2 py-1 italic line-clamp-1">
                    Fix: "{part.rejectionNote}"
                  </div>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
                  {part.photoPath && (
                    <ImagePreview src={part.photoPath} alt={part.customerName}>
                      <div className="w-4 h-4 rounded-sm overflow-hidden border border-border dark:border-gray-700 flex-shrink-0">
                        <img src={part.photoPath} alt="" className="w-full h-full object-cover" />
                      </div>
                    </ImagePreview>
                  )}
                  <span className="text-tiny text-fg-quaternary dark:text-gray-500 font-mono">{part.id}</span>
                  <span className="text-tiny text-fg-quaternary dark:text-gray-500">{part.service}</span>
                  {isOverdue && (
                    <span className="text-tiny text-danger">⚠ Overdue</span>
                  )}
                  {isDueToday && (
                    <span className="text-tiny text-warning">⏰ Due today</span>
                  )}
                  {assigned.length > 0 && (
                    <span className="text-tiny text-fg-quaternary dark:text-gray-500 truncate">
                      <Users className="w-2.5 h-2.5 inline-block align-[-0.0625em] mr-0.5" />
                      {assigned.slice(0, 2).join(", ")}{assigned.length > 2 ? ` +${assigned.length - 2}` : ""}
                    </span>
                  )}
                </div>

                {/* Quick move buttons */}
                {allowedNext.length > 0 && (
                  <div className="flex gap-1 pt-1.5">
                    {allowedNext.map(s => (
                      <button
                        key={s}
                        onClick={(e) => { e.stopPropagation(); onMoveTask(part.id, s); }}
                        className="text-tiny px-2 py-0.5 rounded-sm bg-surface dark:bg-gray-900 text-fg-tertiary dark:text-gray-400 hover:bg-primary hover:text-white transition-colors"
                      >→ {s}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
