import type { EscapeRoute, RouteStep, SafeDestination } from '../data/helpScenario';
import { bearingDeg } from './fireRiskGeometry';
import type { LatLng } from './interpolatePolygon';
import type { TransportMode } from './rescueAssistant';

const COMPASS_WORDS = [
  'NORTH',
  'NORTH-EAST',
  'EAST',
  'SOUTH-EAST',
  'SOUTH',
  'SOUTH-WEST',
  'WEST',
  'NORTH-WEST',
];
const COMPASS_ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];

function octant(headingDeg: number): number {
  return Math.round((((headingDeg % 360) + 360) % 360) / 45) % 8;
}
function compassWord(headingDeg: number): string {
  return COMPASS_WORDS[octant(headingDeg)];
}
function compassArrow(headingDeg: number): string {
  return COMPASS_ARROWS[octant(headingDeg)];
}

function travelModeFor(mode: TransportMode | null): string {
  if (mode === 'car') return 'DRIVING';
  if (mode === 'bike') return 'BICYCLING';
  return 'WALKING';
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function roadFromInstruction(html: string): string {
  const bolds = Array.from(html.matchAll(/<b>(.*?)<\/b>/g)).map((m) => stripHtml(m[1]));
  const named = bolds.filter((b) => /[A-Za-z]/.test(b) && !/^\d/.test(b));
  if (named.length > 0) return named[named.length - 1];
  const m = stripHtml(html).match(/\bon(?:to)?\s+(.+)$/i);
  return m ? m[1] : '';
}

function nearestIndex(path: LatLng[], p: LatLng): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < path.length; i++) {
    const dLat = path[i].lat - p.lat;
    const dLng = path[i].lng - p.lng;
    const d = dLat * dLat + dLng * dLng;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function buildSteps(route: google.maps.DirectionsRoute, path: LatLng[]): RouteStep[] {
  const gsteps = route.legs?.[0]?.steps ?? [];
  const steps: RouteStep[] = [];
  for (const gs of gsteps) {
    if (!gs.start_location || !gs.end_location) continue;
    const start = { lat: gs.start_location.lat(), lng: gs.start_location.lng() };
    const end = { lat: gs.end_location.lat(), lng: gs.end_location.lng() };
    const heading = bearingDeg(start, end);
    const direction = compassWord(heading);
    steps.push({
      road: roadFromInstruction(gs.instructions ?? ''),
      direction,
      arrow: compassArrow(heading),
      text: stripHtml(gs.instructions ?? '') || `Head ${direction}.`,
      fromIndex: nearestIndex(path, start),
    });
  }
  if (steps.length === 0) {
    const heading = bearingDeg(path[0], path[path.length - 1]);
    return [
      {
        road: '',
        direction: compassWord(heading),
        arrow: compassArrow(heading),
        text: `Follow the route ${compassWord(heading)} to the safe zone.`,
        fromIndex: 0,
      },
    ];
  }
  steps.sort((a, b) => a.fromIndex - b.fromIndex);
  steps[0] = { ...steps[0], fromIndex: 0 };
  return steps;
}

function buildSummary(
  route: google.maps.DirectionsRoute,
  destination: SafeDestination,
  travelMode: string,
): string {
  const leg = route.legs?.[0];
  const km = leg?.distance ? (leg.distance.value / 1000).toFixed(1) : null;
  const verb =
    travelMode === 'DRIVING' ? 'Drive' : travelMode === 'BICYCLING' ? 'Ride' : 'Walk';
  const via = route.summary ? ` via ${route.summary}` : '';
  return `${verb} the mapped roads to ${destination.name}${via}${
    km ? ` — about ${km} km` : ''
  }.`;
}

async function fetchRoute(
  origin: LatLng,
  destination: SafeDestination,
  travelMode: string,
): Promise<EscapeRoute | null> {
  let lib: google.maps.RoutesLibrary;
  try {
    lib = await google.maps.importLibrary('routes');
  } catch {
    return null;
  }
  const service = new lib.DirectionsService();
  let result: google.maps.DirectionsResult;
  try {
    result = await service.route({ origin, destination: destination.position, travelMode });
  } catch {
    return null;
  }
  const route = result.routes?.[0];
  const overview = route?.overview_path;
  if (!route || !overview || overview.length < 2) return null;
  const path: LatLng[] = overview.map((p) => ({ lat: p.lat(), lng: p.lng() }));
  return {
    id: `google-${destination.id}-${travelMode.toLowerCase()}`,
    destination,
    path,
    steps: buildSteps(route, path),
    summary: buildSummary(route, destination, travelMode),
    source: 'google',
  };
}

export async function fetchEscapeRoutesForMode(
  origin: LatLng,
  destinations: SafeDestination[],
  mode: TransportMode | null,
): Promise<EscapeRoute[]> {
  const travelMode = travelModeFor(mode);
  const results = await Promise.all(
    destinations.map((d) => fetchRoute(origin, d, travelMode)),
  );
  return results.filter((r): r is EscapeRoute => r !== null);
}
