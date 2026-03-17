const BETSAPI_BASE_URL =
  process.env.BETSAPI_BASE_URL ?? "https://api.b365api.com/v1";
const API_TOKEN = process.env.API_KEY_1;
const RAW_SPORT_ID = process.env.BETSAPI_CSGO_SPORT_ID;
const LOOKAHEAD_DAYS = Number(
  process.env.BETSAPI_LOOKAHEAD_DAYS ?? process.env.CSGO_LOOKAHEAD_DAYS ?? 2
);

const FALLBACK_SPORT_IDS = [78, 90, 150];

const CSGO_KEYWORDS = [
  "counter",
  "strike",
  "cs:go",
  "csgo",
  "cs2",
  "blast",
  "iem",
  "esl",
  "pgl",
  "cct",
  "gaimin",
  "keyd",
  "keyd stars",
  "bounty hunters",
  "navi",
  "faze",
  "vitality",
  "astralis",
  "liquid",
  "furia",
  "pain",
  "fluxo",
  "imperial",
  "mibr",
  "heroic",
  "g2",
  "mouz",
  "nip",
  "ence",
  "challenger league",
  "challenger",
  "galaxy battle",
  "rivals",
  "european pro league",
  "united21",
  "clutch",
  "play-in",
  "playoffs",
  "ferjee",
  "rainhas",
];

const NON_CSGO_KEYWORDS = [
  "valorant",
  "lol",
  "league of legends",
  "dota",
  "overwatch",
  "pubg",
  "rocket league",
  "fifa",
  "nba2k",
  "virtual sports",
  "fortnite",
  "apex",
  "mobile legends",
];

export interface NormalizedMatch {
  id: string;
  eventId: string;
  startsAt: string;
  timestamp: number;
  status: string;
  league: {
    id: string;
    name: string;
  };
  home: {
    id: string;
    name: string;
    score: number | null;
    logo?: string;
    logoUrl?: string | null;
    lineup?: string[];
    slug?: string | null;
    country?: string | null;
  };
  away: {
    id: string;
    name: string;
    score: number | null;
    logo?: string;
    logoUrl?: string | null;
    lineup?: string[];
    slug?: string | null;
    country?: string | null;
  };
  isLive: boolean;
  raw: Record<string, unknown>;
}

interface FetchParams {
  sport_id: number;
  page?: number;
  [key: string]: string | number | undefined;
}

const defaultMockMatches: NormalizedMatch[] = [
  {
    id: "mock-furia-navi",
    eventId: "mock-furia-navi",
    startsAt: new Date().toISOString(),
    timestamp: Date.now(),
    status: "scheduled",
    league: { id: "mock", name: "ESL Pro League - Playoffs" },
    home: { id: "furia", name: "FURIA", score: null },
    away: { id: "navi", name: "NAVI", score: null },
    isLive: false,
    raw: {},
  },
];

class CSGOAPI {
  private get sportId(): number | null {
    if (RAW_SPORT_ID && !Number.isNaN(Number(RAW_SPORT_ID))) {
      return Number(RAW_SPORT_ID);
    }
    return null;
  }

  private ensureToken() {
    if (!API_TOKEN) {
      throw new Error(
        "API_KEY_1 não configurada. Defina seu token da BetsAPI no .env"
      );
    }
  }

  private buildUrl(endpoint: string, params: Record<string, string | number>) {
    const url = new URL(`${BETSAPI_BASE_URL}${endpoint}`);
    url.searchParams.set("token", API_TOKEN ?? "");
    Object.entries(params).forEach(([key, value]) =>
      url.searchParams.set(key, String(value))
    );
    return url.toString();
  }

  private async fetchMatchesFromEndpoint(
    endpoint: "/bet365/upcoming" | "/bet365/inplay",
    params: FetchParams
  ) {
    const url = this.buildUrl(
      endpoint,
      params as Record<string, string | number>
    );
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "CSGO-Intel/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Falha na BetsAPI (${endpoint}): ${response.status}`);
    }

