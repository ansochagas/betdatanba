import {
  NbaMatch,
  NbaMatchesResult,
  NbaMoneylineOdds,
  NbaPlayerAnalysisItem,
  NbaPlayerAnalysisResponse,
} from "@/modules/nba/types";
import {
  decorateMatchCompetition,
  getBasketballCompetitionByBetsApiLeague,
} from "@/modules/nba/competitions";
import { getNbaTeamIdentity } from "@/modules/nba/logos";

const DEFAULT_BASE_URL = "https://api.b365api.com";
const DEFAULT_SPORT_ID = 18;
const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_MONEYLINE: NbaMoneylineOdds = { home: 1.91, away: 1.91 };
const DEFAULT_EVENTS_LEAGUE_ID = "2274";
const BETSAPI_EVENTS_UPCOMING_ENDPOINT = "/v3/events/upcoming";
const BETSAPI_EVENTS_INPLAY_ENDPOINT = "/v3/events/inplay";
const BETSAPI_EVENTS_ENDED_ENDPOINT = "/v3/events/ended";
const BETSAPI_EVENT_VIEW_ENDPOINT = "/v1/event/view";
const BETSAPI_EVENT_LINEUP_ENDPOINT = "/v1/event/lineup";
const BETSAPI_EVENT_ODDS_ENDPOINT = "/v2/event/odds";
const BETSAPI_TEAM_SQUAD_ENDPOINT = "/v1/team/squad";
const BETSAPI_PREMATCH_RAW_ENDPOINT = "/v4/bet365/prematch";
const DEFAULT_ODDS_ENRICH_LIMIT = 12;

type BetsApiUpcomingEvent = {
  id?: string | number;
  r_id?: string | number;
  our_event_id?: string | number;
  bet365_id?: string | number;
  sport_id?: string | number;
  time?: string | number;
  time_str?: string | number;
  time_status?: string | number;
  timer?:
    | string
    | {
        tm?: string | number;
        tt?: string | number;
        ts?: string | number;
      };
  TT?: string | number;
  TM?: string | number;
  TS?: string | number;
  GO?: string | number;
  TU?: string | number;
  league?: {
    id?: string | number;
    name?: string;
    cc?: string | null;
  };
  home?: {
    id?: string | number;
    name?: string;
  };
  away?: {
    id?: string | number;
    name?: string;
  };
  ss?: string | null;
  odds?: {
    home?: string | number;
    away?: string | number;
    draw?: string | number;
  };
  odds_updated_at?: string | number;
};

type BetsApiEventDetailRow = {
  type?: string;
  ID?: string | number;
  MA?: string | number;
  FI?: string | number;
  OR?: string | number;
  NA?: string;
  OD?: string | number;
};

type BetsApiLiveResultRow = {
  id?: string | number;
  bet365_id?: string | number;
  sport_id?: string | number;
  time?: string | number;
  time_status?: string | number;
  league?: {
    id?: string | number;
    name?: string;
    cc?: string | null;
  };
  home?: {
    id?: string | number;
    name?: string;
    image_id?: string | number;
    cc?: string | null;
  };
  away?: {
    id?: string | number;
    name?: string;
    image_id?: string | number;
    cc?: string | null;
  };
  ss?: string | null;
  timer?: {
    tm?: string | number;
    ts?: string | number;
    q?: string | number;
    tt?: string | number;
  };
  scores?: Record<string, { home?: string | number; away?: string | number }>;
  stats?: Record<string, [string | number, string | number]>;
  extra?: {
    numberofperiods?: string | number;
    periodlength?: string | number;
    stadium_data?: {
      id?: string | number;
      name?: string;
      city?: string;
    };
  };
};

type BetsApiEnvelope<T> = {
  success?: number;
  error?: string;
  error_detail?: string;
  msg?: string;
  results?: T | T[] | T[][];
};

type BetsApiLineupPlayer = {
  player?: {
    id?: string | number;
    name?: string;
    cc?: string | null;
  };
  shirtnumber?: string | number | null;
  pos?: string | null;
};

type BetsApiLineupSide = {
  startinglineup?: BetsApiLineupPlayer[];
  substitutes?: BetsApiLineupPlayer[];
};

type BetsApiEventLineupResult = {
  home?: BetsApiLineupSide;
  away?: BetsApiLineupSide;
};

type BetsApiTeamSquadPlayer = {
  id?: string | number;
  name?: string;
  cc?: string | null;
  position?: string | null;
  shirtnumber?: string | number | null;
};

export type NbaLiveGame = {
  id: string;
  scheduledAt: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo: string;
  awayTeamLogo: string;
  status: string;
  timeStatus: string;
  score: {
    home: number | null;
    away: number | null;
  };
  odds: {
    moneyline: NbaMoneylineOdds;
  };
  timer: string | null;
  period: string | null;
  gameClock: {
    quarter: number | null;
    minutesRemaining: number | null;
    secondsRemaining: number | null;
    periodLengthMinutes: number | null;
    totalPeriods: number | null;
  } | null;
  quarterScores: Array<{
    label: string;
    home: number | null;
    away: number | null;
  }>;
  liveStats: {
    fouls: { home: number | null; away: number | null } | null;
    timeouts: { home: number | null; away: number | null } | null;
    freeThrows: { home: number | null; away: number | null } | null;
    freeThrowRate: { home: number | null; away: number | null } | null;
    twoPoints: { home: number | null; away: number | null } | null;
    threePoints: { home: number | null; away: number | null } | null;
  };
  venue: {
    name: string | null;
    city: string | null;
  } | null;
};

export type NbaEndedGame = {
  id: string;
  scheduledAt: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  status: string;
  timeStatus: string;
  score: {
    home: number | null;
    away: number | null;
  };
  raw: BetsApiUpcomingEvent;
};

export type NbaBuilderCatalogEvent = {
  eventId: string;
  leagueId: string;
  leagueName: string;
  homeTeam: string;
  awayTeam: string;
  scheduledAt: string;
  status: string;
  bet365Fi: string | null;
};

type BetsApiPlayerAnalysisOptions = {
  bet365Id?: string | null;
  homeTeam?: string | null;
  awayTeam?: string | null;
  scheduledAt?: string | null;
  league?: string | null;
};

type ParsedRawSegment = Record<string, string> & {
  _type?: string;
};

type ParsedPlayerRawEntry = {
  playerId: string;
  playerName: string;
  teamName: string;
  imageHint?: string;
  values: number[];
};

type MutablePlayerAnalysisEntry = {
  playerId: string;
  playerName: string;
  teamName: string;
  imageHint?: string;
  points: number[];
  rebounds: number[];
  assists: number[];
};

export class BetsApiError extends Error {
  readonly kind: "config" | "request" | "quota" | "plan" | "auth";

  constructor(
    message: string,
    kind: "config" | "request" | "quota" | "plan" | "auth"
  ) {
    super(message);
    this.name = "BetsApiError";
    this.kind = kind;
  }
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const toInt = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }

  return null;
};

const toOptionalId = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

const toFloat = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const parsed = Number.parseFloat(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const asObjectRows = (value: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is Record<string, unknown> => isRecord(row));
};

const toIsoDate = (value: unknown): string => {
  const unix = toInt(value);
  if (!unix || unix <= 0) return new Date().toISOString();
  return new Date(unix * 1000).toISOString();
};

const formatDayUtc = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

