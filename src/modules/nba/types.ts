export type NbaDataSource = "feed" | "mock";

export type NbaMoneylineOdds = {
  home: number;
  away: number;
  draw?: number;
};

export type NbaMatch = {
  id: number;
  bet365Id?: string;
  league: string;
  country?: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  scheduledAt: string;
  tournament: string;
  status: string;
  gameName: string;
  competitionKey?: string;
  competitionPriority?: number;
  supportsGoldList?: boolean;
  supportsPlayerAnalysis?: boolean;
  homeTeamId?: number;
  awayTeamId?: number;
  odds: {
    moneyline: NbaMoneylineOdds;
  };
  source: NbaDataSource;
};

export type NbaMatchesResult = {
  matches: NbaMatch[];
  warnings: string[];
};

export type NbaTeamRecord = {
  wins: number;
  losses: number;
};

export type NbaRecentGame = {
  playedAt: string;
  opponentTeam: string;
  isHome: boolean;
  pointsFor: number;
  pointsAgainst: number;
  result: "W" | "L";
};

export type NbaTeamSeasonStats = {
  teamId: string;
  teamName: string;
  logoUrl: string;
  gamesPlayed: number;
  record: NbaTeamRecord;
  winRate: number;
  pointsFor: number;
  pointsAgainst: number;
  averagePointsFor: number;
  averagePointsAgainst: number;
  averageTotalPoints: number;
  pointDifferential: number;
  homeRecord: NbaTeamRecord;
  awayRecord: NbaTeamRecord;
  last10Record: NbaTeamRecord;
  last10Games: NbaRecentGame[];
  streak: {
    type: "W" | "L" | "N";
    count: number;
    label: string;
  };
  lastGameAt: string | null;
  restDays: number | null;
  rank: {
    overall: number;
    offense: number;
    defense: number;
  };
};

export type NbaSeasonSnapshot = {
  seasonLabel: string;
  seasonStart: string;
  seasonEnd: string;
  totalTeams: number;
  totalGames: number;
  averageGamesPerTeam: number;
  generatedAt: string;
  warnings: string[];
};

export type NbaTeamSeasonStatsResponse = {
  teams: NbaTeamSeasonStats[];
  snapshot: NbaSeasonSnapshot;
};

export type NbaPlayerRecentStatLine = {
  values: number[];
  average: number | null;
};

export type NbaPlayerAnalysisItem = {
  playerId: string;
  playerName: string;
  teamName: string;
  imageHint?: string;
  position?: string | null;
  shirtNumber?: string | null;
  dataLevel?: "full" | "roster_only";
  points: NbaPlayerRecentStatLine;
  rebounds: NbaPlayerRecentStatLine;
  assists: NbaPlayerRecentStatLine;
};

export type NbaPlayerAnalysisTeam = {
  teamName: string;
  logoUrl: string;
  players: NbaPlayerAnalysisItem[];
};

export type NbaPlayerAnalysisResponse = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  scheduledAt: string | null;
  source: NbaDataSource;
  generatedAt: string;
  detailLevel: "full" | "roster_only";
  note: string;
  warnings: string[];
  teams: NbaPlayerAnalysisTeam[];
};

export type NbaConfidenceLevel = "baixa" | "media" | "alta";

export type NbaOpportunitySignalKey =
  | "recent_form"
  | "team_role"
  | "consistency"
  | "game_environment"
  | "matchup_context"
  | "rest";

export type NbaOpportunitySignalDirection = "a_favor" | "neutro" | "contra";

export type NbaOpportunitySignal = {
  key: NbaOpportunitySignalKey;
  title: string;
  detail: string;
  impact: number;
  direction: NbaOpportunitySignalDirection;
};

export type NbaGoldListMarket = "points" | "rebounds" | "assists";

export type NbaGoldListTrend = "subindo" | "estavel" | "caindo";

export type NbaGoldListMatchupRating =
  | "muito_favoravel"
  | "favoravel"
  | "neutro"
  | "dificil";

export type NbaGoldListPick = {
  rank: number;
  market: NbaGoldListMarket;
  score: number;
  confidence: number;
  confidenceLevel: NbaConfidenceLevel;
  confidenceReason: string;
  player: {
    id: string;
    name: string;
    team: string;
    opponent: string;
    side: "home" | "away";
    imageHint?: string;
  };
  match: NbaMatch;
  recentValues: number[];
  recentAverage: number;
  lastThreeAverage: number;
  projection: number;
  trend: NbaGoldListTrend;
  matchupRating: NbaGoldListMatchupRating;
  teamContext: {
    restDays: number | null;
    teamRank: number | null;
    opponentDefenseRank: number | null;
    isHome: boolean;
  };
  summary: string;
  supportSignals: NbaOpportunitySignal[];
};

export type NbaGoldListSection = {
  market: NbaGoldListMarket;
  title: string;
  subtitle: string;
  picks: NbaGoldListPick[];
};

export type NbaGoldListResponse = {
  date: string;
  heroTitle: string;
  heroSubtitle: string;
  topPicks: NbaGoldListPick[];
  sections: NbaGoldListSection[];
  metadata: {
    totalMatches: number;
    analyzedMatches: number;
    totalPlayers: number;
    opportunitiesCount: number;
    lastUpdate: string;
    dataSource: string;
    warnings: string[];
  };
};
