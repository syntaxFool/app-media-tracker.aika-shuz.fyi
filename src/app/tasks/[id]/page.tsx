"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/layout";
import StatusBadge from "@/components/status-badge";
import StatusButtons from "@/components/status-buttons";
import PingAdminButton from "@/components/ping-admin-button";
import { ArrowLeft, Edit, Trash2, Calendar, Star, MessageSquare, CheckSquare, Plus, Clock } from "lucide-react";
import { STATUS_FLOW } from "@/lib/tasks";

const NEXT_STATUS = STATUS_FLOW;

export default function TaskDetailPage() {
  const params = useParams(); const router = useRouter(); const taskId = params.id as string;
  const [task, setTask] = useState<any>(null); const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("staff"); const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [currentUsername, setCurrentUsername] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [shotItems, setShotItems] = useState<any[]>([]);
  const [newShotDesc, setNewShotDesc] = useState("");
  const [activities, setActivities] = useState<any[]>([]);

  const fetchTask = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}`);
    if (res.ok) setTask((await res.json()).task);
    setLoading(false);
  }, [taskId]);

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}/comments`);
    if (res.ok) setComments((await res.json()).comments);
  }, [taskId]);

  const fetchShotItems = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}/shot-items`);
    if (res.ok) setShotItems((await res.json()).items);
  }, [taskId]);

  const fetchActivity = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}/activity`);
    if (res.ok) setActivities((await res.json()).activities);
  }, [taskId]);

  useEffect(() => {
    fetchTask(); fetchComments(); fetchShotItems(); fetchActivity();
    fetch("/api/auth/me").then(r => { if(r.ok) r.json().then(d => { setUserRole(d.user.role); setCurrentUsername(d.user.username); }); });
  }, [fetchTask, fetchComments, fetchShotItems, fetchActivity]);

  const isAssigned = Array.isArray(task?.assignedTo) ? (task.assignedTo as string[]).includes(currentUsername) : false;
  const canEdit = userRole === "admin" || userRole === "su" || isAssigned;

  async function handleStatusUpdate(newStatus: string) {
    await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({status:newStatus}) });
    await fetchTask();
  }

  async function handleDelete() {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    router.push("/"); router.refresh();
  }

  async function addComment() {
    if (!commentText.trim()) return;
    setCommentSubmitting(true);
    await fetch(`/api/tasks/${taskId}/comments`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({text:commentText}) });
    setCommentText("");
    setCommentSubmitting(false);
    fetchComments();
  }

  async function addShotItem() {
    if (!newShotDesc.trim()) return;
    await fetch(`/api/tasks/${taskId}/shot-items`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({description:newShotDesc}) });
    setNewShotDesc("");
    fetchShotItems();
  }

  async function toggleShotItem(itemId: number, completed: boolean) {
    await fetch(`/api/tasks/${taskId}/shot-items`, { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({itemId, completed:!completed}) });
    fetchShotItems();
  }

  async function deleteShotItem(itemId: number) {
    await fetch(`/api/tasks/${taskId}/shot-items`, { method: "DELETE", headers: {"Content-Type":"application/json"}, body: JSON.stringify({itemId}) });
    fetchShotItems();
  }

  // Due date check
  const dueDate = task?.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date();
  const isDueSoon = dueDate && !isOverdue && (dueDate.getTime() - Date.now() < 24*60*60*1000);

  if (loading) return <AppLayout><div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-black/10 border-t-primary rounded-full animate-spin" /></div></AppLayout>;
  if (!task) return <AppLayout><div className="text-center py-20"><p className="text-body text-fg-secondary">Task not found</p></div></AppLayout>;

  const nextStatuses = NEXT_STATUS[task.status] || [];
  const date = new Date(task.shootDate).toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  return (
    <AppLayout>
      <div className="p-4 max-w-3xl mx-auto space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={()=>router.back()} className="btn-icon p-1.5"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex-1"><div className="flex items-center gap-2"><span className="text-micro text-fg-quaternary font-mono">{task.id}</span><StatusBadge status={task.status} />{task.isInfluencer&&<Star className="w-3.5 h-3.5 text-accent" fill="currentColor"/>}</div></div>
          {(userRole === "admin" || userRole === "su") && <div className="flex gap-1"><button onClick={()=>router.push(`/tasks/${task.id}/edit`)} className="btn-subtle p-2"><Edit className="w-4 h-4"/></button><button onClick={()=>setDeleteConfirm(true)} className="btn-subtle p-2 hover:text-danger"><Trash2 className="w-4 h-4"/></button></div>}
        </div>

        <h1 className="text-heading-2 text-fg-primary">{task.customerName}</h1>

        {/* Due Date */}
        {dueDate && (
          <div className={`border rounded-md p-3 flex items-center gap-2 ${
            isOverdue ? "bg-danger/5 border-danger/20 text-danger" :
            isDueSoon ? "bg-warning/10 border-warning/20 text-warning" :
            "bg-white dark:bg-gray-900 border-border dark:border-gray-800"
          }`}>
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">
              {isOverdue ? "⚠️ Overdue — " : isDueSoon ? "⏰ Due soon — " : "Due: "}
              {dueDate.toLocaleDateString("en-IN", { weekday:"short", day:"numeric", month:"short" })}
            </span>
          </div>
        )}

        {/* Details */}
        <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 space-y-3 shadow-sm">
          <DetailRow icon={<Calendar className="w-4 h-4"/>} label="Shoot Date" value={date} />
          <DetailRow label="Service" value={task.service} />
          <DetailRow label="Gender" value={task.gender} />
          <DetailRow icon={<Star className="w-4 h-4"/>} label="Influencer" value={task.isInfluencer?"Yes ⭐":"No"} />
          {Array.isArray(task.assignedTo) && task.assignedTo.length > 0 && (
            <DetailRow label="Assigned" value={task.assignedTo.join(", ")} />
          )}
        </div>

        {task.photoPath&&<div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md overflow-hidden shadow-sm"><img src={task.photoPath} alt={task.customerName} className="w-full h-64 object-cover"/></div>}
        {task.note&&<div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 shadow-sm"><p className="text-label text-fg-tertiary mb-1">Note</p><p className="text-sm text-fg-secondary dark:text-gray-300 whitespace-pre-wrap">{task.note}</p></div>}

        {/* Shot List */}
        <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2"><CheckSquare className="w-4 h-4 text-fg-tertiary" /><p className="text-label text-fg-tertiary font-[510]">Shot List</p></div>
          {shotItems.length === 0 && <p className="text-caption text-fg-quaternary">No shot items yet. Add below.</p>}
          {shotItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <button onClick={() => toggleShotItem(item.id, item.completed)} className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${item.completed ? "bg-success border-success" : "border-border dark:border-gray-600"}`}>
                {item.completed && <span className="text-white text-tiny">✓</span>}
              </button>
              <span className={`text-sm flex-1 ${item.completed ? "text-fg-quaternary line-through" : "text-fg-primary dark:text-gray-200"}`}>{item.description}</span>
              {(userRole === "admin" || userRole === "su") && <button onClick={()=>deleteShotItem(item.id)} className="text-fg-quaternary hover:text-danger text-micro">✕</button>}
            </div>
          ))}
          <div className="flex gap-2">
            <input type="text" value={newShotDesc} onChange={e=>setNewShotDesc(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addShotItem()} className="input-linear flex-1 text-sm py-1.5" placeholder="Add shot item..." />
            <button onClick={addShotItem} className="btn-primary text-label px-3 py-1.5"><Plus className="w-3.5 h-3.5"/></button>
          </div>
        </div>

        {/* Comments */}
        <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-fg-tertiary"/><p className="text-label text-fg-tertiary font-[510]">Comments</p></div>
          {comments.length===0 && <p className="text-caption text-fg-quaternary">No comments yet.</p>}
          {comments.map((c) => (
            <div key={c.id} className="border-b border-border dark:border-gray-800 pb-2 last:border-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-micro font-[510] text-primary">{c.author}</span>
                <span className="text-tiny text-fg-quaternary">{new Date(c.createdAt).toLocaleString("en-IN")}</span>
              </div>
              <p className="text-sm text-fg-secondary dark:text-gray-300">{c.text}</p>
            </div>
          ))}
          <div className="flex gap-2">
            <input type="text" value={commentText} onChange={e=>setCommentText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addComment()} className="input-linear flex-1 text-sm py-1.5" placeholder="Add a comment..." />
            <button onClick={addComment} disabled={commentSubmitting} className="btn-primary text-label px-3 py-1.5">Send</button>
          </div>
        </div>

        {/* Activity */}
        <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 space-y-3 shadow-sm">
          <p className="text-label text-fg-tertiary">Activity</p>
          {activities.length === 0 && (
            <p className="text-caption text-fg-quaternary">No activity recorded yet.</p>
          )}
          {activities.map((a: any) => (
            <div key={a.id} className="flex gap-3 text-caption">
              <span className="text-fg-quaternary dark:text-gray-500 flex-shrink-0 w-[120px]">
                {new Date(a.createdAt).toLocaleString("en-IN")}
              </span>
              <span className="text-fg-secondary dark:text-gray-300">
                <span className="text-fg-primary dark:text-gray-100 font-[510]">{a.actor}</span>
                {" "}{a.detail}
              </span>
            </div>
          ))}
        </div>

        {/* Status Update */}
        <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 space-y-3 shadow-sm">
          {(userRole === "admin" || userRole === "su") ? (
            <>
              <p className="text-label text-fg-tertiary">Status (Admin)</p>
              <div className="flex gap-2">
                <select
                  defaultValue={task.status}
                  onChange={(e) => {
                    if (e.target.value !== task.status) handleStatusUpdate(e.target.value);
                  }}
                  className="select-linear flex-1"
                >
                  {Object.keys(STATUS_FLOW).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </>
          ) : isAssigned ? (
            <StatusButtons currentStatus={task.status} nextStatuses={nextStatuses} onUpdate={handleStatusUpdate} />
          ) : (
            <div className="text-caption text-fg-quaternary bg-surface dark:bg-gray-800 rounded-sm px-3 py-3 text-center border border-border dark:border-gray-700">
              🔒 You are not assigned to this task
            </div>
          )}
          {userRole==="staff"&&task.status!=="Task Completed"&&<div className="pt-3 border-t border-border dark:border-gray-800"><PingAdminButton taskId={task.id}/></div>}
        </div>

        {deleteConfirm&&<div className="dialog-overlay" onClick={()=>setDeleteConfirm(false)}><div className="dialog-content p-6" onClick={e=>e.stopPropagation()}><h3 className="text-heading-3 text-fg-primary mb-2">Delete?</h3><p className="text-small text-fg-secondary mb-6">Permanently delete <span className="text-fg-primary font-mono">{task.id}</span>?</p><div className="flex gap-3"><button onClick={()=>setDeleteConfirm(false)} className="btn-ghost flex-1">Cancel</button><button onClick={handleDelete} className="btn-danger flex-1">Delete</button></div></div></div>}
      </div>
    </AppLayout>
  );
}

function DetailRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-label text-fg-tertiary dark:text-gray-400 min-w-[90px]">{label}</span>
      <span className="text-sm text-fg-primary dark:text-gray-100 flex items-center gap-1.5">{icon}{value}</span>
    </div>
  );
}
