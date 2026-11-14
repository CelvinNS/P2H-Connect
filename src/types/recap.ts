import { UnitReadinessStatus } from './p2h';

export type UnitRecapStatus = 'S1' | 'S2' | 'S1/S2' | 'B/D' | 'BU' | 'STANDBY' | 'BELUM';

export interface FleetUnit {
  no: number;
  unitName: string;
  dept: string;
  ownedBy?: string; // 'PST' | 'WARGI' | 'BJR' | etc.
  unitType?: string; // 'LV' | 'Bus' | 'Truk' | 'Sarana' | 'Alat Berat' | 'Lainnya'
  plateNumber?: string;
  brand?: string;
  description?: string;
  isActive?: boolean;
}

export interface DayStatusRecord {
  status: UnitRecapStatus;
  p2hId?: string;
  p2hIdS1?: string;
  p2hIdS2?: string;
  operatorName?: string;
  operatorNameS1?: string;
  operatorNameS2?: string;
  unitConditionStatus?: UnitReadinessStatus;
  notes?: string;
  updatedAt?: string;
}

// Master mapping of Owned By for 38 LV units
export const LV_OWNED_BY_MAP: Record<string, string> = {
  'PST 01': 'PST',
  'LV 02': 'PST',
  'LV 50': 'WARGI',
  'LV 30': 'BJR',
  'LV 17': 'BJR',
  'LV 18': 'BJR',
  'LV 33': 'BJR',
  'LV 32': 'BJR',
  'LV 07 / LV 38': 'BJR',
  'LV 38': 'BJR',
  'LV 53': 'WARGI',
  'LV 09 / LV 02': 'BJR',
  'LV SPARE 02': 'BJR',
  'LV 45': 'WARGI',
  'LV 48': 'WARGI',
  'LV 16': 'PST',
  'ELF 01': 'PST',
  'LV 12': 'BJR',
  'LV 31': 'BJR',
  'LV 55': 'BJR',
  'LV 37': 'PST',
  'LV 52': 'WARGI',
  'LV 10': 'BJR',
  'LV 41 / LV 57': 'BJR',
  'LV 57': 'BJR',
  'LV 39': 'BJR',
  'LV 36': 'PST',
  'LV 46': 'WARGI',
  'LV 49': 'WARGI',
  'LV 51': 'WARGI',
  'LV 58': 'WARGI',
  'LV 04': 'BJR',
  'LV 54': 'BJR',
  'LV 47': 'WARGI',
  'LV 27': 'PST',
  'LV 35': 'BJR',
  'LV 56': 'WARGI',
  'LV 59': 'WARGI',
  'LV 13': 'PST',
  'LV 34': 'PST',
  'LV 40': 'PST',
};

