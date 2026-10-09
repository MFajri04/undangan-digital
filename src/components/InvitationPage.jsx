import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { api, invitationUrl } from '../api';
import { portfolioItems } from './Portfolio';
import './Invitation.css';

/* ───────── Helpers ───────── */
const formatLongDate = (d) =>
  d
    ? new Date(d + 'T00:00:00').toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

const formatShortDate = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' . ') : '';

const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return 'baru saja';
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return `${Math.floor(s / 86400)} hari lalu`;
};

const mapsSearchUrl = (ev) =>
  ev.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ev.place}, ${ev.address}`)}`;

const mapsEmbedUrl = (ev) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(`${ev.place}, ${ev.address}`)}&z=15&output=embed`;

const calendarUrl = (inv, ev) => {
  const d = (ev.date || '').replace(/-/g, '');
  const t = (x) => (x && /^\d{2}:\d{2}$/.test(x) ? x.replace(':', '') + '00' : null);
  const start = t(ev.start) || '080000';
  const end = t(ev.end) || String(Number(start.slice(0, 2)) + 2).padStart(2, '0') + start.slice(2);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${ev.label} ${inv.groom.nick} & ${inv.bride.nick}`,
    dates: `${d}T${start}/${d}T${end}`,
    location: `${ev.place}, ${ev.address}`,
    ctz: 'Asia/Jakarta',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
};

const ATTENDANCE = {
  hadir: { label: 'Hadir', icon: '✓' },
  tidak: { label: 'Tidak Hadir', icon: '✕' },
  ragu: { label: 'Masih Ragu', icon: '?' },
};

