// The Petal flower: five pastel petals around a check mark. Used on the welcome and empty screens.
const COLORS = ['#FFD9A8', '#E7DDFB', '#D9F2E3', '#FFE9B5', '#F9C6D4'];
export default function Flower({ size = 160, center = '#141414', mark = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true">
      {COLORS.map((c, i) => (
        <ellipse key={i} cx="100" cy="52" rx="24" ry="48" fill={c} transform={`rotate(${i * 72} 100 100)`} />
      ))}
      <circle cx="100" cy="100" r="30" fill={center} />
      <path d="M86 100l10 10 20-22" fill="none" stroke={mark} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
