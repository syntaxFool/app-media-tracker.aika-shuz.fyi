"use client";

import AppLayout from "@/components/layout";
import TaskForm from "@/components/task-form";

export default function CreateTaskPage() {
  return (
    <AppLayout>
      <div className="p-4 max-w-lg mx-auto">
        <h1 className="text-heading-3 text-fg-primary dark:text-gray-100 mb-6">Create New Task</h1>
        <TaskForm mode="create" />
      </div>
    </AppLayout>
  );
}
