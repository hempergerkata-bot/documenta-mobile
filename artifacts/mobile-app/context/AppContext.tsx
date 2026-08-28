import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type DocumentStatus = 'Offen' | 'Bezahlt' | 'Erledigt' | 'Später';

export type DocumentRecord = {
  id: string;
  title: string;
  sender: string;
  category: string;
  subcategory: string;
  documentType: string;
  documentDate: string;
  dueDate?: string;
  amount?: string;
  person: string;
  status: DocumentStatus;
  tags: string[];
  note?: string;
  uri?: string;
  mimeType?: string;
  pdfUri?: string;
  pageUris?: string[];
  createdAt: string;
};

export type PendingAsset = {
  uri: string;
  name: string;
  mimeType?: string;
  source: 'camera' | 'gallery' | 'file' | 'scanner';
  pdfUri?: string;
  pageUris?: string[];
  documentId?: string;
};

type StoredState = {
  checkIns: Record<string, boolean>;
  journalEntries: string[];
  documents: DocumentRecord[];
};

type AppContextValue = StoredState & {
  hydrated: boolean;
  pendingAsset: PendingAsset | null;
  toggleCheckIn: (id: string) => void;
  addJournalEntry: (entry: string) => void;
  removeJournalEntry: (entry: string) => void;
  addDocument: (document: DocumentRecord) => void;
  setPendingAsset: (asset: PendingAsset) => void;
  clearPendingAsset: () => void;
};

const STORAGE_KEY = '@documenta/app-state';

const sampleDocuments: DocumentRecord[] = [
  {
    id: 'sample-versicherung',
    title: 'Beitragsrechnung 2025',
    sender: 'Allianz Versicherung',
    category: 'Versicherungen',
    subcategory: 'Haftpflicht',
    documentType: 'Rechnung',
    documentDate: '12. Dez 2025',
    dueDate: '15. Jan 2026',
    amount: '128,40 €',
    person: 'Haushalt',
    status: 'Offen',
    tags: ['wichtig', 'versicherung'],
    note: 'Jahresbeitrag prüfen',
    createdAt: '2025-12-12T08:00:00.000Z',
  },
  {
    id: 'sample-krankenkasse',
    title: 'Bescheid zur Familienversicherung',
    sender: 'TK – Techniker Krankenkasse',
    category: 'Gesundheit',
    subcategory: 'Krankenkasse',
    documentType: 'Bescheid',
    documentDate: '09. Dez 2025',
    dueDate: '20. Dez 2025',
    person: 'Ich',
    status: 'Erledigt',
    tags: ['familie'],
    createdAt: '2025-12-09T08:00:00.000Z',
  },
  {
    id: 'sample-strom',
    title: 'Jahresabrechnung Strom',
    sender: 'Stadtwerke München',
    category: 'Wohnen',
    subcategory: 'Energie',
    documentType: 'Abrechnung',
    documentDate: '01. Dez 2025',
    dueDate: '31. Dez 2025',
    amount: '286,00 €',
    person: 'Haushalt',
    status: 'Später',
    tags: ['strom', '2025'],
    createdAt: '2025-12-01T08:00:00.000Z',
  },
];

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [checkIns, setCheckIns] = useState<Record<string, boolean>>({});
  const [journalEntries, setJournalEntries] = useState<string[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>(sampleDocuments);
  const [pendingAsset, setPendingAsset] = useState<PendingAsset | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!mounted || !stored) return;
        const parsed = JSON.parse(stored) as Partial<StoredState>;
        setCheckIns(parsed.checkIns ?? {});
        setJournalEntries(parsed.journalEntries ?? []);
        setDocuments(parsed.documents ?? sampleDocuments);
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setHydrated(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const state: StoredState = { checkIns, journalEntries, documents };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(
      () => undefined,
    );
  }, [checkIns, journalEntries, documents, hydrated]);

  const toggleCheckIn = useCallback((id: string) => {
    setCheckIns((current) => ({ ...current, [id]: !current[id] }));
  }, []);

  const addJournalEntry = useCallback((entry: string) => {
    setJournalEntries((current) => [entry, ...current]);
  }, []);

  const removeJournalEntry = useCallback((entry: string) => {
    setJournalEntries((current) => current.filter((item) => item !== entry));
  }, []);

  const addDocument = useCallback((document: DocumentRecord) => {
    setDocuments((current) => [document, ...current]);
  }, []);

  const clearPendingAsset = useCallback(() => {
    setPendingAsset(null);
  }, []);

  const value = useMemo(
    () => ({
      checkIns,
      journalEntries,
      documents,
      hydrated,
      pendingAsset,
      toggleCheckIn,
      addJournalEntry,
      removeJournalEntry,
      addDocument,
      setPendingAsset,
      clearPendingAsset,
    }),
    [
      checkIns,
      journalEntries,
      documents,
      hydrated,
      pendingAsset,
      toggleCheckIn,
      addJournalEntry,
      removeJournalEntry,
      addDocument,
      clearPendingAsset,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return context;
}