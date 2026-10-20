# Theme options — research and proposal

This is a proposal, not an implemented theme change.

## Existing app

The app uses shared CSS color roles for background, foreground, cards, popovers,
primary actions, muted text, borders, focus rings, and sidebar surfaces. Light and
dark modes currently use a warm amber palette. Appearance stores a colorTheme
value, but there are no corresponding palette selectors in the stylesheet.
Several outreach contact styles still use fixed brown/cream hex colors. These
must use shared color roles before every screen can follow a new palette.

## Proposed presets

Keep palette independent from Light / Dark / System and from font preferences.
Each palette should provide a complete light and dark set of surface, text,
border, interaction, and focus colors.

| Palette | Suggested direction |
| --- | --- |
| Warm Paper | Existing cream and terracotta identity |
| Ocean | Neutral surfaces with blue accents |
| Forest | Soft neutral surfaces with green accents |
| Lavender | Subtle violet accents |
| Rose | Muted rose accents |
| Graphite | Neutral grayscale with restrained accents |

These are proposed directions, not validated color specifications.

## Settings behavior

- Palette cards preview the sidebar, background, button, and text colors.
- Clicking previews the palette immediately; retain a reset option.
- Light/Dark/System remains a separate choice; changing palette preserves fonts,
  text size, font weight, reduced motion, and keyboard shortcuts.
- All screens, dialogs, dropdowns, hover states, and focus states use shared roles.
- Preserve the meaning of success, warning, and destructive colors across palettes.
- Start with curated palettes; consider custom accent colors after contrast and
  state colors can be generated and checked consistently.

## Research basis and verification needed

Material Design's color-role approach assigns colors to meaningful UI roles,
including paired foreground/background colors. This maps well to the app's
existing CSS variables:
https://m3.material.io/styles/color/the-color-system

WCAG 2.2's contrast guidance calls for at least 4.5:1 for normal text and 3:1 for
large text, subject to its stated exceptions. Proposed palettes still require
contrast measurements and review of small text, selected rows, muted labels,
buttons, and focus indicators in both modes:
https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html

Verify at 12–24 px, with all supported fonts, and across narrow and desktop
layouts before offering a palette as ready to use.
