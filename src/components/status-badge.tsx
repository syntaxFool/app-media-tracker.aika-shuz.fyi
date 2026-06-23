const STATUS_COLORS: Record<string, string> = {
  New: "bg-ocean/15 text-ocean border-ocean/30",
  "Video Shot": "bg-accent/10 text-accent border-accent/30",
  "Data Copied": "bg-primary/10 text-primary border-primary/30",
  "Video Edited": "bg-indigo-500/10 text-indigo-600 border-indigo-500/25",
  Reviewed: "bg-orange-500/10 text-orange-600 border-orange-500/25",
  Approved: "bg-violet-500/10 text-violet-600 border-violet-500/25",
  Uploaded: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25",
  "Task Completed": "bg-green-500/10 text-green-600 border-green-500/25",
  Dropped: "bg-black/10 text-fg-quaternary border-black/15",
};

export default function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || "bg-black/[0.04] text-fg-tertiary border-black/[0.06]";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-pill text-micro font-[510] border ${colors}`}>
      {status}
    </span>
  );
}
