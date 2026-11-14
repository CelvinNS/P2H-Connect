import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas-pro';
import { P2HRecord } from '../types/p2h';
import { P2HPrintTemplate } from './P2HPrintTemplate';
import { Printer, X, Download, ShieldCheck, PenTool, Image as ImageIcon, Check } from 'lucide-react';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: P2HRecord;
  onOpenForemanSign?: () => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  record,
  onOpenForemanSign,
}) => {
  const printAreaRef = useRef<HTMLDivElement | null>(null);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [imageSaveSuccess, setImageSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    // Native window.print with custom media print styles
    window.print();
  };

  const handleSaveAsImage = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsSavingImage(true);

      // Wait for all fonts and images to settle
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise((r) => setTimeout(r, 250));

      const targetEl = printAreaRef.current;
      const cleanUnit = (record.unitName || 'UNIT').replace(/[^a-zA-Z0-9_-]/g, '_');
      const shiftTag = record.shift?.includes('2') ? 'S2' : 'S1';
      const fileName = `P2H_${cleanUnit}_${record.date || 'Laporan'}_${shiftTag}.png`;

      // Standard desktop A4 pixel width (800px)
      const exportWidth = 800;

      // Render target element using html2canvas-pro with exact fixed width so headers are never compressed or cut off
      const canvas = await html2canvas(targetEl, {
        scale: 2, // High resolution for crisp text & signatures
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width: exportWidth,
        windowWidth: exportWidth,
        onclone: (clonedDoc) => {
          clonedDoc.documentElement.style.width = `${exportWidth}px`;
          clonedDoc.body.style.width = `${exportWidth}px`;
          clonedDoc.body.style.margin = '0';
          clonedDoc.body.style.padding = '0';

          const docRoot = clonedDoc.querySelector('.p2h-print-document') as HTMLElement | null;
          if (docRoot) {
            docRoot.style.width = `${exportWidth}px`;
            docRoot.style.minWidth = `${exportWidth}px`;
            docRoot.style.maxWidth = `${exportWidth}px`;
            docRoot.style.backgroundColor = '#ffffff';
            docRoot.style.color = '#000000';
            docRoot.style.boxSizing = 'border-box';
            docRoot.style.padding = '16px';
            docRoot.style.margin = '0 auto';
            docRoot.style.fontFamily = 'Arial, Helvetica, "Plus Jakarta Sans", sans-serif';
          }

          const clonedParent = docRoot?.parentElement;
          if (clonedParent) {
            clonedParent.style.width = `${exportWidth}px`;
            clonedParent.style.minWidth = `${exportWidth}px`;
            clonedParent.style.maxWidth = `${exportWidth}px`;
            clonedParent.style.boxSizing = 'border-box';
            clonedParent.style.padding = '0';
            clonedParent.style.margin = '0 auto';
            clonedParent.style.backgroundColor = '#ffffff';
          }

          // Ensure all tables and table header cells have visible overflow, proper box-sizing, and font
          const allTables = clonedDoc.querySelectorAll('table');
          allTables.forEach((t) => {
            (t as HTMLElement).style.width = '100%';
            (t as HTMLElement).style.borderCollapse = 'collapse';
          });

          const cells = clonedDoc.querySelectorAll('th, td');
          cells.forEach((cell) => {
            const el = cell as HTMLElement;
            el.style.overflow = 'visible';
            el.style.boxSizing = 'border-box';
            el.style.fontFamily = 'Arial, Helvetica, "Plus Jakarta Sans", sans-serif';
          });
        },
      });

      const triggerDownload = (url: string, isObjectUrl = false) => {
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = fileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();

        setTimeout(() => {
          if (document.body.contains(downloadLink)) {
            document.body.removeChild(downloadLink);
          }
          if (isObjectUrl) {
            URL.revokeObjectURL(url);
          }
        }, 1500);

        setImageSaveSuccess(true);
        setTimeout(() => setImageSaveSuccess(false), 3000);
        setIsSavingImage(false);
      };

      if (canvas.toBlob) {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            triggerDownload(url, true);
          } else {
            // Fallback to dataURL
            const dataUrl = canvas.toDataURL('image/png');
            triggerDownload(dataUrl, false);
          }
        }, 'image/png');
      } else {
        const dataUrl = canvas.toDataURL('image/png');
        triggerDownload(dataUrl, false);
      }
    } catch (err: any) {
      console.error('Gagal menyimpan gambar P2H:', err);
      setIsSavingImage(false);
      alert(`Maaf, terjadi kendala saat membuat gambar PNG (${err?.message || 'Gagal merender'}). Silakan gunakan tombol Cetak / PDF.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col max-h-[96vh] my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-3.5 sm:px-5 py-3 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Printer className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                  Pratinjau & Cetak Form P2H
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                  Unit {record.unitName} · {record.date} ({record.shift})
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors sm:hidden"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 justify-end flex-wrap">
            {onOpenForemanSign && !record.foremanSignature && (
              <button
                type="button"
                onClick={onOpenForemanSign}
                className="h-8 px-2.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors flex items-center gap-1.5 active:scale-98"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>TTD Atasan</span>
              </button>
            )}

            {/* Save as PNG / Image Button */}
            <button
              type="button"
              onClick={handleSaveAsImage}
              disabled={isSavingImage}
              className="h-8 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5 active:scale-98 disabled:opacity-50"
              title="Simpan sebagai file gambar (PNG) agar memudahkan kirim via WhatsApp / grup chat"
            >
              {imageSaveSuccess ? (
                <Check className="w-3.5 h-3.5 text-white" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5" />
              )}
              <span>{isSavingImage ? 'Menyimpan...' : imageSaveSuccess ? 'Tersimpan!' : 'Simpan Gambar (PNG)'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="h-8 px-3.5 text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 active:scale-98"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors hidden sm:block ml-1"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tip Banner */}
        <div className="bg-emerald-50/70 border-b border-emerald-200 px-3 sm:px-4 py-2 flex items-center justify-between text-[11px] sm:text-xs text-emerald-950 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Petunjuk Ekspor:</strong> Klik <strong>&quot;Simpan Gambar (PNG)&quot;</strong> untuk langsung mengunduh gambar hasil P2H yang siap dikirim lewat WhatsApp/Telegram, atau klik <strong>&quot;Cetak / PDF&quot;</strong> untuk menyimpan file PDF A4 resmi.
            </span>
          </div>
        </div>

        {/* Mobile Horizontal Hint */}
        <div className="sm:hidden px-3 py-1 bg-slate-100 border-b border-slate-200 text-[10px] text-slate-600 text-center font-medium">
          Geser ke samping jika tabel A4 terpotong di layar ponsel
        </div>

        {/* Document Scroll Container */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-6 bg-slate-200/80">
          {/* Paper container */}
          <div
            ref={printAreaRef}
            data-print-area="true"
            className="w-full sm:w-[760px] min-w-[320px] sm:min-w-[760px] max-w-[800px] mx-auto bg-white shadow-xl p-3 sm:p-6 rounded-sm border border-slate-300"
          >
            <P2HPrintTemplate record={record} />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Status:</span>
            <strong
              className={`uppercase text-[11px] sm:text-xs font-bold ${
                record.unitConditionStatus === 'BD' || record.status === 'stop_operasi'
                  ? 'text-rose-600'
                  : record.status === 'perlu_perbaikan'
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {record.unitConditionStatus === 'BD'
                ? 'TIDAK LAYAK OPERASI (B/D)'
                : record.status === 'stop_operasi'
                ? 'TIDAK LAYAK OPERASI (STOP OPERASI)'
                : record.status === 'perlu_perbaikan'
                ? 'Perlu Perbaikan 1x12 Jam'
                : 'Siap Operasi'}
            </strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none h-8 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-none h-8 px-4 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 active:scale-98"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Cetak Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
