import React from 'react';
import {
  ClipboardCheck,
  Plus,
  History,
  BookOpen,
  TableProperties,
  ChevronDown,
  User,
  LogIn,
  LogOut,
  Lock,
  Users,
} from 'lucide-react';
import { AppUser } from '../types/auth';

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

interface NavbarProps {
  activeView: 'form' | 'history' | 'recap' | 'users';
  onNavigate: (view: 'form' | 'history' | 'recap' | 'users') => void;
  onOpenGuide: () => void;
  pendingForemanCount: number;
  currentUser: AppUser | null;
  onOpenAuth: () => void;
  onLogout?: () => void;
  userP2HCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onNavigate,
  onOpenGuide,
  pendingForemanCount,
  currentUser,
  onOpenAuth,
  onLogout,
  userP2HCount,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md no-print">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        {/* Main Navbar Bar */}
        <div className="h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* Zone 1: Brand Wordmark (Responsive for mobile) */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-200 shadow-inner shrink-0">
              <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5 text-slate-200" />
            </div>
            <div className="min-w-0">
              <span className="text-sm sm:text-base font-bold tracking-tight text-white block leading-tight truncate">
                <span className="sm:hidden">P2H System</span>
                <span className="hidden sm:inline">P2H Online System</span>
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono hidden sm:block leading-none mt-0.5">
                Pre-Operation Inspection
              </span>
            </div>
          </div>

          {/* Zone 2: Desktop Navigation Tabs (Hidden on mobile < sm) */}
          <nav className="hidden sm:flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => onNavigate('form')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeView === 'form'
                  ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-slate-300" />
              Form Baru
            </button>

