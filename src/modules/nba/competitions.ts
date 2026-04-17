import { NbaMatch } from "@/modules/nba/types";

export type BasketballCompetitionKey =
  | "nba"
  | "euroleague"
  | "eurocup"
  | "acb"
  | "nbb"
  | "lega-a"
  | "bbl"
  | "lnb-france"
  | "super-ligi"
  | "liga-a-argentina";

type ApiBasketballSeasonStyle = "split-year" | "year";

type ApiBasketballCompetitionConfig = {
  leagueId: number;
  seasonStyle: ApiBasketballSeasonStyle;
  seasonStartMonth: number;
};

type BetsApiCompetitionConfig = {
  names: string[];
  ids?: string[];
  countryCodes?: string[];
};

export type BasketballCompetition = {
  key: BasketballCompetitionKey;
  displayName: string;
  country: string;
  priority: number;
  supportsPreGame: boolean;
  supportsGoldList: boolean;
  supportsPlayerAnalysis: boolean;
  supportsLive: boolean;
  apiBasketball?: ApiBasketballCompetitionConfig;
  betsApi?: BetsApiCompetitionConfig;
};

export const BASKETBALL_COMPETITIONS: BasketballCompetition[] = [
  {
    key: "nba",
    displayName: "NBA",
    country: "Estados Unidos",
    priority: 1,
    supportsPreGame: true,
    supportsGoldList: true,
    supportsPlayerAnalysis: true,
    supportsLive: true,
    apiBasketball: {
      leagueId: 12,
      seasonStyle: "split-year",
      seasonStartMonth: 10,
    },
    betsApi: {
      names: ["NBA"],
      ids: ["2274"],
      countryCodes: ["us"],
    },
  },
  {
    key: "euroleague",
    displayName: "EuroLeague",
    country: "Europa",
    priority: 2,
    supportsPreGame: true,
    supportsGoldList: false,
    supportsPlayerAnalysis: false,
    supportsLive: false,
    apiBasketball: {
      leagueId: 120,
      seasonStyle: "year",
      seasonStartMonth: 10,
    },
    betsApi: {
      names: ["Euroleague"],
    },
  },
  {
    key: "eurocup",
    displayName: "EuroCup",
    country: "Europa",
    priority: 3,
    supportsPreGame: true,
    supportsGoldList: false,
    supportsPlayerAnalysis: false,
    supportsLive: false,
    apiBasketball: {
      leagueId: 194,
      seasonStyle: "year",
      seasonStartMonth: 10,
    },
    betsApi: {
      names: ["Eurocup"],
    },
  },
  {
    key: "acb",
    displayName: "Liga ACB",
    country: "Espanha",
    priority: 4,
    supportsPreGame: true,
    supportsGoldList: false,
    supportsPlayerAnalysis: false,
    supportsLive: false,
    apiBasketball: {
      leagueId: 117,
      seasonStyle: "split-year",
      seasonStartMonth: 9,
    },
    betsApi: {
      names: ["Spain ACB", "ACB"],
      countryCodes: ["es"],
    },
  },
  {
    key: "nbb",
    displayName: "NBB",
    country: "Brasil",
    priority: 5,
    supportsPreGame: true,
    supportsGoldList: false,
    supportsPlayerAnalysis: false,
    supportsLive: false,
    apiBasketball: {
      leagueId: 26,
      seasonStyle: "split-year",
      seasonStartMonth: 10,
    },
    betsApi: {
      names: ["Brazil NBB", "NBB"],
      ids: ["1534"],
      countryCodes: ["br"],
    },
  },
  {
    key: "lega-a",
    displayName: "Lega A",
    country: "Italia",
    priority: 6,
    supportsPreGame: true,
    supportsGoldList: false,
    supportsPlayerAnalysis: false,
    supportsLive: false,
    apiBasketball: {
      leagueId: 52,
      seasonStyle: "split-year",
      seasonStartMonth: 9,
    },
    betsApi: {
      names: ["Italy Lega A", "Lega A"],
      countryCodes: ["it"],
    },
  },
  {
    key: "bbl",
    displayName: "BBL Alemanha",
    country: "Alemanha",
    priority: 7,
    supportsPreGame: true,
    supportsGoldList: false,
    supportsPlayerAnalysis: false,
    supportsLive: false,
    apiBasketball: {
      leagueId: 40,
      seasonStyle: "split-year",
      seasonStartMonth: 9,
    },
    betsApi: {
      names: ["Germany BBL", "BBL"],
      countryCodes: ["de"],
    },
  },
  {
    key: "lnb-france",
    displayName: "LNB Franca",
    country: "Franca",
    priority: 8,
    supportsPreGame: true,
    supportsGoldList: false,
    supportsPlayerAnalysis: false,
    supportsLive: false,
    apiBasketball: {
      leagueId: 2,
      seasonStyle: "split-year",
      seasonStartMonth: 9,
    },
    betsApi: {
      names: ["France LNB", "LNB France"],
      countryCodes: ["fr"],
    },
  },
  {
    key: "super-ligi",
    displayName: "BSL Turquia",
    country: "Turquia",
    priority: 9,
    supportsPreGame: true,
    supportsGoldList: false,
    supportsPlayerAnalysis: false,
    supportsLive: false,
    apiBasketball: {
      leagueId: 104,
      seasonStyle: "split-year",
      seasonStartMonth: 9,
    },
    betsApi: {
      names: ["Turkey Super Ligi", "Super Ligi"],
      countryCodes: ["tr"],
    },
  },
  {
    key: "liga-a-argentina",
    displayName: "Liga Nacional Argentina",
    country: "Argentina",
    priority: 10,
    supportsPreGame: true,
    supportsGoldList: false,
    supportsPlayerAnalysis: false,
    supportsLive: false,
    apiBasketball: {
      leagueId: 18,
      seasonStyle: "split-year",
      seasonStartMonth: 9,
    },
    betsApi: {
      names: ["Argentina Liga Nacional", "Liga A"],
      ids: ["1304"],
      countryCodes: ["ar"],
    },
  },
];