const getUpcomingDaysRange = (days: number): string[] => {
  const safeDays = Number.isFinite(days) ? clamp(days, 1, 7) : 2;
  const now = new Date();

  return Array.from({ length: safeDays }, (_, offset) => {
    const date = new Date(now);
    date.setUTCDate(now.getUTCDate() + offset);
    return formatDayUtc(date);
  });
};

const getPastDaysRange = (daysBack: number): string[] => {
  const safeDays = Number.isFinite(daysBack) ? clamp(daysBack, 1, 365) : 30;
  const now = new Date();

  return Array.from({ length: safeDays }, (_, offset) => {
    const date = new Date(now);
    date.setUTCDate(now.getUTCDate() - offset);
    return formatDayUtc(date);
  });
};

const getBaseUrl = (): string => {
  return process.env.BETSAPI_BASE_URL || DEFAULT_BASE_URL;
};

const getToken = (): string => {
  return process.env.BETSAPI_TOKEN || process.env.API_KEY_1 || "";
};

const getSportId = (): number => {
  const configured = toInt(process.env.BETSAPI_NBA_SPORT_ID);
  return configured ?? DEFAULT_SPORT_ID;
};

const getTimeoutMs = (): number => {
  const configured = toInt(process.env.BETSAPI_TIMEOUT_MS);
  if (!configured) return DEFAULT_TIMEOUT_MS;
  return clamp(configured, 1000, 30000);
};

const getOddsEnrichLimit = (): number => {
  const configured = toInt(process.env.BETSAPI_ODDS_ENRICH_LIMIT);
  if (!configured) return DEFAULT_ODDS_ENRICH_LIMIT;
  return clamp(configured, 0, 12);
};

const getDayFetchConcurrency = (): number => {
  const configured = toInt(process.env.BETSAPI_DAY_FETCH_CONCURRENCY);
  if (!configured) return 8;
  return clamp(configured, 1, 20);
};

const getLeagueIdFilter = (): string | null => {
  const explicitValue = (process.env.BETSAPI_NBA_EVENTS_LEAGUE_ID || "").trim();
  if (explicitValue.length > 0) {
    return explicitValue;
  }

  const legacyValue = (process.env.BETSAPI_NBA_LEAGUE_ID || "").trim();
  if (!legacyValue) {
    return DEFAULT_EVENTS_LEAGUE_ID;
  }

  const parsedLegacyValue = Number(legacyValue);
  if (!Number.isFinite(parsedLegacyValue) || parsedLegacyValue > 999999) {
    return DEFAULT_EVENTS_LEAGUE_ID;
  }

  return legacyValue;
};

const hasWordNba = (value: string): boolean => {
  return /(^|[^a-z])nba([^a-z]|$)/i.test(value);
};

const getTrackedPreGameCompetition = (event: BetsApiUpcomingEvent) =>
  getBasketballCompetitionByBetsApiLeague(
    event.league?.id,
    event.league?.name,
    event.league?.cc
  );

const isNbaLeague = (event: BetsApiUpcomingEvent): boolean => {
  const leagueIdFilter = getLeagueIdFilter();
  const leagueId = String(event.league?.id || "");

  if (leagueIdFilter) {
    return leagueId === leagueIdFilter;
  }

  const leagueName = String(event.league?.name || "").toLowerCase();
  if (!leagueName) return false;
  if (!hasWordNba(leagueName)) return false;
  if (leagueName.includes("wnba")) return false;
  if (leagueName.includes("nba2k")) return false;
  if (leagueName.includes("ebasketball")) return false;
  if (leagueName.includes("esports")) return false;

  return true;
};

const isTrackedPreGameLeague = (event: BetsApiUpcomingEvent): boolean =>
  Boolean(getTrackedPreGameCompetition(event)?.supportsPreGame);

const classifyError = (message: string): BetsApiError["kind"] => {
  const lower = message.toLowerCase();

  if (
    lower.includes("permission_denied") ||
    lower.includes("coverage") ||
    lower.includes("pricing_table")
  ) {
    return "plan";
  }

  if (
    lower.includes("unauthorized") ||
    lower.includes("forbidden") ||
    lower.includes("token")
  ) {
    return "auth";
  }

  if (
    lower.includes("limit") ||
    lower.includes("quota") ||
    lower.includes("too many") ||
    lower.includes("throttle")
  ) {
    return "quota";
  }

  if (lower.includes("plan") || lower.includes("package") || lower.includes("upgrade")) {
    return "plan";
  }

  return "request";
};

const mapTimeStatusToMatchStatus = (timeStatus: unknown): string => {
  const value = String(timeStatus ?? "");
  if (value === "1" || value === "2") return "in_play";
  if (value === "3") return "finished";
  if (value === "4") return "cancelled";
  if (value === "5") return "postponed";
  return "not_started";
};

const parseScore = (ss: unknown): { home: number | null; away: number | null } => {
  if (typeof ss !== "string" || !ss.includes("-")) {
    return { home: null, away: null };
  }

  const [homeRaw, awayRaw] = ss.split("-");
  const home = toInt(homeRaw);
  const away = toInt(awayRaw);
  return {
    home,
    away,
  };
};

const parseTimerObject = (
  timer: BetsApiLiveResultRow["timer"],
  extra?: BetsApiLiveResultRow["extra"]
): NbaLiveGame["gameClock"] => {
  if (!timer) return null;

  const quarter = toInt(timer.q);
  const minutesRemaining = toInt(timer.tm);
  const secondsRemaining = toInt(timer.ts);
  const periodLengthMinutes = toInt(extra?.periodlength) ?? 12;
  const totalPeriods = toInt(extra?.numberofperiods) ?? 4;

  return {
    quarter,
    minutesRemaining,
    secondsRemaining,
    periodLengthMinutes,
    totalPeriods,
  };
};

const formatGameClock = (clock: NbaLiveGame["gameClock"]): string | null => {
  if (!clock) return null;
  if (clock.minutesRemaining === null || clock.secondsRemaining === null) return null;

  return `${String(clock.minutesRemaining).padStart(2, "0")}:${String(
    clock.secondsRemaining
  ).padStart(2, "0")}`;
};

const formatQuarterLabel = (quarter: number | null): string | null => {
  if (quarter === null) return null;
  if (quarter <= 4) return `Q${quarter}`;
  return `OT${quarter - 4}`;
};

