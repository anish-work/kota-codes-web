// Pixel shapes for small UI marks (the button arrow, the map pin), drawn on the same square grid as the
// Kota illustrations. Rows of '#' (filled) and '.' (empty), turned into one SVG path, one rect per run of '#'.
export function cellsToPath(cells: string[]) {
  return cells
    .flatMap((row, y) => [...row.matchAll(/#+/g)].map((m) => `M${m.index} ${y}h${m[0].length}v1H${m.index}z`))
    .join('');
}
