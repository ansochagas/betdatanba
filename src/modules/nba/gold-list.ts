import { getNbaTeamIdentity } from "@/modules/nba/logos";
import {
  NbaConfidenceLevel,
  NbaGoldListMarket,
  NbaGoldListMatchupRating,
  NbaGoldListPick,
  NbaGoldListResponse,
  NbaGoldListSection,
  NbaGoldListTrend,
  NbaMatch,
  NbaOpportunitySignal,
  NbaPlayerAnalysisItem,
  NbaPlayerAnalysisResponse,
  NbaTeamSeasonStats,
} from "@/modules/nba/types";

type BuildNbaGoldListOptions = {
  dataSource: string;
  warnings?: string[];
  maxPicksPerMarket?: number;
  topPicksCount?: number;
  teamStats?: NbaTeamSeasonStats[];
  playerAnalyses?: Array<{
    match: NbaMatch;
    analysis: NbaPlayerAnalysisResponse;
  }>;
};

type Side = "home" | "away";

type LeagueContext = {
  averagePointsFor: number;
  averagePointsAgainst: number;
  averageTotalPoints: number;
};

type TeamContext = {
  team: string;
  side: Side;
  restDays: number | null;
  overallRank: number | null;
  defenseRank: number | null;
  averagePointsFor: number | null;
  averagePointsAgainst: number | null;
  averageTotalPoints: number | null;
  pointDifferential: number | null;
};

type RawCandidate = {
  key: string;
  market: NbaGoldListMarket;
  playerId: string;
  playerName: string;
  teamName: string;
  opponentName: string;
  side: Side;
  imageHint?: string;
  match: NbaMatch;
  recentValues: number[];
  recentAverage: number;
  lastThreeAverage: number;
  trendDelta: number;
  trendLabel: NbaGoldListTrend;
  teamRoleScore: number;
  teamRoleRank: number;
  teamPlayerCount: number;
  consistencyScore: number;
  matchupScore: number;
  matchupRating: NbaGoldListMatchupRating;
  gameEnvironmentScore: number;
  projectedGameTotal: number;
  restDays: number | null;
  restScore: number;
  isHome: boolean;
  homeScore: number;
  projection: number;
  ownTeamContext: TeamContext;
  opponentTeamContext: TeamContext;
};

type MarketRule = {
  title: string;
  subtitle: string;
  label: string;
  minAverage: number;
  weights: {
    recent: number;
    trend: number;
    role: number;
    consistency: number;
    matchup: number;
    rest: number;
    home: number;
  };
};

const MAX_PICKS_PER_MARKET = 5;
const TOP_PICKS_COUNT = 6;
const TODAY_HERO_TITLE = "Melhores do Dia";
const TODAY_HERO_SUBTITLE =
  "Leitura objetiva dos jogos de hoje para apontar os nomes mais fortes em pontos, rebotes e assistências.";