const parseQuarterScores = (
  scores: BetsApiLiveResultRow["scores"]
): NbaLiveGame["quarterScores"] => {
  if (!scores) return [];

  const labels: Array<{ key: string; label: string }> = [
    { key: "1", label: "Q1" },
    { key: "2", label: "Q2" },
    { key: "4", label: "Q3" },
    { key: "5", label: "Q4" },
  ];

  return labels
    .map((entry) => {
      const score = scores[entry.key];
      if (!score) return null;

      return {
        label: entry.label,
        home: toInt(score.home),
        away: toInt(score.away),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
};

const parseDualStat = (
  stats: BetsApiLiveResultRow["stats"],
  key: string
): { home: number | null; away: number | null } | null => {
  const row = stats?.[key];
  if (!row || !Array.isArray(row) || row.length < 2) return null;

  return {
    home: toFloat(row[0]),
    away: toFloat(row[1]),
  };
};

const parseTimer = (event: BetsApiUpcomingEvent): string | null => {
  if (typeof event.timer === "string" && event.timer.trim().length > 0) {
    return event.timer.trim();
  }

  if (event.timer && typeof event.timer === "object") {
    const raw =
      event.timer.tt ?? event.timer.tm ?? event.timer.ts ?? event.TM ?? event.TS ?? null;
    if (raw !== null && raw !== undefined && String(raw).trim().length > 0) {
      return String(raw).trim();
    }
  }

  const direct = event.TM ?? event.TS ?? event.time_str ?? null;
  if (direct !== null && direct !== undefined && String(direct).trim().length > 0) {
    return String(direct).trim();
  }

  return null;
};

const parsePeriod = (event: BetsApiUpcomingEvent): string | null => {
  const period = event.GO ?? event.TT ?? null;
  if (period === null || period === undefined) return null;
  const parsed = String(period).trim();
  return parsed.length > 0 ? parsed : null;
};

const parseFractionalOdds = (value: string): number | null => {
  const normalized = value.trim();
  if (!normalized) return null;

  if (normalized.includes("/")) {
    const [numeratorRaw, denominatorRaw] = normalized.split("/");
    const numerator = Number.parseFloat(numeratorRaw);
    const denominator = Number.parseFloat(denominatorRaw);
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
      return null;
    }
    return Number((1 + numerator / denominator).toFixed(2));
  }

  const decimal = Number.parseFloat(normalized.replace(",", "."));
  if (!Number.isFinite(decimal) || decimal <= 0) return null;

  if (decimal > 1.01) {
    return Number(decimal.toFixed(2));
  }

  return Number((1 + decimal).toFixed(2));
};

const parseMoneyline = (event: BetsApiUpcomingEvent): NbaMoneylineOdds => {
  const home = toFloat(event.odds?.home);
  const away = toFloat(event.odds?.away);
  const draw = toFloat(event.odds?.draw);

  if (home && away && home > 1 && away > 1) {
    return {
      home: Number(home.toFixed(2)),
      away: Number(away.toFixed(2)),
      ...(draw && draw > 1 ? { draw: Number(draw.toFixed(2)) } : {}),
    };
  }

  return DEFAULT_MONEYLINE;
};

const getEventIdForDetails = (event: BetsApiUpcomingEvent): string | null => {
  const fromId = String(event.id ?? "").trim();
  if (fromId.length > 0) return fromId;

  const fromRid = String(event.r_id ?? "").trim();
  if (fromRid.length > 0) return fromRid;

  return null;
};

const hashString = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }

  return Math.abs(hash >>> 0);
};

const normalizeMatch = (event: BetsApiUpcomingEvent): NbaMatch | null => {
  const rawId = String(event.id ?? "");
  if (!rawId) return null;

  const id = toInt(rawId) ?? hashString(rawId);
  const competition = getTrackedPreGameCompetition(event);
  const league = competition?.displayName || event.league?.name || "Basquete";
  const homeTeam = event.home?.name || "Time da Casa";
  const awayTeam = event.away?.name || "Time Visitante";
  const homeIdentity = getNbaTeamIdentity(homeTeam);
  const awayIdentity = getNbaTeamIdentity(awayTeam);
  const bet365Id = toOptionalId(event.bet365_id);

  return decorateMatchCompetition(
    {
      id,
      ...(bet365Id ? { bet365Id } : {}),
      league,
      country: competition?.country,
      homeTeam,
      awayTeam,
      homeTeamLogo: homeIdentity.logoUrl,
      awayTeamLogo: awayIdentity.logoUrl,
      scheduledAt: toIsoDate(event.time),
      tournament: league,
      status: mapTimeStatusToMatchStatus(event.time_status),
      gameName: league,
      homeTeamId: toInt(event.home?.id) ?? undefined,
      awayTeamId: toInt(event.away?.id) ?? undefined,
      odds: {
        moneyline: parseMoneyline(event),
      },
      source: "feed",
    },
    competition
  );
};

const buildApiUrl = (
  endpoint: string,
  params: Record<string, string | number>
): string => {
  const url = new URL(endpoint, getBaseUrl());
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  url.searchParams.set("token", getToken());
  return url.toString();
};

const requestBetsApi = async <T>(
  endpoint: string,
  params: Record<string, string | number>
): Promise<BetsApiEnvelope<T>> => {
  const token = getToken();
  if (!token) {
    throw new BetsApiError("Configuração da consulta NBA indisponível.", "config");
  }

  const controller = new AbortController();
  const timeoutMs = getTimeoutMs();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(buildApiUrl(endpoint, params), {
      headers: {
        Accept: "application/json",
        "User-Agent": "nba-intel/1.0",
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new BetsApiError(
        `Tempo limite ao consultar BetsAPI (${timeoutMs}ms).`,
        "request"
      );
    }
    throw new BetsApiError("Falha de conexao com BetsAPI.", "request");
  } finally {
    clearTimeout(timeoutId);
  }

  let payload: BetsApiEnvelope<T>;
  try {
    payload = (await response.json()) as BetsApiEnvelope<T>;
  } catch {
    throw new BetsApiError("Resposta invalida da BetsAPI.", "request");
  }

  const details = [payload.error, payload.error_detail, payload.msg]
    .filter(Boolean)
    .join(" | ");

  if (!response.ok) {
    const message = details || `Erro HTTP ${response.status}`;
    throw new BetsApiError(message, classifyError(message));
  }

  if (payload.success === 0 || payload.error) {
    const message = details || "Erro desconhecido da BetsAPI.";
    throw new BetsApiError(message, classifyError(message));
  }

  return payload;
};

const readResultsRows = <T>(payload: BetsApiEnvelope<T>): T[] => {
  const raw = payload.results;
  if (!Array.isArray(raw)) return [];

  if (raw.length > 0 && Array.isArray(raw[0])) {
    return raw[0] as T[];
  }

  return raw as T[];
};

const readResultsObject = <T>(payload: BetsApiEnvelope<T>): T | null => {
  const raw = payload.results;
  if (Array.isArray(raw) || raw === null || raw === undefined) {
    return null;
  }

  return raw as T;
};

const fetchUpcomingByDay = async (
  day: string,
  leagueFilter: string | null = getLeagueIdFilter()
): Promise<BetsApiUpcomingEvent[]> => {
  const params: Record<string, string | number> = {
    sport_id: getSportId(),
    day,
    skip_esports: 1,
  };
  if (leagueFilter) {
    params.league_id = leagueFilter;
  }

  const payload = await requestBetsApi<BetsApiUpcomingEvent>(BETSAPI_EVENTS_UPCOMING_ENDPOINT, params);

  const rows = readResultsRows(payload);
  return rows.filter((row) => String(row.sport_id ?? "") === String(getSportId()));
};

const fetchUpcomingByDayWithRetry = async (
  day: string,
  leagueFilter: string | null = getLeagueIdFilter(),
  retries: number = 1
): Promise<BetsApiUpcomingEvent[]> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetchUpcomingByDay(day, leagueFilter);
    } catch (error) {
      lastError = error;

      if (attempt >= retries) {
        break;
      }

      const backoffMs = 200 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError;
};

const fetchUpcomingByDays = async (
  days: string[],
  leagueFilter: string | null = getLeagueIdFilter()
): Promise<BetsApiUpcomingEvent[]> => {
  const merged: BetsApiUpcomingEvent[] = [];
  const concurrency = getDayFetchConcurrency();
  let firstError: unknown = null;

  for (let index = 0; index < days.length; index += concurrency) {
    const chunk = days.slice(index, index + concurrency);
    const settledRows = await Promise.allSettled(
      chunk.map((day) => fetchUpcomingByDayWithRetry(day, leagueFilter, 1))
    );

    for (const result of settledRows) {
      if (result.status === "fulfilled") {
        merged.push(...result.value);
        continue;
      }

      if (!firstError) {
        firstError = result.reason;
      }
    }
  }

  if (merged.length === 0 && firstError) {
    throw firstError;
  }

  return merged;
};

