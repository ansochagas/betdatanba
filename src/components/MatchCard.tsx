"use client";

import Image from "next/image";
import { TrendingUp, Calendar, BarChart3 } from "lucide-react";
import { TimezoneUtils } from "@/lib/timezone-utils";

interface TeamStats {
  teamName: string;
  stats: {
    winRate: number;
    avgScore: number;
    avgKillsPerMap: number | null;
    avgRoundsPerMap: number | null;
    avgMapsPlayed: number;
    recentForm: string;
  };
  recentMatches?: any[];
}

interface MatchWithAnalysis {
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  tournament?: string;
  odds?: {
    moneyline?: {
      home: number;
      away: number;
    };
  };
  pandascoreAnalysis?: {
    team1Stats: TeamStats;
    team2Stats: TeamStats;
  };
  insights: string[];
  // Novos campos premium
  premiumStats?: {
    team1: {
      totalMatches: number;
      finishedMatches: number;
      wins: number;
      losses: number;
      winRate: number;
      totalMaps: number;
      avgMapsPerMatch: number;
      avgTournamentTier: string;
      hasLiveSupport: boolean;
    };
    team2: {
      totalMatches: number;
      finishedMatches: number;
      wins: number;
      losses: number;
      winRate: number;
      totalMaps: number;
      avgMapsPerMatch: number;
      avgTournamentTier: string;
      hasLiveSupport: boolean;
    };
  };
  premiumInsights?: string[];
  predictions?: {
    expectedWinner?: string;
    confidence: number;
    reasoning: string[];
  };
}

interface MatchCardProps {
  match: MatchWithAnalysis;
  teamLogos?: Record<string, string | null>;
}

export default function MatchCard({ match, teamLogos }: MatchCardProps) {
  const formatDate = (dateString: string) => {
    return TimezoneUtils.formatDateTimeBRT(dateString);
  };

  const getTeamLogo = (teamName: string) => {
    // Primeiro tenta usar logos dinâmicas da API
    if (teamLogos && teamLogos[teamName]) {
      return teamLogos[teamName];
    }

    // Fallback para mapeamento hardcoded
    const logoMap: { [key: string]: string } = {
      FURIA: "/logos/furia.png",
      Fluxo: "/logos/fluxo.png",
      "Ninjas In Pyjamas": "/logos/nip.png",
      "FaZe Clan": "/logos/faze.png",
      "Natus Vincere": "/logos/navi.png",
      "G2 Esports": "/logos/g2.png",
      "Team Vitality": "/logos/vitality.png",
      Astralis: "/logos/astralis.png",
      MIBR: "/logos/mibr.png",
      // Adicionar mais conforme necessário
    };

    return logoMap[teamName] || "/icons/basketball.svg"; // Fallback
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-orange-500/50 transition-all duration-300">
      {/* Badge Premium */}
      {match.premiumStats && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-3 py-1 text-center">
          🔥 ANÁLISE PREMIUM
        </div>
      )}

      {/* Nome do Torneio - MAIOR DESTAQUE */}
      {match.tournament && (
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white text-center py-4 px-6 shadow-lg">
          <h3 className="font-bold text-lg uppercase tracking-wider">
            🏆 {match.tournament}
          </h3>
          <div className="text-xs opacity-90 mt-1">TORNEIO OFICIAL</div>
        </div>
      )}

      {/* Header do Card */}
      <div className="p-6">
        <div className="space-y-4">
          {/* Times */}
          <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-4">
            {/* Time Casa */}
            <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
              <Image
                src={getTeamLogo(match.homeTeam)}
                alt={match.homeTeam}
                width={48}
                height={48}
                className="rounded"
              />
              <div className="flex-1">
                <span className="font-bold text-white text-lg block">
                  {match.homeTeam}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center mx-4">
              <span className="text-gray-400 text-2xl font-bold">VS</span>
              {/* Data e Hora */}
              <div className="text-center mt-2">
                <div className="flex items-center gap-1 text-orange-400 text-sm">
                  <Calendar size={14} />
                  <span className="font-semibold">
                    {formatDate(match.startTime)}
                  </span>
                </div>
              </div>
            </div>

            {/* Time Visitante */}
            <div className="flex items-center gap-3 flex-1 w-full sm:w-auto sm:justify-end justify-between sm:justify-between">
              <div className="flex-1 text-right">
                <span className="font-bold text-white text-lg block">
                  {match.awayTeam}
                </span>
              </div>
              <Image
                src={getTeamLogo(match.awayTeam)}
                alt={match.awayTeam}
                width={48}
                height={48}
                className="rounded"
              />
            </div>
          </div>

          {/* Odds Prominentes */}
          {match.odds?.moneyline && (
            <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg p-4">
              <div className="text-center mb-2">
                <span className="text-orange-400 font-semibold text-sm uppercase tracking-wide">
                  Cotações Moneyline
                </span>
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400 mb-1">
                    {match.odds.moneyline.home.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">{match.homeTeam}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-400 mb-1">
                    N/A
                  </div>
                  <div className="text-xs text-gray-400">Empate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400 mb-1">
                    {match.odds.moneyline.away.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">{match.awayTeam}</div>
                </div>
              </div>
            </div>
          )}

          {/* Predição Premium */}
          {match.predictions?.expectedWinner && (
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">Predição</div>
              <div className="flex items-center justify-center gap-2">
                <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded text-sm font-semibold">
                  {match.predictions.expectedWinner}
                </span>
                <span className="text-xs text-gray-400">
                  {Math.round(match.predictions.confidence * 100)}% confiança
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Botão Detalhes do Jogo */}
        <a
          href={`/match/analysis?team1=${encodeURIComponent(
            match.homeTeam
          )}&team2=${encodeURIComponent(match.awayTeam)}&start=${encodeURIComponent(
            match.startTime
          )}&tournament=${encodeURIComponent(match.tournament || "")}${
            match.odds?.moneyline?.home
              ? `&oddsHome=${match.odds.moneyline.home}`
              : ""
          }${
            match.odds?.moneyline?.away
              ? `&oddsAway=${match.odds.moneyline.away}`
              : ""
          }`}
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-semibold mb-4"
        >
          <BarChart3 size={18} />
          <span className="text-sm">DETALHES DO JOGO</span>
        </a>

        {/* Insights */}
        {(match.premiumInsights || match.insights).length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-orange-400" />
              <span className="text-sm font-semibold text-gray-300">
                {match.premiumInsights
                  ? "Análises Premium"
                  : "Retrospecto recente"}
              </span>
              {match.premiumInsights && (
                <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-1 rounded">
                  PREMIUM
                </span>
              )}
            </div>
            <div className="space-y-1">
              {(match.premiumInsights || match.insights)
                .slice(0, 3)
                .map((insight, index) => (
                  <p key={index} className="text-sm text-gray-400">
                    • {insight}
                  </p>
                ))}
              {(match.premiumInsights || match.insights).length > 3 && (
                <p className="text-sm text-orange-400">
                  +{(match.premiumInsights || match.insights).length - 3}{" "}
                  insights adicionais...
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Análise Pré-Live */}
    </div>
  );
}
