import React from 'react';
import { X, ShieldAlert, CheckCircle2, AlertTriangle, FileText, Printer, PenTool } from 'lucide-react';

interface P2HGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const P2HGuideModal: React.FC<P2HGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                Panduan Operasional & Standar K3 P2H
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                Pemeriksaan Sebelum Pengoperasian Alat / Kendaraan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto text-xs text-slate-700 leading-relaxed">
          {/* Section 1 */}
          <div>
            <h4 className="font-bold text-sm text-slate-900 mb-1.5 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600 shrink-0" />
              1. Definisi & Kewajiban P2H
            </h4>
            <p>
              P2H (Pemeriksaan Sebelum Pengoperasian) adalah prosedur inspeksi wajib yang dilakukan oleh Operator sebelum mengoperasikan alat berat atau kendaraan operasional pada setiap awal giliran kerja (shift). Prosedur ini bertujuan untuk mendeteksi potensi kegagalan mekanis, bahaya keselamatan, serta mencegah terjadinya insiden di area kerja.
            </p>
          </div>

          {/* Section 2 */}
          <div className="p-3 sm:p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <h4 className="font-bold text-xs sm:text-sm text-slate-900">
              2. Kategori Kode Bahaya & Tindakan
            </h4>

            <div className="space-y-2">
              <div className="p-2.5 sm:p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <div className="flex items-center gap-1.5 text-rose-800 font-bold mb-1 text-xs">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  KODE BAHAYA AA (STOP OPERASI)
                </div>
                <p className="text-rose-950 text-[11px] leading-snug">
                  Merupakan kerusakan komponen keselamatan primer atau komponen kritikal.
                  Jika ditemukan <strong>1 kondisi atau lebih</strong> dengan Kode Bahaya AA,
                  maka unit <strong>LANGSUNG DILARANG DIOPERASIKAN (STOP OPERASI)</strong>.
                  Mengoperasikan unit dengan kerusakan AA merupakan pelanggaran berat dan dikenai sanksi sesuai PKB.
                </p>
              </div>

              <div className="p-2.5 sm:p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-1.5 text-amber-800 font-bold mb-1 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  KODE BAHAYA A (PERBAIKAN 1x12 JAM)
                </div>
                <p className="text-amber-950 text-[11px] leading-snug">
                  Kerusakan pada komponen sekunder yang tidak langsung menimbulkan bahaya fatal seketika. Unit wajib dijadwalkan dan diselesaikan perbaikannya dalam waktu maksimal <strong>1x12 jam</strong> oleh tim mekanik/workshop.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div>
            <h4 className="font-bold text-sm text-slate-900 mb-1.5 flex items-center gap-2">
              <PenTool className="w-4 h-4 text-indigo-600 shrink-0" />
              3. Alur Tanda Tangan Digital & Pelaporan
            </h4>
            <ol className="list-decimal pl-5 space-y-1 text-slate-600">
              <li>
                <strong>Operator Mengisi Form:</strong> Periksa seluruh 27 item fisik unit. Beri tanda Baik atau Rusak.
              </li>
              <li>
                <strong>Tanda Tangan Operator:</strong> Buka canvas tanda tangan digital pada kotak &quot;Dilaporkan Oleh&quot; dan goreskan tanda tangan Anda.
              </li>
              <li>
                <strong>Verifikasi Foreman / Pengawas:</strong> Serahkan atau buka form untuk Foreman. Foreman melakukan inspeksi ulang, memberikan catatan disposisi mekanik, lalu menandatangani pada kotak &quot;Diketahui Oleh&quot;.
              </li>
            </ol>
          </div>

          {/* Section 4 */}
          <div>
            <h4 className="font-bold text-sm text-slate-900 mb-1.5 flex items-center gap-2">
              <Printer className="w-4 h-4 text-emerald-600 shrink-0" />
              4. Petunjuk Ekspor & Cetak PDF Standar
            </h4>
            <p className="mb-1.5">
              Aplikasi ini telah dirancang dengan format dan proporsi tabel persis sesuai template resmi:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Klik tombol <strong>&quot;Pratinjau & Cetak PDF&quot;</strong> pada form atau riwayat.</li>
              <li>Di jendela cetak peramban (browser print dialog), pilih tujuan/destination <strong>&quot;Save as PDF&quot;</strong>.</li>
              <li>Pastikan centang opsi <em>&quot;Background graphics&quot;</em> / <em>&quot;Grafik latar belakang&quot;</em> agar warna kuning dan aksen merah tercetak sempurna.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors active:scale-98"
          >
            Mengerti & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