const MARKET_RULES: Record<NbaGoldListMarket, MarketRule> = {
  points: {
    title: "Melhor Média de Pontos do Dia",
    subtitle: "Quem chega com melhor contexto ofensivo para o mercado de pontos.",
    label: "pontos",
    minAverage: 12,
    weights: {
      recent: 0.34,
      trend: 0.16,
      role: 0.18,
      consistency: 0.14,
      matchup: 0.1,
      rest: 0.05,
      home: 0.03,
    },
  },
  rebounds: {
    title: "Melhor Média de Rebotes do Dia",
    subtitle: "Nomes com volume recente e ambiente forte para rebotes hoje.",
    label: "rebotes",
    minAverage: 5,
    weights: {
      recent: 0.3,
      trend: 0.14,
      role: 0.22,
      consistency: 0.16,
      matchup: 0.09,
      rest: 0.06,
      home: 0.03,
    },
  },
  assists: {
    title: "Melhor Média de Assistências do Dia",
    subtitle: "Jogadores com melhor leitura de criação para os jogos de hoje.",
    label: "assistencias",
    minAverage: 4,
    weights: {
      recent: 0.31,
      trend: 0.17,
      role: 0.22,
      consistency: 0.13,
      matchup: 0.1,
      rest: 0.05,
      home: 0.02,
    },
  },
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const average = (values: number[]): number => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const roundToOne = (value: number): number => Number(value.toFixed(1));

const normalizeTeam = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const formatDateInBrt = (date: Date): string => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const computeStdDev = (values: number[]): number => {
  if (values.length <= 1) return 0;
  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const toTrendLabel = (
  market: NbaGoldListMarket,
  delta: number
): NbaGoldListTrend => {
  const threshold = market === "points" ? 1.4 : 0.9;
  if (delta >= threshold) return "subindo";
  if (delta <= -threshold) return "caindo";
  return "estavel";
};

const toMatchupRating = (value: number): NbaGoldListMatchupRating => {
  if (value >= 0.45) return "muito_favoravel";
  if (value >= 0.15) return "favoravel";
  if (value <= -0.2) return "dificil";
  return "neutro";
};

const getConfidenceLevel = (value: number): NbaConfidenceLevel => {
  if (value >= 0.79) return "alta";
  if (value >= 0.63) return "media";
  return "baixa";
};

const toSignalDirection = (value: number): NbaOpportunitySignal["direction"] => {
  if (value > 0.12) return "a_favor";
  if (value < -0.12) return "contra";
  return "neutro";
};

const buildStatsIndex = (
  teamStats: NbaTeamSeasonStats[]
): Map<string, NbaTeamSeasonStats> => {
  const index = new Map<string, NbaTeamSeasonStats>();

  for (const team of teamStats) {
    const identity = getNbaTeamIdentity(team.teamName);
    index.set(normalizeTeam(team.teamName), team);
    index.set(normalizeTeam(identity.canonicalName), team);
  }

  return index;
};

const resolveTeamStats = (
  teamName: string,
  index: Map<string, NbaTeamSeasonStats>
): NbaTeamSeasonStats | null => {
  const direct = index.get(normalizeTeam(teamName));
  if (direct) return direct;

  const identity = getNbaTeamIdentity(teamName);
  const canonical = index.get(normalizeTeam(identity.canonicalName));
  if (canonical) return canonical;

  const target = normalizeTeam(teamName);
  for (const [key, value] of index.entries()) {
    if (key.includes(target) || target.includes(key)) {
      return value;
    }
  }

  return null;
};

const buildLeagueContext = (teamStats: NbaTeamSeasonStats[]): LeagueContext => {
  if (!teamStats.length) {
    return {
      averagePointsFor: 112,
      averagePointsAgainst: 112,
      averageTotalPoints: 224,
    };
  }

  return {
    averagePointsFor: average(teamStats.map((team) => team.averagePointsFor)),
    averagePointsAgainst: average(teamStats.map((team) => team.averagePointsAgainst)),
    averageTotalPoints: average(teamStats.map((team) => team.averageTotalPoints)),
  };
};

const buildTeamContext = (
  teamName: string,
  side: Side,
  statsIndex: Map<string, NbaTeamSeasonStats>
): TeamContext => {
  const stats = resolveTeamStats(teamName, statsIndex);

  return {
    team: teamName,
    side,
    restDays: stats?.restDays ?? null,
    overallRank: stats?.rank.overall ?? null,
    defenseRank: stats?.rank.defense ?? null,
    averagePointsFor: stats?.averagePointsFor ?? null,
    averagePointsAgainst: stats?.averagePointsAgainst ?? null,
    averageTotalPoints: stats?.averageTotalPoints ?? null,
    pointDifferential: stats?.pointDifferential ?? null,
  };
};

const inferSide = (teamName: string, match: NbaMatch): Side => {
  const target = normalizeTeam(teamName);
  const homeKeys = [
    normalizeTeam(match.homeTeam),
    normalizeTeam(getNbaTeamIdentity(match.homeTeam).canonicalName),
  ];
  const awayKeys = [
    normalizeTeam(match.awayTeam),
    normalizeTeam(getNbaTeamIdentity(match.awayTeam).canonicalName),
  ];

  if (homeKeys.some((key) => key === target || key.includes(target) || target.includes(key))) {
    return "home";
  }

  if (awayKeys.some((key) => key === target || key.includes(target) || target.includes(key))) {
    return "away";
  }

  return "away";
};

const toRestScore = (restDays: number | null): number => {
  if (restDays === null || restDays === undefined) return 0.5;
  return clamp(0.35 + restDays * 0.18, 0.35, 1);
};

const buildGameEnvironmentScore = (
  market: NbaGoldListMarket,
  projectedTotal: number,
  pointDifferentialGap: number,
  league: LeagueContext
): number => {
  const totalScore = clamp(
    (projectedTotal - league.averageTotalPoints) / 22,
    -1,
    1
  );
  const closeGameScore = clamp(1 - Math.abs(pointDifferentialGap) / 12, 0, 1);
  const closeGameNormalized = closeGameScore * 2 - 1;

  if (market === "rebounds") {
    return totalScore * 0.65 + closeGameNormalized * 0.35;
  }

  if (market === "assists") {
    return totalScore * 0.55 + closeGameNormalized * 0.2;
  }

  return totalScore * 0.6 + closeGameNormalized * 0.15;
};

const buildMatchupScore = (
  market: NbaGoldListMarket,
  ownTeam: TeamContext,
  opponent: TeamContext,
  projectedTotal: number,
  pointDifferentialGap: number,
  league: LeagueContext
): number => {
  const offenseScore = clamp(
    ((ownTeam.averagePointsFor ?? league.averagePointsFor) - league.averagePointsFor) / 12,
    -1,
    1
  );
  const defenseAllowanceScore = clamp(
    ((opponent.averagePointsAgainst ?? league.averagePointsAgainst) -
      league.averagePointsAgainst) /
      12,
    -1,
    1
  );
  const defenseRankScore = opponent.defenseRank
    ? clamp((opponent.defenseRank - 15) / 15, -1, 1)
    : 0;
  const environmentScore = buildGameEnvironmentScore(
    market,
    projectedTotal,
    pointDifferentialGap,
    league
  );

  if (market === "points") {
    return (
      defenseAllowanceScore * 0.42 +
      defenseRankScore * 0.23 +
      offenseScore * 0.2 +
      environmentScore * 0.15
    );
  }

  if (market === "assists") {
    return (
      offenseScore * 0.35 +
      defenseAllowanceScore * 0.28 +
      defenseRankScore * 0.15 +
      environmentScore * 0.22
    );
  }

  return environmentScore * 0.7 + defenseRankScore * 0.15 + offenseScore * 0.15;
};

const buildProjection = (
  market: NbaGoldListMarket,
  recentAverage: number,
  trendDelta: number,
  matchupScore: number,
  isHome: boolean,
  restScore: number
): number => {
  const homeBoost = isHome ? (market === "points" ? 0.7 : 0.35) : 0;
  const restBoost = (restScore - 0.5) * (market === "points" ? 1.4 : 1);

  if (market === "points") {
    return recentAverage + trendDelta * 0.7 + matchupScore * 3.4 + homeBoost + restBoost;
  }

  if (market === "assists") {
    return recentAverage + trendDelta * 0.65 + matchupScore * 2.1 + homeBoost + restBoost;
  }

  return recentAverage + trendDelta * 0.55 + matchupScore * 1.6 + homeBoost + restBoost;
};

const createTeamRoleScore = (
  players: NbaPlayerAnalysisItem[],
  playerId: string,
  market: NbaGoldListMarket
): { score: number; rank: number; total: number } => {
  const sorted = [...players]
    .filter((item) => (item[market].average ?? 0) > 0)
    .sort((left, right) => (right[market].average ?? 0) - (left[market].average ?? 0));

  const position = sorted.findIndex((item) => item.playerId === playerId);
  if (position === -1) {
    return { score: 0.4, rank: players.length, total: players.length };
  }

  if (sorted.length === 1) {
    return { score: 1, rank: 1, total: 1 };
  }

  return {
    score: 1 - position / (sorted.length - 1),
    rank: position + 1,
    total: sorted.length,
  };
};

const buildRawCandidates = (
  matches: NbaMatch[],
  playerAnalyses: Array<{ match: NbaMatch; analysis: NbaPlayerAnalysisResponse }>,
  teamStats: NbaTeamSeasonStats[]
): RawCandidate[] => {
  const statsIndex = buildStatsIndex(teamStats);
  const league = buildLeagueContext(teamStats);
  const candidates: RawCandidate[] = [];

  for (const { match, analysis } of playerAnalyses) {
    const homeContext = buildTeamContext(match.homeTeam, "home", statsIndex);
    const awayContext = buildTeamContext(match.awayTeam, "away", statsIndex);
    const projectedGameTotal =
      average(
        [homeContext.averageTotalPoints, awayContext.averageTotalPoints].filter(
          (value): value is number => typeof value === "number"
        )
      ) || league.averageTotalPoints;
    const pointDifferentialGap =
      (homeContext.pointDifferential ?? 0) - (awayContext.pointDifferential ?? 0);

    for (const team of analysis.teams) {
      for (const player of team.players) {
        const side = inferSide(player.teamName, match);
        const ownContext = side === "home" ? homeContext : awayContext;
        const opponentContext = side === "home" ? awayContext : homeContext;
        const isHome = side === "home";
        const restScore = toRestScore(ownContext.restDays);
        const homeScore = isHome ? 1 : 0.45;

        (Object.keys(MARKET_RULES) as NbaGoldListMarket[]).forEach((market) => {
          const values = player[market].values.filter((value) => Number.isFinite(value));
          if (values.length < 3) return;

          const recentAverage = player[market].average ?? average(values);
          if (recentAverage < MARKET_RULES[market].minAverage) return;

          const lastThreeAverage = average(values.slice(0, 3));
          const trendDelta = lastThreeAverage - recentAverage;
          const trendLabel = toTrendLabel(market, trendDelta);
          const consistencyScore = clamp(
            1 - computeStdDev(values) / Math.max(recentAverage, 1),
            0,
            1
          );
          const teamRole = createTeamRoleScore(team.players, player.playerId, market);
          if (teamRole.rank > Math.min(teamRole.total, 5)) return;

          const matchupScore = buildMatchupScore(
            market,
            ownContext,
            opponentContext,
            projectedGameTotal,
            pointDifferentialGap,
            league
          );
          const projection = buildProjection(
            market,
            recentAverage,
            trendDelta,
            matchupScore,
            isHome,
            restScore
          );

          candidates.push({
            key: `${match.id}:${player.playerId}:${market}`,
            market,
            playerId: player.playerId,
            playerName: player.playerName,
            teamName: player.teamName,
            opponentName: opponentContext.team,
            side,
            imageHint: player.imageHint,
            match,
            recentValues: values,
            recentAverage,
            lastThreeAverage,
            trendDelta,
            trendLabel,
            teamRoleScore: teamRole.score,
            teamRoleRank: teamRole.rank,
            teamPlayerCount: teamRole.total,
            consistencyScore,
            matchupScore,
            matchupRating: toMatchupRating(matchupScore),
            gameEnvironmentScore: buildGameEnvironmentScore(
              market,
              projectedGameTotal,
              pointDifferentialGap,
              league
            ),
            projectedGameTotal,
            restDays: ownContext.restDays,
            restScore,
            isHome,
            homeScore,
            projection: Math.max(0, projection),
            ownTeamContext: ownContext,
            opponentTeamContext: opponentContext,
          });
        });
      }
    }
  }

  return candidates;
};

const createRangeIndex = (candidates: RawCandidate[]) => {
  const entries = new Map<
    NbaGoldListMarket,
    {
      minRecent: number;
      maxRecent: number;
      minTrend: number;
      maxTrend: number;
    }
  >();

  (Object.keys(MARKET_RULES) as NbaGoldListMarket[]).forEach((market) => {
    const marketCandidates = candidates.filter((candidate) => candidate.market === market);
    const recentValues = marketCandidates.map((candidate) => candidate.recentAverage);
    const trendValues = marketCandidates.map((candidate) => candidate.trendDelta);

    entries.set(market, {
      minRecent: recentValues.length ? Math.min(...recentValues) : 0,
      maxRecent: recentValues.length ? Math.max(...recentValues) : 1,
      minTrend: trendValues.length ? Math.min(...trendValues) : -1,
      maxTrend: trendValues.length ? Math.max(...trendValues) : 1,
    });
  });

  return entries;
};

const normalizeRange = (value: number, min: number, max: number): number => {
  if (max <= min) return 0.5;
  return clamp((value - min) / (max - min), 0, 1);
};

const buildConfidenceReason = (pick: RawCandidate, confidenceLevel: NbaConfidenceLevel): string => {
  if (confidenceLevel === "alta") {
    return `${pick.playerName} chega com papel forte no time, tendência ${pick.trendLabel} e leitura favoravel de confronto.`;
  }

  if (confidenceLevel === "media") {
    return `${pick.playerName} tem base recente consistente e contexto útil para o mercado de ${MARKET_RULES[pick.market].label}.`;
  }

  return `${pick.playerName} entra como nome de apoio para hoje, mas com leitura mais sensível ? variação do jogo.`;
};

const buildSupportSignals = (pick: RawCandidate): NbaOpportunitySignal[] => {
  const hitCount = pick.recentValues.filter((value) => value >= pick.recentAverage * 0.85).length;
  const matchupLabel =
    pick.matchupRating === "muito_favoravel"
      ? "muito favorável"
      : pick.matchupRating === "favoravel"
        ? "favoravel"
        : pick.matchupRating === "dificil"
          ? "mais duro"
          : "equilibrado";

  const signals: NbaOpportunitySignal[] = [
    {
      key: "recent_form",
      title: "Forma recente",
      detail: `${pick.playerName} vem de ${roundToOne(pick.recentAverage)} de média nos últimos 5 jogos e ${roundToOne(pick.lastThreeAverage)} nos últimos 3.`,
      impact: clamp(0.4 + Math.abs(pick.trendDelta) / 4, 0, 1),
      direction: toSignalDirection(pick.trendDelta / 2),
    },
    {
      key: "team_role",
      title: "Papel no time",
      detail: `${pick.playerName} aparece em ${pick.teamRoleRank} de ${pick.teamPlayerCount} no próprio time para ${MARKET_RULES[pick.market].label}.`,
      impact: pick.teamRoleScore,
      direction: toSignalDirection(pick.teamRoleScore - 0.5),
    },
    {
      key: "consistency",
      title: "Consistencia",
      detail: `Bateu pelo menos 85% da média em ${hitCount} dos últimos ${pick.recentValues.length} jogos analisados.`,
      impact: pick.consistencyScore,
      direction: toSignalDirection(pick.consistencyScore - 0.55),
    },
    {
      key: "game_environment",
      title: "Ambiente do jogo",
      detail: `Confronto projeta ${roundToOne(pick.projectedGameTotal)} pontos totais, o que ajuda a leitura deste mercado.`,
      impact: clamp(Math.abs(pick.gameEnvironmentScore), 0, 1),
      direction: toSignalDirection(pick.gameEnvironmentScore),
    },
    {
      key: "matchup_context",
      title: "Matchup",
      detail: `Leitura ${matchupLabel} para ${MARKET_RULES[pick.market].label} contra ${pick.opponentName} hoje.`,
      impact: clamp(Math.abs(pick.matchupScore), 0, 1),
      direction: toSignalDirection(pick.matchupScore),
    },
    {
      key: "rest",
      title: "Descanso",
      detail: `${pick.teamName} chega com ${pick.restDays ?? "?"} dia(s) de descanso antes deste jogo.`,
      impact: clamp(Math.abs(pick.restScore - 0.5) * 2, 0, 1),
      direction: toSignalDirection((pick.restScore - 0.5) * 2),
    },
  ];

  return signals.sort((left, right) => right.impact - left.impact).slice(0, 3);
};

const buildSummary = (pick: RawCandidate): string => {
  const marketLabel = MARKET_RULES[pick.market].label;
  return `${pick.playerName} aparece como um dos nomes mais fortes do dia em ${marketLabel}, com projeção de ${roundToOne(
    pick.projection
  )} e tendência ${pick.trendLabel}.`;
};

const buildSections = (
  candidates: RawCandidate[],
  maxPicksPerMarket: number
): NbaGoldListSection[] => {
  const ranges = createRangeIndex(candidates);

  return (Object.keys(MARKET_RULES) as NbaGoldListMarket[]).map((market) => {
    const rule = MARKET_RULES[market];
    const marketRanges = ranges.get(market)!;

    const picks = candidates
      .filter((candidate) => candidate.market === market)
      .map((candidate) => {
        const recentNorm = normalizeRange(
          candidate.recentAverage,
          marketRanges.minRecent,
          marketRanges.maxRecent
        );
        const trendNorm = normalizeRange(
          candidate.trendDelta,
          marketRanges.minTrend,
          marketRanges.maxTrend
        );
        const matchupNorm = (candidate.matchupScore + 1) / 2;
        const scoreBase =
          recentNorm * rule.weights.recent +
          trendNorm * rule.weights.trend +
          candidate.teamRoleScore * rule.weights.role +
          candidate.consistencyScore * rule.weights.consistency +
          matchupNorm * rule.weights.matchup +
          candidate.restScore * rule.weights.rest +
          candidate.homeScore * rule.weights.home;
        const score = clamp(48 + scoreBase * 47, 1, 99);
        const confidence = clamp(
          0.5 +
            candidate.consistencyScore * 0.18 +
            candidate.teamRoleScore * 0.16 +
            recentNorm * 0.11 +
            matchupNorm * 0.07 +
            (candidate.recentValues.length >= 5 ? 0.03 : 0),
          0.5,
          0.92
        );
        const confidenceLevel = getConfidenceLevel(confidence);

        const pick: NbaGoldListPick = {
          rank: 0,
          market,
          score: roundToOne(score),
          confidence: Number(confidence.toFixed(2)),
          confidenceLevel,
          confidenceReason: buildConfidenceReason(candidate, confidenceLevel),
          player: {
            id: candidate.playerId,
            name: candidate.playerName,
            team: candidate.teamName,
            opponent: candidate.opponentName,
            side: candidate.side,
            imageHint: candidate.imageHint,
          },
          match: candidate.match,
          recentValues: candidate.recentValues,
          recentAverage: roundToOne(candidate.recentAverage),
          lastThreeAverage: roundToOne(candidate.lastThreeAverage),
          projection: roundToOne(candidate.projection),
          trend: candidate.trendLabel,
          matchupRating: candidate.matchupRating,
          teamContext: {
            restDays: candidate.restDays,
            teamRank: candidate.ownTeamContext.overallRank,
            opponentDefenseRank: candidate.opponentTeamContext.defenseRank,
            isHome: candidate.isHome,
          },
          summary: buildSummary(candidate),
          supportSignals: buildSupportSignals(candidate),
        };

        return pick;
      })
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return right.projection - left.projection;
      })
      .slice(0, maxPicksPerMarket)
      .map((pick, index) => ({
        ...pick,
        rank: index + 1,
      }));

    return {
      market,
      title: rule.title,
      subtitle: rule.subtitle,
      picks,
    };
  });
};

