// Data & komponen kecil yang dipakai bersama oleh beberapa halaman

export const PACKAGES = [
  {
    id: 'basic', tier: 'Dasar', price: 150000,
    features: [['1 Tema Pilihan', true], ['Informasi Acara', true], ['Fitur RSVP', true], ['Aktif 3 Bulan', true], ['Galeri Foto', false], ['Musik Latar', false]],
  },
  {
    id: 'premium', tier: 'Premium', price: 350000, featured: true,
    features: [['Semua Tema Tersedia', true], ['Informasi Acara', true], ['Fitur RSVP', true], ['Aktif 6 Bulan', true], ['Galeri Foto (20 foto)', true], ['Musik Latar', true]],
  },
  {
    id: 'exclusive', tier: 'Eksklusif', price: 600000,
    features: [['Desain Kustom', true], ['Informasi Acara', true], ['Fitur RSVP', true], ['Aktif Selamanya', true], ['Galeri Foto (Tak Terbatas)', true], ['Musik Latar + Video', true]],
  },
];

export const THEMES = [
  { value: 'royal-gold', label: '🌟 Royal Gold' },
  { value: 'midnight-blue', label: '🌙 Midnight Blue Elegance' },
  { value: 'emerald-dream', label: '💚 Emerald Dream' },
  { value: 'blush-rose', label: '🌸 Blush Rose' },
  { value: 'minimalist-white', label: '🤍 Minimalist White' },
  { value: 'royal-java', label: '👑 Royal Java' },
];

export const rupiah = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');

// Ornamen Pinto Aceh (SVG) — dipakai sebagai hiasan judul
export function PintoAceh({ size = 44, className = '' }) {
  return (
    <svg className={`pinto-aceh ${className}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 2 L62 32 L32 62 L2 32 Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M32 12 L52 32 L32 52 L12 32 Z" fill="none" stroke="var(--aceh-red)" strokeWidth="2" />
      <path d="M32 20 Q38 28 32 32 Q26 28 32 20 M32 44 Q38 36 32 32 Q26 36 32 44 M20 32 Q28 26 32 32 Q28 38 20 32 M44 32 Q36 26 32 32 Q36 38 44 32" fill="currentColor" opacity="0.85" />
      <circle cx="32" cy="32" r="3" fill="var(--aceh-green)" />
    </svg>
  );
}
