import {
  decorateMatchCompetition,
  getBasketballCompetitionByApiBasketballLeagueId,
  getTrackedPreGameCompetitions,
} from "@/modules/nba/competitions";
import { NbaMatch, NbaMatchesResult, NbaMoneylineOdds } from "@/modules/nba/types";

const DEFAULT_BASE_URL = "https://v1.basketball.api-sports.io";
const DEFAULT_MONEYLINE: NbaMoneylineOdds = { home: 1.91, away: 1.91 };
const DEFAULT_REQUEST_TIMEOUT_MS = 7000;
const DEFAULT_ODDS_ENRICH_LIMIT = 24;
const DEFAULT_ODDS_ENRICH_CONCURRENCY = 4;

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

const normalizeApiErrors = (
  errors: ApiBasketballEnvelope<unknown>["errors"]
): string[] => {
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

const getOddsEnrichLimit = (): number => {
  const raw = Number(process.env.API_BASKETBALL_ODDS_ENRICH_LIMIT ?? DEFAULT_ODDS_ENRICH_LIMIT);
  if (!Number.isFinite(raw)) return DEFAULT_ODDS_ENRICH_LIMIT;
  return Math.max(0, Math.min(raw, 100));
};

const getOddsEnrichConcurrency = (): number => {
  const raw = Number(
    process.env.API_BASKETBALL_ODDS_ENRICH_CONCURRENCY ?? DEFAULT_ODDS_ENRICH_CONCURRENCY
  );
  if (!Number.isFinite(raw)) return DEFAULT_ODDS_ENRICH_CONCURRENCY;
  return Math.max(1, Math.min(raw, 12));
};

const dedupeWarnings = (warnings: string[]): string[] => [...new Set(warnings.filter(Boolean))];

const makeApiRequest = async <T>(
  endpoint: string,
  params: Record<string, string | number>
): Promise<ApiBasketballEnvelope<T>> => {
  const apiKey = process.env.API_BASKETBALL_KEY;
  const baseUrl = process.env.API_BASKETBALL_BASE_URL || DEFAULT_BASE_URL;

  if (!apiKey) {
    throw new ApiBasketballError("Configuracao da consulta de basquete indisponivel.", "config");
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
        `Tempo limite ao consultar o basquete (${timeoutMs}ms).`,
        "request"
      );
    }

    throw new ApiBasketballError("Falha de conexao ao consultar o basquete.", "request");
  } finally {
    clearTimeout(timeoutId);
  }

  let payload: ApiBasketballEnvelope<T>;
  try {
    payload = (await response.json()) as ApiBasketballEnvelope<T>;
  } catch {
    throw new ApiBasketballError("Resposta invalida da consulta de basquete.", "request");
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
  if (
    source.includes("live") ||
    source === "q1" ||
    source === "q2" ||
    source === "q3" ||
    source === "q4"
  ) {
    return "in_play";
  }
  if (source.includes("ft") || source.includes("finished")) return "finished";
  if (source.includes("postponed")) return "postponed";
  if (source.includes("cancel")) return "cancelled";
  return "not_started";
};

const runWithConcurrency = async <T>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<void>
) => {
  for (let index = 0; index < items.length; index += concurrency) {
    const chunk = items.slice(index, index + concurrency);
    await Promise.all(chunk.map((item) => task(item)));
  }
};

