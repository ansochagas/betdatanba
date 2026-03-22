"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getNbaTeamIdentity } from "@/modules/nba/logos";

type NbaMatchCard = {
  id: number;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  scheduledAt: string;
  status: string;
  odds: {
    moneyline: {
      home: number;
      away: number;
      draw?: number;
    };
  };
};

type TeamSeasonStats = {
  teamId: string;
  teamName: string;
  logoUrl: string;
  record: { wins: number; losses: number };
  homeRecord: { wins: number; losses: number };
  awayRecord: { wins: number; losses: number };
  winRate: number;
  averagePointsFor: number;
  averagePointsAgainst: number;
  pointDifferential: number;
  last10Record: { wins: number; losses: number };
  last10Games: Array<{
    playedAt: string;
    opponentTeam: string;
    isHome: boolean;
    pointsFor: number;
    pointsAgainst: number;
    result: "W" | "L";
  }>;
  restDays: number | null;
  streak: { label: string };
  rank: { overall: number };
};

type TeamStatsResponse = {
  teams: TeamSeasonStats[];
  snapshot: {
    seasonLabel: string;
    totalGames: number;
    warnings: string[];
  };
};

const emptyTeamStatsFallback = (warning: string): TeamStatsResponse => ({
  teams: [],
  snapshot: {
    seasonLabel: "--",
    totalGames: 0,
    warnings: [warning],
  },
});

const normalizeTeam = (value: string): string => {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
};

const formatBrtDate = (isoDate: string): string => {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(isoDate));
};

const formatBrtDayKey = (isoDate: string): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoDate));

const formatDaySectionLabel = (dayKey: string): string => {
  const now = new Date();
  const todayKey = formatBrtDayKey(now.toISOString());
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowKey = formatBrtDayKey(tomorrow.toISOString());

  if (dayKey === todayKey) return "Hoje";
  if (dayKey === tomorrowKey) return "Amanhã";

  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
};

const formatPct = (value: number): string => `${(value * 100).toFixed(1)}%`;

const displayOdd = (odd: number): string => {
  if (!Number.isFinite(odd) || odd <= 1.01) return "--";
  return odd.toFixed(2);
};

const buildPlayerAnalysisHref = (match: NbaMatchCard): string => {
  const params = new URLSearchParams({
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    scheduledAt: match.scheduledAt,
    league: match.league,
  });

  return `/dashboard/analise-jogadores/${match.id}?${params.toString()}`;
};

const formatRest = (restDays: number | null | undefined): string => {
  if (restDays === null || restDays === undefined) return "--";
  return `${restDays}d`;
};

const formatRecentGame = (game: TeamSeasonStats["last10Games"][number]): string => {
  const shortDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(game.playedAt));

  const localTag = game.isHome ? "vs" : "@";
  const resultTag = game.result === "W" ? "V" : "D";
  return `${shortDate} ${localTag} ${game.opponentTeam} - ${game.pointsFor}-${game.pointsAgainst} (${resultTag})`;
};

const buildPreGameInsight = (
  _match: NbaMatchCard,
  homeStats: TeamSeasonStats | null,
  awayStats: TeamSeasonStats | null
) => {
  if (!homeStats || !awayStats) {
    return {
      projectedTotal: null as number | null,
      projectedSpread: null as number | null,
    };
  }

  const winRateEdge = homeStats.winRate - awayStats.winRate;
  const formEdge =
    homeStats.last10Record.wins / 10 - awayStats.last10Record.wins / 10;
  const restEdge = ((homeStats.restDays ?? 1) - (awayStats.restDays ?? 1)) / 3;

  const projectedSpread = Number(
    (
      (homeStats.pointDifferential - awayStats.pointDifferential) * 0.55 +
      winRateEdge * 10 +
      formEdge * 6 +
      restEdge * 2.5
    ).toFixed(1)
  );
  const projectedTotal = Number(
    (
      (homeStats.averagePointsFor +
        awayStats.averagePointsFor +
        homeStats.averagePointsAgainst +
        awayStats.averagePointsAgainst) /
      2
    ).toFixed(1)
  );

  return {
    projectedTotal,
    projectedSpread,
  };
};

