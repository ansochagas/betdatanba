"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RefreshCw, Play, Clock, Users, ExternalLink } from "lucide-react";
import MatchCard from "@/components/MatchCard";
import GoldListTool from "@/components/GoldListTool";
import OnboardingCard from "@/components/OnboardingCard";
import ReportsTool from "@/components/ReportsTool";
import { isDashboardToolEnabled, isOnboardingEnabled } from "@/lib/feature-flags";
import NbaAnalysisTool from "@/components/nba/NbaAnalysisTool";
import NbaLiveTool from "@/components/nba/NbaLiveTool";
import BrandLogo from "@/components/brand/BrandLogo";


interface SubscriptionInfo {
  status: string;
  daysRemaining: number;
  planId: string | null;
  hasNbaAccess: boolean;
  hasSubscription: boolean;
}

type Tool = "analysis" | "gold-list" | "live" | "reports";

const toBRTDate = (dateInput: string | Date): Date => {
  const base =
    typeof dateInput === "string" ? new Date(dateInput) : new Date(dateInput);
  return new Date(
    base.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
};

function DashboardContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [activeTool, setActiveTool] = useState<Tool>("analysis");
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo>({
    status: "INACTIVE",
    daysRemaining: 0,
    planId: null,
    hasNbaAccess: false,
    hasSubscription: false,
  });
  const fetchedSubscription = useRef(false);
  const postCheckoutRef = useRef(false);

  const tools = [
    {
      id: "analysis" as Tool,
      name: "Pré-jogo",
      description: "Agenda e contexto dos jogos NBA",
      icon: "A",
      comingSoon: false,
    },
    {
      id: "gold-list" as Tool,
      name: "Melhores do Dia",
      description: "O que vale mais atencao hoje",
      icon: "M",
      comingSoon: false,
    },
    {
      id: "live" as Tool,
      name: "Live",
      description: "Acompanhamento em tempo real",
      icon: "L",
      comingSoon: false,
    },
    {
      id: "reports" as Tool,
      name: "Relatórios",
      description: "Histórico e performance",
      icon: "R",
      comingSoon: true,
    },
].filter((tool) => isDashboardToolEnabled(tool.id));

  // Buscar informações da assinatura
  const fetchSubscriptionInfo = useCallback(async () => {
    try {
      const response = await fetch("/api/user/subscription");
      const data = await response.json();

      if (data.success && data.validation) {
        const accessFromApi = Boolean(
          data?.access?.hasNbaAccess ?? data?.validation?.hasNbaAccess
        );

        setSubscriptionInfo({
          status: data.validation.status,
          daysRemaining: data.validation.daysRemaining,
          planId: data.subscription?.planId || null,
          hasNbaAccess: accessFromApi,
          hasSubscription: Boolean(data.subscription),
        });
      }
    } catch (error) {
      console.error("Erro ao buscar informações da assinatura:", error);
    }
  }, []);

  // Buscar uma vez por sessão
  useEffect(() => {
    if (session?.user && !fetchedSubscription.current) {
      fetchedSubscription.current = true;
      fetchSubscriptionInfo();
    }
  }, [session, fetchSubscriptionInfo]);

  // Pós-checkout: se voltar com success=true e session_id, forçar refresh
  useEffect(() => {
    const success = searchParams.get("success");
    const sessionId = searchParams.get("session_id");
    if (success === "true" && sessionId && !postCheckoutRef.current) {
      postCheckoutRef.current = true;
      fetchSubscriptionInfo();
    }
  }, [searchParams, fetchSubscriptionInfo]);

  useEffect(() => {
    if (!isDashboardToolEnabled(activeTool)) {
      setActiveTool("analysis");
    }
  }, [activeTool]);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  const isAccessAllowed =
    subscriptionInfo.hasNbaAccess &&
    (subscriptionInfo.status === "ACTIVE" ||
    (subscriptionInfo.status === "TRIALING" &&
      subscriptionInfo.daysRemaining > 0));

  const planStatusLabel = !subscriptionInfo.hasSubscription
    ? "Sem plano"
    : subscriptionInfo.status === "ACTIVE"
    ? "Plano ativo"
    : subscriptionInfo.status === "TRIALING"
    ? "Trial ativo"
    : "Inativo";

  const planStatusColor = !subscriptionInfo.hasSubscription
    ? "text-zinc-400"
    : subscriptionInfo.status === "ACTIVE"
    ? "text-green-400"
    : subscriptionInfo.status === "TRIALING"
    ? "text-blue-400"
    : "text-red-400";

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/" className="text-white">
              <BrandLogo size="md" />
            </Link>
            <span className="text-zinc-400">•</span>
            <span className="text-zinc-400">Dashboard</span>
          </div>

          <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
            <span className="text-sm text-zinc-400">
              Olá, {session?.user?.name || "Usuário"}
            </span>
            <Link
              href="/minha-conta"
              className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Minha Conta
            </Link>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        {isOnboardingEnabled() && (
          <div className="mb-8">
            <OnboardingCard />
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 lg:gap-8">
          {/* Sidebar - Tools Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-xl sm:p-6">
              <h2 className="text-lg font-bold mb-6 text-center">
                Ferramentas
              </h2>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => !tool.comingSoon && setActiveTool(tool.id)}
                    disabled={tool.comingSoon}
                    className={`w-full p-4 rounded-lg border transition-all text-left ${
                      activeTool === tool.id
                        ? "bg-zinc-700 border-zinc-500 text-zinc-200"
                        : tool.comingSoon
                        ? "bg-zinc-800/50 border-zinc-700 text-zinc-500 cursor-not-allowed"
                        : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/70"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium text-sm">
                          {tool.name}
                          {tool.comingSoon && (
                            <span className="ml-2 text-xs bg-zinc-700 px-2 py-1 rounded">
                              Em breve
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-400 mt-1">
                          {tool.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* User Stats */}
              <div className="mt-8 pt-6 border-t border-zinc-800">
                <h3 className="text-sm font-medium mb-3">Seu Plano</h3>
                <div className="space-y-2 text-xs text-zinc-400">
                  <div className="flex items-center justify-between gap-3">
                    <span>Status:</span>
                    <span className={planStatusColor}>{planStatusLabel}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Dias restantes:</span>
                    {subscriptionInfo.hasSubscription ? (
                      <span
                        className={`${
                          subscriptionInfo.daysRemaining <= 7
                            ? "text-red-400"
                            : subscriptionInfo.daysRemaining <= 30
                            ? "text-orange-400"
                            : "text-green-400"
                        }`}
                      >
                        {subscriptionInfo.daysRemaining}
                      </span>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </div>
                </div>
                <Link
                  href="/upgrade"
                  className="mt-3 w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-xs font-bold py-2 px-3 rounded transition-all text-center block"
                >
                  {subscriptionInfo.hasSubscription ? "Gerenciar plano" : "Contratar plano"}
                </Link>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-xl sm:p-8">
              {/* Tool Content */}
              {!isAccessAllowed ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 text-center">
                  <div className="text-4xl">🔒</div>
                  <h2 className="text-xl font-bold sm:text-2xl">
                    Você ainda não tem um plano ativo
                  </h2>
                  <p className="max-w-xl text-sm text-gray-400 sm:text-base">
                    Para liberar jogos, análises e Melhores do Dia, contrate um plano.
                  </p>
                  <Link
                    href="/upgrade"
                    className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3 font-semibold text-white transition-colors hover:from-orange-600 hover:to-red-600 sm:w-auto"
                  >
                    Contratar plano
                  </Link>
                </div>
              ) : (
                <div className="min-h-[600px]">
                  {activeTool === "analysis" && <NbaAnalysisTool />}
                  {activeTool === "gold-list" && isDashboardToolEnabled("gold-list") && (
                    <GoldListTool />
                  )}
                  {activeTool === "live" && <NbaLiveTool />}
                  {activeTool === "reports" && isDashboardToolEnabled("reports") && (
                    <ReportsTool />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}

// Placeholder Components for each tool
function AnalysisTool() {
  const [matches, setMatches] = useState<any[]>([]);
  const [teamLogos, setTeamLogos] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      console.log("Buscando jogos da NBA...");

      // Buscar jogos NBA (mock por enquanto)
      const response = await fetch("/api/nba/matches?days=2");
      if (!response.ok) throw new Error("Erro ao buscar jogos da NBA");

      const data = await response.json();
      if (data.success) {
        const matchesData = data.data || [];

        console.log(
          `✅ Recebidos ${matchesData.length} jogos da NBA`
        );

        // Converter formato da API para o formato esperado pelo componente
        const formattedMatches = matchesData.map((match: any) => ({
          id: match.id,
          league: match.league,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          startTime: match.scheduledAt,
          tournament: match.tournament,
          tier: match.tier,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          status: match.status,
          gameName: match.gameName,
          odds: match.odds || {},
        }));

        setMatches(formattedMatches);
        setTeamLogos({});
      } else {
        throw new Error(data.error || "Erro na resposta da API");
      }
    } catch (err: any) {
      console.error("Erro ao buscar jogos da NBA:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = toBRTDate(dateString);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    });
  };

  const formatDate = (dateString: string) => {
    // Se já é uma data em BRT (vem do agrupamento), converte diretamente
    const date = toBRTDate(dateString);
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      timeZone: "America/Sao_Paulo",
    });
  };

  const getMatchStatus = (startTime: string | Date) => {
    const now = new Date();
    const matchTimeBRT = toBRTDate(startTime);

    if (matchTimeBRT < now) {
      return {
        text: "Finalizado",
        color: "text-zinc-500",
        bg: "bg-zinc-500/20",
      };
    } else if (matchTimeBRT.toDateString() === now.toDateString()) {
      return { text: "Hoje", color: "text-orange-400", bg: "bg-orange-500/20" };
    } else {
      return {
        text: "Próximo",
        color: "text-green-400",
        bg: "bg-green-500/20",
      };
    }
  };

  const getDayHeaderInfo = (dateKey: string) => {
    const now = new Date();
    const today = now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStr = tomorrow.toDateString();
    const dayAfterTomorrow = new Date(now);
    dayAfterTomorrow.setDate(now.getDate() + 2);
    const dayAfterTomorrowStr = dayAfterTomorrow.toDateString();

    if (dateKey === today) {
      return {
        label: "HOJE",
        style:
          "bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/50 text-orange-300",
        emoji: "",
      };
    } else if (dateKey === tomorrowStr) {
      return {
        label: "AMANHÃ",
        style:
          "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/50 text-blue-300",
        emoji: "",
      };
    } else if (dateKey === dayAfterTomorrowStr) {
      return {
        label: "DEPOIS DE AMANHÃ",
        style:
          "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/50 text-purple-300",
        emoji: "",
      };
    } else {
      return {
        label: formatDate(dateKey),
        style: "bg-zinc-500/20 border-zinc-500/50 text-zinc-300",
        emoji: "",
      };
    }
  };

  const getDayStats = (dateMatches: any[]) => {
    const tournaments = new Set(
      dateMatches.map((m) => m.tournament).filter(Boolean)
    );
    const totalTournaments = tournaments.size;

    // Encontrar melhor horário (mais jogos)
    const hourGroups = dateMatches.reduce((groups, match) => {
      const hour = toBRTDate(match.startTime).getHours();
      groups[hour] = (groups[hour] || 0) + 1;
      return groups;
    }, {} as Record<number, number>);

    const bestHour = Object.entries(hourGroups).reduce(
      (best, [hour, count]) =>
        (count as number) > (hourGroups[best] || 0) ? parseInt(hour) : best,
      0
    );

    return {
      totalGames: dateMatches.length,
      totalTournaments,
      bestHour:
        bestHour > 0 ? `${bestHour.toString().padStart(2, "0")}:00` : null,
    };
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p className="text-zinc-400">Carregando partidas do dia...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-xl font-bold mb-4 text-red-400">
          Erro ao carregar
        </h2>
        <p className="text-zinc-400 mb-8">{error}</p>
        <button
          onClick={fetchMatches}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold mb-1">🎯 Jogos da NBA - Pr?ximos Dias</h2>
          <p className="text-sm text-zinc-400">
            {matches.length} jogos encontrados • Hoje + 2 dias
          </p>
        </div>
        <button
          onClick={fetchMatches}
          className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm transition-colors"
        >
          🔄 Atualizar
        </button>
      </div>

      {/* Matches Grid - Organized by Date */}
      <div className="space-y-8">
        {/* Group matches by date */}
        {(
          Object.entries(
            matches.reduce((groups, match) => {
              const startTimeBRT = toBRTDate(match.startTime);
              const dateKey = startTimeBRT.toDateString();
              if (!groups[dateKey]) {
                groups[dateKey] = [];
              }
              groups[dateKey].push(match);
              return groups;
            }, {} as Record<string, any[]>)
          ) as [string, any[]][]
        )
          .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
          .map(([dateKey, dateMatches]) => (
            <div key={dateKey} className="space-y-4">
              {/* Date Header */}
              <div className="mb-6">
                <div
                  className={`inline-flex items-center px-6 py-3 rounded-xl border ${
                    getDayHeaderInfo(dateKey).style
                  }`}
                >
                  <div>
                    <h3 className="text-lg font-bold">
                      {getDayHeaderInfo(dateKey).label}
                    </h3>
                    <div className="text-xs opacity-80">
                      {getDayStats(dateMatches).totalGames} jogos •{" "}
                      {getDayStats(dateMatches).totalTournaments} torneios
                      {getDayStats(dateMatches).bestHour &&
                        ` • Pico às ${getDayStats(dateMatches).bestHour}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Matches for this date */}
              <div className="grid gap-4">
                {dateMatches
                  .sort(
                    (a, b) =>
                      toBRTDate(a.startTime).getTime() -
                      toBRTDate(b.startTime).getTime()
                  )
                  .map((match) => {
                    const status = getMatchStatus(match.startTime);
                    return (
                      <div
                        key={match.id}
                        className="bg-zinc-800/50 border border-zinc-700 rounded-xl overflow-hidden hover:border-orange-500/50 transition-all group"
                      >
                        {/* Nome do Torneio - MAIOR DESTAQUE */}
                        {match.tournament && (
                          <div className="bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 text-white text-center py-3 px-4 border-b border-zinc-600">
                            <h3 className="font-bold text-base uppercase tracking-wider text-zinc-200">
                              🏆 {match.tournament}
                            </h3>
                            <div className="text-xs text-zinc-400 mt-1">
                              TORNEIO OFICIAL
                            </div>
                          </div>
                        )}

                        <div className="p-6">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                            {/* Teams */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 flex-1 w-full">
                              {/* Home Team */}
                              <div className="flex flex-col items-center gap-2 min-w-[110px] sm:min-w-[130px] w-full sm:w-auto">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl flex items-center justify-center border border-orange-500/30 overflow-hidden">
                                  {teamLogos[match.homeTeam] ? (
                                    <img
                                      src={teamLogos[match.homeTeam]!}
                                      alt={`${match.homeTeam} logo`}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <span className="text-2xl">🏆</span>
                                  )}
                                </div>
                                <div className="text-center min-w-0">
                                  <div className="font-bold text-white text-sm leading-tight break-words">
                                    {match.homeTeam}
                                  </div>
                                  <div className="text-xs text-zinc-400 mt-1">
                                    Time A
                                  </div>
                                </div>
                              </div>

                              {/* VS */}
                              <div className="text-center px-4">
                                <div className="text-3xl font-bold text-orange-400 mb-1 group-hover:scale-110 transition-transform">
                                  VS
                                </div>
                                <div className="text-xs text-zinc-400 font-medium break-words">
                                  {match.league}
                                </div>
                              </div>

                              {/* Away Team */}
                              <div className="flex flex-col items-center gap-2 min-w-[110px] sm:min-w-[130px] w-full sm:w-auto">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-cyan-500/30 overflow-hidden">
                                  {teamLogos[match.awayTeam] ? (
                                    <img
                                      src={teamLogos[match.awayTeam]!}
                                      alt={`${match.awayTeam} logo`}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <span className="text-2xl">🎯</span>
                                  )}
                                </div>
                                <div className="text-center min-w-0">
                                  <div className="font-bold text-white text-sm leading-tight break-words">
                                    {match.awayTeam}
                                  </div>
                                  <div className="text-xs text-zinc-400 mt-1">
                                    Time B
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Time and Status */}
                            <div className="text-left sm:text-right w-full sm:w-auto">
                              <div className="text-xl font-bold text-orange-400 mb-1">
                                {formatTime(match.startTime)}
                              </div>
                              <div
                                className={`text-xs px-3 py-1 rounded-full font-medium ${status.bg} ${status.color}`}
                              >
                                {status.text}
                              </div>
                            </div>
                          </div>

                          {/* Odds Prominentes */}
                          {match.odds?.moneyline && (
                            <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg p-4 mb-4">
                              <div className="text-center mb-2">
                                <span className="text-orange-400 font-semibold text-sm uppercase tracking-wide">
                                  Cotações Moneyline
                                </span>
                              </div>
                              <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-orange-400 mb-1">
                                    {match.odds.moneyline.home.toFixed(2)}
                                  </div>
                                  <div className="text-xs text-gray-400 break-words">
                                    {match.homeTeam}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-gray-400 mb-1">
                                    {match.odds.moneyline.draw?.toFixed(2) ||
                                      "N/A"}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    Empate
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-cyan-400 mb-1">
                                    {match.odds.moneyline.away.toFixed(2)}
                                  </div>
                                  <div className="text-xs text-gray-400 break-words">
                                    {match.awayTeam}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Odds Preview */}
                          {match.odds.moneyline && (
                            <div className="mb-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-700/50">
                              <div className="text-sm text-zinc-400 mb-2">
                                Odds Moneyline (1X2)
                              </div>
                              <div className="flex gap-4 text-center">
                                <div className="flex-1">
                                  <div className="text-lg font-bold text-orange-400">
                                    {match.odds.moneyline.home?.toFixed(2) ||
                                      "N/A"}
                                  </div>
                                  <div className="text-xs text-zinc-400">
                                    {match.homeTeam}
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="text-lg font-bold text-zinc-500">
                                    {match.odds.moneyline.draw?.toFixed(2) ||
                                      "N/A"}
                                  </div>
                                  <div className="text-xs text-zinc-400">
                                    Empate
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="text-lg font-bold text-cyan-400">
                                    {match.odds.moneyline.away?.toFixed(2) ||
                                      "N/A"}
                                  </div>
                                  <div className="text-xs text-zinc-400">
                                    {match.awayTeam}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-3">
                            <button
                              type="button"
                              disabled
                              className="w-full bg-zinc-800 text-zinc-400 font-bold py-3 px-4 rounded-lg text-sm cursor-not-allowed"
                            >
                              ANÁLISE PRÉ-JOGO (EM BREVE)
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
      </div>

    </div>
  );
}

// Função auxiliar para gerar estatísticas mockadas de jogadores
function getMockPlayerStats(teamName: string) {
  // Dados mockados baseados em estatísticas reais aproximadas
  const mockStats = {
    FURIA: [
      {
        name: "yuurih",
        role: "Rifler",
        killsPerMatch: 18.5,
        deathsPerMatch: 14.2,
        kdRatio: 1.3,
        rating: 1.15,
        headshotPercentage: 45,
        clutchesPerMatch: 0.3,
      },
      {
        name: "arT",
        role: "Rifler",
        killsPerMatch: 17.8,
        deathsPerMatch: 13.9,
        kdRatio: 1.28,
        rating: 1.12,
        headshotPercentage: 42,
        clutchesPerMatch: 0.2,
      },
      {
        name: "KSCERATO",
        role: "Rifler",
        killsPerMatch: 16.2,
        deathsPerMatch: 15.1,
        kdRatio: 1.07,
        rating: 1.08,
        headshotPercentage: 38,
        clutchesPerMatch: 0.4,
      },
      {
        name: "saadzin",
        role: "AWPer",
        killsPerMatch: 15.9,
        deathsPerMatch: 14.8,
        kdRatio: 1.07,
        rating: 1.05,
        headshotPercentage: 52,
        clutchesPerMatch: 0.1,
      },
      {
        name: "drop",
        role: "IGL",
        killsPerMatch: 14.1,
        deathsPerMatch: 13.7,
        kdRatio: 1.03,
        rating: 1.02,
        headshotPercentage: 35,
        clutchesPerMatch: 0.2,
      },
    ],
    "Natus Vincere": [
      {
        name: "s1mple",
        role: "AWPer",
        killsPerMatch: 22.1,
        deathsPerMatch: 12.8,
        kdRatio: 1.73,
        rating: 1.35,
        headshotPercentage: 58,
        clutchesPerMatch: 0.5,
      },
      {
        name: "electronic",
        role: "Rifler",
        killsPerMatch: 19.2,
        deathsPerMatch: 13.5,
        kdRatio: 1.42,
        rating: 1.22,
        headshotPercentage: 48,
        clutchesPerMatch: 0.3,
      },
      {
        name: "b1t",
        role: "Rifler",
        killsPerMatch: 18.7,
        deathsPerMatch: 14.1,
        kdRatio: 1.33,
        rating: 1.18,
        headshotPercentage: 44,
        clutchesPerMatch: 0.4,
      },
      {
        name: "Perfecto",
        role: "Rifler",
        killsPerMatch: 17.3,
        deathsPerMatch: 14.9,
        kdRatio: 1.16,
        rating: 1.09,
        headshotPercentage: 41,
        clutchesPerMatch: 0.2,
      },
      {
        name: "jL",
        role: "IGL",
        killsPerMatch: 15.8,
        deathsPerMatch: 14.2,
        kdRatio: 1.11,
        rating: 1.06,
        headshotPercentage: 39,
        clutchesPerMatch: 0.3,
      },
    ],
    "FaZe Clan": [
      {
        name: "ropz",
        role: "Rifler",
        killsPerMatch: 19.5,
        deathsPerMatch: 13.7,
        kdRatio: 1.42,
        rating: 1.25,
        headshotPercentage: 46,
        clutchesPerMatch: 0.4,
      },
      {
        name: "broky",
        role: "Rifler",
        killsPerMatch: 18.9,
        deathsPerMatch: 14.2,
        kdRatio: 1.33,
        rating: 1.19,
        headshotPercentage: 43,
        clutchesPerMatch: 0.3,
      },
      {
        name: "rain",
        role: "Rifler",
        killsPerMatch: 17.8,
        deathsPerMatch: 14.8,
        kdRatio: 1.2,
        rating: 1.14,
        headshotPercentage: 40,
        clutchesPerMatch: 0.2,
      },
      {
        name: "frozen",
        role: "IGL",
        killsPerMatch: 16.4,
        deathsPerMatch: 15.1,
        kdRatio: 1.09,
        rating: 1.07,
        headshotPercentage: 37,
        clutchesPerMatch: 0.3,
      },
      {
        name: "karrigan",
        role: "IGL",
        killsPerMatch: 15.2,
        deathsPerMatch: 14.9,
        kdRatio: 1.02,
        rating: 1.03,
        headshotPercentage: 35,
        clutchesPerMatch: 0.2,
      },
    ],
    "G2 Esports": [
      {
        name: "NiKo",
        role: "Rifler",
        killsPerMatch: 20.1,
        deathsPerMatch: 13.4,
        kdRatio: 1.5,
        rating: 1.28,
        headshotPercentage: 47,
        clutchesPerMatch: 0.4,
      },
      {
        name: "huNter-",
        role: "Rifler",
        killsPerMatch: 18.6,
        deathsPerMatch: 14.1,
        kdRatio: 1.32,
        rating: 1.18,
        headshotPercentage: 44,
        clutchesPerMatch: 0.3,
      },
      {
        name: "m0NESY",
        role: "Rifler",
        killsPerMatch: 17.9,
        deathsPerMatch: 14.7,
        kdRatio: 1.22,
        rating: 1.15,
        headshotPercentage: 42,
        clutchesPerMatch: 0.2,
      },
      {
        name: "malbsMd",
        role: "Rifler",
        killsPerMatch: 16.8,
        deathsPerMatch: 15.2,
        kdRatio: 1.11,
        rating: 1.08,
        headshotPercentage: 39,
        clutchesPerMatch: 0.3,
      },
      {
        name: "Snax",
        role: "IGL",
        killsPerMatch: 15.7,
        deathsPerMatch: 14.8,
        kdRatio: 1.06,
        rating: 1.04,
        headshotPercentage: 36,
        clutchesPerMatch: 0.2,
      },
    ],
    "Team Vitality": [
      {
        name: "ZywOo",
        role: "AWPer",
        killsPerMatch: 21.3,
        deathsPerMatch: 12.9,
        kdRatio: 1.65,
        rating: 1.32,
        headshotPercentage: 55,
        clutchesPerMatch: 0.5,
      },
      {
        name: "apEX",
        role: "Rifler",
        killsPerMatch: 18.4,
        deathsPerMatch: 14.3,
        kdRatio: 1.29,
        rating: 1.16,
        headshotPercentage: 43,
        clutchesPerMatch: 0.3,
      },
      {
        name: "Spinx",
        role: "Rifler",
        killsPerMatch: 17.7,
        deathsPerMatch: 14.9,
        kdRatio: 1.19,
        rating: 1.12,
        headshotPercentage: 41,
        clutchesPerMatch: 0.2,
      },
      {
        name: "flameZ",
        role: "Rifler",
        killsPerMatch: 16.9,
        deathsPerMatch: 15.1,
        kdRatio: 1.12,
        rating: 1.09,
        headshotPercentage: 38,
        clutchesPerMatch: 0.3,
      },
      {
        name: "mezii",
        role: "IGL",
        killsPerMatch: 15.8,
        deathsPerMatch: 14.7,
        kdRatio: 1.07,
        rating: 1.05,
        headshotPercentage: 37,
        clutchesPerMatch: 0.2,
      },
    ],
  };

  return (
    mockStats[teamName as keyof typeof mockStats] || [
      {
        name: "Jogador 1",
        role: "Rifler",
        killsPerMatch: 16.0,
        deathsPerMatch: 15.0,
        kdRatio: 1.07,
        rating: 1.05,
        headshotPercentage: 40,
        clutchesPerMatch: 0.2,
      },
      {
        name: "Jogador 2",
        role: "Rifler",
        killsPerMatch: 15.5,
        deathsPerMatch: 15.2,
        kdRatio: 1.02,
        rating: 1.02,
        headshotPercentage: 38,
        clutchesPerMatch: 0.3,
      },
      {
        name: "Jogador 3",
        role: "Rifler",
        killsPerMatch: 14.8,
        deathsPerMatch: 15.8,
        kdRatio: 0.94,
        rating: 0.98,
        headshotPercentage: 35,
        clutchesPerMatch: 0.1,
      },
      {
        name: "Jogador 4",
        role: "AWPer",
        killsPerMatch: 14.2,
        deathsPerMatch: 15.5,
        kdRatio: 0.92,
        rating: 0.96,
        headshotPercentage: 45,
        clutchesPerMatch: 0.2,
      },
      {
        name: "Jogador 5",
        role: "IGL",
        killsPerMatch: 13.5,
        deathsPerMatch: 15.9,
        kdRatio: 0.85,
        rating: 0.92,
        headshotPercentage: 32,
        clutchesPerMatch: 0.1,
      },
    ]
  );
}

// Componente para exibir estatísticas de jogadores de um time
function PlayerStatsSection({
  teamName,
  teamColor,
}: {
  teamName: string;
  teamColor: "orange" | "cyan";
}) {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        // Tentar buscar dados reais primeiro
        const response = await fetch("/api/pandascore/player-stats", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ teamName }),
        });

        const data = await response.json();

        if (data.success && data.data) {
          console.log(
            `✅ Dados reais encontrados para ${data.data.length} jogadores de ${teamName}`
          );
          setPlayers(data.data);
        } else {
          // Fallback para dados mockados
          console.log(`📊 Usando dados mockados para ${teamName}`);
          setPlayers(getMockPlayerStats(teamName));
        }
      } catch (err: any) {
        console.error(`❌ Erro ao buscar jogadores de ${teamName}:`, err);
        // Fallback para dados mockados
        setPlayers(getMockPlayerStats(teamName));
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, [teamName]);

  if (loading) {
    return (
      <div className="mb-8">
        <h4
          className={`text-lg font-bold mb-4 flex items-center gap-2 ${
            teamColor === "orange" ? "text-orange-400" : "text-cyan-400"
          }`}
        >
          <span className="text-sm">
            {teamColor === "orange" ? "🏆" : "🎯"}
          </span>
          {teamName}
        </h4>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
          <span className="ml-3 text-zinc-400">Carregando jogadores...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8">
        <h4
          className={`text-lg font-bold mb-4 flex items-center gap-2 ${
            teamColor === "orange" ? "text-orange-400" : "text-cyan-400"
          }`}
        >
          <span className="text-sm">
            {teamColor === "orange" ? "🏆" : "🎯"}
          </span>
          {teamName}
        </h4>
        <div className="text-center py-8 text-red-400">
          Erro ao carregar dados: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h4
        className={`text-lg font-bold mb-4 flex items-center gap-2 ${
          teamColor === "orange" ? "text-orange-400" : "text-cyan-400"
        }`}
      >
        <span className="text-sm">{teamColor === "orange" ? "🏆" : "🎯"}</span>
        {teamName}
        {players.some((p) => p.realData) && (
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded ml-2">
            Dados Reais
          </span>
        )}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {players.map((player, index) => (
          <div
            key={index}
            className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 hover:border-zinc-600 transition-colors"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 bg-gradient-to-br ${
                  teamColor === "orange"
                    ? "from-orange-500/20 to-red-500/20"
                    : "from-cyan-500/20 to-blue-500/20"
                } rounded-full flex items-center justify-center overflow-hidden`}
              >
                {player.imageUrl ? (
                  <img
                    src={player.imageUrl}
                    alt={player.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg">👤</span>
                )}
              </div>
              <div>
                <h5 className="font-bold text-white text-sm">{player.name}</h5>
                <p className="text-xs text-zinc-400">
                  {player.role}
                  {player.nationality && (
                    <span className="ml-1 text-zinc-500">
                      ({player.nationality})
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Kills/Match:</span>
                <span className="font-bold text-green-400">
                  {player.killsPerMatch?.toFixed(1) || "0.0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Deaths/Match:</span>
                <span className="font-bold text-red-400">
                  {player.deathsPerMatch?.toFixed(1) || "0.0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">K/D Ratio:</span>
                <span className="font-bold text-cyan-400">
                  {player.kdRatio?.toFixed(2) || "0.00"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Rating:</span>
                <span className="font-bold text-yellow-400">
                  {player.rating?.toFixed(2) || "0.00"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Headshot %:</span>
                <span className="font-bold text-purple-400">
                  {player.headshotPercentage?.toFixed(0) || "0"}%
                </span>
              </div>
              {player.matchesPlayed && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Partidas:</span>
                  <span className="font-bold text-blue-400">
                    {player.matchesPlayed}
                  </span>
                </div>
              )}
              {player.winRate && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Win Rate:</span>
                  <span className="font-bold text-emerald-400">
                    {player.winRate.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveTool() {
  interface LiveMatch {
    id: string;
    time: string;
    league: {
      name: string;
      id?: string;
    };
    home: { name: string; id?: string };
    away: { name: string; id?: string };
    status: string;
    scores?: { home: number; away: number };
    timer?: string;
    totalRounds?: number;
    scoreDiff?: number;
    momentum?: "equilibrado" | "vantagem_home" | "vantagem_away";
    statusText?: string;
  }

  interface APIResponse {
    success: boolean;
    data: LiveMatch[];
    totalLiveMatches?: number;
    metadata?: { recommendations?: string[] };
  }

  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchLiveMatches = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/live-matches");
      const data: APIResponse = await response.json();

      if (data.success) {
        setLiveMatches(data.data || []);
        setLastUpdate(new Date());
      } else {
        setLiveMatches([]);
        setError(
          data.metadata?.recommendations?.[0] ||
            "Nenhum jogo ao vivo encontrado"
        );
      }
    } catch (err) {
      console.error("Erro ao buscar jogos ao vivo:", err);
      setError("Erro ao carregar jogos ao vivo");
      setLiveMatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveMatches();
    const interval = setInterval(fetchLiveMatches, 30000);
    return () => clearInterval(interval);
  }, []);

  const getTeamLogo = (teamName: string) => {
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
    };
    return logoMap[teamName] || "/icons/counterstrike.svg";
  };

  const formatTime = (dateString: string) => {
    const date = toBRTDate(dateString);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "live":
      case "1":
        return "bg-red-500";
      case "scheduled":
      case "0":
        return "bg-blue-500";
      case "finished":
      case "2":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case "live":
      case "1":
        return "AO VIVO";
      case "scheduled":
      case "0":
        return "AGENDADO";
      case "finished":
      case "2":
        return "FINALIZADO";
      default:
        return "DESCONHECIDO";
    }
  };

  const getFavoriteInfo = (match: LiveMatch) => {
    const home = match.scores?.home ?? 0;
    const away = match.scores?.away ?? 0;
    const diff = Math.abs(home - away);

    if (home === away) {
      return { team: null, confidence: "Baixa", reason: "Placar empatado" };
    }

    const leader = home > away ? match.home.name : match.away.name;
    let confidence = "Baixa";
    if (diff >= 6) confidence = "Alta";
    else if (diff >= 3) confidence = "Média";

    return {
      team: leader,
      confidence,
      reason: `Diferença de ${diff} round(s)`,
    };
  };

  const getLineSuggestion = (match: LiveMatch) => {
    const total = (match.scores?.home ?? 0) + (match.scores?.away ?? 0);

    // Heurística simples baseada no total de rounds já jogados.
    if (total >= 24) {
      return {
        label: "Tendência Over 26.5 rounds",
        color: "text-green-400",
        reason: "Jogo longo, times trocando rounds",
      };
    }
    if (total <= 10) {
      return {
        label: "Tendência Under 26.5 rounds",
        color: "text-yellow-300",
        reason: "Jogo curto até agora",
      };
    }
    return {
      label: "Equilíbrio — aguardar mais dados",
      color: "text-zinc-300",
      reason: "Placar ainda não indica linha clara",
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Dashboard LIVE</h2>
          <p className="text-sm text-zinc-400">
            Jogos ao vivo em tempo real
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchLiveMatches}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-60 text-sm border border-zinc-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
          <Link
            href="/jogoslive"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-sm font-semibold"
          >
            Abrir em tela cheia
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {lastUpdate && (
        <div className="text-xs text-zinc-500">
          Atualizado em: {lastUpdate.toLocaleString("pt-BR")}
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-300 font-semibold mb-2">
            Atenção
          </div>
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {loading && liveMatches.length === 0 && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6 text-center">
          <div className="flex items-center justify-center gap-2 text-zinc-300">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Buscando jogos ao vivo...
          </div>
        </div>
      )}

      {!loading && liveMatches.length === 0 && !error && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6 text-center">
          <p className="text-zinc-300 font-semibold">
            Nenhum jogo ao vivo agora
          </p>
          <p className="text-zinc-500 text-sm mt-1">
            Volte em alguns minutos ou durante horários de torneios.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {liveMatches.map((match) => (
          <div
            key={match.id}
            className="border border-zinc-800 rounded-xl bg-zinc-900/60 overflow-hidden"
          >
            <div className={`h-1 ${getStatusColor(match.status)}`}></div>
            <div className="p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold text-white ${getStatusColor(
                      match.status
                    )}`}
                  >
                    {getStatusText(match.status)}
                  </span>
                  <span className="text-sm text-zinc-400">
                    {match.league.name}
                  </span>
                </div>
                {match.timer && (
                  <div className="flex items-center gap-1 text-orange-400 text-sm font-mono">
                    <Clock className="w-4 h-4" />
                    {match.timer}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 mx-auto rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700 overflow-hidden">
                    <img
                      src={getTeamLogo(match.home.name)}
                      alt={match.home.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-sm font-semibold">{match.home.name}</div>
                  <div className="text-2xl font-mono font-bold text-orange-400">
                    {match.scores?.home ?? 0}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-lg font-bold text-zinc-400 mb-2">VS</div>
                  {match.status === "1" && (
                    <Play className="mx-auto text-red-500 animate-pulse" />
                  )}
                </div>

                <div className="text-center space-y-2">
                  <div className="w-14 h-14 mx-auto rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700 overflow-hidden">
                    <img
                      src={getTeamLogo(match.away.name)}
                      alt={match.away.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-sm font-semibold">{match.away.name}</div>
                  <div className="text-2xl font-mono font-bold text-orange-400">
                    {match.scores?.away ?? 0}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-400 border-t border-zinc-800 pt-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {formatTime(match.time)}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {match.league.name}
                </div>
              </div>

              {/* Insights rápidos */}
              <div className="border-t border-zinc-800 pt-3">
                <div className="flex flex-col gap-3 text-sm text-zinc-300">
                  {(() => {
                    const fav = getFavoriteInfo(match);
                    return (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs font-semibold">
                          Favorito ao vivo
                        </span>
                        <span className="font-semibold">
                          {fav.team ? fav.team : "Sem favorito claro"}
                        </span>
                        <span className="text-xs text-zinc-500">
                          Confiança: {fav.confidence} ({fav.reason})
                        </span>
                      </div>
                    );
                  })()}

                  {(() => {
                    const line = getLineSuggestion(match);
                    return (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs font-semibold">
                          Linha sugerida
                        </span>
                        <span className={`font-semibold ${line.color}`}>
                          {line.label}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {line.reason}
                        </span>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                    <div className="px-3 py-2 rounded bg-zinc-800/50 border border-zinc-800">
                      <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                        Total de rounds
                      </div>
                      <div className="text-zinc-200 font-semibold">
                        {match.totalRounds ?? (match.scores?.home ?? 0) + (match.scores?.away ?? 0)}
                      </div>
                    </div>
                    <div className="px-3 py-2 rounded bg-zinc-800/50 border border-zinc-800">
                      <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                        Momentum
                      </div>
                      <div className="text-zinc-200 font-semibold">
                        {match.momentum === "vantagem_home"
                          ? `Vantagem ${match.home.name}`
                          : match.momentum === "vantagem_away"
                          ? `Vantagem ${match.away.name}`
                          : "Equilibrado"}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500 mt-2">
                  Sugestões indicativas baseadas no placar ao vivo. Não é
                  recomendação de aposta.
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Análise Pré-Live Modal Component
function PreLiveAnalysisModal({
  match,
  teamLogos,
  onClose,
}: {
  match: any;
  teamLogos: Record<string, string | null>;
  onClose: () => void;
}) {
  const [analyzingMatch, setAnalyzingMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Removido: const [activeTab, setActiveTab] = useState<"overview" | "teams" | "players" | "predictions">("overview");
  const startTimeBRT = toBRTDate(match.startTime);

  // Impede rolagem de fundo enquanto o modal está aberto
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        console.log(
          `🎯 Buscando análise para: ${match.homeTeam} vs ${match.awayTeam}`
        );

        // Chamar a API de análise específica para este jogo
        const response = await fetch(
          `/api/pandascore/match-analysis?team1=${encodeURIComponent(
            match.homeTeam
          )}&team2=${encodeURIComponent(
            match.awayTeam
          )}&matchId=${encodeURIComponent(
            match.id
          )}&scheduledAt=${encodeURIComponent(
            match.startTime
          )}&tournament=${encodeURIComponent(
            match.tournament || ""
          )}&homeTeamId=${encodeURIComponent(
            match.homeTeamId ?? ""
          )}&awayTeamId=${encodeURIComponent(
            match.awayTeamId ?? ""
          )}&source=prelive`
          );

        if (!response.ok) {
          throw new Error(
            `Erro na API: ${response.status} - ${response.statusText}`
          );
        }

        const data = await response.json();
        console.log("📊 Resposta da análise:", data);

        if (data.success && data.data) {
          // Formatar dados para o formato esperado pelo componente
          const formattedMatch = {
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            startTime: match.startTime,
            insights: data.data.analysis?.insights || [],
            pandascoreAnalysis: {
              team1Stats: data.data.team1Stats,
              team2Stats: data.data.team2Stats,
            },
            predictions: data.data.analysis?.predictions,
            premiumStats: data.data.premiumStats,
            premiumInsights: data.data.analysis?.insights,
          };

          console.log("✅ Análise formatada:", formattedMatch);
          setAnalyzingMatch(formattedMatch);
        } else {
          throw new Error(data.error || "Análise não disponível");
        }
      } catch (err: any) {
        console.error("❌ Erro ao buscar análise:", err);
        setAnalyzingMatch({
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          startTime: match.startTime,
          insights: [`Erro ao carregar análise: ${err.message}`],
          pandascoreAnalysis: undefined,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [match]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-xl shadow-black/40">
        {/* Header */}
        <div className="p-6 border-b border-zinc-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              🎯 ANÁLISE PRÉ-LIVE
            </h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          {/* Match Info */}
          <div className="flex items-center justify-center gap-6 mb-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl flex items-center justify-center border border-orange-500/30 overflow-hidden mb-2">
                {teamLogos[match.homeTeam] ? (
                  <img
                    src={teamLogos[match.homeTeam]!}
                    alt={`${match.homeTeam} logo`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-2xl">🏆</span>
                )}
              </div>
              <h3 className="font-bold text-white">{match.homeTeam}</h3>
            </div>

            <div className="text-center">
              <div className="text-4xl font-bold text-orange-400 mb-2">VS</div>
              <div className="text-sm text-zinc-400">
                {startTimeBRT.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "short",
                  timeZone: "America/Sao_Paulo",
                })}
              </div>
              <div className="text-lg font-bold text-orange-400">
                {startTimeBRT.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "America/Sao_Paulo",
                })}
              </div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-cyan-500/30 overflow-hidden mb-2">
                {teamLogos[match.awayTeam] ? (
                  <img
                    src={teamLogos[match.awayTeam]!}
                    alt={`${match.awayTeam} logo`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-2xl">🎯</span>
                )}
              </div>
              <h3 className="font-bold text-white">{match.awayTeam}</h3>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Carregando análise pré-live...</p>
            </div>
          ) : analyzingMatch ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-4">
                  Visão Geral da Partida
                </h3>
                <MatchCard match={analyzingMatch} />
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-red-500">Erro ao carregar dados da partida</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



