import { useState, useEffect } from 'react';
import './index.css';
import './aceh.css';
import Portfolio, { portfolioItems } from './components/Portfolio';
import AdminDashboard from './components/AdminDashboard';
import InvitationPage from './components/InvitationPage';
import AuthModal from './components/AuthModal';
import ClientDashboard from './components/ClientDashboard';
import { api } from './api';
import { PACKAGES, THEMES, rupiah, PintoAceh } from './shared';

// Hitung jumlah notifikasi (status pesanan + RSVP) untuk badge lonceng
async function fetchNotifCount(userId) {
  const orders = await api.get(`/orders?userId=${userId}`);
  let count = orders.filter(o => o.status === 'process' || o.status === 'done').length;
  const ids = orders.map(o => String(o.id));
  if (ids.length) {
    const invs = (await api.get('/invitations')).filter(i => ids.includes(String(i.orderId)) && i.published);
    if (invs.length) {
      const slugs = invs.map(i => i.slug);
      const rsvps = (await api.get('/rsvps')).filter(r => slugs.includes(r.slug));
      count += rsvps.length;
    }
  }
  return count;
}

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('lumina-user');
    return saved ? JSON.parse(saved) : null;
  });
  const [showAuth, setShowAuth] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [formError, setFormError] = useState('');
  const [unread, setUnread] = useState(0);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Badge notifikasi belum dibaca
  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin') return;
    fetchNotifCount(currentUser.id)
      .then(total => {
        const seen = Number(localStorage.getItem(`lumina-notif-seen-${currentUser.id}`) || 0);
        setUnread(Math.max(0, total - seen));
      })
      .catch(() => {});
  }, [currentUser, orderSuccess]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const handleSelectTheme = (themeName) => {
    setSelectedTheme(themeName);
    scrollTo('order');
  };

  const handleSelectPackage = (packageId) => {
    setSelectedPackage(packageId);
    scrollTo('order');
  };

  const logout = () => {
    localStorage.removeItem('lumina-user');
    setCurrentUser(null);
    setUnread(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    const f = e.target;
    const formData = {
      name1: f.name1.value.trim(),
      name2: f.name2.value.trim(),
      date: f.date.value,
      package: selectedPackage,
      theme: selectedTheme,
      venue: f.venue.value.trim(),
      phone: f.phone.value.trim(),
      notes: f.notes.value.trim(),
      status: 'pending',
      userId: currentUser.id,
      timestamp: new Date().toISOString(),
    };

    try {
      const created = await api.post('/orders', formData);
      setOrderSuccess(created);
      f.reset();
      setSelectedTheme('');
      setSelectedPackage('');
      scrollTo('order');
    } catch (error) {
      console.error('Error saving order:', error);
      setFormError('Pesanan gagal dikirim. Pastikan koneksi/database berjalan, lalu coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const path = window.location.pathname.replace(/\/$/, '');

  if (path === '/admin') {
    return <AdminDashboard theme={theme} toggleTheme={toggleTheme} />;
  }

  if (path.startsWith('/u/')) {
    const slug = path.split('/u/')[1];
    if (slug) return <InvitationPage slug={slug} />;
  }

  if (path === '/dashboard') {
    if (!currentUser) {
      window.location.href = '/';
      return null;
    }
    return <ClientDashboard user={currentUser} toggleTheme={toggleTheme} theme={theme} />;
  }

  const pkg = PACKAGES.find(p => p.id === selectedPackage);
  const themeObj = THEMES.find(t => t.value === selectedTheme);
  const steps = [
    { icon: '👤', title: 'Masuk / Daftar', desc: 'Buat akun gratis agar pesanan & undangan Anda tersimpan rapi.', done: !!currentUser },
    { icon: '🎨', title: 'Pilih Tema & Paket', desc: 'Lihat Galeri Karya, lalu pilih desain dan paket yang paling cocok.', done: !!(selectedTheme && selectedPackage) },
    { icon: '📝', title: 'Isi Data Acara', desc: 'Lengkapi nama mempelai, tanggal, lokasi & nomor WhatsApp.', done: !!orderSuccess },
    { icon: '🔗', title: 'Terima & Bagikan Link', desc: 'Admin mengirim link undangan. Sebarkan & pantau RSVP tamu dari Dashboard.', done: false },
  ];

  return (
    <div className="app-container">

      {/* ── Navbar ── */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <a href="/" className="logo" aria-label="Beranda Lumina">
          ✦ Lumina<small className="logo-sub">Nuansa Adat Aceh</small>
        </a>
        <div className="nav-links">
          <a href="#cara-pesan" className="nav-link">Cara Pesan</a>
          <a href="#portfolio" id="nav-portfolio" className="nav-link">Galeri Karya</a>
          <a href="#paket" className="nav-link">Paket</a>
          <button onClick={toggleTheme} className="theme-toggle" aria-label="Ganti Tema" title="Ganti mode terang/gelap">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {currentUser ? (
            <div className="nav-user">
              {currentUser.role !== 'admin' && (
                <a href="/dashboard" className="notif-bell" title="Notifikasi" aria-label={`Notifikasi, ${unread} belum dibaca`}>
                  🔔
                  {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
                </a>
              )}
              <a href={currentUser.role === 'admin' ? '/admin' : '/dashboard'} className="btn-primary btn-sm">
                {currentUser.role === 'admin' ? 'Panel Admin' : 'Dashboard Saya'}
              </a>
              <button onClick={logout} className="btn-ghost btn-sm" title="Keluar">Keluar</button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)} className="btn-primary btn-sm" id="nav-login">
              Masuk / Daftar
            </button>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="hero">
        <div className="hero-content">
          <PintoAceh size={64} className="hero-ornament" />
          <p className="hero-eyebrow">✦ Peumulia Jamee Adat Geutanyoe ✦</p>
          <h1>Undangan Digital<br />Bernuansa Adat Aceh</h1>
          <p>
            Sambut tamu dengan undangan digital yang elegan — cukup bagikan satu link
            lewat WhatsApp. Tamu bisa melihat detail acara, lokasi, dan konfirmasi kehadiran (RSVP).
          </p>
          <div className="hero-actions">
            <a href="#order" className="btn-primary" id="hero-cta">Pesan Undangan Sekarang →</a>
            <a href="#portfolio" className="btn-outline">Lihat Contoh Desain</a>
          </div>
          <ul className="hero-trust">
            <li>✔ 4 langkah mudah</li>
            <li>✔ Link siap dibagikan</li>
            <li>✔ RSVP tamu otomatis</li>
          </ul>
        </div>
      </header>

      <div className="rebung-divider" aria-hidden="true" />

      {/* ── Cara Pesan ── */}
      <section id="cara-pesan" className="steps-section">
        <p className="section-eyebrow">Alur Pemesanan</p>
        <h2 className="section-title">Cara Pesan, Mudah &amp; Cepat</h2>
        <p className="section-subtitle">Ikuti 4 langkah berikut. Tanda ✔ hijau menunjukkan langkah yang sudah Anda selesaikan.</p>
        <ol className="steps-grid">
          {steps.map((s, i) => (
            <li key={s.title} className={`step-card glass ${s.done ? 'done' : ''}`}>
              <div className="step-num"><span>{s.done ? '✔' : i + 1}</span></div>
              <div className="step-icon">{s.icon}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </li>
          ))}
        </ol>
        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          {currentUser
            ? <a href="#portfolio" className="btn-outline">Lanjut: Pilih Tema →</a>
            : <button className="btn-primary" onClick={() => setShowAuth(true)}>Mulai dari Langkah 1 →</button>}
        </div>
      </section>

      {/* ── Keunggulan ── */}
      <section className="features">
        <p className="section-eyebrow">Keunggulan</p>
        <h2 className="section-title">Mengapa Memilih Lumina?</h2>
        <div className="features-grid">
          {[
            ['✨', 'Desain Premium', 'Tema eksklusif dengan sentuhan ornamen adat yang anggun untuk hari spesial Anda.'],
            ['📱', 'Responsif & Interaktif', 'Tampil sempurna di HP, dilengkapi RSVP, peta lokasi, dan galeri foto.'],
            ['⚡', 'Cepat & Praktis', 'Undangan siap dibagikan via WhatsApp hanya dengan satu link.'],
            ['🌿', 'Ramah Lingkungan', 'Tanpa kertas & ongkos kirim — hemat biaya dan lebih hijau.'],
            ['🎵', 'Musik Latar', 'Sambut tamu dengan alunan musik pilihan, termasuk nuansa Rapa\'i & Seudati.'],
            ['🔒', 'Privasi Terjaga', 'Undangan hanya bisa dibuka lewat link khusus yang Anda bagikan.'],
          ].map(([icon, title, desc]) => (
            <div key={title} className="feature-card glass">
              <div className="feature-icon">{icon}</div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Galeri ── */}
      <Portfolio onSelectTheme={handleSelectTheme} />

      {/* ── Paket ── */}
      <section id="paket" className="packages-section">
        <p className="section-eyebrow">Langkah 2</p>
        <h2 className="section-title">Pilihan Paket</h2>
        <p className="section-subtitle">Harga sekali bayar, tanpa biaya tersembunyi. Klik “Pilih Paket” untuk langsung mengisi form.</p>
        <div className="packages-grid">
          {PACKAGES.map(p => (
            <div key={p.id} className={`package-card glass ${p.featured ? 'featured' : ''} ${selectedPackage === p.id ? 'selected' : ''}`}>
              {p.featured && <div className="badge">⭐ Terpopuler</div>}
              <div className="package-tier">{p.tier}</div>
              <div className="package-price">{rupiah(p.price)}</div>
              <ul className="package-features">
                {p.features.map(([label, ok]) => (
                  <li key={label} className={ok ? '' : 'disabled'}>{ok ? '✓' : '✗'} {label}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => handleSelectPackage(p.id)}
                className={p.featured || selectedPackage === p.id ? 'btn-primary' : 'btn-outline'}
              >
                {selectedPackage === p.id ? '✔ Paket Dipilih' : 'Pilih Paket'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Form Pemesanan ── */}
      <section id="order" className="order-section">
        <p className="section-eyebrow">Langkah 3</p>
        <h2 className="section-title">Pesan Undangan Anda</h2>
        <p className="section-subtitle">Isi data berikut. Kolom bertanda <span className="req">*</span> wajib diisi.</p>

        <div className="order-container glass aceh-frame">
          {!currentUser ? (
            <div className="empty-state">
              <PintoAceh size={56} />
              <h3>Masuk Terlebih Dahulu</h3>
              <p>Dengan akun, Anda bisa memantau status pesanan, menerima link undangan, dan melihat daftar tamu yang RSVP.</p>
              <button onClick={() => setShowAuth(true)} className="btn-primary">Masuk / Daftar Gratis</button>
            </div>
          ) : orderSuccess ? (
            <div className="empty-state success-state">
              <div className="success-icon">✔</div>
              <h3>Pesanan Berhasil Dikirim!</h3>
              <p>
                Terima kasih, <strong>{currentUser.name}</strong>. Pesanan undangan
                <strong> {orderSuccess.name1} &amp; {orderSuccess.name2}</strong> sudah kami terima.
                Admin akan menghubungi Anda via WhatsApp untuk konfirmasi.
              </p>
              <ol className="next-steps">
                <li><b>Menunggu konfirmasi</b> — admin memeriksa pesanan Anda.</li>
                <li><b>Diproses</b> — undangan dibuat, Anda mendapat notifikasi 🔔.</li>
                <li><b>Selesai</b> — link undangan muncul di Dashboard, siap dibagikan.</li>
              </ol>
              <div className="hero-actions">
                <a href="/dashboard" className="btn-primary">Pantau di Dashboard →</a>
                <button className="btn-outline" onClick={() => setOrderSuccess(null)}>Buat Pesanan Lain</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="order-form">
              <fieldset>
                <legend><span>1</span> Data Mempelai</legend>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name1">Nama Mempelai Pria <span className="req">*</span></label>
                    <input type="text" id="name1" className="form-control" placeholder="Contoh: Teuku Ridwan" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="name2">Nama Mempelai Wanita <span className="req">*</span></label>
                    <input type="text" id="name2" className="form-control" placeholder="Contoh: Cut Nyak Dhien" required />
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend><span>2</span> Detail Acara</legend>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="date">Tanggal Acara <span className="req">*</span></label>
                    <input type="date" id="date" className="form-control" required min={new Date().toISOString().slice(0, 10)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="venue">Lokasi Acara</label>
                    <input type="text" id="venue" className="form-control" placeholder="Contoh: Meuligoe Gubernur, Banda Aceh" />
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend><span>3</span> Desain &amp; Paket</legend>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="package">Paket <span className="req">*</span></label>
                    <select id="package" className="form-control" required value={selectedPackage} onChange={e => setSelectedPackage(e.target.value)}>
                      <option value="">Pilih paket...</option>
                      {PACKAGES.map(p => <option key={p.id} value={p.id}>{p.tier} — {rupiah(p.price)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="theme">Tema Desain <span className="req">*</span></label>
                    <select id="theme" className="form-control" required value={selectedTheme} onChange={e => setSelectedTheme(e.target.value)}>
                      <option value="">Pilih tema...</option>
                      {THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <small className="hint">Belum yakin? <a href="#portfolio">Lihat contoh di Galeri</a></small>
                  </div>
                </div>
                {selectedTheme && (
                  <div className="theme-preview-container glass">
                    <p>Preview tema pilihan Anda</p>
                    <img src={portfolioItems.find(i => i.theme === selectedTheme)?.image} alt="Preview Tema" className="theme-preview-img" />
                  </div>
                )}
              </fieldset>

              <fieldset>
                <legend><span>4</span> Kontak &amp; Catatan</legend>
                <div className="form-group">
                  <label htmlFor="phone">Nomor WhatsApp <span className="req">*</span></label>
                  <input type="tel" id="phone" className="form-control" placeholder="Contoh: 081234567890" pattern="[0-9+ ]{9,15}" title="Masukkan 9–15 digit nomor WhatsApp" required />
                  <small className="hint">Dipakai admin untuk konfirmasi & mengirim link undangan.</small>
                </div>
                <div className="form-group">
                  <label htmlFor="notes">Catatan Tambahan</label>
                  <textarea id="notes" className="form-control" rows="3" placeholder="Permintaan khusus, kutipan favorit, nama orang tua, dsb..."></textarea>
                </div>
              </fieldset>

              {(pkg || themeObj) && (
                <div className="order-summary">
                  <div><span>Paket</span><b>{pkg ? pkg.tier : '—'}</b></div>
                  <div><span>Tema</span><b>{themeObj ? themeObj.label : '—'}</b></div>
                  <div><span>Total</span><b className="price">{pkg ? rupiah(pkg.price) : '—'}</b></div>
                </div>
              )}

              {formError && <div className="admin-error" role="alert">{formError}</div>}

              <button type="submit" id="submit-order" className="btn-primary submit-btn" disabled={submitting}>
                {submitting ? 'Mengirim pesanan...' : '✦ Kirim Pesanan Sekarang'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="site-footer">
        <div className="rebung-divider flip" aria-hidden="true" />
        <PintoAceh size={40} />
        <p className="logo" style={{ fontSize: '1.6rem' }}>✦ Lumina</p>
        <p>Undangan digital premium bernuansa adat Aceh.</p>
        <nav className="footer-links">
          <a href="#cara-pesan">Cara Pesan</a>
          <a href="#portfolio">Galeri</a>
          <a href="#paket">Paket</a>
          <a href="#order">Pesan</a>
        </nav>
        <p className="footer-copy">&copy; 2026 Lumina Digital Invitations · Banda Aceh, Serambi Mekkah</p>
      </footer>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onLogin={(user) => {
            setCurrentUser(user);
            setShowAuth(false);
            if (user.role === 'admin') window.location.href = '/admin';
          }}
        />
      )}
    </div>
  );
}

export default App;
