"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUploader from "./image-uploader";

const SERVICES = ["Wedding","Pre-Wedding","Engagement","Reception","Birthday","Baby Shoot","Maternity","Portfolio","Commercial","Product","Event","Other"];
const GENDERS = ["Male","Female","Other"];

interface TaskFormProps {
  initialData?: { customerName?: string; shootDate?: string; dueDate?: string | null; service?: string; gender?: string; isInfluencer?: boolean; note?: string; photoPath?: string | null };
  mode: "create" | "edit";
  taskId?: string;
}

export default function TaskForm({ initialData, mode, taskId }: TaskFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    customerName: initialData?.customerName || "",
    shootDate: initialData?.shootDate ? new Date(initialData.shootDate).toISOString().split("T")[0] : "",
    service: initialData?.service || "",
    gender: initialData?.gender || "",
    isInfluencer: initialData?.isInfluencer || false,
    dueDate: initialData?.dueDate || null as string | null,
    note: initialData?.note || "",
    photoPath: initialData?.photoPath || null as string | null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateField(field: string, value: any) { setForm(prev => ({ ...prev, [field]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!form.customerName || !form.shootDate || !form.service || !form.gender) { setError("Please fill all required fields"); return; }
    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/tasks" : `/api/tasks/${taskId}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); return; }
      router.push(`/tasks/${data.task.id}`); router.refresh();
    } catch { setError("Network error"); } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
      <div><label className="block text-label text-fg-tertiary mb-1.5">Customer Name <span className="text-danger">*</span></label><input type="text" value={form.customerName} onChange={e => updateField("customerName", e.target.value)} className="input-linear w-full" placeholder="Enter customer name" required /></div>
      <div><label className="block text-label text-fg-tertiary mb-1.5">Shoot Date <span className="text-danger">*</span></label><input type="date" value={form.shootDate} onChange={e => updateField("shootDate", e.target.value)} className="input-linear w-full" required /></div>
      <div><label className="block text-label text-fg-tertiary mb-1.5">Due Date</label><input type="date" value={form.dueDate||""} onChange={e => updateField("dueDate", e.target.value||null)} className="input-linear w-full" /><p className="text-micro text-fg-quaternary mt-0.5">Optional deadline for this task</p></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-label text-fg-tertiary mb-1.5">Service <span className="text-danger">*</span></label><select value={form.service} onChange={e => updateField("service", e.target.value)} className="select-linear w-full" required><option value="">Select...</option>{SERVICES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
        <div><label className="block text-label text-fg-tertiary mb-1.5">Gender <span className="text-danger">*</span></label><select value={form.gender} onChange={e => updateField("gender", e.target.value)} className="select-linear w-full" required><option value="">Select...</option>{GENDERS.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
      </div>

      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative"><input type="checkbox" checked={form.isInfluencer} onChange={e => updateField("isInfluencer", e.target.checked)} className="sr-only peer" /><div className="w-10 h-6 bg-black/[0.08] border border-border rounded-full peer-checked:bg-accent/40 peer-checked:border-accent transition-all" /><div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full peer-checked:translate-x-4 peer-checked:bg-accent transition-all shadow-sm border border-border" /></div>
          <div><span className="text-sm text-fg-primary">Is Influencer?</span><p className="text-micro text-fg-quaternary">Mark if this is an influencer shoot</p></div>
        </label>
      </div>

      <ImageUploader currentPhoto={form.photoPath} onPhotoChange={(path) => updateField("photoPath", path)} />

      <div><label className="block text-label text-fg-tertiary mb-1.5">Note</label><textarea value={form.note} onChange={e => updateField("note", e.target.value)} className="input-linear w-full min-h-[80px] resize-y" placeholder="Any additional notes..." rows={3} /></div>

      {error && <div className="text-danger text-caption bg-danger/5 border border-danger/10 rounded-sm px-3 py-2">{error}</div>}

      <button type="submit" disabled={submitting} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
        {submitting ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : mode === "create" ? "Create Task" : "Save Changes"}
      </button>
    </form>
  );
}
