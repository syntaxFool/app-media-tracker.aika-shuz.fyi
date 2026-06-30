"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/layout";
import StatusBadge from "@/components/status-badge";
import StatusButtons from "@/components/status-buttons";
import PingAdminButton from "@/components/ping-admin-button";
import UrlCollector from "@/components/url-collector";
import { ArrowLeft, Edit, Trash2, Calendar, Star, MessageSquare, CheckSquare, Plus, Clock, ExternalLink, MoreVertical } from "lucide-react";
import { STATUS_FLOW, getAllowedNextStatuses, getDueDateStatus } from "@/lib/tasks";

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
  const [showUrlCollector, setShowUrlCollector] = useState(false);
  const [confirmAdminStatus, setConfirmAdminStatus] = useState<string | null>(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionTarget, setRejectionTarget] = useState("Data Copied");
  const [rejectionNote, setRejectionNote] = useState("");
  const [rejectionSubmitting, setRejectionSubmitting] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedReassignees, setSelectedReassignees] = useState<string[]>([]);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [taskUrls, setTaskUrls] = useState<any[]>([]);
  const [seriesParts, setSeriesParts] = useState<any[] | null>(null); // null = not fetched, [] = not in a series

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

  const fetchUrls = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}/urls`);
    if (res.ok) setTaskUrls((await res.json()).urls);
  }, [taskId]);

  const fetchSeries = useCallback(async (seriesId: string) => {
    const res = await fetch(`/api/series/${encodeURIComponent(seriesId)}`);
    if (res.ok) setSeriesParts((await res.json()).parts);
    else setSeriesParts([]);
  }, []);

  useEffect(() => {
    fetchTask(); fetchComments(); fetchShotItems(); fetchActivity(); fetchUrls();
    fetch("/api/auth/me").then(r => { if(r.ok) r.json().then(d => { setUserRole(d.user.role); setCurrentUsername(d.user.username); }); });
  }, [fetchTask, fetchComments, fetchShotItems, fetchActivity, fetchUrls]);

  // Fetch series siblings when task loads
  useEffect(() => {
    if (task?.seriesId) {
      fetchSeries(task.seriesId);
    } else if (task && !task.seriesId) {
      setSeriesParts([]);
    }
  }, [task?.seriesId, fetchSeries]);

  const isAssigned = Array.isArray(task?.assignedTo) ? (task.assignedTo as string[]).includes(currentUsername) : false;
  const canEdit = userRole === "admin" || userRole === "su" || isAssigned;

  async function handleStatusUpdate(newStatus: string) {
    if (newStatus === "Task Completed" && task.status === "Uploaded") {
      setShowUrlCollector(true);
      return;
    }
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({status:newStatus}) });
      if (!res.ok) throw new Error((await res.json()).error || "Status update failed");
      await fetchTask();
      await fetchActivity();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleUrlCollectionComplete() {
    setShowUrlCollector(false);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({status:"Task Completed"}) });
      if (!res.ok) throw new Error((await res.json()).error || "Completion failed");
      await fetchTask();
      await fetchActivity();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
      router.push("/"); router.refresh();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function addComment() {
    if (!commentText.trim()) return;
    setCommentSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({text:commentText}) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to add comment");
      setCommentText("");
      fetchComments();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function addShotItem() {
    if (!newShotDesc.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/shot-items`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({description:newShotDesc}) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to add shot item");
      setNewShotDesc("");
      fetchShotItems();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function toggleShotItem(itemId: number, completed: boolean) {
    try {
      const res = await fetch(`/api/tasks/${taskId}/shot-items`, { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({itemId, completed:!completed}) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update shot item");
      fetchShotItems();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function deleteShotItem(itemId: number) {
    try {
      const res = await fetch(`/api/tasks/${taskId}/shot-items`, { method: "DELETE", headers: {"Content-Type":"application/json"}, body: JSON.stringify({itemId}) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to delete shot item");
      fetchShotItems();
    } catch (e: any) {
      alert(e.message);
    }
  }

  // Due date check (calendar-day granularity)
  const dueDate = task?.dueDate ? new Date(task.dueDate) : null;
  const dueStatus = getDueDateStatus(task?.dueDate, task?.status || "");
  const isOverdue = dueStatus === "overdue";
  const isDueToday = dueStatus === "due-today";
  const isDueSoon = dueStatus === "due-soon";

  if (loading) return <AppLayout><div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-black/10 border-t-primary rounded-full animate-spin" /></div></AppLayout>;
  if (!task) return <AppLayout><div className="text-center py-20"><p className="text-body text-fg-secondary">Task not found</p></div></AppLayout>;

  const nextStatuses = getAllowedNextStatuses(task, userRole);
  const date = new Date(task.shootDate).toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  return (
    <AppLayout>
      <div className="p-4 max-w-3xl mx-auto space-y-5 animate-fade-in pb-32">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={()=>router.back()} className="btn-icon p-1.5"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex-1"><div className="flex items-center gap-2"><span className="text-micro text-fg-quaternary font-mono">{task.id}</span><StatusBadge status={task.status} />{task.isInfluencer&&<Star className="w-3.5 h-3.5 text-accent" fill="currentColor"/>}</div></div>
          {(userRole === "admin" || userRole === "su") && (
            <div className="relative">
              <button onClick={() => setHeaderMenuOpen(!headerMenuOpen)} className="btn-subtle p-2"><MoreVertical className="w-4 h-4"/></button>
              {headerMenuOpen && (
                <>
                  <div className="fixed inset-0 z-50" onClick={() => setHeaderMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-900 border border-border dark:border-gray-700 rounded-lg shadow-elev-dialog z-50 overflow-hidden animate-scale-in origin-top-right">
                    <button onClick={() => { setHeaderMenuOpen(false); router.push(`/tasks/${task.id}/edit`); }} className="w-full text-left px-4 py-2.5 text-sm text-fg-primary dark:text-gray-200 hover:bg-surface dark:hover:bg-gray-800 flex items-center gap-2.5 transition-colors">
                      <Edit className="w-4 h-4 text-fg-tertiary dark:text-gray-400" />
                      Edit Task
                    </button>
                    <div className="border-t border-border dark:border-gray-700" />
                    <button onClick={() => { setHeaderMenuOpen(false); setDeleteConfirm(true); }} className="w-full text-left px-4 py-2.5 text-sm text-danger hover:bg-surface dark:hover:bg-gray-800 flex items-center gap-2.5 transition-colors">
                      <Trash2 className="w-4 h-4" />
                      Delete Task
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <h1 className="text-heading-2 text-fg-primary dark:text-white font-semibold">{task.customerName}</h1>

        {/* Due Date */}
        {dueDate && (
          <div className={`border rounded-md p-3 flex items-center gap-2 ${
            isOverdue ? "bg-danger/5 border-danger/20 text-danger dark:text-red-300" :
            isDueSoon ? "bg-warning/10 border-warning/20 text-warning dark:text-amber-300" :
            "bg-white dark:bg-gray-900 border-border dark:border-gray-800 dark:text-gray-100"
          }`}>
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">
              {isOverdue ? "Overdue — " : isDueSoon ? "Due soon — " : "Due: "}
              {dueDate.toLocaleDateString("en-IN", { weekday:"short", day:"numeric", month:"short" })}
            </span>
          </div>
        )}

        {/* Details */}
        <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 space-y-3 shadow-sm">
          <DetailRow icon={<Calendar className="w-4 h-4"/>} label="Shoot Date" value={date} />
          <DetailRow label="Service" value={task.service} />
          <DetailRow label="Gender" value={task.gender} />
          {/* Influencer row removed — star in header is sufficient */}
          {Array.isArray(task.assignedTo) && task.assignedTo.length > 0 && (
            <DetailRow label="Assigned" value={task.assignedTo.join(", ")} />
          )}
        </div>

        {/* Series context widget */}
        {seriesParts && seriesParts.length > 1 && (
          <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📹</span>
              <div>
                <p className="text-label font-[510] text-fg-primary dark:text-gray-100">
                  {seriesParts.find((p: any) => p.seriesId)?.seriesId?.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || "Series"}
                </p>
                <p className="text-tiny text-fg-quaternary dark:text-gray-500">{seriesParts.length} parts</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {seriesParts
                .sort((a: any, b: any) => (a.partNumber || 0) - (b.partNumber || 0))
                .map((part: any) => {
                  const isCurrent = part.id === taskId;
                  return (
                    <div
                      key={part.id}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-sm transition-colors ${
                        isCurrent
                          ? "bg-primary/5 border border-primary/20"
                          : "hover:bg-surface dark:hover:bg-gray-800 border border-transparent"
                      }`}
                    >
                      <span className="text-tiny font-mono text-fg-quaternary dark:text-gray-500 w-8 flex-shrink-0">
                        P{part.partNumber || "?"}
                      </span>
                      {isCurrent ? (
                        <span className="text-sm font-[510] text-fg-primary dark:text-gray-100 flex-1">
                          {part.customerName} <span className="text-tiny font-normal text-fg-quaternary">(current)</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => router.push(`/tasks/${part.id}`)}
                          className="text-sm text-fg-primary dark:text-gray-100 flex-1 text-left hover:text-primary transition-colors"
                        >
                          {part.customerName}
                        </button>
                      )}
                      <StatusBadge status={part.status} />
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {task.rejectionNote && (() => {
          const isDropped = task.status === "Dropped";
          return (
            <div className={`${isDropped ? "bg-gray-500/5 border-gray-400/20" : "bg-danger/5 border-danger/20"} border rounded-md p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-micro font-[590] text-white px-2 py-0.5 rounded-pill ${isDropped ? "bg-gray-400" : "bg-danger"}`}>
                  {isDropped ? "Discarded" : "Fix Required"}
                </span>
                {task.rejectedBy && (
                  <span className="text-tiny text-fg-quaternary">
                    Rejected by {task.rejectedBy}
                    {task.rejectedAt && <> on {new Date(task.rejectedAt).toLocaleDateString("en-IN")}</>}
                  </span>
                )}
              </div>
              <p className="text-sm text-fg-secondary dark:text-gray-300 italic">"{task.rejectionNote}"</p>
            </div>
          );
        })()}

        {task.photoPath&&<div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md overflow-hidden shadow-sm"><img src={task.photoPath} alt={task.customerName} className="w-full h-64 object-cover"/></div>}
        {task.note&&<div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 shadow-sm"><p className="text-label text-fg-tertiary mb-1">Note</p><p className="text-sm text-fg-secondary dark:text-gray-300 whitespace-pre-wrap">{task.note}</p></div>}

        {/* URLs */}
        {taskUrls.length > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-fg-tertiary" />
              <p className="text-label text-fg-tertiary font-[510]">URLs</p>
            </div>
            {taskUrls.map((u: any) => {
              const platformName = u.platform === "Custom" ? (u.label || u.platform) : u.platform;
              const hostname = (() => { try { return new URL(u.url).hostname; } catch { return u.url; } })();
              return (
                <a
                  key={u.id}
                  href={u.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm bg-surface dark:bg-gray-800 rounded-md px-3 py-2.5 border border-border dark:border-gray-700 hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.99]"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                    <ExternalLink className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-[510] text-fg-primary dark:text-gray-100 truncate">
                      View on {platformName}
                    </p>
                    <p className="text-tiny text-fg-quaternary dark:text-gray-500 truncate max-w-full" title={u.url}>
                      {hostname}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        )}

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
            <input type="text" value={newShotDesc} onChange={e=>setNewShotDesc(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addShotItem()} className="input-linear flex-1 text-sm" placeholder="Add shot item..." />
            <button onClick={addShotItem} className="btn-primary text-label px-3 py-1.5 rounded-sm"><Plus className="w-3.5 h-3.5"/></button>
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
                <span className="text-tiny text-fg-quaternary">{formatActivityTime(c.createdAt)}</span>
              </div>
              <p className="text-sm text-fg-secondary dark:text-gray-300">{c.text}</p>
            </div>
          ))}
          <div className="flex gap-2">
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }}
              className="input-linear flex-1 text-sm resize-none min-h-[36px] leading-5 py-2"
              placeholder="Add a comment..."
              rows={1}
              onInput={(e) => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }}
            />
            <button onClick={addComment} disabled={commentSubmitting} className="btn-primary text-label px-3 rounded-sm self-start">Send</button>
          </div>
        </div>

        {/* Activity */}
        <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 space-y-3 shadow-sm">
          <p className="text-label text-fg-tertiary">Activity</p>
          {consolidatedActivities(activities).length === 0 && (
            <p className="text-caption text-fg-quaternary">No activity recorded yet.</p>
          )}
          {consolidatedActivities(activities).map((a: any, idx: number) => {
            const detailText = a.detail || "";
            // Replace raw URLs with a clean anchor snippet
            const urlPattern = /https?:\/\/[^\s<]+/g;
            const cleanedDetail = detailText.replace(urlPattern, (url: string) => {
              try {
                const host = new URL(url).hostname;
                return `<a href="${url}" target="_blank" class="text-primary hover:underline">${host}</a>`;
              } catch {
                return `<a href="${url}" target="_blank" class="text-primary hover:underline">Link</a>`;
              }
            });
            return (
              <div key={a.id || idx} className="flex gap-3 text-caption">
                <span className="text-fg-quaternary dark:text-gray-500 flex-shrink-0 w-[120px]">
                  {formatActivityTime(a.createdAt)}
                </span>
                <span className="text-fg-secondary dark:text-gray-300"
                  dangerouslySetInnerHTML={{
                    __html: `<span class="text-fg-primary dark:text-gray-100 font-[510]">${escapeHtml(a.actor)}</span> ${cleanedDetail}`
                  }}
                />
              </div>
            );
          })}
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
                    const newStatus = e.target.value;
                    if (newStatus !== task.status) {
                      // Dropped always requires a reason, regardless of current status
                      if (newStatus === "Dropped" || (task.status === "Reviewed" && newStatus === "Data Copied")) {
                        setRejectionTarget(newStatus);
                        fetch("/api/users").then(r => { if (r.ok) r.json().then(d => setStaffList((d.users || []).filter((u: any) => u.role !== "su"))); }).catch(() => {});
                        setSelectedReassignees(task.assignedTo || []);
                        setShowRejectionModal(true);
                      } else {
                        setConfirmAdminStatus(newStatus);
                      }
                    }
                  }}
                  className="select-linear flex-1"
                >
                  {Object.keys(STATUS_FLOW).filter(s => {
                    if (task.status === "Reviewed") return s !== "Dropped" && s !== "Data Copied";
                    return true;
                  }).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  {task.status === "Reviewed" && (
                    <>
                      <option value="Data Copied" className="text-red-600 dark:text-red-400 font-semibold" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}>⛔ Rejected</option>
                      <option value="Dropped">Dropped</option>
                    </>
                  )}
                </select>
              </div>

              {confirmAdminStatus && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center animate-fade-in" onClick={() => setConfirmAdminStatus(null)}>
                  <div className="bg-white dark:bg-gray-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-sm p-6 shadow-elev-dialog animate-slide-up" onClick={e => e.stopPropagation()}>
                    <h3 className="text-heading-3 text-fg-primary mb-2">Save changes?</h3>
                    <p className="text-small text-fg-secondary mb-6">
                      Move task to <span className="font-[590] text-fg-primary">{confirmAdminStatus}</span>?
                    </p>
                    <div className="flex gap-3">
                      <button onClick={() => setConfirmAdminStatus(null)} className="btn-ghost flex-1">Cancel</button>
                      <button onClick={async () => { const s = confirmAdminStatus; setConfirmAdminStatus(null); await handleStatusUpdate(s!); }} className="btn-primary flex-1">Save</button>
                    </div>
                  </div>
                </div>
              )}

              {showRejectionModal && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center animate-fade-in"
                  onClick={() => { if (!rejectionSubmitting) { setShowRejectionModal(false); setRejectionNote(""); }}}>
                  <div className="bg-white dark:bg-gray-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-sm p-6 shadow-elev-dialog animate-slide-up"
                    onClick={e => e.stopPropagation()}>
                    <h3 className="text-heading-3 text-fg-primary mb-2">{rejectionTarget === "Dropped" ? "Discard Task" : "Reject Task"}</h3>
                    <p className="text-small text-fg-secondary mb-4">
                      Move <span className="font-mono text-fg-primary">{task.id}</span> from <strong>Reviewed</strong>
                      {rejectionTarget === "Dropped" ? <> to <strong>Dropped</strong></> : <> back to <strong>Data Copied</strong></>}.
                    </p>
                    <textarea
                      value={rejectionNote}
                      onChange={(e) => setRejectionNote(e.target.value)}
                      className="input-linear w-full text-sm p-3 min-h-[100px] mb-4"
                      placeholder="Describe what needs to be fixed..."
                      autoFocus
                    />

                    {staffList.length > 0 && (
                      <div className="mb-4">
                        <label className="block text-label text-fg-tertiary mb-1.5">Reassign to</label>
                        <div className="flex flex-wrap gap-1.5">
                          {staffList.map((s: any) => {
                            const isSelected = selectedReassignees.includes(s.username);
                            return (
                              <button key={s.id} type="button"
                                onClick={() => {
                                  const next = isSelected
                                    ? selectedReassignees.filter((u: string) => u !== s.username)
                                    : [...selectedReassignees, s.username];
                                  setSelectedReassignees(next);
                                }}
                                className={`text-label px-2.5 py-1 rounded-sm border transition-colors ${
                                  isSelected
                                    ? "bg-primary text-white border-primary"
                                    : "bg-white dark:bg-gray-800 text-fg-tertiary border-border dark:border-gray-700 hover:border-primary/30"
                                }`}
                              >{s.username}</button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => { setShowRejectionModal(false); setRejectionNote(""); }}
                        className="btn-ghost flex-1"
                        disabled={rejectionSubmitting}
                      >Cancel</button>
                      {rejectionTarget === "Dropped" ? (
                        <button
                          onClick={async () => {
                            if (!rejectionNote.trim()) return;
                            setRejectionSubmitting(true);
                            await fetch(`/api/tasks/${taskId}`, {
                              method: "PUT",
                              headers: {"Content-Type":"application/json"},
                              body: JSON.stringify({ status: "Dropped", rejectionNote: rejectionNote.trim() }),
                            });
                            setRejectionSubmitting(false);
                            setShowRejectionModal(false);
                            setRejectionNote("");
                            await fetchTask();
                            await fetchActivity();
                          }}
                          className="btn-ghost flex-1 text-fg-quaternary border border-border"
                          disabled={rejectionSubmitting || !rejectionNote.trim()}
                        >
                          {rejectionSubmitting ? "..." : "Discard"}
                        </button>
                      ) : (
                        <button
                        onClick={async () => {
                          if (!rejectionNote.trim()) return;
                          setRejectionSubmitting(true);
                          const body: any = { status: "Data Copied", rejectionNote: rejectionNote.trim() };
                          if (selectedReassignees.length > 0) {
                            body.assignedTo = selectedReassignees;
                          }
                          await fetch(`/api/tasks/${taskId}`, {
                            method: "PUT",
                            headers: {"Content-Type":"application/json"},
                            body: JSON.stringify(body),
                          });
                          setRejectionSubmitting(false);
                          setShowRejectionModal(false);
                          setRejectionNote("");
                          await fetchTask();
                          await fetchActivity();
                        }}
                        className="btn-danger flex-1"
                        disabled={rejectionSubmitting || !rejectionNote.trim()}
                      >
                        {rejectionSubmitting ? "Rejecting..." : "Reject & Send Back"}
                      </button>
                    )}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : isAssigned ? (
            <StatusButtons currentStatus={task.status} nextStatuses={nextStatuses} onUpdate={handleStatusUpdate} />
          ) : (
            <div className="text-caption text-fg-quaternary bg-surface dark:bg-gray-800 rounded-sm px-3 py-3 text-center border border-border dark:border-gray-700">
              🔒 You are not assigned to this task
            </div>
          )}
          {userRole==="staff"&&task.status!=="Task Completed"&&task.status!=="Dropped"&&<div className="pt-3 border-t border-border dark:border-gray-800"><PingAdminButton taskId={task.id}/></div>}
        </div>

        {deleteConfirm&&<div className="dialog-overlay" onClick={()=>setDeleteConfirm(false)}><div className="dialog-content p-6" onClick={e=>e.stopPropagation()}><h3 className="text-heading-3 text-fg-primary mb-2">Delete?</h3><p className="text-small text-fg-secondary mb-6">Permanently delete <span className="text-fg-primary font-mono">{task.id}</span>?</p><div className="flex gap-3"><button onClick={()=>setDeleteConfirm(false)} className="btn-ghost flex-1">Cancel</button><button onClick={handleDelete} className="btn-danger flex-1">Delete</button></div></div></div>}
      </div>
      {showUrlCollector && (
        <UrlCollector
          taskId={taskId}
          onComplete={handleUrlCollectionComplete}
          onCancel={() => setShowUrlCollector(false)}
        />
      )}
    </AppLayout>
  );
}

/** Escape HTML special chars so we can safely inject user text into innerHTML */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Consolidate sequential status changes by the same actor within 5
 * minutes into a single summary line, and clean up raw URL display.
 */
function consolidatedActivities(activities: any[]): any[] {
  if (!activities || activities.length === 0) return [];
  const sorted = [...activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const result: any[] = [];
  let i = 0;
  while (i < sorted.length) {
    const current = sorted[i];
    const currentTime = new Date(current.createdAt).getTime();
    const batch: any[] = [current];
    let j = i + 1;
    while (j < sorted.length) {
      const next = sorted[j];
      const nextTime = new Date(next.createdAt).getTime();
      if (
        next.actor === current.actor &&
        next.action === "status_change" &&
        currentTime - nextTime < 5 * 60 * 1000
      ) {
        batch.push(next);
        j++;
      } else {
        break;
      }
    }

    if (batch.length > 1) {
      const statuses = batch.map((b: any) => {
        const m = b.detail?.match(/to\s+([A-Za-z ]+)/i);
        return m ? m[1].trim() : "?";
      });
      const from = statuses[statuses.length - 1];
      const to = statuses[0];
      result.push({
        id: batch[0].id,
        actor: batch[0].actor,
        createdAt: batch[0].createdAt,
        action: "status_change",
        detail: `updated status from ${from} → ${to}`,
      });
    } else {
      result.push(current);
    }
    i = j;
  }
  return result;
}

function formatActivityTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });

  if (dateOnly.getTime() === today.getTime()) return `Today, ${time}`;
  if (dateOnly.getTime() === yesterday.getTime()) return `Yesterday, ${time}`;

  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) + `, ${time}`;
}

function DetailRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-label text-fg-tertiary dark:text-gray-400 min-w-[90px]">{label}</span>
      <span className="text-sm text-fg-primary dark:text-gray-100 flex items-center gap-1.5">{icon}{value}</span>
    </div>
  );
}
