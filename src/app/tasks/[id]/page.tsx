"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/layout";
import StatusBadge from "@/components/status-badge";
import StatusButtons from "@/components/status-buttons";
import PingAdminButton from "@/components/ping-admin-button";
import { ArrowLeft, Edit, Trash2, Calendar, Star } from "lucide-react";

const NEXT_STATUS: Record<string, string[]> = {
  New: ["Video Shot"], "Video Shot": ["Data Copied"], "Data Copied": ["Video Edited"],
  "Video Edited": ["Reviewed"], Reviewed: ["Uploaded"], Uploaded: ["Task Completed"], "Task Completed": [],
};

export default function TaskDetailPage() {
  const params = useParams(); const router = useRouter(); const taskId = params.id as string;
  const [task, setTask] = useState<any>(null); const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("staff"); const [deleteConfirm, setDeleteConfirm] = useState(false);

  const fetchTask = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}`);
    if (res.ok) setTask((await res.json()).task);
    setLoading(false);
  }, [taskId]);

  useEffect(() => { fetchTask(); fetch("/api/auth/me").then(r => { if(r.ok) r.json().then(d => setUserRole(d.user.role)); }); }, [fetchTask]);

  async function handleStatusUpdate(newStatus: string) {
    await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({status:newStatus}) });
    await fetchTask();
  }

  async function handleDelete() {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    router.push("/"); router.refresh();
  }

  if (loading) return <AppLayout><div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-black/10 border-t-primary rounded-full animate-spin" /></div></AppLayout>;
  if (!task) return <AppLayout><div className="text-center py-20"><p className="text-body text-fg-secondary">Task not found</p></div></AppLayout>;

  const nextStatuses = NEXT_STATUS[task.status] || [];
  const date = new Date(task.shootDate).toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  return (
    <AppLayout>
      <div className="p-4 max-w-3xl mx-auto space-y-5 animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={()=>router.back()} className="btn-icon p-1.5"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex-1"><div className="flex items-center gap-2"><span className="text-micro text-fg-quaternary font-mono">{task.id}</span><StatusBadge status={task.status} />{task.isInfluencer&&<Star className="w-3.5 h-3.5 text-accent" fill="currentColor"/>}</div></div>
          {userRole==="admin"&&<div className="flex gap-1"><button onClick={()=>router.push(`/tasks/${task.id}/edit`)} className="btn-subtle p-2"><Edit className="w-4 h-4"/></button><button onClick={()=>setDeleteConfirm(true)} className="btn-subtle p-2 hover:text-danger"><Trash2 className="w-4 h-4"/></button></div>}
        </div>

        <h1 className="text-heading-2 text-fg-primary">{task.customerName}</h1>

        <div className="bg-white border border-border rounded-md p-4 space-y-3 shadow-sm">
          <div className="flex items-center gap-3"><span className="text-label text-fg-tertiary min-w-[90px]">Shoot Date</span><span className="text-sm text-fg-primary flex items-center gap-1.5"><Calendar className="w-4 h-4"/>{date}</span></div>
          <div className="flex items-center gap-3"><span className="text-label text-fg-tertiary min-w-[90px]">Service</span><span className="text-sm text-fg-primary">{task.service}</span></div>
          <div className="flex items-center gap-3"><span className="text-label text-fg-tertiary min-w-[90px]">Gender</span><span className="text-sm text-fg-primary">{task.gender}</span></div>
          <div className="flex items-center gap-3"><span className="text-label text-fg-tertiary min-w-[90px]">Influencer</span><span className="text-sm text-fg-primary">{task.isInfluencer?"Yes ⭐":"No"}</span></div>
        </div>

        {task.photoPath&&<div className="bg-white border border-border rounded-md overflow-hidden shadow-sm"><img src={task.photoPath} alt={task.customerName} className="w-full h-64 object-cover"/></div>}
        {task.note&&<div className="bg-white border border-border rounded-md p-4 shadow-sm"><p className="text-label text-fg-tertiary mb-1">Note</p><p className="text-sm text-fg-secondary whitespace-pre-wrap">{task.note}</p></div>}

        <div className="bg-white border border-border rounded-md p-4 space-y-2 shadow-sm">
          <p className="text-label text-fg-tertiary">Activity</p>
          <p className="text-caption text-fg-secondary">Created by <span className="text-fg-primary">{task.createdBy}</span> on {new Date(task.createdAt).toLocaleString("en-IN")}</p>
          {task.updatedBy&&task.updatedAt&&<p className="text-caption text-fg-secondary">Updated by <span className="text-fg-primary">{task.updatedBy}</span> on {new Date(task.updatedAt).toLocaleString("en-IN")}</p>}
        </div>

        <div className="bg-white border border-border rounded-md p-4 space-y-3 shadow-sm">
          <StatusButtons currentStatus={task.status} nextStatuses={nextStatuses} onUpdate={handleStatusUpdate} />
          {userRole==="staff"&&task.status!=="Task Completed"&&<div className="pt-3 border-t border-border"><PingAdminButton taskId={task.id}/></div>}
        </div>

        {deleteConfirm&&<div className="dialog-overlay" onClick={()=>setDeleteConfirm(false)}><div className="dialog-content p-6" onClick={e=>e.stopPropagation()}><h3 className="text-heading-3 text-fg-primary mb-2">Delete?</h3><p className="text-small text-fg-secondary mb-6">Permanently delete <span className="text-fg-primary font-mono">{task.id}</span>?</p><div className="flex gap-3"><button onClick={()=>setDeleteConfirm(false)} className="btn-ghost flex-1">Cancel</button><button onClick={handleDelete} className="btn-danger flex-1">Delete</button></div></div></div>}
      </div>
    </AppLayout>
  );
}
