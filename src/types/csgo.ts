export interface CsgoMatch {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  odds?: {
    moneyline?: {
      home: number;
      away: number;
      draw?: number;
    };
    spreads?: Array<{
      hdp: number;
      home: number;
      away: number;
    }>;
    totals?: Array<{
      points: number;
      over: number;
      under: number;
    }>;
  };
  stats?: {
    avgKillsPerMap?: number;
    avgMapsPerMatch?: number;
    avgRoundsPerMap?: number;
  };
  status?: string;
}

export interface TeamStats {
  teamId: string;
  teamName: string;
  totalMatches: number;
  avgMaps: number;
  avgKillsPerMap: number;
  avgRoundsPerMap: number;
  recentMatches: any[];
}

export interface MatchAnalysis {
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  insights: string[];
  predictions?: {
    expectedWinner: string;
    confidence: number;
    reasoning: string[];
  };
  pandascoreAnalysis?: {
    team1Stats: any;
    team2Stats: any;
  };
}
