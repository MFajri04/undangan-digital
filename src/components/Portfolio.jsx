import { useState, useEffect, useCallback } from 'react';

/* ── Data karya desain ──
   Untuk menambah karya baru: taruh gambar di /public/portfolio
   lalu tambahkan satu objek di array ini. */
export const portfolioItems = [
  {
    id: 1,
    title: 'Royal Gold',
    couple: 'Arjuna & Larasati',
    category: 'klasik',
    theme: 'royal-gold',
    image: '/portfolio/royal-gold.jpg',
    description: 'Bingkai filigree emas bergaya art deco di atas latar hitam pekat. Mewah dan berwibawa.',
    colors: ['#0B0B0B', '#D4AF37', '#F3E5AB'],
  },
  {
    id: 2,
    title: 'Midnight Blue Elegance',
    couple: 'Bima & Sekar',
    category: 'modern',
    theme: 'midnight-blue',
    image: '/portfolio/midnight-blue.jpg',
    description: 'Nuansa langit malam dengan bulan sabit dan bintang perak. Romantis dan magis.',
    colors: ['#1B2A4A', '#C0C7D1', '#FFFFFF'],
  },
  {
    id: 3,
    title: 'Emerald Dream',
    couple: 'Raka & Dewi',
    category: 'floral',
    theme: 'emerald-dream',
    image: '/portfolio/emerald-dream.jpg',
    description: 'Daun eucalyptus dan tropis bergaya watercolor dengan aksen emas. Segar dan natural.',
    colors: ['#0F3D2E', '#7FA88B', '#D4AF37'],
  },
  {
    id: 4,
    title: 'Blush Rose',
    couple: 'Dimas & Ayu',
    category: 'floral',
    theme: 'blush-rose',
    image: '/portfolio/blush-rose.jpg',
    description: 'Mawar dan peony merah muda lembut dengan kaligrafi rose gold. Manis dan feminin.',
    colors: ['#F8E1DC', '#E89AAE', '#B76E57'],
  },
  {
    id: 5,
    title: 'Minimalist White',
    couple: 'Fajar & Nadia',
    category: 'modern',
    theme: 'minimalist-white',
    image: '/portfolio/minimalist-white.jpg',
    description: 'Bingkai lengkung tipis dan ilustrasi line-art. Bersih, modern, dan berkelas.',
    colors: ['#FAF8F3', '#1A1A1A', '#C9C2B5'],
  },
  {
    id: 6,
    title: 'Royal Java',
    couple: 'Satria & Kinanti',
    category: 'tradisional',
    theme: 'royal-java',
    image: '/portfolio/royal-java.jpg',
    description: 'Motif batik kawung dan gunungan wayang emas di atas merah marun. Agung dan sarat budaya.',
    colors: ['#5A0F1A', '#D4AF37', '#8B5A2B'],
  },
];

const categories = [
  { key: 'semua', label: 'Semua' },
  { key: 'klasik', label: 'Klasik' },
  { key: 'modern', label: 'Modern' },
  { key: 'floral', label: 'Floral' },
  { key: 'tradisional', label: 'Tradisional' },
];

function Portfolio({ onSelectTheme }) {
  const [activeCategory, setActiveCategory] = useState('semua');
  const [activeIndex, setActiveIndex] = useState(null); // index di dalam filteredItems

  const filteredItems =
    activeCategory === 'semua'
      ? portfolioItems
      : portfolioItems.filter((item) => item.category === activeCategory);

  const isOpen = activeIndex !== null;
  const activeItem = isOpen ? filteredItems[activeIndex] : null;

  const close = useCallback(() => setActiveIndex(null), []);
  const next = useCallback(
    () => setActiveIndex((i) => (i + 1) % filteredItems.length),
    [filteredItems.length]
  );
  const prev = useCallback(
    () => setActiveIndex((i) => (i - 1 + filteredItems.length) % filteredItems.length),
    [filteredItems.length]
  );

  // Navigasi keyboard + kunci scroll saat lightbox terbuka
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, close, next, prev]);

  const handleOrder = (item) => {
    close();
    onSelectTheme?.(item.theme);
  };

  return (
    <section id="portfolio" className="portfolio-section">
      <p className="section-eyebrow">✦ Portofolio</p>
      <h2 className="section-title">Galeri Karya Kami</h2>
      <p className="section-subtitle">
        Jelajahi koleksi desain undangan yang telah kami ciptakan. Klik karya untuk melihat detailnya.
      </p>

      {/* Filter kategori */}
      <div className="portfolio-filters" role="tablist">
        {categories.map((cat) => {
          const count =
            cat.key === 'semua'
              ? portfolioItems.length
              : portfolioItems.filter((i) => i.category === cat.key).length;
          return (
            <button
              key={cat.key}
              id={`filter-${cat.key}`}
              role="tab"
              aria-selected={activeCategory === cat.key}
              className={`filter-btn ${activeCategory === cat.key ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.key)}
            >
              {cat.label}
              <span className="filter-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Grid karya */}
      <div className="portfolio-grid">
        {filteredItems.map((item, index) => (
          <article
            key={`${activeCategory}-${item.id}`}
            id={`portfolio-item-${item.id}`}
            className="portfolio-card"
            style={{ animationDelay: `${index * 80}ms` }}
            onClick={() => setActiveIndex(index)}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setActiveIndex(index)}
          >
            <div className="portfolio-image-wrap">
              <img src={item.image} alt={`Desain undangan ${item.title}`} loading="lazy" />
              <div className="portfolio-overlay">
                <span className="view-btn">🔍 Lihat Detail</span>
              </div>
              <span className="portfolio-tag">{item.category}</span>
            </div>
            <div className="portfolio-info">
              <h3>{item.title}</h3>
              <p>{item.couple}</p>
            </div>
          </article>
        ))}
      </div>

      {/* Lightbox */}
      {activeItem && (
        <div className="lightbox" onClick={close} role="dialog" aria-modal="true">
          <button id="lightbox-close" className="lightbox-close" onClick={close} aria-label="Tutup">
            ✕
          </button>
          {filteredItems.length > 1 && (
            <>
              <button
                id="lightbox-prev"
                className="lightbox-nav prev"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                aria-label="Sebelumnya"
              >
                ‹
              </button>
              <button
                id="lightbox-next"
                className="lightbox-nav next"
                onClick={(e) => { e.stopPropagation(); next(); }}
                aria-label="Berikutnya"
              >
                ›
              </button>
            </>
          )}

          <div className="lightbox-content glass" key={activeItem.id} onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-image">
              <img src={activeItem.image} alt={`Desain undangan ${activeItem.title}`} />
            </div>
            <div className="lightbox-details">
              <span className="portfolio-tag static">{activeItem.category}</span>
              <h3>{activeItem.title}</h3>
              <p className="lightbox-couple">{activeItem.couple}</p>
              <p className="lightbox-desc">{activeItem.description}</p>

              <div className="lightbox-palette">
                <span>Palet Warna</span>
                <div>
                  {activeItem.colors.map((c) => (
                    <i key={c} style={{ background: c }} title={c} />
                  ))}
                </div>
              </div>

              <button
                id="lightbox-order"
                className="btn-primary"
                onClick={() => handleOrder(activeItem)}
              >
                Pesan Tema Ini →
              </button>
              <p className="lightbox-counter">
                {activeIndex + 1} / {filteredItems.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default Portfolio;
