import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, cleanForFirestore } from '../firebase';
import {
  FleetUnit,
  DayStatusRecord,
  INITIAL_FLEET_ROSTER,
  LV_OWNED_BY_MAP,
  UnitRecapStatus,
} from '../types/recap';
import { P2HRecord } from '../types/p2h';

const FLEET_STORAGE_KEY = 'p2h_fleet_roster_v2';
const EXCLUDED_FLEET_KEY = 'p2h_excluded_fleet_units_v2';
const RECAP_STORAGE_KEY = 'p2h_recap_records_v1';

/**
 * Normalizes unit names so variations like "LV 16", "LV-16", "lv16", "LV_16"
 * match each other reliably.
 */
export function normalizeUnitName(name: string): string {
  return (name || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Matches unit names including alternate / double lambung units
 * e.g. "LV 07 / LV 38" matches "LV 38", "LV 07", or "LV 07 / LV 38".
 */
export function matchUnitName(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;
  const normA = normalizeUnitName(nameA);
  const normB = normalizeUnitName(nameB);
  if (normA === normB) return true;

  // Split multiple codes by slash, comma, or ampersand
  const partsA = nameA.split(/[\/\&,]/).map((p) => normalizeUnitName(p)).filter(Boolean);
  const partsB = nameB.split(/[\/\&,]/).map((p) => normalizeUnitName(p)).filter(Boolean);
  if (partsA.some((pa) => partsB.includes(pa))) return true;

  return false;
}

// Known Bus units norms: PST 008 to PST 024, SPARE 02 to SPARE 04
export const KNOWN_BUS_NORMS = new Set([
  'PST008', 'PST009', 'PST010', 'PST011', 'PST012',
  'PST013', 'PST014', 'PST015', 'PST016', 'PST017',
  'PST018', 'PST019', 'PST020', 'PST021', 'PST022',
  'PST023', 'PST024', 'SPARE02', 'SPARE03', 'SPARE04',
  'PST8', 'PST9', 'SPARE2', 'SPARE3', 'SPARE4',
]);

// Known obsolete / demo units that must never appear in the operational fleet (e.g. sample DT-208, LV-14, EX-305)
export const OBSOLETE_UNIT_NORMS = new Set([
  'BUS01',
  'BUS02',
  'DT208',
  'LV14',
  'EX305',
  'DT208TI',
  'EX3058',
]);

/**
 * Helper to identify whether a fleet unit is categorized as Bus.
 * REVISI: Unit ELF digabungkan dalam kategori LV (populasi LV tetap 38).
 * Bus: 17 unit operasional (PST 008 - PST 024) + 3 unit spare (SPARE 02 - SPARE 04) = 20 Bus.
 */
export function isBusUnit(unit: { unitName: string; unitType?: string }): boolean {
  const normName = normalizeUnitName(unit.unitName);

  // Unit ELF eksplisit masuk kategori LV!
  if (normName.includes('ELF')) {
    return false;
  }

  const t = (unit.unitType || '').trim().toUpperCase();
  if (t === 'BUS' || t.includes('BUS') || t.includes('MINIBUS')) {
    return true;
  }

  if (KNOWN_BUS_NORMS.has(normName)) {
    return true;
  }

  if (normName.includes('BUS')) {
    return true;
  }

  return false;
}

// No dummy data seeded by default
function getSampleRecapData(): Record<string, Record<string, DayStatusRecord>> {
  return {};
}

export function getExcludedUnits(): string[] {
  const stored = localStorage.getItem(EXCLUDED_FLEET_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.error('Failed to parse excluded fleet units', e);
    }
  }
  return [];
}

export function saveExcludedUnits(excluded: string[]): void {
  try {
    localStorage.setItem(EXCLUDED_FLEET_KEY, JSON.stringify(excluded));
  } catch (e) {
    console.error('Failed to save excluded fleet units', e);
  }
}

export function getFleetRoster(): FleetUnit[] {
  const excludedSet = new Set(getExcludedUnits().map(normalizeUnitName).filter(Boolean));
  const stored = localStorage.getItem(FLEET_STORAGE_KEY) || localStorage.getItem('p2h_fleet_roster_v1');

  let list: FleetUnit[] = [];
  if (stored !== null) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        list = parsed;
      }
    } catch (e) {
      console.error('Failed to parse fleet roster', e);
    }
  }

  // Pre-normalize names from storage so alternate names match INITIAL_FLEET_ROSTER
  list.forEach((u) => {
    if (u.unitName === 'LV 07 / LV 38' || u.unitName === 'LV 07') u.unitName = 'LV 38';
    if (u.unitName === 'LV 09 / LV 02' || u.unitName === 'LV 09') u.unitName = 'LV SPARE 02';
    if (u.unitName === 'LV 41 / LV 57' || u.unitName === 'LV 41') u.unitName = 'LV 57';
  });

  // Filter out obsolete placeholders, demo units, and explicitly excluded/deleted units
  list = list.filter((u) => {
    const norm = normalizeUnitName(u.unitName);
    return norm && !OBSOLETE_UNIT_NORMS.has(norm) && !excludedSet.has(norm);
  });

  // Merge any units from INITIAL_FLEET_ROSTER ONLY if not already present and NOT excluded/deleted
  const existingNorms = new Set(list.map((u) => normalizeUnitName(u.unitName)));
  let nextNo = list.length > 0 ? Math.max(...list.map((u) => u.no || 0)) + 1 : 1;

  INITIAL_FLEET_ROSTER.forEach((initUnit) => {
    const initNorm = normalizeUnitName(initUnit.unitName);
    if (!existingNorms.has(initNorm) && !excludedSet.has(initNorm)) {
      existingNorms.add(initNorm);
      list.push({ ...initUnit, no: nextNo++ });
    }
  });

  // Ensure ELF 01 is categorized in LV (Populasi LV 38) and enrich with Owned By data
  list.forEach((u) => {
    // Normalize dual lambung to the official unit codes requested by the user
    if (u.unitName === 'LV 07 / LV 38' || u.unitName === 'LV 07') u.unitName = 'LV 38';
    if (u.unitName === 'LV 09 / LV 02' || u.unitName === 'LV 09') u.unitName = 'LV SPARE 02';
    if (u.unitName === 'LV 41 / LV 57' || u.unitName === 'LV 41') u.unitName = 'LV 57';

    if (normalizeUnitName(u.unitName).includes('ELF')) {
      u.unitType = 'LV';
    } else if (isBusUnit(u)) {
      u.unitType = 'Bus';
    }

    // Populate or sync ownedBy
    const mapped = LV_OWNED_BY_MAP[u.unitName] || LV_OWNED_BY_MAP[normalizeUnitName(u.unitName)];
    if (mapped) {
      u.ownedBy = mapped;
    } else if (isBusUnit(u)) {
      u.ownedBy = 'BAGONG';
    }
  });

  // Remove obsolete placeholders, excluded units, and deduplicate by normalized unitName
  const seenNorms = new Set<string>();
  const filtered = list
    .filter((u) => {
      const norm = normalizeUnitName(u.unitName);
      if (!norm || OBSOLETE_UNIT_NORMS.has(norm) || excludedSet.has(norm)) return false;
      if (seenNorms.has(norm)) return false;
      seenNorms.add(norm);
      return true;
    })
    .map((u, idx) => ({ ...u, no: idx + 1 }));

  localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(filtered));
  return filtered;
}