const fetchInplayRows = async (): Promise<BetsApiLiveResultRow[]> => {
  const params: Record<string, string | number> = {
    sport_id: getSportId(),
    skip_esports: 1,
  };
  const leagueIdFilter = getLeagueIdFilter();
  if (leagueIdFilter) {
    params.league_id = leagueIdFilter;
  }

  const payload = await requestBetsApi<BetsApiLiveResultRow>(BETSAPI_EVENTS_INPLAY_ENDPOINT, params);
  const rows = readResultsRows(payload);
  return rows.filter((row) => String(row.sport_id ?? "") === String(getSportId()));
};

const fetchEndedByDay = async (
  day: string,
  pageLimit: number = 1
): Promise<BetsApiUpcomingEvent[]> => {
  const maxPages = clamp(pageLimit, 1, 20);
  const allRows: BetsApiUpcomingEvent[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const params: Record<string, string | number> = {
      sport_id: getSportId(),
      day,
      page,
      skip_esports: 1,
    };
    const leagueIdFilter = getLeagueIdFilter();
    if (leagueIdFilter) {
      params.league_id = leagueIdFilter;
    }

    const payload = await requestBetsApi<BetsApiUpcomingEvent>(
      BETSAPI_EVENTS_ENDED_ENDPOINT,
      params
    );
    const rows = readResultsRows(payload).filter(
      (row) => String(row.sport_id ?? "") === String(getSportId())
    );

    if (rows.length === 0) {
      break;
    }

    allRows.push(...rows);

    if (rows.length < 50) {
      break;
    }
  }

  return allRows;
};

const fetchEndedByDayWithRetry = async (
  day: string,
  pageLimit: number,
  retries: number = 1
): Promise<BetsApiUpcomingEvent[]> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetchEndedByDay(day, pageLimit);
    } catch (error) {
      lastError = error;

      if (attempt >= retries) {
        break;
      }

      const backoffMs = 200 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError;
};

const fetchEndedByDays = async (
  days: string[],
  pageLimit: number
): Promise<BetsApiUpcomingEvent[]> => {
  const merged: BetsApiUpcomingEvent[] = [];
  const concurrency = getDayFetchConcurrency();
  let firstError: unknown = null;

  for (let index = 0; index < days.length; index += concurrency) {
    const chunk = days.slice(index, index + concurrency);
    const settledRows = await Promise.allSettled(
      chunk.map((day) => fetchEndedByDayWithRetry(day, pageLimit, 1))
    );

    for (const result of settledRows) {
      if (result.status === "fulfilled") {
        merged.push(...result.value);
        continue;
      }

      if (!firstError) {
        firstError = result.reason;
      }
    }
  }

  if (merged.length === 0 && firstError) {
    throw firstError;
  }

  return merged;
};

const fetchEventViewRow = async (eventId: string): Promise<BetsApiLiveResultRow | null> => {
  const payload = await requestBetsApi<BetsApiLiveResultRow>(BETSAPI_EVENT_VIEW_ENDPOINT, {
    event_id: eventId,
  });

  const rows = readResultsRows(payload);
  return rows[0] ?? null;
};

const fetchEventLineup = async (eventId: string): Promise<BetsApiEventLineupResult | null> => {
  const payload = await requestBetsApi<BetsApiEventLineupResult>(BETSAPI_EVENT_LINEUP_ENDPOINT, {
    event_id: eventId,
  });

  return readResultsObject(payload);
};

const fetchTeamSquad = async (teamId: string): Promise<BetsApiTeamSquadPlayer[]> => {
  const payload = await requestBetsApi<BetsApiTeamSquadPlayer>(BETSAPI_TEAM_SQUAD_ENDPOINT, {
    team_id: teamId,
  });

  return readResultsRows(payload);
};

type BetsApiEventOddsPayload = {
  odds?: Record<
    string,
    Array<{
      home_od?: string | number;
      away_od?: string | number;
      draw_od?: string | number;
    }>
  >;
};

const fetchEventOddsPayload = async (eventId: string): Promise<BetsApiEventOddsPayload | null> => {
  const payload = await requestBetsApi<BetsApiEventOddsPayload>(BETSAPI_EVENT_ODDS_ENDPOINT, {
    event_id: eventId,
    source: "bet365",
    odds_market: 1,
  });

  return readResultsObject(payload);
};

const fetchRawPrematchRows = async (eventId: string): Promise<unknown[]> => {
  const payload = await requestBetsApi<unknown>(BETSAPI_PREMATCH_RAW_ENDPOINT, {
    FI: eventId,
    raw: 1,
  });

  return readResultsRows(payload);
};

const fetchStructuredPrematchRows = async (eventId: string): Promise<unknown[]> => {
  const payload = await requestBetsApi<unknown>(BETSAPI_PREMATCH_RAW_ENDPOINT, {
    FI: eventId,
  });

  return readResultsRows(payload);
};

const normalizeBuilderCatalogEvent = (event: BetsApiUpcomingEvent): NbaBuilderCatalogEvent | null => {
  const eventId = getEventIdForDetails(event);
  if (!eventId) return null;

  return {
    eventId,
    leagueId: String(event.league?.id ?? "").trim(),
    leagueName: event.league?.name || "NBA",
    homeTeam: event.home?.name || "Time da Casa",
    awayTeam: event.away?.name || "Time Visitante",
    scheduledAt: toIsoDate(event.time),
    status: mapTimeStatusToMatchStatus(event.time_status),
    bet365Fi: toOptionalId(event.bet365_id),
  };
};

const dedupeById = <T extends { id?: string | number }>(items: T[]): T[] => {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = String(item.id ?? "");
    if (!key) continue;
    map.set(key, item);
  }
  return Array.from(map.values());
};

const isDefaultMoneyline = (odds: NbaMoneylineOdds): boolean => {
  return odds.home === DEFAULT_MONEYLINE.home && odds.away === DEFAULT_MONEYLINE.away;
};

const normalizeLookupKey = (value: string): string => {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
};

const normalizeTeamComparisonKey = (value: string): string => {
  const identity = getNbaTeamIdentity(value || "");
  return normalizeLookupKey(identity.canonicalName || value || "");
};

const teamsAreEquivalent = (left: string, right: string): boolean => {
  const leftKey = normalizeTeamComparisonKey(left);
  const rightKey = normalizeTeamComparisonKey(right);

  if (!leftKey || !rightKey) return false;
  return leftKey === rightKey || leftKey.includes(rightKey) || rightKey.includes(leftKey);
};

const toRecentAverage = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(1));
};

const parseRawSegments = (body: string): ParsedRawSegment[] => {
  return body
    .split("|")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const parts = segment.split(";").filter(Boolean);
      const parsed: ParsedRawSegment = {};

      if (parts.length === 0) return parsed;
      parsed._type = parts[0];

      for (let index = 1; index < parts.length; index += 1) {
        const part = parts[index];
        const separatorIndex = part.indexOf("=");
        if (separatorIndex <= 0) continue;

        const key = part.slice(0, separatorIndex);
        const value = part.slice(separatorIndex + 1);
        parsed[key] = value;
      }

      return parsed;
    });
};

const getRawBodySection = (payloadRow: unknown, sectionKey: string): string | null => {
  if (!isRecord(payloadRow)) return null;
  const section = payloadRow[sectionKey];
  if (!isRecord(section)) return null;
  const body = section.body;
  return typeof body === "string" && body.trim().length > 0 ? body : null;
};

