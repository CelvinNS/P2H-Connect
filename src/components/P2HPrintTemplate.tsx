import React from 'react';
import {
  P2HRecord,
  P2H_CHECKLIST_DATA,
  P2H_CHECKLIST_BUS,
  getP2HChecklist,
} from '../types/p2h';
import { isBusUnit } from '../utils/recapStorage';

interface P2HPrintTemplateProps {
  record: P2HRecord;
}

export const P2HPrintTemplate: React.FC<P2HPrintTemplateProps> = ({ record }) => {
  const isBus =
    record.p2hCategory === 'Bus' ||
    isBusUnit({ unitName: record.unitName, unitType: record.unitType });

  const activeChecklist = isBus ? P2H_CHECKLIST_BUS : P2H_CHECKLIST_DATA;

  const categoryAItems = activeChecklist.filter((i) => i.category === 'A');
  const categoryBItems = activeChecklist.filter((i) => i.category === 'B');
  const categoryCItems = activeChecklist.filter((i) => i.category === 'C');

  return (
    <div
      className="p2h-print-document text-black bg-white mx-auto text-[11px] leading-normal select-text"
      style={{
        fontFamily: 'Arial, Helvetica, "Plus Jakarta Sans", sans-serif',
        width: '100%',
        boxSizing: 'border-box',
        letterSpacing: '0px',
      }}
    >
      {/* Title */}
      <div className="text-center pb-2 border-b-2 border-black mb-2">
        <h1 className="text-[14px] sm:text-[15px] font-bold uppercase leading-normal" style={{ letterSpacing: '0px' }}>
          {isBus
            ? 'FORM PENGECEKKAN DAN PERAWATAN HARIAN ( P2H ) BUS'
            : 'FORM P2H (PEMERIKSAAN SEBELUM PENGOPERASIAN) LIGHT VEHICLE'}
        </h1>
        <p className="text-[11px] sm:text-[12px] italic text-slate-800 leading-normal mt-0.5">
          {isBus
            ? 'PST OPERATION DEPARTMENT - K3 & FLEET SAFETY CHECKLIST'
            : '(Pre-Operation Inspection Checklist)'}
        </p>
      </div>

      {/* Top Metadata Grid */}
      <table
        className="w-full border-collapse border border-black mb-2 text-[11px]"
        style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%' }}
      >
        <tbody>
          <tr>
            <td
              className="border border-black font-semibold align-middle bg-slate-100"
              style={{ width: '22%', verticalAlign: 'middle', padding: '6px 8px', lineHeight: '1.3', fontWeight: 600 }}
            >
              Nama Unit / No. Unit
            </td>
            <td
              className="border border-black font-bold align-middle text-slate-900 bg-amber-50/60"
              style={{ width: '28%', verticalAlign: 'middle', padding: '6px 8px', lineHeight: '1.3', fontWeight: 700 }}
            >
              {record.unitName || '-'}
            </td>
            <td
              className="border border-black font-semibold align-middle bg-[#ffff99]"
              style={{ width: '18%', verticalAlign: 'middle', padding: '6px 8px', lineHeight: '1.3', fontWeight: 600 }}
            >
              Tanggal
            </td>
            <td
              className="border border-black align-middle bg-[#ffff99] font-medium"
              style={{ width: '32%', verticalAlign: 'middle', padding: '6px 8px', lineHeight: '1.3' }}
            >
              {record.date || '-'}
            </td>
          </tr>
          <tr>
            <td
              className="border border-black font-semibold align-middle bg-slate-100"
              style={{ width: '22%', verticalAlign: 'middle', padding: '6px 8px', lineHeight: '1.3', fontWeight: 600 }}
            >
              Jenis Unit
            </td>
            <td
              className="border border-black align-middle text-slate-900 font-semibold"
              style={{ width: '28%', verticalAlign: 'middle', padding: '6px 8px', lineHeight: '1.3' }}
            >
              {record.unitType || (isBus ? 'Bus' : 'LV')}
            </td>
            <td
              className="border border-black font-semibold align-middle bg-[#ffff99]"
              style={{ width: '18%', verticalAlign: 'middle', padding: '6px 8px', lineHeight: '1.3', fontWeight: 600 }}
            >
              Shift
            </td>
            <td
              className="border border-black align-middle bg-[#ffff99] font-medium"
              style={{ width: '32%', verticalAlign: 'middle', padding: '6px 8px', lineHeight: '1.3' }}
            >
              {record.shift || '-'}
            </td>
          </tr>
          <tr>
            <td
              className="border border-black font-semibold align-middle bg-slate-100"
              style={{ width: '22%', verticalAlign: 'middle', padding: '6px 8px', lineHeight: '1.3', fontWeight: 600 }}
            >
              Nama Operator / Driver
            </td>
            <td
              className="border border-black align-middle text-slate-900 font-medium"
              style={{ width: '28%', verticalAlign: 'middle', padding: '6px 8px', lineHeight: '1.3' }}
            >
              {record.operatorName || '-'}
            </td>
            <td
              className="border border-black font-semibold align-middle bg-[#ffff99]"
              style={{ width: '18%', verticalAlign: 'middle', padding: '6px 8px', lineHeight: '1.3', fontWeight: 600 }}
            >
              KM / HM Unit
            </td>
            <td
              className="border border-black align-middle bg-[#ffff99] font-bold"
              style={{ width: '32%', verticalAlign: 'middle', padding: '6px 8px', lineHeight: '1.3' }}
            >
              {record.kmHm || '-'}
            </td>
          </tr>
          <tr>
            <td
              className="border border-black font-semibold align-middle bg-slate-100"
              style={{ width: '22%', verticalAlign: 'middle', padding: '6px 8px', lineHeight: '1.3', fontWeight: 600 }}
            >
              Kesiapan Unit
            </td>
            <td
              className="border border-black align-middle font-bold"
              style={{ width: '28%', verticalAlign: 'middle', padding: '6px 8px', lineHeight: '1.3' }}
            >
              {record.unitConditionStatus === 'BD' ? (
                <span
                  style={{ color: '#b91c1c', backgroundColor: '#fee2e2', display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '10.5px' }}
                >
                  BD (BREAKDOWN)
                </span>
              ) : record.unitConditionStatus === 'BU' ? (
                <span
                  style={{ color: '#78350f', backgroundColor: '#fef3c7', display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '10.5px' }}
                >
                  BU (BACKUP UNIT)
                </span>
              ) : record.unitConditionStatus === 'STANDBY' ? (
                <span
                  style={{ color: '#7c2d12', backgroundColor: '#ffedd5', display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '10.5px' }}
                >
                  STANDBY
                </span>
              ) : (
                <span
                  style={{ color: '#065f46', backgroundColor: '#d1fae5', display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '10.5px' }}
                >
                  RFU (READY FOR USE)
                </span>
              )}
            </td>
            <td
              className="border border-black font-semibold align-middle bg-[#ffff99]"
              style={{ width: '18%', verticalAlign: 'middle', padding: '6px 8px', lineHeight: '1.3', fontWeight: 600 }}
            >
              Kondisi Teknis
            </td>
            <td
              className="border border-black align-middle bg-[#ffff99] font-bold"
              style={{ width: '32%', verticalAlign: 'middle', padding: '6px 8px', lineHeight: '1.3' }}
            >
              {record.unitConditionStatus === 'BD' ? (
                <span style={{ color: '#b91c1c', fontWeight: 800, fontSize: '10.5px' }}>
                  TIDAK LAYAK OPERASI (B/D)
                </span>
              ) : record.status === 'stop_operasi' ? (
                <span style={{ color: '#b91c1c', fontWeight: 800, fontSize: '10.5px' }}>
                  TIDAK LAYAK OPERASI (KODE AA)
                </span>
              ) : record.status === 'perlu_perbaikan' ? (
                <span style={{ color: '#92400e', fontWeight: 700, fontSize: '10.5px' }}>
                  PERLU PERBAIKAN (KODE A)
                </span>
              ) : (
                <span style={{ color: '#065f46', fontWeight: 700, fontSize: '10.5px' }}>
                  LAYAK OPERASI (NORMAL)
                </span>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Driver Fit to Work Questionnaire (Khusus Bus / Tambang) */}
      {isBus && record.fitToWork && (
        <div className="border border-black mb-2 p-1.5 bg-amber-50/40 text-[10px] leading-normal">
          <div className="font-bold underline text-slate-900 mb-1">
            PENILAIAN KELAYAKAN BEKERJA DRIVER (FIT TO WORK) :
          </div>
          <table
            className="w-full border-collapse border border-black text-[10px]"
            style={{ borderCollapse: 'collapse', tableLayout: 'auto', width: '100%' }}
          >
            <thead>
              <tr style={{ backgroundColor: '#e2e8f0', color: '#000000' }}>
                <th
                  className="border border-black px-3 py-1.5 text-left font-bold"
                  style={{ padding: '6px 10px', lineHeight: '1.3', verticalAlign: 'middle' }}
                >
                  Pemeriksaan Kesehatan Mandiri
                </th>
                <th
                  className="border border-black px-3 py-1.5 text-center font-bold"
                  style={{ padding: '6px 8px', width: '140px', minWidth: '140px', lineHeight: '1.3', verticalAlign: 'middle' }}
                >
                  Jawaban Driver
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black px-2 py-1">Jumlah Jam Tidur Sebelum Masuk Shift (Minimal 6-7 Jam)</td>
                <td className="border border-black px-2.5 py-1 text-center font-bold">
                  {record.fitToWork.jumlahJamTidur ? `${record.fitToWork.jumlahJamTidur} Jam` : '-'}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1">Apakah Mengonsumsi Obat yang Menyebabkan Kantuk?</td>
                <td className="border border-black px-2.5 py-1 text-center font-bold">
                  {record.fitToWork.minumObat === 'ya' ? 'YA (Waspada)' : record.fitToWork.minumObat === 'tidak' ? 'TIDAK' : '-'}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1">Apakah Tubuh Dalam Kondisi Sehat & Fit (Bebas Demam/Pusing)?</td>
                <td className="border border-black px-2.5 py-1 text-center font-bold">
                  {record.fitToWork.dalamKondisiFit === 'ya' ? 'YA (Sehat)' : record.fitToWork.dalamKondisiFit === 'tidak' ? 'TIDAK (Kurang Fit)' : '-'}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1">Apakah Siap Mengemudikan Bus dengan Aman Sepanjang Shift?</td>
                <td className="border border-black px-2.5 py-1 text-center font-bold text-emerald-800">
                  {record.fitToWork.siapBekerja === 'ya' ? 'SIAP BEKERJA' : record.fitToWork.siapBekerja === 'tidak' ? 'TIDAK SIAP' : '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Keterangan Petunjuk Pengisian */}
      <div className="border border-black px-2.5 py-1 mb-2 text-[10px] leading-snug bg-slate-50/50">
        <p className="font-bold underline mb-0.5">Keterangan :</p>
        <p className="pl-1">1. Beri tanda (√) pada kolom Kondisi</p>
        <p className="pl-4">- Kondisi Baik / Normal</p>
        <p className="pl-4">- Kondisi Rusak / Tidak Normal</p>
        <p className="pl-1">2. Tuliskan di kolom Catatan, apabila ada informasi tambahan mengenai kerusakan yang terjadi</p>
      </div>

      {/* Checklist Table */}
      <table
        className="w-full border-collapse border border-black text-[10.5px]"
        style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%' }}
      >
        <thead>
          <tr style={{ backgroundColor: '#e2e8f0', color: '#000000' }}>
            <th
              className="border border-black text-center font-bold"
              style={{
                width: '42px',
                minWidth: '42px',
                padding: '9px 4px',
                verticalAlign: 'middle',
                textAlign: 'center',
                lineHeight: '1.3',
              }}
            >
              NO
            </th>
            <th
              className="border border-black text-center font-bold"
              style={{
                padding: '9px 8px',
                verticalAlign: 'middle',
                textAlign: 'center',
                lineHeight: '1.3',
              }}
            >
              ITEM YANG DIPERIKSA
            </th>
            <th
              className="border border-black text-center font-bold"
              style={{
                width: '85px',
                minWidth: '85px',
                padding: '9px 4px',
                verticalAlign: 'middle',
                textAlign: 'center',
                lineHeight: '1.3',
              }}
            >
              KODE BAHAYA
            </th>
            <th
              className="border border-black text-center font-bold"
              style={{
                width: '64px',
                minWidth: '64px',
                padding: '6px 4px',
                verticalAlign: 'middle',
                textAlign: 'center',
                lineHeight: '1.25',
              }}
            >
              <div style={{ fontSize: '9px', fontWeight: 600, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                KONDISI
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', marginTop: '1px' }}>
                BAIK
              </div>
            </th>
            <th
              className="border border-black text-center font-bold"
              style={{
                width: '64px',
                minWidth: '64px',
                padding: '6px 4px',
                verticalAlign: 'middle',
                textAlign: 'center',
                lineHeight: '1.25',
              }}
            >
              <div style={{ fontSize: '9px', fontWeight: 600, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                KONDISI
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', marginTop: '1px' }}>
                RUSAK
              </div>
            </th>
            <th
              className="border border-black text-center font-bold"
              style={{
                width: '26%',
                minWidth: '150px',
                padding: '9px 8px',
                verticalAlign: 'middle',
                textAlign: 'center',
                lineHeight: '1.3',
              }}
            >
              CATATAN
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Section A */}
          <tr style={{ backgroundColor: '#cbd5e1' }}>
            <td
              colSpan={6}
              className="border border-black font-bold text-[11px]"
              style={{ color: '#0f172a', padding: '6px 10px', lineHeight: '1.3', fontWeight: 700 }}
            >
              {isBus ? 'A. PEMERIKSAAN KELILING UNIT / DILUAR CABIN' : 'A. Pemeriksaan Keliling Unit / Diluar Kabin'}
            </td>
          </tr>
          {categoryAItems.map((item) => {
            const check = record.items[item.id];
            const isBaik = check?.condition === 'baik';
            const isRusak = check?.condition === 'rusak';
            const isAA = item.dangerCode === 'AA';

            return (
              <tr key={item.id} className="hover:bg-slate-50/80">
                <td className="border border-black text-center py-0.5 font-medium">{item.no}</td>
                <td className="border border-black px-2 py-0.5 font-medium">{item.name}</td>
                <td
                  style={isAA ? { backgroundColor: '#fee2e2', color: '#881337', fontWeight: 900 } : { backgroundColor: '#fffbeb', color: '#1e293b' }}
                  className="border border-black text-center font-bold py-0.5"
                >
                  {item.dangerCode}
                </td>
                <td className="border border-black text-center py-0.5 font-bold" style={{ color: '#0f172a' }}>
                  {isBaik ? '√' : ''}
                </td>
                <td className="border border-black text-center py-0.5 font-bold" style={{ color: '#dc2626' }}>
                  {isRusak ? '√' : ''}
                </td>
                <td className="border border-black px-2 py-0.5 text-[10px] break-words" style={{ color: '#1e293b' }}>
                  {check?.note || ''}
                </td>
              </tr>
            );
          })}

          {/* Section B */}
          <tr style={{ backgroundColor: '#cbd5e1' }}>
            <td
              colSpan={6}
              className="border border-black font-bold text-[11px]"
              style={{ color: '#0f172a', padding: '6px 10px', lineHeight: '1.3', fontWeight: 700 }}
            >
              {isBus ? 'B. PEMERIKSAAN DIDALAM KABIN' : 'B. Pemeriksaan Didalam Kabin'}
            </td>
          </tr>
          {categoryBItems.map((item) => {
            const check = record.items[item.id];
            const isBaik = check?.condition === 'baik';
            const isRusak = check?.condition === 'rusak';
            const isAA = item.dangerCode === 'AA';

            return (
              <tr key={item.id} className="hover:bg-slate-50/80">
                <td className="border border-black text-center py-0.5 font-medium">{item.no}</td>
                <td className="border border-black px-2 py-0.5 font-medium">{item.name}</td>
                <td
                  style={isAA ? { backgroundColor: '#fee2e2', color: '#881337', fontWeight: 900 } : { backgroundColor: '#fffbeb', color: '#1e293b' }}
                  className="border border-black text-center font-bold py-0.5"
                >
                  {item.dangerCode}
                </td>
                <td className="border border-black text-center py-0.5 font-bold" style={{ color: '#0f172a' }}>
                  {isBaik ? '√' : ''}
                </td>
                <td className="border border-black text-center py-0.5 font-bold" style={{ color: '#dc2626' }}>
                  {isRusak ? '√' : ''}
                </td>
                <td className="border border-black px-2 py-0.5 text-[10px] break-words" style={{ color: '#1e293b' }}>
                  {check?.note || ''}
                </td>
              </tr>
            );
          })}

          {/* Section C */}
          <tr style={{ backgroundColor: '#cbd5e1' }}>
            <td
              colSpan={6}
              className="border border-black font-bold text-[11px]"
              style={{ color: '#0f172a', padding: '6px 10px', lineHeight: '1.3', fontWeight: 700 }}
            >
              {isBus ? 'C. KELENGKAPAN TAMBAHAN' : 'C. Kelengkapan Tambahan'}
            </td>
          </tr>
          {categoryCItems.map((item) => {
            const check = record.items[item.id];
            const isBaik = check?.condition === 'baik';
            const isRusak = check?.condition === 'rusak';
            const isAA = item.dangerCode === 'AA';

            return (
              <tr key={item.id} className="hover:bg-slate-50/80">
                <td className="border border-black text-center py-0.5 font-medium">{item.no}</td>
                <td className="border border-black px-2 py-0.5 font-medium">{item.name}</td>
                <td
                  style={isAA ? { backgroundColor: '#fee2e2', color: '#881337', fontWeight: 900 } : { backgroundColor: '#fffbeb', color: '#1e293b' }}
                  className="border border-black text-center font-bold py-0.5"
                >
                  {item.dangerCode}
                </td>
                <td className="border border-black text-center py-0.5 font-bold" style={{ color: '#0f172a' }}>
                  {isBaik ? '√' : ''}
                </td>
                <td className="border border-black text-center py-0.5 font-bold" style={{ color: '#dc2626' }}>
                  {isRusak ? '√' : ''}
                </td>
                <td className="border border-black px-2 py-0.5 text-[10px] break-words" style={{ color: '#1e293b' }}>
                  {check?.note || ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Penting Notice Box */}
      <div className="border border-black mt-1 p-1.5 text-[9.5px] leading-tight bg-slate-50">
        <p className="font-bold underline mb-0.5">Penting :</p>
        <p>1. Kode Bahaya AA = Unit harus diperbaiki sebelum dioperasikan ( STOP OPERASI )</p>
        <p className="pl-3">Kode A = Kerusakan yang harus diperbaiki dalam waktu 1x12 jam</p>
        <p>2. P2H harus diserahkan ke Foreman diawal shift dan diverifikasi tanda tangan Administrator / Pengawas</p>
        <p>3. Mengoperasikan alat dengan kerusakan kode bahaya AA, akan dikenai sangsi sesuai PKB</p>
        <p className="font-bold">4. Apabila ditemukan 1 kondisi atau lebih dengan kode bahaya AA, maka unit langsung ( STOP OPERASI )</p>
      </div>

      {/* Signature Section - exact side by side boxes */}
      <div className="mt-2 grid grid-cols-2 gap-4">
        {/* Dilaporkan Oleh (Operator) */}
        <div className="border border-black p-2 flex flex-col justify-between min-h-[110px] bg-white">
          <div className="font-bold text-[11px] border-b border-black pb-1 mb-1">
            Dilaporkan Oleh
          </div>
          <div className="flex-1 flex items-center justify-center py-1">
            {record.operatorSignature ? (
              <img
                src={record.operatorSignature}
                alt="Tanda Tangan Operator"
                className="max-h-[58px] max-w-[190px] object-contain"
              />
            ) : (
              <div className="text-[10px] text-slate-400 italic">Belum ditandatangani</div>
            )}
          </div>
          <div className="text-center pt-1 border-t border-dotted border-black/40">
            <div className="font-bold text-[10.5px]">
              ( {record.operatorName ? record.operatorName : '........................................'} )
            </div>
            <div className="text-[10px] text-slate-700">{isBus ? 'Driver Bus' : 'Operator'}</div>
            {record.operatorSignedAt && (
              <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                TTD: {record.operatorSignedAt}
              </div>
            )}
          </div>
        </div>

        {/* Diketahui Oleh (Foreman / Pengawas) */}
        <div className="border border-black p-2 flex flex-col justify-between min-h-[110px] bg-white">
          <div className="font-bold text-[11px] border-b border-black pb-1 mb-1">
            Diketahui Oleh
          </div>
          <div className="flex-1 flex items-center justify-center py-1">
            {record.foremanSignature ? (
              <img
                src={record.foremanSignature}
                alt="Tanda Tangan Foreman"
                className="max-h-[58px] max-w-[190px] object-contain"
              />
            ) : (
              <div className="text-[10px] text-slate-400 italic">
                (Menunggu Tanda Tangan Atasan / Pengawas)
              </div>
            )}
          </div>
          <div className="text-center pt-1 border-t border-dotted border-black/40">
            <div className="font-bold text-[10.5px]">
              ( {record.foremanName ? record.foremanName : '........................................'} )
            </div>
            <div className="text-[10px] text-slate-700">Foreman / Pengawas K3</div>
            {record.foremanSignedAt && (
              <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                TTD: {record.foremanSignedAt}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