export function saveFleetRoster(roster: FleetUnit[], excluded?: string[]): void {
  try {
    const cleanRoster = roster.map((u, idx) => ({ ...u, no: idx + 1 }));
    localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(cleanRoster));
    const rawExcluded = excluded !== undefined ? excluded : getExcludedUnits();
    const targetExcluded = Array.from(
      new Set(rawExcluded.map(normalizeUnitName).filter(Boolean))
    );
    localStorage.setItem(EXCLUDED_FLEET_KEY, JSON.stringify(targetExcluded));

    // Synchronize to Firestore for cross-client persistence
    try {
      const docRef = doc(db, 'p2h_fleet_roster', 'main_roster');
      const payload = cleanForFirestore({
        units: cleanRoster,
        excluded: targetExcluded,
        updatedAt: new Date().toISOString(),
      });
      setDoc(docRef, payload).catch((err) => {
        console.warn('Firestore fleet sync notice:', err);
      });
    } catch (err) {
      // offline fallback
    }
  } catch (e) {
    console.error('Failed to save fleet roster', e);
  }
}

/**
 * Ensures a unit is added to the fleet roster and synced to storage & Firestore.
 * Prevents issues where newly inputted armada do not show up in the recap table.
 */
export function ensureUnitInFleetRoster(
  unitName: string,
  unitType?: string,
  dept?: string,
  p2hCategory?: 'LV' | 'Bus'
): FleetUnit[] {
  const current = getFleetRoster();
  const norm = normalizeUnitName(unitName);
  if (!norm || OBSOLETE_UNIT_NORMS.has(norm)) return current;

  const foundIndex = current.findIndex((u) => normalizeUnitName(u.unitName) === norm);
  if (foundIndex >= 0) {
    const existing = current[foundIndex];
    let needsUpdate = false;
    let targetType = existing.unitType;
    if (unitType && (!targetType || targetType === 'Lainnya')) {
      targetType = unitType;
      needsUpdate = true;
    }
    if (isBusUnit({ unitName, unitType }) && targetType !== 'Bus') {
      targetType = 'Bus';
      needsUpdate = true;
    }
    if (norm.includes('ELF') && targetType !== 'LV') {
      targetType = 'LV';
      needsUpdate = true;
    }
    if (needsUpdate) {
      const updated = [...current];
      updated[foundIndex] = { ...existing, unitType: targetType };
      saveFleetRoster(updated);
      return updated;
    }
    return current;
  }

  // Unit does not exist yet in roster - add it automatically!
  const isBus = p2hCategory === 'Bus' || isBusUnit({ unitName, unitType });
  const finalType = isBus ? 'Bus' : (unitType || 'LV');
  const finalDept = (dept || 'OPERASIONAL').trim().toUpperCase();
  const nextNo = current.length > 0 ? Math.max(...current.map((u) => u.no || 0)) + 1 : 1;

  const dynamicOwner = isBus ? 'BAGONG' : (LV_OWNED_BY_MAP[unitName.trim().toUpperCase()] || undefined);
  const newUnit: FleetUnit = {
    no: nextNo,
    unitName: unitName.trim().toUpperCase(),
    dept: finalDept,
    ownedBy: dynamicOwner,
    unitType: finalType,
    description: `Unit Baru Ditambahkan (${finalType})`,
  };

  const updated = [...current, newUnit];
  saveFleetRoster(updated);
  return updated;
}

