import React, { useState, useEffect, useMemo } from 'react';
import {
  FleetUnit,
  DayStatusRecord,
  UnitRecapStatus,
  STATUS_DEFINITIONS,
  INITIAL_FLEET_ROSTER,
  LV_OWNED_BY_MAP,
} from '../types/recap';
import { P2HRecord } from '../types/p2h';
import {
  getFleetRoster,
  saveFleetRoster,
  getExcludedUnits,
  resetFleetRoster,
  subscribeFleetRoster,
  getRecapOverrides,
  saveRecapOverrides,
  getUnitStatusForDate,
  normalizeUnitName,
  isBusUnit,
  OBSOLETE_UNIT_NORMS,
  clearAllRecapDummyData,
} from '../utils/recapStorage';
import {
  Calendar,
  Search,
  Printer,
  Download,
  Settings,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MoveVertical,
  X,
  FileText,
  Lock,
  Crown,
  Truck,
  CheckSquare,
  Square,
  Check,
  RotateCcw,
  RefreshCw,
  Tag,
  Car,
  Bus,
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';
import { AppUser } from '../types/auth';
import { getLocalUsers } from '../utils/authStorage';
import { P2HMonthlyAnalytics } from './P2HMonthlyAnalytics';
import { P2HItemDetailRecap } from './P2HItemDetailRecap';

export const FLEET_DEPARTMENTS = [
  'PRODUKSI',
  'PLANT',
  'ENGINEERING',
  'SHE',
  'HCGS',
  'LOGISTIK',
  'DPM 1',
  'DPM 2',
  'DPM 3',
  'OPD',
  'PJO',
  'OPERASIONAL',
  'SPARE',
];

export const FLEET_TYPES = [
  { value: 'LV', label: 'LV (Light Vehicle)' },
  { value: 'Bus', label: 'Bus / Minibus' },
  { value: 'Truk', label: 'Truk / Servis' },
  { value: 'Sarana', label: 'Sarana Tambang' },
  { value: 'Alat Berat', label: 'Alat Berat' },
  { value: 'Lainnya', label: 'Lainnya' },
];

export const getOwnerBadgeClasses = (owner?: string): string => {
  const norm = (owner || '').toUpperCase().trim();
  switch (norm) {
    case 'PST':
      return 'bg-amber-100 text-amber-900 border border-amber-300';
    case 'WARGI':
      return 'bg-blue-100 text-blue-900 border border-blue-300';
    case 'BJR':
      return 'bg-emerald-100 text-emerald-900 border border-emerald-300';
    case 'BAGONG':
      return 'bg-purple-100 text-purple-900 border border-purple-300';
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-300';
  }
};

export const getOwnerPillClasses = (owner: string, isSelected: boolean): string => {
  if (!isSelected) {
    return 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent';
  }
  switch (owner.toUpperCase().trim()) {
    case 'PST':
      return 'bg-amber-500 text-slate-950 font-bold border border-amber-600 shadow-xs';
    case 'WARGI':
      return 'bg-blue-600 text-white font-bold border border-blue-700 shadow-xs';
    case 'BJR':
      return 'bg-emerald-600 text-white font-bold border border-emerald-700 shadow-xs';
    case 'BAGONG':
      return 'bg-purple-600 text-white font-bold border border-purple-700 shadow-xs';
    default:
      return 'bg-slate-900 text-white font-bold border border-slate-950 shadow-xs';
  }
};

interface P2HRecapTableProps {
  p2hRecords: P2HRecord[];
  currentUser?: AppUser | null;
  onOpenP2H?: (record: P2HRecord) => void;
  onNewP2HForUnit?: (unitName: string, shift?: string, date?: string) => void;
  onOpenAuth?: () => void;
  onNavigateToHistory?: () => void;
}

export const P2HRecapTable: React.FC<P2HRecapTableProps> = ({
  p2hRecords,
  currentUser,
  onOpenP2H,
  onNewP2HForUnit,
  onOpenAuth,
  onNavigateToHistory,
}) => {
  const [fleet, setFleet] = useState<FleetUnit[]>(() => getFleetRoster());
  const [excludedUnits, setExcludedUnits] = useState<string[]>(() => getExcludedUnits());
  const [selectedFleetUnitNames, setSelectedFleetUnitNames] = useState<string[]>([]);
  const [fleetSearchQuery, setFleetSearchQuery] = useState<string>('');
  const [fleetTypeFilter, setFleetTypeFilter] = useState<string>('ALL');
  const [fleetDeptFilter, setFleetDeptFilter] = useState<string>('ALL');
  const [fleetOwnerFilter, setFleetOwnerFilter] = useState<string>('ALL');

  // Cell status editor modal
  const [editingCell, setEditingCell] = useState<{
    unit: FleetUnit;
    day: number;
    dateStr: string;
    currentRecord: DayStatusRecord;
  } | null>(null);

  // Fleet management modal
  const [isFleetModalOpen, setIsFleetModalOpen] = useState<boolean>(false);
  const [isAddFormExpanded, setIsAddFormExpanded] = useState<boolean>(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitDept, setNewUnitDept] = useState('PRODUKSI');
  const [newUnitType, setNewUnitType] = useState('LV');
  const [newUnitPlate, setNewUnitPlate] = useState('');
  const [newUnitDesc, setNewUnitDesc] = useState('');
  const [newUnitOwnedBy, setNewUnitOwnedBy] = useState('PST');

  // Edit unit state
  const [editingFleetUnit, setEditingFleetUnit] = useState<FleetUnit | null>(null);

  // Move unit position state
  const [movingUnit, setMovingUnit] = useState<FleetUnit | null>(null);
  const [targetPositionInput, setTargetPositionInput] = useState<number>(1);

  // In-app interactive confirmation dialogs (eliminates window.confirm blockers)
  const [deleteConfirmUnit, setDeleteConfirmUnit] = useState<FleetUnit | null>(null);
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState<boolean>(false);
  const [isResetFleetConfirmOpen, setIsResetFleetConfirmOpen] = useState<boolean>(false);
  const [isClearRecapConfirmOpen, setIsClearRecapConfirmOpen] = useState<boolean>(false);

  // Fleet Toast feedback
  const [fleetToast, setFleetToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showFleetToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    setFleetToast({ message, type });
    setTimeout(() => setFleetToast(null), 3500);
  };

  // Real-time synchronization for fleet roster across clients
  useEffect(() => {
    const unsub = subscribeFleetRoster((updatedRoster, updatedExcluded) => {
      setFleet(updatedRoster);
      setExcludedUnits(updatedExcluded);
    });
    return () => unsub();
  }, []);

  const [recapOverrides, setRecapOverrides] = useState<
    Record<string, Record<string, DayStatusRecord>>
  >(() => getRecapOverrides());

  // Pastikan data dummy lama dibersihkan dari state
  useEffect(() => {
    if (!localStorage.getItem('p2h_recap_dummy_cleaned_v3')) {
      clearAllRecapDummyData();
      setRecapOverrides({});
    }
  }, []);

  // Date selection state: Month and Year
  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth() + 1); // 1-12

  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [searchUnit, setSearchUnit] = useState<string>('');

  // Mode switcher: 'matrix' (Spreadsheet Table 1-31 Hari) vs 'item_detail' (Format Lengkap Excel Item A/B/C) vs 'analytics' (Grafik & Evaluasi User Bulanan)
  const [recapViewMode, setRecapViewMode] = useState<'matrix' | 'item_detail' | 'analytics'>('matrix');

  // Count low compliance operators this month for badge indicator
  const lowComplianceUserCount = useMemo(() => {
    const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const monthlySet = new Set<string>();
    p2hRecords.forEach((r) => {
      const recDate = r.date || (r.createdAt ? r.createdAt.slice(0, 10) : '');
      if (recDate.startsWith(monthPrefix)) {
        if (r.userId) monthlySet.add(r.userId);
        if (r.userCode) monthlySet.add(r.userCode.trim().toUpperCase());
      }
    });
    const localUsers = getLocalUsers().filter((u) => u.role !== 'admin');
    return localUsers.filter(
      (u) => !monthlySet.has(u.id) && !monthlySet.has(u.userCode.toUpperCase())
    ).length;
  }, [p2hRecords, currentYear, currentMonth]);

  // Month calculations: Total days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentYear, currentMonth]);

  // Always display the full month (1 Bulan Full: 1 to daysInMonth)
  const displayDays = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // Today indicator
  const isViewingCurrentMonth =
    currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1;
  const currentDayOfMonth = now.getDate();

  // Combine fleet roster with any units present in p2hRecords (unless explicitly excluded/deleted by admin or obsolete!)
  const effectiveFleet = useMemo(() => {
    const excludedNorms = new Set(excludedUnits.map(normalizeUnitName).filter(Boolean));
    const mapAliasName = (raw: string) => {
      const upper = (raw || '').trim().toUpperCase();
      if (upper === 'LV 07 / LV 38' || upper === 'LV 07') return 'LV 38';
      if (upper === 'LV 09 / LV 02' || upper === 'LV 09') return 'LV SPARE 02';
      if (upper === 'LV 41 / LV 57' || upper === 'LV 41') return 'LV 57';
      return upper;
    };

    let list = fleet.filter((u) => {
      const mapped = mapAliasName(u.unitName);
      const norm = normalizeUnitName(mapped);
      return norm && !OBSOLETE_UNIT_NORMS.has(norm) && !excludedNorms.has(norm);
    });
    const existingNorms = new Set(list.map((u) => normalizeUnitName(mapAliasName(u.unitName))));

    let nextNo = list.length > 0 ? Math.max(...list.map((u) => u.no || 0)) + 1 : 1;
    p2hRecords.forEach((rec) => {
      const mappedName = mapAliasName(rec.unitName);
      const norm = normalizeUnitName(mappedName);
      // NEVER auto-add if unit was deleted/excluded by admin or is an obsolete/demo unit!
      if (
        norm &&
        !existingNorms.has(norm) &&
        !excludedNorms.has(norm) &&
        !OBSOLETE_UNIT_NORMS.has(norm)
      ) {
        existingNorms.add(norm);
        const isBus = isBusUnit({ unitName: mappedName, unitType: rec.unitType });
        const dynamicOwner = isBus ? 'BAGONG' : (LV_OWNED_BY_MAP[mappedName] || undefined);
        list.push({
          no: nextNo++,
          unitName: mappedName,
          dept: isBus ? (mappedName.includes('SPARE') ? 'SPARE' : 'PRODUKSI') : 'OPERASIONAL',
          ownedBy: dynamicOwner,
          unitType: isBus ? 'Bus' : 'LV',
          description: 'Unit Terdeteksi dari Form P2H',
        });
      }
    });

    // Normalize unit names and ensure ownedBy is always populated
    list = list.map((u) => {
      const unitName = mapAliasName(u.unitName);
      const isBus = isBusUnit({ unitName, unitType: u.unitType });
      const owned =
        (isBus ? 'BAGONG' : undefined) ||
        LV_OWNED_BY_MAP[unitName] ||
        LV_OWNED_BY_MAP[normalizeUnitName(unitName)] ||
        (isBus ? 'BAGONG' : u.ownedBy);

      return {
        ...u,
        unitName,
        ownedBy: owned,
      };
    });

    // Deduplicate by normalized unitName and re-verify against excludedNorms
    const seen = new Set<string>();
    const deduped: FleetUnit[] = [];
    list.forEach((u) => {
      const norm = normalizeUnitName(u.unitName);
      if (norm && !excludedNorms.has(norm) && !OBSOLETE_UNIT_NORMS.has(norm) && !seen.has(norm)) {
        seen.add(norm);
        deduped.push(u);
      }
    });

    return deduped.map((u, idx) => ({ ...u, no: idx + 1 }));
  }, [fleet, p2hRecords, excludedUnits]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    effectiveFleet.forEach((u) => set.add(u.dept));
    return Array.from(set).sort();
  }, [effectiveFleet]);

  // Fleet Category Filter: 'ALL' vs 'LV' vs 'Bus' (Separated Recap)
  const [fleetCategoryFilter, setFleetCategoryFilter] = useState<'ALL' | 'LV' | 'Bus'>('ALL');
  const showOwnedByColumn = true;

  // Filter by Owned By: 'ALL' | 'PST' | 'BJR' | 'WARGI' | 'BAGONG'
  const [selectedOwner, setSelectedOwner] = useState<string>('ALL');

  // Available unique owners
  const availableOwners = useMemo(() => {
    const set = new Set<string>();
    effectiveFleet.forEach((u) => {
      const isBus = isBusUnit(u);
      if (fleetCategoryFilter === 'LV' && isBus) return;
      if (fleetCategoryFilter === 'Bus' && !isBus) return;
      if (u.ownedBy) set.add(u.ownedBy.trim().toUpperCase());
    });
    const standardOrder = ['PST', 'BJR', 'WARGI', 'BAGONG'];
    const result: string[] = [];
    standardOrder.forEach((o) => {
      if (set.has(o)) {
        result.push(o);
        set.delete(o);
      }
    });
    return [...result, ...Array.from(set).sort()];
  }, [effectiveFleet, fleetCategoryFilter]);

  const lvCount = useMemo(() => effectiveFleet.filter((u) => !isBusUnit(u)).length, [effectiveFleet]);
  const busCount = useMemo(() => effectiveFleet.filter((u) => isBusUnit(u)).length, [effectiveFleet]);

  // Filtered fleet roster
  const filteredFleet = useMemo(() => {
    return effectiveFleet.filter((u) => {
      const isBus = isBusUnit(u);
      if (fleetCategoryFilter === 'LV' && isBus) return false;
      if (fleetCategoryFilter === 'Bus' && !isBus) return false;

      const matchDept = selectedDept === 'ALL' || u.dept === selectedDept;
      const matchOwner =
        selectedOwner === 'ALL' ||
        (u.ownedBy || '').trim().toUpperCase() === selectedOwner.trim().toUpperCase();
      const matchSearch =
        u.unitName.toLowerCase().includes(searchUnit.toLowerCase()) ||
        u.dept.toLowerCase().includes(searchUnit.toLowerCase()) ||
        (u.ownedBy && u.ownedBy.toLowerCase().includes(searchUnit.toLowerCase())) ||
        (u.plateNumber && u.plateNumber.toLowerCase().includes(searchUnit.toLowerCase()));

      return matchDept && matchOwner && matchSearch;
    });
  }, [effectiveFleet, fleetCategoryFilter, selectedDept, selectedOwner, searchUnit]);

  // Get date string helper: 'YYYY-MM-DD'
  const getDateStr = (day: number) => {
    const mm = String(currentMonth).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${currentYear}-${mm}-${dd}`;
  };

  // Month Name in Indonesian
  const monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  // Quick Cell update
  const handleUpdateStatus = (
    unitName: string,
    dateStr: string,
    newStatus: UnitRecapStatus,
    notes?: string
  ) => {
    const updated = { ...recapOverrides };
    if (!updated[dateStr]) {
      updated[dateStr] = {};
    }
    updated[dateStr][unitName] = {
      status: newStatus,
      notes: notes || updated[dateStr][unitName]?.notes,
      updatedAt: new Date().toISOString(),
    };

    setRecapOverrides(updated);
    saveRecapOverrides(updated);
    setEditingCell(null);
  };

  // Filtered fleet for the Fleet Management Modal
  const filteredModalFleet = useMemo(() => {
    return effectiveFleet.filter((u) => {
      const q = fleetSearchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        u.unitName.toLowerCase().includes(q) ||
        u.dept.toLowerCase().includes(q) ||
        (u.ownedBy && u.ownedBy.toLowerCase().includes(q)) ||
        (u.plateNumber && u.plateNumber.toLowerCase().includes(q)) ||
        (u.unitType && u.unitType.toLowerCase().includes(q));

      const matchDept = fleetDeptFilter === 'ALL' || u.dept === fleetDeptFilter;
      const matchOwner =
        fleetOwnerFilter === 'ALL' ||
        (u.ownedBy || '').trim().toUpperCase() === fleetOwnerFilter.trim().toUpperCase();
      const matchType = fleetTypeFilter === 'ALL' || (u.unitType || 'LV') === fleetTypeFilter;

      return matchSearch && matchDept && matchOwner && matchType;
    });
  }, [effectiveFleet, fleetSearchQuery, fleetDeptFilter, fleetOwnerFilter, fleetTypeFilter]);

  // Selection helpers for batch actions
  const isAllModalSelected =
    filteredModalFleet.length > 0 &&
    filteredModalFleet.every((u) => selectedFleetUnitNames.includes(u.unitName));

  const handleToggleSelectAllModal = () => {
    if (isAllModalSelected) {
      setSelectedFleetUnitNames([]);
    } else {
      setSelectedFleetUnitNames(filteredModalFleet.map((u) => u.unitName));
    }
  };

  const handleToggleSelectOneModal = (unitName: string) => {
    setSelectedFleetUnitNames((prev) =>
      prev.includes(unitName) ? prev.filter((n) => n !== unitName) : [...prev, unitName]
    );
  };

  // Fleet management actions: Add Unit
  const handleAddUnit = () => {
    const trimmed = newUnitName.trim().toUpperCase();
    if (!trimmed) {
      showFleetToast('Nomor lambung / nama unit wajib diisi', 'error');
      return;
    }
    const norm = normalizeUnitName(trimmed);
    if (effectiveFleet.some((u) => normalizeUnitName(u.unitName) === norm)) {
      showFleetToast(`Unit "${trimmed}" sudah ada di dalam daftar monitoring armada!`, 'error');
      return;
    }

    const nextNo =
      effectiveFleet.length > 0 ? Math.max(...effectiveFleet.map((f) => f.no || 0)) + 1 : 1;

    let determinedType = newUnitType;
    if (norm.includes('ELF')) {
      determinedType = 'LV';
    } else if (determinedType === 'LV' && isBusUnit({ unitName: trimmed })) {
      determinedType = 'Bus';
    }

    const mappedOwner =
      newUnitOwnedBy.trim().toUpperCase() ||
      LV_OWNED_BY_MAP[trimmed] ||
      (determinedType === 'Bus' ? 'BAGONG' : undefined);
    const newUnit: FleetUnit = {
      no: nextNo,
      unitName: trimmed,
      dept: newUnitDept.trim().toUpperCase(),
      ownedBy: mappedOwner,
      unitType: determinedType,
      plateNumber: newUnitPlate.trim().toUpperCase() || undefined,
      description: newUnitDesc.trim() || undefined,
    };

    const newFleet = [...fleet, newUnit];
    const newExcluded = excludedUnits.filter((ex) => normalizeUnitName(ex) !== norm);

    setFleet(newFleet);
    setExcludedUnits(newExcluded);
    saveFleetRoster(newFleet, newExcluded);

    // If active filters would hide the new unit, switch category or reset department filter
    if (fleetCategoryFilter === 'LV' && determinedType === 'Bus') {
      setFleetCategoryFilter('ALL');
    } else if (fleetCategoryFilter === 'Bus' && determinedType === 'LV') {
      setFleetCategoryFilter('ALL');
    }
    if (selectedDept !== 'ALL' && selectedDept !== newUnitDept.trim().toUpperCase()) {
      setSelectedDept('ALL');
    }
    setSearchUnit('');

    setNewUnitName('');
    setNewUnitPlate('');
    setNewUnitDesc('');
    setNewUnitOwnedBy('PST');
    setIsAddFormExpanded(false);
    showFleetToast(`Unit ${trimmed} (${determinedType} - ${newUnitDept}) berhasil ditambahkan dan masuk ke tabel rekapan data!`);
  };

  // Delete single unit by normalized name
  const handleDeleteUnit = (targetUnit: FleetUnit) => {
    setDeleteConfirmUnit(targetUnit);
  };

  const handleConfirmDeleteSingleUnit = () => {
    if (!deleteConfirmUnit) return;
    const targetNorm = normalizeUnitName(deleteConfirmUnit.unitName);
    const newFleet = effectiveFleet
      .filter((f) => normalizeUnitName(f.unitName) !== targetNorm)
      .map((u, idx) => ({ ...u, no: idx + 1 }));
    const newExcluded = Array.from(new Set([...excludedUnits, targetNorm]));

    setFleet(newFleet);
    setExcludedUnits(newExcluded);
    setSelectedFleetUnitNames((prev) =>
      prev.filter((name) => normalizeUnitName(name) !== targetNorm)
    );
    saveFleetRoster(newFleet, newExcluded);
    showFleetToast(`Unit "${deleteConfirmUnit.unitName}" berhasil dihapus dari daftar monitoring.`);
    setDeleteConfirmUnit(null);
  };

  // Batch delete selected units
  const handleDeleteSelectedUnits = () => {
    if (selectedFleetUnitNames.length === 0) return;
    setIsBatchDeleteConfirmOpen(true);
  };

  const handleConfirmBatchDeleteUnits = () => {
    if (selectedFleetUnitNames.length === 0) return;
    const count = selectedFleetUnitNames.length;
    const targetNorms = new Set(selectedFleetUnitNames.map(normalizeUnitName));
    const newFleet = effectiveFleet
      .filter((f) => !targetNorms.has(normalizeUnitName(f.unitName)))
      .map((u, idx) => ({ ...u, no: idx + 1 }));
    const newExcluded = Array.from(new Set([...excludedUnits, ...Array.from(targetNorms)]));

    setFleet(newFleet);
    setExcludedUnits(newExcluded);
    setSelectedFleetUnitNames([]);
    saveFleetRoster(newFleet, newExcluded);
    showFleetToast(`Berhasil menghapus ${count} unit armada terpilih!`);
    setIsBatchDeleteConfirmOpen(false);
  };

  // Geser posisi unit ke atas / ke bawah
  const handleMoveUnit = (unitName: string, direction: 'up' | 'down') => {
    const norm = normalizeUnitName(unitName);

    // Cari index di daftar yang saat ini ditampilkan di modal
    const visibleIdx = filteredModalFleet.findIndex(
      (u) => normalizeUnitName(u.unitName) === norm
    );
    if (visibleIdx < 0) return;

    const targetVisibleIdx = direction === 'up' ? visibleIdx - 1 : visibleIdx + 1;
    if (targetVisibleIdx < 0 || targetVisibleIdx >= filteredModalFleet.length) return;

    const targetUnit = filteredModalFleet[targetVisibleIdx];
    const targetNorm = normalizeUnitName(targetUnit.unitName);

    // Ambil referensi dari effectiveFleet lengkap
    const baseList: FleetUnit[] = [...effectiveFleet];
    const fromBaseIdx = baseList.findIndex((u) => normalizeUnitName(u.unitName) === norm);
    const toBaseIdx = baseList.findIndex((u) => normalizeUnitName(u.unitName) === targetNorm);

    if (fromBaseIdx < 0 || toBaseIdx < 0) return;

    const updated = [...baseList];
    const [removed] = updated.splice(fromBaseIdx, 1);
    updated.splice(toBaseIdx, 0, removed);

    const renumbered = updated.map((u, idx) => ({ ...u, no: idx + 1 }));
    setFleet(renumbered);
    saveFleetRoster(renumbered, excludedUnits);
    showFleetToast(
      `Posisi unit ${unitName} berhasil digeser ke ${direction === 'up' ? 'atas' : 'bawah'}.`
    );
  };

  // Pindahkan unit langsung ke urutan nomor tertentu
  const handleMoveToPosition = (unitName: string, targetPos: number) => {
    const norm = normalizeUnitName(unitName);
    const baseList: FleetUnit[] = [...effectiveFleet];
    const fromIdx = baseList.findIndex((u) => normalizeUnitName(u.unitName) === norm);
    if (fromIdx < 0) return;

    const clampedPos = Math.max(1, Math.min(baseList.length, Math.round(targetPos)));
    const toIdx = clampedPos - 1;

    if (fromIdx === toIdx) {
      setMovingUnit(null);
      return;
    }

    const updated = [...baseList];
    const [removed] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, removed);

    const renumbered = updated.map((u, idx) => ({ ...u, no: idx + 1 }));
    setFleet(renumbered);
    saveFleetRoster(renumbered, excludedUnits);
    showFleetToast(`Unit ${unitName} berhasil dipindahkan ke urutan #${clampedPos}.`);
    setMovingUnit(null);
  };

  // Start editing unit
  const handleStartEdit = (unit: FleetUnit) => {
    setEditingFleetUnit({
      ...unit,
      ownedBy: unit.ownedBy || LV_OWNED_BY_MAP[unit.unitName] || (isBusUnit(unit) ? 'PST' : 'PST'),
      unitType: unit.unitType || 'LV',
      plateNumber: unit.plateNumber || '',
      description: unit.description || '',
    });
  };

  // Save edited unit
  const handleSaveEditUnit = () => {
    if (!editingFleetUnit) return;
    const trimmed = editingFleetUnit.unitName.trim().toUpperCase();
    if (!trimmed) {
      showFleetToast('Nomor lambung / nama unit tidak boleh kosong!', 'error');
      return;
    }

    const oldNorm = normalizeUnitName(editingFleetUnit.unitName);
    const newNorm = normalizeUnitName(trimmed);

    // Check conflict with another unit
    const conflict = effectiveFleet.some(
      (u) => u.no !== editingFleetUnit.no && normalizeUnitName(u.unitName) === newNorm
    );
    if (conflict) {
      showFleetToast(`Nama unit "${trimmed}" sudah digunakan oleh armada lain!`, 'error');
      return;
    }

    let unitExistsInFleet = false;
    let newFleet = fleet.map((f) => {
      if (f.no === editingFleetUnit.no || normalizeUnitName(f.unitName) === oldNorm) {
        unitExistsInFleet = true;
        return {
          ...f,
          unitName: trimmed,
          dept: editingFleetUnit.dept.trim().toUpperCase(),
          ownedBy: editingFleetUnit.ownedBy?.trim().toUpperCase() || undefined,
          unitType: editingFleetUnit.unitType || 'LV',
          plateNumber: editingFleetUnit.plateNumber?.trim().toUpperCase() || undefined,
          description: editingFleetUnit.description?.trim() || undefined,
        };
      }
      return f;
    });

    // If unit was dynamically pushed from p2hRecords (not originally in fleet), add it explicitly
    if (!unitExistsInFleet) {
      newFleet = [
        ...newFleet,
        {
          no: editingFleetUnit.no,
          unitName: trimmed,
          dept: editingFleetUnit.dept.trim().toUpperCase(),
          ownedBy: editingFleetUnit.ownedBy?.trim().toUpperCase() || undefined,
          unitType: editingFleetUnit.unitType || 'LV',
          plateNumber: editingFleetUnit.plateNumber?.trim().toUpperCase() || undefined,
          description: editingFleetUnit.description?.trim() || undefined,
        },
      ];
    }

    // Un-exclude new name if it was in excluded list
    const newExcluded = excludedUnits.filter((ex) => normalizeUnitName(ex) !== newNorm);

    setFleet(newFleet);
    setExcludedUnits(newExcluded);
    saveFleetRoster(newFleet, newExcluded);
    setEditingFleetUnit(null);
    showFleetToast(`Data unit "${trimmed}" berhasil diperbarui!`);
  };

  // Reset fleet to default 38 units
  const handleResetFleet = () => {
    setIsResetFleetConfirmOpen(true);
  };

  const handleConfirmResetFleet = () => {
    const reset = resetFleetRoster();
    setFleet(reset);
    setExcludedUnits([]);
    setSelectedFleetUnitNames([]);
    showFleetToast('Daftar armada berhasil dikembalikan ke 38 unit standar PT. PST.');
    setIsResetFleetConfirmOpen(false);
  };

  // Kosongkan semua data status rekap manual / dummy
  const handleConfirmClearRecap = () => {
    clearAllRecapDummyData();
    setRecapOverrides({});
    showFleetToast('Semua data dummy status P2H pada tabel rekap telah berhasil dikosongkan!');
    setIsClearRecapConfirmOpen(false);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const categoryTag =
      fleetCategoryFilter === 'Bus'
        ? 'ARMADA BUS'
        : fleetCategoryFilter === 'LV'
        ? 'ARMADA LV'
        : 'SEMUA ARMADA';

    const ownerTag = selectedOwner !== 'ALL' ? ` - OWNER: ${selectedOwner}` : '';
    const showOwnedBy = true;
    let csv = `REKAP LAPORAN P2H HARIAN (${categoryTag}${ownerTag}) - ${monthNames[currentMonth - 1].toUpperCase()} ${currentYear}\n`;
    csv += `No,No. Lambung,Dept/PIC${showOwnedBy ? ',Owned By' : ''},${displayDays.map((d) => `Hari ${d}`).join(',')}\n`;

    filteredFleet.forEach((u) => {
      const dayStatuses = displayDays.map((d) => {
        const dateStr = getDateStr(d);
        const record = getUnitStatusForDate(u.unitName, dateStr, p2hRecords, recapOverrides);
        return record.status;
      });
      csv += `${u.no},"${u.unitName}","${u.dept}"${showOwnedBy ? `,"${u.ownedBy || '-'}"` : ''},${dayStatuses.join(',')}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rekap-p2h-${fleetCategoryFilter}-${currentYear}-${currentMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate Column Totals for a specific day
  const getDayTotals = (day: number) => {
    const dateStr = getDateStr(day);
    let totalP2H = 0;
    let totalBelum = 0;
    let totalBD = 0;
    let totalBU = 0;
    let totalStandby = 0;
    const totalUnit = filteredFleet.length;

    filteredFleet.forEach((u) => {
      const rec = getUnitStatusForDate(u.unitName, dateStr, p2hRecords, recapOverrides);
      if (rec.status === 'S1' || rec.status === 'S2' || rec.status === 'S1/S2') totalP2H++;
      else if (rec.status === 'B/D') totalBD++;
      else if (rec.status === 'BU') totalBU++;
      else if (rec.status === 'STANDBY') totalStandby++;
      else if (rec.status === 'BELUM') totalBelum++;
    });

    return {
      totalP2H,
      totalBelum,
      totalBD,
      totalBU,
      totalStandby,
      totalUnit,
    };
  };

  // Restrict access for non-admin users
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-4 border border-amber-200 shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">
          Akses Menu Rekap Harian Dibatasi
        </h2>
        <p className="text-sm text-slate-600 mb-6 max-w-lg mx-auto">
          Akun Anda saat ini terdaftar sebagai <strong className="text-slate-900 font-bold">{currentUser.name}</strong> (Peran: <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-mono font-bold text-xs">OPERATOR P2H - {currentUser.userCode}</span>).
          <br /><br />
          Menu Rekap Harian Seluruh Armada Site hanya dapat diakses oleh <strong className="text-slate-800">Administrator</strong> dan <strong className="text-slate-800">Pengawas K3/Fleet</strong>.
          Sebagai operator, Anda dapat mengisi form P2H dan memantau riwayat inspeksi unit kendaraan yang Anda periksa.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {onNavigateToHistory && (
            <button
              type="button"
              onClick={onNavigateToHistory}
              className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Truck className="w-4 h-4" />
              <span>Buka Riwayat P2H Saya</span>
            </button>
          )}

          {onOpenAuth && (
            <button
              type="button"
              onClick={onOpenAuth}
              className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Crown className="w-4 h-4 text-purple-600" />
              <span>Ganti ke Akun Admin</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-16">
      {/* View Switcher: Spreadsheet Matrix vs Rekap Detail Item P2H vs Grafik & Evaluasi User Bulanan */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setRecapViewMode('matrix')}
            className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              recapViewMode === 'matrix'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Matriks Status Bulanan (1-31 Hari)</span>
          </button>

          <button
            type="button"
            onClick={() => setRecapViewMode('item_detail')}
            className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              recapViewMode === 'item_detail'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Rekap Detail Item P2H</span>
          </button>

          <button
            type="button"
            onClick={() => setRecapViewMode('analytics')}
            className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              recapViewMode === 'analytics'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Grafik & Evaluasi User Bulanan</span>
            {lowComplianceUserCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                {lowComplianceUserCount} Evaluasi
              </span>
            )}
          </button>
        </div>

        {/* Quick Helper badge */}
        <div className="flex items-center gap-2 text-xs text-slate-500 pr-2">
          <span className="font-mono font-bold text-slate-800">
            {monthNames[currentMonth - 1]} {currentYear}
          </span>
          <span className="text-slate-300">•</span>
          <span>{daysInMonth} Hari Penuh</span>
        </div>
      </div>

      {recapViewMode === 'analytics' ? (
        <P2HMonthlyAnalytics
          p2hRecords={p2hRecords}
          currentYear={currentYear}
          currentMonth={currentMonth}
          onMonthChange={(m, y) => {
            setCurrentMonth(m);
            setCurrentYear(y);
          }}
          onOpenP2H={onOpenP2H}
          onNavigateToHistory={onNavigateToHistory}
        />
      ) : recapViewMode === 'item_detail' ? (
        <P2HItemDetailRecap
          p2hRecords={p2hRecords}
          effectiveFleet={effectiveFleet}
          currentYear={currentYear}
          currentMonth={currentMonth}
          onOpenP2H={onOpenP2H}
          onNewP2HForUnit={onNewP2HForUnit}
        />
      ) : (
        <>
          {/* Quick Jump to Analytics Banner in Matrix View */}
          {lowComplianceUserCount > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200/90 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-950 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-rose-100 text-rose-800 rounded-lg shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold">Monitoring & Evaluasi Operator ({monthNames[currentMonth - 1]} {currentYear}):</span>
                  <p className="text-[11px] text-slate-600">
                    Ditemukan <strong className="text-rose-700">{lowComplianceUserCount} operator</strong> yang belum melakukan pemeriksaan P2H bulan ini.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRecapViewMode('analytics')}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors text-xs shrink-0 self-start sm:self-auto flex items-center gap-1.5 shadow-2xs"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Buka Grafik & Evaluasi User ({lowComplianceUserCount})</span>
              </button>
            </div>
          )}

          {/* Top Controls & Header */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Header Title & Date Range Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-700" />
                <span>Rekap Laporan P2H Harian</span>
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                <Crown className="w-3 h-3 text-purple-600" />
                <span>Admin Full Access</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitoring status kesiapan seluruh armada per tanggal (S1, S2, B/D, BU, STANDBY).
            </p>
          </div>

          {/* Month / Year Navigator & 1 Bulan Indicator */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Month / Year Navigator */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  if (currentMonth === 1) {
                    setCurrentMonth(12);
                    setCurrentYear((y) => y - 1);
                  } else {
                    setCurrentMonth((m) => m - 1);
                  }
                }}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded active:scale-95 transition-all"
                title="Bulan sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-bold text-slate-800 px-2 min-w-[120px] text-center">
                {monthNames[currentMonth - 1]} {currentYear}
              </span>

              <button
                type="button"
                onClick={() => {
                  if (currentMonth === 12) {
                    setCurrentMonth(1);
                    setCurrentYear((y) => y + 1);
                  } else {
                    setCurrentMonth((m) => m + 1);
                  }
                }}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded active:scale-95 transition-all"
                title="Bulan berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 1 Bulan Full Badge Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs font-bold shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-blue-700" />
              <span>1 Bulan Penuh ({daysInMonth} Hari)</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2 border-b border-slate-100 pb-3">
          <button
            type="button"
            onClick={() => {
              setNewUnitType(fleetCategoryFilter === 'Bus' ? 'Bus' : 'LV');
              setIsAddFormExpanded(true);
              setIsFleetModalOpen(true);
            }}
            className="h-9 px-3 text-xs font-bold bg-blue-700 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs active:scale-98"
            title="Tambah armada baru ke tabel rekap data P2H"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Tambah Armada</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFleetModalOpen(true)}
            className="h-9 px-2.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs active:scale-98"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">Kelola Armada ({effectiveFleet.length})</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="h-9 px-2.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs active:scale-98"
            title="Unduh format spreadsheet CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsClearRecapConfirmOpen(true)}
            className="h-9 px-2.5 text-xs font-semibold bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs active:scale-98"
            title="Hapus semua data dummy / status manual rekap P2H"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="truncate">Kosongkan Rekap</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="h-9 px-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs active:scale-98"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Cetak</span>
          </button>
        </div>

        {/* Filter Bar: Dept / Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Department buttons */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full scrollbar-none">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 shrink-0">
              Dept:
            </span>
            <button
              type="button"
              onClick={() => setSelectedDept('ALL')}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap font-medium shrink-0 ${
                selectedDept === 'ALL'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({effectiveFleet.length})
            </button>
            {departments.map((dept) => {
              const count = effectiveFleet.filter((f) => f.dept === dept).length;
              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDept(dept)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap font-medium shrink-0 ${
                    selectedDept === dept
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {dept} ({count})
                </button>
              );
            })}
          </div>

          {/* Search unit */}
          <div className="relative w-full md:w-56 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchUnit}
              onChange={(e) => setSearchUnit(e.target.value)}
              placeholder="Cari No. Lambung..."
              className="w-full pl-8 pr-3 py-1.5 text-base sm:text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>
        </div>

        {/* Filter Bar 2: Filter Berdasarkan Kepemilikan (Owned By: PST, WARGI, BJR, BAGONG) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 mr-1 shrink-0 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            Owned By:
          </span>
          <button
            type="button"
            onClick={() => setSelectedOwner('ALL')}
            className={`px-2.5 py-1 text-xs rounded-md transition-all whitespace-nowrap font-medium shrink-0 ${
              selectedOwner === 'ALL'
                ? 'bg-slate-900 text-white font-bold shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Owner ({effectiveFleet.filter((u) => {
              if (fleetCategoryFilter === 'LV' && isBusUnit(u)) return false;
              if (fleetCategoryFilter === 'Bus' && !isBusUnit(u)) return false;
              return true;
            }).length})
          </button>
          {availableOwners.map((owner) => {
            const count = effectiveFleet.filter((f) => {
              if (fleetCategoryFilter === 'LV' && isBusUnit(f)) return false;
              if (fleetCategoryFilter === 'Bus' && !isBusUnit(f)) return false;
              return (f.ownedBy || '').trim().toUpperCase() === owner.toUpperCase();
            }).length;
            const isSelected = selectedOwner.toUpperCase() === owner.toUpperCase();
            return (
              <button
                key={owner}
                type="button"
                onClick={() => setSelectedOwner(isSelected ? 'ALL' : owner)}
                className={`px-2.5 py-1 text-xs rounded-md transition-all whitespace-nowrap font-medium shrink-0 flex items-center gap-1.5 ${getOwnerPillClasses(
                  owner,
                  isSelected
                )}`}
              >
                <span>{owner}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-black/25 text-white' : 'bg-slate-200/90 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
          {selectedOwner !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedOwner('ALL')}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold underline ml-1 shrink-0"
            >
              Reset Filter Owner
            </button>
          )}
        </div>

        {/* Fleet Category Switcher: Semua Unit vs Armada LV vs Armada Bus */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto max-w-full scrollbar-none">
            <button
              type="button"
              onClick={() => setFleetCategoryFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                fleetCategoryFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Armada ({effectiveFleet.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setFleetCategoryFilter('LV');
                if (selectedOwner === 'BAGONG') setSelectedOwner('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                fleetCategoryFilter === 'LV'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Rekap Armada LV ({lvCount})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFleetCategoryFilter('Bus');
                if (selectedOwner !== 'ALL' && selectedOwner !== 'BAGONG') setSelectedOwner('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                fleetCategoryFilter === 'Bus'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              <Bus className="w-3.5 h-3.5" />
              <span>Rekap Armada Bus ({busCount})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-medium flex items-center flex-wrap gap-1.5">
            <span>
              {fleetCategoryFilter === 'ALL' && 'Menampilkan seluruh rekap armada operasional site.'}
              {fleetCategoryFilter === 'LV' && 'Menampilkan khusus rekap harian unit Light Vehicle (LV).'}
              {fleetCategoryFilter === 'Bus' && 'Menampilkan khusus rekap harian armada Bus & Minibus.'}
            </span>
            {selectedOwner !== 'ALL' && (
              <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Filter Owned By: {selectedOwner} ({filteredFleet.length} unit)
              </span>
            )}
          </div>
        </div>

        {/* Legend / Status guide */}
        <div className="flex items-center gap-3 overflow-x-auto text-[11px] text-slate-600 pt-2 border-t border-slate-100 scrollbar-none">
          <span className="font-semibold text-slate-400 shrink-0">Keterangan:</span>
          <span className="inline-flex items-center gap-1 shrink-0">
            <span className="w-3 h-3 rounded-xs bg-[#bbf7d0] border border-emerald-400" />
            <strong>S1</strong> = P2H Shift 1 (06:00 - 18:00)
          </span>
          <span className="inline-flex items-center gap-1 shrink-0">
            <span className="w-3 h-3 rounded-xs bg-[#a7f3d0] border border-emerald-400" />
            <strong>S2</strong> = P2H Shift 2 (18:00 - 06:00)
          </span>
          <span className="inline-flex items-center gap-1 shrink-0">
            <span className="w-3 h-3 rounded-xs bg-[#10b981] border border-emerald-600" />
            <strong>S1/S2</strong> = Lengkap 2 Shift (S1 & S2)
          </span>
          <span className="inline-flex items-center gap-1 shrink-0">
            <span className="w-3 h-3 rounded-xs bg-[#ef4444] border border-red-600" />
            <strong>B/D</strong> = Breakdown (BD)
          </span>
          <span className="inline-flex items-center gap-1 shrink-0">
            <span className="w-3 h-3 rounded-xs bg-[#fef08a] border border-amber-300" />
            <strong>BU</strong> = Backup Unit (BU)
          </span>
          <span className="inline-flex items-center gap-1 shrink-0">
            <span className="w-3 h-3 rounded-xs bg-[#f59e0b] border border-amber-600" />
            <strong>STANDBY</strong> = Standby
          </span>
          <span className="inline-flex items-center gap-1 shrink-0 text-slate-400">
            <span className="w-3 h-3 rounded-xs bg-white border border-slate-300" />
            <strong>-</strong> = Belum P2H
          </span>
        </div>
      </div>

      {/* Mobile Swipe Hint */}
      <div className="flex sm:hidden items-center justify-between px-3 py-1.5 bg-blue-50 border border-blue-200 text-[11px] text-blue-800 rounded-lg">
        <span className="flex items-center gap-1.5 font-medium">
          Geser tabel ke kanan untuk melihat seluruh {daysInMonth} hari
        </span>
        <ChevronRight className="w-4 h-4 text-blue-600 shrink-0 animate-pulse" />
      </div>

      {/* Main Spreadsheet Table with Sticky Columns */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px] select-text">
            {/* Table Header */}
            <thead>
              <tr className="bg-[#184c78] text-white text-center font-bold tracking-tight">
                <th className="sticky left-0 z-20 bg-[#184c78] border border-slate-400/60 px-2 py-2 w-[38px] shrink-0">
                  No
                </th>
                <th className="sticky left-[38px] z-20 bg-[#184c78] border border-slate-400/60 px-3 py-2 w-[120px] text-left shadow-[2px_0_4px_-1px_rgba(0,0,0,0.2)]">
                  No. Lambung
                </th>
                <th className="border border-slate-400/60 px-3 py-2 w-[100px] text-center">
                  Dept/PIC
                </th>
                {showOwnedByColumn && (
                  <th className="border border-slate-400/60 px-2.5 py-2 w-[90px] text-center whitespace-nowrap">
                    Owned By
                  </th>
                )}
                {displayDays.map((day) => {
                  const isToday = isViewingCurrentMonth && day === currentDayOfMonth;
                  return (
                    <th
                      key={day}
                      className={`border border-slate-400/60 px-2 py-2 min-w-[50px] text-center ${
                        isToday ? 'bg-amber-500 text-slate-950 font-black' : ''
                      }`}
                      title={isToday ? `Hari Ini (Tgl ${day})` : `Tgl ${day}`}
                    >
                      <div>{day}</div>
                      {isToday && (
                        <div className="text-[8px] uppercase tracking-wider font-extrabold text-slate-950">
                          Hari ini
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {filteredFleet.length === 0 ? (
                <tr>
                  <td
                    colSpan={(showOwnedByColumn ? 4 : 3) + displayDays.length}
                    className="p-8 text-center text-slate-400 italic"
                  >
                    Tidak ada unit yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredFleet.map((unit) => {
                  return (
                    <tr
                      key={unit.no}
                      className="hover:bg-slate-100/60 transition-colors"
                    >
                      {/* No */}
                      <td className="sticky left-0 z-10 bg-slate-50 border border-slate-300 text-center py-1 font-medium text-slate-800">
                        {unit.no}
                      </td>

                      {/* No. Lambung */}
                      <td className="sticky left-[38px] z-10 border border-slate-300 px-3 py-1 font-bold font-mono text-slate-900 bg-white shadow-[2px_0_4px_-1px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center justify-between gap-1">
                          <span>{unit.unitName}</span>
                          <span className="text-[9px] font-sans font-semibold text-slate-500 bg-slate-100 px-1 py-0.5 rounded sm:hidden">
                            {unit.dept}
                          </span>
                        </div>
                      </td>

                      {/* Dept/PIC */}
                      <td className="border border-slate-300 px-2 py-1 text-center font-semibold text-slate-800 uppercase bg-white">
                        {unit.dept}
                      </td>

                      {/* Owned By (Kolom setelah Dept/PIC untuk Armada LV & Semua Armada) */}
                      {showOwnedByColumn && (
                        <td className="border border-slate-300 px-2 py-1 text-center font-bold text-slate-800 uppercase bg-white">
                          {unit.ownedBy ? (
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${getOwnerBadgeClasses(
                                unit.ownedBy
                              )}`}
                            >
                              {unit.ownedBy}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>
                      )}

                      {/* Day Columns */}
                      {displayDays.map((day) => {
                        const dateStr = getDateStr(day);
                        const rec = getUnitStatusForDate(
                          unit.unitName,
                          dateStr,
                          p2hRecords,
                          recapOverrides
                        );
                        const statusDef = STATUS_DEFINITIONS[rec.status];
                        const isToday = isViewingCurrentMonth && day === currentDayOfMonth;

                        return (
                          <td
                            key={day}
                            onClick={() =>
                              setEditingCell({
                                unit,
                                day,
                                dateStr,
                                currentRecord: rec,
                              })
                            }
                            className={`border border-slate-300 text-center py-1.5 px-1 cursor-pointer transition-all ${
                              statusDef.bgClass
                            } ${statusDef.textClass} ${
                              isToday ? 'ring-1 ring-amber-400 ring-inset' : ''
                            } active:scale-95`}
                            title={`Klik untuk ubah status (${unit.unitName} - Tgl ${day}: ${statusDef.desc})`}
                          >
                            <span className="block text-[11px] leading-tight select-none font-bold">
                              {rec.status === 'BELUM' ? '-' : rec.status}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}

              {/* Bottom Summary Rows */}
              {/* Row 1: Total P2H (Green) */}
              <tr className="bg-white font-bold">
                <td
                  colSpan={2}
                  className="sticky left-0 z-10 border border-slate-400 px-3 py-1.5 text-left text-slate-900 bg-[#bbf7d0] shadow-[2px_0_4px_-1px_rgba(0,0,0,0.1)]"
                >
                  Total P2H
                </td>
                <td className="border border-slate-400 bg-[#bbf7d0]" />
                {showOwnedByColumn && (
                  <td className="border border-slate-400 bg-[#bbf7d0]" />
                )}
                {displayDays.map((day) => {
                  const totals = getDayTotals(day);
                  return (
                    <td
                      key={`total-p2h-${day}`}
                      className="border border-slate-400 text-center py-1.5 font-bold font-mono text-slate-900"
                    >
                      {totals.totalP2H}
                    </td>
                  );
                })}
              </tr>

              {/* Row 2: Total Belum P2H */}
              <tr className="bg-white font-bold">
                <td
                  colSpan={2}
                  className="sticky left-0 z-10 border border-slate-400 px-3 py-1.5 text-left text-slate-900 bg-white shadow-[2px_0_4px_-1px_rgba(0,0,0,0.1)]"
                >
                  Total Belum P2H
                </td>
                <td className="border border-slate-400 bg-white" />
                {showOwnedByColumn && (
                  <td className="border border-slate-400 bg-white" />
                )}
                {displayDays.map((day) => {
                  const totals = getDayTotals(day);
                  return (
                    <td
                      key={`total-belum-${day}`}
                      className="border border-slate-400 text-center py-1.5 font-bold font-mono text-slate-900"
                    >
                      {totals.totalBelum}
                    </td>
                  );
                })}
              </tr>

              {/* Row 3: Total B/D (Peach/Pink) */}
              <tr className="bg-white font-bold">
                <td
                  colSpan={2}
                  className="sticky left-0 z-10 border border-slate-400 px-3 py-1.5 text-left text-slate-900 bg-[#fde2e2] shadow-[2px_0_4px_-1px_rgba(0,0,0,0.1)]"
                >
                  Total B/D
                </td>
                <td className="border border-slate-400 bg-[#fde2e2]" />
                {showOwnedByColumn && (
                  <td className="border border-slate-400 bg-[#fde2e2]" />
                )}
                {displayDays.map((day) => {
                  const totals = getDayTotals(day);
                  return (
                    <td
                      key={`total-bd-${day}`}
                      className="border border-slate-400 text-center py-1.5 font-bold font-mono text-slate-900"
                    >
                      {totals.totalBD}
                    </td>
                  );
                })}
              </tr>

              {/* Row 4: Total BU (Yellow) */}
              <tr className="bg-white font-bold">
                <td
                  colSpan={2}
                  className="sticky left-0 z-10 border border-slate-400 px-3 py-1.5 text-left text-slate-900 bg-[#fef08a] shadow-[2px_0_4px_-1px_rgba(0,0,0,0.1)]"
                >
                  Total BU
                </td>
                <td className="border border-slate-400 bg-[#fef08a]" />
                {showOwnedByColumn && (
                  <td className="border border-slate-400 bg-[#fef08a]" />
                )}
                {displayDays.map((day) => {
                  const totals = getDayTotals(day);
                  return (
                    <td
                      key={`total-bu-${day}`}
                      className="border border-slate-400 text-center py-1.5 font-bold font-mono text-slate-900"
                    >
                      {totals.totalBU}
                    </td>
                  );
                })}
              </tr>

              {/* Row 5: Total Standby (Orange) */}
              <tr className="bg-white font-bold">
                <td
                  colSpan={2}
                  className="sticky left-0 z-10 border border-slate-400 px-3 py-1.5 text-left text-slate-900 bg-[#f59e0b] shadow-[2px_0_4px_-1px_rgba(0,0,0,0.1)]"
                >
                  Total Standby
                </td>
                <td className="border border-slate-400 bg-[#f59e0b]" />
                {showOwnedByColumn && (
                  <td className="border border-slate-400 bg-[#f59e0b]" />
                )}
                {displayDays.map((day) => {
                  const totals = getDayTotals(day);
                  return (
                    <td
                      key={`total-standby-${day}`}
                      className="border border-slate-400 text-center py-1.5 font-bold font-mono text-slate-900"
                    >
                      {totals.totalStandby}
                    </td>
                  );
                })}
              </tr>

              {/* Row 6: Total Unit (Light Blue) */}
              <tr className="bg-white font-bold">
                <td
                  colSpan={2}
                  className="sticky left-0 z-10 border border-slate-400 px-3 py-1.5 text-left text-slate-900 bg-[#bfdbfe] shadow-[2px_0_4px_-1px_rgba(0,0,0,0.1)]"
                >
                  Total Unit
                </td>
                <td className="border border-slate-400 bg-[#bfdbfe]" />
                {showOwnedByColumn && (
                  <td className="border border-slate-400 bg-[#bfdbfe]" />
                )}
                {displayDays.map((day) => {
                  const totals = getDayTotals(day);
                  return (
                    <td
                      key={`total-unit-${day}`}
                      className="border border-slate-400 text-center py-1.5 font-bold font-mono text-slate-900"
                    >
                      {totals.totalUnit}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* MODAL 1: Quick Status Editor & Inspector for Cell */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">
                  Update Status: {editingCell.unit.unitName}
                </h3>
                <p className="text-xs text-slate-400">
                  Tanggal {editingCell.dateStr} (Hari ke-{editingCell.day}) · {editingCell.unit.dept}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Linked P2H Inspections (Shift 1 and/or Shift 2) */}
              {(() => {
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

                const targetNorm = normalizeUnitName(editingCell.unit.unitName);
                const cellRecords = p2hRecords.filter((r) => {
                  const rNorm = normalizeUnitName(r.unitName);
                  const rDate = (r.date || '').slice(0, 10);
                  return rNorm === targetNorm && rDate === editingCell.dateStr;
                });

                const s1Record = cellRecords.find((r) => isShift1(r.shift));
                const s2Record = cellRecords.find((r) => isShift2(r.shift));
                const hasBoth = Boolean(s1Record && s2Record);

                return (
                  <div className="space-y-2.5">
                    {hasBoth ? (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs">
                        <div className="flex items-center gap-1.5 font-bold mb-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Unit Digunakan 2 Shift Penuh (S1/S2)</span>
                        </div>
                        <p className="text-[11px] text-emerald-800">
                          Terdapat 2 form P2H online dari operator berbeda untuk Shift 1 dan Shift 2 pada tanggal ini.
                        </p>
                      </div>
                    ) : cellRecords.length > 0 ? (
                      <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold flex items-center justify-between">
                        <span>Dokumen P2H Online Terdaftar ({cellRecords.length} Form)</span>
                        <span className="text-[10px] bg-blue-200/60 px-2 py-0.5 rounded text-blue-900 font-mono">
                          {s1Record ? 'Shift 1 Selesai' : s2Record ? 'Shift 2 Selesai' : 'P2H Masuk'}
                        </span>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-xs text-center">
                        Belum ada dokumen P2H online untuk unit ini pada tanggal {editingCell.dateStr}.
                      </div>
                    )}

                    {/* Shift 1 Card */}
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                        s1Record
                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                          : 'bg-slate-50/70 border-slate-200 text-slate-600'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded font-black text-[10px] bg-emerald-600 text-white">
                            SHIFT 1
                          </span>
                          <span className="font-bold truncate">
                            {s1Record ? s1Record.operatorName : 'Belum diisi'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {s1Record
                            ? `KM/HM: ${s1Record.kmHm || '-'} • Status: ${s1Record.unitConditionStatus || 'RFU'}`
                            : 'Pemeriksaan Shift 1 (06:00 - 18:00)'}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {s1Record && onOpenP2H ? (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenP2H(s1Record);
                              setEditingCell(null);
                            }}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded text-[11px] flex items-center gap-1 shadow-2xs"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Lihat S1</span>
                          </button>
                        ) : onNewP2HForUnit ? (
                          <button
                            type="button"
                            onClick={() => {
                              onNewP2HForUnit(
                                editingCell.unit.unitName,
                                'Shift 1 (06:00 - 18:00)',
                                editingCell.dateStr
                              );
                              setEditingCell(null);
                            }}
                            className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-bold rounded text-[11px] flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Isi S1</span>
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* Shift 2 Card */}
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                        s2Record
                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                          : 'bg-slate-50/70 border-slate-200 text-slate-600'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded font-black text-[10px] bg-teal-600 text-white">
                            SHIFT 2
                          </span>
                          <span className="font-bold truncate">
                            {s2Record ? s2Record.operatorName : 'Belum diisi'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {s2Record
                            ? `KM/HM: ${s2Record.kmHm || '-'} • Status: ${s2Record.unitConditionStatus || 'RFU'}`
                            : 'Pemeriksaan Shift 2 (18:00 - 06:00)'}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {s2Record && onOpenP2H ? (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenP2H(s2Record);
                              setEditingCell(null);
                            }}
                            className="px-2.5 py-1 bg-teal-700 hover:bg-teal-600 text-white font-bold rounded text-[11px] flex items-center gap-1 shadow-2xs"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Lihat S2</span>
                          </button>
                        ) : onNewP2HForUnit ? (
                          <button
                            type="button"
                            onClick={() => {
                              onNewP2HForUnit(
                                editingCell.unit.unitName,
                                'Shift 2 (18:00 - 06:00)',
                                editingCell.dateStr
                              );
                              setEditingCell(null);
                            }}
                            className="px-2.5 py-1 bg-teal-100 hover:bg-teal-200 text-teal-900 border border-teal-300 font-bold rounded text-[11px] flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Isi S2</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Status Radio Buttons (Including S1/S2) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Atur Status Manual Cell:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['S1', 'S2', 'S1/S2', 'B/D', 'BU', 'STANDBY', 'BELUM'] as UnitRecapStatus[]).map((st) => {
                    const def = STATUS_DEFINITIONS[st];
                    const isSelected = editingCell.currentRecord.status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() =>
                          handleUpdateStatus(
                            editingCell.unit.unitName,
                            editingCell.dateStr,
                            st
                          )
                        }
                        className={`p-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            <span
                              className={`w-3 h-3 rounded-xs ${def.bgClass} border border-slate-300 inline-block`}
                            />
                            <span>{st}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                            {st === 'S1'
                              ? 'P2H Shift 1'
                              : st === 'S2'
                              ? 'P2H Shift 2'
                              : st === 'S1/S2'
                              ? '2 Shift (S1/S2)'
                              : st === 'B/D'
                              ? 'Breakdown'
                              : st === 'BU'
                              ? 'Backup Unit'
                              : st === 'STANDBY'
                              ? 'Standby'
                              : 'Belum P2H'}
                          </span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action to create new P2H for unit */}
              {onNewP2HForUnit && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Buat form P2H baru untuk unit ini:</span>
                  <button
                    type="button"
                    onClick={() => {
                      onNewP2HForUnit(editingCell.unit.unitName, undefined, editingCell.dateStr);
                      setEditingCell(null);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Input Form P2H
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Fleet Management (Add / Delete / Edit Unit) */}
      {isFleetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-white">
                      Kelola Daftar Armada PT. PST
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold font-mono">
                      {effectiveFleet.length} Unit
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Tambah, edit, atau hapus unit armada dari daftar monitoring rekap & form P2H
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFleetModalOpen(false);
                  setSelectedFleetUnitNames([]);
                  setEditingFleetUnit(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* In-Modal Toast Banner */}
            {fleetToast && (
              <div
                className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between transition-all ${
                  fleetToast.type === 'error'
                    ? 'bg-rose-50 text-rose-800 border-b border-rose-200'
                    : fleetToast.type === 'info'
                    ? 'bg-blue-50 text-blue-800 border-b border-blue-200'
                    : 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {fleetToast.type === 'error' ? (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <span>{fleetToast.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFleetToast(null)}
                  className="text-slate-400 hover:text-slate-700 ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Action & Filter Toolbar */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddFormExpanded(!isAddFormExpanded)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs ${
                        isAddFormExpanded
                          ? 'bg-slate-800 text-white'
                          : 'bg-blue-700 hover:bg-blue-600 text-white'
                      }`}
                    >
                      {isAddFormExpanded ? (
                        <>
                          <X className="w-3.5 h-3.5" />
                          Tutup Form Tambah
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          Tambah Unit Baru
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleResetFleet}
                      className="px-2.5 py-1.5 text-xs text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-semibold rounded-lg flex items-center gap-1 transition-colors"
                      title="Kembalikan daftar armada ke 38 unit standar awal"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Reset Standar (38 Unit)</span>
                      <span className="sm:hidden">Reset</span>
                    </button>
                  </div>

                  <span className="text-xs text-slate-500 font-mono">
                    Menampilkan {filteredModalFleet.length} dari {effectiveFleet.length} unit
                  </span>
                </div>

                {/* Add Unit Form (Expandable) */}
                {isAddFormExpanded && (
                  <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-blue-700" />
                        Form Tambah Unit Armada Baru
                      </span>
                      <span className="text-[11px] text-blue-700">PT. PST Fleet Management</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          No. Lambung <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newUnitName}
                          onChange={(e) => setNewUnitName(e.target.value.toUpperCase())}
                          placeholder="e.g. LV 60, PST 02"
                          className="w-full px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Departemen / PIC
                        </label>
                        <select
                          value={newUnitDept}
                          onChange={(e) => setNewUnitDept(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          {FLEET_DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Owned By
                        </label>
                        <select
                          value={newUnitOwnedBy}
                          onChange={(e) => setNewUnitOwnedBy(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="PST">PST</option>
                          <option value="WARGI">WARGI</option>
                          <option value="BJR">BJR</option>
                          <option value="BAGONG">BAGONG</option>
                          <option value="LAINNYA">LAINNYA</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Jenis Unit
                        </label>
                        <select
                          value={newUnitType}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewUnitType(val);
                            if (val === 'Bus') {
                              setNewUnitOwnedBy('BAGONG');
                            }
                          }}
                          className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          {FLEET_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Plat Nomor / No. Polisi (Opsional)
                        </label>
                        <input
                          type="text"
                          value={newUnitPlate}
                          onChange={(e) => setNewUnitPlate(e.target.value.toUpperCase())}
                          placeholder="e.g. KT 8234 PST"
                          className="w-full px-3 py-1.5 text-xs font-mono uppercase rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Keterangan / Lokasi (Opsional)
                        </label>
                        <input
                          type="text"
                          value={newUnitDesc}
                          onChange={(e) => setNewUnitDesc(e.target.value)}
                          placeholder="e.g. Unit Operasional Pit 2 / Ranger"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddFormExpanded(false)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleAddUnit}
                        className="px-4 py-1.5 bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Simpan Unit ke Armada
                      </button>
                    </div>
                  </div>
                )}

                {/* Search & Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="relative sm:col-span-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={fleetSearchQuery}
                      onChange={(e) => setFleetSearchQuery(e.target.value)}
                      placeholder="Cari armada, plat, PIC..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                    {fleetSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setFleetSearchQuery('')}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div>
                    <select
                      value={fleetDeptFilter}
                      onChange={(e) => setFleetDeptFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      <option value="ALL">Semua Departemen</option>
                      {FLEET_DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={fleetOwnerFilter}
                      onChange={(e) => setFleetOwnerFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      <option value="ALL">Semua Owned By</option>
                      <option value="PST">PST</option>
                      <option value="WARGI">WARGI</option>
                      <option value="BJR">BJR</option>
                      <option value="BAGONG">BAGONG</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={fleetTypeFilter}
                      onChange={(e) => setFleetTypeFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      <option value="ALL">Semua Jenis Unit</option>
                      {FLEET_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Batch Action Bar (Appears when units are selected) */}
                {selectedFleetUnitNames.length > 0 && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-150">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <span className="font-bold text-rose-900">
                        {selectedFleetUnitNames.length} unit dipilih
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedFleetUnitNames([])}
                        className="px-2.5 py-1 text-slate-600 hover:text-slate-800 font-semibold rounded-lg hover:bg-rose-100 transition-colors"
                      >
                        Batal Pilih
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteSelectedUnits}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus {selectedFleetUnitNames.length} Unit Terpilih
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Unit List Table/Card Header */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500 pb-1.5 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleSelectAllModal}
                      className="flex items-center gap-1.5 text-slate-700 font-semibold hover:text-blue-700 transition-colors"
                      title={isAllModalSelected ? 'Batalkan pilih semua' : 'Pilih semua'}
                    >
                      {isAllModalSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span>Pilih Semua</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium">
                    Urutkan (▲/▼) • Edit • Hapus
                  </span>
                </div>

                {/* Unit List Container */}
                <div className="max-h-80 sm:max-h-96 overflow-y-auto space-y-1.5 pr-1">
                  {filteredModalFleet.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <Truck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">Tidak ada unit yang cocok</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Coba sesuaikan kata kunci pencarian atau filter departemen / jenis unit.
                      </p>
                    </div>
                  ) : (
                    filteredModalFleet.map((unit, index) => {
                      const isSelected = selectedFleetUnitNames.includes(unit.unitName);
                      const isFirst = index === 0;
                      const isLast = index === filteredModalFleet.length - 1;

                      return (
                        <div
                          key={unit.unitName}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                            isSelected
                              ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-200'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {/* Checkbox */}
                            <button
                              type="button"
                              onClick={() => handleToggleSelectOneModal(unit.unitName)}
                              className="text-slate-400 hover:text-blue-600 transition-colors shrink-0"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-rose-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>

                            {/* Tombol Geser Urutan (Ke Atas / Ke Bawah) */}
                            <div className="flex flex-col items-center gap-0.5 shrink-0 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                              <button
                                type="button"
                                disabled={isFirst}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveUnit(unit.unitName, 'up');
                                }}
                                className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-blue-700 hover:bg-white active:scale-90 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
                                title="Geser unit ini 1 tingkat ke atas"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isLast}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveUnit(unit.unitName, 'down');
                                }}
                                className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-blue-700 hover:bg-white active:scale-90 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
                                title="Geser unit ini 1 tingkat ke bawah"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Unit Index (Bisa diklik untuk lompat ke nomor urut tertentu) */}
                            <button
                              type="button"
                              onClick={() => {
                                setMovingUnit(unit);
                                setTargetPositionInput(unit.no || index + 1);
                              }}
                              className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-800 hover:border-blue-300 rounded text-slate-600 font-mono text-[11px] font-bold shrink-0 transition-colors border border-slate-200 cursor-pointer"
                              title="Klik untuk langsung memindahkan ke nomor urutan tertentu"
                            >
                              #{unit.no}
                            </button>

                            {/* Unit Name & Details */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold font-mono text-slate-900 text-xs sm:text-sm">
                                  {unit.unitName}
                                </span>

                                {/* Jenis Unit Badge */}
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                    unit.unitType === 'Bus'
                                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                      : unit.unitType === 'Truk'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : unit.unitType === 'Sarana'
                                      ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                      : unit.unitType === 'Alat Berat'
                                      ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                                  }`}
                                >
                                  {unit.unitType || 'LV'}
                                </span>

                                {/* Dept Badge */}
                                <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded font-medium border border-slate-200">
                                  {unit.dept}
                                </span>

                                {/* Owned By Badge */}
                                {unit.ownedBy && (
                                  <span
                                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${getOwnerBadgeClasses(
                                      unit.ownedBy
                                    )}`}
                                  >
                                    Owner: {unit.ownedBy}
                                  </span>
                                )}

                                {/* Plate Number if any */}
                                {unit.plateNumber && (
                                  <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200 hidden sm:inline">
                                    {unit.plateNumber}
                                  </span>
                                )}
                              </div>

                              {unit.description && (
                                <p className="text-[10px] text-slate-400 truncate mt-0.5 max-w-xs sm:max-w-md">
                                  {unit.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons: Edit & Delete */}
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleStartEdit(unit)}
                              className="px-2 py-1 text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg font-semibold text-[11px] transition-colors flex items-center gap-1"
                              title="Edit data armada ini"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span className="hidden sm:inline">Edit</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteUnit(unit);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus unit dari armada"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                Perubahan langsung tersimpan ke cloud dan sinkron dengan sistem P2H.
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsFleetModalOpen(false);
                  setSelectedFleetUnitNames([]);
                  setEditingFleetUnit(null);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors ml-auto"
              >
                Tutup Kelola Armada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Pindah Posisi Urutan Langsung */}
      {movingUnit && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <MoveVertical className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Pindah Posisi Urutan
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Atur urutan untuk unit <strong className="text-slate-900 font-bold font-mono">{movingUnit.unitName}</strong>
                <br />
                (Saat ini berada di nomor urut <span className="text-blue-700 font-bold font-mono">#{movingUnit.no}</span>)
              </p>

              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Pindah ke Urutan Nomor (1 s/d {effectiveFleet.length}):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={effectiveFleet.length}
                    value={targetPositionInput}
                    onChange={(e) => setTargetPositionInput(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-center text-lg font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 text-[11px] pt-1">
                  <button
                    type="button"
                    onClick={() => setTargetPositionInput(1)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium rounded-md transition-colors"
                  >
                    Paling Atas (#1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetPositionInput(effectiveFleet.length)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium rounded-md transition-colors"
                  >
                    Paling Bawah (#{effectiveFleet.length})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => setMovingUnit(null)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveToPosition(movingUnit.unitName, targetPositionInput)}
                  className="py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
                >
                  Terapkan Urutan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Unit Sub-Modal */}
      {editingFleetUnit && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                <div>
                  <h4 className="font-bold text-sm text-white">Edit Data Armada</h4>
                  <p className="text-[11px] text-slate-400">
                    Ubah no. lambung, departemen, jenis, atau nomor polisi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingFleetUnit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <div className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Lambung / Nama Unit <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingFleetUnit.unitName}
                  onChange={(e) =>
                    setEditingFleetUnit({
                      ...editingFleetUnit,
                      unitName: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g. LV 16"
                  className="w-full px-3 py-2 text-sm font-mono font-bold uppercase rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Departemen / PIC
                  </label>
                  <select
                    value={editingFleetUnit.dept}
                    onChange={(e) =>
                      setEditingFleetUnit({
                        ...editingFleetUnit,
                        dept: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {FLEET_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Owned By
                  </label>
                  <select
                    value={editingFleetUnit.ownedBy || (editingFleetUnit.unitType === 'Bus' ? 'BAGONG' : 'PST')}
                    onChange={(e) =>
                      setEditingFleetUnit({
                        ...editingFleetUnit,
                        ownedBy: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="PST">PST</option>
                    <option value="WARGI">WARGI</option>
                    <option value="BJR">BJR</option>
                    <option value="BAGONG">BAGONG</option>
                    <option value="LAINNYA">LAINNYA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Unit
                  </label>
                  <select
                    value={editingFleetUnit.unitType || 'LV'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingFleetUnit({
                        ...editingFleetUnit,
                        unitType: val,
                        ownedBy:
                          val === 'Bus' &&
                          (!editingFleetUnit.ownedBy || editingFleetUnit.ownedBy === 'PST')
                            ? 'BAGONG'
                            : editingFleetUnit.ownedBy,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {FLEET_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Plat Nomor / No. Polisi (Opsional)
                </label>
                <input
                  type="text"
                  value={editingFleetUnit.plateNumber || ''}
                  onChange={(e) =>
                    setEditingFleetUnit({
                      ...editingFleetUnit,
                      plateNumber: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g. KT 8234 PST"
                  className="w-full px-3 py-2 text-xs font-mono uppercase rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan / Lokasi Operasional (Opsional)
                </label>
                <input
                  type="text"
                  value={editingFleetUnit.description || ''}
                  onChange={(e) =>
                    setEditingFleetUnit({
                      ...editingFleetUnit,
                      description: e.target.value,
                    })
                  }
                  placeholder="e.g. Operasional Pit 1, Standby Workshop"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingFleetUnit(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEditUnit}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                Simpan Perubahan Armada
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 4: Single Unit Delete Confirmation */}
      {deleteConfirmUnit && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Hapus Unit dari Armada?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Unit ini akan dihapus dari daftar monitoring armada aktif dan tidak akan ditampilkan pada rekapitulasi.
              </p>

              {/* Unit Info Box */}
              <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Nomor Lambung:</span>
                  <span className="font-mono font-bold text-base text-slate-900">
                    {deleteConfirmUnit.unitName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Departemen:</span>
                  <span className="font-semibold text-slate-800">
                    {deleteConfirmUnit.dept}
                  </span>
                </div>
                {deleteConfirmUnit.unitType && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Jenis Unit:</span>
                    <span className="text-slate-700 font-medium">
                      {deleteConfirmUnit.unitType}
                    </span>
                  </div>
                )}
                {deleteConfirmUnit.plateNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Plat Nomor:</span>
                    <span className="font-mono text-slate-700">
                      {deleteConfirmUnit.plateNumber}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmUnit(null)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteSingleUnit}
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
                >
                  Ya, Hapus Unit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Batch Delete Units Confirmation */}
      {isBatchDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Hapus {selectedFleetUnitNames.length} Unit Armada Terpilih?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Semua unit terpilih berikut akan dihapus dari daftar monitoring armada:
              </p>

              <div className="mt-4 p-3 bg-rose-50/60 rounded-xl border border-rose-200 text-left max-h-40 overflow-y-auto">
                <div className="flex flex-wrap gap-1.5">
                  {selectedFleetUnitNames.map((name) => (
                    <span
                      key={name}
                      className="font-mono text-xs font-bold bg-white text-rose-900 border border-rose-300 px-2 py-0.5 rounded shadow-2xs"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => setIsBatchDeleteConfirmOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBatchDeleteUnits}
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
                >
                  Ya, Hapus {selectedFleetUnitNames.length} Unit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Reset Fleet to 38 Standard Units Confirmation */}
      {isResetFleetConfirmOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Atur Ulang ke 38 Unit Standar?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Kembalikan daftar armada ke 38 unit standar awal PT. PST.
                Semua unit yang pernah dihapus atau ditambahkan secara manual akan dikembalikan ke susunan default.
              </p>

              <div className="grid grid-cols-2 gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => setIsResetFleetConfirmOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmResetFleet}
                  className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
                >
                  Ya, Atur Ulang Standar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: Clear All Recap Dummy Data Confirmation */}
      {isClearRecapConfirmOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Kosongkan Semua Data Rekap P2H?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Semua data dummy atau catatan status manual pada tabel rekap P2H akan dikosongkan kembali ke tanda strip (<span className="font-mono font-bold text-slate-700">-</span> / Belum P2H).
                Daftar unit armada Anda tidak akan terhapus.
              </p>

              <div className="grid grid-cols-2 gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => setIsClearRecapConfirmOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearRecap}
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
                >
                  Ya, Kosongkan Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
