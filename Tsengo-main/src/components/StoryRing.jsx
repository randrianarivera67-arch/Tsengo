// src/components/StoryRing.jsx
// Mametraka bordure BLEU manodidina ny avatar raha manana story mbola velona
// (< 24 ora) ilay olona — format Facebook/Instagram, azo ampiasaina n'aiza n'aiza.
export default function StoryRing({ active, size, children, ringWidth = 2.5 }) {
  if (!active) return children;
  return (
    <div style={{
      display: 'inline-flex', padding: ringWidth, borderRadius: '50%',
      background: 'linear-gradient(135deg,#1877F2,#63A9FF,#1877F2)',
      lineHeight: 0, flexShrink: 0,
    }}>
      <div style={{ padding: 2, borderRadius: '50%', background: 'white', lineHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}