const normalizeCompetitionText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const matchByName = (candidate: string, names: string[]): boolean => {
  const normalizedCandidate = normalizeCompetitionText(candidate);
  return names.some((name) => normalizeCompetitionText(name) === normalizedCandidate);
};

const getSeasonStartYear = (
  isoDate: string,
  seasonStartMonth: number
): number => {
  const [yearStr, monthStr] = isoDate.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return new Date(isoDate).getUTCFullYear();
  }

  return month >= seasonStartMonth ? year : year - 1;
};

export const getTrackedPreGameCompetitions = (): BasketballCompetition[] =>
  BASKETBALL_COMPETITIONS.filter((competition) => competition.supportsPreGame).sort(
    (left, right) => left.priority - right.priority
  );

export const getBasketballCompetitionByKey = (
  key: BasketballCompetitionKey
): BasketballCompetition | undefined =>
  BASKETBALL_COMPETITIONS.find((competition) => competition.key === key);

export const getBasketballCompetitionByApiBasketballLeagueId = (
  leagueId: number
): BasketballCompetition | undefined =>
  BASKETBALL_COMPETITIONS.find(
    (competition) => competition.apiBasketball?.leagueId === leagueId
  );

export const getBasketballCompetitionByBetsApiLeague = (
  leagueId: string | number | null | undefined,
  leagueName: string | null | undefined,
  countryCode?: string | null
): BasketballCompetition | undefined => {
  const normalizedLeagueId = String(leagueId || "").trim();
  const normalizedCountry = String(countryCode || "").trim().toLowerCase();

  return BASKETBALL_COMPETITIONS.find((competition) => {
    const config = competition.betsApi;
    if (!config) return false;

    if (normalizedLeagueId && config.ids?.includes(normalizedLeagueId)) {
      return true;
    }

    if (!leagueName || !matchByName(leagueName, config.names)) {
      return false;
    }

    if (!config.countryCodes?.length) {
      return true;
    }

    return config.countryCodes.includes(normalizedCountry);
  });
};

export const resolveApiBasketballSeason = (
  competition: BasketballCompetition,
  isoDate: string
): string | number => {
  if (!competition.apiBasketball) {
    throw new Error(`Liga sem configuração do API-Basketball: ${competition.key}`);
  }

  const startYear = getSeasonStartYear(
    isoDate,
    competition.apiBasketball.seasonStartMonth
  );

  if (competition.apiBasketball.seasonStyle === "year") {
    return startYear;
  }

  return `${startYear}-${startYear + 1}`;
};

export const decorateMatchCompetition = (
  match: NbaMatch,
  competition?: BasketballCompetition
): NbaMatch => {
  if (!competition) {
    return match;
  }

  return {
    ...match,
    league: competition.displayName,
    tournament: competition.displayName,
    gameName: competition.displayName,
    competitionKey: competition.key,
    competitionPriority: competition.priority,
    country: competition.country,
    supportsGoldList: competition.supportsGoldList,
    supportsPlayerAnalysis: competition.supportsPlayerAnalysis,
  };
};

export const isNbaMatch = (match: Pick<NbaMatch, "competitionKey" | "league">): boolean => {
  if (match.competitionKey) {
    return match.competitionKey === "nba";
  }

  return normalizeCompetitionText(match.league) === "nba";
};
