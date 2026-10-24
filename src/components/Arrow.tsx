// Pixel arrow for action buttons, on the same square grid as the Kota illustrations: a two-cell shaft and a solid head.
// CSS sizes it in whole pixels per cell (--cell) so it stays crisp, and animates it (see "Arrow" in styles.css).
const CELLS = ['......#...', '......##..', '......###.', '##########', '##########', '......###.', '......##..', '......#...'];

// One horizontal run per row, as a single path.
const PATH = CELLS.map((row, y) => {
  const x = row.indexOf('#');
  return `M${x} ${y}h${row.lastIndexOf('#') - x + 1}v1H${x}z`;
}).join('');

export function Arrow() {
  return (
    <span className="arrow" aria-hidden="true">
      <svg viewBox={`0 0 ${CELLS[0].length} ${CELLS.length}`} fill="currentColor" shapeRendering="crispEdges" focusable="false">
        <path d={PATH} />
      </svg>
    </span>
  );
}
