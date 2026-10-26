import { CONFIG } from '../config';
import { EVENT } from '../content';
import { cellsToPath } from '../pixel';
import { Arrow } from './Arrow';
import { SectionHead } from './SectionHead';

// A map pin on the pixel grid, with a hole in the middle. Its tip is the bottom-centre cell.
const PIN = ['..###..', '.#####.', '###.###', '##...##', '###.###', '.#####.', '.#####.', '..###..', '..###..', '...#...'];
const PIN_PATH = cellsToPath(PIN);

// Opens the venue in Google Maps, where the app offers directions. Renders nothing until mapsUrl is set.
export function Directions({ className }: { className: string }) {
  if (!CONFIG.venue.mapsUrl) return null;
  return (
    <a className={className} href={CONFIG.venue.mapsUrl} target="_blank" rel="noopener">
      Get directions <Arrow />
    </a>
  );
}

// Google's map, toned down to the page's colours (see .map in styles.css) and not draggable, so it never traps a
// scrolling thumb. A green pixel pin sits over Google's own marker; the whole map is one link to Google Maps.
function VenueMap({ at }: { at: [number, number] }) {
  const [lat, lng] = at;
  return (
    <div className="map">
      <iframe
        src={`https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`}
        title={`Map of ${EVENT.where}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        tabIndex={-1}
        aria-hidden="true"
      />
      <svg className="pin" viewBox={`0 0 ${PIN[0].length} ${PIN.length}`} fill="currentColor" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
        <path d={PIN_PATH} />
      </svg>
      <a className="map-link" href={CONFIG.venue.mapsUrl} target="_blank" rel="noopener" aria-label={`Open ${EVENT.where} in Google Maps`} />
    </div>
  );
}

export function Venue() {
  if (!EVENT.venue) return null;
  const at = CONFIG.venue.coordinates;
  return (
    <section aria-labelledby="venue-h">
      <SectionHead id="venue" title="venue/" />
      <div className="band">
        <div className={`frame cells venue${at ? ' with-map' : ''}`}>
          <div className="pad venue-info">
            <p className="slash-big">{EVENT.venue}</p>
            <p className="mono">{`${CONFIG.venue.address || EVENT.city}, ${EVENT.region}`.toLowerCase()}</p>
          </div>
          {at && <VenueMap at={at} />}
          <div className="pad venue-go">
            <p className="mono when">{EVENT.when}</p>
            <Directions className="btn big nudge" />
          </div>
        </div>
      </div>
    </section>
  );
}
