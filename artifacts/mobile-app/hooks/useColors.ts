import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';

/**
 * Returns the design tokens for the current color scheme.
 *
 * The returned object contains all color tokens for the active palette
 * plus scheme-independent values like `radius`.
 *
 * Falls back to the light palette when no dark key is defined in
 * constants/colors.ts (the scaffold ships light-only by default).
 * When a sibling web artifact's dark tokens are synced into a `dark`
 * key, this hook will automatically switch palettes based on the
 * device's appearance setting.
 */
export function useColors() {
  const scheme = useColorScheme();
  const { settings } = useApp();
  const dark = settings.theme === 'dunkel' || (settings.theme === 'system' && scheme === 'dark');
  const palette = { ...(dark ? colors.dark : colors.light) };
  if (settings.accent === 'salbei') { palette.coral = palette.sageDeep; palette.coralSoft = palette.sage; }
  if (settings.accent === 'lila') { palette.coral = dark ? '#c9a9e8' : '#76558e'; palette.coralSoft = palette.lilac; }
  return { ...palette, radius: colors.radius, fontScale: settings.fontSize === 'klein' ? 0.9 : settings.fontSize === 'groß' ? 1.15 : 1 };
}
