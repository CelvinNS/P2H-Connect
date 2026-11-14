export type DangerCode = 'AA' | 'A';

export interface P2HChecklistItem {
  id: string;
  category: 'A' | 'B' | 'C';
  categoryTitle: string;
  no: number;
  name: string;
  dangerCode: DangerCode;
  description?: string;
  commonIssues?: string[];
}

export interface ItemCheckStatus {
  condition: 'baik' | 'rusak';
  note?: string;
}

export type UnitReadinessStatus = 'RFU' | 'BU' | 'STANDBY' | 'BD';

export interface FitToWorkData {
  jumlahJamTidur: string; // e.g. "7"
  minumObat: 'ya' | 'tidak' | '';
  dalamKondisiFit: 'ya' | 'tidak' | '';
  adaMasalahPribadi: 'ya' | 'tidak' | '';
  siapBekerja: 'ya' | 'tidak' | '';
}

export interface P2HRecord {
  id: string;
  documentNo?: string;
  unitName: string;
  unitType: string;
  p2hCategory?: 'LV' | 'Bus'; // Explicit form category
  operatorName: string;
  userId?: string; // ID of the user who performed this P2H
  userCode?: string; // Unique user code (e.g. 'OPR-102')
  operatorRole?: 'admin' | 'user'; // Role of the submitter
  date: string; // YYYY-MM-DD
  shift: string; // 'Shift 1 (06:00 - 18:00)', 'Shift 2 (18:00 - 06:00)'
  kmHm: string;
  location?: string; // LOKASI KERJA
  hoJobSite?: string; // HO/JOB SITE
  unitConditionStatus?: UnitReadinessStatus; // RFU = Ready For Use, BU = Backup Unit, STANDBY = Standby, BD = Breakdown
  items: Record<string, ItemCheckStatus>;
  fitToWork?: FitToWorkData; // Khusus Form Bus / Driver Fit to Work
  operatorSignature: string | null;
  operatorSignedAt: string | null;
  foremanName: string;
  foremanSignature: string | null;
  foremanSignedAt: string | null;
  foremanNotes?: string;
  status: 'siap_operasi' | 'stop_operasi' | 'perlu_perbaikan';
  createdAt: string;
  updatedAt: string;
}

