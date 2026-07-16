// src/components/Skeleton.jsx
// Blocs "squelette" façon Facebook (shimmer) — utilisés pendant le chargement
// des pages, à la place d'un simple "Chargement...".
export function SkeletonBlock({ w = '100%', h = 14, r = 8, style = {} }) {
  return (
    <div className="skeleton-shimmer" style={{ width: w, height: h, borderRadius: r, ...style }} />
  );
}

export function SkeletonCircle({ size = 40, style = {} }) {
  return (
    <div className="skeleton-shimmer" style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, ...style }} />
  );
}

// Squelette d'une publication du fil d'actualités (avatar + lignes + image)
export function SkeletonPost() {
  return (
    <div className="card" style={{ marginBottom: 12, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <SkeletonCircle size={40} />
        <div style={{ flex: 1 }}>
          <SkeletonBlock w="45%" h={13} style={{ marginBottom: 6 }} />
          <SkeletonBlock w="25%" h={10} />
        </div>
      </div>
      <SkeletonBlock w="90%" h={12} style={{ marginBottom: 6 }} />
      <SkeletonBlock w="70%" h={12} style={{ marginBottom: 12 }} />
      <SkeletonBlock w="100%" h={180} r={12} />
    </div>
  );
}

// Squelette d'une publication seule (page PostDetail)
export function SkeletonSinglePost() {
  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <SkeletonCircle size={44} />
        <div style={{ flex: 1 }}>
          <SkeletonBlock w="40%" h={14} style={{ marginBottom: 6 }} />
          <SkeletonBlock w="22%" h={10} />
        </div>
      </div>
      <SkeletonBlock w="95%" h={13} style={{ marginBottom: 8 }} />
      <SkeletonBlock w="75%" h={13} style={{ marginBottom: 16 }} />
      <SkeletonBlock w="100%" h={320} r={14} style={{ marginBottom: 16 }} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <SkeletonBlock w="33%" h={36} r={18} />
        <SkeletonBlock w="33%" h={36} r={18} />
        <SkeletonBlock w="33%" h={36} r={18} />
      </div>
      {[0, 1].map((i) => (
        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <SkeletonCircle size={34} />
          <div style={{ flex: 1 }}>
            <SkeletonBlock w="60%" h={12} style={{ marginBottom: 6 }} />
            <SkeletonBlock w="40%" h={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Squelette d'une page "canal" (Artiste / Boutique) : bannière, titre,
// boutons, carte info, galerie horizontale — correspond au visuel Facebook.
export function SkeletonChannelPage() {
  return (
    <div style={{ paddingBottom: 20 }}>
      <div className="skeleton-shimmer" style={{ height: 170, borderRadius: 0 }} />
      <div style={{ padding: '16px 16px 0' }}>
        <SkeletonBlock w="60%" h={22} style={{ marginBottom: 8 }} />
        <SkeletonBlock w="35%" h={13} style={{ marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <SkeletonBlock w="48%" h={40} r={20} />
          <SkeletonBlock w="48%" h={40} r={20} />
        </div>
      </div>
      <div style={{ height: 10, background: '#F0F2F5' }} />
      <div style={{ padding: 16 }}>
        <div style={{ background: '#F7F8FA', borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <SkeletonBlock w="70%" h={14} style={{ marginBottom: 10 }} />
          <SkeletonBlock w="95%" h={12} style={{ marginBottom: 8 }} />
          <SkeletonBlock w="80%" h={12} style={{ marginBottom: 8 }} />
          <SkeletonBlock w="55%" h={12} />
        </div>
        <SkeletonBlock w="40%" h={14} style={{ marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ flex: 1 }}>
              <SkeletonBlock w="100%" h={110} r={12} style={{ marginBottom: 6 }} />
              <SkeletonBlock w="80%" h={10} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '0 16px' }}>
        <SkeletonPost />
      </div>
    </div>
  );
}
