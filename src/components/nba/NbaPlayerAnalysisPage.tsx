"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";
import { NbaPlayerAnalysisResponse } from "@/modules/nba/types";

type NbaPlayerAnalysisPageProps = {
  matchId: string;
  homeTeam?: string;
  awayTeam?: string;
  scheduledAt?: string;
  league?: string;
};

const formatBrtDate = (isoDate?: string | null): string => {
  if (!isoDate) return "--";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(isoDate));
  } catch {
    return "--";
  }
};

const formatAverage = (value: number | null): string => {
  if (value === null || !Number.isFinite(value)) return "--";
  return value.toFixed(1);
};

const formatLastFive = (values: number[]): string => {
  if (!values.length) return "--";
  return values.map((value) => value.toFixed(0)).join(" - ");
};

const buildPlayerAnalysisUrl = ({
  matchId,
  homeTeam,
  awayTeam,
  scheduledAt,
  league,
  force = false,
}: NbaPlayerAnalysisPageProps & { force?: boolean }): string => {
  const params = new URLSearchParams({
    matchId,
  });

  if (homeTeam) params.set("homeTeam", homeTeam);
  if (awayTeam) params.set("awayTeam", awayTeam);
  if (scheduledAt) params.set("scheduledAt", scheduledAt);
  if (league) params.set("league", league);
  if (force) params.set("force", "true");

  return `/api/nba/player-analysis?${params.toString()}`;
};

const teamAccent = (index: number) => {
  return index === 0
    ? {
        border: "border-orange-500/30",
        glow: "shadow-orange-500/10",
        chip: "bg-orange-500/10 text-orange-200 border-orange-400/20",
      }
    : {
        border: "border-cyan-500/30",
        glow: "shadow-cyan-500/10",
        chip: "bg-cyan-500/10 text-cyan-200 border-cyan-400/20",
      };
};

