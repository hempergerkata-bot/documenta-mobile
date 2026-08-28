/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#17233d',
    tint: '#f06f5f',

    // Core surfaces
    background: '#f8f7f3',
    foreground: '#17233d',

    // Cards / elevated surfaces
    card: '#ffffff',
    cardForeground: '#17233d',

    // Primary action color (buttons, links, active states)
    primary: '#f06f5f',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#e7eee9',
    secondaryForeground: '#264c4a',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#eeece6',
    mutedForeground: '#707887',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#f7d8aa',
    accentForeground: '#6e4524',

    // Destructive actions (delete, error states)
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#e1e3df',
    input: '#d3d7d2',

    // Product colors
    navy: '#17233d',
    coral: '#f06f5f',
    coralSoft: '#ffe1d8',
    sage: '#d9e8df',
    sageDeep: '#264c4a',
    sun: '#f7d8aa',
    lilac: '#e7def0',
    white: '#ffffff',
  },

  dark: {
    text: '#f7f4ed',
    tint: '#ff8575',
    background: '#17233d',
    foreground: '#f7f4ed',
    card: '#20304d',
    cardForeground: '#f7f4ed',
    primary: '#ff8575',
    primaryForeground: '#17233d',
    secondary: '#294a4a',
    secondaryForeground: '#e7f1ea',
    muted: '#283552',
    mutedForeground: '#aeb7c4',
    accent: '#665444',
    accentForeground: '#ffe5bc',
    destructive: '#ff716c',
    destructiveForeground: '#17233d',
    border: '#33415d',
    input: '#45516a',
    navy: '#f7f4ed',
    coral: '#ff8575',
    coralSoft: '#663f44',
    sage: '#294a4a',
    sageDeep: '#b9ded3',
    sun: '#665444',
    lilac: '#473d55',
    white: '#ffffff',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 22,
};

export default colors;
