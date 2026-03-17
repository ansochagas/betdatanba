import { fetchNbaEndedGamesFromBetsApi, NbaEndedGame } from "@/modules/nba/adapters/betsapi/client";
import {
  NbaSeasonSnapshot,
  NbaTeamRecord,
  NbaTeamSeasonStats,
  NbaTeamSeasonStatsResponse,
} from "@/modules/nba/types";
import { getNbaTeamIdentity } from "@/modules/nba/logos";

type NbaSeasonRange = {
  seasonLabel: string;
  seasonStart: Date;
  seasonEnd: Date;
  daysBack: number;
};

type TeamGameRecord = {
  playedAt: Date;
  opponentTeam: string;
  pointsFor: number;
  pointsAgainst: number;
  isHome: boolean;
  win: boolean;
};

type TeamAccumulator = {
  teamId: string;
  teamName: string;
  games: TeamGameRecord[];
  pointsFor: number;
  pointsAgainst: number;
  wins: number;
  losses: number;
  homeWins: number;
  homeLosses: number;
  awayWins: number;
  awayLosses: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const toInt = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const toSafeTeamId = (teamId: unknown, teamName: string): string => {
  const raw = toInt(teamId);
  if (raw !== null) return String(raw);

  const normalized = teamName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalized || "team-unknown";
};

const buildRecord = (wins: number, losses: number): NbaTeamRecord => {
  return { wins, losses };
};

const getSeasonStartMonth = (): number => {
  const raw = Number(process.env.NBA_SEASON_START_MONTH || "10");
  if (!Number.isFinite(raw)) return 10;
  return clamp(Math.trunc(raw), 1, 12);
};

const getSeasonMaxDaysBack = (): number => {
  const raw = Number(process.env.NBA_SEASON_MAX_DAYS_BACK || "21");
  if (!Number.isFinite(raw)) return 21;
  return clamp(Math.trunc(raw), 7, 365);
};

export const getCurrentNbaSeasonRange = (referenceDate: Date = new Date()): NbaSeasonRange => {
  const currentYear = referenceDate.getUTCFullYear();
  const currentMonth = referenceDate.getUTCMonth() + 1;
  const startMonth = getSeasonStartMonth();

  const startYear = currentMonth >= startMonth ? currentYear : currentYear - 1;
  const endYear = startYear + 1;
  const seasonStart = new Date(Date.UTC(startYear, startMonth - 1, 1, 0, 0, 0));
  const seasonEnd = referenceDate;
  const rawDaysBack = Math.ceil((seasonEnd.getTime() - seasonStart.getTime()) / DAY_MS) + 1;
  const daysBack = clamp(rawDaysBack, 1, getSeasonMaxDaysBack());
  const seasonLabel = `${startYear}-${String(endYear).slice(-2)}`;

  return {
    seasonLabel,
    seasonStart,
    seasonEnd,
    daysBack,
  };
};

const isInsideSeason = (gameDate: Date, range: NbaSeasonRange): boolean => {
  return gameDate.getTime() >= range.seasonStart.getTime() && gameDate.getTime() <= range.seasonEnd.getTime();
};

const calculateStreak = (games: TeamGameRecord[]): NbaTeamSeasonStats["streak"] => {
  if (games.length === 0) {
    return { type: "N", count: 0, label: "N0" };
  }

  const sorted = [...games].sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
  const firstWin = sorted[0].win;
  let count = 0;

  for (const game of sorted) {
    if (game.win === firstWin) {
      count += 1;
      continue;
    }
    break;
  }

  return {
    type: firstWin ? "W" : "L",
    count,
    label: `${firstWin ? "W" : "L"}${count}`,
  };
};

const createEmptyAccumulator = (teamId: string, teamName: string): TeamAccumulator => ({
  teamId,
  teamName,
  games: [],
  pointsFor: 0,
  pointsAgainst: 0,
  wins: 0,
  losses: 0,
  homeWins: 0,
  homeLosses: 0,
  awayWins: 0,
  awayLosses: 0,
});

const attachGameToTeam = (
  store: Map<string, TeamAccumulator>,
  teamId: string,
  teamName: string,
  game: TeamGameRecord
): void => {
  const current = store.get(teamId) || createEmptyAccumulator(teamId, teamName);
  current.teamName = teamName;
  current.games.push(game);
  current.pointsFor += game.pointsFor;
  current.pointsAgainst += game.pointsAgainst;

  if (game.win) {
    current.wins += 1;
    if (game.isHome) current.homeWins += 1;
    else current.awayWins += 1;
  } else {
    current.losses += 1;
    if (game.isHome) current.homeLosses += 1;
    else current.awayLosses += 1;
  }

  store.set(teamId, current);
};

const safeAverage = (total: number, count: number): number => {
  if (count <= 0) return 0;
  return Number((total / count).toFixed(1));
};

const buildTeamStats = (
  accumulator: TeamAccumulator,
  now: Date
): Omit<NbaTeamSeasonStats, "rank"> => {
  const gamesPlayed = accumulator.games.length;
  const sorted = [...accumulator.games].sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
  const last10 = sorted.slice(0, 10);
  const last10Wins = last10.filter((game) => game.win).length;
  const last10Losses = last10.length - last10Wins;
  const lastGameAt = sorted[0]?.playedAt ?? null;

  const restDays =
    lastGameAt === null ? null : Math.max(0, Math.floor((now.getTime() - lastGameAt.getTime()) / DAY_MS));

  const identity = getNbaTeamIdentity(accumulator.teamName);
  const pointDifferential = safeAverage(
    accumulator.pointsFor - accumulator.pointsAgainst,
    gamesPlayed
  );

  return {
    teamId: accumulator.teamId,
    teamName: identity.canonicalName,
    logoUrl: identity.logoUrl,
    gamesPlayed,
    record: buildRecord(accumulator.wins, accumulator.losses),
    winRate: gamesPlayed > 0 ? Number((accumulator.wins / gamesPlayed).toFixed(3)) : 0,
    pointsFor: accumulator.pointsFor,
    pointsAgainst: accumulator.pointsAgainst,
    averagePointsFor: safeAverage(accumulator.pointsFor, gamesPlayed),
    averagePointsAgainst: safeAverage(accumulator.pointsAgainst, gamesPlayed),
    averageTotalPoints: safeAverage(accumulator.pointsFor + accumulator.pointsAgainst, gamesPlayed),
    pointDifferential,
    homeRecord: buildRecord(accumulator.homeWins, accumulator.homeLosses),
    awayRecord: buildRecord(accumulator.awayWins, accumulator.awayLosses),
    last10Record: buildRecord(last10Wins, last10Losses),
    last10Games: last10.map((game) => ({
      playedAt: game.playedAt.toISOString(),
      opponentTeam: game.opponentTeam,
      isHome: game.isHome,
      pointsFor: game.pointsFor,
      pointsAgainst: game.pointsAgainst,
      result: game.win ? "W" : "L",
    })),
    streak: calculateStreak(sorted),
    lastGameAt: lastGameAt ? lastGameAt.toISOString() : null,
    restDays,
  };
};

const attachRankings = (teams: Omit<NbaTeamSeasonStats, "rank">[]): NbaTeamSeasonStats[] => {
  const rankByOverall = new Map<string, number>();
  const rankByOffense = new Map<string, number>();
  const rankByDefense = new Map<string, number>();

  [...teams]
    .sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.pointDifferential !== a.pointDifferential) return b.pointDifferential - a.pointDifferential;
      return b.gamesPlayed - a.gamesPlayed;
    })
    .forEach((team, index) => {
      rankByOverall.set(team.teamId, index + 1);
    });

  [...teams]
    .sort((a, b) => b.averagePointsFor - a.averagePointsFor)
    .forEach((team, index) => {
      rankByOffense.set(team.teamId, index + 1);
    });

  [...teams]
    .sort((a, b) => a.averagePointsAgainst - b.averagePointsAgainst)
    .forEach((team, index) => {
      rankByDefense.set(team.teamId, index + 1);
    });

  return teams
    .map((team) => ({
      ...team,
      rank: {
        overall: rankByOverall.get(team.teamId) ?? 0,
        offense: rankByOffense.get(team.teamId) ?? 0,
        defense: rankByDefense.get(team.teamId) ?? 0,
      },
    }))
    .sort((a, b) => a.rank.overall - b.rank.overall);
};