export default function NbaPlayerAnalysisPage(props: NbaPlayerAnalysisPageProps) {
  const { matchId, homeTeam, awayTeam, scheduledAt, league } = props;
  const [data, setData] = useState<NbaPlayerAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const visibleWarnings = useMemo(() => {
    if (!data?.warnings?.length) return [];
    return ["N\u00e3o conseguimos dados completos para este jogo no momento."];
  }, [data?.warnings]);

  const fetchData = useCallback(
    async (force = false) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          buildPlayerAnalysisUrl({
            matchId,
            homeTeam,
            awayTeam,
            scheduledAt,
            league,
            force,
          })
        );
        const payload = await response.json();

        if (!payload.success || !payload.data) {
          throw new Error(payload.error || "Falha ao carregar a análise dos jogadores.");
        }

        setData(payload.data as NbaPlayerAnalysisResponse);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Erro ao carregar a análise dos jogadores."
        );
      } finally {
        setLoading(false);
      }
    },
    [awayTeam, homeTeam, league, matchId, scheduledAt]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.16),_transparent_28%),linear-gradient(180deg,_#09090b_0%,_#111827_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/dashboard"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900 sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao dashboard
            </Link>
            <span className="inline-flex w-full items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-sm text-zinc-300 sm:w-auto">
              Análise dos jogadores
            </span>
          </div>

          <button
            onClick={() => fetchData(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-sm text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900 sm:w-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar dados
          </button>
        </div>

        <section className="overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950/80 shadow-2xl shadow-black/30">
          <div className="border-b border-zinc-800 bg-[linear-gradient(135deg,rgba(249,115,22,0.12),rgba(8,145,178,0.12))] px-5 py-5 sm:px-8 sm:py-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-400">
                  Análise de jogadores NBA
                </p>
                <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-4xl">
                  {(data?.homeTeam || homeTeam || "Time da Casa")} vs{" "}
                  {(data?.awayTeam || awayTeam || "Time Visitante")}
                </h1>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-zinc-300">
                  <span className="rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-1">
                    {data?.league || league || "NBA"}
                  </span>
                  <span className="rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-1">
                    {formatBrtDate(data?.scheduledAt || scheduledAt)}
                  </span>
                </div>
              </div>

              <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-black/30 p-4 text-sm text-zinc-300">
                <p className="font-semibold text-zinc-100">Leitura do painel</p>
                {data?.detailLevel === "roster_only" ? (
                  <p className="mt-2">{"N\u00e3o conseguimos dados completos para este jogo no momento."}</p>
                ) : (
                  <p className="mt-2">
                    <span className="text-zinc-100">*</span> {"m\u00e9dias dos \u00faltimos 5 jogos."}
                  </p>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="px-6 py-20 text-center text-zinc-300 sm:px-8">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-orange-400" />
              <p className="mt-4 text-lg font-semibold">Carregando análise dos jogadores...</p>
            </div>
          ) : error ? (
            <div className="px-6 py-16 sm:px-8">
              <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-6">
                <p className="text-lg font-bold text-red-100">Falha ao carregar esta análise</p>
                <p className="mt-2 text-sm text-red-200">{error}</p>
              </div>
            </div>
          ) : data ? (
            <div className="px-6 py-6 sm:px-8">
              {visibleWarnings.length > 0 && (
                <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                  <p className="font-semibold">Observações do painel</p>
                  <div className="mt-2 space-y-1">
                    {visibleWarnings.map((warning, index) => (
                      <p key={`warning-${index}`}>{warning}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-6 xl:grid-cols-2">
                {data.teams.map((team, teamIndex) => {
                  const accent = teamAccent(teamIndex);

                  return (
                    <section
                      key={`${team.teamName}-${teamIndex}`}
                      className={`rounded-[24px] border bg-zinc-950/70 p-5 shadow-2xl ${accent.border} ${accent.glow}`}
                    >
                      <div className="flex flex-col items-start gap-4 border-b border-zinc-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={team.logoUrl}
                            alt={`${team.teamName} logo`}
                            className="h-14 w-14 rounded-2xl border border-zinc-800 bg-zinc-900 object-contain p-2"
                          />
                          <div className="min-w-0">
                            <h2 className="break-words text-xl font-black tracking-tight text-white sm:text-2xl">
                              {team.teamName}
                            </h2>
                            <p className="text-sm text-zinc-400">
                              {data.detailLevel === "roster_only"
                                ? `${team.players.length} jogador(es) mapeados no elenco`
                                : `${team.players.length} jogador(es) com dados recentes`}
                            </p>
                          </div>
                        </div>

                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${accent.chip}`}>
                          {data.detailLevel === "roster_only" ? "elenco" : "últimos 5"}
                        </span>
                      </div>

                      {team.players.length === 0 ? (
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400">
                          {data.detailLevel === "roster_only"
                            ? "N\u00e3o conseguimos dados deste time para este jogo no momento."
                            : "Nenhum jogador com amostra v\u00e1lida foi retornado para este time."}
                        </div>
                      ) : (
                        <div className="mt-4 space-y-4">
                          {team.players.map((player) => (
                            <article
                              key={player.playerId}
                              className="rounded-2xl border border-zinc-800 bg-[linear-gradient(180deg,rgba(24,24,27,0.95),rgba(9,9,11,0.92))] p-4"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-sm font-black text-zinc-100">
                                    {player.playerName
                                      .split(" ")
                                      .slice(0, 2)
                                      .map((chunk) => chunk[0] || "")
                                      .join("")
                                      .toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="break-words text-lg font-bold text-white">{player.playerName}</p>
                                    <div className="mt-1 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                                      <span>{player.teamName}</span>
                                      {player.position ? <span>{player.position}</span> : null}
                                      {player.shirtNumber ? <span>#{player.shirtNumber}</span> : null}
                                    </div>
                                  </div>
                                </div>

                                <Link
                                  href={`https://www.google.com/search?q=${encodeURIComponent(`${player.playerName} NBA`)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-zinc-400 transition hover:text-zinc-200"
                                >
                                  Perfil
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                              </div>

                              {data.detailLevel === "roster_only" ? (
                                <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-300">
                                  {"N\u00e3o conseguimos dados detalhados deste jogador para este jogo no momento."}
                                </div>
                              ) : (
                                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                  {[
                                    {
                                      label: "Média de pontos*",
                                      average: player.points.average,
                                      values: player.points.values,
                                    },
                                    {
                                      label: "Média de rebotes*",
                                      average: player.rebounds.average,
                                      values: player.rebounds.values,
                                    },
                                    {
                                      label: "Média de assistências*",
                                      average: player.assists.average,
                                      values: player.assists.values,
                                    },
                                  ].map((metric) => (
                                    <div
                                      key={`${player.playerId}-${metric.label}`}
                                      className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
                                    >
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                                        {metric.label}
                                      </p>
                                      <p className="mt-2 text-2xl font-black text-white sm:text-3xl">
                                        {formatAverage(metric.average)}
                                      </p>
                                      <p className="mt-3 text-xs text-zinc-400">
                                        últimos 5:{" "}
                                        <span className="font-mono text-zinc-200">
                                          {formatLastFive(metric.values)}
                                        </span>
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </article>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
