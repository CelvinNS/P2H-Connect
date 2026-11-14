import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, cleanForFirestore } from '../firebase';
import { P2HRecord, P2H_CHECKLIST_DATA, P2H_CHECKLIST_BUS, P2HChecklistItem, UnitReadinessStatus } from '../types/p2h';

const STORAGE_KEY = 'p2h_inspections_data_v1';
const COLLECTION_NAME = 'p2h_inspections';

export function calculateRecordStatus(
  items: Record<string, { condition: 'baik' | 'rusak'; note?: string }>,
  customChecklist?: P2HChecklistItem[],
  unitConditionStatus?: UnitReadinessStatus
): 'siap_operasi' | 'stop_operasi' | 'perlu_perbaikan' {
  // Jika status kesiapan unit adalah BD (Breakdown), unit otomatis TIDAK LAYAK OPERASI (stop_operasi)
  if (unitConditionStatus === 'BD') {
    return 'stop_operasi';
  }

  let hasAA = false;
  let hasA = false;

  const targetList = customChecklist || [...P2H_CHECKLIST_DATA, ...P2H_CHECKLIST_BUS];

  for (const item of targetList) {
    const status = items[item.id];
    if (status && status.condition === 'rusak') {
      if (item.dangerCode === 'AA') {
        hasAA = true;
      } else {
        hasA = true;
      }
    }
  }

  if (hasAA) return 'stop_operasi';
  if (hasA) return 'perlu_perbaikan';
  return 'siap_operasi';
}

// Return empty array - no dummy records seeded
export function getSampleRecords(): P2HRecord[] {
  return [];
}

const DELETED_IDS_KEY = 'p2h_deleted_inspection_ids_v1';
const SEED_ATTEMPTED_KEY = 'p2h_demo_seed_status_v1';

export function getDeletedInspectionIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse deleted ids', e);
  }
  return [];
}

export function markInspectionAsDeleted(id: string): void {
  try {
    const current = getDeletedInspectionIds();
    if (!current.includes(id)) {
      const updated = [...current, id];
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Failed to mark inspection as deleted', e);
  }
}

// Local cache helper
const DUMMY_IDS = ['p2h-demo-01', 'p2h-demo-02', 'p2h-demo-03'];

export function getLocalRecords(): P2HRecord[] {
  const deletedSet = new Set([...getDeletedInspectionIds(), ...DUMMY_IDS]);
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (r) => !deletedSet.has(r.id) && !r.id.includes('demo') && !DUMMY_IDS.includes(r.id)
        );
      }
    } catch (e) {
      console.error('Failed to parse local records', e);
    }
  }
  return [];
}

export function saveLocalRecords(records: P2HRecord[]): void {
  try {
    const deletedSet = new Set([...getDeletedInspectionIds(), ...DUMMY_IDS]);
    const cleanList = records.filter(
      (r) => !deletedSet.has(r.id) && !r.id.includes('demo') && !DUMMY_IDS.includes(r.id)
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanList));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

// Real-time listener for Firestore synced with local storage
export function subscribeToP2HRecords(
  onUpdate: (records: P2HRecord[]) => void
): () => void {
  const colRef = collection(db, COLLECTION_NAME);

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const deletedSet = new Set([...getDeletedInspectionIds(), ...DUMMY_IDS]);

      if (snapshot.empty) {
        saveLocalRecords([]);
        onUpdate([]);
        return;
      }

      const list: P2HRecord[] = [];
      snapshot.forEach((d) => {
        const item = d.data() as P2HRecord;
        if (
          !deletedSet.has(d.id) &&
          !d.id.includes('demo') &&
          !DUMMY_IDS.includes(d.id) &&
          !item.documentNo?.startsWith('P2H-2026-00')
        ) {
          const norm = (item.unitName || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          if (['DT208', 'LV14', 'EX305', 'BUS01', 'BUS02'].includes(norm)) {
            return;
          }
          list.push({
            ...item,
            id: d.id,
          });
        }
      });

      // Sort by newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      saveLocalRecords(list);
      onUpdate(list);
    },
    (error) => {
      console.warn('Firestore subscription fallback to local cache:', error);
      // Fallback to local cache if network is unavailable
      const fallback = getLocalRecords();
      onUpdate(fallback);
    }
  );

  return unsubscribe;
}

// Save single record to Firestore and local cache
export async function saveRecordOnline(record: P2HRecord): Promise<void> {
  const cleanRecord: P2HRecord = {
    ...record,
    updatedAt: new Date().toISOString(),
  };

  // If this record was marked as deleted, unmark it
  try {
    const deleted = getDeletedInspectionIds();
    if (deleted.includes(record.id)) {
      const filtered = deleted.filter((id) => id !== record.id);
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    // ignore
  }

  // Update local cache immediately for snappy UI
  const current = getLocalRecords();
  const idx = current.findIndex((r) => r.id === record.id);
  let updatedList: P2HRecord[];
  if (idx >= 0) {
    updatedList = [...current];
    updatedList[idx] = cleanRecord;
  } else {
    updatedList = [cleanRecord, ...current];
  }
  saveLocalRecords(updatedList);

  // Sync to Firestore
  try {
    const docRef = doc(db, COLLECTION_NAME, record.id);
    const payload = cleanForFirestore(cleanRecord);
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_NAME}/${record.id}`);
  }
}

// Delete record from Firestore and local cache
export async function deleteRecordOnline(id: string): Promise<void> {
  // Permanently record deletion to avoid recreation or zombie caching
  markInspectionAsDeleted(id);

  // Update local cache immediately
  const current = getLocalRecords();
  const updated = current.filter((r) => r.id !== id);
  saveLocalRecords(updated);

  // Sync to Firestore
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn('Firestore delete notice:', error);
  }
}

// Batch delete records online
export async function deleteMultipleRecordsOnline(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  const idSet = new Set(ids);
  ids.forEach((id) => markInspectionAsDeleted(id));

  const current = getLocalRecords();
  const updated = current.filter((r) => !idSet.has(r.id));
  saveLocalRecords(updated);

  await Promise.all(
    ids.map(async (id) => {
      try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(docRef);
      } catch (err) {
        console.warn('Failed to delete doc:', id, err);
      }
    })
  );
}

// Quick cleaner for all dummy / sample records
export async function clearAllDummyRecordsOnline(): Promise<number> {
  const dummyDefaultIds = ['p2h-demo-01', 'p2h-demo-02', 'p2h-demo-03'];
  const current = getLocalRecords();
  const dummyRecords = current.filter(
    (r) =>
      r.id.includes('demo') ||
      dummyDefaultIds.includes(r.id) ||
      r.documentNo?.startsWith('P2H-2026-00')
  );

  const targetIds = Array.from(new Set([...dummyDefaultIds, ...dummyRecords.map((r) => r.id)]));
  await deleteMultipleRecordsOnline(targetIds);
  return targetIds.length;
}
