import { STATUS } from '../content';

// The black bar at the top of every page: where things stand, in one mono line. The middle item is the headline number.
export function StatusBar() {
  return (
    <div className="bar">
      <p className="in">
        {STATUS.map((s, i) => (
          <span key={s} className={i === 1 ? 'num' : undefined}>
            {s}
          </span>
        ))}
      </p>
    </div>
  );
}
