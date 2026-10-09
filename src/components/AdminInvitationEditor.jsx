import { useState, useEffect } from 'react';
import { api, slugify, invitationUrl } from '../api';

export default function AdminInvitationEditor({ order, onClose }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inv, setInv] = useState(null);
  
  // URL untuk share
  const shareLink = inv ? invitationUrl(inv.slug) : '';

  useEffect(() => {
    (async () => {
      try {
        const list = await api.get(`/invitations?orderId=${order.id}`);
        if (list.length > 0) {
          setInv(list[0]);
        } else {
          // Buat data baru berdasarkan order
          setInv({
            orderId: order.id,
            slug: slugify(`${order.name1} dan ${order.name2}`),
            theme: order.theme,
            published: false,
            greeting: 'Bismillahirrahmanirrahim',
            opening: 'Dengan memohon rahmat dan ridho Allah SWT, kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan kami:',
            quote: 'Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu isteri-isteri dari jenismu sendiri, supaya kamu cenderung dan merasa tenteram kepadanya...',
            quoteSource: 'Ar-Rum: 21',
            groom: { nick: order.name1, full: `${order.name1} Putra`, parents: 'Putra dari Bpk. Fulan & Ibu Fulanah', photo: '' },
            bride: { nick: order.name2, full: `${order.name2} Putri`, parents: 'Putri dari Bpk. Fulan & Ibu Fulanah', photo: '' },
            akad: { label: 'Akad Nikah', date: order.date, start: '08:00', end: '10:00', place: order.venue || '', address: '', mapUrl: '' },
            resepsi: { label: 'Resepsi', date: order.date, start: '11:00', end: '14:00', place: order.venue || '', address: '', mapUrl: '' },
            gallery: [],
            musicUrl: '',
          });
        }
      } catch (err) {
        alert('Gagal memuat data undangan');
        onClose();
      } finally {
        setLoading(false);
      }
    })();
  }, [order, onClose]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (inv.id) {
        await api.patch(`/invitations/${inv.id}`, inv);
      } else {
        const created = await api.post('/invitations', inv);
        setInv(created);
      }
      alert('Data undangan berhasil disimpan!');
    } catch {
      alert('Gagal menyimpan data undangan');
    } finally {
      setSaving(false);
    }
  };

  const updateNested = (key, subKey, val) => {
    setInv(prev => ({
      ...prev,
      [key]: { ...prev[key], [subKey]: val }
    }));
  };

  if (loading) return (
    <div className="admin-modal-overlay">
      <div className="admin-modal glass">Memuat...</div>
    </div>
  );

  return (
    <div className="admin-modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="admin-modal glass" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
        <button className="admin-modal-close" onClick={onClose} type="button">✕</button>
        <h2>Kelola Undangan Digital</h2>
        <p className="cell-muted">Pesanan: {order.name1} & {order.name2}</p>
        
        <form onSubmit={save} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Status & Slug */}
          <div className="glass" style={{ padding: '1.25rem', borderRadius: '12px' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Pengaturan Publikasi</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Slug URL (Link)</label>
                <input className="form-control" value={inv.slug} onChange={e => setInv({...inv, slug: e.target.value})} required />
                <small style={{ color: 'var(--text-muted)' }}>{shareLink}</small>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={inv.published} onChange={e => setInv({...inv, published: e.target.checked})} style={{ width: '20px', height: '20px' }} />
                  <span style={{ fontWeight: '600', color: inv.published ? '#34D399' : 'var(--text-muted)' }}>
                    {inv.published ? '🟢 Link Aktif (Bisa diakses publik)' : '⚪ Draft (Belum bisa diakses)'}
                  </span>
                </label>
              </div>
            </div>
            {inv.published && inv.id && (
              <div style={{ marginTop: '0.5rem' }}>
                <a className="btn-outline" href={`/u/${inv.slug}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                  👁️ Buka Undangan
                </a>
              </div>
            )}
          </div>

          {/* Mempelai */}
          <div className="glass" style={{ padding: '1.25rem', borderRadius: '12px' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Data Mempelai</h3>
            
            <h4 style={{ marginBottom: '0.5rem', color: 'var(--primary-gold)' }}>Mempelai 1</h4>
            <div className="form-row">
              <div className="form-group"><label>Panggilan</label><input className="form-control" value={inv.groom.nick} onChange={e => updateNested('groom', 'nick', e.target.value)} required /></div>
              <div className="form-group"><label>Nama Lengkap</label><input className="form-control" value={inv.groom.full} onChange={e => updateNested('groom', 'full', e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Nama Orang Tua</label><input className="form-control" value={inv.groom.parents} onChange={e => updateNested('groom', 'parents', e.target.value)} /></div>
              <div className="form-group"><label>URL Foto (opsional)</label><input className="form-control" value={inv.groom.photo} onChange={e => updateNested('groom', 'photo', e.target.value)} /></div>
            </div>

            <h4 style={{ margin: '1rem 0 0.5rem', color: 'var(--primary-gold)' }}>Mempelai 2</h4>
            <div className="form-row">
              <div className="form-group"><label>Panggilan</label><input className="form-control" value={inv.bride.nick} onChange={e => updateNested('bride', 'nick', e.target.value)} required /></div>
              <div className="form-group"><label>Nama Lengkap</label><input className="form-control" value={inv.bride.full} onChange={e => updateNested('bride', 'full', e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Nama Orang Tua</label><input className="form-control" value={inv.bride.parents} onChange={e => updateNested('bride', 'parents', e.target.value)} /></div>
              <div className="form-group"><label>URL Foto (opsional)</label><input className="form-control" value={inv.bride.photo} onChange={e => updateNested('bride', 'photo', e.target.value)} /></div>
            </div>
          </div>

          {/* Acara */}
          <div className="glass" style={{ padding: '1.25rem', borderRadius: '12px' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Waktu & Tempat</h3>
            
            <h4 style={{ marginBottom: '0.5rem', color: 'var(--primary-gold)' }}>Acara 1 (Akad)</h4>
            <div className="form-row">
              <div className="form-group"><label>Tanggal</label><input type="date" className="form-control" value={inv.akad.date} onChange={e => updateNested('akad', 'date', e.target.value)} /></div>
              <div className="form-group"><label>Mulai</label><input type="time" className="form-control" value={inv.akad.start} onChange={e => updateNested('akad', 'start', e.target.value)} /></div>
              <div className="form-group"><label>Selesai</label><input type="time" className="form-control" value={inv.akad.end} onChange={e => updateNested('akad', 'end', e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Nama Tempat</label><input className="form-control" value={inv.akad.place} onChange={e => updateNested('akad', 'place', e.target.value)} /></div>
              <div className="form-group"><label>Alamat Detail</label><input className="form-control" value={inv.akad.address} onChange={e => updateNested('akad', 'address', e.target.value)} /></div>
            </div>

            <h4 style={{ margin: '1rem 0 0.5rem', color: 'var(--primary-gold)' }}>Acara 2 (Resepsi)</h4>
            <div className="form-row">
              <div className="form-group"><label>Tanggal</label><input type="date" className="form-control" value={inv.resepsi.date} onChange={e => updateNested('resepsi', 'date', e.target.value)} /></div>
              <div className="form-group"><label>Mulai</label><input type="time" className="form-control" value={inv.resepsi.start} onChange={e => updateNested('resepsi', 'start', e.target.value)} /></div>
              <div className="form-group"><label>Selesai</label><input type="time" className="form-control" value={inv.resepsi.end} onChange={e => updateNested('resepsi', 'end', e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Nama Tempat</label><input className="form-control" value={inv.resepsi.place} onChange={e => updateNested('resepsi', 'place', e.target.value)} /></div>
              <div className="form-group"><label>Alamat Detail</label><input className="form-control" value={inv.resepsi.address} onChange={e => updateNested('resepsi', 'address', e.target.value)} /></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="btn-outline" onClick={onClose}>Tutup</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Undangan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
