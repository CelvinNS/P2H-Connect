import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  Search,
  Filter,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Award,
  Clock,
  ArrowUpDown,
  Car,
  FileText,
  ShieldAlert,
  Info,
  Building2,
  ExternalLink,
  X,
} from 'lucide-react';
import { P2HRecord } from '../types/p2h';
import { AppUser } from '../types/auth';
import { getLocalUsers, subscribeToUsers } from '../utils/authStorage';

interface P2HMonthlyAnalyticsProps {
  p2hRecords: P2HRecord[];
  currentYear: number;
  currentMonth: number; // 1 - 12
  onMonthChange: (month: number, year: number) => void;
  onOpenP2H?: (record: P2HRecord) => void;
  onNavigateToHistory?: () => void;
}

export interface UserP2HStat {
  userId?: string;
  userCode: string;
  name: string;
  department: string;
  role: 'admin' | 'user';
  totalCount: number;
  shift1Count: number;
  shift2Count: number;
  siapOperasiCount: number;
  repairCount: number;
  lastDate: string | null;
  lastUnit: string | null;
  records: P2HRecord[];
  evaluationStatus: 'critical_zero' | 'warning_low' | 'moderate' | 'good' | 'stellar';
  evaluationLabel: string;
  actionRecommendation: string;
}

