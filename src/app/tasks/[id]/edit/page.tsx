"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/layout";
import TaskForm from "@/components/task-form";
import { ArrowLeft } from "lucide-react";

interface Task {
  id: string;
  customerName: string;
  shootDate: string;
  dueDate: string | null;
  service: string;
  gender: string;
  isInfluencer: boolean;
  photoPath: string | null;
  note: string | null;
  assignedTo: string[];
}

export default function EditTaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTask() {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setTask(data.task);
      }
      setLoading(false);
    }
    fetchTask();
  }, [taskId]);

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
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="btn-icon p-1.5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-heading-3 text-fg-primary">Edit Task</h1>
            <p className="text-micro text-fg-quaternary font-mono">{task.id}</p>
          </div>
        </div>
        <TaskForm
          mode="edit"
          taskId={taskId}
          initialData={{
            customerName: task.customerName,
            shootDate: task.shootDate,
            dueDate: task.dueDate,
            assignedTo: task.assignedTo,
            gender: task.gender,
            isInfluencer: task.isInfluencer,
            note: task.note || "",
            photoPath: task.photoPath,
          }}
        />
      </div>
    </AppLayout>
  );
}
