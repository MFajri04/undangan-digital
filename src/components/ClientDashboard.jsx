import { useState, useEffect, useCallback } from 'react';
import { api, invitationUrl } from '../api';
import { PACKAGES, THEMES, rupiah, PintoAceh } from '../shared';

// Tahapan pesanan yang ditampilkan sebagai progress tracker
const STAGES = [
  { key: 'pending', label: 'Pesanan Dikirim', icon: '📨' },
  { key: 'process', label: 'Sedang Diproses', icon: '🛠️' },
  { key: 'done', label: 'Undangan Siap', icon: '🎉' },
];

const STATUS_INFO = {
  pending: { text: 'Menunggu Konfirmasi', cls: 'status-pending', hint: 'Admin akan segera menghubungi Anda via WhatsApp.' },
  process: { text: 'Sedang Diproses', cls: 'status-process', hint: 'Undangan Anda sedang dibuat oleh tim kami.' },
  done: { text: 'Selesai', cls: 'status-done', hint: 'Undangan aktif! Salin link di bawah dan bagikan ke tamu.' },
  cancelled: { text: 'Dibatalkan', cls: 'status-cancelled', hint: 'Pesanan dibatalkan. Hubungi admin bila ada pertanyaan.' },
};

const ATTEND = {
  hadir: { label: 'Hadir', color: 'var(--aceh-green)' },
  tidak: { label: 'Tidak Hadir', color: 'var(--aceh-red)' },
  ragu: { label: 'Masih Ragu', color: 'var(--aceh-gold)' },
};

