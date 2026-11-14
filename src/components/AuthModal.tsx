import React, { useState, useEffect } from 'react';
import {
  AppUser,
  UserRole,
} from '../types/auth';
import {
  getLocalUsers,
  loginWithCode,
  registerNewUser,
  signInWithGoogleFlow,
  registerOrLoginSimulatedGoogle,
  generateUniqueCode,
  isUserCodeTaken,
  INITIAL_USERS,
} from '../utils/authStorage';
import {
  KeyRound,
  UserCheck,
  ShieldAlert,
  UserPlus,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Building2,
  Lock,
  X,
  RefreshCw,
  Crown,
  Truck,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AppUser) => void;
  currentUser: AppUser | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'login-code' | 'google' | 'register'>('login-code');

  // Login with code states
  const [loginUserCode, setLoginUserCode] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register states
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('user');
  const [regCode, setRegCode] = useState('');
  const [regDept, setRegDept] = useState('PRODUKSI');
  const [regPin, setRegPin] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Google interactive input state for fallback simulation
  const [googleName, setGoogleName] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleRole, setGoogleRole] = useState<UserRole>('user');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);


  if (!isOpen) return null;

  // Handle Login with Code
  const handleLoginCode = (codeToUse?: string) => {
    const code = (codeToUse || loginUserCode).trim().toUpperCase();
    if (!code) {
      setLoginError('Harap masukkan NRP/NIK Anda.');
      return;
    }

    setLoginError(null);
    const res = loginWithCode(code, loginPin);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
      onClose();
    } else {
      setLoginError(res.message || 'Kode user atau PIN tidak sesuai.');
    }
  };

  // Quick One-Click Login to Demo Accounts
  const handleQuickDemoLogin = (userCode: string) => {
    handleLoginCode(userCode);
  };

  // Handle Google Login Flow
  const handleGooglePopupLogin = async () => {
    setGoogleLoading(true);
    setGoogleNotice(null);
    try {
      const res = await signInWithGoogleFlow();
      if (res.success && res.user) {
        onLoginSuccess(res.user);
        onClose();
        return;
      }
      // If popup restricted, show helpful simulation input
      setGoogleNotice(res.message || 'Mode Google Direct siap digunakan di bawah ini:');
    } catch {
      setGoogleNotice('Gunakan formulir Akun Google di bawah untuk masuk langsung:');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSimulatedGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleName.trim() || !googleEmail.trim()) {
      setGoogleNotice('Harap lengkapi nama dan email Google Anda.');
      return;
    }
    setGoogleLoading(true);
    try {
      const user = await registerOrLoginSimulatedGoogle(googleName.trim(), googleEmail.trim(), googleRole);
      onLoginSuccess(user);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGoogleNotice(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  // Handle Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    const cleanName = regName.trim();
    const cleanCode = regCode.trim().toUpperCase();

    if (!cleanName) {
      setRegError('Nama lengkap wajib diisi.');
      return;
    }
    if (!cleanCode) {
      setRegError('NRP/NIK wajib diisi.');
      return;
    }

    // Check duplicate code
    if (isUserCodeTaken(cleanCode)) {
      setRegError(`NRP/NIK "${cleanCode}" sudah terdaftar pada akun lain! Silakan masukkan NRP/NIK Anda yang valid.`);
      return;
    }

    try {
      const newUser = await registerNewUser({
        userCode: cleanCode,
        name: cleanName,
        email: regEmail.trim() || undefined,
        role: regRole,
        department: regDept,
        pin: regPin.trim() || undefined,
        authProvider: 'code',
      });

      setRegSuccess(`Akun berhasil dibuat dengan Kode User: ${newUser.userCode}!`);
      setTimeout(() => {
        onLoginSuccess(newUser);
        onClose();
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRegError(msg);
    }
  };

  // Check code availability live
  const isCodeAvailable = regCode.trim().length > 0 && !isUserCodeTaken(regCode.trim().toUpperCase());
  const isCodeDuplicate = regCode.trim().length > 0 && isUserCodeTaken(regCode.trim().toUpperCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">Autentikasi & Akun User P2H</h3>
              <p className="text-xs text-slate-400">Kontrol Hak Akses: Admin & User Biasa</p>
            </div>
          </div>

          {currentUser && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Current User Info Banner (if changing accounts) */}
        {currentUser && (
          <div className="bg-blue-50/80 px-5 py-2.5 border-b border-blue-200/80 flex items-center justify-between text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Sedang login sebagai:{' '}
                <strong>{currentUser.name}</strong> ({currentUser.userCode}) —{' '}
                <span className="uppercase font-bold text-blue-700">
                  {currentUser.role === 'admin' ? 'Admin' : 'Operator'}
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('login-code')}
            className={`py-3 px-2 text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'login-code'
                ? 'border-amber-500 text-slate-900 bg-white'
                : 'border-transparent hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <LogIn className="w-4 h-4 text-amber-500" />
            <span>NRP / NIK</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('google')}
            className={`py-3 px-2 text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'google'
                ? 'border-blue-600 text-slate-900 bg-white'
                : 'border-transparent hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Akun Google</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setRegCode(generateUniqueCode(regRole));
            }}
            className={`py-3 px-2 text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'register'
                ? 'border-emerald-600 text-slate-900 bg-white'
                : 'border-transparent hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <UserPlus className="w-4 h-4 text-emerald-600" />
            <span>Daftar Akun</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* TAB 1: MASUK DENGAN KODE USER */}
          {activeTab === 'login-code' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500">
                Masukkan Kode User unik Anda yang telah terdaftar untuk masuk ke aplikasi.
              </div>

              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NRP/NIK <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={loginUserCode}
                    onChange={(e) => setLoginUserCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: 2104052 atau NIK/NRP Anda"
                    className="w-full px-3 py-2 text-sm font-mono font-bold tracking-wide rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase"
                    onKeyDown={(e) => e.key === 'Enter' && handleLoginCode()}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PIN / Sandi Keamanan (Opsional)
                  </label>
                  <input
                    type="password"
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value)}
                    placeholder="Masukkan PIN (Default demo: 1234)"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleLoginCode()}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleLoginCode()}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Masuk ke Akun</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: AKUN GOOGLE */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-600">
                Masuk atau daftar dengan akun Google Anda. Sistem akan mengaitkan akun Google Anda dengan kode user unik otomatis.
              </div>

              {googleNotice && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs">
                  {googleNotice}
                </div>
              )}

              {/* Official Google Sign-in button */}
              <button
                type="button"
                onClick={handleGooglePopupLogin}
                disabled={googleLoading}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-xs transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{googleLoading ? 'Menghubungkan...' : 'Lanjutkan dengan Google Popup'}</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-slate-400 text-[11px] font-semibold">
                  ATAU MASUKKAN AKUN GOOGLE
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Direct Google Entry Form (Robust in iframe preview) */}
              <form onSubmit={handleSimulatedGoogleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Akun Google
                  </label>
                  <input
                    type="text"
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    placeholder="Contoh: Rian Hidayat"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alamat Email Google (@gmail.com)
                  </label>
                  <input
                    type="email"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="nama.user@gmail.com"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-[11px] font-semibold text-slate-600">Peran Akun:</span>
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded uppercase">
                    Operator P2H
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={googleLoading}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Masuk dengan Akun Google Ini</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: DAFTAR AKUN BARU DENGAN KODE USER UNIK */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="text-xs text-slate-500">
                Daftarkan akun baru. Sistem menjamin <strong>setiap pengguna memiliki Kode User unik</strong> yang tidak saling bertabrakan.
              </div>

              {regError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{regError}</span>
                </div>
              )}

              {regSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{regSuccess}</span>
                </div>
              )}

              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Operator / Pengawas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Contoh: Rian Hidayat"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Peran Akun: Operator P2H */}
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Peran Akun: Operator P2H</div>
                    <div className="text-[11px] text-slate-500">
                      Input formulir pemeriksaan & pantau riwayat unit pribadi
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md border border-amber-300 shrink-0">
                  OPERATOR
                </span>
              </div>

              {/* NRP / NIK Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NRP/NIK <span className="text-rose-500">*</span>
                </label>

                <div className="relative">
                  <input
                    type="text"
                    value={regCode}
                    onChange={(e) => setRegCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: 2104052 atau NIK/NRP Anda"
                    className={`w-full px-3 py-2 text-sm font-mono font-bold tracking-wider rounded-lg border focus:outline-none uppercase ${
                      isCodeDuplicate
                        ? 'border-rose-500 bg-rose-50/40 text-rose-800 focus:ring-2 focus:ring-rose-400'
                        : isCodeAvailable
                        ? 'border-emerald-500 bg-emerald-50/40 text-emerald-900 focus:ring-2 focus:ring-emerald-400'
                        : 'border-slate-300'
                    }`}
                    required
                  />
                  {isCodeAvailable && (
                    <div className="absolute right-2.5 top-2.5 flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Tersedia</span>
                    </div>
                  )}
                  {isCodeDuplicate && (
                    <div className="absolute right-2.5 top-2.5 flex items-center gap-1 text-[11px] font-bold text-rose-600">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Sudah Digunakan</span>
                    </div>
                  )}
                </div>

                {/* Uniqueness status */}
                <div className="mt-1 text-[11px]">
                  {isCodeDuplicate ? (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      NRP/NIK "{regCode}" sudah digunakan user lain! Mohon periksa kembali.
                    </span>
                  ) : isCodeAvailable ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      NRP/NIK valid & siap digunakan. Simpan untuk login.
                    </span>
                  ) : (
                    <span className="text-slate-500 text-[10px]">
                      Masukkan Nomor Registrasi Pokok (NRP) atau Nomor Induk Karyawan (NIK) Anda.
                    </span>
                  )}
                </div>
              </div>

              {/* Departemen & PIN Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Departemen Kerja
                  </label>
                  <select
                    value={regDept}
                    onChange={(e) => setRegDept(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="PRODUKSI">PRODUKSI</option>
                    <option value="PLANT">PLANT</option>
                    <option value="SHE">SHE / K3</option>
                    <option value="DPM">DPM</option>
                    <option value="ENGINEERING">ENGINEERING</option>
                    <option value="LOGISTIK">LOGISTIK</option>
                    <option value="HCGS">HCGS</option>
                    <option value="PJO">PJO / MANAJEMEN</option>
                    <option value="LAINNYA">LAINNYA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PIN Keamanan (Opsional)
                  </label>
                  <input
                    type="password"
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value)}
                    placeholder="Contoh: 1234"
                    maxLength={6}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email (Opsional)
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="operator@perusahaan.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isCodeDuplicate}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlus className="w-4 h-4" />
                <span>Daftar Akun & Langsung Masuk</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 text-center text-[11px] text-slate-500">
          <span>PT. Putra Sarana Transborneo · Sistem P2H Multi-User Berbasis RBAC</span>
        </div>
      </div>
    </div>
  );
};