export const P2H_CHECKLIST_DATA: P2HChecklistItem[] = [
  // A. Pemeriksaan Keliling Unit / Diluar Kabin
  {
    id: 'a1',
    category: 'A',
    categoryTitle: 'A. Pemeriksaan Keliling Unit / Diluar Kabin',
    no: 1,
    name: 'Ban & Baut Roda',
    dangerCode: 'AA',
    description: 'Periksa keausan ban, tekanan angin, keretakan, dan kekencangan baut roda',
    commonIssues: ['Tekanan angin kurang', 'Baut roda kendor', 'Ban sobek/retak', 'Aus tidak rata'],
  },
  {
    id: 'a2',
    category: 'A',
    categoryTitle: 'A. Pemeriksaan Keliling Unit / Diluar Kabin',
    no: 2,
    name: 'Level Oil Engine',
    dangerCode: 'AA',
    description: 'Periksa dipstick oli mesin, pastikan berada di antara batas MIN & MAX',
    commonIssues: ['Level oli di bawah MIN', 'Oli keruh/bercampur air', 'Terdapat rembesan oli'],
  },
  {
    id: 'a3',
    category: 'A',
    categoryTitle: 'A. Pemeriksaan Keliling Unit / Diluar Kabin',
    no: 3,
    name: 'Kondisi Spion',
    dangerCode: 'AA',
    description: 'Periksa kelengkapan, kebersihan, dan keretakan kaca spion luar',
    commonIssues: ['Kaca spion retak/pecah', 'Braket spion kendor', 'Sudut pandang terhalang'],
  },
  {
    id: 'a4',
    category: 'A',
    categoryTitle: 'A. Pemeriksaan Keliling Unit / Diluar Kabin',
    no: 4,
    name: 'Air Radiator',
    dangerCode: 'AA',
    description: 'Periksa level air di reservoir radiator & kondisi selang/tutup',
    commonIssues: ['Air radiator kurang', 'Selang bocor/kendor', 'Tutup radiator rusak'],
  },
  {
    id: 'a5',
    category: 'A',
    categoryTitle: 'A. Pemeriksaan Keliling Unit / Diluar Kabin',
    no: 5,
    name: 'Level Oli Steering',
    dangerCode: 'AA',
    description: 'Periksa level cairan power steering / oli hidrolik kemudi',
    commonIssues: ['Level oli di bawah MIN', 'Ada kebocoran pada selang steering'],
  },
  {
    id: 'a6',
    category: 'A',
    categoryTitle: 'A. Pemeriksaan Keliling Unit / Diluar Kabin',
    no: 6,
    name: 'Level Oli Rem ( Brake Rem )',
    dangerCode: 'AA',
    description: 'Periksa tabung master rem minyak rem / brake fluid',
    commonIssues: ['Minyak rem di bawah MIN', 'Ada rembesan di master rem', 'Warna oli keruh'],
  },
  {
    id: 'a7',
    category: 'A',
    categoryTitle: 'A. Pemeriksaan Keliling Unit / Diluar Kabin',
    no: 7,
    name: 'Alarm Mundur',
    dangerCode: 'AA',
    description: 'Uji suara alarm mundur saat transmisi masuk posisi mundur (R)',
    commonIssues: ['Alarm mundur mati', 'Suara alarm terlalu pelan', 'Kabel terlepas'],
  },
  {
    id: 'a8',
    category: 'A',
    categoryTitle: 'A. Pemeriksaan Keliling Unit / Diluar Kabin',
    no: 8,
    name: 'Lampu Rotary ( Ketika Malam )',
    dangerCode: 'AA',
    description: 'Periksa fungsi lampu rotary / beacon keselamatan',
    commonIssues: ['Lampu rotary tidak berputar/mati', 'Mika pecah', 'Konektor kendor'],
  },
  {
    id: 'a9',
    category: 'A',
    categoryTitle: 'A. Pemeriksaan Keliling Unit / Diluar Kabin',
    no: 9,
    name: 'Buggy Whip',
    dangerCode: 'A',
    description: 'Periksa tiang bendera safety buggy whip dan lampu ujungnya',
    commonIssues: ['Tiang bengkok/patah', 'Lampu ujung mati', 'Pengikat kendor'],
  },
  {
    id: 'a10',
    category: 'A',
    categoryTitle: 'A. Pemeriksaan Keliling Unit / Diluar Kabin',
    no: 10,
    name: 'Kondisi Battery / Accu',
    dangerCode: 'A',
    description: 'Periksa terminal aki, kerak jamur putih, dan level air accu',
    commonIssues: ['Terminal aki berkerak/kendor', 'Level air aki rendah', 'Bracket aki kendor'],
  },
  {
    id: 'a11',
    category: 'A',
    categoryTitle: 'A. Pemeriksaan Keliling Unit / Diluar Kabin',
    no: 11,
    name: 'Air Wipper',
    dangerCode: 'A',
    description: 'Periksa volume tabung washer wiper & nozzle penyemprot',
    commonIssues: ['Tabung washer kosong', 'Nozzle tersumbat', 'Motor washer mati'],
  },
  {
    id: 'a12',
    category: 'A',
    categoryTitle: 'A. Pemeriksaan Keliling Unit / Diluar Kabin',
    no: 12,
    name: 'Kebersihan Alat',
    dangerCode: 'A',
    description: 'Periksa kebersihan bodi luar, lampu, dan kaca dari lumpur tebal',
    commonIssues: ['Lumpur menutupi lampu', 'Kaca depan kotor berlumpur', 'Radiator tertutup kotoran'],
  },

  // B. Pemeriksaan Didalam Kabin
  {
    id: 'b1',
    category: 'B',
    categoryTitle: 'B. Pemeriksaan Didalam Kabin',
    no: 1,
    name: 'Fungsi Brake',
    dangerCode: 'AA',
    description: 'Uji pedal service brake, parking brake/handbrake, dan exhaust brake',
    commonIssues: ['Pedal rem dalam / amblas', 'Rem tangan tidak mengunci', 'Jarak pengereman panjang'],
  },
  {
    id: 'b2',
    category: 'B',
    categoryTitle: 'B. Pemeriksaan Didalam Kabin',
    no: 2,
    name: 'Fungsi Steering / Reaksi Kemudi',
    dangerCode: 'AA',
    description: 'Periksa free play setir, kelancaran putaran, dan respon roda',
    commonIssues: ['Setir berat', 'Speling kemudi terlalu besar', 'Bunyi berdengung saat belok'],
  },
  {
    id: 'b3',
    category: 'B',
    categoryTitle: 'B. Pemeriksaan Didalam Kabin',
    no: 3,
    name: 'Fungsi Seat Belt / Sabuk Pengaman',
    dangerCode: 'AA',
    description: 'Uji penguncian sabuk pengaman dan fleksibilitas penarik otomatis',
    commonIssues: ['Sabuk tidak mengunci saat ditarik cepat', 'Buckle macet', 'Tali sobek/terjepit'],
  },
  {
    id: 'b4',
    category: 'B',
    categoryTitle: 'B. Pemeriksaan Didalam Kabin',
    no: 4,
    name: 'Fungsi Double Gardan ( 4WD )',
    dangerCode: 'AA',
    description: 'Uji pengaktifan sistem 4WD (4H / 4L / Differential Lock)',
    commonIssues: ['Indikator 4WD berkedip/tidak aktif', 'Tuas transfer case macet', 'Bunyi kasar saat engage'],
  },
  {
    id: 'b5',
    category: 'B',
    categoryTitle: 'B. Pemeriksaan Didalam Kabin',
    no: 5,
    name: 'Fungsi Lampu Kendaraan',
    dangerCode: 'AA',
    description: 'Periksa lampu utama (jauh/dekat), lampu kota, lampu sein, dan lampu rem',
    commonIssues: ['Lampu utama mati sebelah', 'Lampu rem mati', 'Lampu sein tidak berkedip'],
  },
  {
    id: 'b6',
    category: 'B',
    categoryTitle: 'B. Pemeriksaan Didalam Kabin',
    no: 6,
    name: 'Fungsi Mirror ( Spion )',
    dangerCode: 'AA',
    description: 'Periksa spion dalam kabin dan penyetelan sudut pandang',
    commonIssues: ['Spion dalam kabin goyang/kendor', 'Kaca buram/kotor'],
  },
  {
    id: 'b7',
    category: 'B',
    categoryTitle: 'B. Pemeriksaan Didalam Kabin',
    no: 7,
    name: 'Klakson ( Horn )',
    dangerCode: 'A',
    description: 'Uji suara klakson standar dan horn keselamatan',
    commonIssues: ['Klakson mati', 'Suara serak/pelan', 'Tombol klakson keras'],
  },
  {
    id: 'b8',
    category: 'B',
    categoryTitle: 'B. Pemeriksaan Didalam Kabin',
    no: 8,
    name: 'Wipper',
    dangerCode: 'A',
    description: 'Periksa karet wiper, motor penggerak, dan saklar kecepatan',
    commonIssues: ['Karet wiper getas/sobek', 'Gores kaca/sapuan tidak bersih', 'Motor kecepatan 2 mati'],
  },
  {
    id: 'b9',
    category: 'B',
    categoryTitle: 'B. Pemeriksaan Didalam Kabin',
    no: 9,
    name: 'APAR ( Alat Pemadam Api Ringan )',
    dangerCode: 'A',
    description: 'Periksa jarum indikator tekanan (area hijau), pin pengaman, dan tanggal kadaluarsa',
    commonIssues: ['Jarum tekanan di area merah', 'Pin pengaman hilang', 'APAR tidak terpasang di bracket'],
  },
  {
    id: 'b10',
    category: 'B',
    categoryTitle: 'B. Pemeriksaan Didalam Kabin',
    no: 10,
    name: 'Kotak ( PPGD ) P3K',
    dangerCode: 'A',
    description: 'Periksa ketersediaan kotak P3K dan kelengkapan obat darurat',
    commonIssues: ['Kotak P3K kosong', 'Obat kadaluarsa', 'Kotak P3K tidak ada'],
  },
  {
    id: 'b11',
    category: 'B',
    categoryTitle: 'B. Pemeriksaan Didalam Kabin',
    no: 11,
    name: 'Control Panel',
    dangerCode: 'A',
    description: 'Periksa speedometer, tachometer, indikator temperatur mesin, dan lampu peringatan',
    commonIssues: ['Check engine menyala', 'Indikator suhu naik tidak normal', 'Lampu dashboard mati'],
  },
  {
    id: 'b12',
    category: 'B',
    categoryTitle: 'B. Pemeriksaan Didalam Kabin',
    no: 12,
    name: 'Kebersihan Ruang Kabin',
    dangerCode: 'A',
    description: 'Pastikan kabin bersih dari sampah, debu berlebih, dan tidak ada barang lepas di lantai',
    commonIssues: ['Lantai kabin kotor berpasir', 'Ada botol/benda lepas di bawah pedal', 'Bau apek'],
  },
  {
    id: 'b13',
    category: 'B',
    categoryTitle: 'B. Pemeriksaan Didalam Kabin',
    no: 13,
    name: 'Radio Komunikasi',
    dangerCode: 'A',
    description: 'Periksa frekuensi channel tambang/operasional dan fungsi PTT mikrofon',
    commonIssues: ['Radio tidak menyala', 'Suara kresek-kresek/antena rusak', 'PTT mic macet'],
  },

  // C. Kelengkapan Tambahan
  {
    id: 'c1',
    category: 'C',
    categoryTitle: 'C. Kelengkapan Tambahan',
    no: 1,
    name: 'Traffic Cone ( Segi Tiga Pengaman )',
    dangerCode: 'A',
    description: 'Periksa ketersediaan minimal 2 buah traffic cone / segitiga pengaman darurat',
    commonIssues: ['Traffic cone kurang dari 2 buah', 'Pecah/pudar', 'Tidak ada dalam unit'],
  },
  {
    id: 'c2',
    category: 'C',
    categoryTitle: 'C. Kelengkapan Tambahan',
    no: 2,
    name: 'Wheel Chock ( Ganjal Ban )',
    dangerCode: 'A',
    description: 'Periksa ketersediaan minimal 2 buah ganjal ban standar beserta talinya',
    commonIssues: ['Ganjal ban tidak lengkap (hanya 1)', 'Ganjal ban rusak/patah', 'Tali pengait putus'],
  },
];

