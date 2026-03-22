"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Gauge, Siren, Timer } from "lucide-react";

type LiveTeamSnapshot = {
  record?: { wins: number; losses: number };
  rank?: number;
  averagePointsFor?: number;
  averagePointsAgainst?: number;
  pointDifferential?: number;
};

type QuarterScore = {
  label: string;
  home: number | null;
  away: number | null;
};

type LivePairStat = {
  home: number | null;
  away: number | null;
};

type LiveGameClock = {
  quarter: number | null;
  minutesRemaining: number | null;
  secondsRemaining: number | null;
  periodLengthMinutes: number | null;
  totalPeriods: number | null;
} | null;

type NbaLiveGame = {
  id: string;
  scheduledAt: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo: string;
  awayTeamLogo: string;
  status: string;
  score: { home: number | null; away: number | null };
  odds?: { moneyline?: { home?: number; away?: number; draw?: number } };
  timer: string | null;
  period: string | null;
  gameClock: LiveGameClock;
  quarterScores: QuarterScore[];
  liveStats: {
    fouls: LivePairStat | null;
    timeouts: LivePairStat | null;
    freeThrows: LivePairStat | null;
    freeThrowRate: LivePairStat | null;
    twoPoints: LivePairStat | null;
    threePoints: LivePairStat | null;
  };
  venue: {
    name: string | null;
    city: string | null;
  } | null;
  homeSeasonSnapshot: LiveTeamSnapshot | null;
  awaySeasonSnapshot: LiveTeamSnapshot | null;
  pregameReference: {
    moneyline?: { home?: number; away?: number; draw?: number };
    scheduledAt?: string;
  } | null;
};

type LiveResponse = {
  success: boolean;
  data: NbaLiveGame[];
  error?: string;
  metadata?: {
    totalLiveGames: number;
    seasonStatsAttached: boolean;
    timestamp: string;
  };
};

type LiveRead = {
  level: "alta" | "media" | "baixa";
  title: string;
  market: string;
  summary: string;
  bullets: string[];
};

const formatBrtTime = (iso: string): string => {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
};

const displayOdd = (odd: number | null | undefined): string => {
  if (!odd || !Number.isFinite(odd) || odd <= 1.01) return "--";
  return odd.toFixed(2);
};

const formatNumber = (value: number | null | undefined, digits = 1): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  return value.toFixed(digits);
};

