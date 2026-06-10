import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ESCAPE_ROUTES,
  HELP_GPS_POSITION,
  HELP_LOCATION_LABEL,
  type EscapeRoute,
  type SafeDestination,
} from '../data/helpScenario';
import { HELP_CONFIG } from '../data/spreadModelConfig';
import {
  distToRingM,
  pathLengthM,
  pointAtArc,
  pointInRing,
  projectOnPath,
  type FireRiskSnapshot,
} from './fireRiskGeometry';
import type { LatLng } from './interpolatePolygon';
import {
  generateAssistantReply,
  parseAccessibilityNote,
  parseTransportMode,
  type AssistantContext,
  type AssistantEvent,
  type ChatMessage,
  type TransportMode,
} from './rescueAssistant';
import { fetchEscapeRoutesForMode } from './googleDirections';
import { classifyUserRisk, scoreRoute, type UserRiskClass } from './routeRiskScoring';
import { makeFix, type LocationFix } from './userLocation';

export type HelpStatus =
  | 'off'
  | 'locating'
  | 'need-resource'
  | 'routing'
  | 'guiding'
  | 'arrived'
  | 'no-route';

export interface ActiveGuidance {
  route: EscapeRoute;
  path: LatLng[];
  riskStatus: 'safe' | 'caution';
  totalM: number;
}

export interface HelpState {
  enabled: boolean;
  status: HelpStatus;
  fix: LocationFix | null;
  mode: TransportMode | null;
  accessibilityNote: string | null;
  messages: ChatMessage[];
  chatBusy: boolean;
  moving: boolean;
  guidance: ActiveGuidance | null;
  activeStepIndex: number;
  userRisk: UserRiskClass | null;
  remainingM: number | null;
  remainingS: number | null;
  clockRate: number | null;
}

export type ResourceChoice = 'car' | 'bike' | 'foot' | 'limited';

export interface HelpActions {
  toggle: () => void;
  sendChatMessage: (text: string) => void;
  chooseResource: (choice: ResourceChoice) => void;
  setChatFocus: (focused: boolean) => void;
}

const INITIAL_STATE: HelpState = {
  enabled: false,
  status: 'off',
  fix: null,
  mode: null,
  accessibilityNote: null,
  messages: [],
  chatBusy: false,
  moving: false,
  guidance: null,
  activeStepIndex: 0,
  userRisk: null,
  remainingM: null,
  remainingS: null,
  clockRate: null,
};

const RESOURCE_PHRASES: Record<ResourceChoice, string> = {
  car: 'I have a car.',
  bike: 'I have a bike.',
  foot: "I'm on foot.",
  limited: "I'm disabled — I need extra time to move.",
};

function movementMps(mode: TransportMode | null, accessibilityNote: string | null): number {
  if (mode === 'car') return HELP_CONFIG.movement.carMps;
  if (mode === 'bike') return HELP_CONFIG.movement.bikeMps;
  if (accessibilityNote) return HELP_CONFIG.movement.limitedMps;
  return HELP_CONFIG.movement.footMps;
}

export function destinationClear(
  destination: SafeDestination,
  snapshot: FireRiskSnapshot,
): boolean {
  const p = destination.position;
  if (pointInRing(p, snapshot.frontRing)) return false;
  if (distToRingM(p, snapshot.frontRing) < HELP_CONFIG.destination.frontMarginM) return false;
  if (snapshot.envelopeRing) {
    if (pointInRing(p, snapshot.envelopeRing)) return false;
    if (distToRingM(p, snapshot.envelopeRing) < HELP_CONFIG.destination.envelopeMarginM) {
      return false;
    }
  }
  return true;
}

function remainingPath(path: LatLng[], from: LatLng | null): LatLng[] {
  if (!from) return path;
  const { segIndex } = projectOnPath(path, from);
  const rest = path.slice(segIndex + 1);
  return rest.length >= 1 ? [{ lat: from.lat, lng: from.lng }, ...rest] : [];
}

