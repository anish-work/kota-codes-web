export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={(size * 26) / 34} viewBox="0 0 34 26" aria-hidden="true">
      <rect x="0" y="18" width="26" height="7" rx="1.5" fill="#2E7A3C" />
      <rect x="4" y="9.5" width="26" height="7" rx="1.5" fill="#6CC08F" />
      <rect x="8" y="1" width="26" height="7" rx="1.5" fill="#C8F169" />
    </svg>
  );
}