const extractTeamsFromRawBodies = (
  payloadRow: unknown
): { homeTeam: string | null; awayTeam: string | null } => {
  const bodies = ["main", "points", "rebounds", "assists"]
    .map((sectionKey) => getRawBodySection(payloadRow, sectionKey))
    .filter((body): body is string => Boolean(body));

  for (const body of bodies) {
    const match = body.match(/N2=([^;|]+);N3=([^;|]+)/);
    if (match) {
      return {
        homeTeam: match[1]?.trim() || null,
        awayTeam: match[2]?.trim() || null,
      };
    }
  }

  return {
    homeTeam: null,
    awayTeam: null,
  };
};

const extractPlayerEntriesFromRawBody = (body: string): ParsedPlayerRawEntry[] => {
  return parseRawSegments(body)
    .filter((segment) => segment._type === "PA")
    .filter((segment) => (segment.ID || "").startsWith("PC"))
    .map((segment) => {
      const values = String(segment.PS || "")
        .split(",")
        .map((value) => toFloat(value))
        .filter((value): value is number => value !== null);

      return {
        playerId: String(segment.ID || ""),
        playerName: String(segment.NA || "").trim(),
        teamName: String(segment.N2 || "").trim(),
        imageHint: typeof segment.IM === "string" ? segment.IM : undefined,
        values,
      };
    })
    .filter((entry) => entry.playerId.length > 0)
    .filter((entry) => entry.playerName.length > 0)
    .filter((entry) => entry.teamName.length > 0)
    .filter((entry) => entry.values.length > 0);
};

const upsertPlayerEntry = (
  playerMap: Map<string, MutablePlayerAnalysisEntry>,
  players: ParsedPlayerRawEntry[],
  statKey: "points" | "rebounds" | "assists"
) => {
  for (const player of players) {
    const key = normalizeLookupKey(`${player.teamName}::${player.playerName}`);
    const current = playerMap.get(key) || {
      playerId: player.playerId,
      playerName: player.playerName,
      teamName: player.teamName,
      imageHint: player.imageHint,
      points: [],
      rebounds: [],
      assists: [],
    };

    current.playerId = current.playerId || player.playerId;
    current.playerName = current.playerName || player.playerName;
    current.teamName = current.teamName || player.teamName;
    current.imageHint = current.imageHint || player.imageHint;
    current[statKey] = player.values;

    playerMap.set(key, current);
  }
};

const matchTeamName = (
  candidate: string,
  homeTeam: string,
  awayTeam: string
): "home" | "away" | null => {
  if (teamsAreEquivalent(candidate, homeTeam)) {
    return "home";
  }

  if (teamsAreEquivalent(candidate, awayTeam)) {
    return "away";
  }

  return null;
};

const buildPlayerAnalysisItems = (
  playerMap: Map<string, MutablePlayerAnalysisEntry>
): NbaPlayerAnalysisItem[] => {
  return Array.from(playerMap.values())
    .map((player) => ({
      playerId: player.playerId,
      playerName: player.playerName,
      teamName: player.teamName,
      ...(player.imageHint ? { imageHint: player.imageHint } : {}),
      dataLevel: "full" as const,
      points: {
        values: player.points,
        average: toRecentAverage(player.points),
      },
      rebounds: {
        values: player.rebounds,
        average: toRecentAverage(player.rebounds),
      },
      assists: {
        values: player.assists,
        average: toRecentAverage(player.assists),
      },
    }))
    .sort((left, right) => {
      const rightPoints = right.points.average ?? -1;
      const leftPoints = left.points.average ?? -1;
      if (rightPoints !== leftPoints) return rightPoints - leftPoints;

      const rightAssists = right.assists.average ?? -1;
      const leftAssists = left.assists.average ?? -1;
      if (rightAssists !== leftAssists) return rightAssists - leftAssists;

      return left.playerName.localeCompare(right.playerName);
    });
};

type RosterSeed = {
  playerId: string;
  playerName: string;
  teamName: string;
  position?: string | null;
  shirtNumber?: string | null;
  order: number;
};

const normalizePlayerName = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const toOptionalText = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

const normalizePositionKey = (value?: string | null): string =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

const SOCCER_POSITION_HINTS = new Set([
  "goalkeeper",
  "keeper",
  "defender",
  "midfielder",
  "winger",
  "striker",
  "fullback",
  "centreback",
  "centerback",
]);

const isLikelyBasketballRoster = (seeds: RosterSeed[]): boolean => {
  if (seeds.length === 0) return true;
  if (seeds.length > 25) return false;

  for (const seed of seeds) {
    const positionKey = normalizePositionKey(seed.position);
    if (positionKey && SOCCER_POSITION_HINTS.has(positionKey)) {
      return false;
    }
  }

  return true;
};

const pushRosterSeed = (
  store: Map<string, RosterSeed>,
  teamName: string,
  playerId: unknown,
  playerName: unknown,
  order: number,
  options: {
    position?: unknown;
    shirtNumber?: unknown;
  } = {}
) => {
  const safePlayerId = toOptionalText(playerId);
  const safePlayerName = toOptionalText(playerName);
  if (!safePlayerName) return;

  const key = safePlayerId
    ? `${teamName}::${safePlayerId}`
    : `${teamName}::${normalizePlayerName(safePlayerName)}`;

  const current = store.get(key);
  if (!current) {
    store.set(key, {
      playerId: safePlayerId || key,
      playerName: safePlayerName,
      teamName,
      position: toOptionalText(options.position),
      shirtNumber: toOptionalText(options.shirtNumber),
      order,
    });
    return;
  }

  current.order = Math.min(current.order, order);
  current.position = current.position || toOptionalText(options.position);
  current.shirtNumber = current.shirtNumber || toOptionalText(options.shirtNumber);
};

const lineupSideToRosterSeeds = (
  side: BetsApiLineupSide | undefined,
  teamName: string
): RosterSeed[] => {
  const store = new Map<string, RosterSeed>();
  let order = 0;

  for (const player of side?.startinglineup || []) {
    pushRosterSeed(store, teamName, player.player?.id, player.player?.name, order, {
      position: player.pos,
      shirtNumber: player.shirtnumber,
    });
    order += 1;
  }

  for (const player of side?.substitutes || []) {
    pushRosterSeed(store, teamName, player.player?.id, player.player?.name, order + 100, {
      position: player.pos,
      shirtNumber: player.shirtnumber,
    });
    order += 1;
  }

  return Array.from(store.values()).sort((left, right) => {
    if (left.order !== right.order) return left.order - right.order;
    return left.playerName.localeCompare(right.playerName);
  });
};

const squadToRosterSeeds = (squad: BetsApiTeamSquadPlayer[], teamName: string): RosterSeed[] => {
  const store = new Map<string, RosterSeed>();

  squad.forEach((player, index) => {
    pushRosterSeed(store, teamName, player.id, player.name, index + 1000, {
      position: player.position,
      shirtNumber: player.shirtnumber,
    });
  });

  return Array.from(store.values()).sort((left, right) => {
    if (left.order !== right.order) return left.order - right.order;
    return left.playerName.localeCompare(right.playerName);
  });
};

const rosterSeedsToPlayers = (seeds: RosterSeed[]): NbaPlayerAnalysisItem[] => {
  return seeds.map((seed) => ({
    playerId: seed.playerId,
    playerName: seed.playerName,
    teamName: seed.teamName,
    position: seed.position ?? null,
    shirtNumber: seed.shirtNumber ?? null,
    dataLevel: "roster_only",
    points: {
      values: [],
      average: null,
    },
    rebounds: {
      values: [],
      average: null,
    },
    assists: {
      values: [],
      average: null,
    },
  }));
};

