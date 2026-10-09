// Alamat database (json-server).
// Default: host yang sama dengan halaman di port 5000, jadi undangan juga bisa
// dibuka dari HP di jaringan Wi-Fi yang sama (jalankan vite dengan --host).
// Saat online/produksi, set VITE_API_URL di file .env.
export const API_BASE =
  import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

export const api = {
  async get(path) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`GET ${path} gagal (${res.status})`);
    return res.json();
  },
  async send(method, path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${method} ${path} gagal (${res.status})`);
    return res.json();
  },
  post: (path, body) => api.send('POST', path, body),
  patch: (path, body) => api.send('PATCH', path, body),
  del: (path) => api.send('DELETE', path),
};

// Link publik undangan
export const invitationUrl = (slug, guest) => {
  const base = `${window.location.origin}/u/${slug}`;
  return guest ? `${base}?to=${encodeURIComponent(guest)}` : base;
};

// Ubah teks jadi slug URL, contoh: "Romeo & Juliet" -> "romeo-juliet"
export const slugify = (text) =>
  (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
