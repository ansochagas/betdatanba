export type NbaDataSource = "api-basketball" | "betsapi" | "mock";

export type NbaMoneylineOdds = {
  home: number;
  away: number;
  draw?: number;
};

export type NbaMatch = {
  id: number;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  scheduledAt: string;
  tournament: string;
  status: string;
  gameName: "NBA";
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
  note: string;
  warnings: string[];
  teams: NbaPlayerAnalysisTeam[];
};

export type NbaConfidenceLevel = "baixa" | "media" | "alta";

export type NbaOpportunitySignalKey =
  | "recent_form"
  | "home_away_split"
  | "rest"
  | "odds_movement"
  | "efficiency_matchup"
  | "market_edge";

export type NbaOpportunitySignalDirection = "a_favor" | "neutro" | "contra";

export type NbaOpportunitySignal = {
  key: NbaOpportunitySignalKey;
  title: string;
  detail: string;
  impact: number;
  direction: NbaOpportunitySignalDirection;
};

export type NbaGoldListPick = {
  rank: number;
  score: number;
  confidence: number;
  confidenceLevel: NbaConfidenceLevel;
  confidenceReason: string;
  match: NbaMatch;
  recommendation: {
    market: "moneyline";
    side: "home" | "away";
    team: string;
    odds: number;
    impliedProbability: number;
    modelProbability: number;
    edge: number;
  };
  summary: string;
  supportSignals: NbaOpportunitySignal[];
};

export type NbaGoldListResponse = {
  date: string;
  picks: NbaGoldListPick[];
  metadata: {
    totalMatches: number;
    analyzedMatches: number;
    opportunitiesCount: number;
    lastUpdate: string;
    dataSource: string;
    warnings: string[];
  };
};
