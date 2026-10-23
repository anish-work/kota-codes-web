import { MARK_SIZE, MARK_SVG } from '../weave';

// The Kota Doria weave mark. Colours come from --logo-* tokens, so it follows the theme.
export function WeaveMark({ className = '', label }: { className?: string; label?: string }) {
  return (
    <svg
      className={`lg ${className}`}
      viewBox={`0 0 ${MARK_SIZE} ${MARK_SIZE}`}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: false })}
      dangerouslySetInnerHTML={{ __html: MARK_SVG }}
    />
  );
}

// Side-by-side logo: mark at 2x the wordmark's cap height, then "kota.codes" with a square dot.
export function Lockup() {
  return (
    <span className="lockup">
      <WeaveMark className="lg-mark" />
      <span className="wm">
        kota<i className="dot" aria-hidden="true"></i>codes
      </span>
    </span>
  );
}
