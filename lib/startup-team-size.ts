export const TEAM_SIZE_FILTERS = [
  { value: "1-10", label: "1–10" },
  { value: "11-50", label: "11–50" },
  { value: "51-200", label: "51–200" },
  { value: "201-500", label: "201–500" },
  { value: "501-1000", label: "501–1,000" },
  { value: "1001+", label: "1,001+" },
  { value: "open", label: "Open-ended size" },
  { value: "other", label: "Other" },
] as const;

// Group reported ranges by their upper bound; never infer an exact headcount.
export function startupTeamSizeGroup(size: string | null): string {
  const value = size?.trim().replace(/[–—]/g, "-").replace(/,/g, "");
  if (!value) return "other";
  if (/^\d+\s*\+$/.test(value)) return "open";
  const match = value.match(/^(?:\d+\s*-\s*)?(\d+)$/) ?? value.match(/^<\s*(\d+)$/);
  if (!match) return "other";
  const upper = Number(match[1]);
  if (upper <= 10) return "1-10";
  if (upper <= 50) return "11-50";
  if (upper <= 200) return "51-200";
  if (upper <= 500) return "201-500";
  if (upper <= 1000) return "501-1000";
  return "1001+";
}
