import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, RotateCcw, Check, PenTool } from 'lucide-react';

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string, signerName: string) => void;
  title: string;
  initialSignerName?: string;
  roleLabel: string; // e.g. "Operator" or "Foreman / Pengawas"
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
  initialSignerName = '',
  roleLabel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signerName, setSignerName] = useState(initialSignerName);
  const [strokeCount, setStrokeCount] = useState(0);
  const [inkColor, setInkColor] = useState('#1e3a8a'); // Professional blue ink default
  const strokeHistoryRef = useRef<ImageData[]>([]);

  // Update signer name when initialSignerName changes
  useEffect(() => {
    if (initialSignerName) {
      setSignerName(initialSignerName);
    }
  }, [initialSignerName]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    ctx.scale(ratio, ratio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = inkColor;

    // Background white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Baseline guide line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, rect.height - 35);
    ctx.lineTo(rect.width - 30, rect.height - 35);
    ctx.stroke();

    // Reset stroke history
    strokeHistoryRef.current = [];
    setStrokeCount(0);
  }, [inkColor]);

  useEffect(() => {
    if (isOpen) {
      // Small timeout to let DOM render modal size
      const timer = setTimeout(() => {
        initCanvas();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initCanvas]);

  if (!isOpen) return null;

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Save current frame for undo
    strokeHistoryRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));

    const { x, y } = getPos(e);
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setStrokeCount((prev) => prev + 1);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    initCanvas();
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (strokeHistoryRef.current.length > 0) {
      const lastState = strokeHistoryRef.current.pop();
      if (lastState) {
        ctx.putImageData(lastState, 0, 0);
        setStrokeCount((prev) => Math.max(0, prev - 1));
      }
    }
  };

  const handleSaveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (strokeCount === 0) {
      alert('Silakan buat goresan tanda tangan terlebih dahulu pada kotak!');
      return;
    }

    if (!signerName.trim()) {
      alert(`Mohon masukkan nama ${roleLabel} terlebih dahulu!`);
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl, signerName.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-700 shrink-0">
              <PenTool className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">{title}</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">Tanda Tangan Digital Resmi ({roleLabel})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Lengkap ({roleLabel}) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder={`Contoh: Budi Santoso (${roleLabel})`}
              className="w-full px-3.5 py-2 text-base sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-medium bg-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Goreskan Tanda Tangan <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-[11px] text-slate-400">Tinta:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setInkColor('#1e3a8a')}
                    className={`w-5 h-5 rounded-full border-2 transition-transform ${
                      inkColor === '#1e3a8a' ? 'scale-110 border-slate-900 ring-1 ring-blue-500' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: '#1e3a8a' }}
                    title="Tinta Biru Dokumen"
                  />
                  <button
                    type="button"
                    onClick={() => setInkColor('#0f172a')}
                    className={`w-5 h-5 rounded-full border-2 transition-transform ${
                      inkColor === '#0f172a' ? 'scale-110 border-slate-900 ring-1 ring-slate-700' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: '#0f172a' }}
                    title="Tinta Hitam"
                  />
                </div>
              </div>
            </div>

            {/* Canvas Box */}
            <div className="relative border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-white touch-none shadow-inner">
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="w-full h-40 sm:h-48 cursor-crosshair block touch-none"
              />
              <div className="absolute bottom-2 left-3 sm:left-4 text-[10px] sm:text-[11px] text-slate-400 pointer-events-none select-none">
                Gunakan jari, stylus, atau mouse
              </div>
              {strokeCount === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none text-slate-300 text-xs sm:text-sm font-medium">
                  Tanda tangani di sini
                </div>
              )}
            </div>

            {/* Canvas Controls */}
            <div className="flex items-center justify-between mt-2 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={strokeHistoryRef.current.length === 0}
                  className="h-8 px-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-md font-medium transition-colors flex items-center gap-1 active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Urung</span>
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="h-8 px-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-md font-medium transition-colors active:scale-95"
                >
                  Bersihkan
                </button>
              </div>
              <span className="text-slate-400 font-mono text-[10px] sm:text-[11px]">
                {strokeCount > 0 ? `${strokeCount} goresan` : 'Belum ada tanda tangan'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-10 sm:h-9 px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSaveSignature}
            className="h-10 sm:h-9 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 active:scale-98"
          >
            <Check className="w-4 h-4" />
            <span>Terapkan Tanda Tangan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