export default function NbaAnalysisTool() {
  const [matches, setMatches] = useState<NbaMatchCard[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [matchesResponse, statsResponse] = await Promise.all([
        fetch("/api/nba/matches?days=2"),
        fetch("/api/nba/team-stats?limit=30"),
      ]);

      const matchesPayload = await matchesResponse.json();
      const statsPayload = await statsResponse.json();

      if (!matchesPayload.success) {
        throw new Error(matchesPayload.error || "Falha ao carregar jogos NBA.");
      }

      setMatches(Array.isArray(matchesPayload.data) ? matchesPayload.data : []);

      if (statsPayload?.success && statsPayload?.data) {
        setTeamStats(statsPayload.data as TeamStatsResponse);
      } else {
        setTeamStats(
          emptyTeamStatsFallback(
            statsPayload?.error || "Estatísticas da temporada indisponíveis no momento."
          )
        );
      }
      } catch (loadError) {
        console.error("Erro ao carregar módulo pré-jogo NBA:", loadError);
        setError("Não conseguimos carregar o pré-jogo da NBA no momento.");
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statsIndex = useMemo(() => {
    const index = new Map<string, TeamSeasonStats>();

    for (const team of teamStats?.teams || []) {
      index.set(normalizeTeam(team.teamName), team);
    }

    return index;
  }, [teamStats]);

  const groupedMatches = useMemo(() => {
    const groups = new Map<string, NbaMatchCard[]>();

    for (const match of matches) {
      const key = formatBrtDayKey(match.scheduledAt);
      const existing = groups.get(key) || [];
      existing.push(match);
      groups.set(key, existing);
    }

    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [matches]);

  const findTeamStats = useCallback(
    (teamName: string): TeamSeasonStats | null => {
      const direct = statsIndex.get(normalizeTeam(teamName));
      if (direct) return direct;

      const identity = getNbaTeamIdentity(teamName);
      const byCanonical = statsIndex.get(normalizeTeam(identity.canonicalName));
      if (byCanonical) return byCanonical;

      for (const [key, value] of statsIndex.entries()) {
        const teamKey = normalizeTeam(teamName);
        if (key.includes(teamKey) || teamKey.includes(key)) {
          return value;
        }
      }

      return null;
    },
    [statsIndex]
  );

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-6 text-center text-zinc-300 sm:p-8">
        Carregando jogos e estatísticas reais da temporada...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/50 bg-red-900/20 p-6 text-red-200">
        <p className="font-semibold">Pré-jogo indisponível no momento</p>
        <p className="mt-2 text-sm">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 rounded-lg border border-red-300/40 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500/20"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-5">
        <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
          AGENDA NBA - HOJE E AMANHÃ
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          O módulo pré-jogo agora considera por padrão a agenda do dia atual e
          também os jogos do próximo dia no horário de Brasília.
        </p>
      </div>

      <div className="space-y-4">
        {groupedMatches.map(([dayKey, dateMatches]) => (
          <section key={dayKey} className="space-y-4">
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/40 px-4 py-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-bold text-white">
                  {formatDaySectionLabel(dayKey)}
                </h3>
                <p className="text-xs uppercase tracking-wide text-zinc-400">
                  {dateMatches.length} jogo(s) na agenda
                </p>
              </div>
            </div>

            {dateMatches.map((match) => {
              const homeStats = findTeamStats(match.homeTeam);
              const awayStats = findTeamStats(match.awayTeam);
              const insight = buildPreGameInsight(match, homeStats, awayStats);

              return (
                <article
                  key={match.id}
                  className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 shadow-lg shadow-black/20 sm:p-5"
                >
                  <div className="flex flex-col gap-3 border-b border-zinc-800 pb-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-zinc-400">{match.league}</p>
                      <h3 className="text-lg font-bold text-white sm:text-xl">
                        {match.homeTeam} vs {match.awayTeam}
                      </h3>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500">Horário BRT</p>
                      <p className="text-base font-semibold text-zinc-100">{formatBrtDate(match.scheduledAt)}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 text-xs text-zinc-300">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-bold tracking-wide text-zinc-100">DADOS DO CONFRONTO</p>
                      <Link
                        href={buildPlayerAnalysisHref(match)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-full items-center justify-center rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-orange-100 transition hover:border-orange-300/50 hover:bg-orange-500/20 sm:w-auto"
                      >
                        Análise dos jogadores
                      </Link>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">Moneyline Casa</p>
                        <p className="mt-1 text-lg font-bold text-zinc-100">{displayOdd(match.odds.moneyline.home)}</p>
                      </div>
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">Moneyline Fora</p>
                        <p className="mt-1 text-lg font-bold text-zinc-100">{displayOdd(match.odds.moneyline.away)}</p>
                      </div>
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">Spread projetado</p>
                        <p className="mt-1 text-lg font-bold text-zinc-100">
                          {insight.projectedSpread !== null ? insight.projectedSpread : "--"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">Total projetado</p>
                        <p className="mt-1 text-lg font-bold text-zinc-100">
                          {insight.projectedTotal !== null ? insight.projectedTotal : "--"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {[
                      {
                        key: "home",
                        teamName: match.homeTeam,
                        logoUrl: match.homeTeamLogo || getNbaTeamIdentity(match.homeTeam).logoUrl,
                        odd: match.odds.moneyline.home,
                        stats: homeStats,
                      },
                      {
                        key: "away",
                        teamName: match.awayTeam,
                        logoUrl: match.awayTeamLogo || getNbaTeamIdentity(match.awayTeam).logoUrl,
                        odd: match.odds.moneyline.away,
                        stats: awayStats,
                      },
                    ].map((team) => (
                      <div key={team.key} className="rounded-lg border border-zinc-700 bg-zinc-950/80 p-4">
                        <div className="flex items-start gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={team.logoUrl}
                            alt={`${team.teamName} logo`}
                            className="h-10 w-10 rounded-md bg-zinc-900 object-contain"
                          />
                          <div className="min-w-0">
                            <p className="break-words text-base font-bold text-white sm:text-lg">{team.teamName}</p>
                            <p className="text-xs text-zinc-400 uppercase tracking-wide">
                              Moneyline: <span className="font-mono text-zinc-200">{displayOdd(team.odd)}</span>
                            </p>
                          </div>
                        </div>

                        {team.stats ? (
                          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Classificação atual</p>
                              <p className="mt-1 text-lg font-bold text-zinc-100">#{team.stats.rank.overall}</p>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Winrate</p>
                              <p className="mt-1 text-lg font-bold text-zinc-100">{formatPct(team.stats.winRate)}</p>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Média de pontos a favor</p>
                              <p className="mt-1 text-lg font-bold text-zinc-100">{team.stats.averagePointsFor.toFixed(1)}</p>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Média de pontos contra</p>
                              <p className="mt-1 text-lg font-bold text-zinc-100">{team.stats.averagePointsAgainst.toFixed(1)}</p>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Campanha</p>
                              <p className="mt-1 text-base font-semibold text-zinc-100">{team.stats.record.wins}-{team.stats.record.losses}</p>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Descanso</p>
                              <p className="mt-1 text-base font-semibold text-zinc-100">{formatRest(team.stats.restDays)}</p>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Casa</p>
                              <p className="mt-1 text-base font-semibold text-zinc-100">{team.stats.homeRecord.wins}-{team.stats.homeRecord.losses}</p>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Fora</p>
                              <p className="mt-1 text-base font-semibold text-zinc-100">{team.stats.awayRecord.wins}-{team.stats.awayRecord.losses}</p>
                            </div>
                            <div className="col-span-2 rounded-lg border border-zinc-800 bg-zinc-900/90 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-zinc-500">últimos 10</p>
                              <p className="mt-1 text-base font-semibold text-zinc-100">
                                {team.stats.last10Record.wins}-{team.stats.last10Record.losses} ({team.stats.streak.label})
                              </p>
                            </div>
                            <div className="col-span-2 rounded-lg border border-zinc-800 bg-zinc-900/90 p-3">
                              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">Placar dos últimos 10</p>
                              {team.stats.last10Games?.length ? (
                                <div className="mt-2 space-y-1">
                                  {team.stats.last10Games.map((game, index) => (
                                    <p key={`${team.key}-g${index}`} className="rounded border border-zinc-800 bg-zinc-950/80 px-2 py-1 text-[10px] text-zinc-200 sm:text-[11px]">
                                      {formatRecentGame(game)}
                                    </p>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-1 text-[11px] text-zinc-500">Sem jogos suficientes para exibir os últimos 10 placares.</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="mt-3 text-xs text-zinc-500">
                            Estatísticas da temporada ainda não disponíveis para este time.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