const buildTopPicks = (
  sections: NbaGoldListSection[],
  topPicksCount: number
): NbaGoldListPick[] => {
  const usedPlayers = new Set<string>();
  const ranked = sections
    .flatMap((section) => section.picks)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return right.projection - left.projection;
    });

  const topPicks: NbaGoldListPick[] = [];
  for (const pick of ranked) {
    if (usedPlayers.has(pick.player.id)) continue;
    usedPlayers.add(pick.player.id);
    topPicks.push({
      ...pick,
      rank: topPicks.length + 1,
    });
    if (topPicks.length >= topPicksCount) break;
  }

  return topPicks;
};

export const buildNbaGoldList = (
  matches: NbaMatch[],
  options: BuildNbaGoldListOptions
): NbaGoldListResponse => {
  const playerAnalyses = options.playerAnalyses || [];
  const teamStats = options.teamStats || [];
  const warnings = [...(options.warnings || [])];
  const rawCandidates = buildRawCandidates(matches, playerAnalyses, teamStats);

  if (
    playerAnalyses.length > 0 &&
    rawCandidates.length === 0 &&
    playerAnalyses.some(({ analysis }) => analysis.detailLevel === "roster_only")
  ) {
    warnings.push(
      "Não conseguimos dados completos de jogadores para calcular oportunidades hoje."
    );
  }

  const sections = buildSections(
    rawCandidates,
    options.maxPicksPerMarket ?? MAX_PICKS_PER_MARKET
  );
  const topPicks = buildTopPicks(sections, options.topPicksCount ?? TOP_PICKS_COUNT);
  const totalPlayers = new Set(
    rawCandidates.map((candidate) => `${candidate.match.id}:${candidate.playerId}`)
  ).size;

  return {
    date: formatDateInBrt(new Date()),
    heroTitle: TODAY_HERO_TITLE,
    heroSubtitle: TODAY_HERO_SUBTITLE,
    topPicks,
    sections,
    metadata: {
      totalMatches: matches.length,
      analyzedMatches: playerAnalyses.length,
      totalPlayers,
      opportunitiesCount: sections.reduce(
        (sum, section) => sum + section.picks.length,
        0
      ),
      lastUpdate: new Date().toISOString(),
      dataSource: options.dataSource,
      warnings,
    },
  };
};
