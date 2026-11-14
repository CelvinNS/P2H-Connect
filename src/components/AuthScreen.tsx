import React, { useState, useEffect, useMemo } from 'react';
import {
  AppUser,
  UserRole,
} from '../types/auth';
import {
  loginWithCode,
  registerNewUser,
  signInWithGoogleFlow,
  registerOrLoginSimulatedGoogle,
  generateUniqueCode,
  isUserCodeTaken,
} from '../utils/authStorage';
import {
  ShieldCheck,
  UserCheck,
  UserPlus,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Building2,
  Lock,
  RefreshCw,
  Crown,
  Truck,
  ClipboardCheck,
} from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: AppUser) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [authMethod, setAuthMethod] = useState<'code' | 'google'>('code');

  // Login states
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

  // Google state
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);
  const [googleDirectName, setGoogleDirectName] = useState('');
  const [googleDirectEmail, setGoogleDirectEmail] = useState('');
  const [googleDirectRole, setGoogleDirectRole] = useState<UserRole>('user');

  // Live check for user-defined unique code
  const cleanRegCode = regCode.trim().toUpperCase();
  const isCodeDuplicate = useMemo(() => {
    if (!cleanRegCode) return false;
    return isUserCodeTaken(cleanRegCode);
  }, [cleanRegCode]);

  const isCodeAvailable = cleanRegCode.length >= 2 && !isCodeDuplicate;

  // Handle Login with Code
  const handleLoginCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = loginUserCode.trim().toUpperCase();
    if (!code) {
      setLoginError('Harap masukkan NRP/NIK Anda.');
      return;
    }

    setLoginError(null);
    const res = loginWithCode(code, loginPin);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setLoginError(res.message || 'Kode user atau PIN tidak sesuai.');
    }
  };

  // Handle Google Login
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setGoogleNotice(null);
    try {
      const res = await signInWithGoogleFlow();
      if (res.success && res.user) {
        onLoginSuccess(res.user);
        return;
      }
      setGoogleNotice(res.message || 'Mode Google Direct siap digunakan di bawah:');
    } catch {
      setGoogleNotice('Gunakan input Google Direct di bawah untuk masuk langsung:');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleDirectName.trim() || !googleDirectEmail.trim()) {
      setGoogleNotice('Harap lengkapi Nama dan Email Google.');
      return;
    }
    setGoogleLoading(true);
    try {
      const user = await registerOrLoginSimulatedGoogle(
        googleDirectName.trim(),
        googleDirectEmail.trim(),
        googleDirectRole
      );
      onLoginSuccess(user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGoogleNotice(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      setRegError('Harap isi Nama Lengkap Anda.');
      return;
    }

    const code = regCode.trim().toUpperCase();
    if (!code) {
      setRegError('Harap masukkan NRP/NIK Anda.');
      return;
    }

    if (isUserCodeTaken(code)) {
      setRegError(`NRP/NIK "${code}" sudah terdaftar pada akun lain. Silakan masukkan NRP/NIK Anda yang valid.`);
      return;
    }

    setRegError(null);
    try {
      const newUser = await registerNewUser({
        name: regName.trim(),
        role: regRole,
        userCode: code,
        department: regDept,
        pin: regPin.trim() || undefined,
        email: regEmail.trim() || undefined,
        authProvider: 'code',
      });

      setRegSuccess(`Akun berhasil dibuat dengan Kode: ${newUser.userCode}! Mengalihkan...`);
      setTimeout(() => {
        onLoginSuccess(newUser);
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRegError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-amber-500 selection:text-slate-950">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 shadow-xl shadow-amber-500/20 mb-3 ring-4 ring-amber-500/20">
            <ClipboardCheck className="w-9 h-9" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
            Sistem Inspeksi P2H
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
            Portal Pemeliharaan & Monitoring Armada Tambang
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] text-amber-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>K3 & Fleet Management PT. PST</span>
          </div>
        </div>

        {/* Card Container */}
        <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden">
          {/* Main Tabs (Masuk vs Daftar) */}
          <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setLoginError(null);
              }}
              className={`py-3.5 px-4 text-center flex items-center justify-center gap-2 transition-all ${
                activeTab === 'login'
                  ? 'bg-white text-slate-900 border-b-2 border-amber-500 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <LogIn className="w-4 h-4 text-amber-600" />
              <span>Masuk Akun</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setRegError(null);
                setRegSuccess(null);
                if (!regCode) setRegCode(generateUniqueCode(regRole));
              }}
              className={`py-3.5 px-4 text-center flex items-center justify-center gap-2 transition-all ${
                activeTab === 'register'
                  ? 'bg-white text-slate-900 border-b-2 border-amber-500 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <UserPlus className="w-4 h-4 text-blue-600" />
              <span>Daftar Akun Baru</span>
            </button>
          </div>

          <div className="p-5 sm:p-6">
            {/* ===================== TAB MASUK ===================== */}
            {activeTab === 'login' && (
              <div className="space-y-4">
                {/* Method selector: Kode User vs Google */}
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('code');
                      setLoginError(null);
                    }}
                    className={`py-2 rounded-md transition-all ${
                      authMethod === 'code'
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    NRP / NIK
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('google');
                      setLoginError(null);
                    }}
                    className={`py-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                      authMethod === 'google'
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
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
                </div>

                {loginError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* Sub-form 1: Kode User */}
                {authMethod === 'code' && (
                  <form onSubmit={handleLoginCode} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        NRP/NIK <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={loginUserCode}
                        onChange={(e) => setLoginUserCode(e.target.value.toUpperCase())}
                        placeholder="Contoh: 2104052 atau NIK/NRP Anda"
                        className="w-full px-3.5 py-2.5 text-sm font-mono font-bold tracking-wider rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase bg-slate-50 focus:bg-white"
                        autoFocus
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Masukkan NRP atau NIK Anda yang telah terdaftar.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        PIN / Sandi Keamanan
                      </label>
                      <input
                        type="password"
                        value={loginPin}
                        onChange={(e) => setLoginPin(e.target.value)}
                        placeholder="Masukkan PIN (Opsional jika tidak disetel)"
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black rounded-lg transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 text-sm mt-2"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Masuk ke Sistem</span>
                    </button>
                  </form>
                )}

                {/* Sub-form 2: Google */}
                {authMethod === 'google' && (
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={googleLoading}
                      className="w-full py-3 px-4 bg-white hover:bg-slate-50 active:scale-98 border border-slate-300 text-slate-800 font-bold rounded-lg transition-all flex items-center justify-center gap-2.5 shadow-xs text-sm"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                      <span>{googleLoading ? 'Menghubungkan...' : 'Masuk dengan Akun Google'}</span>
                    </button>

                    {/* Google Direct / Fallback */}
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[11px] text-slate-500 mb-2">
                        Atau hubungkan akun Google Anda secara langsung:
                      </p>
                      <form onSubmit={handleGoogleDirectSubmit} className="space-y-2.5">
                        <input
                          type="text"
                          value={googleDirectName}
                          onChange={(e) => setGoogleDirectName(e.target.value)}
                          placeholder="Nama Akun Google"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="email"
                          value={googleDirectEmail}
                          onChange={(e) => setGoogleDirectEmail(e.target.value)}
                          placeholder="alamat.email@gmail.com"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                          <span className="text-[11px] font-semibold text-slate-600">Peran Akun:</span>
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded uppercase">
                            Operator P2H
                          </span>
                        </div>
                        {googleNotice && (
                          <div className="text-[11px] text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                            {googleNotice}
                          </div>
                        )}
                        <button
                          type="submit"
                          disabled={googleLoading}
                          className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          Masuk dengan Email Google
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Footer Switch */}
                <div className="pt-3 border-t border-slate-200 text-center">
                  <p className="text-xs text-slate-600">
                    Belum memiliki akun?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('register');
                        setRegError(null);
                        setRegSuccess(null);
                        if (!regCode) setRegCode(generateUniqueCode(regRole));
                      }}
                      className="font-bold text-amber-600 hover:text-amber-700 underline"
                    >
                      Daftar Akun Baru di sini
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* ===================== TAB DAFTAR ===================== */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                {regError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{regError}</span>
                  </div>
                )}

                {regSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{regSuccess}</span>
                  </div>
                )}

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
                      className={`w-full px-3.5 py-2.5 text-sm font-mono font-bold tracking-wider rounded-lg border focus:outline-none uppercase bg-white ${
                        isCodeDuplicate
                          ? 'border-rose-400 focus:ring-2 focus:ring-rose-500 text-rose-900 bg-rose-50/40'
                          : isCodeAvailable
                          ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500 text-emerald-950 bg-emerald-50/20'
                          : 'border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900'
                      }`}
                      placeholder="Contoh: 2104052 atau NIK/NRP Anda"
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
                  <div className="mt-1 text-[11px]">
                    {isCodeDuplicate ? (
                      <p className="text-rose-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>NRP/NIK "{regCode}" sudah digunakan akun lain. Silakan periksa kembali.</span>
                      </p>
                    ) : isCodeAvailable ? (
                      <p className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>NRP/NIK valid & siap didaftarkan. Gunakan untuk login ke sistem.</span>
                      </p>
                    ) : (
                      <p className="text-slate-500 text-[10px]">
                        Masukkan Nomor Registrasi Pokok (NRP) atau Nomor Induk Karyawan (NIK) Anda.
                      </p>
                    )}
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Contoh: Joko Susilo"
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Departemen / Bagian
                  </label>
                  <div className="relative">
                    <select
                      value={regDept}
                      onChange={(e) => setRegDept(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    >
                      <option value="PRODUKSI">PRODUKSI</option>
                      <option value="PLANT">PLANT / WORKSHOP</option>
                      <option value="ENGINEERING">ENGINEERING</option>
                      <option value="SHE">SHE / PENGAWAS K3</option>
                      <option value="HCGS">HCGS</option>
                      <option value="LOGISTIK">LOGISTIK / WAREHOUSE</option>
                      <option value="DPM">DPM</option>
                      <option value="PJO">PJO / MANAGEMENT</option>
                    </select>
                  </div>
                </div>

                {/* PIN / Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PIN Keamanan (Opsional)
                  </label>
                  <input
                    type="password"
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value)}
                    placeholder="4 - 6 digit angka PIN (Opsional)"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Email (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alamat Email (Opsional)
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="nama@perusahaan.co.id"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black rounded-lg transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 text-sm mt-3"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Daftar & Masuk ke Sistem</span>
                </button>

                <div className="pt-2 border-t border-slate-200 text-center">
                  <p className="text-xs text-slate-600">
                    Sudah memiliki akun?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('login');
                        setLoginError(null);
                      }}
                      className="font-bold text-amber-600 hover:text-amber-700 underline"
                    >
                      Masuk di sini
                    </button>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Security badge footer */}
        <div className="mt-4 text-center text-[11px] text-slate-400">
          Data tersimpan aman & tersinkronisasi secara real-time ke Cloud Database Firebase.
        </div>
      </div>
    </div>
  );
};
