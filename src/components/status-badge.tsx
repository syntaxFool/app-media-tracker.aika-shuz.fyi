const STATUS_COLORS: Record<string, string> = {
  New: "bg-[#72cdf4]/15 text-[#006994] border-[#72cdf4]/30 dark:text-[#72cdf4] dark:border-[#72cdf4]/25",
  "Video Shot": "bg-[#ffd200]/15 text-[#b89400] border-[#ffd200]/30 dark:text-[#ffd200] dark:border-[#ffd200]/25",
  "Data Copied": "bg-[#006994]/15 text-[#006994] border-[#006994]/30 dark:text-[#72cdf4] dark:border-[#006994]/25",
  "Video Edited": "bg-indigo-500/15 text-indigo-700 border-indigo-500/25 dark:text-indigo-400 dark:border-indigo-500/20",
  Reviewed: "bg-orange-500/15 text-orange-700 border-orange-500/25 dark:text-orange-400 dark:border-orange-500/20",
  Approved: "bg-violet-500/15 text-violet-700 border-violet-500/25 dark:text-violet-400 dark:border-violet-500/20",
  Uploaded: "bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-400 dark:border-emerald-500/20",
  "Task Completed": "bg-green-500/15 text-green-700 border-green-500/25 dark:text-green-400 dark:border-green-500/20",
  Dropped: "bg-black/[0.06] text-fg-quaternary border-black/[0.10] dark:bg-white/[0.06] dark:text-gray-400 dark:border-white/[0.10]",
};

export default function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || "bg-black/[0.04] text-fg-tertiary border-black/[0.06] dark:bg-white/[0.04] dark:text-gray-400 dark:border-white/[0.06]";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-pill text-micro font-[590] border leading-tight ${colors}`}>
      {status}
    </span>
  );
}
