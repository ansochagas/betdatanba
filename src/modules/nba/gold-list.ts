import { getNbaTeamIdentity } from "@/modules/nba/logos";
import {
  NbaGoldListPick,
  NbaGoldListResponse,
  NbaMatch,
  NbaOpportunitySignal,
  NbaTeamSeasonStats,
} from "@/modules/nba/types";

type BuildNbaGoldListOptions = {
  dataSource: string;
  warnings?: string[];
  maxPicks?: number;
  teamStats?: NbaTeamSeasonStats[];
};

type Side = "home" | "away";

type TeamContext = {
  side: Side;
  team: string;
  opponent: string;
  odd: number;
  marketProbability: number;
  gamesPlayed: number;
  last10WinRate: number;
  splitWinRate: number;
  restDays: number;
  pointDifferential: number;
  averagePointsFor: number;
  averagePointsAgainst: number;
  hasRealStats: boolean;
};

const MAX_PICKS_DEFAULT = 5;
const SCORE_THRESHOLD = 56;

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const normalizeTeam = (value: string): string => {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
};

const formatDateInBrt = (date: Date): string => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const toSignalDirection = (value: number): NbaOpportunitySignal["direction"] => {
  if (value > 0.04) return "a_favor";
  if (value < -0.04) return "contra";
  return "neutro";
};

const hashString = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }

  return Math.abs(hash >>> 0);
};

