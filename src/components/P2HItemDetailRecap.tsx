import React, { useState, useMemo } from 'react';
import {
  P2HRecord,
  P2H_CHECKLIST_LV,
  P2H_CHECKLIST_BUS,
  P2HChecklistItem,
} from '../types/p2h';
import { FleetUnit } from '../types/recap';
import { isBusUnit, normalizeUnitName } from '../utils/recapStorage';
import {
  Download,
  Printer,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Tag,
  Car,
  Bus,
  RefreshCw,
  FileSpreadsheet,
  Check,
  X,
  FileText,
  Plus,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface P2HItemDetailRecapProps {
  p2hRecords: P2HRecord[];
  effectiveFleet: FleetUnit[];
  currentYear: number;
  currentMonth: number; // 1 - 12
  onOpenP2H?: (record: P2HRecord) => void;
  onNewP2HForUnit?: (unitName: string, shift?: string, date?: string) => void;
}

export const P2HItemDetailRecap: React.FC<P2HItemDetailRecapProps> = ({
  p2hRecords,
  effectiveFleet,
  currentYear,
  currentMonth,
  onOpenP2H,
  onNewP2HForUnit,
}) => {
  // Mode: 'daily_roster' (List all fleet units for a selected date, matching screenshot)
  // vs 'all_records' (List all actual submitted P2H records with date range)
  const [dataMode, setDataMode] = useState<'daily_roster' | 'all_records'>('daily_roster');

  // Selected date for daily_roster mode (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to current date or month-adjusted date
    const now = new Date();
    const mm = String(currentMonth).padStart(2, '0');
    const dd = String(Math.min(now.getDate(), 28)).padStart(2, '0');
    return `${currentYear}-${mm}-${dd}`;
  });

  // Filter States
  const [fleetCategory, setFleetCategory] = useState<'LV' | 'Bus' | 'ALL'>('LV');
  const [selectedOwner, setSelectedOwner] = useState<string>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedShift, setSelectedShift] = useState<string>('ALL');
  const [defectFilter, setDefectFilter] = useState<'ALL' | 'DEFECT_ONLY' | 'OK_ONLY'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cellDisplayMode, setCellDisplayMode] = useState<'icon' | 'symbol' | 'text'>('icon');

  // Checklist items based on category
  const activeChecklist: P2HChecklistItem[] = useMemo(() => {
    if (fleetCategory === 'Bus') {
      return P2H_CHECKLIST_BUS;
    }
    // Default to LV format (Bagian A: 12 items, Bagian B: 13 items, Bagian C: 2 items)
    return P2H_CHECKLIST_LV;
  }, [fleetCategory]);

  const itemsPartA = useMemo(
    () => activeChecklist.filter((item) => item.category === 'A'),
    [activeChecklist]
  );
  const itemsPartB = useMemo(
    () => activeChecklist.filter((item) => item.category === 'B'),
    [activeChecklist]
  );
  const itemsPartC = useMemo(
    () => activeChecklist.filter((item) => item.category === 'C'),
    [activeChecklist]
  );

  // Available unique departments
  const availableDepts = useMemo(() => {
    const set = new Set<string>();
    effectiveFleet.forEach((u) => set.add(u.dept));
    return Array.from(set).sort();
  }, [effectiveFleet]);

  // Available unique owners
  const availableOwners = useMemo(() => {
    const set = new Set<string>();
    effectiveFleet.forEach((u) => {
      const isBus = isBusUnit(u);
      if (fleetCategory === 'LV' && isBus) return;
      if (fleetCategory === 'Bus' && !isBus) return;
      if (u.ownedBy) set.add(u.ownedBy.trim().toUpperCase());
    });
    const standardOrder = ['PST', 'WARGI', 'BJR', 'BAGONG'];
    const result: string[] = [];
    standardOrder.forEach((o) => {
      if (set.has(o)) {
        result.push(o);
        set.delete(o);
      }
    });
    return [...result, ...Array.from(set).sort()];
  }, [effectiveFleet, fleetCategory]);

  // Format date helper: YYYY-MM-DD -> DD/MM/YYYY
  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.slice(0, 10).split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Build rows depending on dataMode
  interface DetailRowData {
    id: string;
    no: number;
    tanggal: string; // DD/MM/YYYY
    rawDate: string; // YYYY-MM-DD
    unitName: string;
    ownedBy: string;
    dept: string;
    operatorName: string;
    shift: string;
    kmHm: string;
    status: 'siap_operasi' | 'stop_operasi' | 'perlu_perbaikan' | 'belum';
    unitConditionStatus?: 'RFU' | 'BU' | 'STANDBY' | 'BD';
    items: Record<string, { condition: 'baik' | 'rusak'; note?: string }>;
    jmlRusak: number;
    catatanTindakLanjut: string;
    record?: P2HRecord;
    isFromRosterOnly?: boolean;
  }

  const tableRows: DetailRowData[] = useMemo(() => {
    if (dataMode === 'daily_roster') {
      // In daily roster mode, we iterate over the site fleet units
      const targetDate = selectedDate;
      const formattedDate = formatDisplayDate(targetDate);

      // Find matching p2hRecords for this date
      const recordsOnDate = p2hRecords.filter((r) => {
        const recDate = r.date || (r.createdAt ? r.createdAt.slice(0, 10) : '');
        return recDate === targetDate;
      });

      return effectiveFleet.map((unit, index) => {
        const norm = normalizeUnitName(unit.unitName);
        const matchingRecord = recordsOnDate.find(
          (r) => normalizeUnitName(r.unitName) === norm
        );

        if (matchingRecord) {
          let defectCount = 0;
          const defectNotes: string[] = [];

          if (matchingRecord.items) {
            Object.entries(matchingRecord.items).forEach(([itemId, check]) => {
              if (check.condition === 'rusak') {
                defectCount++;
                const itemDef = activeChecklist.find((c) => c.id === itemId);
                const itemName = itemDef ? itemDef.name : itemId;
                defectNotes.push(
                  `${itemName}: ${check.note || 'Kondisi Rusak / Perlu Perbaikan'}`
                );
              }
            });
          }

          if (matchingRecord.foremanNotes) {
            defectNotes.push(`[Catatan Pengawas: ${matchingRecord.foremanNotes}]`);
          }

          return {
            id: matchingRecord.id,
            no: index + 1,
            tanggal: formattedDate,
            rawDate: targetDate,
            unitName: unit.unitName,
            ownedBy: unit.ownedBy || matchingRecord.unitType || 'PST',
            dept: unit.dept,
            operatorName: matchingRecord.operatorName || '-',
            shift: matchingRecord.shift?.includes('Shift 2')
              ? 'Shift 2'
              : matchingRecord.shift?.includes('Shift 1')
              ? 'Shift 1'
              : matchingRecord.shift || 'Shift 1',
            kmHm: matchingRecord.kmHm || '-',
            status: matchingRecord.status || 'siap_operasi',
            unitConditionStatus: matchingRecord.unitConditionStatus,
            items: matchingRecord.items || {},
            jmlRusak: defectCount,
            catatanTindakLanjut: defectNotes.join('; ') || '',
            record: matchingRecord,
            isFromRosterOnly: false,
          };
        }

        // Unit hasn't filled P2H on this date
        return {
          id: `roster-${unit.unitName}-${targetDate}`,
          no: index + 1,
          tanggal: formattedDate,
          rawDate: targetDate,
          unitName: unit.unitName,
          ownedBy: unit.ownedBy || (isBusUnit(unit) ? 'BAGONG' : 'PST'),
          dept: unit.dept,
          operatorName: '-',
          shift: '-',
          kmHm: '-',
          status: 'belum',
          unitConditionStatus: undefined,
          items: {},
          jmlRusak: 0,
          catatanTindakLanjut: '',
          isFromRosterOnly: true,
        };
      });
    }

    // All Records mode: iterate all submitted p2hRecords
    return p2hRecords
      .map((r, index) => {
        const recDate = r.date || (r.createdAt ? r.createdAt.slice(0, 10) : '');
        const norm = normalizeUnitName(r.unitName);
        const fleetUnit = effectiveFleet.find(
          (f) => normalizeUnitName(f.unitName) === norm
        );

        let defectCount = 0;
        const defectNotes: string[] = [];
        if (r.items) {
          Object.entries(r.items).forEach(([itemId, check]) => {
            if (check.condition === 'rusak') {
              defectCount++;
              const itemDef = activeChecklist.find((c) => c.id === itemId);
              const itemName = itemDef ? itemDef.name : itemId;
              defectNotes.push(
                `${itemName}: ${check.note || 'Kondisi Rusak / Perlu Perbaikan'}`
              );
            }
          });
        }
        if (r.foremanNotes) {
          defectNotes.push(`[Catatan Pengawas: ${r.foremanNotes}]`);
        }

        const isBus = r.p2hCategory === 'Bus' || isBusUnit({ unitName: r.unitName, unitType: r.unitType });
        const owned =
          fleetUnit?.ownedBy ||
          (isBus ? 'BAGONG' : 'PST');

        return {
          id: r.id,
          no: index + 1,
          tanggal: formatDisplayDate(recDate),
          rawDate: recDate,
          unitName: r.unitName,
          ownedBy: owned,
          dept: fleetUnit?.dept || (isBus ? 'PRODUKSI' : 'OPERASIONAL'),
          operatorName: r.operatorName || '-',
          shift: r.shift?.includes('Shift 2')
            ? 'Shift 2'
            : r.shift?.includes('Shift 1')
            ? 'Shift 1'
            : r.shift || 'Shift 1',
          kmHm: r.kmHm || '-',
          status: r.status || 'siap_operasi',
          unitConditionStatus: r.unitConditionStatus,
          items: r.items || {},
          jmlRusak: defectCount,
          catatanTindakLanjut: defectNotes.join('; ') || '',
          record: r,
          isFromRosterOnly: false,
        };
      })
      .sort((a, b) => b.rawDate.localeCompare(a.rawDate));
  }, [dataMode, selectedDate, effectiveFleet, p2hRecords, activeChecklist]);

  // Apply Filters to tableRows
  const filteredRows = useMemo(() => {
    return tableRows.filter((row) => {
      // Category filter (LV vs Bus)
      const isBus = isBusUnit({ unitName: row.unitName });
      if (fleetCategory === 'LV' && isBus) return false;
      if (fleetCategory === 'Bus' && !isBus) return false;

      // Owner filter
      if (
        selectedOwner !== 'ALL' &&
        row.ownedBy.toUpperCase() !== selectedOwner.toUpperCase()
      ) {
        return false;
      }

      // Dept filter
      if (
        selectedDept !== 'ALL' &&
        row.dept.toUpperCase() !== selectedDept.toUpperCase()
      ) {
        return false;
      }

      // Shift filter
      if (selectedShift !== 'ALL') {
        if (!row.shift.includes(selectedShift)) return false;
      }

      // Defect filter
      if (defectFilter === 'DEFECT_ONLY' && row.jmlRusak === 0) return false;
      if (defectFilter === 'OK_ONLY' && row.jmlRusak > 0) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchUnit = row.unitName.toLowerCase().includes(q);
        const matchOp = row.operatorName.toLowerCase().includes(q);
        const matchDept = row.dept.toLowerCase().includes(q);
        const matchNotes = row.catatanTindakLanjut.toLowerCase().includes(q);
        const matchOwner = row.ownedBy.toLowerCase().includes(q);
        if (!matchUnit && !matchOp && !matchDept && !matchNotes && !matchOwner) {
          return false;
        }
      }

      return true;
    });
  }, [
    tableRows,
    fleetCategory,
    selectedOwner,
    selectedDept,
    selectedShift,
    defectFilter,
    searchQuery,
  ]);

  // Summary statistics for bottom row
  const summaryStats = useMemo(() => {
    const totalUnits = filteredRows.length;
    const inspectedUnits = filteredRows.filter((r) => !r.isFromRosterOnly).length;
    const uninspectedUnits = filteredRows.filter((r) => r.isFromRosterOnly).length;
    const totalDefects = filteredRows.reduce((acc, r) => acc + r.jmlRusak, 0);

    const itemDefectCounts: Record<string, number> = {};
    activeChecklist.forEach((item) => {
      let count = 0;
      filteredRows.forEach((r) => {
        if (r.items[item.id]?.condition === 'rusak') {
          count++;
        }
      });
      itemDefectCounts[item.id] = count;
    });

    return {
      totalUnits,
      inspectedUnits,
      uninspectedUnits,
      totalDefects,
      itemDefectCounts,
    };
  }, [filteredRows, activeChecklist]);

  // Export to Microsoft Excel (.xlsx) matching exact spreadsheet format
  const handleExportXLSX = () => {
    const mainHeaders = [
      'No',
      'Tanggal',
      'Nama Unit / No. Unit',
      'Owned By',
      'PIC Department',
      'Operator/User',
      'Shift',
      'KM/HM',
      ...itemsPartA.map((item) => `[Bagian A] ${item.name} (${item.dangerCode})`),
      ...itemsPartB.map((item) => `[Bagian B] ${item.name} (${item.dangerCode})`),
      ...itemsPartC.map((item) => `[Bagian C] ${item.name} (${item.dangerCode})`),
      'Jml Rusak',
      'Catatan / Tindak Lanjut',
    ];

    const dataRows = filteredRows.map((row, idx) => {
      const rowArr: (string | number)[] = [
        idx + 1,
        row.tanggal,
        row.unitName,
        row.ownedBy,
        row.dept,
        row.operatorName,
        row.shift,
        row.kmHm,
      ];

      itemsPartA.forEach((item) => {
        const check = row.items[item.id];
        if (row.isFromRosterOnly) {
          rowArr.push('-');
        } else if (check?.condition === 'rusak') {
          rowArr.push(check.note ? `❌ RUSAK (${check.note})` : '❌ RUSAK');
        } else {
          rowArr.push('✅ Baik');
        }
      });

      itemsPartB.forEach((item) => {
        const check = row.items[item.id];
        if (row.isFromRosterOnly) {
          rowArr.push('-');
        } else if (check?.condition === 'rusak') {
          rowArr.push(check.note ? `❌ RUSAK (${check.note})` : '❌ RUSAK');
        } else {
          rowArr.push('✅ Baik');
        }
      });

      itemsPartC.forEach((item) => {
        const check = row.items[item.id];
        if (row.isFromRosterOnly) {
          rowArr.push('-');
        } else if (check?.condition === 'rusak') {
          rowArr.push(check.note ? `❌ RUSAK (${check.note})` : '❌ RUSAK');
        } else {
          rowArr.push('✅ Baik');
        }
      });

      rowArr.push(row.jmlRusak);
      rowArr.push(row.catatanTindakLanjut || '-');

      return rowArr;
    });

    const ws = XLSX.utils.aoa_to_sheet([mainHeaders, ...dataRows]);

    const colWidths = mainHeaders.map((header, colIdx) => {
      let maxLen = header.length;
      dataRows.forEach((r) => {
        const val = String(r[colIdx] || '');
        if (val.length > maxLen) maxLen = Math.min(val.length, 40);
      });
      return { wch: Math.max(maxLen + 2, 10) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Detail P2H');

    const fileNameTag =
      dataMode === 'daily_roster'
        ? `Harian-${selectedDate}`
        : `Periode-${currentYear}-${currentMonth}`;
    XLSX.writeFile(wb, `Rekap_Detail_P2H_${fleetCategory}_${fileNameTag}.xlsx`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Tanggal',
      'Nama Unit / No. Unit',
      'Owned By',
      'PIC Department',
      'Operator/User',
      'Shift',
      'KM/HM',
      ...itemsPartA.map((item) => `[A] ${item.name} (${item.dangerCode})`),
      ...itemsPartB.map((item) => `[B] ${item.name} (${item.dangerCode})`),
      ...itemsPartC.map((item) => `[C] ${item.name} (${item.dangerCode})`),
      'Jml Rusak',
      'Catatan / Tindak Lanjut',
    ];

    let csvContent = headers.map((h) => `"${h}"`).join(',') + '\n';

    filteredRows.forEach((row, idx) => {
      const line: (string | number)[] = [
        idx + 1,
        `"${row.tanggal}"`,
        `"${row.unitName}"`,
        `"${row.ownedBy}"`,
        `"${row.dept}"`,
        `"${row.operatorName}"`,
        `"${row.shift}"`,
        `"${row.kmHm}"`,
      ];

      itemsPartA.forEach((item) => {
        const check = row.items[item.id];
        if (row.isFromRosterOnly) {
          line.push('"-"');
        } else if (check?.condition === 'rusak') {
          line.push(check.note ? `"❌ RUSAK (${check.note.replace(/"/g, '""')})"` : '"❌ RUSAK"');
        } else {
          line.push('"✅ Baik"');
        }
      });

      itemsPartB.forEach((item) => {
        const check = row.items[item.id];
        if (row.isFromRosterOnly) {
          line.push('"-"');
        } else if (check?.condition === 'rusak') {
          line.push(check.note ? `"❌ RUSAK (${check.note.replace(/"/g, '""')})"` : '"❌ RUSAK"');
        } else {
          line.push('"✅ Baik"');
        }
      });

      itemsPartC.forEach((item) => {
        const check = row.items[item.id];
        if (row.isFromRosterOnly) {
          line.push('"-"');
        } else if (check?.condition === 'rusak') {
          line.push(check.note ? `"❌ RUSAK (${check.note.replace(/"/g, '""')})"` : '"❌ RUSAK"');
        } else {
          line.push('"✅ Baik"');
        }
      });

      line.push(row.jmlRusak);
      line.push(`"${(row.catatanTindakLanjut || '').replace(/"/g, '""')}"`);

      csvContent += line.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Rekap_Detail_Item_P2H_${dataMode === 'daily_roster' ? selectedDate : `${currentYear}-${currentMonth}`}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for Unit Name Cell highlight matching screenshot:
  // Yellow if BU/Standby/perlu_perbaikan or defect; Red if BD/stop_operasi; Normal otherwise
  const getUnitCellBg = (row: DetailRowData) => {
    if (row.isFromRosterOnly) return 'bg-white text-slate-900';
    if (row.unitConditionStatus === 'BD' || row.status === 'stop_operasi') {
      return 'bg-red-500 text-white font-black';
    }
    if (
      row.unitConditionStatus === 'BU' ||
      row.unitConditionStatus === 'STANDBY' ||
      row.status === 'perlu_perbaikan' ||
      row.jmlRusak > 0
    ) {
      return 'bg-yellow-300 text-yellow-950 font-black';
    }
    return 'bg-white text-slate-900';
  };

  // Helper for Owned By badge matching screenshot colors:
  // PST: green/amber lime (#86efac)
  // WARGI: black (#000000) with white text
  // BJR: royal blue (#2563eb) with white text
  // BAGONG: purple (#9333ea) with white text
  const getOwnedByCellBg = (owner: string) => {
    switch (owner.toUpperCase().trim()) {
      case 'PST':
        return 'bg-[#86efac] text-[#064e3b] font-bold border border-[#4ade80]';
      case 'WARGI':
        return 'bg-slate-950 text-white font-bold border border-slate-800';
      case 'BJR':
        return 'bg-[#1d4ed8] text-white font-bold border border-[#1e40af]';
      case 'BAGONG':
        return 'bg-[#9333ea] text-white font-bold border border-[#7e22ce]';
      default:
        return 'bg-slate-100 text-slate-800 font-bold border border-slate-300';
    }
  };

  // Helper untuk merender sel item checklist (✅ jika baik, ❌ jika ada kerusakan, - jika belum P2H)
  const renderChecklistCell = (item: P2HChecklistItem, row: DetailRowData) => {
    if (row.isFromRosterOnly) {
      return (
        <td
          key={item.id}
          className="border-b border-r border-slate-300 text-center py-1 px-0.5 w-[38px] min-w-[38px] max-w-[38px] text-[10px] font-mono text-slate-300 bg-white select-none"
          title={`Unit ${row.unitName} belum mengisi formulir P2H pada tanggal ini`}
        >
          -
        </td>
      );
    }

    const check = row.items[item.id];
    const isDefect = check?.condition === 'rusak';

    if (isDefect) {
      return (
        <td
          key={item.id}
          className="border-b border-r border-slate-300 text-center py-1 px-0.5 w-[38px] min-w-[38px] max-w-[38px] bg-rose-100 text-rose-700 font-bold select-none cursor-help"
          title={`${item.name} (${item.dangerCode}): RUSAK (${check?.note || 'Temuan Kerusakan / Perlu Perbaikan'})`}
        >
          {cellDisplayMode === 'icon' ? (
            <span className="inline-block text-xs leading-none" role="img" aria-label="Rusak">
              ❌
            </span>
          ) : cellDisplayMode === 'symbol' ? (
            <span className="text-rose-700 font-extrabold text-[11px]">✗</span>
          ) : (
            <span className="text-rose-700 font-bold text-[9px]">Rusak</span>
          )}
        </td>
      );
    }

    // Kondisi BAIK (OK)
    return (
      <td
        key={item.id}
        className="border-b border-r border-slate-300 text-center py-1 px-0.5 w-[38px] min-w-[38px] max-w-[38px] bg-emerald-50/50 text-emerald-700 font-bold select-none"
        title={`${item.name} (${item.dangerCode}): Kondisi Baik (OK)`}
      >
        {cellDisplayMode === 'icon' ? (
          <span className="inline-block text-xs leading-none" role="img" aria-label="Baik">
            ✅
          </span>
        ) : cellDisplayMode === 'symbol' ? (
          <span className="text-emerald-600 font-bold text-[11px]">✓</span>
        ) : (
          <span className="text-emerald-700 font-bold text-[9px]">Baik</span>
        )}
      </td>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3.5">
        {/* Row 1: Mode Switcher + Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-800 rounded-xl border border-blue-200/70">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Rekap Detail Item Pemeriksaan P2H</span>
              </h3>
              <p className="text-xs text-slate-500">
                Data terperinci dari setiap item checklist P2H (Bagian A, B, C), status kerusakan, dan catatan operasional.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportXLSX}
              className="h-9 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs active:scale-98"
              title="Unduh seluruh data dalam format Microsoft Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tarik Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="h-9 px-2.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs active:scale-98"
              title="Unduh format CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="h-9 px-3 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs active:scale-98"
              title="Cetak format cetak A4 Landscape"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak A4</span>
            </button>
          </div>
        </div>

        {/* Row 2: Mode Toggle & Date Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setDataMode('daily_roster')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                dataMode === 'daily_roster'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Rekapan Harian Armada</span>
            </button>

            <button
              type="button"
              onClick={() => setDataMode('all_records')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                dataMode === 'all_records'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Semua Riwayat Form ({p2hRecords.length} Dokumen)</span>
            </button>
          </div>

          {/* Date Picker for Daily Roster Mode */}
          {dataMode === 'daily_roster' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Pilih Tanggal:</span>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() - 1);
                    setSelectedDate(d.toISOString().slice(0, 10));
                  }}
                  className="p-1 hover:bg-slate-200 rounded text-slate-600"
                  title="Hari Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2 py-0.5 text-xs font-bold font-mono text-slate-900 bg-transparent border-0 focus:outline-none"
                />

                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() + 1);
                    setSelectedDate(d.toISOString().slice(0, 10));
                  }}
                  className="p-1 hover:bg-slate-200 rounded text-slate-600"
                  title="Hari Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
                  className="text-[11px] px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold rounded"
                >
                  Hari Ini
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Row 3: Filter Controls (Fleet Category, Owned By, Dept, Defect, Search) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100">
          {/* Category */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Kategori Armada:
            </label>
            <div className="flex items-center gap-1 h-9">
              <button
                type="button"
                onClick={() => setFleetCategory('LV')}
                className={`flex-1 h-full px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  fleetCategory === 'LV'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>Armada LV</span>
              </button>
              <button
                type="button"
                onClick={() => setFleetCategory('Bus')}
                className={`flex-1 h-full px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  fleetCategory === 'Bus'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Bus className="w-3.5 h-3.5" />
                <span>Armada Bus</span>
              </button>
              <button
                type="button"
                onClick={() => setFleetCategory('ALL')}
                className={`h-full px-2.5 rounded-lg text-xs font-bold transition-all ${
                  fleetCategory === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua
              </button>
            </div>
          </div>

          {/* Owned By Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Owned By:
            </label>
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="w-full h-9 px-2.5 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="ALL">Semua Owner ({availableOwners.length})</option>
              {availableOwners.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
          </div>

          {/* Dept Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              PIC Department:
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full h-9 px-2.5 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="ALL">Semua Departemen</option>
              {availableDepts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Shift & Defect Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Kondisi Temuan:
            </label>
            <select
              value={defectFilter}
              onChange={(e) => setDefectFilter(e.target.value as any)}
              className="w-full h-9 px-2.5 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="ALL">Semua Status Temuan</option>
              <option value="DEFECT_ONLY">Ada Kerusakan (Jml Rusak &gt; 0)</option>
              <option value="OK_ONLY">Siap Operasi (0 Rusak)</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Cari Unit / Operator:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="No. Lambung, PIC..."
                className="w-full h-9 pl-8 pr-7 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick summary stats banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-slate-500 font-medium">
              Menampilkan <strong className="text-slate-900">{filteredRows.length}</strong> unit
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {summaryStats.inspectedUnits} Sudah Diperiksa
            </span>
            {summaryStats.uninspectedUnits > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-amber-700 font-semibold">
                  {summaryStats.uninspectedUnits} Belum Mengisi P2H
                </span>
              </>
            )}
            {summaryStats.totalDefects > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  {summaryStats.totalDefects} Total Temuan Kerusakan
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
            <span className="text-slate-500 px-1 font-medium">Tampilan:</span>
            <button
              type="button"
              onClick={() => setCellDisplayMode('icon')}
              className={`px-2 py-0.5 rounded font-semibold transition-all ${
                cellDisplayMode === 'icon'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ikon (✅ / ❌)
            </button>
            <button
              type="button"
              onClick={() => setCellDisplayMode('symbol')}
              className={`px-2 py-0.5 rounded font-semibold transition-all ${
                cellDisplayMode === 'symbol'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Simbol (✓ / ✗)
            </button>
            <button
              type="button"
              onClick={() => setCellDisplayMode('text')}
              className={`px-2 py-0.5 rounded font-semibold transition-all ${
                cellDisplayMode === 'text'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Teks
            </button>
          </div>
        </div>
      </div>

      {/* Main Excel-like Spreadsheet Table */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden select-text isolate">
        <div className="overflow-auto max-h-[720px] relative">
          <table className="w-full border-separate border-spacing-0 text-[11px]">
            {/* Header Level 1: Group Headers */}
            <thead className="sticky top-0 z-20 shadow-sm">
              <tr className="bg-[#154360] text-white font-bold tracking-tight text-center">
                <th
                  rowSpan={2}
                  className="sticky left-0 z-30 bg-[#154360] border-t border-b border-r border-slate-400/80 px-1.5 py-2 w-[44px] min-w-[44px] max-w-[44px] shrink-0 text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>No</span>
                    <Filter className="w-2.5 h-2.5 text-white/60" />
                  </div>
                </th>
                <th
                  rowSpan={2}
                  className="sticky left-[44px] z-30 bg-[#154360] border-t border-b border-r border-slate-400/80 px-2 py-2 w-[86px] min-w-[86px] max-w-[86px] shrink-0 text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Tanggal</span>
                    <Filter className="w-2.5 h-2.5 text-white/60" />
                  </div>
                </th>
                <th
                  rowSpan={2}
                  className="sticky left-[130px] z-30 bg-[#154360] border-t border-b border-r border-slate-400/80 px-2.5 py-2 w-[136px] min-w-[136px] max-w-[136px] shrink-0 text-left"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="whitespace-nowrap">Nama / No. Unit</span>
                    <Filter className="w-2.5 h-2.5 text-white/60 shrink-0" />
                  </div>
                </th>
                <th
                  rowSpan={2}
                  className="sticky left-[266px] z-30 bg-[#154360] border-t border-b border-r border-slate-400/80 px-1 py-2 w-[84px] min-w-[84px] max-w-[84px] shrink-0 text-center shadow-[3px_0_5px_-1px_rgba(0,0,0,0.22)]"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className="whitespace-nowrap">Owned By</span>
                    <Filter className="w-2.5 h-2.5 text-white/60 shrink-0" />
                  </div>
                </th>
                <th
                  rowSpan={2}
                  className="bg-[#154360] border-t border-b border-r border-slate-400/80 px-2 py-2 w-[110px] min-w-[110px] shrink-0 text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>PIC Department</span>
                    <Filter className="w-2.5 h-2.5 text-white/60 shrink-0" />
                  </div>
                </th>
                <th
                  rowSpan={2}
                  className="bg-[#154360] border-t border-b border-r border-slate-400/80 px-2.5 py-2 w-[130px] min-w-[130px] shrink-0 text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Operator/User</span>
                    <Filter className="w-2.5 h-2.5 text-white/60 shrink-0" />
                  </div>
                </th>
                <th
                  rowSpan={2}
                  className="bg-[#154360] border-t border-b border-r border-slate-400/80 px-2 py-2 w-[70px] min-w-[70px] shrink-0 text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Shift</span>
                    <Filter className="w-2.5 h-2.5 text-white/60 shrink-0" />
                  </div>
                </th>
                <th
                  rowSpan={2}
                  className="bg-[#154360] border-t border-b border-r border-slate-400/80 px-2 py-2 w-[75px] min-w-[75px] shrink-0 text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>KM/HM</span>
                    <Filter className="w-2.5 h-2.5 text-white/60 shrink-0" />
                  </div>
                </th>

                {/* Bagian A Group Header */}
                <th
                  colSpan={itemsPartA.length}
                  className="bg-[#205493] text-white border-t border-b border-r border-slate-400/80 py-2 text-xs font-bold uppercase tracking-wider text-center"
                >
                  Bagian A
                </th>

                {/* Bagian B Group Header */}
                <th
                  colSpan={itemsPartB.length}
                  className="bg-[#1a365d] text-white border-t border-b border-r border-slate-400/80 py-2 text-xs font-bold uppercase tracking-wider text-center"
                >
                  Bagian B
                </th>

                {/* Bagian C Group Header */}
                <th
                  colSpan={itemsPartC.length}
                  className="bg-[#205493] text-white border-t border-b border-r border-slate-400/80 py-2 text-xs font-bold uppercase tracking-wider text-center"
                >
                  Bagian C
                </th>

                {/* Jml Rusak */}
                <th
                  rowSpan={2}
                  className="bg-[#154360] border-t border-b border-r border-slate-400/80 px-2 py-2 w-[68px] min-w-[68px] max-w-[68px] shrink-0 text-center font-bold"
                >
                  Jml Rusak
                </th>

                {/* Catatan / Tindak Lanjut */}
                <th
                  rowSpan={2}
                  className="bg-[#154360] border-t border-b border-r border-slate-400/80 px-3 py-2 min-w-[280px] max-w-[450px] text-left font-bold"
                >
                  Catatan / Tindak Lanjut
                </th>
              </tr>

              {/* Header Level 2: Vertical Item Headers */}
              <tr className="bg-[#1b4f72] text-slate-900 text-[10px] font-bold">
                {/* Part A Items (Soft Pastel Peach/Pink Header #fce8e6) */}
                {itemsPartA.map((item) => (
                  <th
                    key={item.id}
                    className="border-b border-r border-slate-400/80 bg-[#fce8e6] text-slate-900 px-0.5 py-2 w-[38px] min-w-[38px] max-w-[38px] h-[220px] max-h-[220px] align-bottom text-center overflow-hidden"
                    title={`${item.no}. ${item.name} (${item.dangerCode})\n${item.description || ''}`}
                  >
                    <div
                      className="whitespace-nowrap font-semibold tracking-tight text-left inline-block overflow-hidden text-[9.5px] leading-none select-none"
                      style={{
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        maxHeight: '202px',
                        maxWidth: '32px',
                      }}
                    >
                      {item.name} ({item.dangerCode})
                    </div>
                  </th>
                ))}

                {/* Part B Items (Soft Pastel Cream/Yellow Header #fef3c7) */}
                {itemsPartB.map((item) => (
                  <th
                    key={item.id}
                    className="border-b border-r border-slate-400/80 bg-[#fef3c7] text-slate-900 px-0.5 py-2 w-[38px] min-w-[38px] max-w-[38px] h-[220px] max-h-[220px] align-bottom text-center overflow-hidden"
                    title={`${item.no}. ${item.name} (${item.dangerCode})\n${item.description || ''}`}
                  >
                    <div
                      className="whitespace-nowrap font-semibold tracking-tight text-left inline-block overflow-hidden text-[9.5px] leading-none select-none"
                      style={{
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        maxHeight: '202px',
                        maxWidth: '32px',
                      }}
                    >
                      {item.name} ({item.dangerCode})
                    </div>
                  </th>
                ))}

                {/* Part C Items (Soft Pastel Peach/Pink Header #fce8e6) */}
                {itemsPartC.map((item) => (
                  <th
                    key={item.id}
                    className="border-b border-r border-slate-400/80 bg-[#fce8e6] text-slate-900 px-0.5 py-2 w-[38px] min-w-[38px] max-w-[38px] h-[220px] max-h-[220px] align-bottom text-center overflow-hidden"
                    title={`${item.no}. ${item.name} (${item.dangerCode})\n${item.description || ''}`}
                  >
                    <div
                      className="whitespace-nowrap font-semibold tracking-tight text-left inline-block overflow-hidden text-[9.5px] leading-none select-none"
                      style={{
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        maxHeight: '202px',
                        maxWidth: '32px',
                      }}
                    >
                      {item.name} ({item.dangerCode})
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8 + activeChecklist.length + 2}
                    className="p-10 text-center text-slate-400 italic bg-white border-b border-r border-slate-300"
                  >
                    Tidak ada data inspeksi P2H yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const unitBg = getUnitCellBg(row);
                  const ownerBg = getOwnedByCellBg(row.ownedBy);

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* No */}
                      <td className="sticky left-0 z-10 bg-slate-50 border-b border-r border-slate-300 text-center py-1 font-mono text-[11px] text-slate-700 w-[44px] min-w-[44px] max-w-[44px]">
                        {row.no}
                      </td>

                      {/* Tanggal (DD/MM/YYYY) */}
                      <td className="sticky left-[44px] z-10 bg-white border-b border-r border-slate-300 text-center py-1 font-mono text-[11px] text-slate-800 whitespace-nowrap w-[86px] min-w-[86px] max-w-[86px]">
                        {row.tanggal}
                      </td>

                      {/* Nama Unit / No. Unit */}
                      <td
                        className={`sticky left-[130px] z-10 border-b border-r border-slate-300 px-2 py-1 text-left font-bold font-mono text-xs cursor-pointer w-[136px] min-w-[136px] max-w-[136px] ${unitBg}`}
                        title={
                          row.record
                            ? `Klik untuk melihat detail P2H Unit ${row.unitName}`
                            : `Unit ${row.unitName} belum P2H. Klik untuk buat form P2H baru.`
                        }
                        onClick={() => {
                          if (row.record && onOpenP2H) {
                            onOpenP2H(row.record);
                          } else if (row.isFromRosterOnly && onNewP2HForUnit) {
                            onNewP2HForUnit(row.unitName, undefined, row.rawDate);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between gap-1 w-full whitespace-nowrap overflow-hidden">
                          <span className="truncate">{row.unitName}</span>
                          {row.isFromRosterOnly && (
                            <span
                              className="text-[9px] px-1 py-0.5 rounded bg-slate-200/80 text-slate-600 font-sans font-medium no-print shrink-0 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors"
                              title="Belum ada P2H. Klik untuk isi form."
                            >
                              +Isi
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Owned By Badge */}
                      <td className="sticky left-[266px] z-10 border-b border-r border-slate-300 px-1 py-1 text-center bg-white shadow-[3px_0_5px_-1px_rgba(0,0,0,0.14)] w-[84px] min-w-[84px] max-w-[84px]">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${ownerBg}`}
                        >
                          {row.ownedBy}
                        </span>
                      </td>

                      {/* PIC Department */}
                      <td className="border-b border-r border-slate-300 px-2 py-1 text-center font-semibold text-slate-800 uppercase bg-white whitespace-nowrap w-[110px] min-w-[110px]">
                        {row.dept}
                      </td>

                      {/* Operator/User */}
                      <td
                        className="border-b border-r border-slate-300 px-2.5 py-1 text-left text-slate-800 bg-white truncate w-[130px] min-w-[130px] max-w-[130px]"
                        title={row.operatorName}
                      >
                        {row.operatorName}
                      </td>

                      {/* Shift */}
                      <td className="border-b border-r border-slate-300 px-1 py-1 text-center font-medium text-slate-700 bg-white whitespace-nowrap w-[70px] min-w-[70px]">
                        {row.shift}
                      </td>

                      {/* KM/HM */}
                      <td className="border-b border-r border-slate-300 px-1.5 py-1 text-center font-mono text-slate-800 bg-white whitespace-nowrap w-[75px] min-w-[75px]">
                        {row.kmHm}
                      </td>

                      {/* Bagian A Checklist Item Cells */}
                      {itemsPartA.map((item) => renderChecklistCell(item, row))}

                      {/* Bagian B Checklist Item Cells */}
                      {itemsPartB.map((item) => renderChecklistCell(item, row))}

                      {/* Bagian C Checklist Item Cells */}
                      {itemsPartC.map((item) => renderChecklistCell(item, row))}

                      {/* Jml Rusak */}
                      <td
                        className={`border-b border-r border-slate-300 text-center py-1 font-bold font-mono text-xs w-[68px] min-w-[68px] max-w-[68px] ${
                          row.jmlRusak > 0
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-white text-slate-800'
                        }`}
                      >
                        {row.jmlRusak}
                      </td>

                      {/* Catatan / Tindak Lanjut (Pale yellow background #fefce8 matching spreadsheet) */}
                      <td className="border-b border-r border-slate-300 px-3 py-1 text-left bg-[#fefce8] text-slate-800 text-xs min-w-[280px]">
                        {row.catatanTindakLanjut ? (
                          <span className="font-medium text-slate-900 leading-tight">
                            {row.catatanTindakLanjut}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Bottom Totals / Defect Summary Row */}
              <tr className="bg-[#154360] text-white font-bold text-xs sticky bottom-0 z-20 shadow-[0_-2px_4px_-1px_rgba(0,0,0,0.15)]">
                <td
                  colSpan={4}
                  className="sticky left-0 z-30 bg-[#154360] border-t-2 border-b border-r border-slate-400 px-3 py-2 text-left font-bold w-[350px] min-w-[350px] shadow-[3px_0_5px_-1px_rgba(0,0,0,0.22)]"
                >
                  TOTAL TEMUAN RUSAK ({filteredRows.length} Unit)
                </td>
                <td colSpan={4} className="border-t-2 border-b border-r border-slate-400 bg-[#154360]" />

                {/* Sum of defects for each item in Part A */}
                {itemsPartA.map((item) => {
                  const count = summaryStats.itemDefectCounts[item.id] || 0;
                  return (
                    <td
                      key={`total-${item.id}`}
                      className={`border-t-2 border-b border-r border-slate-400 text-center py-1.5 font-bold font-mono text-[10px] w-[38px] min-w-[38px] max-w-[38px] ${
                        count > 0 ? 'bg-rose-500 text-white' : 'bg-[#154360] text-white/80'
                      }`}
                      title={`Total Temuan Kerusakan ${item.name}: ${count}`}
                    >
                      {count}
                    </td>
                  );
                })}

                {/* Sum of defects for each item in Part B */}
                {itemsPartB.map((item) => {
                  const count = summaryStats.itemDefectCounts[item.id] || 0;
                  return (
                    <td
                      key={`total-${item.id}`}
                      className={`border-t-2 border-b border-r border-slate-400 text-center py-1.5 font-bold font-mono text-[10px] w-[38px] min-w-[38px] max-w-[38px] ${
                        count > 0 ? 'bg-rose-500 text-white' : 'bg-[#154360] text-white/80'
                      }`}
                      title={`Total Temuan Kerusakan ${item.name}: ${count}`}
                    >
                      {count}
                    </td>
                  );
                })}

                {/* Sum of defects for each item in Part C */}
                {itemsPartC.map((item) => {
                  const count = summaryStats.itemDefectCounts[item.id] || 0;
                  return (
                    <td
                      key={`total-${item.id}`}
                      className={`border-t-2 border-b border-r border-slate-400 text-center py-1.5 font-bold font-mono text-[10px] w-[38px] min-w-[38px] max-w-[38px] ${
                        count > 0 ? 'bg-rose-500 text-white' : 'bg-[#154360] text-white/80'
                      }`}
                      title={`Total Temuan Kerusakan ${item.name}: ${count}`}
                    >
                      {count}
                    </td>
                  );
                })}

                {/* Total Jml Rusak */}
                <td className="border-t-2 border-b border-r border-slate-400 text-center py-1.5 font-bold font-mono bg-rose-600 text-white w-[68px] min-w-[68px] max-w-[68px]">
                  {summaryStats.totalDefects}
                </td>

                {/* Catatan / Tindak Lanjut Footer */}
                <td className="border-t-2 border-b border-r border-slate-400 px-3 py-1.5 text-left text-[11px] text-white/90 min-w-[280px] bg-[#154360]">
                  {summaryStats.totalDefects === 0
                    ? 'Semua unit terdata siap operasi (0 kerusakan).'
                    : `Terdapat ${summaryStats.totalDefects} item kerusakan yang perlu tindak lanjut perbaikan.`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
