export const FONT_OPTIONS = [
  { id: "inter", label: "Inter", family: "var(--font-inter), sans-serif" },
  { id: "roboto", label: "Roboto", family: "var(--font-roboto), sans-serif" },
  { id: "open-sans", label: "Open Sans", family: "var(--font-open-sans), sans-serif" },
  { id: "lato", label: "Lato", family: "var(--font-lato), sans-serif" },
  { id: "montserrat", label: "Montserrat", family: "var(--font-montserrat), sans-serif" },
  { id: "poppins", label: "Poppins", family: "var(--font-poppins), sans-serif" },
  { id: "nunito", label: "Nunito", family: "var(--font-nunito), sans-serif" },
  { id: "source-sans", label: "Source Sans 3", family: "var(--font-source-sans), sans-serif" },
  { id: "fraunces", label: "Fraunces", family: "var(--font-fraunces), Georgia, serif" },
  { id: "jetbrains", label: "JetBrains Mono", family: "var(--font-jetbrains), monospace" },
  { id: "caveat", label: "Caveat", family: "var(--font-caveat), cursive" },
  { id: "kalam", label: "Kalam", family: "var(--font-kalam), cursive" },
  { id: "patrick-hand", label: "Patrick Hand", family: "var(--font-patrick-hand), cursive" },
  { id: "handlee", label: "Handlee", family: "var(--font-handlee), cursive" },
  { id: "indie-flower", label: "Indie Flower", family: "var(--font-indie-flower), cursive" },
  { id: "architects-daughter", label: "Architects Daughter", family: "var(--font-architects-daughter), cursive" },
] as const;
export const HANDWRITING_FONTS: readonly string[] = ["caveat", "kalam", "patrick-hand", "handlee", "indie-flower", "architects-daughter"];
export type FontId = typeof FONT_OPTIONS[number]["id"];
export const FONT_WEIGHTS = [
  { value: 200, label: "Extra Light" }, { value: 300, label: "Light" },
  { value: 400, label: "Regular" }, { value: 500, label: "Medium" },
  { value: 600, label: "Semi Bold" }, { value: 700, label: "Bold" },
  { value: 800, label: "Extra Bold" },
] as const;
export function availableFontWeights(font: FontId) {
  if (font === "caveat") return [400, 500, 600, 700];
  if (font === "kalam") return [300, 400, 700];
  if (HANDWRITING_FONTS.includes(font)) return [400];
  if (font === "lato") return [300, 400, 700];
  if (font === "open-sans") return [300, 400, 500, 600, 700, 800];
  return FONT_WEIGHTS.map(weight => weight.value);
}
export type AppearancePreferences = {
  colorTheme: "default" | "blue" | "purple" | "green" | "orange" | "rose" | "teal";
  font: FontId;
  fontWeight: number;
  fontSize: number;
  reducedMotion: boolean;
};
export const DEFAULT_APPEARANCE: AppearancePreferences = { colorTheme: "default", font: "inter", fontWeight: 400, fontSize: 16, reducedMotion: false };
export const APPEARANCE_KEY = "coldtrack-appearance";

export function parseAppearance(raw: string | null): AppearancePreferences {
  let value: Partial<AppearancePreferences> & { bodyFont?: FontId } = {};
  try { const parsed = JSON.parse(raw || "{}"); if (parsed && typeof parsed === "object") value = parsed; } catch { /* Use defaults for invalid saved settings. */ }
  const savedFont = value.font ?? value.bodyFont;
  const font = FONT_OPTIONS.some(font => font.id === savedFont) ? savedFont! : "inter";
  return {
    colorTheme: ["default", "blue", "purple", "green", "orange", "rose", "teal"].includes(value.colorTheme || "") ? value.colorTheme! : "default",
    font,
    fontWeight: availableFontWeights(font).includes(value.fontWeight ?? 400) ? value.fontWeight ?? 400 : 400,
    fontSize: typeof value.fontSize === "number" && Number.isFinite(value.fontSize) && value.fontSize >= 12 && value.fontSize <= 24 ? value.fontSize : 16,
    reducedMotion: value.reducedMotion === true,
  };
}

// Used both before hydration and when preferences change.
export function applyAppearance(preferences: AppearancePreferences) {
  const html = document.documentElement;
  html.removeAttribute("data-density");
  html.dataset.theme = preferences.colorTheme;
  html.dataset.reducedMotion = String(preferences.reducedMotion);
  // Root rem units control layout dimensions, so only change text tokens.
  html.style.removeProperty("font-size");
  html.style.setProperty("--app-text-size", `${preferences.fontSize}px`);
  html.style.setProperty("--app-font", FONT_OPTIONS.find(font => font.id === preferences.font)!.family);
  html.style.setProperty("--app-font-weight", String(preferences.fontWeight));
  html.style.removeProperty("--app-body-font");
  html.style.removeProperty("--app-heading-font");
}
