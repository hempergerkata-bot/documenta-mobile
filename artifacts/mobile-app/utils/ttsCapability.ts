export type LocalVoice = Readonly<{ identifier?: string; lang: string; name?: string; quality?: string; localService?: boolean }>;
export function localVoicesForLocale(voices: readonly LocalVoice[], locale: string): LocalVoice[] {
  const normalized = locale.toLowerCase();
  const base = normalized.split('-')[0];
  return voices.filter((voice) => voice.localService === true && (voice.lang.toLowerCase() === normalized || voice.lang.toLowerCase().split('-')[0] === base));
}
export function matchingLocalVoice(voices: readonly LocalVoice[], locale: string): LocalVoice | undefined {
  const normalized = locale.toLowerCase();
  return localVoicesForLocale(voices, locale).find((voice) => voice.lang.toLowerCase() === normalized)
    ?? localVoicesForLocale(voices, locale)[0];
}
export function hasMatchingLocalVoice(voices: readonly LocalVoice[], locale: string): boolean {
  return Boolean(matchingLocalVoice(voices, locale));
}
export function selectedLocalVoice(voices: readonly LocalVoice[], locale: string, identifier?: string): LocalVoice | undefined {
  const candidates = localVoicesForLocale(voices, locale);
  return (identifier ? candidates.find((voice) => voice.identifier === identifier) : undefined) ?? matchingLocalVoice(candidates, locale);
}