import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  ShieldCheck,
  Crown,
  HardHat,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  X,
  RefreshCw,
  AlertTriangle,
  Building2,
  Mail,
  UserCheck,
  ClipboardList,
  Sparkles,
  Info,
} from 'lucide-react';
import { AppUser, UserRole } from '../types/auth';
import { P2HRecord } from '../types/p2h';
import {
  subscribeToUsers,
  getLocalUsers,
  updateUserOnline,
  deleteUserOnline,
  resetUserPinOnline,
  registerNewUser,
  generateUniqueCode,
  isUserCodeTaken,
} from '../utils/authStorage';

interface UserManagementProps {
  currentUser: AppUser;
  p2hRecords: P2HRecord[];
  onToast: (msg: string) => void;
}

const DEPARTMENTS = [
  'HCGS',
  'PRODUKSI',
  'PLANT',
  'SHE / Pengawas K3',
  'DPM',
  'LOGISTIK',
  'HRGA',
  'ENGINEERING',
  'MANAGEMENT',
  'OPERASIONAL UMUM',
];

export const UserManagement: React.FC<UserManagementProps> = ({
  currentUser,
  p2hRecords,
  onToast,
}) => {
  const [users, setUsers] = useState<AppUser[]>(() => getLocalUsers());
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [resetPinTarget, setResetPinTarget] = useState<AppUser | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<AppUser | null>(null);

  // UI helpers
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Subscribe to live user updates
  useEffect(() => {
    const unsub = subscribeToUsers((updatedUsers) => {
      setUsers(updatedUsers);
    });
    return () => unsub();
  }, []);

  // Compute P2H counts per user
  const userP2HCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    p2hRecords.forEach((r) => {
      if (r.userId) {
        map[r.userId] = (map[r.userId] || 0) + 1;
      }
      if (r.userCode) {
        const cleanCode = r.userCode.trim().toUpperCase();
        map[cleanCode] = (map[cleanCode] || 0) + 1;
      }
    });
    return map;
  }, [p2hRecords]);

  const getUserP2HCount = (user: AppUser): number => {
    const byId = user.id ? userP2HCountMap[user.id] || 0 : 0;
    const byCode = user.userCode ? userP2HCountMap[user.userCode.trim().toUpperCase()] || 0 : 0;
    return Math.max(byId, byCode);
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.userCode.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.department && u.department.toLowerCase().includes(q));

      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchDept = deptFilter === 'all' || u.department === deptFilter;

      return matchSearch && matchRole && matchDept;
    });
  }, [users, searchQuery, roleFilter, deptFilter]);

  // Statistics
  const totalUsers = users.length;
  const adminUsersCount = users.filter((u) => u.role === 'admin').length;
  const operatorUsersCount = users.filter((u) => u.role === 'user').length;
  const withPinCount = users.filter((u) => u.pin && u.pin.trim().length > 0).length;

  const togglePinReveal = (userId: string) => {
    setRevealedPins((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const copyCredentials = (user: AppUser) => {
    const text = `*AKUN P2H ONLINE PT. PST*\nNama: ${user.name}\nID / Kode User: ${user.userCode}\nRole: ${
      user.role === 'admin' ? 'Administrator' : 'Operator P2H'
    }\nPIN / Sandi: ${user.pin || 'Belum diatur'}\nDepartemen: ${user.department || '-'}`;

    navigator.clipboard.writeText(text);
    setCopiedId(user.id);
    onToast(`Info kredensial ${user.name} berhasil disalin ke clipboard!`);
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmTarget) return;
    try {
      await deleteUserOnline(deleteConfirmTarget.id);
      onToast(`Akun user ${deleteConfirmTarget.name} (${deleteConfirmTarget.userCode}) berhasil dihapus.`);
      setDeleteConfirmTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onToast(`Gagal menghapus user: ${msg}`);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Kelola Data & Hak Akses User</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-200">
                  Khusus Admin
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Manajemen akun operator, pengaturan ID unik & reset PIN password saat user lupa akun
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Tambah User Baru</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Total User</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalUsers}</span>
            <span className="text-[11px] text-slate-500">Akun terdaftar</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Operator P2H</span>
            <HardHat className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">{operatorUsersCount}</span>
            <span className="text-[11px] text-slate-500">Driver / Kru</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Administrator</span>
            <Crown className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-600">{adminUsersCount}</span>
            <span className="text-[11px] text-slate-500">Pengawas K3/SHE</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">PIN Terpasang</span>
            <KeyRound className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{withPinCount}</span>
            <span className="text-[11px] text-slate-500">Akun aman PIN</span>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari user (nama, ID e.g. OPR-102, email, departemen)..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'all' | 'admin' | 'user')}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">Semua Peran</option>
            <option value="user">Operator P2H</option>
            <option value="admin">Administrator</option>
          </select>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">Semua Departemen</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {(searchQuery || roleFilter !== 'all' || deptFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('all');
                setDeptFilter('all');
              }}
              className="px-2.5 py-2 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
              title="Reset Filter"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Users Table List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <div className="font-bold flex items-center gap-2">
            <span>Daftar Akun Pengguna</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono text-[11px]">
              {filteredUsers.length} user
            </span>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Klik ikon mata pada PIN untuk melihat kata sandi pengguna
          </span>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600 text-sm">Tidak ada user ditemukan</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Silakan sesuaikan kata kunci pencarian atau filter yang dipilih.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-600 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-4 py-3">Nama & Kredensial</th>
                  <th className="px-4 py-3">NRP / NIK</th>
                  <th className="px-4 py-3">Peran (Role)</th>
                  <th className="px-4 py-3">Departemen</th>
                  <th className="px-4 py-3">PIN / Password</th>
                  <th className="px-4 py-3 text-center">Aktivitas P2H</th>
                  <th className="px-4 py-3 text-right">Aksi Kelola</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {filteredUsers.map((user) => {
                  const isCurrent = user.id === currentUser.id;
                  const isPinRevealed = !!revealedPins[user.id];
                  const p2hCount = getUserP2HCount(user);

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrent ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      {/* Name & Email */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              user.role === 'admin'
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : 'bg-amber-100 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{user.name}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[9px]">
                                  ANDA
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              {user.email ? (
                                <span className="flex items-center gap-1 truncate max-w-[180px]">
                                  <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{user.email}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Tanpa email</span>
                              )}
                              <span className="text-slate-300">·</span>
                              <span className="text-[10px] text-slate-400 capitalize">
                                {user.authProvider === 'google' ? 'Google Auth' : 'Kode Unik'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* User Code / ID */}
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-1 bg-slate-100 border border-slate-300/80 px-2.5 py-1 rounded-md">
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {user.userCode}
                          </span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        {user.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            <Crown className="w-3.5 h-3.5 text-purple-600" />
                            Administrator
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <HardHat className="w-3.5 h-3.5 text-amber-600" />
                            Operator P2H
                          </span>
                        )}
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{user.department || '-'}</span>
                        </span>
                      </td>

                      {/* PIN / Password */}
                      <td className="px-4 py-3">
                        {user.pin ? (
                          <div className="flex items-center gap-1.5">
                            <div className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold min-w-[50px] text-center">
                              {isPinRevealed ? (
                                <span className="text-slate-900 tracking-wider">{user.pin}</span>
                              ) : (
                                <span className="text-slate-400">••••</span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => togglePinReveal(user.id)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title={isPinRevealed ? 'Sembunyikan PIN' : 'Lihat PIN asli'}
                            >
                              {isPinRevealed ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setResetPinTarget(user)}
                              className="px-2 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition-colors"
                              title="Reset PIN"
                            >
                              Reset
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-400 italic">Belum diatur</span>
                            <button
                              type="button"
                              onClick={() => setResetPinTarget(user)}
                              className="px-2 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors"
                            >
                              + Buat PIN
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Activity P2H */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold">
                          <ClipboardList className="w-3 h-3 text-slate-500" />
                          <span>{p2hCount} Form</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          {/* Copy Credentials */}
                          <button
                            type="button"
                            onClick={() => copyCredentials(user)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Salin Info Login Akun (untuk dikirim ke WhatsApp/Operator)"
                          >
                            {copiedId === user.id ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          {/* Edit User */}
                          <button
                            type="button"
                            onClick={() => setEditingUser(user)}
                            className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
                            title="Edit Data User"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete User */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmTarget(user)}
                            disabled={isCurrent || user.userCode === '30A25517' || user.id === 'usr-adm-celvinns'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isCurrent || user.userCode === '30A25517' || user.id === 'usr-adm-celvinns'
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-rose-600 hover:text-rose-800 hover:bg-rose-50 cursor-pointer'
                            }`}
                            title={
                              isCurrent
                                ? 'Tidak bisa menghapus akun yang sedang aktif digunakan'
                                : user.userCode === '30A25517' || user.id === 'usr-adm-celvinns'
                                ? 'Akun Administrator utama CelvinNs diproteksi dan tidak dapat dihapus'
                                : 'Hapus User'
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Helpful note footer */}
      <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Bantuan Pemulihan Akun Pengguna:</strong> Apabila operator lupa ID User atau PIN
          mereka, Administrator dapat langsung melihat PIN dengan menekan ikon mata atau melakukan{' '}
          <strong>Reset PIN</strong> menjadi sandi baru, kemudian tekan tombol <strong>Salin</strong>{' '}
          untuk mengirimkan kredensial langsung ke operator bersangkutan.
        </div>
      </div>

      {/* Modal: Tambah User Baru */}
      {isAddModalOpen && (
        <UserFormModal
          isOpen={isAddModalOpen}
          mode="add"
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={(user) => {
            setIsAddModalOpen(false);
            onToast(`User baru ${user.name} (${user.userCode}) berhasil didaftarkan!`);
          }}
        />
      )}

      {/* Modal: Edit User */}
      {editingUser && (
        <UserFormModal
          isOpen={!!editingUser}
          mode="edit"
          userToEdit={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={(user) => {
            setEditingUser(null);
            onToast(`Data user ${user.name} (${user.userCode}) berhasil diperbarui!`);
          }}
        />
      )}

      {/* Modal: Reset PIN Cepat */}
      {resetPinTarget && (
        <ResetPinModal
          isOpen={!!resetPinTarget}
          targetUser={resetPinTarget}
          onClose={() => setResetPinTarget(null)}
          onSuccess={(updated) => {
            setResetPinTarget(null);
            onToast(`PIN untuk ${updated.name} berhasil diubah menjadi: ${updated.pin}`);
          }}
        />
      )}

      {/* Modal: Konfirmasi Hapus User */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-2xl text-slate-900">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-center text-slate-900">
              Hapus Akun Pengguna?
            </h3>
            <p className="text-xs text-slate-500 text-center mt-1 leading-relaxed">
              Apakah Anda yakin ingin menghapus user{' '}
              <span className="font-bold text-slate-900">{deleteConfirmTarget.name}</span> (
              <span className="font-mono font-bold text-amber-600">
                {deleteConfirmTarget.userCode}
              </span>
              )? Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="mt-4 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600">
              Catatan: Dokumen histori P2H yang pernah dibuat oleh user ini akan tetap tersimpan aman di
              database sistem.
            </div>

            <div className="grid grid-cols-2 gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="py-2.5 px-3 rounded-lg border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="py-2.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm"
              >
                Ya, Hapus User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Sub-Component: Modal Form Tambah / Edit User
// ============================================================================
interface UserFormModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  userToEdit?: AppUser;
  onClose: () => void;
  onSuccess: (user: AppUser) => void;
}

const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  mode,
  userToEdit,
  onClose,
  onSuccess,
}) => {
  const [role, setRole] = useState<UserRole>(userToEdit?.role || 'user');
  const [name, setName] = useState(userToEdit?.name || '');
  const [userCode, setUserCode] = useState(userToEdit?.userCode || '');
  const [department, setDepartment] = useState(userToEdit?.department || 'PRODUKSI');
  const [email, setEmail] = useState(userToEdit?.email || '');
  const [pin, setPin] = useState(userToEdit?.pin || '');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  if (!isOpen) return null;

  const handleRegenerateCode = () => {
    setUserCode(generateUniqueCode(role));
  };

  const handleGenerateRandomPin = () => {
    const randomPin = String(Math.floor(1000 + Math.random() * 9000));
    setPin(randomPin);
    setShowPin(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanCode = userCode.trim().toUpperCase();

    if (!cleanName) {
      setError('Nama lengkap wajib diisi.');
      return;
    }
    if (!cleanCode) {
      setError('ID / Kode user unik wajib diisi.');
      return;
    }

    if (pin && pin.trim().length > 0 && pin.trim().length < 4) {
      setError('PIN keamanan minimal harus 4 digit.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'add') {
        const newUser = await registerNewUser({
          userCode: cleanCode,
          name: cleanName,
          role,
          department,
          email: email.trim() || undefined,
          pin: pin.trim() || undefined,
          authProvider: 'code',
        });
        onSuccess(newUser);
      } else if (userToEdit) {
        const updated = await updateUserOnline(userToEdit.id, {
          userCode: cleanCode,
          name: cleanName,
          role,
          department,
          email: email.trim() || undefined,
          pin: pin.trim() || undefined,
        });
        onSuccess(updated);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cleanCodeInput = userCode.trim().toUpperCase();
  const isCodeDuplicate = cleanCodeInput.length > 0 && isUserCodeTaken(cleanCodeInput, userToEdit?.id);
  const isCodeAvailable = cleanCodeInput.length >= 2 && !isCodeDuplicate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
              {mode === 'add' ? <UserPlus className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold leading-tight">
                {mode === 'add' ? 'Tambah Pengguna Baru' : 'Edit Data Pengguna'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {mode === 'add' ? 'Daftarkan akun operator / admin' : `Mengubah akun ${userToEdit?.name}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Role Choice */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Peran Akun (Role)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRole('user');
                  if (mode === 'add') setUserCode(generateUniqueCode('user'));
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  role === 'user'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <HardHat className="w-4 h-4 text-amber-600" />
                <span>Operator P2H</span>
              </button>

              {mode === 'edit' && userToEdit?.role === 'admin' ? (
                <div className="py-2 px-3 rounded-lg text-xs font-bold border border-purple-500 bg-purple-50 text-purple-900 flex items-center justify-center gap-2">
                  <Crown className="w-4 h-4 text-purple-600" />
                  <span>Administrator</span>
                </div>
              ) : (
                <div
                  className="py-2 px-3 rounded-lg text-[11px] font-semibold border border-dashed border-slate-200 bg-slate-50 text-slate-400 flex items-center justify-center gap-1.5 cursor-not-allowed text-center"
                  title="Admin didaftarkan langsung di dalam kode sistem (CelvinNs)"
                >
                  <Crown className="w-3.5 h-3.5 text-slate-400" />
                  <span>Admin via Kode</span>
                </div>
              )}
            </div>
            {mode === 'add' && (
              <p className="text-[10px] text-slate-400 mt-1">
                Akun Administrator didaftarkan langsung di dalam kode sistem (Admin: CelvinNs).
              </p>
            )}
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Lengkap Pengguna <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              required
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Unique User ID / Code */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              NRP/NIK <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={userCode}
                onChange={(e) => setUserCode(e.target.value.toUpperCase())}
                placeholder="Contoh: 2104052 atau NIK/NRP Pengguna"
                required
                className={`w-full px-3.5 py-2 text-xs rounded-lg border font-mono font-bold tracking-wider focus:outline-none focus:ring-2 ${
                  isCodeDuplicate
                    ? 'border-rose-400 bg-rose-50/50 focus:ring-rose-500 text-rose-900'
                    : isCodeAvailable
                    ? 'border-emerald-500 bg-emerald-50/20 focus:ring-emerald-500 text-emerald-950'
                    : 'border-slate-300 focus:ring-amber-500 text-slate-900'
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold">
                {isCodeDuplicate ? (
                  <span className="text-rose-600">NRP/NIK Terpakai!</span>
                ) : isCodeAvailable ? (
                  <span className="text-emerald-600 flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> Tersedia
                  </span>
                ) : null}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Masukkan Nomor Registrasi Pokok (NRP) atau Nomor Induk Karyawan (NIK) pengguna untuk login.
            </p>
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Departemen</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Email (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email (Opsional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@pt-pst.co.id"
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* PIN / Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                PIN / Password Masuk (Opsional)
              </label>
              <button
                type="button"
                onClick={handleGenerateRandomPin}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Buat 4-Digit Acak</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Contoh: 1234"
                maxLength={10}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Jika diisi, user akan diminta memasukkan PIN ini saat masuk dengan kode ID.
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCodeDuplicate}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{mode === 'add' ? 'Simpan & Daftarkan' : 'Perbarui Data'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// Sub-Component: Modal Reset PIN Cepat
// ============================================================================
interface ResetPinModalProps {
  isOpen: boolean;
  targetUser: AppUser;
  onClose: () => void;
  onSuccess: (updated: AppUser) => void;
}

const ResetPinModal: React.FC<ResetPinModalProps> = ({
  isOpen,
  targetUser,
  onClose,
  onSuccess,
}) => {
  const [newPin, setNewPin] = useState('1234');
  const [showPin, setShowPin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickPreset = (preset: string) => {
    setNewPin(preset);
  };

  const handleRandomPin = () => {
    setNewPin(String(Math.floor(1000 + Math.random() * 9000)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPin.trim()) {
      setError('PIN baru tidak boleh kosong.');
      return;
    }
    if (newPin.trim().length < 4) {
      setError('PIN minimal harus 4 digit.');
      return;
    }

    setLoading(true);
    try {
      const updated = await resetUserPinOnline(targetUser.id, newPin.trim());
      onSuccess(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden text-slate-900">
        <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Reset PIN / Password</h3>
              <p className="text-[11px] text-slate-400">Bantuan Lupa Akun Pengguna</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Target user info */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center shrink-0">
              {targetUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-slate-900 truncate">{targetUser.name}</div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-mono">
                <span>ID: {targetUser.userCode}</span>
                <span>·</span>
                <span className="capitalize">{targetUser.role}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          {/* New PIN Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Masukkan PIN Baru (4-6 Digit)
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                maxLength={8}
                className="w-full px-3.5 py-2.5 text-center font-mono font-black text-lg tracking-widest rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="1234"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick presets */}
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block mb-1.5">
              Pilihan Cepat:
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickPreset('1234')}
                className="py-1.5 px-2 text-xs font-mono font-bold rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
              >
                1234
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('0000')}
                className="py-1.5 px-2 text-xs font-mono font-bold rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
              >
                0000
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('9999')}
                className="py-1.5 px-2 text-xs font-mono font-bold rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
              >
                9999
              </button>
              <button
                type="button"
                onClick={handleRandomPin}
                className="py-1.5 px-2 text-xs font-bold rounded border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800"
              >
                Acak
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-all"
            >
              {loading ? 'Menyimpan...' : 'Simpan PIN Baru'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