            <button
              type="button"
              onClick={() => onNavigate('history')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap relative ${
                activeView === 'history'
                  ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <History className="w-3.5 h-3.5 text-slate-300" />
              <span>{isAdmin ? 'Riwayat Semua Unit' : 'Riwayat Saya'}</span>
              {isAdmin ? (
                pendingForemanCount > 0 && (
                  <span
                    className="w-4 h-4 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold flex items-center justify-center ml-0.5"
                    title={`${pendingForemanCount} form menunggu tanda tangan atasan`}
                  >
                    {pendingForemanCount}
                  </span>
                )
              ) : (
                typeof userP2HCount === 'number' && (
                  <span
                    className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-bold border border-slate-700 ml-0.5"
                    title={`Total ${userP2HCount} dokumen P2H Anda`}
                  >
                    {userP2HCount}
                  </span>
                )
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigate('recap')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap relative ${
                activeView === 'recap'
                  ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5 text-slate-300" />
              <span>Rekap Harian</span>
              {!isAdmin && (
                <span className="flex items-center text-[9px] font-mono font-bold bg-slate-800 text-slate-400 px-1 py-0.2 rounded border border-slate-700 ml-0.5">
                  <Lock className="w-2.5 h-2.5 mr-0.5" />
                  Admin
                </span>
              )}
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => onNavigate('users')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap relative ${
                  activeView === 'users'
                    ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-slate-300" />
                <span>Kelola User</span>
              </button>
            )}
          </nav>

          {/* Zone 3: User Profile & Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* User Account Pill Button */}
            {currentUser ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="group flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-left transition-all active:scale-95 shadow-xs"
                  title={`Akun: ${currentUser.name} (${currentUser.userCode}) · Klik untuk ganti profil`}
                >
                  {/* Modern avatar with monogram & online status */}
                  <div className="relative shrink-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-700 border border-slate-600/80 flex items-center justify-center text-[11px] sm:text-xs font-bold text-slate-100 tracking-tight shadow-inner">
                      {getInitials(currentUser.name)}
                    </div>
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900"
                      title="Status: Online"
                    />
                  </div>

                  {/* User name & role info (shown on desktop, hidden on compact mobile) */}
                  <div className="hidden sm:flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white truncate max-w-[110px] leading-tight">
                        {currentUser.name}
                      </span>
                      <span
                        className={`text-[9px] font-semibold font-mono px-1.5 py-0.2 rounded border ${
                          isAdmin
                            ? 'bg-purple-950/80 text-purple-300 border-purple-800/80'
                            : 'bg-slate-900 text-slate-300 border-slate-700'
                        }`}
                      >
                        {isAdmin ? 'Admin' : 'Operator'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono leading-tight mt-0.5">
                      {currentUser.userCode}
                    </span>
                  </div>

                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-colors ml-0.5 shrink-0 hidden sm:block" />
                </button>

                {/* Logout Button */}
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="w-8 h-8 sm:w-auto p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 border border-slate-700 transition-colors flex items-center justify-center shrink-0 active:scale-95"
                    title="Keluar (Logout) dari Akun"
                  >
                    <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-300" />
                <span>Masuk</span>
              </button>
            )}

            {/* Cloud Sync Status */}
            <div
              className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-950/70 border border-emerald-600/40 text-[11px] text-emerald-300 font-mono shrink-0"
              title="Database tersinkronisasi online real-time via Google Firebase Firestore"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Cloud Sync</span>
            </div>

            {/* Panduan Modal Button */}
            <button
              type="button"
              onClick={onOpenGuide}
              className="w-8 h-8 sm:w-auto p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
              title="Panduan Standar P2H & Kode Bahaya"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="hidden md:inline">Panduan</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs Bar (Visible on mobile screens < sm) */}
        <div
          className={`grid ${
            isAdmin ? 'grid-cols-4' : 'grid-cols-3'
          } sm:hidden pb-2.5 pt-1.5 border-t border-slate-800/80 gap-1.5`}
        >
          <button
            type="button"
            onClick={() => onNavigate('form')}
            className={`h-9 px-1 text-[11px] font-medium rounded-lg transition-all flex items-center justify-center gap-1 active:scale-95 ${
              activeView === 'form'
                ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800/60'
            }`}
          >
            <Plus className="w-3.5 h-3.5 shrink-0 text-slate-300" />
            <span>Form</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('history')}
            className={`h-9 px-1 text-[11px] font-medium rounded-lg transition-all flex items-center justify-center gap-1 relative active:scale-95 ${
              activeView === 'history'
                ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5 shrink-0 text-slate-300" />
            <span>{isAdmin ? 'Riwayat' : 'Saya'}</span>
            {isAdmin && pendingForemanCount > 0 && (
              <span className="absolute -top-1 -right-0.5 min-w-[15px] h-3.5 px-1 rounded-full bg-rose-500 text-white font-mono text-[8.5px] font-bold flex items-center justify-center shadow-xs">
                {pendingForemanCount}
              </span>
            )}
            {!isAdmin && typeof userP2HCount === 'number' && (
              <span className="absolute -top-1 -right-0.5 min-w-[15px] h-3.5 px-1 rounded-full bg-slate-700 text-slate-200 font-mono text-[8.5px] font-bold flex items-center justify-center border border-slate-600 shadow-xs">
                {userP2HCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('recap')}
            className={`h-9 px-1 text-[11px] font-medium rounded-lg transition-all flex items-center justify-center gap-1 active:scale-95 relative ${
              activeView === 'recap'
                ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800/60'
            }`}
          >
            <TableProperties className="w-3.5 h-3.5 shrink-0 text-slate-300" />
            <span>Rekap</span>
            {!isAdmin && (
              <Lock className="w-2.5 h-2.5 text-slate-500 shrink-0 ml-0.5" />
            )}
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => onNavigate('users')}
              className={`h-9 px-1 text-[11px] font-medium rounded-lg transition-all flex items-center justify-center gap-1 active:scale-95 relative ${
                activeView === 'users'
                  ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800/60'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0 text-slate-300" />
              <span>Users</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