export function resetFleetRoster(): FleetUnit[] {
  localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(INITIAL_FLEET_ROSTER));
  localStorage.setItem(EXCLUDED_FLEET_KEY, JSON.stringify([]));
  saveFleetRoster(INITIAL_FLEET_ROSTER, []);
  return INITIAL_FLEET_ROSTER;
}

export function subscribeFleetRoster(
  onUpdate: (roster: FleetUnit[], excluded: string[]) => void
): () => void {
  try {
    const docRef = doc(db, 'p2h_fleet_roster', 'main_roster');
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const rawExcluded: string[] = Array.isArray(data?.excluded) ? data.excluded : [];
          const excludedList = Array.from(
            new Set(rawExcluded.map(normalizeUnitName).filter(Boolean))
          );
          const excludedSet = new Set(excludedList);

          if (Array.isArray(data?.units) && (data.units.length > 0 || excludedList.length > 0)) {
            let units: FleetUnit[] = data.units.map((u: FleetUnit) => ({ ...u }));
            let needsSync = false;

            // Pre-normalize names from Firestore
            units.forEach((u) => {
              if (u.unitName === 'LV 07 / LV 38' || u.unitName === 'LV 07') {
                u.unitName = 'LV 38';
                needsSync = true;
              }
              if (u.unitName === 'LV 09 / LV 02' || u.unitName === 'LV 09') {
                u.unitName = 'LV SPARE 02';
                needsSync = true;
              }
              if (u.unitName === 'LV 41 / LV 57' || u.unitName === 'LV 41') {
                u.unitName = 'LV 57';
                needsSync = true;
              }
            });

            // Filter out obsolete/demo units AND explicitly excluded/deleted units
            const prevCount = units.length;
            units = units.filter((u) => {
              const norm = normalizeUnitName(u.unitName);
              return norm && !OBSOLETE_UNIT_NORMS.has(norm) && !excludedSet.has(norm);
            });
            if (units.length !== prevCount) {
              needsSync = true;
            }

            const existingNorms = new Set(units.map((u) => normalizeUnitName(u.unitName)));

            // Merge any missing units from INITIAL_FLEET_ROSTER ONLY IF not excluded/deleted
            let nextNo = units.length > 0 ? Math.max(...units.map((u) => u.no || 0)) + 1 : 1;
            INITIAL_FLEET_ROSTER.forEach((initUnit) => {
              const initNorm = normalizeUnitName(initUnit.unitName);
              if (!existingNorms.has(initNorm) && !excludedSet.has(initNorm)) {
                existingNorms.add(initNorm);
                units.push({ ...initUnit, no: nextNo++ });
                needsSync = true;
              }
            });

            // Ensure ELF 01 is unitType LV and guarantee ownedBy is set
            units.forEach((u) => {
              if (normalizeUnitName(u.unitName).includes('ELF') && u.unitType !== 'LV') {
                u.unitType = 'LV';
                needsSync = true;
              }

              const mapped = LV_OWNED_BY_MAP[u.unitName] || LV_OWNED_BY_MAP[normalizeUnitName(u.unitName)];
              if (mapped && u.ownedBy !== mapped) {
                u.ownedBy = mapped;
                needsSync = true;
              } else if (isBusUnit(u) && u.ownedBy !== 'BAGONG') {
                u.ownedBy = 'BAGONG';
                needsSync = true;
              }
            });

            // Deduplicate by normalized unitName
            const seen = new Set<string>();
            const deduped: FleetUnit[] = [];
            units.forEach((u) => {
              const norm = normalizeUnitName(u.unitName);
              if (!seen.has(norm)) {
                seen.add(norm);
                deduped.push(u);
              } else {
                needsSync = true;
              }
            });
            units = deduped.map((u, idx) => ({ ...u, no: idx + 1 }));

            localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(units));
            localStorage.setItem(EXCLUDED_FLEET_KEY, JSON.stringify(excludedList));
            onUpdate(units, excludedList);

            if (needsSync) {
              const payload = cleanForFirestore({
                units,
                excluded: excludedList,
                updatedAt: new Date().toISOString(),
              });
              setDoc(docRef, payload).catch(() => {});
            }
            return;
          }
        }
        // If Firestore doc does not exist yet or completely uninitialized, seed it with INITIAL_FLEET_ROSTER
        saveFleetRoster(INITIAL_FLEET_ROSTER, []);
        onUpdate(INITIAL_FLEET_ROSTER, []);
      },
      (error) => {
        console.warn('Firestore fleet roster listener notice:', error);
      }
    );
  } catch (err) {
    return () => {};
  }
}