export const getApiBasketballFriendlyMessage = (error: unknown): string => {
  const fallback = "Nao foi possivel carregar os dados do basquete agora. Exibindo fallback seguro.";
  if (!(error instanceof ApiBasketballError)) return fallback;

  if (error.kind === "quota") {
    return "Alguns dados nao puderam ser carregados agora. Exibindo fallback seguro.";
  }

  if (error.kind === "plan") {
    return "Alguns dados nao estao disponiveis no plano atual. Exibindo fallback seguro.";
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
  const trackedLeagueIds = new Set(
    getTrackedPreGameCompetitions()
      .map((competition) => competition.apiBasketball?.leagueId)
      .filter((leagueId): leagueId is number => Number.isFinite(leagueId))
  );

  const gameRows: any[] = [];
  let firstGamesError: unknown = null;

  for (const date of dates) {
    try {
      const gamesEnvelope = await makeApiRequest<any>("games", { date });
      if (Array.isArray(gamesEnvelope.response)) {
        gameRows.push(...gamesEnvelope.response);
      }
    } catch (error) {
      if (!firstGamesError) {
        firstGamesError = error;
      }
      warnings.push(`${date}: ${getApiBasketballFriendlyMessage(error)}`);
    }
  }

  if (gameRows.length === 0 && firstGamesError) {
    throw firstGamesError;
  }

  const filteredGames = Array.from(
    new Map(
      gameRows
        .filter((game) => {
          const leagueId = Number(game?.league?.id);
          if (!Number.isFinite(leagueId) || !trackedLeagueIds.has(leagueId)) {
            return false;
          }

          const status = mapGameStatus(game?.status?.short, game?.status?.long);
          return status === "not_started" || status === "in_play";
        })
        .map((game) => [Number(game?.id), game] as const)
    ).values()
  );

  const oddsByGameId = new Map<number, NbaMoneylineOdds>();
  const oddsTargets = filteredGames
    .map((game) => Number(game?.id))
    .filter((id): id is number => Number.isFinite(id));

  const oddsLimit = getOddsEnrichLimit();
  const limitedOddsTargets = oddsTargets.slice(0, oddsLimit);

  if (oddsTargets.length > oddsLimit) {
    warnings.push(
      `${oddsTargets.length - oddsLimit} jogo(s) ficaram com odd padrao para conter custo e latencia do feed.`
    );
  }

  let emittedOddsFailure = false;
  await runWithConcurrency(
    limitedOddsTargets,
    getOddsEnrichConcurrency(),
    async (gameId) => {
      try {
        const oddsEnvelope = await makeApiRequest<any>("odds", { game: gameId });
        const row = Array.isArray(oddsEnvelope.response) ? oddsEnvelope.response[0] : null;
        const moneyline = row ? extractMoneylineFromOddsRow(row) : null;
        if (moneyline) {
          oddsByGameId.set(gameId, moneyline);
        }
      } catch (error) {
        if (!emittedOddsFailure) {
          warnings.push(getApiBasketballFriendlyMessage(error));
          emittedOddsFailure = true;
        }
      }
    }
  );

  const normalizedMatches: NbaMatch[] = filteredGames
    .map((game) => {
      const id = Number(game?.id);
      if (!Number.isFinite(id)) return null;

      const competition = getBasketballCompetitionByApiBasketballLeagueId(Number(game?.league?.id));
      const homeTeam = game?.teams?.home?.name || "Time da Casa";
      const awayTeam = game?.teams?.away?.name || "Time Visitante";
      const leagueLabel = competition?.displayName || game?.league?.name || "Basquete";

      return decorateMatchCompetition(
        {
          id,
          league: leagueLabel,
          country: game?.country?.name || game?.league?.country?.name || competition?.country,
          homeTeam,
          awayTeam,
          homeTeamLogo: game?.teams?.home?.logo || undefined,
          awayTeamLogo: game?.teams?.away?.logo || undefined,
          scheduledAt: game?.date || new Date().toISOString(),
          tournament: leagueLabel,
          status: mapGameStatus(game?.status?.short, game?.status?.long),
          gameName: leagueLabel,
          homeTeamId: Number(game?.teams?.home?.id) || undefined,
          awayTeamId: Number(game?.teams?.away?.id) || undefined,
          odds: {
            moneyline: oddsByGameId.get(id) || DEFAULT_MONEYLINE,
          },
          source: "feed",
        },
        competition
      );
    })
    .filter((match): match is NbaMatch => Boolean(match))
    .sort((left, right) => {
      const priorityGap = (left.competitionPriority ?? 999) - (right.competitionPriority ?? 999);
      if (priorityGap !== 0) return priorityGap;
      return new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime();
    });

  const defaultOddsCount = normalizedMatches.filter(
    (match) =>
      match.odds.moneyline.home === DEFAULT_MONEYLINE.home &&
      match.odds.moneyline.away === DEFAULT_MONEYLINE.away
  ).length;

  if (defaultOddsCount > 0) {
    warnings.push(
      `${defaultOddsCount} jogo(s) vieram sem moneyline confirmado; odd padrao aplicada no MVP.`
    );
  }

  if (normalizedMatches.length === 0) {
    warnings.push("Nenhum jogo relevante das ligas monitoradas foi retornado para o periodo.");
  }

  return {
    matches: normalizedMatches,
    warnings: dedupeWarnings(warnings),
  };
};
