import React, { useState, useMemo } from 'react';
import { P2HRecord } from '../types/p2h';
import { AppUser } from '../types/auth';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Printer,
  PenTool,
  Trash2,
  Edit,
  Clock,
  Filter,
  Car,
  UserCheck,
  FileText,
  ShieldAlert,
  Crown,
  Truck,
  User,
  Plus,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';

interface P2HHistoryListProps {
  records: P2HRecord[];
  currentUser: AppUser | null;
  onOpenRecord: (record: P2HRecord) => void;
  onPrintRecord: (record: P2HRecord) => void;
  onForemanSign: (record: P2HRecord) => void;
  onDeleteRecord: (id: string) => void;
  onDeleteMultipleRecords?: (ids: string[]) => void;
  onClearAllDummyRecords?: () => void;
  onNewForm: () => void;
}

export const P2HHistoryList: React.FC<P2HHistoryListProps> = ({
  records,
  currentUser,
  onOpenRecord,
  onPrintRecord,
  onForemanSign,
  onDeleteRecord,
  onDeleteMultipleRecords,
  onClearAllDummyRecords,
  onNewForm,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'siap_operasi' | 'perlu_perbaikan' | 'stop_operasi' | 'pending_foreman'
  >('ALL');
  const [operatorFilter, setOperatorFilter] = useState<string>('ALL');

  // In-app interactive confirmation dialogs (avoids window.confirm iframe blockers)
  const [recordToDelete, setRecordToDelete] = useState<P2HRecord | null>(null);
  const [isClearDummyModalOpen, setIsClearDummyModalOpen] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  // 1. Base scoping: regular user ONLY sees records they authored / inspected!
  const userScopedRecords = useMemo(() => {
    if (!currentUser || isAdmin) {
      return records;
    }

    return records.filter((r) => {
      // Check userId
      if (r.userId && r.userId === currentUser.id) return true;
      // Check unique userCode
      if (
        r.userCode &&
        r.userCode.trim().toUpperCase() === currentUser.userCode.trim().toUpperCase()
      ) {
        return true;
      }
      // Check operatorName fallback
      if (
        r.operatorName &&
        r.operatorName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()
      ) {
        return true;
      }
      return false;
    });
  }, [records, currentUser, isAdmin]);

  // Extract distinct operators for Admin filtering
  const distinctOperators = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach((r) => {
      const code = r.userCode || 'OPR';
      const key = `${r.operatorName} (${code})`;
      map.set(r.operatorName, key);
    });
    return Array.from(map.entries());
  }, [records]);

  // Metrics computed based on current user's visible records
  const totalCount = userScopedRecords.length;
  const readyCount = userScopedRecords.filter((r) => r.status === 'siap_operasi' && r.unitConditionStatus !== 'BD').length;
  const warningCount = userScopedRecords.filter((r) => r.status === 'perlu_perbaikan' && r.unitConditionStatus !== 'BD').length;
  const stopCount = userScopedRecords.filter((r) => r.status === 'stop_operasi' || r.unitConditionStatus === 'BD').length;
  const pendingForemanCount = userScopedRecords.filter((r) => !r.foremanSignature).length;

  // Filtered based on search, status filter, and optional admin operator filter
  const filteredRecords = useMemo(() => {
    return userScopedRecords.filter((r) => {
      // Admin operator filter
      if (isAdmin && operatorFilter !== 'ALL') {
        if (r.operatorName !== operatorFilter) {
          return false;
        }
      }

      // Search query
      const matchSearch =
        r.unitName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.operatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.unitType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.date.includes(searchTerm) ||
        (r.userCode && r.userCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.documentNo && r.documentNo.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      // Status Filter
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'pending_foreman') return !r.foremanSignature;
      if (statusFilter === 'stop_operasi') return r.status === 'stop_operasi' || r.unitConditionStatus === 'BD';
      return r.status === statusFilter && r.unitConditionStatus !== 'BD';
    });
  }, [userScopedRecords, searchTerm, statusFilter, operatorFilter, isAdmin]);

  // Detect demo / dummy records (for admin cleanup action)
  const dummyRecords = useMemo(() => {
    const dummyDefaultIds = ['p2h-demo-01', 'p2h-demo-02', 'p2h-demo-03'];
    return records.filter(
      (r) =>
        dummyDefaultIds.includes(r.id) ||
        r.id.includes('demo') ||
        r.documentNo?.startsWith('P2H-2026-00')
    );
  }, [records]);

  // Toggle selection for batch delete
  const toggleSelectRecord = (id: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedRecordIds.length === filteredRecords.length && filteredRecords.length > 0) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(filteredRecords.map((r) => r.id));
    }
  };

  const handleConfirmBatchDelete = () => {
    if (selectedRecordIds.length === 0) return;
    if (onDeleteMultipleRecords) {
      onDeleteMultipleRecords(selectedRecordIds);
    } else {
      selectedRecordIds.forEach((id) => onDeleteRecord(id));
    }
    setSelectedRecordIds([]);
    setIsBatchDeleteModalOpen(false);
  };

  const handleConfirmClearDummy = () => {
    if (onClearAllDummyRecords) {
      onClearAllDummyRecords();
    } else {
      dummyRecords.forEach((r) => onDeleteRecord(r.id));
    }
    setIsClearDummyModalOpen(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Role Scoping Banner */}
      {currentUser && (
        <div
          className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
            isAdmin
              ? 'bg-purple-950/10 border-purple-500/30 text-purple-950'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black shrink-0 text-white ${
                isAdmin ? 'bg-purple-700' : 'bg-amber-600'
              }`}
            >
              {isAdmin ? <Crown className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-900">
                  {isAdmin ? 'Mode Admin (Full Access)' : `Riwayat Pemeriksaan: ${currentUser.name}`}
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    isAdmin
                      ? 'bg-purple-200 text-purple-900 border border-purple-300'
                      : 'bg-amber-200 text-amber-900 border border-amber-300'
                  }`}
                >
                  ID: {currentUser.userCode}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${
                    isAdmin ? 'bg-purple-700' : 'bg-amber-700'
                  }`}
                >
                  {isAdmin ? 'ADMIN' : 'OPERATOR'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {isAdmin
                  ? 'Menampilkan seluruh riwayat P2H dari seluruh operator unit di site tambang.'
                  : `Hanya menampilkan riwayat unit yang Anda periksa secara pribadi (${totalCount} dokumen). Riwayat operator lain diproteksi.`}
              </p>
            </div>
          </div>

          {!isAdmin && (
            <button
              type="button"
              onClick={onNewForm}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-auto shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Isi Form Unit Saya</span>
            </button>
          )}
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`p-3 sm:p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'ALL'
              ? 'bg-white border-slate-900 shadow-sm ring-1 ring-slate-900'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>{isAdmin ? 'Total P2H Seluruh' : 'Total P2H Saya'}</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {totalCount}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400">
            {isAdmin ? 'Semua operator' : 'Dokumen Anda'}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('siap_operasi')}
          className={`p-3 sm:p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'siap_operasi'
              ? 'bg-emerald-50/50 border-emerald-600 shadow-sm ring-1 ring-emerald-600'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-700 mb-1">
            <span>Siap Operasi</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-800 tabular-nums">
            {readyCount}
          </div>
          <span className="text-[10px] sm:text-[11px] text-emerald-600">Kondisi normal</span>
        </button>

        <button
          onClick={() => setStatusFilter('stop_operasi')}
          className={`p-3 sm:p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'stop_operasi'
              ? 'bg-rose-50/60 border-rose-600 shadow-sm ring-1 ring-rose-600'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-rose-700 mb-1">
            <span>Tidak Layak Operasi</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-700 tabular-nums">
            {stopCount}
          </div>
          <span className="text-[10px] sm:text-[11px] text-rose-600">B/D & Kode AA</span>
        </button>

        <button
          onClick={() => setStatusFilter('pending_foreman')}
          className={`p-3 sm:p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'pending_foreman'
              ? 'bg-amber-50/50 border-amber-600 shadow-sm ring-1 ring-amber-600'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-800 mb-1">
            <span>Butuh TTD</span>
            <PenTool className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-900 tabular-nums">
            {pendingForemanCount}
          </div>
          <span className="text-[10px] sm:text-[11px] text-amber-700">Paraf atasan</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3">
        {/* Search & Admin Operator Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari Unit, Operator, atau No. P2H..."
              className="w-full pl-9 pr-3.5 py-2 text-base sm:text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 bg-slate-50/50"
            />
          </div>

          {/* Admin-only Operator Dropdown Filter */}
          {isAdmin && distinctOperators.length > 0 && (
            <div className="w-full sm:w-auto">
              <select
                value={operatorFilter}
                onChange={(e) => setOperatorFilter(e.target.value)}
                className="w-full sm:w-48 py-2 px-2.5 text-xs font-semibold rounded-lg border border-purple-300 bg-purple-50/50 text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500"
                title="Filter berdasarkan Operator / User"
              >
                <option value="ALL">Semua Operator ({records.length})</option>
                {distinctOperators.map(([name, label]) => (
                  <option key={name} value={name}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none pb-0.5">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setStatusFilter('siap_operasi')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'siap_operasi'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            Siap Operasi ({readyCount})
          </button>
          <button
            onClick={() => setStatusFilter('perlu_perbaikan')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'perlu_perbaikan'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            Kode A ({warningCount})
          </button>
          <button
            onClick={() => setStatusFilter('stop_operasi')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'stop_operasi'
                ? 'bg-rose-600 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            Tidak Layak Operasi ({stopCount})
          </button>
          <button
            onClick={() => setStatusFilter('pending_foreman')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'pending_foreman'
                ? 'bg-indigo-600 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            Butuh TTD ({pendingForemanCount})
          </button>
        </div>
      </div>

      {/* Admin Batch Actions & Dummy Cleaner Bar */}
      {isAdmin && (
        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {filteredRecords.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                title="Pilih semua dokumen yang tampil"
              >
                {selectedRecordIds.length === filteredRecords.length && filteredRecords.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-amber-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>
                  {selectedRecordIds.length === filteredRecords.length && filteredRecords.length > 0
                    ? 'Batal Pilih Semua'
                    : 'Pilih Semua'}
                </span>
              </button>
            )}

            {selectedRecordIds.length > 0 && (
              <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300">
                {selectedRecordIds.length} dipilih
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Batch delete button */}
            {selectedRecordIds.length > 0 && (
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(true)}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus {selectedRecordIds.length} Dokumen Terpilih</span>
              </button>
            )}

            {/* Clear All Dummy records quick button */}
            {dummyRecords.length > 0 && (
              <button
                type="button"
                onClick={() => setIsClearDummyModalOpen(true)}
                className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                title="Bersihkan 3 data simulasi/dummy awal bawaan sistem"
              >
                <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                <span>Bersihkan Data Dummy ({dummyRecords.length})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Record Cards */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h4 className="text-sm font-bold text-slate-800">
            {!isAdmin
              ? 'Belum ada riwayat P2H untuk unit yang Anda periksa'
              : 'Tidak ada dokumen P2H ditemukan'}
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
            {!isAdmin
              ? `Akun Anda (${currentUser?.name} · ${currentUser?.userCode}) belum memiliki arsip inspeksi. Formulir P2H yang Anda kirim akan otomatis muncul di sini.`
              : searchTerm || statusFilter !== 'ALL' || operatorFilter !== 'ALL'
              ? 'Tidak ada data yang sesuai dengan kata kunci pencarian atau filter yang dipilih.'
              : 'Belum ada formulir pemeriksaan P2H yang dibuat. Mulai pengisian form baru sekarang.'}
          </p>
          <button
            type="button"
            onClick={onNewForm}
            className="mt-4 px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Buat Form P2H Baru</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((r) => {
            const isBD = r.unitConditionStatus === 'BD';
            const isStop = r.status === 'stop_operasi' || isBD;
            const isWarning = !isBD && r.status === 'perlu_perbaikan';
            const isReady = !isBD && r.status === 'siap_operasi';
            const hasForemanSign = !!r.foremanSignature;

            return (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
              >
                <div>
                  {/* Card Header */}
                  <div
                    className={`px-3.5 sm:px-4 py-2.5 sm:py-3 border-b flex items-center justify-between ${
                      isStop
                        ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                        : isWarning
                        ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isAdmin && (
                        <input
                          type="checkbox"
                          checked={selectedRecordIds.includes(r.id)}
                          onChange={() => toggleSelectRecord(r.id)}
                          className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer shrink-0"
                          title="Pilih dokumen untuk tindakan massal"
                        />
                      )}
                      <Car className="w-4 h-4 text-slate-600 shrink-0" />
                      <div className="truncate">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {r.unitName}
                        </span>
                        <span className="text-[11px] text-slate-500 ml-1.5">
                          ({r.unitType})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                          r.unitConditionStatus === 'BD'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : r.unitConditionStatus === 'BU'
                            ? 'bg-yellow-100 text-amber-900 border border-amber-300'
                            : r.unitConditionStatus === 'STANDBY'
                            ? 'bg-orange-100 text-orange-950 border border-orange-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {r.unitConditionStatus || 'RFU'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          isStop
                            ? 'bg-rose-600 text-white'
                            : isWarning
                            ? 'bg-amber-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {isBD
                          ? 'TIDAK LAYAK (B/D)'
                          : isStop
                          ? 'TIDAK LAYAK OPERASI'
                          : isWarning
                          ? 'PERBAIKAN'
                          : 'SIAP OPERASI'}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5 sm:p-4 space-y-2 text-xs text-slate-700">
                    {/* Operator & User Code Indicator */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <span className="text-slate-400">Pemeriksa / Operator:</span>
                      <div className="flex items-center gap-1.5 truncate ml-2">
                        <span className="font-bold text-slate-900 truncate">
                          {r.operatorName}
                        </span>
                        <span className="font-mono text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-300 shrink-0">
                          {r.userCode || 'OPR'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Tanggal / Shift:</span>
                      <span className="font-medium text-slate-900 truncate ml-2">
                        {r.date} · {r.shift}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Kesiapan Unit:</span>
                      <span className="font-semibold text-slate-900 ml-2">
                        {r.unitConditionStatus === 'BD' ? (
                          <span className="text-rose-600 font-bold">BD (Breakdown - Tidak Layak Operasi)</span>
                        ) : r.unitConditionStatus === 'BU' ? (
                          <span className="text-amber-700 font-bold">BU (Backup Unit)</span>
                        ) : r.unitConditionStatus === 'STANDBY' ? (
                          <span className="text-orange-700 font-bold">Standby Unit</span>
                        ) : (
                          <span className="text-emerald-700 font-bold">RFU (Ready For Use)</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">KM / HM Unit:</span>
                      <span className="font-mono font-bold text-slate-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {r.kmHm}
                      </span>
                    </div>

                    {/* Signatures status indicator */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1 text-slate-500">
                        <span>TTD Operator:</span>
                        {r.operatorSignature ? (
                          <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ada
                          </span>
                        ) : (
                          <span className="text-slate-400">Belum</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-slate-500">
                        <span>TTD Foreman:</span>
                        {hasForemanSign ? (
                          <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Lengkap
                          </span>
                        ) : (
                          <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="px-3.5 sm:px-4 py-2.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenRecord(r)}
                      className="h-8 w-8 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors active:scale-95"
                      title="Buka / Edit Form"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {/* Only allow deleting if Admin or if author */}
                    {(isAdmin || r.userId === currentUser?.id || r.userCode === currentUser?.userCode) && (
                      <button
                        type="button"
                        onClick={() => setRecordToDelete(r)}
                        className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors active:scale-95 cursor-pointer"
                        title="Hapus Rekaman P2H"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Foreman Sign button: Only accessible for Admin / Supervisor */}
                    {!hasForemanSign && isAdmin && (
                      <button
                        type="button"
                        onClick={() => onForemanSign(r)}
                        className="h-8 px-2.5 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer text-purple-950 bg-purple-300 hover:bg-purple-200 border border-purple-400"
                        title="Tanda tangan pengesahan Foreman / Pengawas"
                      >
                        <PenTool className="w-3 h-3" />
                        <span>Paraf Foreman</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onPrintRecord(r)}
                      className="h-8 px-2.5 text-[11px] font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                    >
                      <Printer className="w-3 h-3 text-slate-600" />
                      <span>Cetak PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Single Record Delete Confirmation */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Hapus Dokumen P2H?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Dokumen pemeriksaan P2H ini akan dihapus secara permanen dari sistem.
              </p>

              {/* Record Summary Box */}
              <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Unit Kendaraan:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {recordToDelete.unitName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Tipe / Model:</span>
                  <span className="text-slate-700 truncate max-w-[200px]">
                    {recordToDelete.unitType}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Nomor Dokumen:</span>
                  <span className="font-mono text-slate-700 font-semibold">
                    {recordToDelete.documentNo || recordToDelete.id}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Pemeriksa / Opr:</span>
                  <span className="font-semibold text-slate-800">
                    {recordToDelete.operatorName} ({recordToDelete.userCode || 'OPR'})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Tanggal / Shift:</span>
                  <span className="text-slate-700">
                    {recordToDelete.date} · {recordToDelete.shift}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="text-slate-400">Kondisi Kesiapan:</span>
                  <span className="font-bold uppercase text-slate-900">
                    {recordToDelete.unitConditionStatus || 'RFU'} ·{' '}
                    {recordToDelete.status === 'siap_operasi'
                      ? 'Siap Operasi'
                      : recordToDelete.status === 'stop_operasi'
                      ? 'Stop Operasi'
                      : 'Perlu Perbaikan'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => setRecordToDelete(null)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = recordToDelete.id;
                    setRecordToDelete(null);
                    onDeleteRecord(id);
                  }}
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
                >
                  Ya, Hapus Dokumen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Clear All Dummy Records Confirmation */}
      {isClearDummyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Bersihkan Semua Data Dummy?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Tindakan ini akan menghapus {dummyRecords.length} rekaman dummy/simulasi awal
                sehingga daftar riwayat bersih dan hanya menampilkan pengisian riil Anda.
              </p>

              <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-left space-y-1.5 text-xs max-h-48 overflow-y-auto">
                <span className="font-bold text-amber-950 block text-[11px] uppercase tracking-wider">
                  Daftar data dummy yang akan dibersihkan:
                </span>
                {dummyRecords.map((d) => (
                  <div
                    key={d.id}
                    className="flex justify-between items-center text-amber-900 font-mono text-[11px] py-1 border-b border-amber-200/60 last:border-0"
                  >
                    <span className="font-bold">{d.unitName}</span>
                    <span className="text-[10px] text-amber-700">{d.operatorName} · {d.date}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => setIsClearDummyModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearDummy}
                  className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
                >
                  Ya, Bersihkan Data Dummy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Batch Delete Selected Records Confirmation */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Hapus {selectedRecordIds.length} Dokumen Terpilih?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Tindakan ini akan menghapus {selectedRecordIds.length} dokumen P2H terpilih secara permanen dari server database.
              </p>

              <div className="grid grid-cols-2 gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => setIsBatchDeleteModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBatchDelete}
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
                >
                  Ya, Hapus {selectedRecordIds.length} Dokumen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
