import type { LatLng } from '../lib/interpolatePolygon';

export interface SafeDestination {
  id: string;
  name: string;
  position: LatLng;
  kind: 'safe-zone' | 'pickup-point';
}

export interface RouteStep {
  road: string;
  direction: string;
  arrow: string;
  text: string;
  fromIndex: number;
}

export interface EscapeRoute {
  id: string;
  destination: SafeDestination;
  path: LatLng[];
  steps: RouteStep[];
  summary: string;
  source?: 'authored' | 'google';
}

export const HELP_GPS_POSITION: LatLng = { lat: 34.1828, lng: -118.68 };

export const HELP_LOCATION_LABEL = 'E Las Virgenes Canyon Rd';
export const HELP_LOCATION_DETAIL =
  'Upper Las Virgenes Canyon Open Space — downwind of the modeled fire';

const WEST_HILLS_PICKUP: SafeDestination = {
  id: 'west-hills-pickup',
  name: 'Pickup point — Vanowen St, West Hills (simulated)',
  position: { lat: 34.1937, lng: -118.645 },
  kind: 'pickup-point',
};

const CALABASAS_STAGING: SafeDestination = {
  id: 'calabasas-staging',
  name: 'Staging area — Las Virgenes Rd, Calabasas (simulated)',
  position: { lat: 34.161, lng: -118.7038 },
  kind: 'safe-zone',
};

const EAST_PATH: LatLng[] = [
  HELP_GPS_POSITION,
  { lat: 34.1848, lng: -118.6786 },
  { lat: 34.1868, lng: -118.677 },
  { lat: 34.1888, lng: -118.6752 },
  { lat: 34.1906, lng: -118.673 },
  { lat: 34.1918, lng: -118.6706 },
  { lat: 34.1926, lng: -118.668 },
  { lat: 34.1932, lng: -118.6654 },
  { lat: 34.1936, lng: -118.663 },
  { lat: 34.1937, lng: -118.6604 },
  { lat: 34.1937, lng: -118.656 },
  { lat: 34.1937, lng: -118.6515 },
  { lat: 34.1937, lng: -118.648 },
  { lat: 34.1937, lng: -118.645 },
];

const SOUTHWEST_PATH: LatLng[] = [
  HELP_GPS_POSITION,
  { lat: 34.1812, lng: -118.6826 },
  { lat: 34.1794, lng: -118.6852 },
  { lat: 34.1774, lng: -118.6876 },
  { lat: 34.1752, lng: -118.6898 },
  { lat: 34.173, lng: -118.692 },
  { lat: 34.1712, lng: -118.6946 },
  { lat: 34.17, lng: -118.6976 },
  { lat: 34.1696, lng: -118.7006 },
  { lat: 34.168, lng: -118.7018 },
  { lat: 34.1662, lng: -118.7026 },
  { lat: 34.1644, lng: -118.7032 },
  { lat: 34.1626, lng: -118.7036 },
  { lat: 34.161, lng: -118.7038 },
];

export const ESCAPE_ROUTES: EscapeRoute[] = [
  {
    id: 'east-west-hills',
    destination: WEST_HILLS_PICKUP,
    path: EAST_PATH,
    summary:
      'NORTH-EAST up E Las Virgenes Canyon Rd, then EAST to the Valley Circle Blvd gate and EAST on Vanowen St into West Hills',
    steps: [
      {
        road: 'E Las Virgenes Canyon Rd',
        direction: 'NORTH-EAST',
        arrow: '↗',
        text: 'Head NORTH-EAST up E Las Virgenes Canyon Rd, climbing out of the canyon — the wind is pushing the fire the other way, to the west.',
        fromIndex: 0,
      },
      {
        road: 'E Las Virgenes Canyon Rd',
        direction: 'EAST',
        arrow: '→',
        text: 'Keep EAST along the road over the high ground toward the Valley Circle Blvd gate. Do not turn back west.',
        fromIndex: 4,
      },
      {
        road: 'Vanowen St',
        direction: 'EAST',
        arrow: '→',
        text: 'Through the gate, continue EAST on Vanowen St into West Hills, putting the neighborhood between you and the fire.',
        fromIndex: 9,
      },
      {
        road: 'Vanowen St',
        direction: 'EAST',
        arrow: '→',
        text: 'The pickup point is just ahead on Vanowen St — stay EAST until you reach it.',
        fromIndex: 12,
      },
    ],
  },
  {
    id: 'southwest-calabasas',
    destination: CALABASAS_STAGING,
    path: SOUTHWEST_PATH,
    summary:
      'SOUTH-WEST along E Las Virgenes Canyon Rd to the canyon junction, then SOUTH on Las Virgenes Canyon Rd toward Calabasas',
    steps: [
      {
        road: 'E Las Virgenes Canyon Rd',
        direction: 'SOUTH-WEST',
        arrow: '↙',
        text: 'Head SOUTH-WEST along E Las Virgenes Canyon Rd, staying south of the drainage — keep moving, do not stop in the canyon bottom.',
        fromIndex: 0,
      },
      {
        road: 'Las Virgenes Canyon Rd',
        direction: 'SOUTH',
        arrow: '↓',
        text: 'At the canyon junction turn LEFT and go SOUTH on Las Virgenes Canyon Rd.',
        fromIndex: 8,
      },
      {
        road: 'Las Virgenes Rd',
        direction: 'SOUTH',
        arrow: '↓',
        text: 'Through the trailhead gate, continue SOUTH toward Las Virgenes Rd, Calabasas — the staging area is just ahead.',
        fromIndex: 11,
      },
    ],
  },
];