    return response.json();
  }

  private isWithinRange(timestamp: number) {
    const matchDate = new Date(timestamp * 1000);
    const now = new Date();

    // Permitir jogos em andamento (não filtrar por estar no passado recente)
    // Janela: aceita jogos até LOOKAHEAD_DAYS no futuro
    const maxDate = new Date(now);
    maxDate.setDate(now.getDate() + LOOKAHEAD_DAYS);

    return matchDate <= maxDate;
  }

  private looksLikeCsgo(match: any) {
    if (!match) return false;
    if (
      this.sportId &&
      Number(match.sport_id ?? match.sportId ?? match.sport) === this.sportId
    ) {
      return true;
    }
    const text = `${match.league?.name ?? match.league_name ?? ""} ${
      match.home?.name ?? match.home_name ?? ""
    } ${match.away?.name ?? match.away_name ?? ""}`.toLowerCase();
    if (NON_CSGO_KEYWORDS.some((keyword) => text.includes(keyword))) {
      return false;
    }
    return CSGO_KEYWORDS.some((keyword) => text.includes(keyword));
  }

  private normalizeMatch(match: any): NormalizedMatch | null {
    const rawTime = match.time ?? match.start_time ?? match.timestamp;
    const timestamp =
      typeof rawTime === "number" ? rawTime : rawTime ? Number(rawTime) : null;
    if (!timestamp || !this.isWithinRange(timestamp)) {
      return null;
    }

    const baseId = String(match.id ?? match.event_id ?? timestamp);
    return {
      id: baseId,
      eventId: String(match.event_id ?? baseId),
      startsAt: new Date(timestamp * 1000).toISOString(),
      timestamp: timestamp * 1000,
      status: match.ss ?? match.status ?? "scheduled",
      league: {
        id: String(match.league?.id ?? match.league_id ?? "unknown"),
        name: match.league?.name ?? match.league_name ?? "Liga desconhecida",
      },
      home: {
        id: String(match.home?.id ?? match.home_id ?? "home"),
        name: match.home?.name ?? match.home_name ?? "Time Casa",
        score: match.scores?.home ?? null,
      },
      away: {
        id: String(match.away?.id ?? match.away_id ?? "away"),
        name: match.away?.name ?? match.away_name ?? "Time Visitante",
        score: match.scores?.away ?? null,
      },
      isLive: Boolean(
        match.ss && match.ss !== "notstarted" && match.ss !== "upcoming"
      ),
      raw: match,
    };
  }

  private async collectMatches() {
    try {
      this.ensureToken();
    } catch (error) {
      console.warn("[CSGOAPI] usando mock por falta de token:", error);
      return defaultMockMatches;
    }

    const sportIds = this.sportId ? [this.sportId] : FALLBACK_SPORT_IDS;
    console.log(
      "[CSGOAPI] buscando partidas com sport_ids:",
      sportIds.join(", ")
    );

    try {
      const results: NormalizedMatch[] = [];

      for (const sportId of sportIds) {
        try {
          console.log(
            `[CSGOAPI] consultando sport_id=${sportId} (upcoming/inplay)`
          );
          const [upcoming, live] = await Promise.all([
            this.fetchMatchesFromEndpoint("/bet365/upcoming", {
              sport_id: sportId,
            }),
            this.fetchMatchesFromEndpoint("/bet365/inplay", {
              sport_id: sportId,
            }),
          ]);

          const allMatches = [
            ...(upcoming.results ?? []),
            ...(live.results ?? []),
          ].filter((match: any) => this.looksLikeCsgo(match));

          const normalized = allMatches
            .map((match: any) => this.normalizeMatch(match))
            .filter((match): match is NormalizedMatch => Boolean(match));

          results.push(...normalized);
        } catch (error: unknown) {
          console.warn(
            `[CSGOAPI] falha ao consultar sport_id=${sportId}:`,
            (error as Error).message
          );
        }
      }

      if (results.length === 0) {
        console.warn(
          "[CSGOAPI] nenhuma partida real retornada. Usando cenário demonstrativo."
        );
        return defaultMockMatches;
      }

      const unique = new Map(results.map((match) => [match.eventId, match]));

      return Array.from(unique.values()).sort(
        (a, b) => a.timestamp - b.timestamp
      );
    } catch (error: unknown) {
      console.error(
        "[CSGOAPI] erro ao coletar partidas:",
        (error as Error).message
      );
      return defaultMockMatches;
    }
  }

  async getTodaysMatches() {
    return this.collectMatches();
  }

  async getLiveMatches() {
    const matches = await this.collectMatches();
    return matches.filter((match) => match.isLive);
  }

  async getMatchDetails(matchId: string) {
    try {
      this.ensureToken();
    } catch (error) {
      console.warn("[CSGOAPI] detalhes usando mock:", error);
      return defaultMockMatches.find((match) => match.id === matchId) ?? null;
    }

    try {
      console.log(`[CSGOAPI] buscando detalhes para event_id=${matchId}`);
      const url = this.buildUrl("/bet365/event", { event_id: matchId });
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "CSGO-Intel/1.0",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Falha ao buscar evento: ${response.status}`);
      }

      const data = await response.json();
      const result = data.results?.[0];
      return result ? this.normalizeMatch(result) : null;
    } catch (error: unknown) {
      console.error(
        "[CSGOAPI] erro em getMatchDetails:",
        (error as Error).message
      );
      return null;
    }
  }
}

export const csgoAPI = new CSGOAPI();
export default csgoAPI;
