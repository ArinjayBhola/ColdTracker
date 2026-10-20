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
] as const;
export type FontId = typeof FONT_OPTIONS[number]["id"];
export type AppearancePreferences = {
  colorTheme: "default" | "blue" | "purple" | "green" | "orange" | "rose" | "teal";
  density: "comfortable" | "compact";
  bodyFont: FontId;
  headingFont: FontId;
  fontSize: number;
  reducedMotion: boolean;
};
export const DEFAULT_APPEARANCE: AppearancePreferences = { colorTheme: "default", density: "comfortable", bodyFont: "inter", headingFont: "fraunces", fontSize: 16, reducedMotion: false };
export const APPEARANCE_KEY = "coldtrack-appearance";

export function parseAppearance(raw: string | null): AppearancePreferences {
  let value: Partial<AppearancePreferences> = {};
  try { const parsed = JSON.parse(raw || "{}"); if (parsed && typeof parsed === "object") value = parsed; } catch { /* Use defaults for invalid saved settings. */ }
  return {
    colorTheme: ["default", "blue", "purple", "green", "orange", "rose", "teal"].includes(value.colorTheme || "") ? value.colorTheme! : "default",
    density: value.density === "compact" ? "compact" : "comfortable",
    bodyFont: FONT_OPTIONS.some(font => font.id === value.bodyFont) ? value.bodyFont! : "inter",
    headingFont: FONT_OPTIONS.some(font => font.id === value.headingFont) ? value.headingFont! : "fraunces",
    fontSize: typeof value.fontSize === "number" && Number.isFinite(value.fontSize) && value.fontSize >= 12 && value.fontSize <= 24 ? value.fontSize : 16,
    reducedMotion: value.reducedMotion === true,
  };
}

// Used both before hydration and when preferences change.
export function applyAppearance(preferences: AppearancePreferences) {
  const html = document.documentElement;
  html.dataset.density = preferences.density;
  html.dataset.theme = preferences.colorTheme;
  html.dataset.reducedMotion = String(preferences.reducedMotion);
  html.style.fontSize = `${preferences.fontSize}px`;
  html.style.setProperty("--app-body-font", FONT_OPTIONS.find(font => font.id === preferences.bodyFont)!.family);
  html.style.setProperty("--app-heading-font", FONT_OPTIONS.find(font => font.id === preferences.headingFont)!.family);
}