export default function ClientDashboard({ user, toggleTheme, theme }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState({});
  const [rsvps, setRsvps] = useState({});
  const [selectedInv, setSelectedInv] = useState(null); // slug undangan yang sedang dilihat RSVP-nya
  const [notifications, setNotifications] = useState([]);
  const [guestNames, setGuestNames] = useState({}); // nama tamu untuk link personal per undangan
  const [toast, setToast] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const myOrders = await api.get(`/orders?userId=${user.id}`);
      myOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setOrders(myOrders);

      const invMap = {};
      const rsvpMap = {};

      for (const order of myOrders) {
        if (order.status === 'process' || order.status === 'done') {
          const invList = await api.get(`/invitations?orderId=${order.id}`);
          if (invList.length > 0) {
            invMap[order.id] = invList[0];
            if (invList[0].published) {
              const rsvpList = await api.get(`/rsvps?slug=${invList[0].slug}`);
              rsvpMap[invList[0].slug] = rsvpList;
            }
          }
        }
      }

      // Susun notifikasi
      const notifs = [];
      for (const order of myOrders) {
        if (order.status === 'process') {
          notifs.push({
            id: `ord-${order.id}-process`, type: 'order', icon: '🛠️',
            title: 'Pesanan Diproses',
            message: `Undangan ${order.name1} & ${order.name2} sedang dibuat oleh tim kami.`,
            timestamp: order.timestamp,
          });
        } else if (order.status === 'done') {
          notifs.push({
            id: `ord-${order.id}-done`, type: 'order', icon: '🎉',
            title: 'Undangan Siap Dibagikan',
            message: `Undangan ${order.name1} & ${order.name2} sudah aktif. Salin link & bagikan!`,
            timestamp: order.timestamp,
          });
        }
      }
      Object.values(rsvpMap).flat().forEach(rsvp => {
        notifs.push({
          id: `rsvp-${rsvp.id}`, type: 'rsvp', icon: '💌',
          title: 'RSVP Baru Masuk',
          message: `${rsvp.name} menjawab: ${ATTEND[rsvp.attendance]?.label || rsvp.attendance}.`,
          timestamp: rsvp.timestamp,
        });
      });
      notifs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Tandai notifikasi sebagai sudah dibaca, tapi tetap tandai yang baru
      const seenKey = `lumina-notif-seen-${user.id}`;
      const prevSeen = Number(localStorage.getItem(seenKey) || 0);
      const newCount = Math.max(0, notifs.length - prevSeen);
      setNotifications(notifs.map((n, i) => ({ ...n, isNew: i < newCount })));
      localStorage.setItem(seenKey, String(notifs.length));

      setInvitations(invMap);
      setRsvps(rsvpMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const copyLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      showToast('✔ Link berhasil disalin');
    } catch {
      window.prompt('Salin link berikut:', url);
    }
  };

  const shareWA = (order, url, guest) => {
    const text =
      `Assalamu'alaikum Warahmatullahi Wabarakatuh${guest ? `\nKepada Yth. ${guest}` : ''}\n\n` +
      `Dengan memohon rahmat Allah SWT, kami mengundang Bapak/Ibu/Saudara/i untuk hadir di acara pernikahan kami:\n` +
      `*${order.name1} & ${order.name2}*\n\nDetail acara & konfirmasi kehadiran:\n${url}\n\n` +
      `Merupakan kehormatan bagi kami atas kehadiran dan doa restunya. 🙏`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const logout = () => {
    localStorage.removeItem('lumina-user');
    window.location.href = '/';
  };

  const allRsvps = Object.values(rsvps).flat();
  const totalHadir = allRsvps.filter(r => r.attendance === 'hadir').reduce((s, r) => s + (Number(r.guests) || 1), 0);
  const activeInv = Object.values(invitations).filter(i => i.published).length;
  const modalList = selectedInv ? rsvps[selectedInv] || [] : [];

  return (
    <div className="app-container">
      <nav className="navbar scrolled">
        <a href="/" className="logo">✦ Lumina<small className="logo-sub">Dashboard Pelanggan</small></a>
        <div className="nav-links">
          <a href="/" className="nav-link">← Beranda</a>
          <button onClick={toggleTheme} className="theme-toggle" aria-label="Ganti Tema">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button onClick={logout} className="btn-ghost btn-sm">Keluar</button>
        </div>
      </nav>

      <main className="dash-main">
        {/* Sambutan */}
        <section className="dash-welcome glass aceh-frame">
          <div>
            <p className="section-eyebrow" style={{ textAlign: 'left', marginBottom: '0.3rem' }}>Peumulia Jamee</p>
            <h1>Halo, {user.name} 👋</h1>
            <p className="muted">Pantau status pesanan, bagikan link undangan, dan lihat siapa saja tamu yang sudah RSVP.</p>
          </div>
          <div className="dash-welcome-actions">
            <a href="/#order" className="btn-primary btn-sm">+ Pesan Undangan Baru</a>
            <button className="btn-ghost btn-sm" onClick={loadData} disabled={loading}>
              {loading ? 'Memuat…' : '↻ Muat Ulang'}
            </button>
          </div>
        </section>

        {/* Ringkasan */}
        <section className="dash-stats">
          <div className="dash-stat glass"><span>📦</span><div><b>{orders.length}</b><small>Total Pesanan</small></div></div>
          <div className="dash-stat glass"><span>🔗</span><div><b>{activeInv}</b><small>Undangan Aktif</small></div></div>
          <div className="dash-stat glass"><span>💌</span><div><b>{allRsvps.length}</b><small>Respon RSVP</small></div></div>
          <div className="dash-stat glass"><span>👥</span><div><b>{totalHadir}</b><small>Tamu Akan Hadir</small></div></div>
        </section>

        {loading ? (
          <div className="dash-loading"><PintoAceh size={48} className="spin-slow" /><p>Memuat data Anda…</p></div>
        ) : orders.length === 0 ? (
          <div className="glass empty-state">
            <PintoAceh size={56} />
            <h3>Belum Ada Pesanan</h3>
            <p>Mulai dengan memilih tema di Galeri Karya, lalu isi form pemesanan. Hanya butuh ±3 menit!</p>
            <a href="/#order" className="btn-primary">Buat Pesanan Pertama →</a>
          </div>
        ) : (
          <div className="dash-grid">
            {/* Daftar Pesanan */}
            <section>
              <h2 className="dash-heading">Pesanan Saya</h2>
              <div className="dash-orders">
                {orders.map(order => {
                  const status = order.status || 'pending';
                  const info = STATUS_INFO[status] || STATUS_INFO.pending;
                  const stageIdx = STAGES.findIndex(s => s.key === status);
                  const inv = invitations[order.id];
                  const pkg = PACKAGES.find(p => p.id === order.package);
                  const th = THEMES.find(t => t.value === order.theme);
                  const guest = guestNames[order.id] || '';
                  const url = inv ? invitationUrl(inv.slug, guest.trim() || undefined) : '';
                  const count = inv ? (rsvps[inv.slug] || []).length : 0;

                  return (
                    <article key={order.id} className="order-card glass">
                      <header className="order-card-head">
                        <div>
                          <h3>{order.name1} &amp; {order.name2}</h3>
                          <p className="muted small">
                            📅 {order.date ? new Date(order.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                          </p>
                        </div>
                        <span className={`status-pill ${info.cls}`}>{info.text}</span>
                      </header>

                      {/* Progress tracker */}
                      {status !== 'cancelled' ? (
                        <ol className="tracker">
                          {STAGES.map((s, i) => (
                            <li key={s.key} className={i < stageIdx ? 'done' : i === stageIdx ? 'current' : ''}>
                              <span className="tracker-dot">{i < stageIdx || status === 'done' ? '✔' : s.icon}</span>
                              <span className="tracker-label">{s.label}</span>
                            </li>
                          ))}
                        </ol>
                      ) : null}
                      <p className="order-hint">{info.hint}</p>

                      <dl className="order-meta">
                        <div><dt>Paket</dt><dd>{pkg ? `${pkg.tier} · ${rupiah(pkg.price)}` : order.package}</dd></div>
                        <div><dt>Tema</dt><dd>{th ? th.label : order.theme}</dd></div>
                        {order.venue && <div><dt>Lokasi</dt><dd>{order.venue}</dd></div>}
                      </dl>

                      {inv && inv.published && (
                        <div className="share-box">
                          <p className="share-title">🔗 Link Undangan Anda</p>
                          <div className="share-field">
                            <label htmlFor={`guest-${order.id}`}>Nama tamu (opsional, untuk link personal)</label>
                            <input
                              id={`guest-${order.id}`}
                              className="form-control"
                              placeholder="Contoh: Bapak Teuku Umar & Keluarga"
                              value={guest}
                              onChange={e => setGuestNames(g => ({ ...g, [order.id]: e.target.value }))}
                            />
                          </div>
                          <div className="share-url">{url}</div>
                          <div className="share-actions">
                            <button className="btn-primary btn-sm" onClick={() => copyLink(url)}>📋 Salin Link</button>
                            <button className="btn-wa btn-sm" onClick={() => shareWA(order, url, guest.trim())}>💬 Kirim via WhatsApp</button>
                            <a className="btn-ghost btn-sm" href={url} target="_blank" rel="noreferrer">👁 Lihat</a>
                            <button className="btn-ghost btn-sm" onClick={() => setSelectedInv(inv.slug)}>
                              👥 Buku Tamu ({count})
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>

            {/* Notifikasi */}
            <aside>
              <h2 className="dash-heading">🔔 Notifikasi</h2>
              <div className="glass notif-panel">
                {notifications.length === 0 ? (
                  <p className="muted small" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                    Belum ada pemberitahuan. Kami akan mengabari Anda saat pesanan diproses atau ada tamu yang RSVP.
                  </p>
                ) : (
                  <ul className="notif-list">
                    {notifications.map(n => (
                      <li key={n.id} className={`notif-item ${n.type} ${n.isNew ? 'is-new' : ''}`}>
                        <span className="notif-icon">{n.icon}</span>
                        <div>
                          <strong>{n.title} {n.isNew && <em className="new-tag">Baru</em>}</strong>
                          <p>{n.message}</p>
                          <small>{new Date(n.timestamp).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        )}
      </main>

      {/* Modal Buku Tamu / RSVP */}
      {selectedInv && (
        <div className="admin-modal-overlay" onClick={() => setSelectedInv(null)} style={{ zIndex: 1200 }}>
          <div className="admin-modal glass aceh-frame" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <button className="admin-modal-close" onClick={() => setSelectedInv(null)} type="button" aria-label="Tutup">✕</button>
            <h2 style={{ marginBottom: '0.3rem' }}>Buku Tamu &amp; RSVP</h2>
            <p className="muted small" style={{ marginBottom: '1.25rem' }}>Daftar tamu yang telah mengonfirmasi kehadiran dan mengirim ucapan.</p>

            <div className="rsvp-summary">
              {Object.entries(ATTEND).map(([k, a]) => (
                <div key={k} style={{ '--c': a.color }}>
                  <b>{modalList.filter(r => r.attendance === k).length}</b>
                  <small>{a.label}</small>
                </div>
              ))}
            </div>

            <div className="rsvp-list">
              {modalList.length === 0 ? (
                <p className="muted" style={{ textAlign: 'center', padding: '2rem' }}>
                  Belum ada tamu yang mengisi RSVP. Bagikan link undangan agar tamu bisa merespon.
                </p>
              ) : (
                modalList.map(r => (
                  <div key={r.id} className="rsvp-item" style={{ '--c': ATTEND[r.attendance]?.color || 'var(--primary-gold)' }}>
                    <div className="rsvp-item-head">
                      <strong>{r.name}</strong>
                      <span className="rsvp-tag">
                        {ATTEND[r.attendance]?.label || r.attendance}{r.attendance === 'hadir' ? ` · ${r.guests} orang` : ''}
                      </span>
                    </div>
                    {r.message && <p>“{r.message}”</p>}
                    <small>{new Date(r.timestamp).toLocaleString('id-ID')}</small>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
