import { z } from "zod";

export const shortcutActions = [
  { id: "dashboard", label: "Dashboard", route: "/dashboard" },
  { id: "templates", label: "Templates", route: "/templates" },
  { id: "followUps", label: "Follow-ups", route: "/follow-ups" },
  { id: "settings", label: "Settings", route: "/settings" },
  { id: "startups", label: "Startups", route: "/startups" },
  { id: "newOutreach", label: "Add outreach", route: "/outreach/new" },
  { id: "search", label: "Focus search", route: null },
  { id: "help", label: "Show keyboard shortcuts", route: null },
] as const;
export type ShortcutAction = typeof shortcutActions[number]["id"];
export type ShortcutPreferences = { enabled: boolean; bindings: Record<ShortcutAction, string> };

// First-use defaults only: both dispatch and help read the saved user bindings.
export const defaultShortcutPreferences: ShortcutPreferences = {
  enabled: true,
  bindings: { dashboard: "g d", templates: "g t", followUps: "g f", settings: "g s", startups: "g l", newOutreach: "n", search: "/", help: "?" },
};

export function normalizeBinding(value: string): string | null {
  const strokes = value.trim().toLowerCase().replace(/\bthen\b/g, " ").split(/\s+/).filter(Boolean);
  if (!strokes.length) return "";
  if (strokes.length > 2) return null;
  const normalized: string[] = [];
  for (const stroke of strokes) {
    const parts = stroke.split("+");
    const key = parts.pop()!;
    const modifiers = new Set(parts.map(part => part === "cmd" ? "meta" : part === "control" ? "ctrl" : part));
    if ([...modifiers].some(part => !["ctrl", "meta", "alt", "shift"].includes(part)) || modifiers.size !== parts.length) return null;
    if (!(key.length === 1 && /^[!-~]$/.test(key)) || key === "+") return null;
    // Enter shifted punctuation directly ('?'), rather than Shift+/.
    if (modifiers.has("shift") && !/^[a-z]$/.test(key)) return null;
    // These combinations are reserved by browsers/OS and cannot reliably dispatch.
    if ((modifiers.has("ctrl") || modifiers.has("meta")) && "wrtlnpq".includes(key)) return null;
    normalized.push([...(["ctrl", "meta", "alt", "shift"].filter(part => modifiers.has(part))), key].join("+"));
  }
  return normalized.join(" ");
}

export const shortcutPreferencesSchema = z.object({
  enabled: z.boolean(),
  bindings: z.record(z.enum(["dashboard", "templates", "followUps", "settings", "startups", "newOutreach", "search", "help"]), z.string().max(80)),
}).superRefine((value, context) => {
  const assigned: { binding: string; label: string }[] = [];
  for (const action of shortcutActions) {
    const binding = normalizeBinding(value.bindings[action.id]);
    if (binding === null) {
      context.addIssue({ code: "custom", message: `${action.label}: use one or two keys, optionally with Ctrl, Meta, Alt, or Shift. Enter punctuation directly (such as ?). Browser-reserved combinations are unavailable.` });
      continue;
    }
    if (!binding) continue;
    const conflict = assigned.find(item => item.binding === binding || item.binding.startsWith(`${binding} `) || binding.startsWith(`${item.binding} `));
    if (conflict) context.addIssue({ code: "custom", message: `${action.label} conflicts with ${conflict.label}. Choose a different shortcut.` });
    assigned.push({ binding, label: action.label });
  }
}).transform(value => ({
  enabled: value.enabled,
  bindings: Object.fromEntries(shortcutActions.map(action => [action.id, normalizeBinding(value.bindings[action.id])!])) as Record<ShortcutAction, string>,
}));

export function keyboardStroke(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">) {
  const key = event.key.toLowerCase();
  // Shift is already represented in punctuation such as '?' and ':'.
  return [event.ctrlKey && "ctrl", event.metaKey && "meta", event.altKey && "alt", event.shiftKey && /^[a-z0-9]$/.test(key) && "shift", key].filter(Boolean).join("+");
}

export function formatBinding(value: string) {
  return value ? value.split(" ").map(stroke => stroke.split("+").map(key => key === "meta" ? "Cmd" : key === "ctrl" ? "Ctrl" : key.length === 1 ? key.toUpperCase() : key[0].toUpperCase() + key.slice(1)).join(" + ")).join(" then ") : "Not assigned";
}