export function selectEscapeRoute(
  snapshot: FireRiskSnapshot,
  from: LatLng | null,
  mps: number,
  routes: EscapeRoute[] = ESCAPE_ROUTES,
  opts: { preferNearest?: boolean } = {},
): { route: EscapeRoute; path: LatLng[]; riskStatus: 'safe' | 'caution' } | null {
  let best:
    | { route: EscapeRoute; path: LatLng[]; riskStatus: 'safe' | 'caution'; key: number }
    | null = null;
  for (const route of routes) {
    if (!destinationClear(route.destination, snapshot)) continue;
    const path = remainingPath(route.path, from);
    if (path.length < 2) continue;
    const distanceM = pathLengthM(path);
    const scored = scoreRoute(
      {
        destination: route.destination,
        path,
        distanceM,
        durationS: distanceM / mps,
        source: route.source ?? 'authored',
      },
      snapshot,
    );
    if (scored.status === 'rejected') continue;
    const key = opts.preferNearest ? distanceM : scored.score;
    if (!best || key < best.key) {
      best = { route, path, riskStatus: scored.status, key };
    }
  }
  return best ? { route: best.route, path: best.path, riskStatus: best.riskStatus } : null;
}

interface ControllerRefs {
  enabled: boolean;
  status: HelpStatus;
  fix: LocationFix | null;
  snapshot: FireRiskSnapshot | null;
  mode: TransportMode | null;
  accessibilityNote: string | null;
  messages: ChatMessage[];
  guidance: ActiveGuidance | null;
  moving: boolean;
  arrived: boolean;
  pendingRoute: boolean;
  announcedNoRoute: boolean;
  locatingTimer: number;
  lastChatAt: number;
  chatFocused: boolean;
  chatBusy: boolean;
  moveCarryM: number;
  alongM: number;
  lastWorldMs: number | null;
  modeRoutes: EscapeRoute[] | null;
  routesMode: TransportMode | null;
}

