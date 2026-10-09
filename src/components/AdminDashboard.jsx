import { useState, useEffect, useMemo, useCallback } from 'react';
import { portfolioItems } from './Portfolio';
import AdminInvitationEditor from './AdminInvitationEditor';
import { api } from '../api';
import './AdminDashboard.css';

const API_URL = 'http://localhost:5000/orders';

const PACKAGES = {
  basic: { label: 'Dasar', price: 150000 },
  premium: { label: 'Premium', price: 350000 },
  exclusive: { label: 'Eksklusif', price: 600000 },
};

const THEMES = {
  'royal-gold': '🌟 Royal Gold',
  'midnight-blue': '🌙 Midnight Blue',
  'emerald-dream': '💚 Emerald Dream',
  'blush-rose': '🌸 Blush Rose',
  'minimalist-white': '🤍 Minimalist White',
  'royal-java': '👑 Royal Java',
};

const STATUSES = {
  pending: { label: 'Menunggu', icon: '⏳' },
  process: { label: 'Diproses', icon: '🛠️' },
  done: { label: 'Selesai', icon: '✅' },
  cancelled: { label: 'Dibatalkan', icon: '✖' },
};

const formatRupiah = (n) => 'Rp ' + n.toLocaleString('id-ID');
const formatDate = (d, withTime = false) => {
  if (!d) return '-';
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
  return new Date(d).toLocaleDateString('id-ID', opts);
};
const toWhatsApp = (phone) => {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.startsWith('0') ? '62' + digits.slice(1) : digits;
};

/* ───────────── Login ───────────── */
function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const users = await api.get(`/users?username=${username}&password=${password}&role=admin`);
      if (users.length > 0) {
        sessionStorage.setItem('lumina-admin', '1');
        localStorage.setItem('lumina-user', JSON.stringify(users[0]));
        onLogin();
      } else {
        setError('Username atau kata sandi admin salah.');
      }
    } catch {
      setError('Gagal menghubungi database.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-wrapper">
      <form className="admin-login-card glass" onSubmit={handleSubmit}>
        <span className="logo">✦ Lumina</span>
        <h1>Panel Admin</h1>
        <p>Masuk untuk mengelola pesanan klien.</p>
        <input
          id="admin-username"
          type="text"
          className="form-control"
          placeholder="Username admin"
          value={username}
          onChange={(e) => { setUsername(e.target.value); setError(''); }}
          autoFocus
          style={{ marginBottom: '1rem' }}
        />
        <input
          id="admin-password"
          type="password"
          className="form-control"
          placeholder="Kata sandi admin"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(''); }}
        />
        {error && <div className="admin-error" style={{ marginTop: '1rem' }}>{error}</div>}
        <button id="admin-login-btn" type="submit" className="btn-primary submit-btn" disabled={loading}>
          {loading ? 'Masuk...' : 'Masuk'}
        </button>
        <a href="/" className="admin-back-link">← Kembali ke situs</a>
      </form>
    </div>
  );
}

