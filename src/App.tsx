import React, { useState, useEffect } from 'react';
import { P2HRecord } from './types/p2h';
import { AppUser } from './types/auth';
import {
  subscribeToP2HRecords,
  saveRecordOnline,
  deleteRecordOnline,
  deleteMultipleRecordsOnline,
  clearAllDummyRecordsOnline,
} from './utils/storage';
import { getCurrentUser, setCurrentUser as saveCurrentUserStorage, subscribeToUsers } from './utils/authStorage';
import { Navbar } from './components/Navbar';
import { P2HFormInteractive } from './components/P2HFormInteractive';
import { P2HHistoryList } from './components/P2HHistoryList';
import { P2HRecapTable } from './components/P2HRecapTable';
import { PrintPreviewModal } from './components/PrintPreviewModal';
import { P2HPrintTemplate } from './components/P2HPrintTemplate';
import { P2HGuideModal } from './components/P2HGuideModal';
import { SignaturePadModal } from './components/SignaturePadModal';
import { AuthModal } from './components/AuthModal';
import { AuthScreen } from './components/AuthScreen';
import { UserManagement } from './components/UserManagement';
import { ensureUnitInFleetRoster, isBusUnit, clearAllRecapDummyData } from './utils/recapStorage';
import { Check } from 'lucide-react';