const MONTH_NAMES = [
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

export const P2HMonthlyAnalytics: React.FC<P2HMonthlyAnalyticsProps> = ({
  p2hRecords,
  currentYear,
  currentMonth,
  onMonthChange,
  onOpenP2H,
  onNavigateToHistory,
}) => {
  const [users, setUsers] = useState<AppUser[]>(() => getLocalUsers());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [evaluationFilter, setEvaluationFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'ACTIVE'>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'OPERATOR' | 'ADMIN'>('OPERATOR');
  const [sortBy, setSortBy] = useState<'LEAST' | 'MOST' | 'NAME' | 'DEPT'>('LEAST'); // Default LEAST for evaluating low users!
  const [activeTab, setActiveTab] = useState<'chart' | 'trend' | 'table'>('chart');
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserP2HStat | null>(null);

  // Subscribe to live registered users
  useEffect(() => {
    const unsub = subscribeToUsers((updated) => {
      setUsers(updated);
    });
    return () => unsub();
  }, []);

  // Total days in the chosen month
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentYear, currentMonth]);

  // Prefix for this month: 'YYYY-MM'
  const monthPrefix = useMemo(() => {
    return `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  }, [currentYear, currentMonth]);

  // Filter records for the selected month
  const monthlyRecords = useMemo(() => {
    return p2hRecords.filter((r) => {
      if (r.date && r.date.startsWith(monthPrefix)) return true;
      if (!r.date && r.createdAt && r.createdAt.startsWith(monthPrefix)) return true;
      return false;
    });
  }, [p2hRecords, monthPrefix]);

  // Compute Daily Trend data (Day 1 to daysInMonth)
  const dailyStats = useMemo(() => {
    const map: Record<number, { day: number; dateStr: string; total: number; shift1: number; shift2: number }> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dd = String(d).padStart(2, '0');
      map[d] = {
        day: d,
        dateStr: `${monthPrefix}-${dd}`,
        total: 0,
        shift1: 0,
        shift2: 0,
      };
    }

    monthlyRecords.forEach((r) => {
      let dayNum = 0;
      if (r.date && r.date.startsWith(monthPrefix)) {
        dayNum = parseInt(r.date.split('-')[2], 10);
      } else if (r.createdAt && r.createdAt.startsWith(monthPrefix)) {
        dayNum = new Date(r.createdAt).getDate();
      }

      if (dayNum >= 1 && dayNum <= daysInMonth && map[dayNum]) {
        map[dayNum].total++;
        if (r.shift && r.shift.toLowerCase().includes('shift 2')) {
          map[dayNum].shift2++;
        } else {
          map[dayNum].shift1++;
        }
      }
    });

    return Object.values(map);
  }, [monthlyRecords, daysInMonth, monthPrefix]);

  const maxDailyCount = useMemo(() => {
    const counts = dailyStats.map((d) => d.total);
    return Math.max(...counts, 1);
  }, [dailyStats]);

  // Aggregate stats per user / operator
  const userStatsList = useMemo(() => {
    // Map existing registered users first
    const statMap = new Map<string, UserP2HStat>();

    users.forEach((u) => {
      const key = u.id || u.userCode.toUpperCase();
      statMap.set(key, {
        userId: u.id,
        userCode: u.userCode,
        name: u.name,
        department: u.department || 'OPERASIONAL',
        role: u.role,
        totalCount: 0,
        shift1Count: 0,
        shift2Count: 0,
        siapOperasiCount: 0,
        repairCount: 0,
        lastDate: null,
        lastUnit: null,
        records: [],
        evaluationStatus: 'critical_zero',
        evaluationLabel: 'Belum Pernah P2H (0 kali)',
        actionRecommendation: 'Perlu konfirmasi & evaluasi kedisiplinan pengisian P2H',
      });
    });

    // Cross-match monthly records
    monthlyRecords.forEach((r) => {
      // Find matching user by id, userCode, or name
      let matchedStat: UserP2HStat | undefined;
      if (r.userId && statMap.has(r.userId)) {
        matchedStat = statMap.get(r.userId);
      } else if (r.userCode) {
        const cleanCode = r.userCode.trim().toUpperCase();
        for (const stat of statMap.values()) {
          if (stat.userCode.toUpperCase() === cleanCode) {
            matchedStat = stat;
            break;
          }
        }
      }

      if (!matchedStat && r.operatorName) {
        const normName = r.operatorName.trim().toLowerCase();
        for (const stat of statMap.values()) {
          if (stat.name.trim().toLowerCase() === normName) {
            matchedStat = stat;
            break;
          }
        }
      }

      // If operator is not in registered user database, create dynamic entry so they are still counted!
      if (!matchedStat) {
        const dynamicCode = r.userCode || `OPR-${r.operatorName.replace(/\s+/g, '').slice(0, 5).toUpperCase()}`;
        const dynamicKey = `dynamic-${r.operatorName.toLowerCase()}`;
        if (!statMap.has(dynamicKey)) {
          statMap.set(dynamicKey, {
            userCode: dynamicCode,
            name: r.operatorName,
            department: 'OPERASIONAL',
            role: r.operatorRole || 'user',
            totalCount: 0,
            shift1Count: 0,
            shift2Count: 0,
            siapOperasiCount: 0,
            repairCount: 0,
            lastDate: null,
            lastUnit: null,
            records: [],
            evaluationStatus: 'critical_zero',
            evaluationLabel: 'Belum Pernah P2H',
            actionRecommendation: '',
          });
        }
        matchedStat = statMap.get(dynamicKey);
      }

      if (matchedStat) {
        matchedStat.totalCount++;
        matchedStat.records.push(r);

        if (r.shift && r.shift.toLowerCase().includes('shift 2')) {
          matchedStat.shift2Count++;
        } else {
          matchedStat.shift1Count++;
        }

        if (r.status === 'siap_operasi') {
          matchedStat.siapOperasiCount++;
        } else {
          matchedStat.repairCount++;
        }

        // Check last date
        const recDate = r.date || r.createdAt.slice(0, 10);
        if (!matchedStat.lastDate || recDate > matchedStat.lastDate) {
          matchedStat.lastDate = recDate;
          matchedStat.lastUnit = r.unitName;
        }
      }
    });

    // Compute evaluation status & recommendations for all users
    const result: UserP2HStat[] = [];
    statMap.forEach((item) => {
      if (item.totalCount === 0) {
        item.evaluationStatus = 'critical_zero';
        item.evaluationLabel = '0 P2H (Belum Pernah Mengisi)';
        item.actionRecommendation = 'Prioritas Evaluasi: Peringatan & konfirmasi alasan belum P2H bulan ini';
      } else if (item.totalCount <= 3) {
        item.evaluationStatus = 'warning_low';
        item.evaluationLabel = `${item.totalCount} P2H (Frekuensi Rendah)`;
        item.actionRecommendation = 'Perlu Bimbingan: Kepatuhan P2H di bawah standar minimal site';
      } else if (item.totalCount <= 10) {
        item.evaluationStatus = 'moderate';
        item.evaluationLabel = `${item.totalCount} P2H (Cukup / Standar)`;
        item.actionRecommendation = 'Kepatuhan Cukup: Pertahankan dan tingkatkan konsistensi harian';
      } else if (item.totalCount <= 20) {
        item.evaluationStatus = 'good';
        item.evaluationLabel = `${item.totalCount} P2H (Disiplin & Rutin)`;
        item.actionRecommendation = 'Sangat Baik: Melakukan pemeriksaan rutin sesuai jam kerja';
      } else {
        item.evaluationStatus = 'stellar';
        item.evaluationLabel = `${item.totalCount} P2H (Teladan K3)`;
        item.actionRecommendation = 'Teladan: Kepatuhan operasional sangat tinggi & konsisten';
      }

      result.push(item);
    });

    return result;
  }, [users, monthlyRecords]);

  // Max count among users for relative bar chart width
  const maxUserP2HCount = useMemo(() => {
    const counts = userStatsList.map((u) => u.totalCount);
    return Math.max(...counts, 1);
  }, [userStatsList]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    userStatsList.forEach((u) => {
      if (u.department) set.add(u.department);
    });
    return Array.from(set).sort();
  }, [userStatsList]);

  // KPI Metrics
  const kpiMetrics = useMemo(() => {
    const operatorsOnly = userStatsList.filter((u) => u.role !== 'admin');
    const zeroList = operatorsOnly.filter((u) => u.totalCount === 0);
    const lowList = operatorsOnly.filter((u) => u.totalCount > 0 && u.totalCount <= 3);
    const activeList = operatorsOnly.filter((u) => u.totalCount > 0);

    // Sort ascending for lowest operators
    const sortedByLowest = [...operatorsOnly].sort((a, b) => a.totalCount - b.totalCount);
    // Sort descending for top operator
    const sortedByHighest = [...operatorsOnly].sort((a, b) => b.totalCount - a.totalCount);

    const lowestUsers = sortedByLowest.slice(0, 3);
    const topUser = sortedByHighest[0] || null;

    const totalSubmissions = monthlyRecords.length;
    const avgPerDay = (totalSubmissions / daysInMonth).toFixed(1);

    return {
      totalSubmissions,
      avgPerDay,
      totalUsers: operatorsOnly.length,
      zeroCount: zeroList.length,
      lowCount: lowList.length,
      criticalTotal: zeroList.length + lowList.length,
      activeCount: activeList.length,
      lowestUsers,
      topUser,
    };
  }, [userStatsList, monthlyRecords, daysInMonth]);

  // Filtered and Sorted Users
  const filteredUserStats = useMemo(() => {
    return userStatsList
      .filter((u) => {
        // Role filter
        if (roleFilter === 'OPERATOR' && u.role === 'admin') return false;
        if (roleFilter === 'ADMIN' && u.role !== 'admin') return false;

        // Department filter
        if (selectedDept !== 'ALL' && u.department !== selectedDept) return false;

        // Evaluation filter
        if (evaluationFilter === 'CRITICAL' && u.evaluationStatus !== 'critical_zero') return false;
        if (evaluationFilter === 'WARNING' && u.evaluationStatus !== 'warning_low') return false;
        if (evaluationFilter === 'ACTIVE' && u.totalCount === 0) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = u.name.toLowerCase().includes(q);
          const matchCode = u.userCode.toLowerCase().includes(q);
          const matchDept = u.department.toLowerCase().includes(q);
          if (!matchName && !matchCode && !matchDept) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'LEAST') {
          // Ascending: 0, 1, 2...
          if (a.totalCount !== b.totalCount) {
            return a.totalCount - b.totalCount;
          }
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'MOST') {
          // Descending
          if (a.totalCount !== b.totalCount) {
            return b.totalCount - a.totalCount;
          }
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'NAME') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'DEPT') {
          return a.department.localeCompare(b.department);
        }
        return 0;
      });
  }, [userStatsList, roleFilter, selectedDept, evaluationFilter, searchQuery, sortBy]);

  // Export CSV of Monthly User Evaluation
  const handleExportEvaluationCSV = () => {
    let csv = `LAPORAN EVALUASI KEPATUHAN P2H BULANAN - ${MONTH_NAMES[currentMonth - 1].toUpperCase()} ${currentYear}\n`;
    csv += `PT. PRIMA SARANA TRANSCITY (PST)\n`;
    csv += `Tanggal Unduh: ${new Date().toLocaleDateString('id-ID')}\n\n`;
    csv += `Peringkat,Nama Operator,ID/NIK,Departemen,Peran,Total P2H,Shift 1,Shift 2,Siap Operasi,Perlu Perbaikan,Unit Terakhir,Tanggal Terakhir,Kategori Evaluasi,Rekomendasi Tindakan\n`;

    filteredUserStats.forEach((u, idx) => {
      const escape = (text: string) => `"${(text || '').replace(/"/g, '""')}"`;
      csv += `${idx + 1},${escape(u.name)},${escape(u.userCode)},${escape(u.department)},${escape(u.role)},${u.totalCount},${u.shift1Count},${u.shift2Count},${u.siapOperasiCount},${u.repairCount},${escape(u.lastUnit || '-')},${escape(u.lastDate || '-')},${escape(u.evaluationLabel)},${escape(u.actionRecommendation)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `evaluasi-p2h-user-${currentYear}-${String(currentMonth).padStart(2, '0')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      onMonthChange(12, currentYear - 1);
    } else {
      onMonthChange(currentMonth - 1, currentYear);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      onMonthChange(1, currentYear + 1);
    } else {
      onMonthChange(currentMonth + 1, currentYear);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* Header & Month Navigator Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-700/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase flex items-center gap-2">
                  <span>Grafik & Evaluasi Kepatuhan P2H Bulanan</span>
                </h2>
                <p className="text-xs text-slate-300">
                  Monitoring khusus evaluasi operator & pengemudi yang paling sedikit melakukan inspeksi P2H
                </p>
              </div>
            </div>
          </div>

          {/* Month / Year Navigator & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-800/90 rounded-xl border border-slate-700 p-1 shadow-inner">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                title="Bulan sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-bold text-white px-3 min-w-[130px] text-center font-mono">
                {MONTH_NAMES[currentMonth - 1]} {currentYear}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                title="Bulan berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportEvaluationCSV}
              className="px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 shadow-xs"
              title="Unduh laporan evaluasi format CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Rekap</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Evaluation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Critical - Needs Evaluation */}
        <div className="bg-white p-4 rounded-xl border-2 border-rose-200 bg-rose-50/30 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Perlu Evaluasi Khusus</span>
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-rose-900 font-mono">
                  {kpiMetrics.criticalTotal}
                </span>
                <span className="text-xs text-rose-700 font-medium">User</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
              {kpiMetrics.zeroCount} Nol P2H
            </span>
          </div>

          <div className="mt-2.5 pt-2 border-t border-rose-200/80 text-[11px] text-rose-900">
            {kpiMetrics.lowestUsers.length > 0 ? (
              <div>
                <span className="font-semibold text-rose-950 block">Paling Sedikit:</span>
                <span className="text-[11px] truncate block text-rose-800 mt-0.5">
                  {kpiMetrics.lowestUsers.map((u) => `${u.name} (${u.totalCount})`).join(', ')}
                </span>
              </div>
            ) : (
              <span>Semua operator telah mengisi P2H dengan baik.</span>
            )}
          </div>
        </div>

        {/* Card 2: Total P2H Submissions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Total Form P2H Bulan Ini</span>
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {kpiMetrics.totalSubmissions}
                </span>
                <span className="text-xs text-slate-500 font-medium">Dokumen</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
              Rata-rata {kpiMetrics.avgPerDay} / hari
            </span>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Hari dalam bulan: {daysInMonth} hari</span>
            <span className="font-semibold text-slate-700">
              {kpiMetrics.activeCount} dari {kpiMetrics.totalUsers} aktif
            </span>
          </div>
        </div>

        {/* Card 3: Top Performer (Most Disciplined) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>Operator Terdisiplin</span>
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-base font-bold text-slate-900 truncate max-w-[160px] block">
                  {kpiMetrics.topUser ? kpiMetrics.topUser.name : '-'}
                </span>
              </div>
            </div>
            {kpiMetrics.topUser && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                {kpiMetrics.topUser.totalCount} P2H
              </span>
            )}
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Dept: {kpiMetrics.topUser?.department || '-'}</span>
            <span className="text-emerald-700 font-medium">Kepatuhan Tinggi</span>
          </div>
        </div>

        {/* Card 4: Kesiapan Unit */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tingkat Kepatuhan User</span>
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {kpiMetrics.totalUsers > 0
                    ? Math.round((kpiMetrics.activeCount / kpiMetrics.totalUsers) * 100)
                    : 0}
                  %
                </span>
                <span className="text-xs text-slate-500 font-medium">Partisipasi</span>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                kpiMetrics.zeroCount === 0
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              {kpiMetrics.zeroCount === 0 ? 'Lengkap' : `${kpiMetrics.zeroCount} Pasif`}
            </span>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Bulan: {MONTH_NAMES[currentMonth - 1]}</span>
            <span className="font-semibold text-slate-700">Target Harian Site</span>
          </div>
        </div>
      </div>

      {/* View Mode Switcher Tabs */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('chart')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'chart'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
            <span>Grafik Peringkat Kepatuhan User</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trend')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'trend'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            <span>Grafik Tren Harian ({daysInMonth} Hari)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('table')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'table'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-600" />
            <span>Tabel Evaluasi & Rekomendasi</span>
          </button>
        </div>

        {/* Priority Filter Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 hidden sm:inline">Prioritas Evaluasi:</span>
          <button
            type="button"
            onClick={() => {
              setSortBy('LEAST');
              setEvaluationFilter('CRITICAL');
            }}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
              sortBy === 'LEAST' && evaluationFilter === 'CRITICAL'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>User 0 P2H ({kpiMetrics.zeroCount})</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama operator, NIK/ID, atau departemen..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Sort Order */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              <span className="text-[10px] font-bold text-slate-400 px-1 uppercase">Urutan:</span>
              <button
                type="button"
                onClick={() => setSortBy('LEAST')}
                className={`px-2 py-1 rounded font-bold transition-colors ${
                  sortBy === 'LEAST'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilkan yang paling sedikit melakukan P2H di urutan teratas (Prioritas Evaluasi)"
              >
                Paling Sedikit (Evaluasi)
              </button>
              <button
                type="button"
                onClick={() => setSortBy('MOST')}
                className={`px-2 py-1 rounded font-bold transition-colors ${
                  sortBy === 'MOST'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Paling Banyak
              </button>
            </div>

            {/* Department Filter */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Semua Departemen ({userStatsList.length})</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={evaluationFilter}
              onChange={(e) => setEvaluationFilter(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Semua Status Evaluasi</option>
              <option value="CRITICAL">Belum Pernah (0 P2H)</option>
              <option value="WARNING">Kepatuhan Rendah (1-3 P2H)</option>
              <option value="ACTIVE">Aktif (&gt; 0 P2H)</option>
            </select>
          </div>
        </div>
      </div>

      {/* TAB 1: CHART VIEW (Horizontal Bar Ranking Chart) */}
      {activeTab === 'chart' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span>Grafik Distribusi Kepatuhan P2H Per Operator ({MONTH_NAMES[currentMonth - 1]} {currentYear})</span>
              </h3>
              <p className="text-xs text-slate-500">
                {sortBy === 'LEAST'
                  ? 'Urutan: Operator dengan jumlah P2H paling sedikit ditampilkan di atas untuk prioritas evaluasi pembinaan.'
                  : 'Urutan: Operator dengan jumlah P2H terbanyak ditampilkan di atas.'}
              </p>
            </div>

            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md self-start sm:self-auto font-mono">
              Menampilkan {filteredUserStats.length} user
            </span>
          </div>

          {filteredUserStats.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium">Tidak ada data user yang sesuai dengan filter pencarian.</p>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {filteredUserStats.map((stat, index) => {
                const percent = Math.min(100, Math.round((stat.totalCount / maxUserP2HCount) * 100));
                const isZero = stat.totalCount === 0;
                const isLow = stat.totalCount > 0 && stat.totalCount <= 3;

                return (
                  <div
                    key={stat.userId || stat.userCode || stat.name}
                    className={`p-3 rounded-xl border transition-all ${
                      isZero
                        ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                        : isLow
                        ? 'bg-amber-50/30 border-amber-200 hover:border-amber-300'
                        : 'bg-white border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {/* User Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Rank Badge */}
                        <span
                          className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 font-mono ${
                            isZero
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {index + 1}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                              {stat.name}
                            </span>
                            <span className="font-mono text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {stat.userCode}
                            </span>
                            {stat.role === 'admin' && (
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <span>{stat.department}</span>
                            </span>
                            <span>•</span>
                            <span>
                              {stat.lastDate
                                ? `Terakhir: ${stat.lastDate} (${stat.lastUnit || 'Unit'})`
                                : 'Belum pernah inspeksi bulan ini'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right count and status */}
                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 font-mono ${
                            isZero
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : isLow
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : stat.totalCount > 15
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {isZero ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          ) : isLow ? (
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span>{stat.totalCount} P2H</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => setSelectedUserDetail(stat)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                        >
                          Detail
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar Visualization */}
                    <div className="space-y-1">
                      <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200/80">
                        {isZero ? (
                          <div className="w-full h-full bg-rose-200/50 rounded-full flex items-center justify-center">
                            <span className="text-[9px] font-bold text-rose-700 tracking-wider uppercase">
                              Nol Form Pengisian
                            </span>
                          </div>
                        ) : (
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isLow
                                ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                                : stat.totalCount > 15
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                            }`}
                            style={{ width: `${Math.max(percent, 8)}%` }}
                          />
                        )}
                      </div>

                      {/* Bar metadata info */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-medium text-slate-600">
                          {isZero ? (
                            <span className="text-rose-600 font-bold">
                              Perlu Evaluasi: Operator belum melakukan pemeriksaan P2H sama sekali bulan ini.
                            </span>
                          ) : isLow ? (
                            <span className="text-amber-700 font-medium">
                              Kepatuhan rendah: Hanya {stat.totalCount} kali inspeksi dalam {daysInMonth} hari.
                            </span>
                          ) : (
                            <span>
                              Shift 1: {stat.shift1Count} | Shift 2: {stat.shift2Count} | Siap Operasi: {stat.siapOperasiCount}
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-slate-400 font-semibold">
                          {percent}% dari max ({maxUserP2HCount} form)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DAILY TREND VIEW (Day 1 to 31 timeline) */}
      {activeTab === 'trend' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>Grafik Tren Pengisian P2H Harian ({MONTH_NAMES[currentMonth - 1]} {currentYear})</span>
              </h3>
              <p className="text-xs text-slate-500">
                Aktivitas pemeriksaan harian dari tanggal 1 hingga {daysInMonth}.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-blue-700">
                <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block" />
                <span>Shift 1 (Siang)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-indigo-700">
                <span className="w-3 h-3 rounded-xs bg-indigo-600 inline-block" />
                <span>Shift 2 (Malam)</span>
              </span>
            </div>
          </div>

          {/* Daily Bar Chart Visual */}
          <div className="pt-4 overflow-x-auto">
            <div className="min-w-[680px]">
              {/* Bars container */}
              <div className="h-56 flex items-end gap-1.5 border-b border-slate-200 px-2 pb-1">
                {dailyStats.map((item) => {
                  const heightPercent = item.total > 0 ? Math.max((item.total / maxDailyCount) * 100, 10) : 4;
                  const isZero = item.total === 0;

                  return (
                    <div
                      key={item.day}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 bg-slate-900 text-white text-[10px] rounded px-2 py-1 shadow-lg pointer-events-none whitespace-nowrap">
                        <div className="font-bold font-mono">Tgl {item.day}: {item.total} P2H</div>
                        <div className="text-slate-300">S1: {item.shift1} | S2: {item.shift2}</div>
                      </div>

                      {/* Number count above bar */}
                      <span
                        className={`text-[9px] font-mono font-bold mb-1 ${
                          isZero ? 'text-rose-400' : 'text-slate-700'
                        }`}
                      >
                        {item.total}
                      </span>

                      {/* The Bar */}
                      <div
                        className={`w-full rounded-t-sm transition-all flex flex-col justify-end overflow-hidden ${
                          isZero
                            ? 'bg-rose-100 border-t-2 border-rose-300'
                            : 'bg-blue-600 group-hover:bg-blue-500'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      >
                        {item.shift2 > 0 && (
                          <div
                            className="w-full bg-indigo-600"
                            style={{ height: `${(item.shift2 / item.total) * 100}%` }}
                            title={`Shift 2: ${item.shift2}`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Day Labels */}
              <div className="flex items-center gap-1.5 px-2 pt-2 text-[10px] text-slate-500 font-mono">
                {dailyStats.map((item) => (
                  <div key={`label-${item.day}`} className="flex-1 text-center">
                    <span className={item.total === 0 ? 'text-rose-500 font-bold' : ''}>
                      {item.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-slate-400" />
              <span>
                Total pengisian bulan ini: <strong>{kpiMetrics.totalSubmissions} form</strong>. Puncak aktivitas:{' '}
                <strong>{maxDailyCount} form/hari</strong>.
              </span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Periode {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </span>
          </div>
        </div>
      )}

      {/* TAB 3: TABLE EVALUATION & ACTION RECOMMENDATIONS */}
      {activeTab === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>Tabel Rekapitulasi Evaluasi Kedisiplinan P2H ({MONTH_NAMES[currentMonth - 1]} {currentYear})</span>
              </h3>
              <p className="text-xs text-slate-500">
                Matriks evaluasi kinerja kepatuhan K3 per personil untuk bahan rapat supervisi & audit internal.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportEvaluationCSV}
              className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Tabel CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <th className="py-2.5 px-3 w-12 text-center">No</th>
                  <th className="py-2.5 px-3">Nama Operator / PIC</th>
                  <th className="py-2.5 px-3">ID / NIK</th>
                  <th className="py-2.5 px-3">Departemen</th>
                  <th className="py-2.5 px-3 text-center">Total P2H</th>
                  <th className="py-2.5 px-3">Inspeksi Terakhir</th>
                  <th className="py-2.5 px-3">Status Kepatuhan</th>
                  <th className="py-2.5 px-3">Rekomendasi Tindakan</th>
                  <th className="py-2.5 px-3 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUserStats.map((stat, idx) => {
                  const isZero = stat.totalCount === 0;
                  const isLow = stat.totalCount > 0 && stat.totalCount <= 3;

                  return (
                    <tr
                      key={stat.userId || stat.userCode}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isZero ? 'bg-rose-50/40' : isLow ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500 font-semibold">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 block">{stat.name}</span>
                        {stat.role === 'admin' && (
                          <span className="text-[10px] text-purple-700 font-semibold">Administrator</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-600">
                        {stat.userCode}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {stat.department}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-xs inline-block ${
                            isZero
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {stat.totalCount}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {stat.lastDate ? (
                          <div>
                            <span className="font-medium text-slate-900 block font-mono text-[11px]">
                              {stat.lastDate}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Unit: {stat.lastUnit || '-'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-rose-600 font-semibold text-[11px]">Belum Ada</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isZero
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : isLow
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {isZero ? (
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                          ) : isLow ? (
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          )}
                          <span>{stat.evaluationLabel}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-600 max-w-xs">
                        <span className={isZero ? 'text-rose-900 font-medium' : ''}>
                          {stat.actionRecommendation}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedUserDetail(stat)}
                          className="px-2 py-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL / DRAWER: DETAIL P2H USER */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Detail Kepatuhan: {selectedUserDetail.name}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  ID: {selectedUserDetail.userCode} · Dept: {selectedUserDetail.department}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total P2H</span>
                  <span className="text-xl font-black text-slate-900 font-mono">
                    {selectedUserDetail.totalCount}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Shift 1 / 2</span>
                  <span className="text-sm font-bold text-slate-900 font-mono mt-1 block">
                    {selectedUserDetail.shift1Count} / {selectedUserDetail.shift2Count}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Siap Operasi</span>
                  <span className="text-sm font-bold text-emerald-700 font-mono mt-1 block">
                    {selectedUserDetail.siapOperasiCount}
                  </span>
                </div>
              </div>

              {/* Status and Recommendation */}
              <div
                className={`p-3.5 rounded-xl border text-xs ${
                  selectedUserDetail.totalCount === 0
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : selectedUserDetail.totalCount <= 3
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  {selectedUserDetail.totalCount === 0 ? (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  ) : (
                    <Info className="w-4 h-4 text-emerald-600" />
                  )}
                  <span>Status Evaluasi: {selectedUserDetail.evaluationLabel}</span>
                </div>
                <p className="text-[11px]">{selectedUserDetail.actionRecommendation}</p>
              </div>

              {/* List of inspections this month */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                  <span>Daftar Riwayat Inspeksi ({MONTH_NAMES[currentMonth - 1]} {currentYear}):</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {selectedUserDetail.records.length} rekaman ditemukan
                  </span>
                </h4>

                {selectedUserDetail.records.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                    Tidak ada rekaman inspeksi yang dilakukan oleh operator ini pada bulan{' '}
                    {MONTH_NAMES[currentMonth - 1]} {currentYear}.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedUserDetail.records.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{rec.unitName}</span>
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {rec.date}
                            </span>
                            <span className="text-[10px] text-slate-600">{rec.shift}</span>
                          </div>
                          <span
                            className={`text-[10px] font-semibold mt-0.5 block ${
                              rec.status === 'siap_operasi'
                                ? 'text-emerald-700'
                                : rec.status === 'stop_operasi'
                                ? 'text-rose-700'
                                : 'text-amber-700'
                            }`}
                          >
                            Status: {rec.status.toUpperCase().replace('_', ' ')}
                          </span>
                        </div>

                        {onOpenP2H && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenP2H(rec);
                              setSelectedUserDetail(null);
                            }}
                            className="px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Lihat Form</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
