import React, { useState, useMemo } from 'react';
import {
  P2HRecord,
  P2HChecklistItem,
  P2H_CHECKLIST_DATA,
  P2H_CHECKLIST_BUS,
  P2H_CHECKLIST_LV,
  ItemCheckStatus,
  UnitReadinessStatus,
  FitToWorkData,
} from '../types/p2h';
import { calculateRecordStatus } from '../utils/storage';
import { SignaturePadModal } from './SignaturePadModal';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PenTool,
  Printer,
  Save,
  RotateCcw,
  Sparkles,
  Info,
  Clock,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  PauseCircle,
  Layers,
  Car,
  Bus,
  Lock,
  HeartPulse,
  ShieldCheck,
} from 'lucide-react';
import { AppUser } from '../types/auth';
import { getFleetRoster, isBusUnit } from '../utils/recapStorage';

interface P2HFormInteractiveProps {
  initialRecord?: P2HRecord | null;
  currentUser?: AppUser | null;
  onSave: (record: P2HRecord) => void;
  onPreviewPrint: (record: P2HRecord) => void;
  onCancel?: () => void;
}

export const P2HFormInteractive: React.FC<P2HFormInteractiveProps> = ({
  initialRecord,
  currentUser,
  onSave,
  onPreviewPrint,
  onCancel,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  const today = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Form Category State: 'LV' vs 'Bus'
  const [formCategory, setFormCategory] = useState<'LV' | 'Bus'>(() => {
    if (initialRecord?.p2hCategory) return initialRecord.p2hCategory;
    const ut = (initialRecord?.unitType || initialRecord?.unitName || '').trim().toUpperCase();
    if (isBusUnit({ unitName: ut, unitType: initialRecord?.unitType })) return 'Bus';
    return 'LV';
  });

  // Active fleet suggestions from roster
  const activeFleetSuggestions = useMemo(() => {
    const all = getFleetRoster();
    if (formCategory === 'Bus') {
      return all.filter((u) => isBusUnit(u));
    }
    return all.filter((u) => !isBusUnit(u));
  }, [formCategory]);

  // Form State
  const [unitName, setUnitName] = useState(initialRecord?.unitName || '');
  const [unitTypeCategory, setUnitTypeCategory] = useState<string>(() => {
    if (initialRecord?.unitType) {
      const ut = initialRecord.unitType.trim().toUpperCase();
      if (ut === 'BUS' || ut.includes('BUS')) return 'Bus';
      if (ut === 'LV' || ut.startsWith('LV ') || ut.includes('LIGHT VEHICLE')) return 'LV';
      return 'Lainnya';
    }
    return formCategory === 'Bus' ? 'Bus' : 'LV';
  });

  const [customUnitType, setCustomUnitType] = useState<string>(() => {
    if (!initialRecord?.unitType) return '';
    const ut = initialRecord.unitType.trim().toUpperCase();
    if (
      ut === 'LV' ||
      ut.startsWith('LV ') ||
      ut.includes('LIGHT VEHICLE') ||
      ut === 'BUS' ||
      ut.includes('BUS')
    ) {
      return '';
    }
    return initialRecord.unitType;
  });

  const [unitType, setUnitType] = useState<string>(() => {
    if (initialRecord?.unitType) return initialRecord.unitType;
    return formCategory === 'Bus' ? 'Bus' : 'LV';
  });

  const [operatorName, setOperatorName] = useState(
    initialRecord?.operatorName || currentUser?.name || ''
  );
  const [date, setDate] = useState(initialRecord?.date || today);
  const [shift, setShift] = useState(
    initialRecord?.shift
      ? initialRecord.shift.includes('2')
        ? 'Shift 2 (18:00 - 06:00)'
        : 'Shift 1 (06:00 - 18:00)'
      : 'Shift 1 (06:00 - 18:00)'
  );
  const [kmHm, setKmHm] = useState(initialRecord?.kmHm || '');
  const [unitConditionStatus, setUnitConditionStatus] = useState<UnitReadinessStatus>(
    initialRecord?.unitConditionStatus || 'RFU'
  );

  // Driver Fit to Work Questionnaire (Khusus Bus)
  const [fitToWork, setFitToWork] = useState<FitToWorkData>(() => {
    return (
      initialRecord?.fitToWork || {
        jumlahJamTidur: '7',
        minumObat: 'tidak',
        dalamKondisiFit: 'ya',
        adaMasalahPribadi: 'tidak',
        siapBekerja: 'ya',
      }
    );
  });

  // Checklist selection: P2H_CHECKLIST_BUS vs P2H_CHECKLIST_LV
  const activeChecklist = useMemo(() => {
    return formCategory === 'Bus' ? P2H_CHECKLIST_BUS : P2H_CHECKLIST_LV;
  }, [formCategory]);

  // Checklist items status
  const [items, setItems] = useState<Record<string, ItemCheckStatus>>(() => {
    if (initialRecord?.items) {
      return initialRecord.items;
    }
    return {};
  });

  // Signatures
  const [operatorSignature, setOperatorSignature] = useState<string | null>(
    initialRecord?.operatorSignature || null
  );
  const [operatorSignedAt, setOperatorSignedAt] = useState<string | null>(
    initialRecord?.operatorSignedAt || null
  );
  const [foremanName, setForemanName] = useState(initialRecord?.foremanName || '');
  const [foremanSignature, setForemanSignature] = useState<string | null>(
    initialRecord?.foremanSignature || null
  );
  const [foremanSignedAt, setForemanSignedAt] = useState<string | null>(
    initialRecord?.foremanSignedAt || null
  );
  const [foremanNotes, setForemanNotes] = useState(initialRecord?.foremanNotes || '');

  // Active Category Filter Tab
  const [activeTab, setActiveTab] = useState<'ALL' | 'A' | 'B' | 'C' | 'DEFECTS'>('ALL');
  const [signatureModalRole, setSignatureModalRole] = useState<'operator' | 'foreman' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Statistics & Status
  const checkedCount = Object.keys(items).length;
  const totalCount = activeChecklist.length;
  const isAllChecked = checkedCount === totalCount;

  const currentStatus = useMemo(() => {
    return calculateRecordStatus(items, activeChecklist, unitConditionStatus);
  }, [items, activeChecklist, unitConditionStatus]);

  const damagedItems = useMemo(() => {
    return activeChecklist.filter((i) => items[i.id]?.condition === 'rusak');
  }, [items, activeChecklist]);

  const damagedAACount = damagedItems.filter((i) => i.dangerCode === 'AA').length;
  const damagedACount = damagedItems.filter((i) => i.dangerCode === 'A').length;

  // Filtered Checklist items
  const displayItems = useMemo(() => {
    if (activeTab === 'ALL') return activeChecklist;
    if (activeTab === 'DEFECTS') return damagedItems;
    return activeChecklist.filter((i) => i.category === activeTab);
  }, [activeTab, damagedItems, activeChecklist]);

  // Actions
  const handleSetCondition = (itemId: string, condition: 'baik' | 'rusak') => {
    setItems((prev) => {
      const existing = prev[itemId];
      return {
        ...prev,
        [itemId]: {
          condition,
          note: condition === 'baik' ? '' : existing?.note || '',
        },
      };
    });
  };

  const handleSetNote = (itemId: string, note: string) => {
    setItems((prev) => {
      const existing = prev[itemId] || { condition: 'rusak' };
      return {
        ...prev,
        [itemId]: {
          ...existing,
          note,
        },
      };
    });
  };

  const handleSetAllBaik = () => {
    const allBaik: Record<string, ItemCheckStatus> = {};
    activeChecklist.forEach((item) => {
      allBaik[item.id] = { condition: 'baik' };
    });
    setItems(allBaik);
  };

  const handleResetChecklist = () => {
    setItems({});
    setFormError(null);
  };

  // Build Record Object
  const buildRecord = (): P2HRecord => {
    // If shift is different from initial record's shift, generate a new ID so Shift 1 and Shift 2 records coexist!
    const isNewShift = initialRecord && initialRecord.shift !== shift;
    const recordId = isNewShift || !initialRecord ? `p2h-${Date.now()}` : initialRecord.id;
    const docNo =
      isNewShift || !initialRecord
        ? `P2H-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
        : initialRecord.documentNo;

    const finalUnitType =
      formCategory === 'Bus'
        ? 'Bus'
        : unitTypeCategory === 'Lainnya'
        ? customUnitType.trim() || 'Lainnya'
        : unitTypeCategory;

    return {
      id: recordId,
      documentNo: docNo,
      unitName: unitName.trim(),
      unitType: finalUnitType,
      p2hCategory: formCategory,
      operatorName: operatorName.trim(),
      userId: initialRecord?.userId || currentUser?.id,
      userCode: initialRecord?.userCode || currentUser?.userCode,
      operatorRole: initialRecord?.operatorRole || currentUser?.role,
      date,
      shift,
      kmHm: kmHm.trim(),
      unitConditionStatus,
      items,
      fitToWork: formCategory === 'Bus' ? fitToWork : undefined,
      operatorSignature,
      operatorSignedAt,
      // Foreman signature fields can only be set or modified by Administrator
      foremanName: isAdmin ? foremanName.trim() : (initialRecord?.foremanName || ''),
      foremanSignature: isAdmin ? foremanSignature : (initialRecord?.foremanSignature || null),
      foremanSignedAt: isAdmin ? foremanSignedAt : (initialRecord?.foremanSignedAt || null),
      foremanNotes: isAdmin ? foremanNotes.trim() : (initialRecord?.foremanNotes || ''),
      status: currentStatus,
      createdAt: isNewShift ? new Date().toISOString() : initialRecord?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const handleValidateAndSave = () => {
    if (!unitName.trim()) {
      setFormError('Mohon tentukan Nomor Lambung / Nama Unit kendaraan!');
      return;
    }
    if (!operatorName.trim()) {
      setFormError('Mohon isi Nama Pemeriksa / Operator!');
      return;
    }
    if (!kmHm.trim()) {
      setFormError('Mohon isi angka KM atau HM Unit!');
      return;
    }
    setFormError(null);
    const record = buildRecord();
    onSave(record);
  };

  const handlePreview = () => {
    const record = buildRecord();
    onPreviewPrint(record);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-40 sm:pb-28">
      {/* Category Mode Switcher: LV vs BUS */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                Pilihan Format Form:
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300 inline-flex items-center gap-1.5">
                {formCategory === 'Bus' ? (
                  <>
                    <Bus className="w-3.5 h-3.5 text-slate-600" />
                    <span>Form Khusus Bus</span>
                  </>
                ) : (
                  <>
                    <Car className="w-3.5 h-3.5 text-slate-600" />
                    <span>Form Light Vehicle (LV)</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Format checklist dan item pemeriksaan disesuaikan secara otomatis.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => {
                setFormCategory('LV');
                if (unitTypeCategory === 'Bus') setUnitTypeCategory('LV');
                setUnitType('LV');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                formCategory === 'LV'
                  ? 'bg-white text-slate-900 border border-slate-300/80 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Car className="w-3.5 h-3.5 text-slate-600" />
              <span>Form LV</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFormCategory('Bus');
                setUnitTypeCategory('Bus');
                setUnitType('Bus');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                formCategory === 'Bus'
                  ? 'bg-white text-slate-900 border border-slate-300/80 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bus className="w-3.5 h-3.5 text-slate-600" />
              <span>Form Bus</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Warning Banner - Khusus Status Unit B/D */}
      {unitConditionStatus === 'BD' && (
        <div className="bg-rose-500/10 border-2 border-rose-500 text-rose-950 p-4 rounded-xl flex items-start gap-3 shadow-sm">
          <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide text-rose-700 uppercase">
                STATUS UNIT B/D (BREAKDOWN) — TIDAK LAYAK OPERASI!
              </span>
              <span className="text-xs bg-rose-600 text-white font-bold px-2 py-0.5 rounded">
                TIDAK LAYAK OPERASI
              </span>
            </div>
            <p className="text-xs text-rose-900 mt-1 font-medium">
              Status kesiapan unit dipilih <strong>B/D (Breakdown)</strong>. Sesuai prosedur K3 & operasional: unit dalam status Breakdown dinyatakan <strong className="underline text-rose-700">TIDAK LAYAK OPERASI</strong> dan dilarang digunakan untuk kegiatan operasional hingga selesai diperbaiki oleh tim mekanik serta dinyatakan RFU (Ready For Use).
            </p>
          </div>
        </div>
      )}

      {/* Status Warning Banner - Kode Bahaya AA */}
      {unitConditionStatus !== 'BD' && currentStatus === 'stop_operasi' && (
        <div className="bg-rose-500/10 border-2 border-rose-500 text-rose-950 p-4 rounded-xl flex items-start gap-3 shadow-sm">
          <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide text-rose-700 uppercase">
                STOP OPERASI!
              </span>
              <span className="text-xs bg-rose-600 text-white font-bold px-2 py-0.5 rounded">
                KODE BAHAYA AA — TIDAK LAYAK OPERASI
              </span>
            </div>
            <p className="text-xs text-rose-900 mt-1 font-medium">
              Ditemukan {damagedAACount} item dengan Kode Bahaya AA yang berstatus RUSAK.
              Sesuai aturan K3 & PKB: Unit <strong className="underline text-rose-700">TIDAK LAYAK OPERASI / DILARANG KERAS DIOPERASIKAN</strong> sampai dilakukan perbaikan oleh tim mekanik.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {damagedItems
                .filter((i) => i.dangerCode === 'AA')
                .map((i) => (
                  <span
                    key={i.id}
                    className="inline-flex items-center text-[11px] bg-rose-100 text-rose-900 border border-rose-300 font-semibold px-2 py-0.5 rounded"
                  >
                    {i.no}. {i.name}
                  </span>
                ))}
            </div>
          </div>
        </div>
      )}

      {unitConditionStatus !== 'BD' && currentStatus === 'perlu_perbaikan' && (
        <div className="bg-amber-500/10 border-2 border-amber-500 text-amber-950 p-4 rounded-xl flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-amber-800 uppercase">
                PERINGATAN: KERUSAKAN KODE BAHAYA A
              </span>
              <span className="text-xs bg-amber-600 text-white font-bold px-2 py-0.5 rounded">
                MAKSIMAL 1x12 JAM
              </span>
            </div>
            <p className="text-xs text-amber-900 mt-1">
              Ditemukan {damagedACount} kerusakan dengan Kode A. Unit dapat beroperasi sementara dengan pengawasan ketat, namun wajib diperbaiki dalam waktu 1x12 jam.
            </p>
          </div>
        </div>
      )}

      {unitConditionStatus !== 'BD' && currentStatus === 'siap_operasi' && checkedCount > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500 text-emerald-950 p-3.5 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-xs uppercase text-emerald-800 tracking-wide">
                UNIT SIAP OPERASI (LAYAK OPERASI)
              </span>
              <p className="text-xs text-emerald-900">
                Seluruh item pemeriksaan dalam kondisi Baik & Laik Jalan.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-600 text-white rounded-md">
            SIAP KERJA
          </span>
        </div>
      )}

      {/* Card 1: Data Identitas Unit & Pengoperasian */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h2 className="text-sm font-bold text-slate-800">
              Identitas Unit & Shift Pemeriksaan
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Form P2H {formCategory === 'Bus' ? 'Khusus Bus' : 'Standar K3'}
          </span>
        </div>

        <div className="p-3.5 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Unit Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Unit / No. Unit <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              list="fleet-unit-suggestions"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value.toUpperCase())}
              placeholder={formCategory === 'Bus' ? 'Contoh: PST 008, PST 009, SPARE 02' : 'Contoh: LV 02, LV 16, PST 01, ELF 01'}
              className="w-full px-3 py-2 text-base sm:text-sm uppercase font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 bg-amber-50/20"
            />
            <datalist id="fleet-unit-suggestions">
              {activeFleetSuggestions.map((u) => (
                <option key={u.unitName} value={u.unitName}>
                  {u.dept} {u.unitType ? `• ${u.unitType}` : ''} {u.plateNumber ? `• ${u.plateNumber}` : ''}
                </option>
              ))}
            </datalist>
            {/* Quick unit tag pills */}
            <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto text-[11px] text-slate-500 scrollbar-none pb-0.5">
              <span className="shrink-0 text-[10px]">Cepat:</span>
              {activeFleetSuggestions.slice(0, 6).map((quick) => (
                <button
                  key={quick.unitName}
                  type="button"
                  onClick={() => setUnitName(quick.unitName)}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] shrink-0 transition-colors"
                >
                  {quick.unitName}
                </button>
              ))}
            </div>
          </div>

          {/* Unit Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Jenis Unit <span className="text-rose-500">*</span>
            </label>
            <select
              value={unitTypeCategory}
              onChange={(e) => {
                const val = e.target.value;
                setUnitTypeCategory(val);
                if (val !== 'Lainnya') {
                  setUnitType(val);
                } else {
                  setUnitType(customUnitType.trim() || 'Lainnya');
                }
              }}
              className="w-full px-3 py-2 text-base sm:text-sm font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 bg-white"
            >
              <option value="LV">LV (Light Vehicle)</option>
              <option value="Bus">Bus</option>
              <option value="Lainnya">Lainnya</option>
            </select>

            {unitTypeCategory === 'Lainnya' && (
              <div className="mt-2">
                <input
                  type="text"
                  value={customUnitType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomUnitType(val);
                    setUnitType(val.trim() || 'Lainnya');
                  }}
                  placeholder="Ketik spesifikasi jenis unit (Contoh: Dump Truck, Excavator)"
                  className="w-full px-3 py-2 text-base sm:text-sm font-medium rounded-lg border border-amber-300 bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>
            )}
          </div>

          {/* Operator Name */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Nama {formCategory === 'Bus' ? 'Driver Bus' : 'Operator'} <span className="text-rose-500">*</span>
              </label>
              {currentUser && (
                <span className="text-[10px] text-amber-950 bg-amber-100 font-mono font-bold px-1.5 py-0.5 rounded border border-amber-300">
                  ID: {currentUser.userCode}
                </span>
              )}
            </div>
            <input
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              className="w-full px-3 py-2 text-base sm:text-sm font-medium rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            />
          </div>

          {/* Tanggal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tanggal Pemeriksaan <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-base sm:text-sm font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 bg-amber-50/20"
            />
          </div>

          {/* Shift */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Shift Kerja <span className="text-rose-500">*</span>
            </label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="w-full px-3 py-2 text-base sm:text-sm font-medium rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 bg-amber-50/20"
            >
              <option value="Shift 1 (06:00 - 18:00)">Shift 1 (06:00 - 18:00)</option>
              <option value="Shift 2 (18:00 - 06:00)">Shift 2 (18:00 - 06:00)</option>
            </select>
          </div>

          {/* KM / HM */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              KM / HM Unit <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={kmHm}
              onChange={(e) => setKmHm(e.target.value)}
              placeholder="Contoh: 142,500 KM atau 3,420 HM"
              className="w-full px-3 py-2 text-base sm:text-sm font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 bg-amber-50/20"
            />
          </div>

          {/* Status Kesiapan Unit (RFU / BU / STANDBY / BD) */}
          <div className="md:col-span-2 lg:col-span-3 pt-1 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
              <label className="block text-xs font-bold text-slate-800">
                Status Kesiapan Unit (Operasional) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Pilih status kesiapan: RFU, BU (Backup Unit), Standby, atau BD (Breakdown)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Option 1: RFU */}
              <button
                type="button"
                onClick={() => setUnitConditionStatus('RFU')}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  unitConditionStatus === 'RFU'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-black ${
                    unitConditionStatus === 'RFU'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  ✓
                </div>
                <div>
                  <div className="font-bold text-xs">RFU (Ready For Use)</div>
                  <div className="text-[11px] text-slate-500">Unit siap operasi normal</div>
                </div>
              </button>

              {/* Option 2: BU */}
              <button
                type="button"
                onClick={() => setUnitConditionStatus('BU')}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  unitConditionStatus === 'BU'
                    ? 'border-amber-500 bg-amber-50/70 text-amber-950 ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-black ${
                    unitConditionStatus === 'BU'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  BU
                </div>
                <div>
                  <div className="font-bold text-xs">BU (Backup Unit)</div>
                  <div className="text-[11px] text-slate-500">Unit cadangan / serep</div>
                </div>
              </button>

              {/* Option 3: STANDBY */}
              <button
                type="button"
                onClick={() => setUnitConditionStatus('STANDBY')}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  unitConditionStatus === 'STANDBY'
                    ? 'border-orange-500 bg-orange-50/70 text-orange-950 ring-2 ring-orange-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-black ${
                    unitConditionStatus === 'STANDBY'
                      ? 'bg-orange-500 text-white'
                      : 'bg-orange-100 text-orange-800'
                  }`}
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-xs">STANDBY</div>
                  <div className="text-[11px] text-slate-500">Siap / Menunggu giliran</div>
                </div>
              </button>

              {/* Option 4: BD */}
              <button
                type="button"
                onClick={() => setUnitConditionStatus('BD')}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  unitConditionStatus === 'BD'
                    ? 'border-rose-500 bg-rose-50/70 text-rose-950 ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-black ${
                    unitConditionStatus === 'BD'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  BD
                </div>
                <div>
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>BD (Breakdown)</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded border border-rose-300">
                      Tidak Layak
                    </span>
                  </div>
                  <div className="text-[11px] text-rose-600 font-semibold">Tidak layak operasi / Bengkel</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Driver Fit To Work Questionnaire (Khusus Form Bus) */}
      {formCategory === 'Bus' && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-amber-50/80 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-amber-700" />
              <h3 className="text-xs sm:text-sm font-bold text-amber-950 uppercase tracking-wide">
                Pemeriksaan Kelayakan Driver (Fit To Work Bus)
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
              Standar Keselamatan Angkutan Penumpang PT. PST
            </span>
          </div>

          <div className="p-3.5 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 text-xs">
            {/* Jam Tidur */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block font-bold text-slate-800 mb-1">
                1. Jumlah Jam Tidur Sebelum Shift (Minimal 6-7 Jam) <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={fitToWork.jumlahJamTidur}
                  onChange={(e) => setFitToWork((prev) => ({ ...prev, jumlahJamTidur: e.target.value }))}
                  placeholder="7"
                  className="w-24 px-3 py-1.5 rounded-lg border border-slate-300 font-bold font-mono text-sm bg-white"
                />
                <span className="text-slate-600 font-semibold">Jam Tidur</span>
              </div>
            </div>

            {/* Minum Obat */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block font-bold text-slate-800 mb-1">
                2. Mengonsumsi Obat yang Menyebabkan Kantuk? <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-3 mt-2">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="minumObat"
                    checked={fitToWork.minumObat === 'tidak'}
                    onChange={() => setFitToWork((prev) => ({ ...prev, minumObat: 'tidak' }))}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-semibold text-slate-700">Tidak (Aman)</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="minumObat"
                    checked={fitToWork.minumObat === 'ya'}
                    onChange={() => setFitToWork((prev) => ({ ...prev, minumObat: 'ya' }))}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-semibold text-rose-700">Ya (Berisiko Mengantuk)</span>
                </label>
              </div>
            </div>

            {/* Kondisi Sehat / Fit */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block font-bold text-slate-800 mb-1">
                3. Apakah Tubuh Dalam Kondisi Sehat dan Bugar? <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-3 mt-2">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="dalamKondisiFit"
                    checked={fitToWork.dalamKondisiFit === 'ya'}
                    onChange={() => setFitToWork((prev) => ({ ...prev, dalamKondisiFit: 'ya' }))}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-semibold text-emerald-800">Ya (Sehat & Fit)</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="dalamKondisiFit"
                    checked={fitToWork.dalamKondisiFit === 'tidak'}
                    onChange={() => setFitToWork((prev) => ({ ...prev, dalamKondisiFit: 'tidak' }))}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-semibold text-rose-700">Tidak (Kurang Sehat)</span>
                </label>
              </div>
            </div>

            {/* Siap Bekerja Aman */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block font-bold text-slate-800 mb-1">
                4. Siap Mengoperasikan Bus dengan Aman Sepanjang Shift? <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-3 mt-2">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="siapBekerja"
                    checked={fitToWork.siapBekerja === 'ya'}
                    onChange={() => setFitToWork((prev) => ({ ...prev, siapBekerja: 'ya' }))}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-bold text-emerald-800">SIAP BEKERJA</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="siapBekerja"
                    checked={fitToWork.siapBekerja === 'tidak'}
                    onChange={() => setFitToWork((prev) => ({ ...prev, siapBekerja: 'tidak' }))}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-bold text-rose-700">TIDAK SIAP</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card 2: Interactive Checklist Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header & Quick Action */}
        <div className="p-3.5 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/60">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Lembar Pemeriksaan Fisik {formCategory === 'Bus' ? 'Armada Bus (35 Item)' : 'Light Vehicle (31 Item)'}
              </h2>
              <span className="text-xs bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                {checkedCount} / {totalCount} Terisi
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih kondisi Baik (√) atau Rusak (X). Kerusakan dengan Kode AA wajib dihentikan operasinya.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSetAllBaik}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs active:scale-98"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Semua Baik (Cepat)</span>
            </button>

            <button
              type="button"
              onClick={handleResetChecklist}
              className="px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none bg-white px-2 pt-2 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-2 font-bold rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-1.5 border-b-2 ${
              activeTab === 'ALL'
                ? 'border-amber-500 text-amber-900 bg-amber-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Semua Bagian ({totalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('A')}
            className={`px-3 py-2 font-bold rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-1.5 border-b-2 ${
              activeTab === 'A'
                ? 'border-amber-500 text-amber-900 bg-amber-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>A. Luar Kabin ({activeChecklist.filter((i) => i.category === 'A').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('B')}
            className={`px-3 py-2 font-bold rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-1.5 border-b-2 ${
              activeTab === 'B'
                ? 'border-amber-500 text-amber-900 bg-amber-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>B. Dalam Kabin ({activeChecklist.filter((i) => i.category === 'B').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('C')}
            className={`px-3 py-2 font-bold rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-1.5 border-b-2 ${
              activeTab === 'C'
                ? 'border-amber-500 text-amber-900 bg-amber-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>C. Kelengkapan Tambahan ({activeChecklist.filter((i) => i.category === 'C').length})</span>
          </button>

          {damagedItems.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('DEFECTS')}
              className={`px-3 py-2 font-bold rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-1.5 border-b-2 ${
                activeTab === 'DEFECTS'
                  ? 'border-rose-500 text-rose-700 bg-rose-50/60'
                  : 'border-transparent text-rose-600 hover:text-rose-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Temuan Rusak ({damagedItems.length})</span>
            </button>
          )}
        </div>

        {/* Item List */}
        <div className="divide-y divide-slate-100">
          {displayItems.map((item) => {
            const check = items[item.id];
            const isBaik = check?.condition === 'baik';
            const isRusak = check?.condition === 'rusak';
            const isAA = item.dangerCode === 'AA';

            return (
              <div
                key={item.id}
                className={`p-3.5 sm:p-4 transition-colors ${
                  isRusak
                    ? isAA
                      ? 'bg-rose-50/40'
                      : 'bg-amber-50/30'
                    : 'hover:bg-slate-50/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Item Info */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {item.no}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-slate-900">
                          {item.name}
                        </span>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            isAA
                              ? 'bg-rose-100 text-rose-900 border border-rose-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {item.dangerCode}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Toggle Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleSetCondition(item.id, 'baik')}
                      className={`h-9 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
                        isBaik
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Baik</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetCondition(item.id, 'rusak')}
                      className={`h-9 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
                        isRusak
                          ? isAA
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Rusak</span>
                    </button>
                  </div>
                </div>

                {/* Defect Note Input when marked 'rusak' */}
                {isRusak && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 pl-9">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-semibold text-rose-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Deskripsi Kerusakan / Catatan Temuan:
                      </span>
                    </div>
                    <input
                      type="text"
                      value={check?.note || ''}
                      onChange={(e) => handleSetNote(item.id, e.target.value)}
                      placeholder="Jelaskan detail kerusakan (contoh: Kendor, Bocor, Pecah, Tekanan Rendah)..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
                    />

                    {/* Common defect suggestions */}
                    {item.commonIssues && item.commonIssues.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400">Pilihan cepat:</span>
                        {item.commonIssues.map((issue) => (
                          <button
                            key={issue}
                            type="button"
                            onClick={() => handleSetNote(item.id, issue)}
                            className="px-2 py-0.5 rounded text-[10px] bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 transition-colors"
                          >
                            {issue}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Card 3: Tanda Tangan & Verifikasi Legalitas Dokumen */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h2 className="text-sm font-bold text-slate-800">
              Tanda Tangan & Legalitas Pengesahan P2H
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {isAdmin ? 'Akses: Administrator / Pengawas' : 'Akses: Operator / Driver'}
          </span>
        </div>

        <div className="p-3.5 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Operator Signature Block */}
          <div className="border border-slate-200 rounded-xl p-3.5 sm:p-4 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Dilaporkan Oleh ({formCategory === 'Bus' ? 'Driver Bus' : 'Operator'})
                </span>
                {operatorSignature ? (
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Sudah Ditandatangani
                  </span>
                ) : (
                  <span className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Wajib Ditandatangani
                  </span>
                )}
              </div>

              {/* Signature Display Box */}
              <div className="h-28 bg-white border border-dashed border-slate-300 rounded-lg flex items-center justify-center p-2 mb-3">
                {operatorSignature ? (
                  <img
                    src={operatorSignature}
                    alt="TTD Operator"
                    className="max-h-24 max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center text-slate-400">
                    <PenTool className="w-6 h-6 mx-auto mb-1 opacity-40" />
                    <p className="text-xs">Klik tombol di bawah untuk tanda tangan digital</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-center mb-3">
                <p className="text-xs font-bold text-slate-900 truncate">
                  ( {operatorName || '........................................'} )
                </p>
                <p className="text-[11px] text-slate-500">{formCategory === 'Bus' ? 'Driver Bus' : 'Operator Alat'}</p>
                {operatorSignedAt && (
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Waktu: {operatorSignedAt}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSignatureModalRole('operator')}
                className="w-full h-10 sm:h-9 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs active:scale-98"
              >
                <PenTool className="w-3.5 h-3.5" />
                {operatorSignature ? 'Ubah Tanda Tangan Operator' : 'Tanda Tangan Operator Sekarang'}
              </button>
            </div>
          </div>

          {/* Foreman / Pengawas Signature Block (Protected: Only Admin can sign!) */}
          <div className="border border-slate-200 rounded-xl p-3.5 sm:p-4 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Diketahui Oleh (Foreman / Pengawas)
                </span>
                {foremanSignature ? (
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Diverifikasi Pengawas
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-700 font-medium">
                    {isAdmin ? 'Menunggu Tanda Tangan Atasan' : 'Khusus Akses Pengawas'}
                  </span>
                )}
              </div>

              {/* Admin Security Protection Notice */}
              {!isAdmin && (
                <div className="mb-2.5 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-900 flex items-start gap-2">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-[11px]">
                    <span className="font-bold block">Terkunci: Khusus Administrator / Pengawas</span>
                    Bagian tanda tangan Foreman hanya dapat diisi dan diverifikasi oleh Administrator/Pengawas berwenang untuk menghindari risiko manipulasi data dari driver.
                  </div>
                </div>
              )}

              {/* Foreman Name input */}
              <div className="mb-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nama Foreman / Pengawas
                </label>
                <input
                  type="text"
                  value={foremanName}
                  onChange={(e) => setForemanName(e.target.value)}
                  disabled={!isAdmin}
                  placeholder={isAdmin ? 'Contoh: Ir. Agus Wijaya' : '(Akan diisi oleh Pengawas / Administrator)'}
                  className={`w-full px-2.5 py-1.5 text-base sm:text-xs rounded-md border ${
                    isAdmin
                      ? 'border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500'
                      : 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                  }`}
                />
              </div>

              {/* Signature Display Box */}
              <div className="h-24 bg-white border border-dashed border-slate-300 rounded-lg flex items-center justify-center p-2 mb-2">
                {foremanSignature ? (
                  <img
                    src={foremanSignature}
                    alt="TTD Foreman"
                    className="max-h-20 max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center text-slate-400">
                    <PenTool className="w-5 h-5 mx-auto mb-0.5 opacity-40" />
                    <p className="text-[11px]">
                      {isAdmin ? 'Siap ditandatangani oleh Pengawas' : 'Menunggu verifikasi pengawas'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-center mb-3">
                <p className="text-xs font-bold text-slate-900 truncate">
                  ( {foremanName || '........................................'} )
                </p>
                <p className="text-[11px] text-slate-500">Foreman / Pengawas K3</p>
                {foremanSignedAt && (
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Waktu: {foremanSignedAt}
                  </p>
                )}
              </div>

              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setSignatureModalRole('foreman')}
                  className="w-full h-10 sm:h-9 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs active:scale-98"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  {foremanSignature ? 'Ubah Tanda Tangan Foreman' : 'Tanda Tangan Foreman Sekarang'}
                </button>
              ) : (
                <div className="w-full py-2 px-3 text-center text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Hanya dapat ditandatangani oleh Akun Pengawas / Admin</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Validation Error Banner */}
      {formError && (
        <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{formError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFormError(null)}
            className="text-rose-500 hover:text-rose-800 text-xs font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-3 py-2 sm:px-4 sm:py-3 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          {/* Info Status Strip */}
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[11px] text-slate-400">Unit:</span>
              <span className="font-mono font-bold text-xs sm:text-sm text-white truncate max-w-[120px] sm:max-w-none">
                {unitName || '-'}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 inline-flex items-center gap-1 shrink-0">
                {formCategory === 'Bus' ? (
                  <>
                    <Bus className="w-3 h-3 text-slate-400" />
                    <span>Bus</span>
                  </>
                ) : (
                  <>
                    <Car className="w-3 h-3 text-slate-400" />
                    <span>LV</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] text-slate-400 hidden sm:inline">Hasil:</span>
              <span
                className={`font-bold text-[10px] sm:text-xs px-2 py-0.5 rounded whitespace-nowrap ${
                  unitConditionStatus === 'BD' || currentStatus === 'stop_operasi'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : currentStatus === 'perlu_perbaikan'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {unitConditionStatus === 'BD'
                  ? 'TIDAK LAYAK (B/D)'
                  : currentStatus === 'stop_operasi'
                  ? 'STOP OPERASI'
                  : currentStatus === 'perlu_perbaikan'
                  ? 'Perbaikan 1x12 Jam'
                  : 'Siap Operasi'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Batal
              </button>
            )}

            <button
              type="button"
              onClick={handlePreview}
              className="h-8.5 sm:h-9 px-3 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
              title="Pratinjau / Cetak"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>Pratinjau</span>
            </button>

            <button
              type="button"
              onClick={handleValidateAndSave}
              className="flex-1 sm:flex-none h-8.5 sm:h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Save className="w-3.5 h-3.5 text-white" />
              <span>Simpan P2H</span>
            </button>
          </div>
        </div>
      </div>

      {/* Signature Pad Modal */}
      {signatureModalRole && (
        <SignaturePadModal
          isOpen={true}
          roleLabel={signatureModalRole === 'operator' ? (formCategory === 'Bus' ? 'Driver Bus' : 'Operator') : 'Foreman / Pengawas'}
          initialSignerName={signatureModalRole === 'operator' ? operatorName : foremanName}
          title={
            signatureModalRole === 'operator'
              ? `Tanda Tangan Pelapor (${formCategory === 'Bus' ? 'Driver Bus' : 'Operator'})`
              : 'Tanda Tangan Pengawas (Foreman)'
          }
          onClose={() => setSignatureModalRole(null)}
          onSave={(sigData, name) => {
            const now = new Date();
            const timeStr = `${now.toISOString().slice(0, 10)} ${now.toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            })}`;

            if (signatureModalRole === 'operator') {
              setOperatorSignature(sigData);
              setOperatorSignedAt(timeStr);
              if (!operatorName) setOperatorName(name);
            } else {
              setForemanSignature(sigData);
              setForemanSignedAt(timeStr);
              setForemanName(name);
            }
          }}
        />
      )}
    </div>
  );
};