export default function App() {
  const [records, setRecords] = useState<P2HRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // View state: 'recap' for admin, 'history' for operator, 'users' for admin user management
  const [view, setView] = useState<'form' | 'history' | 'recap' | 'users'>(() => {
    const user = getCurrentUser();
    return user?.role === 'admin' ? 'recap' : 'history';
  });
  const [editingRecord, setEditingRecord] = useState<P2HRecord | null>(null);

  // Modals state
  const [previewRecord, setPreviewRecord] = useState<P2HRecord | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [foremanSigningRecord, setForemanSigningRecord] = useState<P2HRecord | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Purge any legacy dummy/demo records and recap mock data
    clearAllRecapDummyData();
    clearAllDummyRecordsOnline().catch(() => {});

    // Real-time Firestore sync for P2H records
    const unsubscribeRecords = subscribeToP2HRecords((updatedList) => {
      setRecords(updatedList);
    });

    // Real-time Firestore sync for Registered Users
    const unsubscribeUsers = subscribeToUsers((_updatedUsers) => {
      // Kept in sync automatically with localStorage & Firestore
    });

    return () => {
      unsubscribeRecords();
      unsubscribeUsers();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleUserChange = (user: AppUser) => {
    setCurrentUser(user);
    saveCurrentUserStorage(user);
    setIsAuthModalOpen(false);
    showToast(`Masuk sebagai: ${user.name} (${user.role === 'admin' ? 'Admin (Akses Penuh)' : 'Operator P2H'})`);
    if (user.role === 'admin') {
      setView('recap');
    } else {
      setView('history');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    saveCurrentUserStorage(null);
    showToast('Berhasil keluar dari akun.');
  };

  const handleSaveRecord = async (record: P2HRecord) => {
    // Attach current user identity if not already present
    const recordToSave: P2HRecord = {
      ...record,
      userId: record.userId || currentUser?.id,
      userCode: record.userCode || currentUser?.userCode,
      operatorRole: record.operatorRole || currentUser?.role,
      updatedAt: new Date().toISOString(),
    };

    // Update local state immediately so recap and history reflect changes instantly
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === recordToSave.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = recordToSave;
        return next;
      }
      return [recordToSave, ...prev];
    });

    await saveRecordOnline(recordToSave);

    // Otomatis daftarkan unit ke monitoring armada rekap jika belum ada
    try {
      ensureUnitInFleetRoster(
        recordToSave.unitName,
        recordToSave.unitType,
        undefined,
        recordToSave.p2hCategory
      );
    } catch (e) {
      console.warn('Auto fleet registration notice:', e);
    }

    setEditingRecord(null);

    // If operator, view their history; if admin, can stay or view history
    setView('history');
    showToast(`Dokumen P2H Unit ${recordToSave.unitName} berhasil disimpan online ke database.`);
  };

  const handleDeleteRecord = async (id: string) => {
    // Optimistic update
    setRecords((prev) => prev.filter((r) => r.id !== id));
    await deleteRecordOnline(id);
    showToast('Dokumen P2H berhasil dihapus dari sistem.');
  };

  const handleDeleteMultipleRecords = async (ids: string[]) => {
    const idSet = new Set(ids);
    setRecords((prev) => prev.filter((r) => !idSet.has(r.id)));
    await deleteMultipleRecordsOnline(ids);
    showToast(`${ids.length} dokumen P2H berhasil dihapus dari sistem.`);
  };

  const handleClearAllDummyRecords = async () => {
    const dummyDefaultIds = ['p2h-demo-01', 'p2h-demo-02', 'p2h-demo-03'];
    setRecords((prev) =>
      prev.filter(
        (r) =>
          !dummyDefaultIds.includes(r.id) &&
          !r.id.includes('demo') &&
          !r.documentNo?.startsWith('P2H-2026-00')
      )
    );
    const count = await clearAllDummyRecordsOnline();
    showToast(`Berhasil membersihkan ${count} dokumen demo/dummy.`);
  };

  const handleOpenEdit = (record: P2HRecord) => {
    setEditingRecord(record);
    setView('form');
  };

  const handlePreviewPrint = (record: P2HRecord) => {
    setPreviewRecord(record);
  };

  const handleForemanSignStart = (record: P2HRecord) => {
    setForemanSigningRecord(record);
  };

  const handleForemanSignComplete = async (signatureDataUrl: string, foremanName: string) => {
    if (!foremanSigningRecord) return;
    const now = new Date();
    const timeStr = `${now.toISOString().slice(0, 10)} ${now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const updatedRecord: P2HRecord = {
      ...foremanSigningRecord,
      foremanName,
      foremanSignature: signatureDataUrl,
      foremanSignedAt: timeStr,
      updatedAt: new Date().toISOString(),
    };

    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === updatedRecord.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedRecord;
        return next;
      }
      return [updatedRecord, ...prev];
    });

    await saveRecordOnline(updatedRecord);

    if (previewRecord?.id === updatedRecord.id) {
      setPreviewRecord(updatedRecord);
    }

    setForemanSigningRecord(null);
    showToast(`Tanda tangan Foreman berhasil diverifikasi & disimpan online untuk Unit ${updatedRecord.unitName}.`);
  };

  const handleNewP2HForUnit = (unitName: string, targetShift?: string, targetDate?: string) => {
    const d = targetDate ? new Date(targetDate) : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateToUse = targetDate || `${y}-${m}-${day}`;
    const isBus = isBusUnit({ unitName });

    setEditingRecord({
      id: `p2h-${Date.now()}`,
      documentNo: `P2H-${d.getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      unitName,
      unitType: isBus ? 'Bus' : 'LV',
      p2hCategory: isBus ? 'Bus' : 'LV',
      operatorName: currentUser?.name || '',
      userId: currentUser?.id,
      userCode: currentUser?.userCode,
      operatorRole: currentUser?.role,
      date: dateToUse,
      shift: targetShift || 'Shift 1 (06:00 - 18:00)',
      kmHm: '',
      unitConditionStatus: 'RFU',
      items: {},
      operatorSignature: null,
      operatorSignedAt: null,
      foremanName: '',
      foremanSignature: null,
      foremanSignedAt: null,
      status: 'siap_operasi',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setView('form');
  };

  const pendingForemanCount = records.filter((r) => !r.foremanSignature).length;

  // Regular user's own P2H count
  const myP2HCount = currentUser
    ? records.filter(
        (r) =>
          (r.userId && r.userId === currentUser.id) ||
          (r.userCode && r.userCode.trim().toUpperCase() === currentUser.userCode.trim().toUpperCase()) ||
          (r.operatorName && r.operatorName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
      ).length
    : 0;

  // Active print template target
  const printableTargetRecord = previewRecord || editingRecord || (records.length > 0 ? records[0] : null);

  // =========================================================================
  // USER GATE: If not logged in, show clean Login/Register page as first screen!
  // =========================================================================
  if (!currentUser) {
    return <AuthScreen onLoginSuccess={handleUserChange} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans">
      {/* Top Navigation */}
      <Navbar
        activeView={view}
        onNavigate={(newView) => {
          if (newView === 'form') {
            setEditingRecord(null); // Fresh form
          }
          setView(newView);
        }}
        onOpenGuide={() => setIsGuideOpen(true)}
        pendingForemanCount={pendingForemanCount}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        userP2HCount={myP2HCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 no-print">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="mb-4 p-3 bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-md flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-300 shrink-0" />
              <span className="leading-tight">{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-xs text-emerald-200 hover:text-white shrink-0 ml-2 font-bold"
            >
              Tutup
            </button>
          </div>
        )}

        {/* View Switching */}
        {view === 'recap' && (
          <P2HRecapTable
            p2hRecords={records}
            currentUser={currentUser}
            onOpenP2H={handlePreviewPrint}
            onNewP2HForUnit={handleNewP2HForUnit}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onNavigateToHistory={() => setView('history')}
          />
        )}

        {view === 'form' && (
          <div>
            <div className="mb-4 sm:mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {editingRecord ? `Pemeriksaan Unit: ${editingRecord.unitName}` : 'Form Pemeriksaan P2H Online'}
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-500">
                  Pre-Operation Inspection Checklist · Berdasarkan Standar Keselamatan Operasi PT. PST
                </p>
              </div>

              {editingRecord && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingRecord(null);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors self-start sm:self-auto"
                >
                  + Buat Form Baru Kosong
                </button>
              )}
            </div>

            <P2HFormInteractive
              key={editingRecord ? editingRecord.id : `new-form-${currentUser.id}`}
              initialRecord={editingRecord}
              currentUser={currentUser}
              onSave={handleSaveRecord}
              onPreviewPrint={handlePreviewPrint}
              onCancel={() => setView(currentUser.role === 'admin' ? 'recap' : 'history')}
            />
          </div>
        )}

        {view === 'history' && (
          <div>
            <div className="mb-4 sm:mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 pb-3">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {currentUser.role === 'admin'
                    ? 'Riwayat Pemeriksaan P2H Seluruh Armada'
                    : 'Riwayat Pengisian P2H Saya'}
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-500">
                  {currentUser.role === 'admin'
                    ? 'Kontrol penuh monitoring seluruh armada unit, verifikasi foreman, dan arsip cetak PDF'
                    : 'Monitoring status pemeriksaan dan arsip tanda tangan unit yang Anda periksa secara pribadi'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingRecord(null);
                  setView('form');
                }}
                className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors shadow-xs self-start sm:self-auto"
              >
                + Isi Form P2H Baru
              </button>
            </div>

            <P2HHistoryList
              records={records}
              currentUser={currentUser}
              onOpenRecord={handleOpenEdit}
              onPrintRecord={handlePreviewPrint}
              onForemanSign={handleForemanSignStart}
              onDeleteRecord={handleDeleteRecord}
              onDeleteMultipleRecords={handleDeleteMultipleRecords}
              onClearAllDummyRecords={handleClearAllDummyRecords}
              onNewForm={() => {
                setEditingRecord(null);
                setView('form');
              }}
            />
          </div>
        )}

        {/* Admin Only: Kelola User View */}
        {view === 'users' && currentUser.role === 'admin' && (
          <UserManagement
            currentUser={currentUser}
            p2hRecords={records}
            onToast={showToast}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500 no-print">
        <p className="font-medium">
          Sistem Form P2H Online, Tanda Tangan Digital & Rekap Monitoring Harian K3
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Tersinkronisasi real-time dengan database Google Firebase Firestore · Multi-Role RBAC (Admin & Operator)
        </p>
      </footer>

      {/* Auth / Account Management Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleUserChange}
      />

      {/* Print Preview Modal */}
      {previewRecord && (
        <PrintPreviewModal
          isOpen={true}
          record={previewRecord}
          onClose={() => setPreviewRecord(null)}
          onOpenForemanSign={
            currentUser?.role === 'admin'
              ? () => {
                  setForemanSigningRecord(previewRecord);
                }
              : undefined
          }
        />
      )}

      {/* Foreman Quick Sign Modal */}
      {foremanSigningRecord && (
        <SignaturePadModal
          isOpen={true}
          roleLabel="Foreman / Pengawas"
          title={`Verifikasi & Tanda Tangan Atasan (${foremanSigningRecord.unitName})`}
          initialSignerName={foremanSigningRecord.foremanName || ''}
          onClose={() => setForemanSigningRecord(null)}
          onSave={handleForemanSignComplete}
        />
      )}

      {/* Guidelines Modal */}
      <P2HGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Hidden container specifically rendered when window.print() is called outside modal */}
      {printableTargetRecord && (
        <div className="print-only">
          <P2HPrintTemplate record={printableTargetRecord} />
        </div>
      )}
    </div>
  );
}
