"use client";

import { useAppConfig } from "@/hooks/use-app-config";

interface FilterBarProps {
  influencerFilter: string;
  serviceFilter: string;
  genderFilter: string;
  services: string[];
  onInfluencerChange: (value: string) => void;
  onServiceChange: (value: string) => void;
  onGenderChange: (value: string) => void;
}

export default function FilterBar({
  influencerFilter,
  serviceFilter,
  genderFilter,
  services,
  onInfluencerChange,
  onServiceChange,
  onGenderChange,
}: FilterBarProps) {
  const { config } = useAppConfig();
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <div className="flex items-center gap-1 bg-white border border-border rounded-sm px-2 py-1.5 flex-shrink-0 shadow-sm">
        <StarToggle
          active={influencerFilter === "true"}
          onClick={() => onInfluencerChange(influencerFilter === "true" ? "" : "true")}
        />
      </div>

      <select
        value={serviceFilter}
        onChange={(e) => onServiceChange(e.target.value)}
        className="select-linear text-label py-1.5 flex-shrink-0 min-w-[100px]"
      >
        <option value="">All Services</option>
        {services.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      <select
        value={genderFilter}
        onChange={(e) => onGenderChange(e.target.value)}
        className="select-linear text-label py-1.5 flex-shrink-0 min-w-[90px]"
      >
        <option value="">All Genders</option>
        {config.genders.map(g => <option key={g} value={g}>{g}</option>)}
      </select>
    </div>
  );
}

function StarToggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1 text-label transition-all ${active ? "text-accent" : "text-fg-quaternary"}`}>
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      <span>Influencer</span>
    </button>
  );
}