const formatClock = (game: NbaLiveGame): string => {
  if (game.timer) return game.timer;
  if (!game.gameClock) return "--";

  const minutes = game.gameClock.minutesRemaining;
  const seconds = game.gameClock.secondsRemaining;
  if (minutes === null || seconds === null) return "--";

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const getLeaderSide = (game: NbaLiveGame): "home" | "away" | "draw" => {
  const homeScore = game.score.home ?? 0;
  const awayScore = game.score.away ?? 0;

  if (homeScore === awayScore) return "draw";
  return homeScore > awayScore ? "home" : "away";
};

const getFavoriteSide = (game: NbaLiveGame): "home" | "away" | null => {
  const homeOdd = game.pregameReference?.moneyline?.home ?? game.odds?.moneyline?.home;
  const awayOdd = game.pregameReference?.moneyline?.away ?? game.odds?.moneyline?.away;

  if (!homeOdd || !awayOdd) return null;
  if (homeOdd <= 1.01 || awayOdd <= 1.01) return null;

  return homeOdd <= awayOdd ? "home" : "away";
};

const getMargin = (game: NbaLiveGame): number => {
  return Math.abs((game.score.home ?? 0) - (game.score.away ?? 0));
};

const getTotalPoints = (game: NbaLiveGame): number => {
  return (game.score.home ?? 0) + (game.score.away ?? 0);
};

const getRegulationMinutes = (game: NbaLiveGame): number => {
  const periodLength = game.gameClock?.periodLengthMinutes ?? 12;
  const totalPeriods = game.gameClock?.totalPeriods ?? 4;
  return periodLength * totalPeriods;
};

const getElapsedMinutes = (game: NbaLiveGame): number | null => {
  const clock = game.gameClock;
  if (!clock) return null;
  if (
    clock.quarter === null ||
    clock.minutesRemaining === null ||
    clock.secondsRemaining === null ||
    clock.periodLengthMinutes === null
  ) {
    return null;
  }

  const completedPeriods = Math.max(clock.quarter - 1, 0);
  const remainingInCurrentPeriod =
    clock.minutesRemaining + clock.secondsRemaining / 60;
  const elapsed =
    completedPeriods * clock.periodLengthMinutes +
    (clock.periodLengthMinutes - remainingInCurrentPeriod);

  return elapsed > 0 ? Number(elapsed.toFixed(2)) : null;
};

const getBaselineTotal = (game: NbaLiveGame): number | null => {
  const home = game.homeSeasonSnapshot;
  const away = game.awaySeasonSnapshot;
  if (!home || !away) return null;
  if (
    home.averagePointsFor === undefined ||
    home.averagePointsAgainst === undefined ||
    away.averagePointsFor === undefined ||
    away.averagePointsAgainst === undefined
  ) {
    return null;
  }

  return Number(
    (
      (home.averagePointsFor +
        home.averagePointsAgainst +
        away.averagePointsFor +
        away.averagePointsAgainst) /
      2
    ).toFixed(1)
  );
};

const getProjectedFinalTotal = (game: NbaLiveGame): number | null => {
  const elapsed = getElapsedMinutes(game);
  if (!elapsed || elapsed < 1) return null;

  const totalPoints = getTotalPoints(game);
  const regulationMinutes = getRegulationMinutes(game);
  if (regulationMinutes <= 0) return null;

  return Number(((totalPoints / elapsed) * regulationMinutes).toFixed(1));
};

const getTotalDelta = (game: NbaLiveGame): number | null => {
  const baseline = getBaselineTotal(game);
  const projected = getProjectedFinalTotal(game);
  if (baseline === null || projected === null) return null;
  return Number((projected - baseline).toFixed(1));
};

const getPaceLabel = (delta: number | null): string => {
  if (delta === null) return "sem leitura";
  if (delta >= 12) return "muito acelerado";
  if (delta >= 6) return "acelerado";
  if (delta <= -12) return "muito abaixo";
  if (delta <= -6) return "desacelerado";
  return "perto do baseline";
};

const buildLiveRead = (game: NbaLiveGame): LiveRead => {
  const favorite = getFavoriteSide(game);
  const leader = getLeaderSide(game);
  const margin = getMargin(game);
  const totalDelta = getTotalDelta(game);
  const quarter = game.gameClock?.quarter ?? null;
  const bullets: string[] = [];

  if (totalDelta !== null) {
    bullets.push(
      `Projetado ${formatNumber(getProjectedFinalTotal(game))} vs baseline ${formatNumber(
        getBaselineTotal(game)
      )}`
    );
  }

  if (game.liveStats.fouls) {
    bullets.push(
      `Faltas no momento: ${game.homeTeam} ${formatNumber(
        game.liveStats.fouls.home,
        0
      )} x ${game.awayTeam} ${formatNumber(game.liveStats.fouls.away, 0)}`
    );
  }

  if (game.liveStats.timeouts) {
    bullets.push(
      `Timeouts: ${game.homeTeam} ${formatNumber(
        game.liveStats.timeouts.home,
        0
      )} x ${game.awayTeam} ${formatNumber(game.liveStats.timeouts.away, 0)}`
    );
  }

  if (favorite && leader !== "draw" && favorite !== leader && margin >= 5) {
    return {
      level: "alta",
      title: "Favorito em dificuldade",
      market: "Moneyline / Spread",
      summary: "O favorito do pré-jogo está atrás no placar com margem relevante.",
      bullets,
    };
  }

  if (totalDelta !== null && totalDelta >= 10) {
    return {
      level: "alta",
      title: "Ritmo acima do pré-jogo",
      market: "Total",
      summary: `O jogo está ${getPaceLabel(totalDelta)} para o baseline pré-jogo.`,
      bullets,
    };
  }

  if (totalDelta !== null && totalDelta <= -10) {
    return {
      level: "alta",
      title: "Pontuação abaixo do esperado",
      market: "Total",
      summary: `O jogo está ${getPaceLabel(totalDelta)} para o baseline pré-jogo.`,
      bullets,
    };
  }

  if (quarter !== null && quarter >= 3 && leader !== "draw" && margin >= 10) {
    return {
      level: "media",
      title: "Controle claro do líder",
      market: "Moneyline / Spread",
      summary: "Liderança consolidada no segundo tempo.",
      bullets,
    };
  }

  if (margin <= 4) {
    return {
      level: "media",
      title: "Jogo apertado",
      market: "Clutch / Moneyline",
      summary: "Uma corrida curta ainda muda completamente a leitura do jogo.",
      bullets,
    };
  }

  return {
    level: "baixa",
    title: "Leitura equilibrada",
    market: "Monitoramento",
    summary: "Sem assimetria forte o suficiente para priorizar uma entrada agora.",
    bullets,
  };
};

const getAlertColors = (level: LiveRead["level"]): string => {
  if (level === "alta") return "border-red-500/30 bg-red-500/10 text-red-100";
  if (level === "media") return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  return "border-zinc-700 bg-zinc-900/70 text-zinc-200";
};

const statCell = (
  label: string,
  value: string,
  emphasis = false
): JSX.Element => (
  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
    <p
      className={`mt-2 break-words leading-tight ${
        emphasis ? "text-xl font-black sm:text-2xl" : "text-base font-bold sm:text-lg"
      } text-zinc-100`}
    >
      {value}
    </p>
  </div>
);

const miniStatCell = (label: string, value: string): JSX.Element => (
  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
    <p className="mt-2 break-words text-base font-bold leading-tight text-zinc-100">{value}</p>
  </div>
);

const infoPill = (label: string, value: string): JSX.Element => (
  <div className="rounded-full border border-zinc-700 bg-zinc-950/70 px-3 py-2">
    <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</span>
    <span className="ml-2 text-sm font-semibold text-zinc-100">{value}</span>
  </div>
);

export default function NbaLiveTool() {
  const [games, setGames] = useState<NbaLiveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLive = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/nba/live");
      const payload = (await response.json()) as LiveResponse;

      if (!payload.success) {
        throw new Error(payload.error || "Falha ao consultar o monitoramento ao vivo.");
      }

      setGames(Array.isArray(payload.data) ? payload.data : []);
    } catch (loadError) {
      console.error("Erro ao carregar monitoramento ao vivo:", loadError);
      setError("Não conseguimos carregar os jogos ao vivo no momento.");
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLive();
    const timer = setInterval(fetchLive, 15000);
    return () => clearInterval(timer);
  }, [fetchLive]);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(234,88,12,0.12),transparent_28%),linear-gradient(180deg,rgba(9,9,11,0.98),rgba(17,24,39,0.96))] px-4 py-5 shadow-2xl shadow-black/30 sm:px-6">
        <h2 className="text-2xl font-black uppercase tracking-[0.12em] text-white sm:text-3xl">
          JOGOS AO VIVO AGORA
        </h2>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-5 text-red-100">
          <p className="text-lg font-bold">Monitoramento ao vivo indisponível</p>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      ) : null}

      {loading && games.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center text-zinc-300">
          Buscando jogos ao vivo...
        </div>
      ) : null}

      {!loading && games.length === 0 && !error ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">
          <p className="text-lg font-bold text-zinc-100">Nenhum jogo NBA ao vivo agora!</p>
        </div>
      ) : null}

      <div className="space-y-6">
        {games.map((game) => {
          const liveRead = buildLiveRead(game);
          const totalPoints = getTotalPoints(game);
          const projectedTotal = getProjectedFinalTotal(game);
          const totalDelta = getTotalDelta(game);
          const teams = [
            {
              key: "home",
              teamName: game.homeTeam,
              logoUrl: game.homeTeamLogo,
              score: game.score.home,
              liveOdd: game.odds?.moneyline?.home,
              pregameOdd: game.pregameReference?.moneyline?.home,
              snapshot: game.homeSeasonSnapshot,
            },
            {
              key: "away",
              teamName: game.awayTeam,
              logoUrl: game.awayTeamLogo,
              score: game.score.away,
              liveOdd: game.odds?.moneyline?.away,
              pregameOdd: game.pregameReference?.moneyline?.away,
              snapshot: game.awaySeasonSnapshot,
            },
          ];

          return (
            <article
              key={game.id}
              className="overflow-hidden rounded-[26px] border border-zinc-800 bg-[linear-gradient(180deg,rgba(9,9,11,0.98),rgba(17,24,39,0.95))] shadow-2xl shadow-black/30"
            >
              <div className="border-b border-zinc-800 px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                      {game.league}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">{formatBrtTime(game.scheduledAt)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-200">
                      Ao vivo
                    </span>
                    <span className="rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-200">
                      {game.period || "Período --"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-1 text-xs font-semibold text-zinc-100">
                      <Timer className="h-3.5 w-3.5" />
                      {formatClock(game)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-5">
                <section className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-5">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_220px_minmax(0,1fr)] lg:items-center">
                    {teams.map((team) => (
                      <div
                        key={`${game.id}-score-${team.key}`}
                        className={`flex min-h-[148px] flex-col items-center justify-center rounded-[22px] border border-zinc-800 bg-zinc-900/70 p-4 text-center sm:min-h-[160px] sm:p-5 ${
                          team.key === "home"
                            ? "sm:order-2 lg:order-none"
                            : "sm:order-3 lg:order-none"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={team.logoUrl}
                          alt={`${team.teamName} logo`}
                          className="h-16 w-16 rounded-2xl border border-zinc-800 bg-zinc-950 object-contain p-2"
                        />
                        <p className="mt-3 max-w-[180px] break-words text-center text-base font-black tracking-tight text-white sm:mt-4 sm:text-lg">
                          {team.teamName}
                        </p>
                      </div>
                    ))}

                    <div className="order-1 flex h-full items-center justify-center sm:col-span-2 lg:order-none lg:col-span-1">
                      <div className="w-full rounded-[22px] border border-zinc-700 bg-zinc-900/80 px-6 py-5 text-center lg:w-auto lg:min-w-[220px]">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                          Placar ao vivo
                        </p>
                        <p className="mt-2 text-2xl font-black text-white sm:text-3xl">
                          {formatNumber(game.score.home, 0)} x {formatNumber(game.score.away, 0)}
                        </p>
                        <div className="mt-3 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-400">
                          <span>{game.period || "Período --"}</span>
                          <span className="text-zinc-600">•</span>
                          <span>{formatClock(game)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                    {statCell("Total atual", String(totalPoints), true)}
                    {statCell("Projetado", formatNumber(projectedTotal), true)}
                    {statCell("ML casa", displayOdd(game.odds?.moneyline?.home), true)}
                    {statCell("ML fora", displayOdd(game.odds?.moneyline?.away), true)}
                  </div>
                </section>

                <section className={`rounded-[24px] border p-5 ${getAlertColors(liveRead.level)}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {liveRead.level === "alta" ? (
                        <Siren className="h-5 w-5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5" />
                      )}
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em]">
                          Leitura do momento
                        </p>
                        <h3 className="mt-1 text-xl font-black">{liveRead.title}</h3>
                      </div>
                    </div>
                    <span className="rounded-full border border-current/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                      {liveRead.market}
                    </span>
                  </div>

                  <p className="mt-4 text-sm">{liveRead.summary}</p>
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {liveRead.bullets.map((bullet, index) => (
                      <div
                        key={`${game.id}-bullet-${index}`}
                        className="rounded-2xl border border-current/10 bg-black/10 px-3 py-2 text-sm"
                      >
                        {bullet}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {infoPill("Ritmo", getPaceLabel(totalDelta))}
                    {infoPill("Margem", String(getMargin(game)))}
                    {game.venue?.name ? infoPill("Arena", game.venue.name) : null}
                    {game.venue?.city ? infoPill("Cidade", game.venue.city) : null}
                  </div>
                </section>

                <section className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-5">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-cyan-300" />
                    <h3 className="text-lg font-black text-white">Fluxo do jogo</h3>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {[
                      {
                        label: "Faltas",
                        stat: game.liveStats.fouls,
                      },
                      {
                        label: "Timeouts",
                        stat: game.liveStats.timeouts,
                      },
                      {
                        label: "FT convertidos",
                        stat: game.liveStats.freeThrows,
                      },
                      {
                        label: "FT rate",
                        stat: game.liveStats.freeThrowRate,
                      },
                      {
                        label: "2PT",
                        stat: game.liveStats.twoPoints,
                      },
                      {
                        label: "3PT",
                        stat: game.liveStats.threePoints,
                      },
                    ].map((item) => (
                      <div
                        key={`${game.id}-${item.label}`}
                        className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
                      >
                        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                          {item.label}
                        </p>
                        <p className="mt-2 text-lg font-black text-white">
                          {formatNumber(item.stat?.home, item.label === "FT rate" ? 1 : 0)} x{" "}
                          {formatNumber(item.stat?.away, item.label === "FT rate" ? 1 : 0)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {game.quarterScores.length > 0 ? (
                    <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                        Parcial por período
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {game.quarterScores.map((quarter) => (
                          <div
                            key={`${game.id}-${quarter.label}`}
                            className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3 text-center"
                          >
                            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                              {quarter.label}
                            </p>
                            <p className="mt-2 text-sm font-black text-zinc-100">
                              {formatNumber(quarter.home, 0)} x {formatNumber(quarter.away, 0)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>

                <section className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-5">
                  <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                        DADOS DE APOIO
                      </p>
                      <h3 className="mt-1 text-lg font-black text-white">Snapshot da temporada</h3>
                    </div>
                    <p className="text-sm text-zinc-500">Leitura comparativa de cada equipe</p>
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    {teams.map((team) => (
                      <section
                        key={`${game.id}-${team.key}-snapshot`}
                        className="rounded-[22px] border border-zinc-800 bg-zinc-900/60 p-5"
                      >
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={team.logoUrl}
                            alt={`${team.teamName} logo`}
                            className="h-12 w-12 rounded-2xl border border-zinc-800 bg-zinc-950 object-contain p-2"
                          />
                          <div className="min-w-0">
                            <p className="break-words text-lg font-black text-white sm:text-xl">{team.teamName}</p>
                            {team.snapshot?.record ? (
                              <p className="text-sm text-zinc-400">
                                Record {team.snapshot.record.wins}-{team.snapshot.record.losses}
                              </p>
                            ) : (
                              <p className="text-sm text-zinc-500">
                                Snapshot de temporada indisponível
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {miniStatCell("Placar", formatNumber(team.score, 0))}
                          {miniStatCell("Rank", team.snapshot?.rank ? `#${team.snapshot.rank}` : "--")}
                          {miniStatCell("ML pre-jogo", displayOdd(team.pregameOdd))}
                          {miniStatCell("ML live", displayOdd(team.liveOdd))}
                          {miniStatCell("Média PF", formatNumber(team.snapshot?.averagePointsFor))}
                          {miniStatCell("Média PA", formatNumber(team.snapshot?.averagePointsAgainst))}
                          {miniStatCell(
                            "Saldo médio",
                            formatNumber(team.snapshot?.pointDifferential)
                          )}
                        </div>
                      </section>
                    ))}
                  </div>
                </section>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
