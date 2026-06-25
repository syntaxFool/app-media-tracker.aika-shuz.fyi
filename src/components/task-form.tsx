"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ImageUploader from "./image-uploader";

const SERVICES = ["Treatment","Haircut","Perming","Patch","Dread lock","Braid","Brand promo","Other"];
const GENDERS = ["Male","Female","Other"];

interface TaskFormProps {
  initialData?: { customerName?: string; shootDate?: string; dueDate?: string | null; service?: string; gender?: string; isInfluencer?: boolean; note?: string; photoPath?: string | null; assignedTo?: string[]; seriesId?: string | null; partNumber?: number | null };
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
    dueDate: initialData?.dueDate ? new Date(initialData.dueDate).toISOString().split("T")[0] : null as string | null,
    note: initialData?.note || "",
    photoPath: initialData?.photoPath || null as string | null,
    assignedTo: initialData?.assignedTo || [] as string[],
    seriesId: initialData?.seriesId || null as string | null,
    partNumber: initialData?.partNumber || null as number | null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [staffList, setStaffList] = useState<any[]>([]);
  const [assignedTo, setAssignedTo] = useState<string[]>(initialData?.assignedTo || []);
  const [isPartOfSeries, setIsPartOfSeries] = useState(!!initialData?.seriesId);
  const [seriesMode, setSeriesMode] = useState<"existing" | "new">(initialData?.seriesId ? "existing" : "new");
  const [existingSeries, setExistingSeries] = useState<{ seriesId: string; totalParts: number }[]>([]);
  const [newSeriesName, setNewSeriesName] = useState("");
  const [seriesLoading, setSeriesLoading] = useState(false);