const mergeRosterSeeds = (primary: RosterSeed[], secondary: RosterSeed[]): RosterSeed[] => {
  const store = new Map<string, RosterSeed>();

  for (const seed of [...primary, ...secondary]) {
    const key = `${seed.teamName}::${seed.playerId}`;
    const current = store.get(key);
    if (!current) {
      store.set(key, { ...seed });
      continue;
    }

    current.order = Math.min(current.order, seed.order);
    current.position = current.position || seed.position;
    current.shirtNumber = current.shirtNumber || seed.shirtNumber;
  }

  return Array.from(store.values()).sort((left, right) => {
    if (left.order !== right.order) return left.order - right.order;
    return left.playerName.localeCompare(right.playerName);
  });
};

const extractMoneylineFromEventOddsPayload = (
  payload: BetsApiEventOddsPayload | null,
  fallback: NbaMoneylineOdds = DEFAULT_MONEYLINE
): NbaMoneylineOdds => {
  if (!payload?.odds || typeof payload.odds !== "object") {
    return fallback;
  }

  for (const rows of Object.values(payload.odds)) {
    if (!Array.isArray(rows) || rows.length === 0) {
      continue;
    }

    const firstRow = rows[0];
    const home = toFloat(firstRow?.home_od);
    const away = toFloat(firstRow?.away_od);
    const draw = toFloat(firstRow?.draw_od);

    if (!home || !away || home <= 1 || away <= 1) {
      continue;
    }

    return {
      home: Number(home.toFixed(3)),
      away: Number(away.toFixed(3)),
      ...(draw && draw > 1 ? { draw: Number(draw.toFixed(3)) } : {}),
    };
  }

  return fallback;
};

const enrichUpcomingRowsWithRealOdds = async (
  rows: BetsApiUpcomingEvent[],
  warnings: string[]
): Promise<BetsApiUpcomingEvent[]> => {
  const limit = getOddsEnrichLimit();
  if (limit <= 0) return rows;

  const candidates = rows
    .filter((row) => isDefaultMoneyline(parseMoneyline(row)))
    .slice(0, limit);

  if (candidates.length === 0) {
    return rows;
  }

  const marketMap = new Map<string, NbaMoneylineOdds>();

  await Promise.all(
    candidates.map(async (row) => {
      const eventId = getEventIdForDetails(row);
      if (!eventId) return;

      try {
        const oddsPayload = await fetchEventOddsPayload(eventId);
        const parsedOdds = extractMoneylineFromEventOddsPayload(oddsPayload);
        if (!isDefaultMoneyline(parsedOdds)) {
          marketMap.set(String(row.id ?? ""), parsedOdds);
        }
      } catch {
        // Mantém fallback silencioso para não quebrar a ingestão.
      }
    })
  );

  if (marketMap.size === 0) {
    warnings.push(
      "Odds completas de moneyline não vieram do feed no momento; o sistema aplicou o fallback padrão."
    );
    return rows;
  }

  return rows.map((row) => {
    const key = String(row.id ?? "");
    const odds = marketMap.get(key);
    if (!odds) return row;

    return {
      ...row,
      odds: {
        home: odds.home,
        away: odds.away,
        ...(odds.draw ? { draw: odds.draw } : {}),
      },
    };
  });
};

type ResolvedPlayerAnalysisEvent = {
  eventId: string;
  bet365Id: string | null;
  detailRow: BetsApiLiveResultRow | null;
};

const getLookupDaysAroundScheduledAt = (scheduledAt?: string | null): string[] => {
  if (!scheduledAt) {
    return getUpcomingDaysRange(3);
  }

  const baseDate = new Date(scheduledAt);
  if (Number.isNaN(baseDate.getTime())) {
    return getUpcomingDaysRange(3);
  }

  return Array.from(
    new Set(
      [-1, 0, 1].map((offset) => {
        const date = new Date(baseDate);
        date.setUTCDate(baseDate.getUTCDate() + offset);
        return formatDayUtc(date);
      })
    )
  );
};

const resolveBetsApiPlayerAnalysisEvent = async (
  matchId: string,
  options: BetsApiPlayerAnalysisOptions,
  initialDetailRow: BetsApiLiveResultRow | null
): Promise<ResolvedPlayerAnalysisEvent | null> => {
  const directEventId = toOptionalId(matchId);

  if (directEventId && initialDetailRow) {
    return {
      eventId: directEventId,
      bet365Id: toOptionalId(initialDetailRow.bet365_id),
      detailRow: initialDetailRow,
    };
  }

  const homeTeam = options.homeTeam?.trim() || "";
  const awayTeam = options.awayTeam?.trim() || "";
  if (!homeTeam || !awayTeam) {
    return null;
  }

  const targetTime = options.scheduledAt ? new Date(options.scheduledAt).getTime() : Number.NaN;
  const leagueKey = normalizeLookupKey(options.league || "");
  const lookupDays = getLookupDaysAroundScheduledAt(options.scheduledAt);
  const upcomingRows = dedupeById(await fetchUpcomingByDays(lookupDays, getLeagueIdFilter()));

  let bestCandidate: { row: BetsApiUpcomingEvent; score: number } | null = null;

  for (const row of upcomingRows) {
    if (!isNbaLeague(row)) continue;

    const eventId = getEventIdForDetails(row);
    if (!eventId) continue;

    const rowHome = row.home?.name || "";
    const rowAway = row.away?.name || "";
    const sameSide =
      teamsAreEquivalent(rowHome, homeTeam) && teamsAreEquivalent(rowAway, awayTeam);
    const swappedSide =
      teamsAreEquivalent(rowHome, awayTeam) && teamsAreEquivalent(rowAway, homeTeam);

    if (!sameSide && !swappedSide) continue;

    let score = sameSide ? 200 : 120;
    const rowLeagueKey = normalizeLookupKey(row.league?.name || "");

    if (leagueKey && rowLeagueKey) {
      if (rowLeagueKey === leagueKey) {
        score += 20;
      } else if (rowLeagueKey.includes(leagueKey) || leagueKey.includes(rowLeagueKey)) {
        score += 10;
      }
    }

    const rowTime = new Date(toIsoDate(row.time)).getTime();
    if (Number.isFinite(targetTime) && Number.isFinite(rowTime)) {
      const gapMinutes = Math.abs(rowTime - targetTime) / 60000;
      if (gapMinutes > 720) continue;
      score -= Math.min(gapMinutes, 360) / 6;
    }

    if (!bestCandidate || score > bestCandidate.score) {
      bestCandidate = { row, score };
    }
  }

  if (!bestCandidate) {
    return null;
  }

  const eventId = getEventIdForDetails(bestCandidate.row);
  if (!eventId) {
    return null;
  }

  let detailRow: BetsApiLiveResultRow | null = null;
  try {
    detailRow = await fetchEventViewRow(eventId);
  } catch {
    detailRow = null;
  }

  return {
    eventId,
    bet365Id: toOptionalId(bestCandidate.row.bet365_id) || toOptionalId(detailRow?.bet365_id),
    detailRow,
  };
};

