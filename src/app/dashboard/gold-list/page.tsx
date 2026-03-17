"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GoldCard, { GoldCardMatch } from "@/components/GoldCard";
import { isGoldListEnabled } from "@/lib/feature-flags";

interface Match extends GoldCardMatch {
  stats?: {
    avgKillsPerMap: number;
    avgMapsPerMatch: number;
    avgRoundsPerMap: number;
  };
}

interface GoldPick {
  title: string;
  description: string;
  match: Match;
  value: string;
  icon: string;
  color: string;
}

export default function GoldListPage() {
  if (!isGoldListEnabled()) {
    return (
      <div className="min-h-screen bg-black px-4 py-16 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            Beta Fechado
          </p>
          <h1 className="mt-3 text-3xl font-black">Lista de Ouro indisponivel</h1>
          <p className="mt-3 text-zinc-400">
            Esta ferramenta foi desabilitada temporariamente para o teste externo.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-full border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { data: session, status } = useSession();
  const router = useRouter();
  const [goldPicks, setGoldPicks] = useState<GoldPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamLogos, setTeamLogos] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchGoldList();
    }
  }, [status, router]);

  const fetchGoldList = async () => {
    try {
      setLoading(true);

      // Buscar jogos do dia
      const matchesResponse = await fetch("/api/cache/csgo-matches");
      if (!matchesResponse.ok) {
        throw new Error("Erro ao buscar jogos");
      }

      const matchesData = await matchesResponse.json();
      const matches: Match[] = matchesData.data || [];

      if (matches.length === 0) {
        setError("Nenhum jogo encontrado para hoje");
        return;
      }

      // Buscar logos dos times
      const teamNames = matches.flatMap((match) => [
        match.homeTeam,
        match.awayTeam,
      ]);
      const uniqueTeamNames = [...new Set(teamNames)];

      const logosResponse = await fetch("/api/teams/logos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ teamNames: uniqueTeamNames }),
      });

      if (logosResponse.ok) {
        const logosData = await logosResponse.json();
        if (logosData.success) {
          setTeamLogos(logosData.logos);
        }
      }

      // Calcular estatísticas e encontrar melhores jogos
      const matchesWithStats = await Promise.all(
        matches.map(async (match) => {
          try {
            const statsResponse = await fetch(
              `/api/matches/stats?team1=${encodeURIComponent(
                match.homeTeam
              )}&team2=${encodeURIComponent(match.awayTeam)}`
            );

            if (statsResponse.ok) {
              const statsData = await statsResponse.json();
              return {
                ...match,
                stats: statsData.combined,
              };
            }
          } catch (error) {
            console.error(
              `Erro ao buscar stats para ${match.homeTeam} vs ${match.awayTeam}:`,
              error
            );
          }

          return match;
        })
      );

      // Calcular os melhores jogos por categoria
      const goldPicks = calculateGoldPicks(matchesWithStats);
      setGoldPicks(goldPicks);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateGoldPicks = (matches: Match[]): GoldPick[] => {
    const goldPicks: GoldPick[] = [];

    // 1. KILLS POR MAPA (soma das medias dos dois times)
    // Linha base: 141 kills/mapa. <141 sugere UNDER; >141 sugere OVER.
    const LINE_KILLS = 141;
    const killsMatches = matches
      .filter((m) => m.stats?.avgKillsPerMap)
      .map((m) => {
        // stats.avgKillsPerMap ja vem combinado (time A + time B)
        const combined = m.stats?.avgKillsPerMap || 0;
        const tip = combined >= LINE_KILLS ? "OVER 141" : "UNDER 141";
        const distance = Math.abs(combined - LINE_KILLS);
        return { match: m, combined, tip, distance };
      })
      .sort((a, b) => b.distance - a.distance);

    if (killsMatches.length > 0) {
      const best = killsMatches[0];
      goldPicks.push({
        title: "KILLS POR MAPA",
        description: "Soma das medias dos dois times vs linha 141",
        match: best.match,
        value: `${best.combined.toFixed(1)} kills/mapa - Sugestao: ${best.tip}`,
        icon: "🔥",
        color: "from-red-500 to-orange-500",
      });
    }

    // 2. Melhor do dia para OVER 2,5 MAPAS (maior média de mapas por jogo)
    const overMapsMatch = matches
      .filter((m) => m.stats?.avgMapsPerMatch)
      .sort(
        (a, b) =>
          (b.stats?.avgMapsPerMatch || 0) - (a.stats?.avgMapsPerMatch || 0)
      )[0];

    if (overMapsMatch) {
      goldPicks.push({
        title: "OVER 2,5 MAPAS",
        description: "Maior média de mapas por jogo",
        match: overMapsMatch,
        value: `${overMapsMatch.stats?.avgMapsPerMatch.toFixed(1)} mapas/jogo`,
        icon: "🗺️",
        color: "from-blue-500 to-cyan-500",
      });
    }

    // 3. Melhor do dia para VENCER O JOGO (melhor odd de vitória)
    const winGameMatch = matches
      .filter((m) => m.odds?.moneyline)
      .sort((a, b) => {
        const aMinOdd = Math.min(
          a.odds!.moneyline!.home,
          a.odds!.moneyline!.away
        );
        const bMinOdd = Math.min(
          b.odds!.moneyline!.home,
          b.odds!.moneyline!.away
        );
        return aMinOdd - bMinOdd; // Menor odd = melhor oportunidade
      })[0];

    if (winGameMatch) {
      const minOdd = Math.min(
        winGameMatch.odds!.moneyline!.home,
        winGameMatch.odds!.moneyline!.away
      );
      goldPicks.push({
        title: "VENCER O JOGO",
        description: "Melhor oportunidade de vitória",
        match: winGameMatch,
        value: `${minOdd.toFixed(2)} odds`,
        icon: "🏆",
        color: "from-green-500 to-emerald-500",
      });
    }

    // 4. Melhor do dia para OVER ROUNDS (maior média de rounds por mapa)
    const overRoundsMatch = matches
      .filter((m) => m.stats?.avgRoundsPerMap)
      .sort(
        (a, b) =>
          (b.stats?.avgRoundsPerMap || 0) - (a.stats?.avgRoundsPerMap || 0)
      )[0];

    if (overRoundsMatch) {
      goldPicks.push({
        title: "OVER ROUNDS",
        description: "Maior média de rounds por mapa",
        match: overRoundsMatch,
        value: `${overRoundsMatch.stats?.avgRoundsPerMap.toFixed(
          1
        )} rounds/mapa`,
        icon: "⚡",
        color: "from-purple-500 to-pink-500",
      });
    }

    return goldPicks;
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-400">Carregando Lista de Ouro...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-bold mb-4 text-red-400">
            Erro ao carregar
          </h2>
          <p className="text-gray-400 mb-8">{error}</p>
          <button
            onClick={fetchGoldList}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-orange-500 bg-clip-text text-transparent"
              >
                <span className="text-2xl font-bold text-white">
                  CS2 BETDATA
                </span>
              </Link>
              <span className="text-zinc-400">•</span>
              <span className="text-zinc-400">Lista de Ouro</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-400">
                Olá, {session?.user?.name || "Usuário"}
              </span>
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                ← Voltar ao Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-6 py-3 rounded-full font-bold text-lg mb-6">
            <span className="text-2xl">👑</span>
            LISTA DE OURO
            <span className="text-2xl">👑</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
            As Melhores Oportunidades do Dia
          </h1>

          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Algoritmos inteligentes identificaram os jogos mais promissores
            baseados em estatísticas avançadas. Maximize seus lucros com nossas
            recomendações premium.
          </p>
        </div>

        {/* Gold Cards Grid */}
        {goldPicks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {goldPicks.map((pick, index) => (
              <GoldCard
                key={index}
                title={pick.title}
                description={pick.description}
                match={pick.match}
                value={pick.value}
                icon={pick.icon}
                color={pick.color}
                teamLogos={teamLogos}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">⏳</div>
            <h3 className="text-xl font-semibold mb-2">
              Calculando oportunidades...
            </h3>
            <p className="text-gray-400">
              Os algoritmos estão analisando os jogos do dia para encontrar as
              melhores oportunidades.
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-16 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-xl p-6 max-w-4xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="text-2xl">⚠️</div>
            <div>
              <h3 className="text-lg font-bold text-orange-400 mb-2">
                Importante: Análise Estatística
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                As recomendações da Lista de Ouro são baseadas em algoritmos
                estatísticos que analisam histórico de desempenho, médias de
                kills, rounds e mapas. Estas são sugestões para auxiliar na
                tomada de decisão, não garantias de resultado. O CS:GO envolve
                fatores imprevisíveis como forma individual dos jogadores e
                estratégias de jogo.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