  function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "series";
  }

  // Fetch existing series for the dropdown
  useEffect(() => {
    if (isPartOfSeries && mode === "create") {
      setSeriesLoading(true);
      fetch("/api/series")
        .then(r => r.ok ? r.json() : { series: [] })
        .then(d => setExistingSeries(d.series || []))
        .catch(() => {})
        .finally(() => setSeriesLoading(false));
    }
  }, [isPartOfSeries, mode]);

  useEffect(() => {
    fetch("/api/auth/me").then(r => { if (r.ok) r.json().then(d => {
      if (d.user.role === "admin" || d.user.role === "su") {
        fetch("/api/users").then(r => { if (r.ok) r.json().then(d2 => setStaffList((d2.users || []).filter((u: any) => u.role !== "su"))); });
      }
    }); });
  }, []);

  function updateField(field: string, value: any) { setForm(prev => ({ ...prev, [field]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    // Auto-compute seriesId for new series
    if (isPartOfSeries) {
      if (seriesMode === "new") {
        const slug = slugify(newSeriesName || form.customerName);
        updateField("seriesId", slug);
      }
    } else {
      updateField("seriesId", null);
      updateField("partNumber", null);
    }
    if (!form.customerName || !form.shootDate || !form.dueDate || !form.service || !form.gender) { setError("Please fill all required fields"); return; }
    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/tasks" : `/api/tasks/${taskId}`;
      const method = mode === "create" ? "POST" : "PUT";
      // Use current form state for series fields (updated via updateField inside handleSubmit)
      const body: any = { ...form, assignedTo };
      if (isPartOfSeries) {
        if (seriesMode === "new") {
          body.seriesId = slugify(newSeriesName || form.customerName);
        }
        // partNumber is auto-computed server-side if not set, or user-provided
      } else {
        body.seriesId = null;
        body.partNumber = null;
      }
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); return; }
      router.push(`/tasks/${data.task.id}`); router.refresh();
    } catch { setError("Network error"); } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
      <div><label className="block text-label text-fg-tertiary mb-1.5">Customer Name <span className="text-danger">*</span></label><input type="text" value={form.customerName} onChange={e => updateField("customerName", e.target.value)} className="input-linear w-full" placeholder="Enter customer name" required /></div>
      <div><label className="block text-label text-fg-tertiary mb-1.5">Shoot Date <span className="text-danger">*</span></label><input type="date" value={form.shootDate} onChange={e => updateField("shootDate", e.target.value)} className="input-linear w-full" required /></div>
      <div><label className="block text-label text-fg-tertiary mb-1.5">Due Date <span className="text-danger">*</span></label><input type="date" value={form.dueDate||""} onChange={e => updateField("dueDate", e.target.value||null)} className="input-linear w-full" required /></div>
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

      {staffList.length > 0 && (
        <div>
          <label className="block text-label text-fg-tertiary mb-1.5">Assign Staff</label>
          <div className="flex flex-wrap gap-1.5">
            {staffList.map((s: any) => {
              const isSelected = assignedTo.includes(s.username);
              return (
                <button key={s.id} type="button"
                  onClick={() => {
                    const next = isSelected ? assignedTo.filter(u => u !== s.username) : [...assignedTo, s.username];
                    setAssignedTo(next);
                  }}
                  className={`text-label px-2.5 py-1 rounded-sm border transition-colors ${isSelected ? "bg-primary text-white border-primary" : "bg-white dark:bg-gray-800 text-fg-tertiary border-border dark:border-gray-700 hover:border-primary/30"}`}
                >{s.username}{s.isSuperuser && <span className="ml-1 text-tiny">🔒</span>}</button>
              );
            })}
          </div>
        </div>
      )}

      {/* Series (Multi-Part) Section */}
      <div className="border border-border dark:border-gray-700 rounded-md p-4 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={isPartOfSeries}
              onChange={e => {
                setIsPartOfSeries(e.target.checked);
                if (!e.target.checked) {
                  updateField("seriesId", null);
                  updateField("partNumber", null);
                }
              }}
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-black/[0.08] border border-border rounded-full peer-checked:bg-primary/40 peer-checked:border-primary transition-all" />
            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full peer-checked:translate-x-4 peer-checked:bg-primary transition-all shadow-sm border border-border" />
          </div>
          <div>
            <span className="text-sm text-fg-primary">This task is part of a series</span>
            <p className="text-micro text-fg-quaternary">Group multi-part videos together (Part 1, Part 2, etc.)</p>
          </div>
        </label>

        {isPartOfSeries && (
          <div className="space-y-3 pl-0.5 animate-fade-in">
            {mode === "create" && !initialData?.seriesId ? (
              <>
                <div>
                  <label className="block text-label text-fg-tertiary mb-1.5">Series</label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setSeriesMode("existing")}
                      className={`text-label px-3 py-1.5 rounded-sm border transition-colors ${
                        seriesMode === "existing"
                          ? "bg-primary text-white border-primary"
                          : "bg-white dark:bg-gray-800 text-fg-tertiary border-border dark:border-gray-700"
                      }`}
                    >Select Existing</button>
                    <button
                      type="button"
                      onClick={() => setSeriesMode("new")}
                      className={`text-label px-3 py-1.5 rounded-sm border transition-colors ${
                        seriesMode === "new"
                          ? "bg-primary text-white border-primary"
                          : "bg-white dark:bg-gray-800 text-fg-tertiary border-border dark:border-gray-700"
                      }`}
                    >Create New</button>
                  </div>

                  {seriesMode === "existing" ? (
                    <select
                      value={form.seriesId || ""}
                      onChange={e => updateField("seriesId", e.target.value || null)}
                      className="select-linear w-full"
                    >
                      <option value="">Select a series...</option>
                      {seriesLoading && <option disabled>Loading...</option>}
                      {existingSeries.map(s => (
                        <option key={s.seriesId} value={s.seriesId}>
                          {s.seriesId} ({s.totalParts} part{s.totalParts !== 1 ? "s" : ""})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newSeriesName}
                      onChange={e => {
                        setNewSeriesName(e.target.value);
                        updateField("seriesId", slugify(e.target.value || form.customerName));
                      }}
                      className="input-linear w-full"
                      placeholder="e.g. Wedding Film — Sharma"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-label text-fg-tertiary mb-1.5">Part Number</label>
                  <input
                    type="number"
                    min={1}
                    value={form.partNumber || 1}
                    onChange={e => updateField("partNumber", parseInt(e.target.value) || 1)}
                    className="input-linear w-24"
                  />
                  <p className="text-tiny text-fg-quaternary mt-1">
                    {seriesMode === "existing" && form.seriesId
                      ? `Auto-suggested next part. Change if needed.`
                      : "Leave as 1 for the first part. Increment for each subsequent part."}
                  </p>
                </div>
              </>
            ) : (
              /* Edit mode: show current series context (read-only part number) */
              <>
                <div className="flex items-center gap-3">
                  <span className="text-label text-fg-tertiary min-w-[80px]">Series ID</span>
                  <input
                    type="text"
                    value={form.seriesId || ""}
                    onChange={e => updateField("seriesId", e.target.value || null)}
                    className="input-linear flex-1"
                    placeholder="series-id"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-label text-fg-tertiary min-w-[80px]">Part Number</span>
                  <input
                    type="number"
                    min={1}
                    value={form.partNumber || 1}
                    onChange={e => updateField("partNumber", parseInt(e.target.value) || null)}
                    className="input-linear w-24"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div><label className="block text-label text-fg-tertiary mb-1.5">Note</label><textarea value={form.note} onChange={e => updateField("note", e.target.value)} className="input-linear w-full min-h-[80px] resize-y" placeholder="Any additional notes..." rows={3} /></div>

      {error && <div className="text-danger text-caption bg-danger/5 border border-danger/10 rounded-sm px-3 py-2">{error}</div>}

      <button type="submit" disabled={submitting} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
        {submitting ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : mode === "create" ? "Create Task" : "Save Changes"}
      </button>
    </form>
  );
}