// Alias for explicit LV checklist
export const P2H_CHECKLIST_LV = P2H_CHECKLIST_DATA;

// ==========================================
// FORM PENGECEKKAN DAN PERAWATAN HARIAN ( P2H ) BUS
// Berdasarkan Format Standar Resmi Bus PT. PST
// ==========================================
export const P2H_CHECKLIST_BUS: P2HChecklistItem[] = [
  // A. PEMERIKSAAN KELILING UNIT / DILUAR CABIN
  {
    id: 'bus_a1_1',
    category: 'A',
    categoryTitle: 'A. PEMERIKSAAN KELILING UNIT / DILUAR CABIN',
    no: 1,
    name: 'Ban (Tyre) & Baut Roda - Ban Depan : Kanan (RHS)',
    dangerCode: 'AA',
    description: 'Periksa keausan ban, tekanan angin, keretakan, dan kekencangan baut roda depan kanan',
    commonIssues: ['Tekanan angin kurang', 'Baut roda kendor/hilang', 'Ban sobek/retak'],
  },
  {
    id: 'bus_a1_2',
    category: 'A',
    categoryTitle: 'A. PEMERIKSAAN KELILING UNIT / DILUAR CABIN',
    no: 1,
    name: 'Ban (Tyre) & Baut Roda - Ban Depan : Kiri (LHS)',
    dangerCode: 'AA',
    description: 'Periksa keausan ban, tekanan angin, keretakan, dan kekencangan baut roda depan kiri',
    commonIssues: ['Tekanan angin kurang', 'Baut roda kendor/hilang', 'Ban sobek/retak'],
  },
  {
    id: 'bus_a1_3',
    category: 'A',
    categoryTitle: 'A. PEMERIKSAAN KELILING UNIT / DILUAR CABIN',
    no: 1,
    name: 'Ban (Tyre) & Baut Roda - Ban Belakang : Kanan',
    dangerCode: 'AA',
    description: 'Periksa keausan ban, tekanan angin, keretakan, dan kekencangan baut roda belakang kanan',
    commonIssues: ['Tekanan angin gembos', 'Baut roda kendor/patah', 'Batu terselip di sela ban'],
  },
  {
    id: 'bus_a1_4',
    category: 'A',
    categoryTitle: 'A. PEMERIKSAAN KELILING UNIT / DILUAR CABIN',
    no: 1,
    name: 'Ban (Tyre) & Baut Roda - Ban Belakang : Kiri',
    dangerCode: 'AA',
    description: 'Periksa keausan ban, tekanan angin, keretakan, dan kekencangan baut roda belakang kiri',
    commonIssues: ['Tekanan angin gembos', 'Baut roda kendor/patah', 'Batu terselip di sela ban'],
  },
  {
    id: 'bus_a2',
    category: 'A',
    categoryTitle: 'A. PEMERIKSAAN KELILING UNIT / DILUAR CABIN',
    no: 2,
    name: 'Level Oli Engine',
    dangerCode: 'AA',
    description: 'Periksa level oli mesin pada dipstick stik oli (antara MIN dan MAX)',
    commonIssues: ['Level oli di bawah batas MIN', 'Warna oli keruh pekat', 'Rembesan oli mesin'],
  },
  {
    id: 'bus_a3',
    category: 'A',
    categoryTitle: 'A. PEMERIKSAAN KELILING UNIT / DILUAR CABIN',
    no: 3,
    name: 'Level Oli Steering',
    dangerCode: 'AA',
    description: 'Periksa level oli hidrolik power steering',
    commonIssues: ['Level oli steering kurang', 'Rembesan pada selang steering'],
  },
  {
    id: 'bus_a4',
    category: 'A',
    categoryTitle: 'A. PEMERIKSAAN KELILING UNIT / DILUAR CABIN',
    no: 4,
    name: 'Level Minyak Rem ( Brake Oli )',
    dangerCode: 'AA',
    description: 'Periksa level minyak rem pada reservoir tabung rem',
    commonIssues: ['Minyak rem di bawah MIN', 'Kebocoran master rem / pipa rem'],
  },
  {
    id: 'bus_a5',
    category: 'A',
    categoryTitle: 'A. PEMERIKSAAN KELILING UNIT / DILUAR CABIN',
    no: 5,
    name: 'Lampu Rotari',
    dangerCode: 'AA',
    description: 'Periksa nyala dan putaran lampu rotari keselamatan tambang',
    commonIssues: ['Lampu rotari mati', 'Rotari tidak berputar', 'Kaca pelindung pecah'],
  },
  {
    id: 'bus_a6',
    category: 'A',
    categoryTitle: 'A. PEMERIKSAAN KELILING UNIT / DILUAR CABIN',
    no: 6,
    name: 'Buggy Whip',
    dangerCode: 'AA',
    description: 'Periksa kelengkapan, tiang bendera, lampu ujung buggy whip',
    commonIssues: ['Lampu buggy whip mati', 'Tiang bengkok/patah', 'Kabel terlepas'],
  },
  {
    id: 'bus_a7',
    category: 'A',
    categoryTitle: 'A. PEMERIKSAAN KELILING UNIT / DILUAR CABIN',
    no: 7,
    name: 'Spring / Pir',
    dangerCode: 'AA',
    description: 'Periksa kondisi daun pir/spring suspensi dari keretakan atau patah',
    commonIssues: ['Daun pir patah/retak', 'Baut U-Bolt kendor', 'Suspensi miring'],
  },
  {
    id: 'bus_a8',
    category: 'A',
    categoryTitle: 'A. PEMERIKSAAN KELILING UNIT / DILUAR CABIN',
    no: 8,
    name: 'Tie Rod',
    dangerCode: 'AA',
    description: 'Periksa kekencangan tie rod end dan link sambungan kemudi',
    commonIssues: ['Tie rod kendor/oblak', 'Karet boot sobek', 'Kemudi speleng besar'],
  },
  {
    id: 'bus_a9',
    category: 'A',
    categoryTitle: 'A. PEMERIKSAAN KELILING UNIT / DILUAR CABIN',
    no: 9,
    name: 'Fungsi Tuas Perseneling',
    dangerCode: 'A',
    description: 'Periksa perpindahan transmisi tuas gigi perseneling lancar',
    commonIssues: ['Tuas perseneling keras/macet', 'Gigi lompat/sulit masuk'],
  },
  {
    id: 'bus_a10',
    category: 'A',
    categoryTitle: 'A. PEMERIKSAAN KELILING UNIT / DILUAR CABIN',
    no: 10,
    name: 'Alarm Mundur',
    dangerCode: 'A',
    description: 'Pastikan alarm mundur berbunyi nyaring saat tuas mundur (R)',
    commonIssues: ['Alarm mundur tidak berbunyi', 'Suara alarm terlalu kecil/rusak'],
  },
  {
    id: 'bus_a11',
    category: 'A',
    categoryTitle: 'A. PEMERIKSAAN KELILING UNIT / DILUAR CABIN',
    no: 11,
    name: 'Kondisi Batery / Accu',
    dangerCode: 'A',
    description: 'Periksa kekencangan kepala aki, level air aki, dan tidak berkerak',
    commonIssues: ['Klem aki kendor', 'Terminal berkerak putih', 'Air aki kurang'],
  },
  {
    id: 'bus_a12',
    category: 'A',
    categoryTitle: 'A. PEMERIKSAAN KELILING UNIT / DILUAR CABIN',
    no: 12,
    name: 'Kondisi Filter Udara',
    dangerCode: 'A',
    description: 'Periksa indikator dust indicator dan kebersihan filter udara',
    commonIssues: ['Dust indicator merah', 'Filter tersumbat debu tambang'],
  },
  {
    id: 'bus_a13',
    category: 'A',
    categoryTitle: 'A. PEMERIKSAAN KELILING UNIT / DILUAR CABIN',
    no: 13,
    name: 'Air Radiator',
    dangerCode: 'A',
    description: 'Periksa level air reservoir radiator dan ketiadaan kebocoran selang',
    commonIssues: ['Air radiator kurang', 'Selang radiator bocor/kendor'],
  },
  {
    id: 'bus_a14',
    category: 'A',
    categoryTitle: 'A. PEMERIKSAAN KELILING UNIT / DILUAR CABIN',
    no: 14,
    name: 'Air Wiper ( Air Whiper )',
    dangerCode: 'A',
    description: 'Periksa level air tabung washer semprotan kaca depan',
    commonIssues: ['Air wiper kosong', 'Nosel semprotan tersumbat'],
  },
  {
    id: 'bus_a15',
    category: 'A',
    categoryTitle: 'A. PEMERIKSAAN KELILING UNIT / DILUAR CABIN',
    no: 15,
    name: 'Kondisi Body Unit',
    dangerCode: 'A',
    description: 'Periksa bodi bus, pintu penumpang, engsel, dan kaca bus',
    commonIssues: ['Bodi penyok/lecet berat', 'Pintu darurat/penumpang macet'],
  },
  {
    id: 'bus_a16',
    category: 'A',
    categoryTitle: 'A. PEMERIKSAAN KELILING UNIT / DILUAR CABIN',
    no: 16,
    name: 'Kebersihan Radiator',
    dangerCode: 'A',
    description: 'Periksa kisi-kisi radiator dari lumpur dan kotoran penumpuk',
    commonIssues: ['Kisi radiator tertutup lumpur/tanah', 'Sirip radiator bengkok'],
  },
  {
    id: 'bus_a17',
    category: 'A',
    categoryTitle: 'A. PEMERIKSAAN KELILING UNIT / DILUAR CABIN',
    no: 17,
    name: 'Kebersihan Alat',
    dangerCode: 'A',
    description: 'Periksa kebersihan unit bus dan perlengkapan sarana kerja',
    commonIssues: ['Unit kotor berlumpur berat', 'Nomor lambung tidak terbaca'],
  },

  // B. PEMERIKSAAN DIDALAM KABIN
  {
    id: 'bus_b1',
    category: 'B',
    categoryTitle: 'B. PEMERIKSAAN DIDALAM KABIN',
    no: 1,
    name: 'Fungsi Brake',
    dangerCode: 'AA',
    description: 'Periksa rem kaki (service brake) dan rem tangan (parking brake)',
    commonIssues: ['Rem blong/amblas', 'Rem tangan tidak mengunci di tanjakan'],
  },
  {
    id: 'bus_b2',
    category: 'B',
    categoryTitle: 'B. PEMERIKSAAN DIDALAM KABIN',
    no: 2,
    name: 'Fungsi Steering',
    dangerCode: 'AA',
    description: 'Periksa putaran stir kemudi ringan dan presisi',
    commonIssues: ['Stir berat', 'Stir goyang/bergetar hebat saat jalan'],
  },
  {
    id: 'bus_b3',
    category: 'B',
    categoryTitle: 'B. PEMERIKSAAN DIDALAM KABIN',
    no: 3,
    name: 'Fungsi Seat Belt',
    dangerCode: 'AA',
    description: 'Periksa sabuk pengaman driver dan seluruh kursi penumpang',
    commonIssues: ['Seatbelt macet/tidak mengunci', 'Buckle pengunci rusak'],
  },
  {
    id: 'bus_b4',
    category: 'B',
    categoryTitle: 'B. PEMERIKSAAN DIDALAM KABIN',
    no: 4,
    name: 'Fungsi Double Gardan (4WD)',
    dangerCode: 'AA',
    description: 'Periksa switch/tuas penggerak 4WD (4H / 4L) jika armada berpenggerak 4x4',
    commonIssues: ['4WD tidak mau engage', 'Indikator 4WD berkedip/rusak'],
  },
  {
    id: 'bus_b5',
    category: 'B',
    categoryTitle: 'B. PEMERIKSAAN DIDALAM KABIN',
    no: 5,
    name: 'Kondisi Spion',
    dangerCode: 'AA',
    description: 'Periksa spion dalam kabin dan spion samping kiri & kanan bus',
    commonIssues: ['Spion retak/pecah', 'Braket spion kendor/bergetar'],
  },
  {
    id: 'bus_b6',
    category: 'B',
    categoryTitle: 'B. PEMERIKSAAN DIDALAM KABIN',
    no: 6,
    name: 'Klakson',
    dangerCode: 'AA',
    description: 'Periksa fungsi klakson berbunyi nyaring dan jelas',
    commonIssues: ['Klakson mati', 'Suara klakson serak/lemah'],
  },
  {
    id: 'bus_b7',
    category: 'B',
    categoryTitle: 'B. PEMERIKSAAN DIDALAM KABIN',
    no: 7,
    name: 'Radio Komunikasi',
    dangerCode: 'A',
    description: 'Periksa radio komunikasi dua arah (channel tambang & PTT)',
    commonIssues: ['Radio mati', 'Tidak bisa transmit/suara kresek-kresek'],
  },
  {
    id: 'bus_b8_1',
    category: 'B',
    categoryTitle: 'B. PEMERIKSAAN DIDALAM KABIN',
    no: 8,
    name: 'Fungsi Lampu - Lampu Depan',
    dangerCode: 'A',
    description: 'Periksa nyala lampu utama kepala (headlamp) depan',
    commonIssues: ['Lampu depan mati sebelah/keduanya'],
  },
  {
    id: 'bus_b8_2',
    category: 'B',
    categoryTitle: 'B. PEMERIKSAAN DIDALAM KABIN',
    no: 8,
    name: 'Fungsi Lampu - Lampu Hazard / Bahaya',
    dangerCode: 'A',
    description: 'Periksa nyala keempat lampu hazard darurat serentak',
    commonIssues: ['Lampu hazard tidak berkedip serentak'],
  },
  {
    id: 'bus_b8_3',
    category: 'B',
    categoryTitle: 'B. PEMERIKSAAN DIDALAM KABIN',
    no: 8,
    name: 'Fungsi Lampu - Lampu Jauh',
    dangerCode: 'A',
    description: 'Periksa fungsi lampu tembak / high beam jauh',
    commonIssues: ['Lampu jauh mati/saklar tidak responsif'],
  },
  {
    id: 'bus_b8_4',
    category: 'B',
    categoryTitle: 'B. PEMERIKSAAN DIDALAM KABIN',
    no: 8,
    name: 'Fungsi Lampu - Lampu Rem',
    dangerCode: 'A',
    description: 'Periksa nyala lampu rem belakang saat pedal rem diinjak',
    commonIssues: ['Lampu rem belakang mati'],
  },
  {
    id: 'bus_b9_1',
    category: 'B',
    categoryTitle: 'B. PEMERIKSAAN DIDALAM KABIN',
    no: 9,
    name: 'Fungsi Lampu Sign/Penunjuk - Lampu Depan Kanan & Kiri',
    dangerCode: 'A',
    description: 'Periksa nyala lampu sein belok depan kanan dan kiri',
    commonIssues: ['Lampu sein depan mati/kedip terlalu cepat'],
  },
  {
    id: 'bus_b9_2',
    category: 'B',
    categoryTitle: 'B. PEMERIKSAAN DIDALAM KABIN',
    no: 9,
    name: 'Fungsi Lampu Sign/Penunjuk - Lampu Belakang Kanan & Kiri',
    dangerCode: 'A',
    description: 'Periksa nyala lampu sein belok belakang kanan dan kiri',
    commonIssues: ['Lampu sein belakang mati'],
  },
  {
    id: 'bus_b10',
    category: 'B',
    categoryTitle: 'B. PEMERIKSAAN DIDALAM KABIN',
    no: 10,
    name: 'Fungsi Dashcam',
    dangerCode: 'A',
    description: 'Periksa kamera perekam dashcam aktif dan merekam',
    commonIssues: ['Dashcam mati', 'Memory card penuh/error'],
  },
  {
    id: 'bus_b11',
    category: 'B',
    categoryTitle: 'B. PEMERIKSAAN DIDALAM KABIN',
    no: 11,
    name: 'Wiper',
    dangerCode: 'A',
    description: 'Periksa sapuan karet wiper dan motor kecepatan wiper',
    commonIssues: ['Karet wiper robek/kaku', 'Sapuan wiper buram bergaris'],
  },
  {
    id: 'bus_b12',
    category: 'B',
    categoryTitle: 'B. PEMERIKSAAN DIDALAM KABIN',
    no: 12,
    name: 'APAR ( Alat Pemadam Api Ringan )',
    dangerCode: 'A',
    description: 'Periksa tekanan tabung APAR di zona hijau dan segel pin utuh',
    commonIssues: ['Jarum APAR di zona merah', 'Segel pin lepas/APAR kadaluarsa'],
  },
  {
    id: 'bus_b13',
    category: 'B',
    categoryTitle: 'B. PEMERIKSAAN DIDALAM KABIN',
    no: 13,
    name: 'Kotak P3K',
    dangerCode: 'A',
    description: 'Periksa ketersediaan kotak P3K darurat beserta obat-obatan lengkap',
    commonIssues: ['Kotak P3K tidak ada/isi tidak lengkap'],
  },
  {
    id: 'bus_b14',
    category: 'B',
    categoryTitle: 'B. PEMERIKSAAN DIDALAM KABIN',
    no: 14,
    name: 'Pemecah Kaca ( Emergency Hammer )',
    dangerCode: 'A',
    description: 'Periksa ketersediaan palu darurat pemecah kaca jendela bus',
    commonIssues: ['Palu pemecah kaca hilang dari dudukannya'],
  },
  {
    id: 'bus_b15',
    category: 'B',
    categoryTitle: 'B. PEMERIKSAAN DIDALAM KABIN',
    no: 15,
    name: 'Control Panel',
    dangerCode: 'A',
    description: 'Periksa instrumen dashboard, speedometer, temperatur, indikator bahan bakar',
    commonIssues: ['Lampu peringatan error/indikator rem angin drop'],
  },
  {
    id: 'bus_b16',
    category: 'B',
    categoryTitle: 'B. PEMERIKSAAN DIDALAM KABIN',
    no: 16,
    name: 'Kebersihan Ruang Kabin',
    dangerCode: 'A',
    description: 'Periksa kebersihan lorong kabin penumpang bus, kursi, dan ventilasi',
    commonIssues: ['Kabin kotor/berbau', 'Ada sampah berserakan di kursi penumpang'],
  },

  // C. KELENGKAPAN TAMBAHAN
  {
    id: 'bus_c1',
    category: 'C',
    categoryTitle: 'C. KELENGKAPAN TAMBAHAN',
    no: 1,
    name: 'Safety Cone ( Segitiga Pengaman )',
    dangerCode: 'A',
    description: 'Periksa ketersediaan minimal 2 buah safety cone / segitiga darurat',
    commonIssues: ['Safety cone hilang / kurang dari 2 buah', 'Pecah'],
  },
  {
    id: 'bus_c2',
    category: 'C',
    categoryTitle: 'C. KELENGKAPAN TAMBAHAN',
    no: 2,
    name: 'Ganjal Roda / Ban ( Wheel Chock )',
    dangerCode: 'A',
    description: 'Periksa ketersediaan minimal 2 buah ganjal roda ban beserta tali penarik',
    commonIssues: ['Ganjal ban tidak lengkap', 'Ganjal ban rusak/retak'],
  },
];

// Helper to get corresponding checklist by unit type or category
export function getP2HChecklist(unitType?: string, p2hCategory?: 'LV' | 'Bus'): P2HChecklistItem[] {
  if (p2hCategory === 'Bus') return P2H_CHECKLIST_BUS;
  if (p2hCategory === 'LV') return P2H_CHECKLIST_LV;

  if (unitType) {
    const norm = unitType.trim().toUpperCase();
    if (norm === 'BUS' || norm.includes('BUS') || norm.includes('MINIBUS')) {
      return P2H_CHECKLIST_BUS;
    }
  }

  return P2H_CHECKLIST_LV;
}
