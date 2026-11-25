/**
 * Ukuran asli foto situs (px) agar <img> memberi width/height dengan rasio asli dan tata letak tidak melompat.
 * Hanya nama dan angka (bukan foto); diambil dari berkas di public/foto. Foto yang belum terdaftar, dan foto
 * stok lama (bukan kunci "foto/..."), memakai ukuran cadangan: kotaknya tetap ditentukan CSS (object-fit: cover).
 */
const SIZES: Record<string, [number, number]> = {
  'anak-muda-jogja': [1264, 848],
  'angkringan-malam': [1200, 896],
  'baluran-rusa': [1376, 768],
  'banyuwangi-savana-pantai': [1264, 848],
  'batik-tulis': [1264, 848],
  'bintang-laut': [1264, 848],
  'borobudur-stupa': [1376, 768],
  'borobudur-sunrise': [1264, 848],
  'bromo-kaldera-biru': [1376, 768],
  'bromo-lautan-kabut': [1376, 768],
  'bromo-sunrise-grup': [1264, 848],
  'bromo-tangga-batu': [1200, 896],
  'cemara-lodge-eksterior': [1264, 848],
  'cemara-lodge-kamar': [896, 1200],
  'dermaga-senja-tiga-orang': [1200, 896],
  'dieng-sunrise-emas': [1264, 848],
  'dieng-teras-kabut': [1376, 768],
  'grup-tertawa-bromo': [1024, 1024],
  'haluan-perahu-laut': [1264, 848],
  'honeymoon-dermaga': [1264, 848],
  'hotel-heritage-teras': [896, 1200],
  'ijen-api-biru': [1264, 848],
  'ijen-kawah-pendaki': [1264, 848],
  'jembatan-kayu-mangrove': [1264, 848],
  'jemput-tengah-malam': [1200, 896],
  'jip-4x4-bromo': [1200, 896],
  'jogja-gerbang-bata': [1264, 848],
  'karimunjawa-pantai-perahu': [1264, 848],
  'kawah-ijen': [1376, 768],
  'kebun-teh': [1264, 848],
  'kubis-embun': [1264, 848],
  'lorong-batu': [1264, 848],
  'malang-warung-jip': [1264, 848],
  'pedagang-warung-kabut': [1264, 848],
  'penambang-belerang': [1264, 848],
  'penanjakan-menunggu-fajar': [1200, 896],
  'penanjakan-panorama': [1376, 768],
  'penanjakan-sunrise-grup': [1264, 848],
  'pendaki-bukit-hijau': [896, 1200],
  'pendaki-malam-headlamp': [1264, 848],
  'pendaki-punggungan': [1376, 768],
  'perempuan-geladak-perahu': [1200, 896],
  'potret-perempuan-tenun': [896, 1200],
  'prambanan-fajar': [1376, 768],
  'prambanan-senja': [1264, 848],
  'pulau-udara-atas': [896, 1200],
  'pulau-udara-perahu': [1376, 768],
  'roda-jip-pasir': [1264, 848],
  'sandbar-perahu': [1376, 768],
  'sarapan-teras': [1200, 896],
  'savana-banyuwangi': [1264, 848],
  'savana-pendaki-barisan': [1200, 896],
  'sawah-teras-ubud': [1264, 848],
  'senja-perahu-tenang': [1376, 768],
  'senja-pulau-palem': [896, 1200],
  'sikunir-lautan-awan': [1264, 848],
  'tangan-relief-candi': [848, 1264],
  'traveler-haluan-perahu': [896, 1200],
  'traveler-selimut-bromo': [896, 1200],
  'ubud-pendopo-sawah': [1264, 848],
  'warga-tengger-bromo': [1264, 848],
  'wonosobo-keluarga-teh': [1264, 848],
};

const FALLBACK: [number, number] = [1264, 848];

/** Ukuran dari nama berkas ("jip-4x4-bromo") atau kunci media ("foto/jip-4x4-bromo.webp"). */
export function photoSize(keyOrName: string): { width: number; height: number } {
  const name = keyOrName.replace(/^foto\//, '').replace(/\.webp$/, '');
  const [width, height] = SIZES[name] ?? FALLBACK;
  return { width, height };
}