const buildSnapshot = (
  range: NbaSeasonRange,
  teams: NbaTeamSeasonStats[],
  totalGames: number,
  averageGamesPerTeam: number,
  warnings: string[]
): NbaSeasonSnapshot => {
  return {
    seasonLabel: range.seasonLabel,
    seasonStart: range.seasonStart.toISOString(),
    seasonEnd: range.seasonEnd.toISOString(),
    totalTeams: teams.length,
    totalGames,
    averageGamesPerTeam: Number(averageGamesPerTeam.toFixed(1)),
    generatedAt: new Date().toISOString(),
    warnings,
  };
};

export const buildNbaTeamSeasonStats = (
  endedGames: NbaEndedGame[],
  range: NbaSeasonRange,
  now: Date = new Date()
): NbaTeamSeasonStatsResponse => {
  const warnings: string[] = [];
  const accumulator = new Map<string, TeamAccumulator>();

  const seasonGames = endedGames.filter((game) => {
    const gameDate = new Date(game.scheduledAt);
    if (!isInsideSeason(gameDate, range)) return false;
    if (game.score.home === null || game.score.away === null) return false;
    return true;
  });

  for (const game of seasonGames) {
    const gameDate = new Date(game.scheduledAt);
    const homeTeamName = game.homeTeam;
    const awayTeamName = game.awayTeam;
    const homeTeamId = toSafeTeamId(game.raw?.home?.id, homeTeamName);
    const awayTeamId = toSafeTeamId(game.raw?.away?.id, awayTeamName);

    const homePoints = game.score.home ?? 0;
    const awayPoints = game.score.away ?? 0;

    attachGameToTeam(accumulator, homeTeamId, homeTeamName, {
      playedAt: gameDate,
      opponentTeam: awayTeamName,
      pointsFor: homePoints,
      pointsAgainst: awayPoints,
      isHome: true,
      win: homePoints > awayPoints,
    });

    attachGameToTeam(accumulator, awayTeamId, awayTeamName, {
      playedAt: gameDate,
      opponentTeam: homeTeamName,
      pointsFor: awayPoints,
      pointsAgainst: homePoints,
      isHome: false,
      win: awayPoints > homePoints,
    });
  }

  const teamsWithoutRank = Array.from(accumulator.values())
    .map((team) => buildTeamStats(team, now))
    .filter((team) => team.gamesPlayed > 0);

  const teams = attachRankings(teamsWithoutRank);
  const averageGamesPerTeam = teams.length > 0 ? (seasonGames.length * 2) / teams.length : 0;

  if (seasonGames.length === 0) {
    warnings.push("Nao houve jogos finalizados retornados para a temporada atual.");
  }

  if (teams.length < 30) {
    warnings.push("Cobertura parcial de times. Verifique limites do plano da API.");
  }

  if (averageGamesPerTeam < 50) {
    warnings.push(
      "Historico retornado esta abaixo do esperado para a temporada. Valide cobertura de dias no plano da API."
    );
  }

  return {
    teams,
    snapshot: buildSnapshot(range, teams, seasonGames.length, averageGamesPerTeam, warnings),
  };
};

export const fetchNbaCurrentSeasonTeamStatsFromBetsApi = async (): Promise<NbaTeamSeasonStatsResponse> => {
  const range = getCurrentNbaSeasonRange(new Date());
  const endedGames = await fetchNbaEndedGamesFromBetsApi(range.daysBack);
  return buildNbaTeamSeasonStats(endedGames, range, new Date());
};
