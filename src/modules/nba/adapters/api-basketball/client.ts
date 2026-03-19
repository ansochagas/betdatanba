import { NbaMatch, NbaMatchesResult, NbaMoneylineOdds } from "@/modules/nba/types";

const DEFAULT_BASE_URL = "https://v1.basketball.api-sports.io";
const NBA_LEAGUE_ID = 12;
const DEFAULT_MONEYLINE: NbaMoneylineOdds = { home: 1.91, away: 1.91 };
const DEFAULT_REQUEST_TIMEOUT_MS = 7000;

type ApiBasketballEnvelope<T> = {
  errors?: Record<string, string> | string[] | null;
  response?: T[];
  results?: number;
};

export class ApiBasketballError extends Error {
  readonly kind: "config" | "request" | "plan" | "quota";

  constructor(message: string, kind: "config" | "request" | "plan" | "quota") {
    super(message);
    this.name = "ApiBasketballError";
    this.kind = kind;
  }
}

const formatDateInBrt = (date: Date): string => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const getDateRangeInBrt = (days: number): string[] => {
  const safeDays = Number.isFinite(days) ? Math.max(1, Math.min(days, 7)) : 2;
  const now = new Date();

  return Array.from({ length: safeDays }, (_, offset) => {
    const date = new Date(now);
    date.setDate(now.getDate() + offset);
    return formatDateInBrt(date);
  });
};

const getSeasonStartYear = (isoDate: string): number => {
  const [yearStr, monthStr] = isoDate.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  // NBA season usually starts in October.
  return month >= 10 ? year : year - 1;
};

const normalizeApiErrors = (errors: ApiBasketballEnvelope<unknown>["errors"]): string[] => {
  if (!errors) return [];
  if (Array.isArray(errors)) return errors.filter(Boolean);
  return Object.entries(errors)
    .map(([key, value]) => `${key}: ${value}`)
    .filter(Boolean);
};

const classifyError = (message: string): ApiBasketballError["kind"] => {
  const lower = message.toLowerCase();

  if (lower.includes("free plans") || lower.includes("plan")) return "plan";
  if (lower.includes("limit") || lower.includes("quota") || lower.includes("too many")) {
    return "quota";
  }

  return "request";
};

const getRequestTimeoutMs = (): number => {
  const raw = Number(process.env.API_BASKETBALL_TIMEOUT_MS ?? DEFAULT_REQUEST_TIMEOUT_MS);
  if (!Number.isFinite(raw)) return DEFAULT_REQUEST_TIMEOUT_MS;
  return Math.max(1000, Math.min(raw, 30000));
};

const makeApiRequest = async <T>(
  endpoint: string,
  params: Record<string, string | number>
): Promise<ApiBasketballEnvelope<T>> => {
  const apiKey = process.env.API_BASKETBALL_KEY;
  const baseUrl = process.env.API_BASKETBALL_BASE_URL || DEFAULT_BASE_URL;

  if (!apiKey) {
    throw new ApiBasketballError("API_BASKETBALL_KEY nao configurada.", "config");
  }

  const url = new URL(endpoint, baseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timeoutMs = getRequestTimeoutMs();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        "x-apisports-key": apiKey,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiBasketballError(
        `Tempo limite ao consultar API Basketball (${timeoutMs}ms).`,
        "request"
      );
    }

    throw new ApiBasketballError("Falha de conexao com API Basketball.", "request");
  } finally {
    clearTimeout(timeoutId);
  }

  let payload: ApiBasketballEnvelope<T>;
  try {
    payload = (await response.json()) as ApiBasketballEnvelope<T>;
  } catch {
    throw new ApiBasketballError("Resposta invalida da API Basketball.", "request");
  }

  const apiErrors = normalizeApiErrors(payload.errors);

  if (!response.ok) {
    const message = apiErrors.join(" | ") || `Erro HTTP ${response.status}`;
    throw new ApiBasketballError(message, classifyError(message));
  }

  if (apiErrors.length > 0) {
    const message = apiErrors.join(" | ");
    throw new ApiBasketballError(message, classifyError(message));
  }

  return payload;
};

const parseOddNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const sanitized = value.replace(",", ".").trim();
  const parsed = Number.parseFloat(sanitized);
  return Number.isFinite(parsed) ? parsed : null;
};