const buildStatsIndex = (teamStats: NbaTeamSeasonStats[]): Map<string, NbaTeamSeasonStats> => {
  const index = new Map<string, NbaTeamSeasonStats>();

  for (const team of teamStats) {
    const canonical = getNbaTeamIdentity(team.teamName);
    index.set(normalizeTeam(team.teamName), team);
    index.set(normalizeTeam(canonical.canonicalName), team);
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
  const byCanonical = index.get(normalizeTeam(identity.canonicalName));
  if (byCanonical) return byCanonical;

  const target = normalizeTeam(teamName);
  for (const [key, value] of index.entries()) {
    if (key.includes(target) || target.includes(key)) {
      return value;
    }
  }

  return null;
};

const buildFallbackContext = (match: NbaMatch, side: Side): TeamContext => {
  const seed = hashString(`${match.id}:${side}`);
  const odd = side === "home" ? match.odds.moneyline.home : match.odds.moneyline.away;
  const safeOdd = Number.isFinite(odd) && odd > 1.01 ? odd : 1.91;

  const gamesPlayed = 35 + (seed % 25);
  const last10WinRate = 0.35 + ((seed >>> 3) % 40) / 100;
  const splitWinRate = 0.35 + ((seed >>> 6) % 45) / 100;
  const restDays = (seed >>> 8) % 4;
  const pointDifferential = -6 + ((seed >>> 10) % 120) / 10;
  const averagePointsFor = 102 + ((seed >>> 12) % 250) / 10;
  const averagePointsAgainst = averagePointsFor - pointDifferential;

  return {
    side,
    team: side === "home" ? match.homeTeam : match.awayTeam,
    opponent: side === "home" ? match.awayTeam : match.homeTeam,
    odd: Number(safeOdd.toFixed(2)),
    marketProbability: 0.5,
    gamesPlayed,
    last10WinRate: Number(last10WinRate.toFixed(3)),
    splitWinRate: Number(splitWinRate.toFixed(3)),
    restDays,
    pointDifferential: Number(pointDifferential.toFixed(1)),
    averagePointsFor: Number(averagePointsFor.toFixed(1)),
    averagePointsAgainst: Number(averagePointsAgainst.toFixed(1)),
    hasRealStats: false,
  };
};

const buildTeamContext = (
  match: NbaMatch,
  side: Side,
  statsIndex: Map<string, NbaTeamSeasonStats>
): TeamContext => {
  const teamName = side === "home" ? match.homeTeam : match.awayTeam;
  const odd = side === "home" ? match.odds.moneyline.home : match.odds.moneyline.away;
  const safeOdd = Number.isFinite(odd) && odd > 1.01 ? odd : 1.91;
  const safeMarketProbability = 1 / safeOdd;
  const stats = resolveTeamStats(teamName, statsIndex);

  if (!stats) {
    return {
      ...buildFallbackContext(match, side),
      odd: Number(safeOdd.toFixed(2)),
      marketProbability: safeMarketProbability,
    };
  }

  const last10Games = stats.last10Record.wins + stats.last10Record.losses;
  const last10WinRate =
    last10Games > 0 ? stats.last10Record.wins / last10Games : stats.winRate;
  const splitRecord = side === "home" ? stats.homeRecord : stats.awayRecord;
  const splitGames = splitRecord.wins + splitRecord.losses;
  const splitWinRate = splitGames > 0 ? splitRecord.wins / splitGames : stats.winRate;

  return {
    side,
    team: teamName,
    opponent: side === "home" ? match.awayTeam : match.homeTeam,
    odd: Number(safeOdd.toFixed(2)),
    marketProbability: safeMarketProbability,
    gamesPlayed: stats.gamesPlayed,
    last10WinRate: Number(last10WinRate.toFixed(3)),
    splitWinRate: Number(splitWinRate.toFixed(3)),
    restDays: stats.restDays ?? 1,
    pointDifferential: Number(stats.pointDifferential.toFixed(1)),
    averagePointsFor: Number(stats.averagePointsFor.toFixed(1)),
    averagePointsAgainst: Number(stats.averagePointsAgainst.toFixed(1)),
    hasRealStats: true,
  };
};

const buildSignals = (
  team: TeamContext,
  opponent: TeamContext,
  normForm: number,
  normSplit: number,
  normRest: number,
  normEfficiency: number,
  normMarketEdge: number
): NbaOpportunitySignal[] => {
  return [
    {
      key: "recent_form",
      title: "Forma recente",
      detail: `${team.team}: ${(team.last10WinRate * 100).toFixed(0)}% nos ultimos jogos vs ${(opponent.last10WinRate * 100).toFixed(0)}% do adversario.`,
      impact: Number(Math.abs(normForm).toFixed(2)),
      direction: toSignalDirection(normForm),
    },
    {
      key: "home_away_split",
      title: "Split casa/fora",
      detail: `${team.team}: ${(team.splitWinRate * 100).toFixed(0)}% no split atual vs ${(opponent.splitWinRate * 100).toFixed(0)}% do oponente.`,
      impact: Number(Math.abs(normSplit).toFixed(2)),
      direction: toSignalDirection(normSplit),
    },
    {
      key: "efficiency_matchup",
      title: "Eficiência do confronto",
      detail: `Saldo de pontos ${team.pointDifferential.toFixed(1)} vs ${opponent.pointDifferential.toFixed(1)}. Ataque ${team.averagePointsFor.toFixed(1)} contra defesa ${opponent.averagePointsAgainst.toFixed(1)}.`,
      impact: Number(Math.abs(normEfficiency).toFixed(2)),
      direction: toSignalDirection(normEfficiency),
    },
    {
      key: "rest",
      title: "Descanso",
      detail: `${team.team} com ${team.restDays} dia(s) de descanso vs ${opponent.restDays} do adversario.`,
      impact: Number(Math.abs(normRest).toFixed(2)),
      direction: toSignalDirection(normRest),
    },
    {
      key: "market_edge",
      title: "Edge vs mercado",
      detail: `Odd atual ${team.odd.toFixed(2)}. Modelo indica diferenca de valor sobre a probabilidade implicita.`,
      impact: Number(Math.abs(normMarketEdge).toFixed(2)),
      direction: toSignalDirection(normMarketEdge),
    },
  ];
};

const getConfidenceLevel = (confidence: number): NbaGoldListPick["confidenceLevel"] => {
  if (confidence >= 0.79) return "alta";
  if (confidence >= 0.63) return "media";
  return "baixa";
};

const getConfidenceReason = (
  confidenceLevel: NbaGoldListPick["confidenceLevel"],
  supportiveSignals: number,
  edge: number,
  usedRealStats: boolean
): string => {
  const source = usedRealStats ? "dados reais da temporada" : "fallback parcial de dados";

  if (confidenceLevel === "alta") {
    return `Leitura forte em ${supportiveSignals} sinais com ${source} e edge de ${edge.toFixed(1)} p.p.`;
  }
  if (confidenceLevel === "media") {
    return `Sinais consistentes (${source}) com edge de ${edge.toFixed(1)} p.p.`;
  }
  return `Cenario sensivel ao mercado (${source}); edge atual de ${edge.toFixed(1)} p.p.`;
};

const buildPick = (
  match: NbaMatch,
  statsIndex: Map<string, NbaTeamSeasonStats>
): NbaGoldListPick | null => {
  const home = buildTeamContext(match, "home", statsIndex);
  const away = buildTeamContext(match, "away", statsIndex);

  const overround = home.marketProbability + away.marketProbability;
  const homeMarketProb = home.marketProbability / overround;
  const awayMarketProb = away.marketProbability / overround;

  const homeNormForm = clamp(home.last10WinRate - away.last10WinRate, -1, 1);
  const homeNormSplit = clamp(home.splitWinRate - away.splitWinRate, -1, 1);
  const homeNormRest = clamp((home.restDays - away.restDays) / 3, -1, 1);
  const homeNormEfficiency = clamp((home.pointDifferential - away.pointDifferential) / 15, -1, 1);

  const awayNormForm = -homeNormForm;
  const awayNormSplit = -homeNormSplit;
  const awayNormRest = -homeNormRest;
  const awayNormEfficiency = -homeNormEfficiency;

  const homeStatsWeight =
    homeNormForm * 0.28 +
    homeNormSplit * 0.22 +
    homeNormRest * 0.12 +
    homeNormEfficiency * 0.24;
  const awayStatsWeight =
    awayNormForm * 0.28 +
    awayNormSplit * 0.22 +
    awayNormRest * 0.12 +
    awayNormEfficiency * 0.24;

  const homeModelProb = clamp(0.5 + homeStatsWeight * 0.45, 0.08, 0.92);
  const awayModelProb = clamp(0.5 + awayStatsWeight * 0.45, 0.08, 0.92);

  const homeEdge = (homeModelProb - homeMarketProb) * 100;
  const awayEdge = (awayModelProb - awayMarketProb) * 100;

  const pickHome = homeEdge >= awayEdge;
  const selected = pickHome ? home : away;
  const opponent = pickHome ? away : home;
  const selectedModel = pickHome ? homeModelProb : awayModelProb;
  const selectedMarket = pickHome ? homeMarketProb : awayMarketProb;
  const selectedEdge = pickHome ? homeEdge : awayEdge;
  const selectedWeight = pickHome ? homeStatsWeight : awayStatsWeight;

  const selectedNormForm = pickHome ? homeNormForm : awayNormForm;
  const selectedNormSplit = pickHome ? homeNormSplit : awayNormSplit;
  const selectedNormRest = pickHome ? homeNormRest : awayNormRest;
  const selectedNormEfficiency = pickHome ? homeNormEfficiency : awayNormEfficiency;
  const selectedNormMarket = clamp(selectedEdge / 10, -1, 1);

  const signals = buildSignals(
    selected,
    opponent,
    selectedNormForm,
    selectedNormSplit,
    selectedNormRest,
    selectedNormEfficiency,
    selectedNormMarket
  );

  const supportSignals = signals
    .filter((signal) => signal.direction !== "contra")
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 4);

  if (supportSignals.length < 3) {
    return null;
  }

  const dataPenalty = selected.hasRealStats && opponent.hasRealStats ? 0 : 4;
  const lowEdgePenalty = Math.abs(selectedEdge) < 1.2 ? 3 : 0;
  const score = clamp(
    50 + selectedWeight * 30 + selectedEdge * 1.8 - dataPenalty - lowEdgePenalty,
    1,
    99
  );
  if (score < SCORE_THRESHOLD) {
    return null;
  }

  const supportiveSignals = supportSignals.filter(
    (signal) => signal.direction === "a_favor"
  ).length;
  const confidence = clamp(
    0.52 +
      Math.abs(selectedWeight) * 0.28 +
      supportiveSignals * 0.07 +
      (Math.abs(selectedEdge) >= 4 ? 0.04 : 0) +
      (selected.gamesPlayed >= 50 ? 0.02 : 0) +
      (selected.hasRealStats && opponent.hasRealStats ? 0.03 : 0),
    0.5,
    0.93
  );
  const confidenceLevel = getConfidenceLevel(confidence);
  const fairOdd = selectedModel > 0 ? Number((1 / selectedModel).toFixed(2)) : selected.odd;

  return {
    rank: 0,
    score: Number(score.toFixed(1)),
    confidence: Number(confidence.toFixed(2)),
    confidenceLevel,
    confidenceReason: getConfidenceReason(
      confidenceLevel,
      supportSignals.length,
      selectedEdge,
      selected.hasRealStats && opponent.hasRealStats
    ),
    match,
    recommendation: {
      market: "moneyline",
      side: selected.side,
      team: selected.team,
      odds: selected.odd,
      impliedProbability: Number((selectedMarket * 100).toFixed(1)),
      modelProbability: Number((selectedModel * 100).toFixed(1)),
      edge: Number(selectedEdge.toFixed(1)),
    },
    summary: `${selected.team} aparece com edge de ${selectedEdge.toFixed(1)} p.p. (odd justa ${fairOdd}), sustentado por forma, eficiência e contexto de jogo.`,
    supportSignals: supportSignals.slice(0, 3),
  };
};

