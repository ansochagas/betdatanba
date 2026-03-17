"use client";

import { useState, useEffect } from "react";
import {
  X,
  Trophy,
  Target,
  TrendingUp,
  Users,
  Swords,
  Calendar,
  MapPin,
  Clock,
  Users2,
  BarChart3,
} from "lucide-react";
import Image from "next/image";

interface TeamStats {
  teamName: string;
  teamId: number;
  recentMatches: Array<{
    id: number;
    opponent: string;
    opponentLogo?: string;
    score: string;
    result: "win" | "loss";
    date: string;
    tournament: string;
    tier: string;
    mapsPlayed?: number;
    matchLength?: number;
  }>;
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

interface MatchAnalysisData {
  match: {
    team1: string;
    team2: string;
  };
  team1Stats: TeamStats;
  team2Stats: TeamStats;
  analysis: {
    predictions: string[];
    keyStats: any;
    insights: string[];
    recommendedMarkets: string[];
    expectedWinner: string;
    confidence: number;
    reasoning: string[];
  };
}

interface PreLiveAnalysisModalProps {
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  tournament?: string;
  odds?: {
    home: number;
    away: number;
  };
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "overview" | "players" | "predictions";

export default function PreLiveAnalysisModal({
  homeTeam,
  awayTeam,
  matchDate,
  tournament,
  odds,
  isOpen,
  onClose,
}: PreLiveAnalysisModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [matchData, setMatchData] = useState<MatchAnalysisData | null>(null);
  const [playersData, setPlayersData] = useState<{
    team1: PlayerStats[];
    team2: PlayerStats[];
  } | null>(null);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Impede rolagem do fundo enquanto o modal estiver aberto
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && homeTeam && awayTeam) {
      fetchAnalysisData();
      fetchPlayersData();
    }
  }, [isOpen, homeTeam, awayTeam]);

  const fetchAnalysisData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/pandascore/match-analysis?team1=${encodeURIComponent(
          homeTeam
        )}&team2=${encodeURIComponent(awayTeam)}`
      );
      const result = await response.json();

      if (result.success) {
        setMatchData(result.data);
      } else {
        setError(result.error || "Erro ao carregar análise");
      }
    } catch (err: any) {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayersData = async () => {
    if (playersLoading) return; // Evitar múltiplas chamadas simultâneas

    try {
      setPlayersLoading(true);
      console.log(
        `🎯 Iniciando busca de jogadores para ${homeTeam} vs ${awayTeam}`
      );

      // Buscar dados do primeiro time
      const response1 = await fetch("/api/pandascore/player-stats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ teamName: homeTeam }),
      });

      // Buscar dados do segundo time
      const response2 = await fetch("/api/pandascore/player-stats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ teamName: awayTeam }),
      });

      const result1 = await response1.json();
      const result2 = await response2.json();

      console.log(`📊 Resultado ${homeTeam}:`, result1);
      console.log(`📊 Resultado ${awayTeam}:`, result2);

      if (result1.success && result2.success) {
        const playersData = {
          team1: result1.data || [],
          team2: result2.data || [],
        };
        console.log(`✅ Dados dos jogadores carregados:`, playersData);
        setPlayersData(playersData);
      } else {
        console.log(
          "Erro ao carregar dados dos jogadores:",
          result1.error || result2.error
        );
        setPlayersData({ team1: [], team2: [] });
      }
    } catch (err) {
      console.error("Erro ao carregar dados dos jogadores:", err);
      setPlayersData({ team1: [], team2: [] });
    } finally {
      setPlayersLoading(false);
    }
  };

  const generateBettingTips = () => {
    if (!matchData) return [];

    const { team1Stats, team2Stats, analysis } = matchData;
    const tips = [];

    // Análise baseada nos dados
    const team1Rounds = team1Stats.stats.avgRoundsPerMap || 0;
    const team2Rounds = team2Stats.stats.avgRoundsPerMap || 0;
    const team1Kills = team1Stats.stats.avgKillsPerMap || 0;
    const team2Kills = team2Stats.stats.avgKillsPerMap || 0;

    // Dica 1: Over/Under Rounds
    const avgRounds = (team1Rounds + team2Rounds) / 2;
    if (avgRounds > 14) {
      tips.push({
        type: "Over Rounds",
        description: `Jogo com alta média de rounds (${avgRounds.toFixed(
          1
        )} por mapa). Recomendamos OVER 26.5 rounds totais.`,
        confidence: "Alta",
        reasoning: "Ambos os times têm histórico de jogos longos e disputados.",
      });
    } else {
      tips.push({
        type: "Under Rounds",
        description: `Jogo com média baixa de rounds (${avgRounds.toFixed(
          1
        )} por mapa). Recomendamos UNDER 26.5 rounds totais.`,
        confidence: "Média",
        reasoning: "Times tendem a finalizar jogos de forma mais rápida.",
      });
    }

    // Dica 2: Over/Under Kills
    const avgKills = (team1Kills + team2Kills) / 2;
    if (avgKills > 75) {
      tips.push({
        type: "Over Kills",
        description: `Jogo com alta média de kills (${avgKills.toFixed(
          1
        )} por mapa). Recomendamos OVER 145.5 kills totais.`,
        confidence: "Alta",
        reasoning:
          "Ambos os times têm line-ups agressivas com bom desempenho individual.",
      });
    } else {
      tips.push({
        type: "Under Kills",
        description: `Jogo com média moderada de kills (${avgKills.toFixed(
          1
        )} por mapa). Recomendamos UNDER 145.5 kills totais.`,
        confidence: "Média",
        reasoning: "Times mais defensivos tendem a ter jogos com menos kills.",
      });
    }

    return tips;
  };

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

    return logoMap[teamName] || "/icons/basketball.svg";
  };

  if (!isOpen) return null;

  const tabs = [
    { id: "overview" as TabType, label: "Visão Geral", icon: BarChart3 },
    { id: "players" as TabType, label: "Jogadores", icon: Users },
    { id: "predictions" as TabType, label: "Previsões", icon: Target },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-700">
          <div className="flex items-center gap-4">
            <Trophy className="w-8 h-8 text-orange-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">
                {homeTeam} vs {awayTeam}
              </h2>
              <p className="text-gray-400">
                Análise Pré-Live - {tournament || "Torneio NBA"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors ${
                activeTab === tab.id
                  ? "text-orange-400 border-b-2 border-orange-400 bg-orange-500/10"
                  : "text-gray-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <span className="ml-3 text-gray-400">
                Carregando análise pré-live...
              </span>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">❌ {error}</p>
              <button
                onClick={fetchAnalysisData}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {matchData && !loading && !error && (
            <>
              {/* Visão Geral */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Ficha Técnica */}
                  <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Calendar size={20} className="text-orange-400" />
                      Ficha Técnica da Partida
                    </h3>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Time 1 */}
                      <div className="bg-zinc-800/50 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Image
                            src={getTeamLogo(homeTeam)}
                            alt={homeTeam}
                            width={40}
                            height={40}
                            className="rounded"
                          />
                          <h4 className="font-bold text-orange-400">
                            {homeTeam}
                          </h4>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Win Rate:</span>
                            <span className="text-white font-semibold">
                              {Math.round(
                                matchData.team1Stats.stats.winRate * 100
                              )}
                              %
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">
                              Jogos Análise:
                            </span>
                            <span className="text-white font-semibold">
                              {matchData.team1Stats.stats.totalMatches}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">
                              Forma Recente:
                            </span>
                            <span className="text-white font-semibold">
                              {matchData.team1Stats.stats.recentForm || "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Time 2 */}
                      <div className="bg-zinc-800/50 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Image
                            src={getTeamLogo(awayTeam)}
                            alt={awayTeam}
                            width={40}
                            height={40}
                            className="rounded"
                          />
                          <h4 className="font-bold text-orange-400">
                            {awayTeam}
                          </h4>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Win Rate:</span>
                            <span className="text-white font-semibold">
                              {Math.round(
                                matchData.team2Stats.stats.winRate * 100
                              )}
                              %
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">
                              Jogos Análise:
                            </span>
                            <span className="text-white font-semibold">
                              {matchData.team2Stats.stats.totalMatches}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">
                              Forma Recente:
                            </span>
                            <span className="text-white font-semibold">
                              {matchData.team2Stats.stats.recentForm || "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Odds se disponíveis */}
                    {odds && (
                      <div className="mt-4 pt-4 border-t border-zinc-700">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp size={16} className="text-orange-400" />
                          <span className="text-sm font-semibold text-gray-300">
                            Odds
                          </span>
                        </div>
                        <div className="flex gap-4">
                          <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded text-sm font-semibold">
                            {homeTeam}: {odds.home.toFixed(2)}
                          </span>
                          <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded text-sm font-semibold">
                            {awayTeam}: {odds.away.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* VISÃO GERAL - Os 5 dados principais */}
                  <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 rounded-xl p-8">
                    <h3 className="text-2xl font-bold text-white mb-8 text-center flex items-center justify-center gap-3">
                      <Trophy className="w-8 h-8 text-orange-400" />
                      VISÃO GERAL DA PARTIDA
                      <Trophy className="w-8 h-8 text-orange-400" />
                    </h3>

                    <div className="grid gap-6">
                      {/* 1. FAVORITO PARA VENCER */}
                      <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                              <Trophy className="w-6 h-6 text-orange-400" />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-white">
                                FAVORITO PARA VENCER
                              </h4>
                              <p className="text-gray-400 text-sm">
                                Baseado em dados históricos
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-orange-400">
                              {matchData.analysis.expectedWinner}
                            </div>
                            <div className="text-sm text-gray-400">
                              {matchData.analysis.confidence.toFixed(0)}%
                              confiança
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2-3. MÉDIA DE ROUNDS GANHOS POR MAPA */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-zinc-800/50 border border-zinc-600 rounded-lg p-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                              <Target className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-white">
                                MÉDIA DE ROUNDS GANHOS POR MAPA
                              </h4>
                              <p className="text-gray-400 text-sm">
                                {matchData.team1Stats.teamName}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 text-right">
                            <div className="text-3xl font-bold text-blue-400">
                              {matchData.team1Stats.stats.avgRoundsPerMap
                                ? matchData.team1Stats.stats.avgRoundsPerMap.toFixed(
                                    1
                                  )
                                : "N/A"}
                            </div>
                            <div className="text-sm text-gray-400">
                              rounds por mapa
                            </div>
                          </div>
                        </div>

                        <div className="bg-zinc-800/50 border border-zinc-600 rounded-lg p-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                              <Target className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-white">
                                MÉDIA DE ROUNDS GANHOS POR MAPA
                              </h4>
                              <p className="text-gray-400 text-sm">
                                {matchData.team2Stats.teamName}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 text-right">
                            <div className="text-3xl font-bold text-blue-400">
                              {matchData.team2Stats.stats.avgRoundsPerMap
                                ? matchData.team2Stats.stats.avgRoundsPerMap.toFixed(
                                    1
                                  )
                                : "N/A"}
                            </div>
                            <div className="text-sm text-gray-400">
                              rounds por mapa
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 4-5. MÉDIA DE KILLS POR MAPA */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-zinc-800/50 border border-zinc-600 rounded-lg p-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                              <Swords className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-white">
                                MÉDIA DE KILLS POR MAPA
                              </h4>
                              <p className="text-gray-400 text-sm">
                                {matchData.team1Stats.teamName}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 text-right">
                            <div className="text-3xl font-bold text-green-400">
                              {matchData.team1Stats.stats.avgKillsPerMap
                                ? matchData.team1Stats.stats.avgKillsPerMap.toFixed(
                                    1
                                  )
                                : "N/A"}
                            </div>
                            <div className="text-sm text-gray-400">
                              kills por mapa
                            </div>
                          </div>
                        </div>

                        <div className="bg-zinc-800/50 border border-zinc-600 rounded-lg p-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                              <Swords className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-white">
                                MÉDIA DE KILLS POR MAPA
                              </h4>
                              <p className="text-gray-400 text-sm">
                                {matchData.team2Stats.teamName}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 text-right">
                            <div className="text-3xl font-bold text-green-400">
                              {matchData.team2Stats.stats.avgKillsPerMap
                                ? matchData.team2Stats.stats.avgKillsPerMap.toFixed(
                                    1
                                  )
                                : "N/A"}
                            </div>
                            <div className="text-sm text-gray-400">
                              kills por mapa
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer com fonte dos dados */}
                    <div className="mt-8 pt-6 border-t border-zinc-700 text-center">
                      <p className="text-gray-400 text-sm">
                        📊 Dados baseados em estatísticas oficiais da PandaScore
                        API
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        Análise dos últimos 6 jogos oficiais de cada time
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Jogadores */}
              {activeTab === "players" && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <Users2 size={20} className="text-orange-400" />
                      Line-ups dos Times
                    </h3>

                    {playersData &&
                    (playersData.team1.length > 0 ||
                      playersData.team2.length > 0) ? (
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Time 1 Players */}
                        <div>
                          <h4 className="font-bold text-orange-400 mb-4 flex items-center gap-2">
                            <Image
                              src={getTeamLogo(homeTeam)}
                              alt={homeTeam}
                              width={24}
                              height={24}
                              className="rounded"
                            />
                            {homeTeam}
                          </h4>
                          {playersData.team1.length > 0 ? (
                            <div className="space-y-3">
                              {playersData.team1.map((player) => (
                                <div
                                  key={player.playerId}
                                  className="bg-zinc-800/50 rounded-lg p-3"
                                >
                                  <div className="flex items-center gap-3">
                                    <Image
                                      src={
                                        player.imageUrl ||
                                        "/icons/basketball.svg"
                                      }
                                      alt={player.playerName}
                                      width={40}
                                      height={40}
                                      className="rounded"
                                    />
                                    <div className="flex-1">
                                      <h5 className="font-semibold text-white">
                                        {player.playerName}
                                      </h5>
                                      <p className="text-sm text-gray-400">
                                        {player.nationality ||
                                          "Nacionalidade não informada"}
                                      </p>
                                    </div>
                                    <div className="text-right text-sm">
                                      <div className="text-green-400 font-semibold">
                                        {player.stats.rating?.toFixed(2) ||
                                          "N/A"}
                                      </div>
                                      <div className="text-gray-400">
                                        Rating
                                      </div>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                                    <div className="text-center">
                                      <div className="text-orange-400 font-semibold">
                                        {player.stats.killsPerMatch?.toFixed(
                                          1
                                        ) || "0.0"}
                                      </div>
                                      <div className="text-gray-400">
                                        Kills/M
                                      </div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-red-400 font-semibold">
                                        {player.stats.deathsPerMatch?.toFixed(
                                          1
                                        ) || "0.0"}
                                      </div>
                                      <div className="text-gray-400">
                                        Deaths/M
                                      </div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-blue-400 font-semibold">
                                        {player.stats.kdRatio?.toFixed(2) ||
                                          "0.00"}
                                      </div>
                                      <div className="text-gray-400">K/D</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-yellow-400 font-semibold">
                                        {player.stats.headshotPercentage?.toFixed(
                                          0
                                        ) || "0"}
                                        %
                                      </div>
                                      <div className="text-gray-400">HS%</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 bg-zinc-800/30 rounded-lg">
                              <Users2
                                size={32}
                                className="text-gray-500 mx-auto mb-2"
                              />
                              <p className="text-gray-500 text-sm">
                                Dados dos jogadores não disponíveis
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Time 2 Players */}
                        <div>
                          <h4 className="font-bold text-orange-400 mb-4 flex items-center gap-2">
                            <Image
                              src={getTeamLogo(awayTeam)}
                              alt={awayTeam}
                              width={24}
                              height={24}
                              className="rounded"
                            />
                            {awayTeam}
                          </h4>
                          {playersData.team2.length > 0 ? (
                            <div className="space-y-3">
                              {playersData.team2.map((player) => (
                                <div
                                  key={player.playerId}
                                  className="bg-zinc-800/50 rounded-lg p-3"
                                >
                                  <div className="flex items-center gap-3">
                                    <Image
                                      src={
                                        player.imageUrl ||
                                        "/icons/basketball.svg"
                                      }
                                      alt={player.playerName}
                                      width={40}
                                      height={40}
                                      className="rounded"
                                    />
                                    <div className="flex-1">
                                      <h5 className="font-semibold text-white">
                                        {player.playerName}
                                      </h5>
                                      <p className="text-sm text-gray-400">
                                        {player.nationality ||
                                          "Nacionalidade não informada"}
                                      </p>
                                    </div>
                                    <div className="text-right text-sm">
                                      <div className="text-green-400 font-semibold">
                                        {player.stats.rating?.toFixed(2) ||
                                          "N/A"}
                                      </div>
                                      <div className="text-gray-400">
                                        Rating
                                      </div>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                                    <div className="text-center">
                                      <div className="text-orange-400 font-semibold">
                                        {player.stats.killsPerMatch?.toFixed(
                                          1
                                        ) || "0.0"}
                                      </div>
                                      <div className="text-gray-400">
                                        Kills/M
                                      </div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-red-400 font-semibold">
                                        {player.stats.deathsPerMatch?.toFixed(
                                          1
                                        ) || "0.0"}
                                      </div>
                                      <div className="text-gray-400">
                                        Deaths/M
                                      </div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-blue-400 font-semibold">
                                        {player.stats.kdRatio?.toFixed(2) ||
                                          "0.00"}
                                      </div>
                                      <div className="text-gray-400">K/D</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-yellow-400 font-semibold">
                                        {player.stats.headshotPercentage?.toFixed(
                                          0
                                        ) || "0"}
                                        %
                                      </div>
                                      <div className="text-gray-400">HS%</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 bg-zinc-800/30 rounded-lg">
                              <Users2
                                size={32}
                                className="text-gray-500 mx-auto mb-2"
                              />
                              <p className="text-gray-500 text-sm">
                                Dados dos jogadores não disponíveis
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : playersLoading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                        <p className="text-gray-400">
                          Carregando dados dos jogadores...
                        </p>
                        <p className="text-gray-500 text-sm mt-2">
                          Isso pode levar alguns segundos
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Users2
                          size={48}
                          className="text-gray-600 mx-auto mb-4"
                        />
                        <p className="text-gray-400">
                          Não foi possível carregar os dados dos jogadores
                        </p>
                        <button
                          onClick={fetchPlayersData}
                          className="mt-4 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
                        >
                          Tentar Novamente
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Previsões */}
              {activeTab === "predictions" && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <Target size={20} className="text-orange-400" />
                      Dicas de Aposta Baseadas nos Dados
                    </h3>

                    <div className="space-y-4">
                      {generateBettingTips().map((tip, index) => (
                        <div
                          key={index}
                          className="bg-zinc-800/50 border border-zinc-600 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  tip.confidence === "Alta"
                                    ? "bg-green-400"
                                    : tip.confidence === "Média"
                                    ? "bg-yellow-400"
                                    : "bg-red-400"
                                }`}
                              />
                              <h4 className="font-bold text-white">
                                {tip.type}
                              </h4>
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  tip.confidence === "Alta"
                                    ? "bg-green-500/20 text-green-400"
                                    : tip.confidence === "Média"
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : "bg-red-500/20 text-red-400"
                                }`}
                              >
                                {tip.confidence} confiança
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-300 mb-2">
                            {tip.description}
                          </p>
                          <p className="text-sm text-gray-400">
                            <strong>Justificativa:</strong> {tip.reasoning}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                      <p className="text-orange-400 text-sm">
                        ⚠️ <strong>Aviso:</strong> Estas são apenas sugestões
                        baseadas em análise estatística. Apostas envolvem risco
                        e você deve apostar apenas com dinheiro que pode perder.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