// Fleet roster with 38 LV units (including ELF 01) and 20 Bus units (17 operasional + 3 spare)
export const INITIAL_FLEET_ROSTER: FleetUnit[] = [
  // 38 UNIT LV (LIGHT VEHICLE) - Termasuk ELF 01 digabungkan dalam LV, dengan kolom Owned By
  { no: 1, unitName: 'PST 01', dept: 'PJO', ownedBy: 'PST', unitType: 'LV' },
  { no: 2, unitName: 'LV 02', dept: 'DPM 1', ownedBy: 'PST', unitType: 'LV' },
  { no: 3, unitName: 'LV 50', dept: 'DPM 2', ownedBy: 'WARGI', unitType: 'LV' },
  { no: 4, unitName: 'LV 30', dept: 'DPM 3', ownedBy: 'BJR', unitType: 'LV' },
  { no: 5, unitName: 'LV 17', dept: 'PRODUKSI', ownedBy: 'BJR', unitType: 'LV' },
  { no: 6, unitName: 'LV 18', dept: 'PRODUKSI', ownedBy: 'BJR', unitType: 'LV' },
  { no: 7, unitName: 'LV 33', dept: 'PRODUKSI', ownedBy: 'BJR', unitType: 'LV' },
  { no: 8, unitName: 'LV 32', dept: 'PRODUKSI', ownedBy: 'BJR', unitType: 'LV' },
  { no: 9, unitName: 'LV 38', dept: 'PRODUKSI', ownedBy: 'BJR', unitType: 'LV' },
  { no: 10, unitName: 'LV 53', dept: 'PRODUKSI', ownedBy: 'WARGI', unitType: 'LV' },
  { no: 11, unitName: 'LV SPARE 02', dept: 'PRODUKSI', ownedBy: 'BJR', unitType: 'LV' },
  { no: 12, unitName: 'LV 45', dept: 'PRODUKSI', ownedBy: 'WARGI', unitType: 'LV' },
  { no: 13, unitName: 'LV 48', dept: 'PRODUKSI', ownedBy: 'WARGI', unitType: 'LV' },
  { no: 14, unitName: 'LV 16', dept: 'PRODUKSI', ownedBy: 'PST', unitType: 'LV' },
  { no: 15, unitName: 'ELF 01', dept: 'PRODUKSI', ownedBy: 'PST', unitType: 'LV', description: 'Armada Elf Operasional Produksi' },
  { no: 16, unitName: 'LV 12', dept: 'ENGINEERING', ownedBy: 'BJR', unitType: 'LV' },
  { no: 17, unitName: 'LV 31', dept: 'ENGINEERING', ownedBy: 'BJR', unitType: 'LV' },
  { no: 18, unitName: 'LV 55', dept: 'ENGINEERING', ownedBy: 'BJR', unitType: 'LV' },
  { no: 19, unitName: 'LV 37', dept: 'ENGINEERING', ownedBy: 'PST', unitType: 'LV' },
  { no: 20, unitName: 'LV 52', dept: 'ENGINEERING', ownedBy: 'WARGI', unitType: 'LV' },
  { no: 21, unitName: 'LV 10', dept: 'PLANT', ownedBy: 'BJR', unitType: 'LV' },
  { no: 22, unitName: 'LV 57', dept: 'PLANT', ownedBy: 'BJR', unitType: 'LV' },
  { no: 23, unitName: 'LV 39', dept: 'PLANT', ownedBy: 'BJR', unitType: 'LV' },
  { no: 24, unitName: 'LV 36', dept: 'PLANT', ownedBy: 'PST', unitType: 'LV' },
  { no: 25, unitName: 'LV 46', dept: 'PLANT', ownedBy: 'WARGI', unitType: 'LV' },
  { no: 26, unitName: 'LV 49', dept: 'PLANT', ownedBy: 'WARGI', unitType: 'LV' },
  { no: 27, unitName: 'LV 51', dept: 'PLANT', ownedBy: 'WARGI', unitType: 'LV' },
  { no: 28, unitName: 'LV 58', dept: 'PLANT', ownedBy: 'WARGI', unitType: 'LV' },
  { no: 29, unitName: 'LV 04', dept: 'OPD', ownedBy: 'BJR', unitType: 'LV' },
  { no: 30, unitName: 'LV 54', dept: 'SHE', ownedBy: 'BJR', unitType: 'LV' },
  { no: 31, unitName: 'LV 47', dept: 'SHE', ownedBy: 'WARGI', unitType: 'LV' },
  { no: 32, unitName: 'LV 27', dept: 'SHE', ownedBy: 'PST', unitType: 'LV' },
  { no: 33, unitName: 'LV 35', dept: 'LOGISTIK', ownedBy: 'BJR', unitType: 'LV' },
  { no: 34, unitName: 'LV 56', dept: 'LOGISTIK', ownedBy: 'WARGI', unitType: 'LV' },
  { no: 35, unitName: 'LV 59', dept: 'LOGISTIK', ownedBy: 'WARGI', unitType: 'LV' },
  { no: 36, unitName: 'LV 13', dept: 'HCGS', ownedBy: 'PST', unitType: 'LV' },
  { no: 37, unitName: 'LV 34', dept: 'HCGS', ownedBy: 'PST', unitType: 'LV' },
  { no: 38, unitName: 'LV 40', dept: 'HCGS', ownedBy: 'PST', unitType: 'LV' },

  // 20 UNIT BUS (17 OPERASIONAL + 3 SPARE) - Owned by BAGONG
  { no: 39, unitName: 'PST 008', dept: 'PRODUKSI', ownedBy: 'BAGONG', unitType: 'Bus', description: 'Armada Bus Operasional Produksi' },
  { no: 40, unitName: 'PST 009', dept: 'PLANT', ownedBy: 'BAGONG', unitType: 'Bus', description: 'Armada Bus Operasional Plant' },
  { no: 41, unitName: 'PST 010', dept: 'PLANT', ownedBy: 'BAGONG', unitType: 'Bus', description: 'Armada Bus Operasional Plant' },
  { no: 42, unitName: 'PST 011', dept: 'PRODUKSI', ownedBy: 'BAGONG', unitType: 'Bus', description: 'Armada Bus Operasional Produksi' },
  { no: 43, unitName: 'PST 012', dept: 'PLANT', ownedBy: 'BAGONG', unitType: 'Bus', description: 'Armada Bus Operasional Plant' },
  { no: 44, unitName: 'PST 013', dept: 'PRODUKSI', ownedBy: 'BAGONG', unitType: 'Bus', description: 'Armada Bus Operasional Produksi' },
  { no: 45, unitName: 'PST 014', dept: 'PRODUKSI', ownedBy: 'BAGONG', unitType: 'Bus', description: 'Armada Bus Operasional Produksi' },
  { no: 46, unitName: 'PST 015', dept: 'PRODUKSI', ownedBy: 'BAGONG', unitType: 'Bus', description: 'Armada Bus Operasional Produksi' },
  { no: 47, unitName: 'PST 016', dept: 'PLANT', ownedBy: 'BAGONG', unitType: 'Bus', description: 'Armada Bus Operasional Plant' },
  { no: 48, unitName: 'PST 017', dept: 'PRODUKSI', ownedBy: 'BAGONG', unitType: 'Bus', description: 'Armada Bus Operasional Produksi' },
  { no: 49, unitName: 'PST 018', dept: 'PLANT', ownedBy: 'BAGONG', unitType: 'Bus', description: 'Armada Bus Operasional Plant' },
  { no: 50, unitName: 'PST 019', dept: 'PRODUKSI', ownedBy: 'BAGONG', unitType: 'Bus', description: 'Armada Bus Operasional Produksi' },
  { no: 51, unitName: 'PST 020', dept: 'PRODUKSI', ownedBy: 'BAGONG', unitType: 'Bus', description: 'Armada Bus Operasional Produksi' },
  { no: 52, unitName: 'PST 021', dept: 'PRODUKSI', ownedBy: 'BAGONG', unitType: 'Bus', description: 'Armada Bus Operasional Produksi' },
  { no: 53, unitName: 'PST 022', dept: 'PLANT', ownedBy: 'BAGONG', unitType: 'Bus', description: 'Armada Bus Operasional Plant' },
  { no: 54, unitName: 'PST 023', dept: 'PLANT', ownedBy: 'BAGONG', unitType: 'Bus', description: 'Armada Bus Operasional Plant' },
  { no: 55, unitName: 'PST 024', dept: 'PRODUKSI', ownedBy: 'BAGONG', unitType: 'Bus', description: 'Armada Bus Operasional Produksi' },
  { no: 56, unitName: 'SPARE 02', dept: 'SPARE', ownedBy: 'BAGONG', unitType: 'Bus', description: 'Unit Spare Bus 02' },
  { no: 57, unitName: 'SPARE 03', dept: 'SPARE', ownedBy: 'BAGONG', unitType: 'Bus', description: 'Unit Spare Bus 03' },
  { no: 58, unitName: 'SPARE 04', dept: 'SPARE', ownedBy: 'BAGONG', unitType: 'Bus', description: 'Unit Spare Bus 04' },
];

