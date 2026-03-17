import { NextRequest, NextResponse } from "next/server";
import { CacheService } from "@/services/cache-service";

export const dynamic = "force-dynamic";

const cacheService = new CacheService();

// Pandascore API - Dados reais de CS:GO
const PANDASCORE_ANALYSIS_URL =
  "http://localhost:3000/api/pandascore/match-analysis";

interface TeamHistory {
  teamName: string;
  recentMatches: Array<{
    id: number;
    opponent: string;
    opponentLogo?: string;
    score: string;
    result: "win" | "loss" | "draw";
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
    avgMapsPlayed: number;
    avgMatchLength: number;
    recentForm: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    console.log("🎯 Buscando jogos com histórico completo (PANDASCORE)...");

    // 1. Pegar próximos jogos via cache (Pinnacle)
    const upcomingMatches = await cacheService.getCsgoMatches();

    if (upcomingMatches.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Nenhum jogo futuro encontrado",
      });
    }

    console.log(`📊 Jogos futuros encontrados: ${upcomingMatches.length}`);

    // 2. Para cada jogo, buscar análise completa usando Pandascore
    const matchesWithAnalysis = [];

    for (const match of upcomingMatches) {
      try {
        console.log(`📈 Analisando: ${match.homeTeam} vs ${match.awayTeam}`);

        // Buscar análise completa do confronto
        const analysisResponse = await fetch(
          `${PANDASCORE_ANALYSIS_URL}?team1=${encodeURIComponent(
            match.homeTeam
          )}&team2=${encodeURIComponent(match.awayTeam)}`,
          {
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json();

          if (analysisData.success) {
            matchesWithAnalysis.push({
              ...match,
              pandascoreAnalysis: analysisData.data,
              insights: generateInsights(
                match,
                analysisData.data.team1Stats,
                analysisData.data.team2Stats
              ),
            });
          } else {
            // Fallback se análise falhar
            matchesWithAnalysis.push({
              ...match,
              pandascoreAnalysis: null,
              insights: [
                `Análise não disponível para ${match.homeTeam} vs ${match.awayTeam}`,
              ],
            });
          }
        } else {
          // Fallback se request falhar
          matchesWithAnalysis.push({
            ...match,
            pandascoreAnalysis: null,
            insights: [
              `Erro ao buscar análise para ${match.homeTeam} vs ${match.awayTeam}`,
            ],
          });
        }

        // Pequena pausa entre requests
        await sleep(200);
      } catch (error) {
        console.error(
          `Erro ao analisar ${match.homeTeam} vs ${match.awayTeam}:`,
          error
        );
        matchesWithAnalysis.push({
          ...match,
          pandascoreAnalysis: null,
          insights: [`Erro interno na análise`],
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: matchesWithAnalysis,
      metadata: {
        upcomingMatches: upcomingMatches.length,
        matchesAnalyzed: matchesWithAnalysis.filter((m) => m.pandascoreAnalysis)
          .length,
        dataSource: "Pandascore API + Pinnacle",
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Erro na API with-history:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? "Erro interno",
      },
      { status: 500 }
    );
  }
}

/**
 * Gera insights baseados na análise Pandascore
 */
function generateInsights(match: any, team1Stats: any, team2Stats: any) {
  const insights = [];

  if (team1Stats && team2Stats) {
    // Comparar win rates
    const team1WinRate = team1Stats.stats.winRate;
    const team2WinRate = team2Stats.stats.winRate;

    if (team1WinRate > team2WinRate) {
      insights.push(
        `🏆 ${match.homeTeam} tem melhor performance recente (${Math.round(
          team1WinRate * 100
        )}% vs ${Math.round(team2WinRate * 100)}%) dos últimos jogos analisados`
      );
    } else if (team2WinRate > team1WinRate) {
      insights.push(
        `🏆 ${match.awayTeam} tem melhor performance recente (${Math.round(
          team2WinRate * 100
        )}% vs ${Math.round(team1WinRate * 100)}%) dos últimos jogos analisados`
      );
    }

    // Comparar médias de mapas
    const team1Maps = team1Stats.stats.avgMapsPlayed;
    const team2Maps = team2Stats.stats.avgMapsPlayed;

    if (Math.abs(team1Maps - team2Maps) > 0.5) {
      if (team1Maps > team2Maps) {
        insights.push(
          `🗺️ ${match.homeTeam} joga mais mapas (${team1Maps.toFixed(
            1
          )} vs ${team2Maps.toFixed(1)})`
        );
      } else {
        insights.push(
          `🗺️ ${match.awayTeam} joga mais mapas (${team2Maps.toFixed(
            1
          )} vs ${team1Maps.toFixed(1)})`
        );
      }
    }

    // Comparar médias de pontuação
    const team1Score = team1Stats.stats.avgScore;
    const team2Score = team2Stats.stats.avgScore;

    if (Math.abs(team1Score - team2Score) > 0.3) {
      if (team1Score > team2Score) {
        insights.push(
          `📊 ${match.homeTeam} melhor média de pontuação (${team1Score.toFixed(
            1
          )} vs ${team2Score.toFixed(1)})`
        );
      } else {
        insights.push(
          `📊 ${match.awayTeam} melhor média de pontuação (${team2Score.toFixed(
            1
          )} vs ${team1Score.toFixed(1)})`
        );
      }
    }

    // Forma recente
    const team1Form = team1Stats.stats.recentForm;
    const team2Form = team2Stats.stats.recentForm;

    if (team1Form) {
      insights.push(`📈 ${match.homeTeam} forma recente: ${team1Form}`);
    }
    if (team2Form) {
      insights.push(`📈 ${match.awayTeam} forma recente: ${team2Form}`);
    }

    // Recomendações
    if (team1WinRate > team2WinRate + 0.2) {
      insights.push(`🎯 Recomendação: ${match.homeTeam} favorito`);
    } else if (team2WinRate > team1WinRate + 0.2) {
      insights.push(`🎯 Recomendação: ${match.awayTeam} favorito`);
    } else {
      insights.push(`⚖️ Confronto equilibrado`);
    }
  } else {
    insights.push("📊 Análise detalhada não disponível");
  }

  return insights;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