const buildRosterOnlyPlayerAnalysis = async (
  matchId: string,
  options: BetsApiPlayerAnalysisOptions = {},
  resolvedEvent: ResolvedPlayerAnalysisEvent | null = null
): Promise<NbaPlayerAnalysisResponse> => {
  const analysisEventId = resolvedEvent?.eventId || matchId;
  let detailRow = resolvedEvent?.detailRow ?? null;

  if (!detailRow && analysisEventId) {
    try {
      detailRow = await fetchEventViewRow(analysisEventId);
    } catch {
      detailRow = null;
    }
  }
  const homeTeam = options.homeTeam?.trim() || detailRow?.home?.name || "Time da Casa";
  const awayTeam = options.awayTeam?.trim() || detailRow?.away?.name || "Time Visitante";
  const league = options.league?.trim() || detailRow?.league?.name || "NBA";
  const warnings: string[] = [
    "Não conseguimos dados completos de jogadores para este jogo no momento.",
  ];

  let lineup: BetsApiEventLineupResult | null = null;
  try {
    lineup = await fetchEventLineup(analysisEventId);
  } catch {
    warnings.push(
      "Não conseguimos confirmar o quinteto inicial deste jogo no momento; exibindo o elenco disponível."
    );
  }

  const buildTeamRoster = async (
    teamName: string,
    side: "home" | "away",
    teamId: string | null
  ): Promise<NbaPlayerAnalysisItem[]> => {
    const lineupSeeds = lineupSideToRosterSeeds(lineup?.[side], teamName);
    let mergedSeeds = [...lineupSeeds];

    if (teamId) {
      try {
        const squadSeeds = squadToRosterSeeds(await fetchTeamSquad(teamId), teamName);
        mergedSeeds = mergeRosterSeeds(lineupSeeds, squadSeeds);
      } catch {
        if (mergedSeeds.length === 0) {
          warnings.push(`Não conseguimos carregar o elenco de ${teamName} no momento.`);
        }
      }
    }

    return rosterSeedsToPlayers(mergedSeeds);
  };

  const homePlayers = await buildTeamRoster(homeTeam, "home", toOptionalText(detailRow?.home?.id));
  const awayPlayers = await buildTeamRoster(awayTeam, "away", toOptionalText(detailRow?.away?.id));

  return {
    matchId,
    homeTeam,
    awayTeam,
    league,
    scheduledAt: options.scheduledAt ?? (detailRow?.time ? toIsoDate(detailRow.time) : null),
    source: "feed",
    generatedAt: new Date().toISOString(),
    detailLevel: "roster_only",
    note: "Elenco disponível carregado a partir do feed oficial.",
    warnings,
    teams: [
      {
        teamName: homeTeam,
        logoUrl: getNbaTeamIdentity(homeTeam).logoUrl,
        players: homePlayers,
      },
      {
        teamName: awayTeam,
        logoUrl: getNbaTeamIdentity(awayTeam).logoUrl,
        players: awayPlayers,
      },
    ],
  };
};

export const fetchNbaPlayerAnalysisFromBetsApi = async (
  matchId: string,
  options: BetsApiPlayerAnalysisOptions = {}
): Promise<NbaPlayerAnalysisResponse> => {
  let directDetailRow: BetsApiLiveResultRow | null = null;
  try {
    directDetailRow = await fetchEventViewRow(matchId);
  } catch {
    directDetailRow = null;
  }

  const resolvedEvent = await resolveBetsApiPlayerAnalysisEvent(matchId, options, directDetailRow);
  const detailRow = resolvedEvent?.detailRow ?? directDetailRow;
  const resolvedBet365Id =
    toOptionalId(options.bet365Id) ||
    resolvedEvent?.bet365Id ||
    toOptionalId(detailRow?.bet365_id) ||
    resolvedEvent?.eventId ||
    matchId;

  let payloadRow: unknown = null;
  let inferredTeams = { homeTeam: null as string | null, awayTeam: null as string | null };

  try {
    const rows = await fetchRawPrematchRows(resolvedBet365Id);
    payloadRow = rows[0];
    inferredTeams = extractTeamsFromRawBodies(payloadRow);
  } catch (error) {
    if (
      error instanceof BetsApiError &&
      (error.kind === "plan" || error.kind === "auth" || error.kind === "config")
    ) {
      return buildRosterOnlyPlayerAnalysis(matchId, options, resolvedEvent);
    }

    throw error;
  }

  const homeTeam =
    options.homeTeam?.trim() || inferredTeams.homeTeam || detailRow?.home?.name || "Time da Casa";
  const awayTeam =
    options.awayTeam?.trim() || inferredTeams.awayTeam || detailRow?.away?.name || "Time Visitante";
  const league = options.league?.trim() || detailRow?.league?.name || "NBA";

  const playerMap = new Map<string, MutablePlayerAnalysisEntry>();
  const warnings: string[] = [];

  const rawSections: Array<{
    sectionKey: "points" | "rebounds" | "assists";
    statKey: "points" | "rebounds" | "assists";
  }> = [
    { sectionKey: "points", statKey: "points" },
    { sectionKey: "rebounds", statKey: "rebounds" },
    { sectionKey: "assists", statKey: "assists" },
  ];

  for (const section of rawSections) {
    const body = getRawBodySection(payloadRow, section.sectionKey);
    if (!body) {
      warnings.push("Alguns dados detalhados deste jogo nao puderam ser carregados.");
      continue;
    }

    const players = extractPlayerEntriesFromRawBody(body);
    upsertPlayerEntry(playerMap, players, section.statKey);
  }

  const homePlayers: NbaPlayerAnalysisItem[] = [];
  const awayPlayers: NbaPlayerAnalysisItem[] = [];
  const unresolvedPlayers: NbaPlayerAnalysisItem[] = [];

  for (const player of buildPlayerAnalysisItems(playerMap)) {
    const side = matchTeamName(player.teamName, homeTeam, awayTeam);
    if (side === "home") {
      homePlayers.push(player);
      continue;
    }

    if (side === "away") {
      awayPlayers.push(player);
      continue;
    }

    unresolvedPlayers.push(player);
  }

  if (unresolvedPlayers.length > 0) {
    warnings.push(
      `${unresolvedPlayers.length} jogador(es) vieram com time nao reconhecido e foram omitidos da visualizacao.`
    );
  }

  if (homePlayers.length === 0 && awayPlayers.length === 0) {
    return buildRosterOnlyPlayerAnalysis(
      matchId,
      {
        ...options,
        homeTeam,
        awayTeam,
        league,
      },
      resolvedEvent
    );
  }

  return {
    matchId,
    homeTeam,
    awayTeam,
    league,
    scheduledAt: options.scheduledAt ?? (detailRow?.time ? toIsoDate(detailRow.time) : null),
    source: "feed",
    generatedAt: new Date().toISOString(),
    detailLevel: "full",
    note: "Medias recentes processadas a partir da leitura pre-jogo oficial disponivel.",
    warnings,
    teams: [
      {
        teamName: homeTeam,
        logoUrl: getNbaTeamIdentity(homeTeam).logoUrl,
        players: homePlayers,
      },
      {
        teamName: awayTeam,
        logoUrl: getNbaTeamIdentity(awayTeam).logoUrl,
        players: awayPlayers,
      },
    ],
  };
};

export const getBetsApiFriendlyMessage = (error: unknown): string => {
  const fallback = "Nao foi possivel carregar os dados do basquete agora. Exibindo fallback seguro.";
  if (!(error instanceof BetsApiError)) return fallback;

  if (error.kind === "quota") {
    return "Alguns dados não puderam ser carregados agora. Exibindo fallback seguro.";
  }

  if (error.kind === "plan") {
    return "Alguns dados não estão disponíveis no momento. Exibindo fallback seguro.";
  }

  if (error.kind === "auth") {
    return "Não foi possível validar a consulta agora. Exibindo fallback seguro.";
  }

  if (error.kind === "config") {
    return "Configuração temporariamente indisponível. Exibindo fallback seguro.";
  }

  return fallback;
};