export const STATUS_DEFINITIONS: Record<
  UnitRecapStatus,
  { label: string; desc: string; bgClass: string; textClass: string; badgeBg: string }
> = {
  S1: {
    label: 'S1',
    desc: 'Siap Operasi (RFU) - Shift 1 (06:00 - 18:00)',
    bgClass: 'bg-[#bbf7d0] hover:bg-[#86efac]',
    textClass: 'text-emerald-950 font-bold',
    badgeBg: 'bg-[#bbf7d0] text-emerald-950 border border-emerald-400',
  },
  S2: {
    label: 'S2',
    desc: 'Siap Operasi (RFU) - Shift 2 (18:00 - 06:00)',
    bgClass: 'bg-[#a7f3d0] hover:bg-[#6ee7b7]',
    textClass: 'text-emerald-950 font-bold',
    badgeBg: 'bg-[#a7f3d0] text-emerald-950 border border-emerald-400',
  },
  'S1/S2': {
    label: 'S1/S2',
    desc: 'P2H Lengkap 2 Shift (Shift 1 & Shift 2)',
    bgClass: 'bg-[#10b981] hover:bg-[#059669]',
    textClass: 'text-white font-black',
    badgeBg: 'bg-[#10b981] text-white border border-emerald-600',
  },
  'B/D': {
    label: 'B/D',
    desc: 'Breakdown / Unit Rusak (BD)',
    bgClass: 'bg-[#ef4444] hover:bg-[#dc2626]',
    textClass: 'text-white font-black',
    badgeBg: 'bg-[#ef4444] text-white border border-red-600',
  },
  BU: {
    label: 'BU',
    desc: 'BU (Backup Unit / Unit Cadangan)',
    bgClass: 'bg-[#fef08a] hover:bg-[#fde047]',
    textClass: 'text-amber-950 font-bold',
    badgeBg: 'bg-[#fef08a] text-amber-950 border border-amber-300',
  },
  STANDBY: {
    label: 'STANDBY',
    desc: 'Standby Unit (Siap / Menunggu Penugasan)',
    bgClass: 'bg-[#f59e0b] hover:bg-[#d97706]',
    textClass: 'text-amber-950 font-black',
    badgeBg: 'bg-[#f59e0b] text-amber-950 border border-amber-600',
  },
  BELUM: {
    label: '-',
    desc: 'Belum Ada Laporan P2H Hari Ini',
    bgClass: 'bg-white hover:bg-slate-100',
    textClass: 'text-slate-400',
    badgeBg: 'bg-slate-100 text-slate-600 border border-slate-300',
  },
};