/* ───────────── Dashboard ───────────── */
export default function AdminDashboard({ theme, toggleTheme }) {
  const [loggedIn, setLoggedIn] = useState(() => sessionStorage.getItem('lumina-admin') === '1');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [editingInvitation, setEditingInvitation] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error();
      const data = await res.json();
      data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setOrders(data);
    } catch {
      setError('Tidak dapat terhubung ke database. Pastikan json-server berjalan di port 5000.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loggedIn) fetchOrders();
  }, [loggedIn, fetchOrders]);

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      setSelected((s) => (s && s.id === id ? { ...s, status } : s));
    } catch {
      alert('Gagal memperbarui status pesanan.');
    }
  };

  const deleteOrder = async (id) => {
    if (!confirm('Hapus pesanan ini secara permanen?')) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setOrders((prev) => prev.filter((o) => o.id !== id));
      setSelected(null);
    } catch {
      alert('Gagal menghapus pesanan.');
    }
  };

  const logout = () => {
    sessionStorage.removeItem('lumina-admin');
    localStorage.removeItem('lumina-user');
    setLoggedIn(false);
    window.location.href = '/';
  };

  const stats = useMemo(() => {
    const count = (s) => orders.filter((o) => (o.status || 'pending') === s).length;
    const revenue = orders
      .filter((o) => o.status === 'done')
      .reduce((sum, o) => sum + (PACKAGES[o.package]?.price || 0), 0);
    return {
      total: orders.length,
      pending: count('pending'),
      process: count('process'),
      done: count('done'),
      revenue,
    };
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const status = o.status || 'pending';
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (!q) return true;
      return [o.name1, o.name2, o.phone, o.venue, o.theme]
        .some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [orders, search, statusFilter]);

  if (!loggedIn) return <AdminLogin onLogin={() => setLoggedIn(true)} />;

  return (
    <div className="admin-layout">
      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        <span className="logo">✦ Lumina</span>
        <span className="admin-sidebar-tag">Admin Panel</span>
        <nav className="admin-menu">
          <button className="admin-menu-item active">📋 Pesanan</button>
          <a href="/" className="admin-menu-item">🌐 Lihat Situs</a>
        </nav>
        <div className="admin-sidebar-footer">
          <button onClick={toggleTheme} className="theme-toggle" aria-label="Ganti Tema">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button id="admin-logout" onClick={logout} className="btn-outline admin-logout">Keluar</button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>Dashboard Pesanan</h1>
            <p>Pantau dan kelola semua pesanan undangan dari klien.</p>
          </div>
          <button id="admin-refresh" onClick={fetchOrders} className="btn-outline admin-refresh" disabled={loading}>
            <span className={loading ? 'spin' : ''}>↻</span> Muat Ulang
          </button>
        </header>

        {/* Stats */}
        <section className="admin-stats">
          <div className="stat-card glass">
            <span className="stat-icon">📦</span>
            <div><p>Total Pesanan</p><h3>{stats.total}</h3></div>
          </div>
          <div className="stat-card glass stat-pending">
            <span className="stat-icon">⏳</span>
            <div><p>Menunggu</p><h3>{stats.pending}</h3></div>
          </div>
          <div className="stat-card glass stat-process">
            <span className="stat-icon">🛠️</span>
            <div><p>Diproses</p><h3>{stats.process}</h3></div>
          </div>
          <div className="stat-card glass stat-done">
            <span className="stat-icon">💰</span>
            <div><p>Pendapatan (Selesai)</p><h3>{formatRupiah(stats.revenue)}</h3></div>
          </div>
        </section>

        {/* Toolbar */}
        <section className="admin-toolbar">
          <input
            id="admin-search"
            type="search"
            className="form-control"
            placeholder="🔍 Cari nama mempelai, nomor WA, lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="admin-filter-tabs">
            {[['all', 'Semua'], ...Object.entries(STATUSES).map(([k, v]) => [k, v.label])].map(([key, label]) => (
              <button
                key={key}
                id={`filter-${key}`}
                className={`admin-tab ${statusFilter === key ? 'active' : ''}`}
                onClick={() => setStatusFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Table */}
        <section className="admin-table-wrapper glass">
          {error ? (
            <div className="admin-empty">⚠️ {error}</div>
          ) : loading && orders.length === 0 ? (
            <div className="admin-empty">Memuat pesanan...</div>
          ) : filtered.length === 0 ? (
            <div className="admin-empty">Belum ada pesanan yang cocok.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mempelai</th>
                  <th>Tanggal Acara</th>
                  <th>Paket</th>
                  <th>Tema</th>
                  <th>Kontak</th>
                  <th>Status</th>
                  <th>Masuk</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const status = o.status || 'pending';
                  return (
                    <tr key={o.id} onClick={() => setSelected(o)}>
                      <td className="cell-names">{o.name1} <span>&amp;</span> {o.name2}</td>
                      <td>{formatDate(o.date)}</td>
                      <td><span className={`pkg-badge pkg-${o.package}`}>{PACKAGES[o.package]?.label || o.package}</span></td>
                      <td>{THEMES[o.theme] || o.theme}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <a className="wa-link" href={`https://wa.me/${toWhatsApp(o.phone)}`} target="_blank" rel="noreferrer">
                          💬 {o.phone}
                        </a>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <select
                          className={`status-select status-${status}`}
                          value={status}
                          onChange={(e) => updateStatus(o.id, e.target.value)}
                        >
                          {Object.entries(STATUSES).map(([k, v]) => (
                            <option key={k} value={k}>{v.icon} {v.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="cell-muted">{formatDate(o.timestamp, true)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button className="icon-btn" title="Hapus" onClick={() => deleteOrder(o.id)}>🗑️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </main>

      {/* ── Detail Modal ── */}
      {selected && (
        <div className="admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="admin-modal glass" onClick={(e) => e.stopPropagation()}>
            <button className="admin-modal-close" onClick={() => setSelected(null)}>✕</button>
            <h2>{selected.name1} &amp; {selected.name2}</h2>
            <p className="cell-muted">Pesanan masuk {formatDate(selected.timestamp, true)}</p>

            {portfolioItems.find((i) => i.theme === selected.theme)?.image && (
              <img
                className="admin-modal-img"
                src={portfolioItems.find((i) => i.theme === selected.theme).image}
                alt={`Tema ${selected.theme}`}
              />
            )}

            <dl className="admin-detail-grid">
              <dt>Tanggal Acara</dt><dd>{formatDate(selected.date)}</dd>
              <dt>Paket</dt>
              <dd>{PACKAGES[selected.package]?.label} — {formatRupiah(PACKAGES[selected.package]?.price || 0)}</dd>
              <dt>Tema</dt><dd>{THEMES[selected.theme] || selected.theme}</dd>
              <dt>Lokasi</dt><dd>{selected.venue || '-'}</dd>
              <dt>WhatsApp</dt><dd>{selected.phone}</dd>
              <dt>Catatan</dt><dd>{selected.notes || '-'}</dd>
            </dl>

            <div className="admin-modal-status">
              {Object.entries(STATUSES).map(([k, v]) => (
                <button
                  key={k}
                  className={`admin-tab ${(selected.status || 'pending') === k ? 'active' : ''}`}
                  onClick={() => updateStatus(selected.id, k)}
                >
                  {v.icon} {v.label}
                </button>
              ))}
            </div>

            {(selected.status === 'process' || selected.status === 'done') && (
              <div style={{ marginTop: '1.5rem', background: 'rgba(212, 175, 55, 0.1)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <p style={{ marginBottom: '0.75rem', fontWeight: '600' }}>Undangan Digital</p>
                <button className="btn-primary" onClick={() => setEditingInvitation(true)} style={{ width: '100%', padding: '0.6rem' }}>
                  ⚙️ Kelola Halaman Undangan
                </button>
              </div>
            )}

            <div className="admin-modal-actions">
              <a
                className="btn-primary"
                href={`https://wa.me/${toWhatsApp(selected.phone)}?text=${encodeURIComponent(
                  `Halo ${selected.name1} & ${selected.name2}, terima kasih telah memesan undangan di Lumina ✦`
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                💬 Hubungi via WhatsApp
              </a>
              <button className="btn-outline admin-danger" onClick={() => deleteOrder(selected.id)}>Hapus</button>
            </div>
          </div>
        </div>
      )}

      {editingInvitation && selected && (
        <AdminInvitationEditor order={selected} onClose={() => setEditingInvitation(false)} />
      )}
    </div>
  );
}
