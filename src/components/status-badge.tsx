// ── Status Badge — Color-coded status indicator ───────

const STATUS_COLORS: Record<string, string> = {
  New: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Video Shot": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Data Copied": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "Video Edited": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  Reviewed: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Uploaded: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Task Completed": "bg-green-500/10 text-green-400 border-green-500/20",
};

export default function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || "bg-white/[0.04] text-fg-tertiary border-white/[0.06]";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-pill text-micro font-[510] border ${colors}`}>
      {status}
    </span>
  );
}