const extractMoneylineFromOddsRow = (row: any): NbaMoneylineOdds | null => {
  const directHome = parseOddNumber(row?.odds?.home);
  const directAway = parseOddNumber(row?.odds?.away);
  const directDraw = parseOddNumber(row?.odds?.draw);

  if (directHome && directAway) {
    return {
      home: directHome,
      away: directAway,
      ...(directDraw ? { draw: directDraw } : {}),
    };
  }

  const bookmakers = Array.isArray(row?.bookmakers) ? row.bookmakers : [];

  for (const bookmaker of bookmakers) {
    const bets = Array.isArray(bookmaker?.bets)
      ? bookmaker.bets
      : Array.isArray(bookmaker?.markets)
        ? bookmaker.markets
        : [];

    for (const bet of bets) {
      const values = Array.isArray(bet?.values)
        ? bet.values
        : Array.isArray(bet?.outcomes)
          ? bet.outcomes
          : [];

      let home: number | null = null;
      let away: number | null = null;
      let draw: number | null = null;

      for (const outcome of values) {
        const label = String(outcome?.value || outcome?.label || outcome?.name || "").toLowerCase();
        const odd = parseOddNumber(outcome?.odd ?? outcome?.price);
        if (!odd) continue;

        if (label.includes("home")) home = odd;
        if (label.includes("away")) away = odd;
        if (label.includes("draw")) draw = odd;
      }

      if (home && away) {
        return {
          home,
          away,
          ...(draw ? { draw } : {}),
        };
      }
    }
  }

  return null;
};

const mapGameStatus = (statusShort?: string, statusLong?: string): string => {
  const source = (statusShort || statusLong || "").toLowerCase();
  if (source.includes("live") || source === "q1" || source === "q2" || source === "q3" || source === "q4") {
    return "in_play";
  }
  if (source.includes("ft") || source.includes("finished")) return "finished";
  if (source.includes("postponed")) return "postponed";
  if (source.includes("cancel")) return "cancelled";
  return "not_started";
};

export const getApiBasketballFriendlyMessage = (error: unknown): string => {
  const fallback = "Nao foi possivel carregar os dados da NBA agora. Exibindo fallback seguro.";
  if (!(error instanceof ApiBasketballError)) return fallback;

  if (error.kind === "quota") {
    return "Alguns dados nao puderam ser carregados agora. Exibindo fallback seguro.";
  }

  if (error.kind === "plan") {
    return "Alguns dados nao estao disponiveis no momento. Exibindo fallback seguro.";
  }

  if (error.kind === "config") {
    return "Configuracao temporariamente indisponivel. Exibindo fallback seguro.";
  }

  return fallback;
};

export const fetchNbaMatchesFromApiBasketball = async (
  days: number
): Promise<NbaMatchesResult> => {
  const dates = getDateRangeInBrt(days);
  const warnings: string[] = [];

  const gameRows: any[] = [];
  for (const date of dates) {
    const season = getSeasonStartYear(date);
    const gamesEnvelope = await makeApiRequest<any>("games", {
      league: NBA_LEAGUE_ID,
      season,
      date,
    });

    if (Array.isArray(gamesEnvelope.response)) {
      gameRows.push(...gamesEnvelope.response);
    }
  }

  const oddsByGameId = new Map<number, NbaMoneylineOdds>();
  try {
    for (const date of dates) {
      const season = getSeasonStartYear(date);
      const oddsEnvelope = await makeApiRequest<any>("odds", {
        league: NBA_LEAGUE_ID,
        season,
        date,
      });

      for (const row of oddsEnvelope.response || []) {
        const gameId = Number(row?.game?.id ?? row?.id ?? row?.fixture?.id);
        if (!Number.isFinite(gameId)) continue;

        const moneyline = extractMoneylineFromOddsRow(row);
        if (moneyline) {
          oddsByGameId.set(gameId, moneyline);
        }
      }
    }
  } catch (error) {
    warnings.push(getApiBasketballFriendlyMessage(error));
  }

  const normalizedMatches: NbaMatch[] = gameRows
    .map((game) => {
      const id = Number(game?.id);
      if (!Number.isFinite(id)) return null;

      const homeTeam = game?.teams?.home?.name || "Time da Casa";
      const awayTeam = game?.teams?.away?.name || "Time Visitante";
      const scheduledAt = game?.date || new Date().toISOString();
      const tournament = game?.league?.name || "NBA";

      return {
        id,
        league: game?.league?.name || "NBA",
        homeTeam,
        awayTeam,
        scheduledAt,
        tournament,
        status: mapGameStatus(game?.status?.short, game?.status?.long),
        gameName: "NBA",
        homeTeamId: Number(game?.teams?.home?.id) || undefined,
        awayTeamId: Number(game?.teams?.away?.id) || undefined,
        odds: {
          moneyline: oddsByGameId.get(id) || DEFAULT_MONEYLINE,
        },
        source: "feed",
      } as NbaMatch;
    })
    .filter((match): match is NbaMatch => Boolean(match))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  return {
    matches: normalizedMatches,
    warnings,
  };
};
