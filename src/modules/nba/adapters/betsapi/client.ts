import {
  NbaMatch,
  NbaMatchesResult,
  NbaMoneylineOdds,
  NbaPlayerAnalysisItem,
  NbaPlayerAnalysisResponse,
} from "@/modules/nba/types";
import { getNbaTeamIdentity } from "@/modules/nba/logos";

const DEFAULT_BASE_URL = "https://api.b365api.com";
const DEFAULT_SPORT_ID = 18;
const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_MONEYLINE: NbaMoneylineOdds = { home: 1.91, away: 1.91 };
const BETSAPI_UPCOMING_ENDPOINT = "/v1/bet365/upcoming";
const BETSAPI_EVENT_ENDPOINT = "/v1/bet365/event";
const BETSAPI_PREMATCH_ENDPOINT = "/v1/bet365/prematch";
const BETSAPI_PREMATCH_RAW_ENDPOINT = "/v4/bet365/prematch";
const BETSAPI_RESULT_ENDPOINT = "/v1/bet365/result";
const DEFAULT_ODDS_ENRICH_LIMIT = 12;

type BetsApiUpcomingEvent = {
  id?: string | number;
  r_id?: string | number;
  our_event_id?: string | number;
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
  results?: T[] | T[][];
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

type BetsApiPlayerAnalysisOptions = {
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
  const value = (process.env.BETSAPI_NBA_LEAGUE_ID || "").trim();
  return value.length > 0 ? value : null;
};

const hasWordNba = (value: string): boolean => {
  return /(^|[^a-z])nba([^a-z]|$)/i.test(value);
};

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
  const league = event.league?.name || "NBA";
  const homeTeam = event.home?.name || "Time da Casa";
  const awayTeam = event.away?.name || "Time Visitante";
  const homeIdentity = getNbaTeamIdentity(homeTeam);
  const awayIdentity = getNbaTeamIdentity(awayTeam);

  return {
    id,
    league,
    homeTeam,
    awayTeam,
    homeTeamLogo: homeIdentity.logoUrl,
    awayTeamLogo: awayIdentity.logoUrl,
    scheduledAt: toIsoDate(event.time),
    tournament: league,
    status: mapTimeStatusToMatchStatus(event.time_status),
    gameName: "NBA",
    homeTeamId: toInt(event.home?.id) ?? undefined,
    awayTeamId: toInt(event.away?.id) ?? undefined,
    odds: {
      moneyline: parseMoneyline(event),
    },
    source: "betsapi",
  };
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
    throw new BetsApiError("BETSAPI_TOKEN nao configurada.", "config");
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

const fetchUpcomingByDay = async (day: string): Promise<BetsApiUpcomingEvent[]> => {
  const params: Record<string, string | number> = {
    sport_id: getSportId(),
    day,
  };
  const leagueIdFilter = getLeagueIdFilter();
  if (leagueIdFilter) {
    params.league_id = leagueIdFilter;
  }

  const payload = await requestBetsApi<BetsApiUpcomingEvent>(BETSAPI_UPCOMING_ENDPOINT, params);

  const rows = readResultsRows(payload);
  return rows.filter((row) => String(row.sport_id ?? "") === String(getSportId()));
};

const fetchUpcomingByDayWithRetry = async (
  day: string,
  retries: number = 1
): Promise<BetsApiUpcomingEvent[]> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetchUpcomingByDay(day);
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

const fetchUpcomingByDays = async (days: string[]): Promise<BetsApiUpcomingEvent[]> => {
  const merged: BetsApiUpcomingEvent[] = [];
  const concurrency = getDayFetchConcurrency();
  let firstError: unknown = null;

  for (let index = 0; index < days.length; index += concurrency) {
    const chunk = days.slice(index, index + concurrency);
    const settledRows = await Promise.allSettled(
      chunk.map((day) => fetchUpcomingByDayWithRetry(day, 1))
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

const fetchEventDetailRows = async (eventId: string): Promise<BetsApiEventDetailRow[]> => {
  const payload = await requestBetsApi<BetsApiEventDetailRow>(BETSAPI_EVENT_ENDPOINT, {
    FI: eventId,
  });

  return readResultsRows(payload);
};

const fetchPrematchRows = async (eventId: string): Promise<unknown[]> => {
  const payload = await requestBetsApi<unknown>(BETSAPI_PREMATCH_ENDPOINT, {
    FI: eventId,
  });

  return readResultsRows(payload);
};

const fetchRawPrematchRows = async (eventId: string): Promise<unknown[]> => {
  const payload = await requestBetsApi<unknown>(BETSAPI_PREMATCH_RAW_ENDPOINT, {
    FI: eventId,
    raw: 1,
  });

  return readResultsRows(payload);
};

const fetchLiveResultRow = async (eventId: string): Promise<BetsApiLiveResultRow | null> => {
  const payload = await requestBetsApi<BetsApiLiveResultRow>(BETSAPI_RESULT_ENDPOINT, {
    event_id: eventId,
  });

  const rows = readResultsRows(payload);
  return rows[0] ?? null;
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
  const candidateKey = normalizeLookupKey(candidate);
  const homeKey = normalizeLookupKey(homeTeam);
  const awayKey = normalizeLookupKey(awayTeam);

  if (candidateKey === homeKey || candidateKey.includes(homeKey) || homeKey.includes(candidateKey)) {
    return "home";
  }

  if (candidateKey === awayKey || candidateKey.includes(awayKey) || awayKey.includes(candidateKey)) {
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

const isMoneylineLabel = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;

  return (
    normalized === "money line" ||
    normalized === "moneyline" ||
    normalized.includes("money line")
  );
};

const extractMoneylineFromPrematchRows = (
  rows: Record<string, unknown>[],
  fallback: NbaMoneylineOdds = DEFAULT_MONEYLINE
): NbaMoneylineOdds => {
  const marketOdds = rows
    .map((row) => ({
      odd: toFloat(row.odds),
      header: row.header,
      name: row.name,
    }))
    .filter(
      (row) =>
        row.odd !== null &&
        row.odd > 1 &&
        (isMoneylineLabel(row.header) || isMoneylineLabel(row.name))
    )
    .map((row) => row.odd as number);

  if (marketOdds.length < 2) return fallback;

  const [home, away, draw] = marketOdds;
  return {
    home: Number(home.toFixed(2)),
    away: Number(away.toFixed(2)),
    ...(draw && draw > 1 ? { draw: Number(draw.toFixed(2)) } : {}),
  };
};

const extractMoneylineFromPrematchPayload = (
  payloadRow: unknown,
  fallback: NbaMoneylineOdds = DEFAULT_MONEYLINE
): NbaMoneylineOdds => {
  if (!isRecord(payloadRow)) return fallback;

  const schedule = isRecord(payloadRow.schedule) ? payloadRow.schedule : null;
  const scheduleSp = schedule && isRecord(schedule.sp) ? schedule.sp : null;
  const main = isRecord(payloadRow.main) ? payloadRow.main : null;
  const mainSp = main && isRecord(main.sp) ? main.sp : null;

  const preferredPaths = [
    scheduleSp?.main,
    mainSp?.game_lines,
    mainSp?.main,
  ];

  for (const pathRows of preferredPaths) {
    const parsed = extractMoneylineFromPrematchRows(asObjectRows(pathRows), fallback);
    if (!isDefaultMoneyline(parsed)) return parsed;
  }

  const marketGroups = [scheduleSp, mainSp].filter(
    (group): group is Record<string, unknown> => Boolean(group)
  );

  for (const group of marketGroups) {
    for (const value of Object.values(group)) {
      const parsed = extractMoneylineFromPrematchRows(asObjectRows(value), fallback);
      if (!isDefaultMoneyline(parsed)) return parsed;
    }
  }

  return fallback;
};

const extractMoneylineFromEventRows = (
  rows: BetsApiEventDetailRow[],
  fallback: NbaMoneylineOdds = DEFAULT_MONEYLINE
): NbaMoneylineOdds => {
  const markets = rows.filter((row) => row.type === "MA");
  const prices = rows.filter((row) => row.type === "PA");

  const candidateMarketIds = new Set<string>();

  for (const market of markets) {
    const marketName = String(market.NA ?? "").toLowerCase();
    if (marketName !== "money") continue;

    const marketId = String(market.ID ?? "");
    if (!marketId) continue;
    candidateMarketIds.add(marketId);
  }

  for (const marketId of candidateMarketIds) {
    const outcomes = prices
      .filter((row) => String(row.MA ?? "") === marketId)
      .map((row) => ({
        outcomeIndex: toInt(row.OR),
        decimal: typeof row.OD === "string" ? parseFractionalOdds(row.OD) : null,
      }))
      .filter((row) => row.outcomeIndex !== null && row.decimal !== null);

    if (outcomes.length < 2) continue;

    const home = outcomes.find((row) => row.outcomeIndex === 0)?.decimal ?? null;
    const away = outcomes.find((row) => row.outcomeIndex === 1)?.decimal ?? null;
    const draw = outcomes.find((row) => row.outcomeIndex === 2)?.decimal ?? null;

    if (!home || !away) continue;

    return {
      home: Number(home.toFixed(2)),
      away: Number(away.toFixed(2)),
      ...(draw && draw > 1 ? { draw: Number(draw.toFixed(2)) } : {}),
    };
  }

  return fallback;
};

const enrichUpcomingRowsWithEventOdds = async (
  rows: BetsApiUpcomingEvent[],
  warnings: string[]
): Promise<BetsApiUpcomingEvent[]> => {
  const limit = getOddsEnrichLimit();
  if (limit <= 0) return rows;

  const candidates = rows
    .filter((row) => mapTimeStatusToMatchStatus(row.time_status) === "in_play")
    .filter((row) => isDefaultMoneyline(parseMoneyline(row)))
    .slice(0, limit);

  if (candidates.length === 0) return rows;

  const marketMap = new Map<string, NbaMoneylineOdds>();

  await Promise.all(
    candidates.map(async (row) => {
      const eventId = getEventIdForDetails(row);
      if (!eventId) return;

      try {
        const detailRows = await fetchEventDetailRows(eventId);
        const parsedOdds = extractMoneylineFromEventRows(detailRows);
        if (!isDefaultMoneyline(parsedOdds)) {
          marketMap.set(String(row.id ?? ""), parsedOdds);
        }
      } catch {
        // Mantem fallback silencioso para nao quebrar ingestao.
      }
    })
  );

  if (marketMap.size === 0) {
    warnings.push(
      "BetsAPI nao retornou moneyline detalhada para os jogos ao vivo analisados."
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

const enrichUpcomingRowsWithPrematchOdds = async (
  rows: BetsApiUpcomingEvent[],
  warnings: string[]
): Promise<BetsApiUpcomingEvent[]> => {
  const limit = getOddsEnrichLimit();
  if (limit <= 0) return rows;

  const candidates = rows
    .filter((row) => mapTimeStatusToMatchStatus(row.time_status) === "not_started")
    .filter((row) => isDefaultMoneyline(parseMoneyline(row)))
    .slice(0, limit);

  if (candidates.length === 0) return rows;

  const marketMap = new Map<string, NbaMoneylineOdds>();

  await Promise.all(
    candidates.map(async (row) => {
      const eventId = getEventIdForDetails(row);
      if (!eventId) return;

      try {
        const prematchRows = await fetchPrematchRows(eventId);
        const parsedOdds = extractMoneylineFromPrematchPayload(prematchRows[0]);
        if (!isDefaultMoneyline(parsedOdds)) {
          marketMap.set(String(row.id ?? ""), parsedOdds);
        }
      } catch {
        // Mantem fallback silencioso para nao quebrar ingestao.
      }
    })
  );

  if (marketMap.size === 0) {
    warnings.push(
      "BetsAPI nao retornou moneyline pre-jogo detalhada para os jogos analisados."
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

const enrichUpcomingRowsWithRealOdds = async (
  rows: BetsApiUpcomingEvent[],
  warnings: string[]
): Promise<BetsApiUpcomingEvent[]> => {
  const withPrematchOdds = await enrichUpcomingRowsWithPrematchOdds(rows, warnings);
  return enrichUpcomingRowsWithEventOdds(withPrematchOdds, warnings);
};

export const fetchNbaPlayerAnalysisFromBetsApi = async (
  matchId: string,
  options: BetsApiPlayerAnalysisOptions = {}
): Promise<NbaPlayerAnalysisResponse> => {
  const rows = await fetchRawPrematchRows(matchId);
  const payloadRow = rows[0];
  const inferredTeams = extractTeamsFromRawBodies(payloadRow);

  const homeTeam = options.homeTeam?.trim() || inferredTeams.homeTeam || "Time da Casa";
  const awayTeam = options.awayTeam?.trim() || inferredTeams.awayTeam || "Time Visitante";
  const league = options.league?.trim() || "NBA";

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
      warnings.push(`BetsAPI nao retornou bloco bruto de ${section.sectionKey} para este jogo.`);
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

  return {
    matchId,
    homeTeam,
    awayTeam,
    league,
    scheduledAt: options.scheduledAt ?? null,
    source: "betsapi",
    generatedAt: new Date().toISOString(),
    note: "Medias dos ultimos 5 jogos retornadas pela BetsAPI em payload bruto de pre-jogo.",
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
  const fallback = "Nao foi possivel buscar os jogos da NBA na BetsAPI.";
  if (!(error instanceof BetsApiError)) return fallback;

  if (error.kind === "quota") {
    return "Limite de requisicoes da BetsAPI atingido. Exibindo fallback seguro.";
  }

  if (error.kind === "plan") {
    return "Seu plano da BetsAPI nao cobre este recurso. Exibindo fallback seguro.";
  }

  if (error.kind === "auth") {
    return "Token da BetsAPI invalido ou sem permissao. Exibindo fallback seguro.";
  }

  if (error.kind === "config") {
    return "Configuracao da BetsAPI ausente. Exibindo fallback seguro.";
  }

  return fallback;
};

export const fetchNbaMatchesFromBetsApi = async (days: number): Promise<NbaMatchesResult> => {
  const warnings: string[] = [];
  const dayRange = getUpcomingDaysRange(days);

  const dayRows = await fetchUpcomingByDays(dayRange);
  const mergedRows = dedupeById(dayRows);

  const filteredRows = mergedRows.filter((row) => {
    if (!isNbaLeague(row)) return false;
    const status = mapTimeStatusToMatchStatus(row.time_status);
    return status === "not_started" || status === "in_play";
  });
  const relevantRows = await enrichUpcomingRowsWithRealOdds(filteredRows, warnings);

  const matches = relevantRows
    .map((row) => normalizeMatch(row))
    .filter((item): item is NbaMatch => Boolean(item))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const defaultOddsCount = matches.filter(
    (match) =>
      match.odds.moneyline.home === DEFAULT_MONEYLINE.home &&
      match.odds.moneyline.away === DEFAULT_MONEYLINE.away
  ).length;
  if (defaultOddsCount > 0) {
    warnings.push(
      `${defaultOddsCount} jogo(s) sem moneyline no payload bruto; odds padrao aplicadas no MVP.`
    );
  }

  if (matches.length === 0) {
    warnings.push("Nenhum jogo NBA retornado pela BetsAPI para o periodo solicitado.");
  }

  return {
    matches,
    warnings,
  };
};

export const fetchNbaLiveGamesFromBetsApi = async (): Promise<NbaLiveGame[]> => {
  const now = new Date();
  const today = formatDayUtc(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setUTCDate(now.getUTCDate() - 1);
  const yesterday = formatDayUtc(yesterdayDate);

  const settledRows = await Promise.allSettled([
    fetchUpcomingByDayWithRetry(today, 1),
    fetchUpcomingByDayWithRetry(yesterday, 1),
  ]);
  const fulfilledRows = settledRows
    .filter(
      (result): result is PromiseFulfilledResult<BetsApiUpcomingEvent[]> =>
        result.status === "fulfilled"
    )
    .flatMap((result) => result.value);
  const firstError = settledRows.find(
    (result): result is PromiseRejectedResult => result.status === "rejected"
  );

  if (fulfilledRows.length === 0 && firstError) {
    throw firstError.reason;
  }

  const rows = dedupeById(fulfilledRows);

  const liveRows = rows
    .filter((row) => isNbaLeague(row))
    .filter((row) => {
      const status = mapTimeStatusToMatchStatus(row.time_status);
      return status === "in_play";
    });

  const enrichedGames = await Promise.all(
    liveRows.map(async (row) => {
      const homeTeam = row.home?.name || "Time da Casa";
      const awayTeam = row.away?.name || "Time Visitante";
      const homeIdentity = getNbaTeamIdentity(homeTeam);
      const awayIdentity = getNbaTeamIdentity(awayTeam);
      const fallbackOdds = parseMoneyline(row);
      const eventId = getEventIdForDetails(row);

      let liveResultRow: BetsApiLiveResultRow | null = null;
      let liveOdds = fallbackOdds;

      if (eventId) {
        try {
          const [resultRow, detailRows] = await Promise.all([
            fetchLiveResultRow(eventId),
            fetchEventDetailRows(eventId),
          ]);

          liveResultRow = resultRow;
          const parsedLiveOdds = extractMoneylineFromEventRows(detailRows, fallbackOdds);
          if (!isDefaultMoneyline(parsedLiveOdds)) {
            liveOdds = parsedLiveOdds;
          }
        } catch {
          // Mantem fallback silencioso para nao quebrar a tela live.
        }
      }

      const gameClock = parseTimerObject(liveResultRow?.timer, liveResultRow?.extra);
      const formattedClock = formatGameClock(gameClock) || parseTimer(row);
      const quarterLabel = formatQuarterLabel(gameClock?.quarter ?? null) || parsePeriod(row);

      return {
        id: String(row.id ?? ""),
        scheduledAt: toIsoDate(liveResultRow?.time ?? row.time),
        league: liveResultRow?.league?.name || row.league?.name || "NBA",
        homeTeam,
        awayTeam,
        homeTeamLogo: homeIdentity.logoUrl,
        awayTeamLogo: awayIdentity.logoUrl,
        status: mapTimeStatusToMatchStatus(liveResultRow?.time_status ?? row.time_status),
        timeStatus: String(liveResultRow?.time_status ?? row.time_status ?? ""),
        score: parseScore(liveResultRow?.ss ?? row.ss),
        odds: {
          moneyline: liveOdds,
        },
        timer: formattedClock,
        period: quarterLabel,
        gameClock,
        quarterScores: parseQuarterScores(liveResultRow?.scores),
        liveStats: {
          fouls: parseDualStat(liveResultRow?.stats, "fouls"),
          timeouts: parseDualStat(liveResultRow?.stats, "time_outs"),
          freeThrows: parseDualStat(liveResultRow?.stats, "free_throws"),
          freeThrowRate: parseDualStat(liveResultRow?.stats, "free_throws_rate"),
          twoPoints: parseDualStat(liveResultRow?.stats, "2points"),
          threePoints: parseDualStat(liveResultRow?.stats, "3points"),
        },
        venue: liveResultRow?.extra?.stadium_data
          ? {
              name:
                typeof liveResultRow.extra.stadium_data.name === "string"
                  ? liveResultRow.extra.stadium_data.name
                  : null,
              city:
                typeof liveResultRow.extra.stadium_data.city === "string"
                  ? liveResultRow.extra.stadium_data.city
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
  _pageLimit?: number
): Promise<NbaEndedGame[]> => {
  const pastDays = getPastDaysRange(daysBack);
  const dayRows = await fetchUpcomingByDays(pastDays);
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