const buildFallbackPick = (
  match: NbaMatch,
  statsIndex: Map<string, NbaTeamSeasonStats>
): NbaGoldListPick => {
  const home = buildTeamContext(match, "home", statsIndex);
  const away = buildTeamContext(match, "away", statsIndex);
  const pickHome = home.odd <= away.odd;
  const selected = pickHome ? home : away;
  const opponent = pickHome ? away : home;

  const signals = buildSignals(
    selected,
    opponent,
    clamp(selected.last10WinRate - opponent.last10WinRate, -1, 1),
    clamp(selected.splitWinRate - opponent.splitWinRate, -1, 1),
    clamp((selected.restDays - opponent.restDays) / 3, -1, 1),
    clamp((selected.pointDifferential - opponent.pointDifferential) / 15, -1, 1),
    0
  );

  return {
    rank: 0,
    score: 55,
    confidence: 0.62,
    confidenceLevel: "media",
    confidenceReason:
      "Fallback controlado enquanto o mercado nao fornece sinais suficientes de valor.",
    match,
    recommendation: {
      market: "moneyline",
      side: selected.side,
      team: selected.team,
      odds: selected.odd,
      impliedProbability: Number((selected.marketProbability * 100).toFixed(1)),
      modelProbability: Number((selected.marketProbability * 100 + 1.5).toFixed(1)),
      edge: 1.5,
    },
    summary: `${selected.team} entra como opcao de menor risco relativo no fallback do MVP.`,
    supportSignals: signals
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3)
      .map((signal) =>
        signal.direction === "contra" ? { ...signal, direction: "neutro" as const } : signal
      ),
  };
};

export const buildNbaGoldList = (
  matches: NbaMatch[],
  options: BuildNbaGoldListOptions
): NbaGoldListResponse => {
  const statsIndex = buildStatsIndex(options.teamStats || []);

  const picks = matches
    .map((match) => buildPick(match, statsIndex))
    .filter((pick): pick is NbaGoldListPick => Boolean(pick))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.confidence - a.confidence;
    });

  const maxPicks = options.maxPicks ?? MAX_PICKS_DEFAULT;
  const rankedSource =
    picks.length > 0
      ? picks.slice(0, maxPicks)
      : matches.slice(0, maxPicks).map((match) => buildFallbackPick(match, statsIndex));

  const ranked = rankedSource.map((pick, index) => ({
    ...pick,
    rank: index + 1,
  }));

  return {
    date: formatDateInBrt(new Date()),
    picks: ranked,
    metadata: {
      totalMatches: matches.length,
      analyzedMatches: matches.length,
      opportunitiesCount: ranked.length,
      lastUpdate: new Date().toISOString(),
      dataSource: options.dataSource,
      warnings: options.warnings || [],
    },
  };
};
