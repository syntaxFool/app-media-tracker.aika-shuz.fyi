const STATUS_COLORS: Record<string, string> = {
  New: "bg-[#72cdf4]/8 text-[#006994] border-[#72cdf4]/20 dark:bg-[#72cdf4]/10 dark:text-[#72cdf4] dark:border-[#72cdf4]/20",
  "Video Shot": "bg-[#ffd200]/8 text-[#a07800] border-[#ffd200]/20 dark:bg-[#ffd200]/10 dark:text-[#ffd200] dark:border-[#ffd200]/20",
  "Data Copied": "bg-[#006994]/8 text-[#006994] border-[#006994]/20 dark:bg-[#006994]/10 dark:text-[#72cdf4] dark:border-[#006994]/20",
  "Video Edited": "bg-indigo-500/8 text-indigo-700 border-indigo-500/15 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/15",
  Reviewed: "bg-orange-500/8 text-orange-700 border-orange-500/15 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/15",
  Approved: "bg-violet-500/8 text-violet-700 border-violet-500/15 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/15",
  Uploaded: "bg-emerald-500/8 text-emerald-700 border-emerald-500/15 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/15",
  "Task Completed": "bg-green-500/8 text-green-700 border-green-500/15 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/15",
  Dropped: "bg-black/[0.04] text-fg-quaternary border-black/[0.08] dark:bg-white/[0.04] dark:text-gray-400 dark:border-white/[0.08]",
};

export default function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || "bg-black/[0.04] text-fg-tertiary border-black/[0.06] dark:bg-white/[0.04] dark:text-gray-400 dark:border-white/[0.06]";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-pill text-micro font-[590] border leading-tight ${colors}`}>
      {status}
    </span>
  );
}
