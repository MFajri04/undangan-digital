import { useState } from 'react';
import { api } from '../api';
import { PintoAceh } from '../shared';

export default function AuthModal({ onClose, onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const switchMode = (login) => {
    setIsLogin(login);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Cek login (Mock sederhana tanpa enkripsi untuk prototipe)
        const users = await api.get(`/users?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);
        if (users.length > 0) {
          const user = users[0];
          localStorage.setItem('lumina-user', JSON.stringify(user));
          onLogin(user);
        } else {
          setError('Username atau password salah. Periksa kembali, ya.');
        }
      } else {
        if (password.length < 4) {
          setError('Password minimal 4 karakter.');
          return;
        }
        // Cek apakah username sudah ada
        const exist = await api.get(`/users?username=${encodeURIComponent(username)}`);
        if (exist.length > 0) {
          setError('Username sudah digunakan. Coba nama lain.');
        } else {
          const newUser = { username, password, name, role: 'client' };
          const created = await api.post('/users', newUser);
          localStorage.setItem('lumina-user', JSON.stringify(created));
          onLogin(created);
        }
      }
    } catch (err) {
      setError('Tidak dapat terhubung ke server. Pastikan database berjalan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div className="admin-modal glass aceh-frame auth-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="admin-modal-close" onClick={onClose} type="button" aria-label="Tutup">✕</button>

        <div className="auth-head">
          <PintoAceh size={48} />
          <h2 id="auth-title">{isLogin ? 'Selamat Datang Kembali' : 'Buat Akun Gratis'}</h2>
          <p className="muted small">
            {isLogin ? 'Masuk untuk memantau pesanan & undangan Anda.' : 'Daftar dalam 30 detik untuk mulai memesan undangan.'}
          </p>
        </div>

        <div className="auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={isLogin} className={isLogin ? 'active' : ''} onClick={() => switchMode(true)}>Masuk</button>
          <button type="button" role="tab" aria-selected={!isLogin} className={!isLogin ? 'active' : ''} onClick={() => switchMode(false)}>Daftar</button>
        </div>

        {error && <div className="admin-error" role="alert" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="auth-name">Nama Lengkap</label>
              <input id="auth-name" className="form-control" required value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: Cut Meutia" autoComplete="name" />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="auth-username">Username</label>
            <input id="auth-username" className="form-control" required value={username} onChange={e => setUsername(e.target.value.trim())} placeholder="Tanpa spasi, contoh: cutmeutia" autoComplete="username" />
          </div>
          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <div className="pass-wrap">
              <input
                id="auth-password"
                type={showPass ? 'text' : 'password'}
                className="form-control"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isLogin ? 'Masukkan password' : 'Minimal 4 karakter'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
              <button type="button" className="pass-toggle" onClick={() => setShowPass(s => !s)} aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'}>
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>
          <button type="submit" id="auth-submit" className="btn-primary submit-btn" disabled={loading}>
            {loading ? 'Memproses…' : isLogin ? 'Masuk' : 'Daftar & Masuk'}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? 'Belum punya akun? ' : 'Sudah punya akun? '}
          <button type="button" onClick={() => switchMode(!isLogin)}>
            {isLogin ? 'Daftar sekarang' : 'Masuk di sini'}
          </button>
        </p>
      </div>
    </div>
  );
}
