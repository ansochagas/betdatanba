import { NbaMatch, NbaMoneylineOdds } from "@/modules/nba/types";

type GoldListOpportunity = {
  rank: number;
  match: {
    id: number;
    homeTeam: string;
    awayTeam: string;
    tournament: string;
    scheduledAt: string;
  };
  expectedValue: number;
  confidence: number;
  reasoning: string;
  tip?: string;
  deltaFromLine?: number;
  analysis: {
    team1Stats: { stats: { totalMatches: number } };
    team2Stats: { stats: { totalMatches: number } };
  };
};

type GoldListResponse = {
  date: string;
  categories: {
    overKills: GoldListOpportunity[];
    overRounds: GoldListOpportunity[];
    moneyline: GoldListOpportunity[];
  };
  metadata: {
    totalMatches: number;
    analyzedMatches: number;
    lastUpdate: string;
    dataSource: string;
  };
};

const TEAM_IDS: Record<string, number> = {
  "Boston Celtics": 1,
  "Milwaukee Bucks": 2,
  "Miami Heat": 3,
  "New York Knicks": 4,
  "Brooklyn Nets": 5,
  "Philadelphia 76ers": 6,
  "Cleveland Cavaliers": 7,
  "Chicago Bulls": 8,
  "Los Angeles Lakers": 9,
  "Golden State Warriors": 10,
  "Phoenix Suns": 11,
  "Denver Nuggets": 12,
  "Dallas Mavericks": 13,
  "LA Clippers": 14,
  "Sacramento Kings": 15,
};

const FIXTURES = [
  { home: "Boston Celtics", away: "Miami Heat", day: 0, utcHour: 23 },
  { home: "New York Knicks", away: "Brooklyn Nets", day: 0, utcHour: 1 },
  { home: "Milwaukee Bucks", away: "Chicago Bulls", day: 1, utcHour: 0 },
  { home: "Los Angeles Lakers", away: "Golden State Warriors", day: 1, utcHour: 3 },
  { home: "Denver Nuggets", away: "Phoenix Suns", day: 2, utcHour: 2 },
  { home: "Dallas Mavericks", away: "LA Clippers", day: 2, utcHour: 4 },
  { home: "Philadelphia 76ers", away: "Cleveland Cavaliers", day: 2, utcHour: 23 },
  { home: "Sacramento Kings", away: "Miami Heat", day: 3, utcHour: 1 },
];

const buildScheduledAt = (offsetDays: number, utcHour: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  date.setUTCHours(utcHour, 0, 0, 0);
  return date.toISOString();
};

const randomOdds = (seed: number): NbaMoneylineOdds => {
  const base = 1.6 + (seed % 5) * 0.12;
  return {
    home: Number(base.toFixed(2)),
    away: Number((2.6 - (seed % 4) * 0.15).toFixed(2)),
  };
};

export const getMockNbaMatches = (days: number = 2): NbaMatch[] => {
  const safeDays = Number.isFinite(days) ? Math.max(0, Math.min(days, 7)) : 2;

  return FIXTURES.filter((fixture) => fixture.day <= safeDays).map(
    (fixture, index) => ({
      id: 9000 + index,
      league: "NBA",
      homeTeam: fixture.home,
      awayTeam: fixture.away,
      scheduledAt: buildScheduledAt(fixture.day, fixture.utcHour),
      tournament: "Temporada Regular",
      status: "not_started",
      gameName: "NBA",
      odds: {
        moneyline: randomOdds(index),
      },
      homeTeamId: TEAM_IDS[fixture.home],
      awayTeamId: TEAM_IDS[fixture.away],
      source: "mock",
    })
  );
};

const mockTeamStats = (totalMatches: number) => ({
  stats: { totalMatches },
});

export const getMockNbaGoldList = (): GoldListResponse => {
  const matches = getMockNbaMatches(1);
  const now = new Date();
  const dateString = now.toISOString().split("T")[0];

  const overPoints: GoldListOpportunity[] = matches.slice(0, 2).map((match, i) => ({
    rank: i + 1,
    match: {
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      tournament: match.tournament,
      scheduledAt: match.scheduledAt,
    },
    expectedValue: 224 + i * 6,
    confidence: 0.72 - i * 0.05,
    reasoning: "Projeção alta de pontos com ritmo acelerado.",
    tip: "Over pontos",
    deltaFromLine: 4.5 - i * 1.2,
    analysis: {
      team1Stats: mockTeamStats(12 + i * 2),
      team2Stats: mockTeamStats(12 + i * 2),
    },
  }));

  const spreads: GoldListOpportunity[] = matches.slice(1, 3).map((match, i) => ({
    rank: i + 1,
    match: {
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      tournament: match.tournament,
      scheduledAt: match.scheduledAt,
    },
    expectedValue: 6.5 + i,
    confidence: 0.66 - i * 0.06,
    reasoning: "Favorito com vantagem consistente em casa.",
    tip: "Handicap casa",
    deltaFromLine: 1.5,
    analysis: {
      team1Stats: mockTeamStats(10 + i * 3),
      team2Stats: mockTeamStats(10 + i * 3),
    },
  }));

  const moneyline: GoldListOpportunity[] = matches.slice(0, 2).map((match, i) => ({
    rank: i + 1,
    match: {
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      tournament: match.tournament,
      scheduledAt: match.scheduledAt,
    },
    expectedValue: 0,
    confidence: 0.78 - i * 0.08,
    reasoning: "Time com melhor forma recente e mando forte.",
    tip: "Vitória simples",
    analysis: {
      team1Stats: mockTeamStats(14 + i * 2),
      team2Stats: mockTeamStats(14 + i * 2),
    },
  }));

  return {
    date: dateString,
    categories: {
      overKills: overPoints,
      overRounds: spreads,
      moneyline,
    },
    metadata: {
      totalMatches: matches.length,
      analyzedMatches: matches.length,
      lastUpdate: now.toISOString(),
      dataSource: "Mock NBA",
    },
  };
};