export const fetchNbaMatchesFromBetsApi = async (days: number): Promise<NbaMatchesResult> => {
  const warnings: string[] = [];
  const dayRange = getUpcomingDaysRange(days);

  const dayRows = await fetchUpcomingByDays(dayRange, null);
  const mergedRows = dedupeById(dayRows);

  const filteredRows = mergedRows.filter((row) => {
    if (!isTrackedPreGameLeague(row)) return false;
    const status = mapTimeStatusToMatchStatus(row.time_status);
    return status === "not_started" || status === "in_play";
  });
  const relevantRows = await enrichUpcomingRowsWithRealOdds(filteredRows, warnings);

  const matches = relevantRows
    .map((row) => normalizeMatch(row))
    .filter((item): item is NbaMatch => Boolean(item))
    .sort((a, b) => {
      const priorityGap = (a.competitionPriority ?? 999) - (b.competitionPriority ?? 999);
      if (priorityGap !== 0) return priorityGap;
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });

  const defaultOddsCount = matches.filter(
    (match) =>
      match.odds.moneyline.home === DEFAULT_MONEYLINE.home &&
      match.odds.moneyline.away === DEFAULT_MONEYLINE.away
  ).length;
  if (defaultOddsCount > 0) {
    warnings.push(
      `${defaultOddsCount} jogo(s) sem moneyline no payload bruto; odds padrão aplicadas no MVP.`
    );
  }

  if (matches.length === 0) {
    warnings.push("Nenhum jogo das ligas monitoradas foi retornado para o periodo solicitado.");
  }

  return {
    matches,
    warnings,
  };
};

export const fetchNbaBuilderCatalogEventsFromBetsApi = async (
  days: number
): Promise<{ events: NbaBuilderCatalogEvent[]; warnings: string[] }> => {
  const warnings: string[] = [];
  const dayRange = getUpcomingDaysRange(days);

  const dayRows = await fetchUpcomingByDays(dayRange, null);
  const mergedRows = dedupeById(dayRows);

  const events = mergedRows
    .filter((row) => isNbaLeague(row))
    .map((row) => normalizeBuilderCatalogEvent(row))
    .filter((item): item is NbaBuilderCatalogEvent => Boolean(item))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  if (events.length === 0) {
    warnings.push("Nenhum evento elegivel da NBA foi retornado para o catalogo do builder.");
  }

  const withoutBet365Fi = events.filter((event) => !event.bet365Fi).length;
  if (withoutBet365Fi > 0) {
    warnings.push(
      `${withoutBet365Fi} evento(s) vieram sem bet365Fi; o snapshot de prematch sera ignorado nesses casos.`
    );
  }

  return {
    events,
    warnings,
  };
};

export const fetchNbaEventOddsPayloadFromBetsApi = async (
  eventId: string
): Promise<BetsApiEventOddsPayload | null> => {
  return fetchEventOddsPayload(eventId);
};

export const fetchNbaPrematchRowsFromBetsApi = async (
  bet365Fi: string
): Promise<unknown[]> => {
  return fetchStructuredPrematchRows(bet365Fi);
};

export const fetchNbaLiveGamesFromBetsApi = async (): Promise<NbaLiveGame[]> => {
  const liveRows = dedupeById(await fetchInplayRows()).filter((row) => isNbaLeague(row));

  const enrichedGames = await Promise.all(
    liveRows.map(async (row) => {
      const homeTeam = row.home?.name || "Time da Casa";
      const awayTeam = row.away?.name || "Time Visitante";
      const homeIdentity = getNbaTeamIdentity(homeTeam);
      const awayIdentity = getNbaTeamIdentity(awayTeam);
      const fallbackOdds = parseMoneyline(row);
      const eventId = getEventIdForDetails(row);

      let eventViewRow: BetsApiLiveResultRow | null = null;
      let liveOdds = fallbackOdds;

      if (eventId) {
        try {
          const [viewRow, oddsPayload] = await Promise.all([
            fetchEventViewRow(eventId),
            fetchEventOddsPayload(eventId),
          ]);

          eventViewRow = viewRow;
          const parsedLiveOdds = extractMoneylineFromEventOddsPayload(oddsPayload, fallbackOdds);
          if (!isDefaultMoneyline(parsedLiveOdds)) {
            liveOdds = parsedLiveOdds;
          }
        } catch {
          // Mantém fallback silencioso para não quebrar a tela live.
        }
      }

      const gameClock = parseTimerObject(row.timer, eventViewRow?.extra ?? row.extra);
      const formattedClock = formatGameClock(gameClock) || parseTimer(row);
      const quarterLabel = formatQuarterLabel(gameClock?.quarter ?? null) || parsePeriod(row);

      return {
        id: String(row.id ?? ""),
        scheduledAt: toIsoDate(row.time),
        league: row.league?.name || eventViewRow?.league?.name || "NBA",
        homeTeam,
        awayTeam,
        homeTeamLogo: homeIdentity.logoUrl,
        awayTeamLogo: awayIdentity.logoUrl,
        status: mapTimeStatusToMatchStatus(row.time_status),
        timeStatus: String(row.time_status ?? ""),
        score: parseScore(row.ss),
        odds: {
          moneyline: liveOdds,
        },
        timer: formattedClock,
        period: quarterLabel,
        gameClock,
        quarterScores: parseQuarterScores(row.scores),
        liveStats: {
          fouls: parseDualStat(row.stats, "fouls"),
          timeouts: parseDualStat(row.stats, "time_outs"),
          freeThrows: parseDualStat(row.stats, "free_throws"),
          freeThrowRate: parseDualStat(row.stats, "free_throws_rate"),
          twoPoints: parseDualStat(row.stats, "2points"),
          threePoints: parseDualStat(row.stats, "3points"),
        },
        venue: (eventViewRow?.extra ?? row.extra)?.stadium_data
          ? {
              name:
                typeof (eventViewRow?.extra ?? row.extra)?.stadium_data?.name === "string"
                  ? ((eventViewRow?.extra ?? row.extra)?.stadium_data?.name as string)
                  : null,
              city:
                typeof (eventViewRow?.extra ?? row.extra)?.stadium_data?.city === "string"
                  ? ((eventViewRow?.extra ?? row.extra)?.stadium_data?.city as string)
                  : null,
            }
          : null,
      } satisfies NbaLiveGame;
    })
  );

  return enrichedGames;
};

export const fetchNbaEndedGamesFromBetsApi = async (
  daysBack: number,
  pageLimit: number = 1
): Promise<NbaEndedGame[]> => {
  const pastDays = getPastDaysRange(daysBack);
  const dayRows = await fetchEndedByDays(pastDays, pageLimit);
  const mergedRows = dedupeById(dayRows);

  return mergedRows
    .filter((row) => isNbaLeague(row))
    .filter((row) => mapTimeStatusToMatchStatus(row.time_status) === "finished")
    .map((row) => ({
      id: String(row.id ?? ""),
      scheduledAt: toIsoDate(row.time),
      league: row.league?.name || "NBA",
      homeTeam: row.home?.name || "Time da Casa",
      awayTeam: row.away?.name || "Time Visitante",
      status: mapTimeStatusToMatchStatus(row.time_status),
      timeStatus: String(row.time_status ?? ""),
      score: parseScore(row.ss),
      raw: row,
    }))
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
};
