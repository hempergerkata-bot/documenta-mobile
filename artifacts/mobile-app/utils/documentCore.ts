export const DOCUMENT_STATUSES = ['Neu', 'Gelesen', 'Zu erledigen', 'Antwort gesendet', 'Zu bezahlen', 'Bezahlt', 'Wartet', 'Abgeschlossen', 'Später'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];
export const GENERAL_CATEGORIES = ['Versicherung', 'Familie', 'Arbeit & Bildung', 'Finanzen', 'Gesundheit', 'Steuern', 'Bank', 'Auto', 'Wohnen', 'Schule/Kindergarten', 'Behörden', 'Verträge', 'Rechnungen', 'Sonstiges'] as const;
export type Feature = 'core' | 'aiAssistant' | 'gmail' | 'voice' | 'calendar' | 'tax' | 'family' | 'business' | 'enterprise';
export type Entitlements = Record<Feature, boolean>;
export type SearchableDocument = { title: string; sender: string; person: string; profileIds?: string[]; category: string; documentType: string; status: string; documentDate: string; amount?: string; tags: string[] };
export type DocumentFilters = Partial<{ query: string; profiles: string[]; category: string; documentType: string; status: string; dateFrom: string; dateTo: string; minAmount: number; maxAmount: number; tags: string[] }>;
/** Connection point for a future local or remote assistant; it deliberately has no backend implementation. */
export type DocumentQueryContext = { documents: SearchableDocument[]; filters?: DocumentFilters };
export interface DocumentQueryAdapter { query(context: DocumentQueryContext, prompt: string): Promise<{ answer: string; documentIds: string[] }> }
export type TaskLike = { completed: boolean; documentId: string; priority: 'niedrig' | 'mittel' | 'hoch'; dueDate?: string };
export function filterTasks<T extends TaskLike>(tasks: T[], filters: Partial<{ completed: boolean; documentId: string; priority: T['priority'] }>): T[] {
  return tasks.filter((task) => (filters.completed === undefined || task.completed === filters.completed) && (!filters.documentId || task.documentId === filters.documentId) && (!filters.priority || task.priority === filters.priority)).sort((a, b) => (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31'));
}
export const parseAmount = (value?: string) => Number((value ?? '').replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;
export function filterDocuments<T extends SearchableDocument>(documents: T[], filters: DocumentFilters): T[] {
  const query = filters.query?.trim().toLocaleLowerCase('de');
  return documents.filter((d) => {
    const terms = [d.title, d.sender, d.person, ...(d.profileIds ?? []), d.category, d.documentType, d.status, d.documentDate, d.amount ?? '', ...d.tags].join(' ').toLocaleLowerCase('de');
    const amount = parseAmount(d.amount);
    return (!query || terms.includes(query)) &&
      (!filters.profiles?.length || filters.profiles.some((p) => p === d.person || d.profileIds?.includes(p))) &&
      (!filters.category || d.category === filters.category) && (!filters.documentType || d.documentType === filters.documentType) &&
      (!filters.status || d.status === filters.status) && (!filters.tags?.length || filters.tags.every((tag) => d.tags.includes(tag))) &&
      (!filters.dateFrom || d.documentDate >= filters.dateFrom) && (!filters.dateTo || d.documentDate <= filters.dateTo) &&
      (filters.minAmount === undefined || amount >= filters.minAmount) && (filters.maxAmount === undefined || amount <= filters.maxAmount);
  });
}
export type ProfileLike = { id: string; name: string };
export function migrateProfileIds(ids: string[] | undefined, person: string, profiles: ProfileLike[]): string[] {
  const map = new Map(profiles.map((profile) => [profile.name.toLocaleLowerCase('de'), profile.id]));
  const translated = [...(ids ?? []), ...(person ? [person] : [])].map((value) => map.get(value.toLocaleLowerCase('de')) ?? value);
  return [...new Set(translated.filter((id) => profiles.some((profile) => profile.id === id)))];
}
export function hasFeature(feature: Feature, entitlements: Partial<Entitlements>): boolean {
  return feature === 'core' || entitlements[feature] === true;
}