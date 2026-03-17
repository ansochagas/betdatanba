"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, Target, Trophy, Users, Users2 } from "lucide-react";
import Image from "next/image";

export const dynamic = "force-dynamic";

interface TeamStats {
  teamName: string;
  teamId: number;
  stats: {
    totalMatches: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    avgScore: number;
    avgKillsPerMap: number | null;
    avgRoundsPerMap: number | null;
    avgMapsPlayed: number;
    avgMatchLength: number;
    recentForm: string;
  };
}

interface MatchAnalysisData {
  match: {
    team1: string;
    team2: string;
  };
  team1Stats: TeamStats;
  team2Stats: TeamStats;
  analysis: {
    expectedWinner: string;
    confidence: number;
    insights: string[];
    predictions: string[];
    recommendedMarkets: string[];
  };
}

interface PlayerStats {
  playerId: number;
  playerName: string;
  playerSlug: string;
  team: string;
  nationality: string;
  age: number;
  imageUrl: string;
  stats: {
    killsPerMatch: number;
    deathsPerMatch: number;
    assistsPerMatch: number;
    kdRatio: number;
    rating: number;
    headshotPercentage: number;
    adr: number;
    kast: number;
    totalKills: number;
    totalDeaths: number;
    matchesPlayed: number;
    matchesWon: number;
    winRate: number;
  };
  clutchesPerMatch: number;
  lastUpdated: string;
}

type TabType = "overview" | "players" | "predictions";

export default function MatchAnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto"></div>
            <p className="text-sm text-zinc-400">Carregando analise...</p>
          </div>
        </div>
      }
    >
      <MatchAnalysisContent />
    </Suspense>
  );
}

function MatchAnalysisContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const team1 = searchParams.get("team1") || "";
  const team2 = searchParams.get("team2") || "";
  const matchId = searchParams.get("matchId") || "";
  const homeTeamId = searchParams.get("homeTeamId") || "";
  const awayTeamId = searchParams.get("awayTeamId") || "";
  const startTime = searchParams.get("start") || "";
  const tournament = searchParams.get("tournament") || undefined;
  const oddsHome = searchParams.get("oddsHome");
  const oddsAway = searchParams.get("oddsAway");

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [matchData, setMatchData] = useState<MatchAnalysisData | null>(null);
  const [playersData, setPlayersData] = useState<{ team1: PlayerStats[]; team2: PlayerStats[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!team1 || !team2) return;
    fetchAnalysisData();
    fetchPlayersData();
  }, [team1, team2]);

  const fetchAnalysisData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        team1,
        team2,
        source: "prelive",
      });
      if (matchId) params.set("matchId", matchId);
      if (homeTeamId) params.set("homeTeamId", homeTeamId);
      if (awayTeamId) params.set("awayTeamId", awayTeamId);
      if (startTime) params.set("scheduledAt", startTime);
      if (tournament) params.set("tournament", tournament);

      const response = await fetch(
        `/api/pandascore/match-analysis?${params.toString()}`
      );
      const result = await response.json();
      if (result.success) {
        setMatchData(result.data);
      } else {
        setError(result.error || "Erro ao carregar analise");
      }
    } catch (err: any) {
      setError("Erro de conexao");
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayersData = async () => {
    if (playersLoading || !team1 || !team2) return;
    try {
      setPlayersLoading(true);

      const response1 = await fetch("/api/pandascore/player-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName: team1 }),
      });
      const response2 = await fetch("/api/pandascore/player-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName: team2 }),
      });

      const result1 = await response1.json();
      const result2 = await response2.json();

      if (result1.success && result2.success) {
        setPlayersData({
          team1: result1.data || [],
          team2: result2.data || [],
        });
      } else {
        setPlayersData({ team1: [], team2: [] });
      }
    } catch (err) {
      setPlayersData({ team1: [], team2: [] });
    } finally {
      setPlayersLoading(false);
    }
  };

  const formattedDate = useMemo(() => {
    if (!startTime) return "";
    const date = new Date(startTime);
    return `${date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "short",
    })} as ${date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }, [startTime]);

  const getTeamLogo = (teamName: string) => {
    const logoMap: { [key: string]: string } = {
      FURIA: "/logos/furia.png",
      "Natus Vincere": "/logos/navi.png",
      "FaZe Clan": "/logos/faze.png",
      "G2 Esports": "/logos/g2.png",
      "Team Vitality": "/logos/vitality.png",
      Astralis: "/logos/astralis.png",
      MIBR: "/logos/mibr.png",
      Imperial: "/logos/imperial.png",
      TheMongolz: "/logos/mongolz.png",
      Spirit: "/logos/spirit.png",
      Liquid: "/logos/liquid.png",
    };
    return logoMap[teamName] || "/icons/counterstrike.svg";
  };

  if (!team1 || !team2) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-xl font-semibold">Parametros ausentes</p>
          <p className="text-gray-400">Informe team1 e team2 para visualizar a analise.</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded"
          >
            Voltar ao dashboard
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview" as TabType, label: "Visao Geral", icon: BarChart3 },
    { id: "players" as TabType, label: "Jogadores", icon: Users },
    { id: "predictions" as TabType, label: "Previsoes", icon: Target },
  ];

  const generateBettingTips = () => {
    if (!matchData) return [];
    const { team1Stats, team2Stats, analysis } = matchData;
    const tips = [];
    const team1Rounds = team1Stats.stats.avgRoundsPerMap || 0;
    const team2Rounds = team2Stats.stats.avgRoundsPerMap || 0;
    const team1Kills = team1Stats.stats.avgKillsPerMap || 0;
    const team2Kills = team2Stats.stats.avgKillsPerMap || 0;
    const avgRounds = (team1Rounds + team2Rounds) / 2;
    const avgKills = (team1Kills + team2Kills) / 2;

    tips.push({
      type: avgRounds > 14 ? "Over Rounds" : "Under Rounds",
      description:
        avgRounds > 14
          ? `Alta media de rounds (${avgRounds.toFixed(1)}/mapa). Sugestao: OVER 26.5 rounds.`
          : `Media baixa de rounds (${avgRounds.toFixed(1)}/mapa). Sugestao: UNDER 26.5 rounds.`,
      confidence: avgRounds > 14 ? "Alta" : "Media",
      reasoning: avgRounds > 14 ? "Historico de jogos longos e disputados." : "Times encerram mapas com maior rapidez.",
    });

    tips.push({
      type: avgKills > 75 ? "Over Kills" : "Under Kills",
      description:
        avgKills > 75
          ? `Alta media de kills (${avgKills.toFixed(1)}/mapa). Sugestao: OVER 145.5 kills.`
          : `Kills moderadas (${avgKills.toFixed(1)}/mapa). Sugestao: UNDER 145.5 kills.`,
      confidence: avgKills > 75 ? "Alta" : "Media",
      reasoning:
        avgKills > 75 ? "Line-ups agressivas com bom desempenho individual." : "Tendencia a jogos mais controlados/defensivos.",
    });

    const confidencePct = analysis.confidence > 1 ? analysis.confidence : analysis.confidence * 100;

    tips.push({
      type: "Favorito",
      description: `${analysis.expectedWinner} aparece como favorito pela analise.`,
      confidence: confidencePct >= 70 ? "Alta" : confidencePct >= 50 ? "Media" : "Baixa",
      reasoning: `Confianca de ${confidencePct.toFixed(0)}% baseada em historico e forma.`,
    });

    return tips;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors">
              <ArrowLeft size={18} />
              Voltar ao dashboard
            </Link>
          </div>
          <div className="text-sm text-zinc-400">Analise pre-live</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-black p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(234,88,12,0.12),_transparent_45%),radial-gradient(circle_at_center,_rgba(37,99,235,0.12),_transparent_40%)]" />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border border-orange-500/40 bg-zinc-900/70 flex items-center justify-center overflow-hidden">
                <Image src={getTeamLogo(team1)} alt={team1} width={48} height={48} />
              </div>
              <div className="text-left">
                <div className="text-sm text-zinc-400">Time 1</div>
                <div className="text-2xl font-bold text-white">{team1}</div>
              </div>
            </div>

            <div className="text-center space-y-1">
              <div className="text-sm text-orange-400 uppercase tracking-wide font-semibold">{tournament || "Partida CS:GO"}</div>
              <div className="text-3xl font-black">VS</div>
              <div className="text-zinc-300">{formattedDate}</div>
              {(oddsHome || oddsAway) && (
                <div className="flex gap-3 justify-center text-sm">
                  {oddsHome && (
                    <span className="px-3 py-1 rounded bg-orange-500/10 text-orange-400 border border-orange-500/30">
                      {team1}: {parseFloat(oddsHome).toFixed(2)}
                    </span>
                  )}
                  {oddsAway && (
                    <span className="px-3 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      {team2}: {parseFloat(oddsAway).toFixed(2)}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border border-cyan-500/40 bg-zinc-900/70 flex items-center justify-center overflow-hidden">
                <Image src={getTeamLogo(team2)} alt={team2} width={48} height={48} />
              </div>
              <div className="text-left">
                <div className="text-sm text-zinc-400">Time 2</div>
                <div className="text-2xl font-bold text-white">{team2}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/60">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 font-semibold transition-colors flex-1 justify-center ${
                activeTab === tab.id
                  ? "text-orange-400 bg-orange-500/10 border-b-2 border-orange-500"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
              <span className="ml-4 text-gray-400">Carregando analise...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-12 space-y-4">
              <p className="text-red-400">{error}</p>
              <button onClick={fetchAnalysisData} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded">
                Tentar novamente
              </button>
            </div>
          )}

          {!loading && !error && matchData && (
            <>
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Trophy size={20} className="text-orange-400" />
                      <h3 className="text-xl font-bold text-white">Favorito & Confianca</h3>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <div className="px-4 py-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 font-semibold">
                        {matchData.analysis.expectedWinner}
                      </div>
                      <div className="px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200">
                        Confianca: {matchData.analysis.confidence.toFixed(0)}%
                      </div>
                    </div>
                  </section>

                  <section className="grid md:grid-cols-2 gap-4">
                    <TeamSummary
                      title="Time 1"
                      logo={getTeamLogo(matchData.team1Stats.teamName)}
                      name={matchData.team1Stats.teamName}
                      stats={matchData.team1Stats.stats}
                    />
                    <TeamSummary
                      title="Time 2"
                      logo={getTeamLogo(matchData.team2Stats.teamName)}
                      name={matchData.team2Stats.teamName}
                      stats={matchData.team2Stats.stats}
                    />
                  </section>

                  <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 size={20} className="text-orange-400" />
                      <h3 className="text-lg font-bold text-white">Insights</h3>
                    </div>
                    <div className="grid gap-3">
                      {matchData.analysis.insights
                        ?.filter(
                          (insight: string) =>
                            !insight.toLowerCase().includes("forma recente")
                        )
                        .map((insight: string, idx: number) => (
                        <div key={idx} className="p-3 rounded-lg bg-zinc-800/70 border border-zinc-700 text-sm text-zinc-200">
                          {insight}
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {activeTab === "players" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Users2 size={20} className="text-orange-400" />
                    <h3 className="text-lg font-bold text-white">Line-ups & Stats</h3>
                  </div>
                  {playersLoading && <div className="text-center py-12 text-gray-400">Carregando dados dos jogadores...</div>}
                  {!playersLoading && playersData && (
                    <div className="grid md:grid-cols-2 gap-6">
                      <PlayerColumn title={team1} logo={getTeamLogo(team1)} players={playersData.team1} />
                      <PlayerColumn title={team2} logo={getTeamLogo(team2)} players={playersData.team2} />
                    </div>
                  )}
                </div>
              )}

              {activeTab === "predictions" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Target size={20} className="text-orange-400" />
                    <h3 className="text-lg font-bold text-white">Dicas baseadas nos dados</h3>
                  </div>
                  <div className="space-y-4">
                    {generateBettingTips().map((tip, idx) => (
                      <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-white">{tip.type}</div>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              tip.confidence === "Alta"
                                ? "bg-green-500/20 text-green-400"
                                : tip.confidence === "Media"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {tip.confidence} confianca
                          </span>
                        </div>
                        <p className="text-zinc-300 text-sm">{tip.description}</p>
                        <p className="text-zinc-500 text-xs mt-2">{tip.reasoning}</p>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-orange-300 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                    Aviso: sao apenas sugestoes estatisticas. Aposte com responsabilidade.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 text-zinc-200">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function TeamSummary({
  title,
  logo,
  name,
  stats,
}: {
  title: string;
  logo: string;
  name: string;
  stats: TeamStats["stats"];
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-3">
      <div className="flex items-center gap-3">
        <Image src={logo} alt={name} width={32} height={32} className="rounded" />
        <div>
          <p className="text-sm text-zinc-400">{title}</p>
          <h4 className="text-lg font-bold text-white">{name}</h4>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        <StatCard label="Win Rate" value={`${Math.round(stats.winRate * 100)}%`} />
        <StatCard label="Jogos analisados" value={stats.totalMatches.toString()} />
        <StatCard label="Rounds/Mapa" value={stats.avgRoundsPerMap ? stats.avgRoundsPerMap.toFixed(1) : "N/A"} />
        <StatCard label="Kills/Mapa" value={stats.avgKillsPerMap ? stats.avgKillsPerMap.toFixed(1) : "N/A"} />
        <StatCard label="Mapas/Jogo" value={stats.avgMapsPlayed ? stats.avgMapsPlayed.toFixed(1) : "N/A"} />
        <StatCard label="Duracao media" value={stats.avgMatchLength ? `${Math.round(stats.avgMatchLength)} min` : "N/A"} />
      </div>
    </div>
  );
}

function PlayerColumn({
  title,
  logo,
  players,
}: {
  title: string;
  logo: string;
  players: PlayerStats[];
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Image src={logo} alt={title} width={28} height={28} className="rounded" />
        <h4 className="font-bold text-white">{title}</h4>
      </div>
      {players.length === 0 && (
        <div className="text-center text-sm text-zinc-500 py-6">Dados dos jogadores nao disponiveis.</div>
      )}
      <div className="space-y-3">
        {players.map((player) => (
          <div
            key={player.playerId}
            className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 flex items-center gap-3"
          >
            <Image
              src={player.imageUrl || "/icons/counterstrike.svg"}
              alt={player.playerName}
              width={40}
              height={40}
              className="rounded"
            />
            <div className="flex-1">
              <div className="font-semibold text-white">{player.playerName}</div>
              <div className="text-xs text-zinc-400">{player.nationality || "Nacionalidade nao informada"}</div>
            </div>
            <div className="text-right text-sm">
              <div className="text-green-400 font-semibold">{player.stats.rating?.toFixed(2) || "N/A"}</div>
              <div className="text-gray-400">Rating</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