/* ───────── Scroll reveal ───────── */
function useReveal(deps) {
  useEffect(() => {
    const els = document.querySelectorAll('.inv-reveal:not(.visible)');
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* ───────── Countdown ───────── */
function Countdown({ target }) {
  const calc = useCallback(() => {
    const diff = Math.max(0, new Date(target) - Date.now());
    return {
      Hari: Math.floor(diff / 86400000),
      Jam: Math.floor((diff / 3600000) % 24),
      Menit: Math.floor((diff / 60000) % 60),
      Detik: Math.floor((diff / 1000) % 60),
      done: diff === 0,
    };
  }, [target]);
  const [left, setLeft] = useState(calc);

  useEffect(() => {
    const t = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(t);
  }, [calc]);

  if (left.done) return <p className="inv-countdown-done">🎉 Hari bahagia telah tiba!</p>;

  return (
    <div className="inv-countdown">
      {['Hari', 'Jam', 'Menit', 'Detik'].map((k) => (
        <div key={k} className="inv-count-box">
          <span>{String(left[k]).padStart(2, '0')}</span>
          <small>{k}</small>
        </div>
      ))}
    </div>
  );
}

/* ───────── Halaman Undangan ───────── */
export default function InvitationPage({ slug }) {
  const guest = useMemo(() => new URLSearchParams(window.location.search).get('to')?.trim() || '', []);
  const [inv, setInv] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | notfound | error
  const [opened, setOpened] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [wishes, setWishes] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [copied, setCopied] = useState(false);
  const [rsvp, setRsvp] = useState({ name: guest, attendance: 'hadir', guests: 1, message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const audioRef = useRef(null);

  /* Ambil data undangan */
  useEffect(() => {
    (async () => {
      try {
        const list = await api.get(`/invitations?slug=${encodeURIComponent(slug)}`);
        const found = list.find((i) => i.slug === slug && i.published);
        if (!found) return setState('notfound');
        setInv(found);
        setState('ready');
        document.title = `Undangan Pernikahan ${found.groom.nick} & ${found.bride.nick}`;
      } catch {
        setState('error');
      }
    })();
  }, [slug]);

  const loadWishes = useCallback(async () => {
    try {
      const list = await api.get(`/rsvps?slug=${encodeURIComponent(slug)}`);
      setWishes(list.filter((w) => w.slug === slug).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    } catch {
      /* abaikan */
    }
  }, [slug]);

  useEffect(() => {
    if (state === 'ready') loadWishes();
  }, [state, loadWishes]);

  /* Kunci scroll sebelum undangan dibuka */
  useEffect(() => {
    document.body.style.overflow = opened ? '' : 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [opened]);

  useReveal([opened, wishes.length]);

  /* Navigasi lightbox dengan keyboard */
  useEffect(() => {
    if (lightbox === null || !inv) return;
    const n = inv.gallery.length;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox((i) => (i + 1) % n);
      if (e.key === 'ArrowLeft') setLightbox((i) => (i - 1 + n) % n);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, inv]);

  const openInvitation = () => {
    setOpened(true);
    window.scrollTo(0, 0);
    if (audioRef.current) {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  const toggleMusic = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {});
    else { a.pause(); setPlaying(false); }
  };

  const submitRsvp = async (e) => {
    e.preventDefault();
    if (!rsvp.name.trim() || !rsvp.message.trim()) return;
    setSending(true);
    try {
      await api.post('/rsvps', {
        slug,
        name: rsvp.name.trim(),
        attendance: rsvp.attendance,
        guests: rsvp.attendance === 'hadir' ? Number(rsvp.guests) : 0,
        message: rsvp.message.trim(),
        timestamp: new Date().toISOString(),
      });
      setSent(true);
      setRsvp((r) => ({ ...r, message: '' }));
      loadWishes();
    } catch {
      alert('Maaf, ucapan gagal terkirim. Silakan coba lagi.');
    } finally {
      setSending(false);
    }
  };

  const shareLink = invitationUrl(slug);
  const shareText = inv
    ? `Assalamu'alaikum Wr. Wb.\n\nTanpa mengurangi rasa hormat, kami mengundang Bapak/Ibu/Saudara/i untuk hadir di acara pernikahan kami:\n\n*${inv.groom.nick} & ${inv.bride.nick}*\n\nBerikut link undangan kami:\n${shareLink}\n\nMerupakan suatu kehormatan apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.\n\nTerima kasih 🙏`
    : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
    } catch {
      window.prompt('Salin link undangan:', shareLink);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nativeShare = () => {
    if (navigator.share) navigator.share({ title: document.title, text: shareText, url: shareLink }).catch(() => {});
    else copyLink();
  };

  /* ───── State non-ready ───── */
  if (state !== 'ready') {
    return (
      <div className="inv-root inv-status" data-inv-theme="royal-gold">
        <div className="inv-status-box">
          <span className="inv-script">Lumina</span>
          {state === 'loading' && <p>Memuat undangan...</p>}
          {state === 'notfound' && (
            <>
              <h1>Undangan Tidak Ditemukan</h1>
              <p>Link undangan ini tidak tersedia atau belum diaktifkan. Silakan periksa kembali link yang Anda terima.</p>
            </>
          )}
          {state === 'error' && (
            <>
              <h1>Gagal Memuat</h1>
              <p>Tidak dapat terhubung ke server. Silakan muat ulang halaman.</p>
            </>
          )}
          <a href="/" className="inv-btn">Kunjungi Lumina</a>
        </div>
      </div>
    );
  }

  const themeImage = portfolioItems.find((p) => p.theme === inv.theme)?.image;
  const cover = inv.coverImage || inv.gallery?.[0] || themeImage;
  const events = [inv.akad, inv.resepsi].filter((ev) => ev && ev.date);
  const countdownTarget = events[0] ? `${events[0].date}T${/^\d{2}:\d{2}$/.test(events[0].start) ? events[0].start : '08:00'}:00` : null;
  const venues = events.filter(
    (ev, i, arr) => ev.address && arr.findIndex((x) => `${x.place}${x.address}` === `${ev.place}${ev.address}`) === i
  );
  const stats = {
    hadir: wishes.filter((w) => w.attendance === 'hadir').reduce((s, w) => s + (w.guests || 1), 0),
    tidak: wishes.filter((w) => w.attendance === 'tidak').length,
    ragu: wishes.filter((w) => w.attendance === 'ragu').length,
  };

  return (
    <div className="inv-root" data-inv-theme={inv.theme}>
      {inv.musicUrl && <audio ref={audioRef} src={inv.musicUrl} loop preload="auto" />}

      {/* ───── Cover ───── */}
      <section className={`inv-cover ${opened ? 'is-open' : ''}`} style={{ backgroundImage: `url(${cover})` }}>
        <div className="inv-cover-inner">
          <p className="inv-eyebrow">The Wedding of</p>
          <h1 className="inv-script inv-cover-names">
            {inv.groom.nick} <span>&amp;</span> {inv.bride.nick}
          </h1>
          <p className="inv-cover-date">{formatShortDate(events[0]?.date)}</p>
          <div className="inv-guest">
            <p>Kepada Yth. Bapak/Ibu/Saudara/i</p>
            <h2>{guest || 'Tamu Undangan'}</h2>
            <small>Mohon maaf apabila ada kesalahan penulisan nama/gelar</small>
          </div>
          <button id="open-invitation" className="inv-btn inv-btn-glow" onClick={openInvitation}>
            ✉ Buka Undangan
          </button>
        </div>
      </section>

      {/* ───── Konten ───── */}
      <main className="inv-main">
        {/* Hero */}
        <section className="inv-hero" style={{ backgroundImage: `url(${cover})` }}>
          <div className="inv-hero-inner inv-reveal">
            <p className="inv-eyebrow">The Wedding of</p>
            <h2 className="inv-script inv-hero-names">
              {inv.groom.nick} <span>&amp;</span> {inv.bride.nick}
            </h2>
            <p className="inv-hero-date">{formatLongDate(events[0]?.date)}</p>
            <div className="inv-scroll-hint">⌄</div>
          </div>
        </section>

        {/* Pembuka & Quote */}
        <section className="inv-section inv-quote-section">
          <div className="inv-ornament inv-reveal">❦</div>
          {inv.quote && (
            <blockquote className="inv-quote inv-reveal">
              “{inv.quote}”
              {inv.quoteSource && <cite>— {inv.quoteSource}</cite>}
            </blockquote>
          )}
        </section>

        {/* Mempelai */}
        <section className="inv-section">
          {inv.greeting && <p className="inv-eyebrow inv-reveal">{inv.greeting}</p>}
          <p className="inv-opening inv-reveal">{inv.opening}</p>
          <div className="inv-couple">
            {[inv.groom, inv.bride].map((p, idx) => (
              <div key={idx} className="inv-person inv-reveal">
                <div className="inv-photo">
                  {p.photo ? <img src={p.photo} alt={p.full || p.nick} /> : <span className="inv-script">{p.nick?.[0]}</span>}
                </div>
                <h3 className="inv-script">{p.nick}</h3>
                <h4>{p.full}</h4>
                {p.parents && <p>{p.parents}</p>}
                {idx === 0 && <div className="inv-and inv-script">&amp;</div>}
              </div>
            ))}
          </div>
        </section>

        {/* Countdown */}
        {countdownTarget && (
          <section className="inv-section inv-band">
            <h2 className="inv-title inv-reveal">Menuju Hari Bahagia</h2>
            <div className="inv-reveal">
              <Countdown target={countdownTarget} />
            </div>
          </section>
        )}

        {/* Acara */}
        {events.length > 0 && (
          <section className="inv-section">
            <h2 className="inv-title inv-reveal">Waktu &amp; Tempat</h2>
            <div className="inv-events">
              {events.map((ev, i) => (
                <div key={i} className="inv-card inv-event inv-reveal">
                  <h3 className="inv-script">{ev.label}</h3>
                  <p className="inv-event-date">{formatLongDate(ev.date)}</p>
                  <p className="inv-event-time">
                    🕗 {ev.start || '-'} {ev.end ? `– ${ev.end}` : ''} WIB
                  </p>
                  <div className="inv-divider" />
                  <p className="inv-event-place">{ev.place}</p>
                  <p className="inv-event-address">{ev.address}</p>
                  <div className="inv-event-actions">
                    <a className="inv-btn inv-btn-sm" href={mapsSearchUrl(ev)} target="_blank" rel="noreferrer">📍 Google Maps</a>
                    <a className="inv-btn inv-btn-sm inv-btn-ghost" href={calendarUrl(inv, ev)} target="_blank" rel="noreferrer">📅 Simpan Tanggal</a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Lokasi */}
        {venues.length > 0 && (
          <section className="inv-section inv-band">
            <h2 className="inv-title inv-reveal">Lokasi Acara</h2>
            <div className="inv-maps">
              {venues.map((ev, i) => (
                <div key={i} className="inv-map inv-reveal">
                  <iframe title={`Peta ${ev.place}`} src={mapsEmbedUrl(ev)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                  <div className="inv-map-info">
                    <div>
                      <strong>{ev.place}</strong>
                      <p>{ev.address}</p>
                    </div>
                    <a className="inv-btn inv-btn-sm" href={mapsSearchUrl(ev)} target="_blank" rel="noreferrer">Petunjuk Arah</a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Galeri */}
        {inv.gallery?.length > 0 && (
          <section className="inv-section">
            <h2 className="inv-title inv-reveal">Galeri Kami</h2>
            <div className="inv-gallery">
              {inv.gallery.map((src, i) => (
                <button key={i} className="inv-gallery-item inv-reveal" onClick={() => setLightbox(i)}>
                  <img src={src} alt={`Foto ${i + 1}`} loading="lazy" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* RSVP & Ucapan */}
        <section className="inv-section inv-band">
          <h2 className="inv-title inv-reveal">RSVP &amp; Ucapan</h2>
          <p className="inv-sub inv-reveal">Kehadiran dan doa restu Anda sangat berarti bagi kami.</p>

          <div className="inv-rsvp-stats inv-reveal">
            <div><strong>{stats.hadir}</strong><span>Hadir</span></div>
            <div><strong>{stats.tidak}</strong><span>Tidak Hadir</span></div>
            <div><strong>{stats.ragu}</strong><span>Masih Ragu</span></div>
          </div>

          <form className="inv-card inv-rsvp-form inv-reveal" onSubmit={submitRsvp}>
            <input
              id="rsvp-name"
              className="inv-input"
              placeholder="Nama Anda"
              value={rsvp.name}
              onChange={(e) => setRsvp({ ...rsvp, name: e.target.value })}
              required
            />
            <div className="inv-attendance">
              {Object.entries(ATTENDANCE).map(([k, v]) => (
                <button
                  type="button"
                  key={k}
                  className={`inv-chip ${rsvp.attendance === k ? 'active' : ''}`}
                  onClick={() => setRsvp({ ...rsvp, attendance: k })}
                >
                  {v.icon} {v.label}
                </button>
              ))}
            </div>
            {rsvp.attendance === 'hadir' && (
              <select
                className="inv-input"
                value={rsvp.guests}
                onChange={(e) => setRsvp({ ...rsvp, guests: e.target.value })}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n} orang</option>
                ))}
              </select>
            )}
            <textarea
              id="rsvp-message"
              className="inv-input"
              rows="3"
              placeholder="Tulis ucapan & doa untuk kedua mempelai..."
              value={rsvp.message}
              onChange={(e) => setRsvp({ ...rsvp, message: e.target.value })}
              required
            />
            <button id="rsvp-submit" className="inv-btn" disabled={sending}>
              {sending ? 'Mengirim...' : 'Kirim Ucapan'}
            </button>
            {sent && <p className="inv-success">Terima kasih! Ucapan Anda telah terkirim 💌</p>}
          </form>

          <div className="inv-wishes">
            {wishes.length === 0 ? (
              <p className="inv-sub">Jadilah yang pertama memberikan ucapan 🤍</p>
            ) : (
              wishes.map((w) => (
                <div key={w.id} className="inv-wish inv-reveal">
                  <div className="inv-wish-head">
                    <strong>{w.name}</strong>
                    <span className={`inv-badge inv-badge-${w.attendance}`}>{ATTENDANCE[w.attendance]?.label}</span>
                  </div>
                  <p>{w.message}</p>
                  <small>{timeAgo(w.timestamp)}</small>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Bagikan */}
        <section className="inv-section">
          <h2 className="inv-title inv-reveal">Bagikan Undangan</h2>
          <p className="inv-sub inv-reveal">Bantu kami menyebarkan kabar bahagia ini.</p>
          <div className="inv-share inv-reveal">
            <a
              id="share-wa"
              className="inv-btn inv-btn-wa"
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noreferrer"
            >
              💬 Bagikan ke WhatsApp
            </a>
            <button id="share-copy" className="inv-btn inv-btn-ghost" onClick={copyLink}>
              {copied ? '✓ Link Tersalin' : '🔗 Salin Link'}
            </button>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button className="inv-btn inv-btn-ghost" onClick={nativeShare}>📤 Lainnya</button>
            )}
          </div>
        </section>

        {/* Penutup */}
        <footer className="inv-footer">
          <p className="inv-reveal">
            Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan
            memberikan doa restu.
          </p>
          <p className="inv-eyebrow inv-reveal">Kami yang berbahagia</p>
          <h2 className="inv-script inv-reveal">
            {inv.groom.nick} &amp; {inv.bride.nick}
          </h2>
          <a href="/" className="inv-credit">Dibuat dengan ✦ Lumina</a>
        </footer>
      </main>

      {/* Tombol musik */}
      {inv.musicUrl && opened && (
        <button className={`inv-music ${playing ? 'playing' : ''}`} onClick={toggleMusic} aria-label="Musik">
          {playing ? '♫' : '🔇'}
        </button>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="inv-lightbox" onClick={() => setLightbox(null)}>
          <button className="inv-lb-btn inv-lb-close" onClick={() => setLightbox(null)}>✕</button>
          {inv.gallery.length > 1 && (
            <button
              className="inv-lb-btn inv-lb-prev"
              onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + inv.gallery.length) % inv.gallery.length); }}
            >‹</button>
          )}
          <img src={inv.gallery[lightbox]} alt="" onClick={(e) => e.stopPropagation()} />
          {inv.gallery.length > 1 && (
            <button
              className="inv-lb-btn inv-lb-next"
              onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % inv.gallery.length); }}
            >›</button>
          )}
        </div>
      )}
    </div>
  );
}