const RECAP_CLEANED_FLAG = 'p2h_recap_dummy_cleaned_v3';

export function clearAllRecapDummyData(): void {
  try {
    localStorage.removeItem(RECAP_STORAGE_KEY);
    localStorage.setItem(RECAP_CLEANED_FLAG, 'true');
  } catch (e) {
    console.error('Failed to clear recap dummy data', e);
  }
}

export function getRecapOverrides(): Record<string, Record<string, DayStatusRecord>> {
  // If user has not had legacy dummy data cleared yet, automatically clear it
  if (!localStorage.getItem(RECAP_CLEANED_FLAG)) {
    clearAllRecapDummyData();
    return {};
  }

  const stored = localStorage.getItem(RECAP_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse recap records', e);
    }
  }
  return {};
}

export function saveRecapOverrides(data: Record<string, Record<string, DayStatusRecord>>): void {
  try {
    localStorage.setItem(RECAP_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save recap records', e);
  }
}

// Compute status for a unit on a given date by combining P2H submissions & manual overrides
export function getUnitStatusForDate(
  unitName: string,
  dateStr: string,
  p2hRecords: P2HRecord[],
  recapOverrides: Record<string, Record<string, DayStatusRecord>>
): DayStatusRecord {
  const normTarget = normalizeUnitName(unitName);

  // 1. Look for submitted P2H records for this unit on this date
  const matchedRecords = p2hRecords.filter((r) => {
    const rDate = (r.date || '').slice(0, 10);
    return rDate === dateStr && matchUnitName(r.unitName, unitName);
  });

  if (matchedRecords.length > 0) {
    // Sort newest updated or created first
    matchedRecords.sort((a, b) => {
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      return timeB - timeA;
    });

    const isShift1 = (s?: string) => {
      if (!s) return false;
      const lower = s.toLowerCase();
      return (
        lower.includes('shift 1') ||
        lower.startsWith('s1') ||
        lower.includes('shift-1') ||
        lower === '1' ||
        (lower.includes('06:00') && !lower.includes('18:00 - 06:00'))
      );
    };

    const isShift2 = (s?: string) => {
      if (!s) return false;
      const lower = s.toLowerCase();
      return (
        lower.includes('shift 2') ||
        lower.startsWith('s2') ||
        lower.includes('shift-2') ||
        lower === '2' ||
        lower.includes('18:00 - 06:00') ||
        lower.includes('18:00-06:00')
      );
    };

    // Check if Shift 1 and Shift 2 records both exist
    const s1Rec = matchedRecords.find((r) => isShift1(r.shift));
    const s2Rec = matchedRecords.find((r) => isShift2(r.shift));

    let status: UnitRecapStatus = 'S1';
    let isBothShifts = false;

    if (s1Rec && s2Rec) {
      status = 'S1/S2';
      isBothShifts = true;
    } else if (s2Rec && !s1Rec) {
      status = 'S2';
    } else {
      status = 'S1';
    }

    // Determine status according to readiness condition:
    // Sesuai revisi: Mengisi item rusak TIDAK mengubah status rekap menjadi B/D karena unit tetap dioperasikan.
    // Status tetap mencatat pengisian P2H (S1, S2, atau S1/S2), KECUALI jika user/operator secara eksplisit
    // menceklis/memilih status B/D pada form P2H (r.unitConditionStatus === 'BD').
    const hasBD = matchedRecords.some((r) => r.unitConditionStatus === 'BD');
    const hasBU = matchedRecords.some((r) => r.unitConditionStatus === 'BU');
    const hasStandby = matchedRecords.some((r) => r.unitConditionStatus === 'STANDBY');

    if (hasBD) {
      status = 'B/D';
    } else if (hasBU) {
      status = 'BU';
    } else if (hasStandby) {
      status = 'STANDBY';
    }

    const matchedP2H = matchedRecords[0];

    // Compute operator name string
    let operatorNameStr = matchedP2H.operatorName;
    if (isBothShifts && s1Rec && s2Rec) {
      if (s1Rec.operatorName === s2Rec.operatorName) {
        operatorNameStr = `${s1Rec.operatorName} (S1 & S2)`;
      } else {
        operatorNameStr = `${s1Rec.operatorName} (S1) & ${s2Rec.operatorName} (S2)`;
      }
    }

    // Check if manual override was explicitly modified with an updatedAt newer than P2H
    const dateOverrides = recapOverrides[dateStr];
    let override: DayStatusRecord | undefined;
    if (dateOverrides) {
      if (dateOverrides[unitName]) {
        override = dateOverrides[unitName];
      } else {
        const found = Object.entries(dateOverrides).find(
          ([k]) => normalizeUnitName(k) === normTarget
        );
        if (found) override = found[1];
      }
    }

    const p2hTime = new Date(matchedP2H.updatedAt || matchedP2H.createdAt || 0).getTime();
    const overrideTime = override?.updatedAt ? new Date(override.updatedAt).getTime() : 0;

    if (override && overrideTime > p2hTime) {
      return {
        ...override,
        p2hId: matchedP2H.id,
        p2hIdS1: s1Rec?.id,
        p2hIdS2: s2Rec?.id,
        operatorName: operatorNameStr,
        operatorNameS1: s1Rec?.operatorName,
        operatorNameS2: s2Rec?.operatorName,
      };
    }

    return {
      status,
      p2hId: matchedP2H.id,
      p2hIdS1: s1Rec?.id,
      p2hIdS2: s2Rec?.id,
      operatorName: operatorNameStr,
      operatorNameS1: s1Rec?.operatorName,
      operatorNameS2: s2Rec?.operatorName,
      unitConditionStatus: matchedP2H.unitConditionStatus || 'RFU',
      notes: isBothShifts
        ? `P2H 2 Shift Lengkap (S1: ${s1Rec?.operatorName || '-'}, S2: ${s2Rec?.operatorName || '-'})`
        : (matchedP2H.foremanNotes ||
          (matchedP2H.unitConditionStatus === 'BD'
            ? 'Unit Breakdown (BD)'
            : matchedP2H.unitConditionStatus === 'BU'
            ? 'Backup Unit (BU)'
            : matchedP2H.unitConditionStatus === 'STANDBY'
            ? 'Standby Unit'
            : `P2H Selesai - Unit Siap Operasi (${status}) [${matchedP2H.operatorName}]`)),
      updatedAt: matchedP2H.updatedAt || matchedP2H.createdAt,
    };
  }

  // 2. Check manual override when no direct P2H record
  const dateOverrides = recapOverrides[dateStr];
  if (dateOverrides) {
    if (dateOverrides[unitName]) {
      return dateOverrides[unitName];
    }
    const found = Object.entries(dateOverrides).find(
      ([k]) => normalizeUnitName(k) === normTarget
    );
    if (found) {
      return found[1];
    }
  }

  return { status: 'BELUM' };
}
