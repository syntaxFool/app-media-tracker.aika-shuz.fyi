"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/layout";
import StatusBadge from "@/components/status-badge";
import StatusButtons from "@/components/status-buttons";
import PingAdminButton from "@/components/ping-admin-button";
import { ArrowLeft, Edit, Trash2, Calendar, User, Star, Image } from "lucide-react";

const NEXT_STATUS: Record<string, string[]> = {
  New: ["Video Shot"],
  "Video Shot": ["Data Copied"],
  "Data Copied": ["Video Edited"],
  "Video Edited": ["Reviewed"],
  Reviewed: ["Uploaded"],
  Uploaded: ["Task Completed"],
  "Task Completed": [],
};

interface Task {
  id: string;
  customerName: string;
  shootDate: string;
  service: string;
  gender: string;
  isInfluencer: boolean;
  photoPath: string | null;
  note: string | null;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("staff");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const fetchTask = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}`);
    if (res.ok) {
      const data = await res.json();
      setTask(data.task);
    }
    setLoading(false);
  }, [taskId]);

  const fetchUser = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      setUserRole(data.user.role);
    }
  }, []);

  useEffect(() => {
    fetchTask();
    fetchUser();
  }, [fetchTask, fetchUser]);

  async function handleStatusUpdate(newStatus: string) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      await fetchTask();
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!task) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-body text-fg-secondary">Task not found</p>
          <button onClick={() => router.back()} className="btn-ghost mt-4">
            Go Back
          </button>
        </div>
      </AppLayout>
    );
  }

  const nextStatuses = NEXT_STATUS[task.status] || [];
  const date = new Date(task.shootDate).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <AppLayout>
      <div className="p-4 max-w-3xl mx-auto space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn-icon p-1.5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-micro text-fg-quaternary font-mono">{task.id}</span>
              <StatusBadge status={task.status} />
              {task.isInfluencer && <Star className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" />}
            </div>
          </div>

          {userRole === "admin" && (
            <div className="flex gap-1">
              <button
                onClick={() => router.push(`/tasks/${task.id}/edit`)}
                className="btn-subtle p-2"
                title="Edit"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleteConfirm(true)}
                className="btn-subtle p-2 hover:text-danger"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Customer Name */}
        <h1 className="text-heading-2 text-fg-primary">{task.customerName}</h1>

        {/* Details Grid */}
        <div className="card-linear p-4 space-y-3">
          <DetailRow icon={<Calendar className="w-4 h-4" />} label="Shoot Date" value={date} />
          <DetailRow label="Service" value={task.service} />
          <DetailRow label="Gender" value={task.gender} />
          <DetailRow
            icon={<Star className="w-4 h-4" />}
            label="Influencer"
            value={task.isInfluencer ? "Yes ⭐" : "No"}
          />
        </div>

        {/* Photo */}
        {task.photoPath && (
          <div className="card-linear overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={task.photoPath}
              alt={`${task.customerName} photo`}
              className="w-full h-64 object-cover"
            />
          </div>
        )}

        {/* Note */}
        {task.note && (
          <div className="card-linear p-4">
            <p className="text-label text-fg-tertiary mb-1">Note</p>
            <p className="text-sm text-fg-secondary whitespace-pre-wrap">{task.note}</p>
          </div>
        )}

        {/* Activity Log */}
        <div className="card-linear p-4 space-y-2">
          <p className="text-label text-fg-tertiary">Activity</p>
          <p className="text-caption text-fg-secondary">
            Created by <span className="text-fg-primary">{task.createdBy}</span> on{" "}
            {new Date(task.createdAt).toLocaleString("en-IN")}
          </p>
          {task.updatedBy && task.updatedAt && (
            <p className="text-caption text-fg-secondary">
              Last updated by <span className="text-fg-primary">{task.updatedBy}</span> on{" "}
              {new Date(task.updatedAt).toLocaleString("en-IN")}
            </p>
          )}
        </div>

        {/* Status Update Section */}
        <div className="card-linear p-4 space-y-3">
          <StatusButtons
            currentStatus={task.status}
            nextStatuses={nextStatuses}
            onUpdate={handleStatusUpdate}
          />

          {/* Ping Admin — only show for staff */}
          {userRole === "staff" && task.status !== "Task Completed" && (
            <div className="pt-3 border-t border-white/[0.05]">
              <PingAdminButton taskId={task.id} />
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="dialog-overlay" onClick={() => setDeleteConfirm(false)}>
            <div className="dialog-content p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-heading-3 text-fg-primary mb-2">Delete Task?</h3>
              <p className="text-small text-fg-secondary mb-6">
                This will permanently delete <span className="text-fg-primary font-mono">{task.id}</span>{" "}
                ({task.customerName}). This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(false)} className="btn-ghost flex-1">
                  Cancel
                </button>
                <button onClick={handleDelete} className="btn-danger flex-1">
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-label text-fg-tertiary min-w-[90px]">{label}</span>
      <span className="text-sm text-fg-primary flex items-center gap-1.5">
        {icon}
        {value}
      </span>
    </div>
  );
}