export function useHelpController(
  snapshot: FireRiskSnapshot | null,
  worldTimeMs: number,
  restartWorld: () => void,
): { state: HelpState; actions: HelpActions } {
  const [state, setState] = useState<HelpState>(INITIAL_STATE);
  const refs = useRef<ControllerRefs>({
    enabled: false,
    status: 'off',
    fix: null,
    snapshot: null,
    mode: null,
    accessibilityNote: null,
    messages: [],
    guidance: null,
    moving: false,
    arrived: false,
    pendingRoute: false,
    announcedNoRoute: false,
    locatingTimer: 0,
    lastChatAt: 0,
    chatFocused: false,
    chatBusy: false,
    moveCarryM: 0,
    alongM: 0,
    lastWorldMs: null,
    modeRoutes: null,
    routesMode: null,
  });
  refs.current.snapshot = snapshot;
  const restartWorldRef = useRef(restartWorld);
  restartWorldRef.current = restartWorld;

  const patch = useCallback((partial: Partial<HelpState>) => {
    setState((s) => ({ ...s, ...partial }));
  }, []);

  const setStatus = useCallback(
    (status: HelpStatus, extra: Partial<HelpState> = {}) => {
      refs.current.status = status;
      patch({ status, ...extra });
    },
    [patch],
  );

  const remainingFor = (fix: LocationFix | null, guidance: ActiveGuidance | null) => {
    if (!guidance || !fix) return { remainingM: null, remainingS: null };
    const remainingM = Math.max(guidance.totalM - refs.current.alongM, 0);
    const remainingS = remainingM / movementMps(refs.current.mode, refs.current.accessibilityNote);
    return { remainingM, remainingS };
  };

  const stepIndexFor = (fix: LocationFix | null, guidance: ActiveGuidance | null): number => {
    if (!guidance || !fix) return 0;
    const { segIndex } = projectOnPath(guidance.route.path, fix);
    let step = 0;
    guidance.route.steps.forEach((s, k) => {
      if (segIndex >= s.fromIndex) step = k;
    });
    return step;
  };

  const pushMessage = useCallback(
    (message: ChatMessage) => {
      const r = refs.current;
      r.messages = [...r.messages.slice(-11), message];
      r.lastChatAt = Date.now();
      patch({ messages: r.messages });
    },
    [patch],
  );

  const announce = useCallback(
    async (event: AssistantEvent, userMessage: string | null = null) => {
      const r = refs.current;
      const guidance = r.guidance;
      const remaining = remainingFor(r.fix, guidance);
      const step = guidance ? guidance.route.steps[stepIndexFor(r.fix, guidance)] : null;
      const ctx: AssistantContext = {
        event,
        mode: r.mode,
        accessibilityNote: r.accessibilityNote,
        userRisk: r.fix && r.snapshot ? classifyUserRisk(r.fix, r.snapshot) : null,
        locationLabel: HELP_LOCATION_LABEL,
        routeSummary: guidance?.route.summary ?? null,
        currentStep: step?.text ?? null,
        destinationName: guidance?.route.destination.name ?? null,
        etaMinutes: remaining.remainingS !== null ? remaining.remainingS / 60 : null,
        distanceKm: remaining.remainingM !== null ? remaining.remainingM / 1000 : null,
        routeStatus: guidance ? guidance.riskStatus : 'none',
        horizonMinutes: r.snapshot?.horizonMinutes ?? 30,
      };
      r.chatBusy = true;
      patch({ chatBusy: true });
      try {
        const text = await generateAssistantReply(ctx, r.messages, userMessage);
        pushMessage({ role: 'assistant', text });
      } finally {
        r.chatBusy = false;
        r.lastChatAt = Date.now();
        patch({ chatBusy: false });
      }
    },
    [patch, pushMessage],
  );

  const chooseRoute = useCallback(
    (announceEvent: AssistantEvent | null): boolean => {
      const r = refs.current;
      if (!r.fix || !r.snapshot) return false;
      const mps = movementMps(r.mode, r.accessibilityNote);
      const choice = selectEscapeRoute(r.snapshot, r.fix, mps, r.modeRoutes ?? ESCAPE_ROUTES, {
        preferNearest: r.accessibilityNote !== null,
      });
      if (!choice) {
        r.guidance = null;
        r.moving = false;
        setStatus('no-route', {
          guidance: null,
          moving: false,
          remainingM: null,
          remainingS: null,
        });
        if (!r.announcedNoRoute) {
          r.announcedNoRoute = true;
          void announce('no-route');
        }
        return false;
      }
      r.announcedNoRoute = false;
      const guidance: ActiveGuidance = {
        route: choice.route,
        path: choice.path,
        riskStatus: choice.riskStatus,
        totalM: pathLengthM(choice.path),
      };
      r.guidance = guidance;
      r.alongM = 0;
      if (!r.arrived) r.moving = true;
      setStatus('guiding', {
        guidance,
        moving: r.moving,
        activeStepIndex: stepIndexFor(r.fix, guidance),
        ...remainingFor(r.fix, guidance),
      });
      if (announceEvent) void announce(announceEvent);
      return true;
    },
    [announce, setStatus],
  );

  const ensureModeRoutes = useCallback(async () => {
    const r = refs.current;
    if (!r.mode || (r.routesMode === r.mode && r.modeRoutes)) return;
    r.routesMode = r.mode;
    const destinations = ESCAPE_ROUTES.map((route) => route.destination);
    let routes: EscapeRoute[] = [];
    try {
      routes = await fetchEscapeRoutesForMode(HELP_GPS_POSITION, destinations, r.mode);
    } catch {
      routes = [];
    }
    if (!r.enabled || r.routesMode !== r.mode || routes.length === 0) return;
    r.modeRoutes = routes;
    if (
      !r.arrived &&
      (r.status === 'guiding' || r.status === 'routing' || r.status === 'no-route')
    ) {
      chooseRoute(null);
    }
  }, [chooseRoute]);

  const handleUserText = useCallback(
    (text: string) => {
      const r = refs.current;
      const trimmed = text.trim();
      if (!trimmed || !r.enabled || r.status === 'locating' || r.status === 'off') return;
      pushMessage({ role: 'user', text: trimmed });

      const accessibility = parseAccessibilityNote(trimmed);
      if (accessibility && !r.accessibilityNote) {
        r.accessibilityNote = accessibility;
        patch({ accessibilityNote: accessibility });
      }

      if (!r.mode) {
        const mode = parseTransportMode(trimmed) ?? (accessibility ? 'foot' : null);
        if (!mode) {
          void announce('clarify-resource', trimmed);
          return;
        }
        r.mode = mode;
        patch({ mode });
        setStatus('routing');
        void ensureModeRoutes();
        if (!chooseRoute(null)) {
          if (!r.snapshot) r.pendingRoute = true;
          return;
        }
        void announce('route-set', trimmed);
        return;
      }
      void announce('chat', trimmed);
    },
    [announce, chooseRoute, ensureModeRoutes, patch, pushMessage, setStatus],
  );

  const actions: HelpActions = {
    toggle: () => {
      const r = refs.current;
      if (r.enabled) {
        window.clearTimeout(r.locatingTimer);
        Object.assign(r, {
          enabled: false,
          status: 'off',
          fix: null,
          mode: null,
          accessibilityNote: null,
          messages: [],
          guidance: null,
          moving: false,
          arrived: false,
          pendingRoute: false,
          announcedNoRoute: false,
          chatBusy: false,
          moveCarryM: 0,
          alongM: 0,
          modeRoutes: null,
          routesMode: null,
        });
        setState({ ...INITIAL_STATE });
        return;
      }
      r.enabled = true;
      r.arrived = false;
      r.moveCarryM = 0;
      r.alongM = 0;
      r.modeRoutes = null;
      r.routesMode = null;
      restartWorldRef.current();
      setState({
        ...INITIAL_STATE,
        enabled: true,
        status: 'locating',
        clockRate: HELP_CONFIG.clock.realRate,
      });
      r.status = 'locating';
      r.locatingTimer = window.setTimeout(() => {
        if (!refs.current.enabled) return;
        const fix = makeFix(HELP_GPS_POSITION, 'demo', 12);
        refs.current.fix = fix;
        setStatus('need-resource', { fix });
        void announce('ask-resource');
      }, HELP_CONFIG.locatingMs);
    },
    sendChatMessage: handleUserText,
    chooseResource: (choice) => {
      handleUserText(RESOURCE_PHRASES[choice]);
    },
    setChatFocus: (focused) => {
      refs.current.chatFocused = focused;
      if (focused) refs.current.lastChatAt = Date.now();
    },
  };

  useEffect(() => {
    const r = refs.current;
    if (!r.enabled || !r.fix || !snapshot) return;
    const userRisk = classifyUserRisk(r.fix, snapshot);
    patch({ userRisk });

    if (r.pendingRoute && r.mode) {
      r.pendingRoute = false;
      if (chooseRoute(null)) void announce('route-set');
      return;
    }
    if (r.status === 'no-route' && r.mode && !r.arrived) {
      if (chooseRoute('reroute')) return;
    }
    if (r.status !== 'guiding' || !r.guidance || r.arrived) return;

    const mps = movementMps(r.mode, r.accessibilityNote);
    const ahead = remainingPath(r.guidance.path, r.fix);
    if (ahead.length < 2) return;
    const distanceM = pathLengthM(ahead);
    const rescored = scoreRoute(
      {
        destination: r.guidance.route.destination,
        path: ahead,
        distanceM,
        durationS: distanceM / mps,
        source: 'authored',
      },
      snapshot,
    );
    const destOk = destinationClear(r.guidance.route.destination, snapshot);
    if (rescored.status === 'rejected' || !destOk) {
      r.guidance = null;
      chooseRoute('reroute');
      return;
    }
    if (rescored.status !== r.guidance.riskStatus) {
      r.guidance = { ...r.guidance, riskStatus: rescored.status };
      patch({ guidance: r.guidance });
    }
  }, [snapshot, announce, chooseRoute, patch]);

  useEffect(() => {
    const r = refs.current;
    const prev = r.lastWorldMs;
    r.lastWorldMs = worldTimeMs;
    if (!r.enabled || !r.moving || r.arrived || !r.guidance || !r.fix || prev === null) return;
    const dtFireS = (worldTimeMs - prev) / 1000;
    if (dtFireS <= 0) return;
    r.moveCarryM += Math.min(dtFireS, 120) * movementMps(r.mode, r.accessibilityNote);
    if (r.moveCarryM < 25) return;
    const stepM = Math.min(r.moveCarryM, 1500);
    r.moveCarryM = 0;
    r.alongM = Math.min(r.alongM + stepM, r.guidance.totalM);
    const step = pointAtArc(r.guidance.path, r.alongM);
    const fix = makeFix(step.point, 'demo', 12, step.headingDeg);
    r.fix = fix;
    patch({
      fix,
      activeStepIndex: stepIndexFor(fix, r.guidance),
      ...remainingFor(fix, r.guidance),
    });
    if (step.atEnd || r.alongM >= r.guidance.totalM) {
      r.moving = false;
      r.arrived = true;
      setStatus('arrived', { moving: false, remainingM: 0, remainingS: 0 });
      void announce('arrived');
    }
  }, [worldTimeMs]);

  useEffect(() => {
    if (!state.enabled) return;
    const compute = () => {
      const r = refs.current;
      let rate: number | null;
      if (r.arrived) {
        rate = null;
      } else {
        const chatting =
          r.status === 'locating' ||
          r.status === 'need-resource' ||
          r.chatFocused ||
          r.chatBusy ||
          Date.now() - r.lastChatAt < HELP_CONFIG.clock.chatGraceMs;
        rate = chatting ? HELP_CONFIG.clock.realRate : HELP_CONFIG.clock.fastRate;
      }
      setState((s) => (s.clockRate === rate ? s : { ...s, clockRate: rate }));
    };
    compute();
    const id = window.setInterval(compute, 1000);
    return () => window.clearInterval(id);
  }, [state.enabled]);

  return { state, actions };
}
