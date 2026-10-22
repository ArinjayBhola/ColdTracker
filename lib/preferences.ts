import { z } from "zod";
import { DEFAULT_APPEARANCE, parseAppearance } from "@/lib/appearance";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" }, { href: "/startups", label: "Startups" },
  { href: "/dashboard/extension-leads", label: "Extension Leads" }, { href: "/follow-ups", label: "Follow-ups" },
  { href: "/templates", label: "Templates" }, { href: "/outreach/new", label: "Add Outreach" }, { href: "/stats", label: "Stats" },
] as const;
export const TABLE_COLUMNS = ["role", "status", "date", "followUp", "actions"] as const;
export const STATS_WIDGETS = ["metrics", "comparison", "heatmap", "funnel", "pipeline", "channels", "pending"] as const;
const route = z.enum(NAV_ITEMS.map(item => item.href));
export const preferencesSchema = z.object({
  appearance: z.object({ colorTheme: z.enum(["default", "blue", "purple", "green", "orange", "rose", "teal"]), font: z.string().max(40), fontWeight: z.number().int().min(200).max(800), fontSize: z.number().min(12).max(24), reducedMotion: z.boolean() }).transform(value => parseAppearance(JSON.stringify(value))).default(DEFAULT_APPEARANCE),
  mode: z.enum(["light", "dark", "system"]).default("light"),
  navigation: z.object({ order: z.array(route).max(7), hidden: z.array(route).max(7), landing: route }).default({ order: NAV_ITEMS.map(item => item.href), hidden: [], landing: "/dashboard" }),
  stats: z.object({ range: z.enum(["7", "30", "90", "all"]), widgets: z.array(z.enum(STATS_WIDGETS)).min(1).max(7), weekStartsOn: z.union([z.literal(0), z.literal(1)]) }).default({ range: "30", widgets: [...STATS_WIDGETS], weekStartsOn: 1 }),
  table: z.object({ columns: z.array(z.enum(TABLE_COLUMNS)).max(5), pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]), defaultMethod: z.enum(["ALL", "EMAIL", "LINKEDIN"]) }).default({ columns: [...TABLE_COLUMNS], pageSize: 10, defaultMethod: "ALL" }),
  followUp: z.object({ firstDelay: z.number().int().min(1).max(90), secondDelay: z.number().int().min(1).max(90), skipWeekends: z.boolean() }).default({ firstDelay: 5, secondDelay: 10, skipWeekends: false }),
});
export type AppPreferences = z.infer<typeof preferencesSchema>;
export const DEFAULT_PREFERENCES = preferencesSchema.parse({});
export function parsePreferences(value: unknown): AppPreferences {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const result = { ...DEFAULT_PREFERENCES };
  for (const key of Object.keys(preferencesSchema.shape) as (keyof AppPreferences)[]) {
    const parsed = preferencesSchema.shape[key].safeParse(source[key]);
    if (parsed.success) Object.assign(result, { [key]: parsed.data });
  }
  return result;
}
