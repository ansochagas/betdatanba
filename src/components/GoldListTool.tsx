"use client";

import { useEffect, useState } from "react";
import { Calendar, RefreshCw, Trophy, TrendingUp } from "lucide-react";
import { NbaGoldListPick, NbaGoldListResponse } from "@/modules/nba/types";

const getConfidenceBadge = (level: NbaGoldListPick["confidenceLevel"]) => {
  if (level === "alta") return "text-green-300 bg-green-500/20 border border-green-500/30";
  if (level === "media") return "text-yellow-300 bg-yellow-500/20 border border-yellow-500/30";
  return "text-red-300 bg-red-500/20 border border-red-500/30";
};

const formatDate = (dateString: string): string => {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatMatchDateTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  const datePart = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  const timePart = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  });
  return `${datePart} as ${timePart}`;
};

export default function GoldListTool() {
  const [data, setData] = useState<NbaGoldListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoldList = async (force = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/nba/gold-list?days=2${force ? "&force=true" : ""}`);
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Nao foi possivel carregar a Gold List NBA.");
      }

      setData(result.data as NbaGoldListResponse);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro de conexao.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoldList();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
        <span className="ml-4 text-zinc-400">Carregando Gold List NBA...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-3">Erro</div>
        <p className="text-zinc-400 mb-6">{error}</p>
        <button
          onClick={() => fetchGoldList(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Gold List NBA</h2>
              <p className="text-zinc-400 text-sm">Ranking pre-jogo com score de oportunidade</p>
            </div>
          </div>

          <button
            onClick={() => fetchGoldList(true)}
            className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 px-4 py-2 rounded-lg text-sm"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-zinc-800/60 rounded-lg p-3">
            <div className="text-zinc-400">Data</div>
            <div className="text-white mt-1 inline-flex items-center gap-2">
              <Calendar size={14} />
              {formatDate(data.date)}
            </div>
          </div>
          <div className="bg-zinc-800/60 rounded-lg p-3">
            <div className="text-zinc-400">Jogos</div>
            <div className="text-orange-300 font-semibold mt-1">{data.metadata.totalMatches}</div>
          </div>
          <div className="bg-zinc-800/60 rounded-lg p-3">
            <div className="text-zinc-400">Analisados</div>
            <div className="text-cyan-300 font-semibold mt-1">{data.metadata.analyzedMatches}</div>
          </div>
          <div className="bg-zinc-800/60 rounded-lg p-3">
            <div className="text-zinc-400">Oportunidades</div>
            <div className="text-green-300 font-semibold mt-1">{data.metadata.opportunitiesCount}</div>
          </div>
        </div>

        {data.metadata.warnings.length > 0 && (
          <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 rounded-lg p-3 text-sm">
            {data.metadata.warnings.map((warning, index) => (
              <p key={`${warning}-${index}`}>{warning}</p>
            ))}
          </div>
        )}
      </div>

      {data.picks.length === 0 ? (
        <div className="bg-zinc-900/50 border border-zinc-700 rounded-xl p-8 text-center">
          <p className="text-zinc-300">Nenhuma oportunidade clara encontrada para hoje.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.picks.map((pick) => (
            <article
              key={`${pick.match.id}-${pick.rank}`}
              className="bg-zinc-900/50 border border-zinc-700 rounded-xl p-5"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <div className="text-xs text-zinc-400">#{pick.rank} do dia</div>
                  <h3 className="text-lg font-semibold text-white mt-1">
                    {pick.match.homeTeam} vs {pick.match.awayTeam}
                  </h3>
                  <p className="text-zinc-400 text-sm mt-1">
                    {pick.match.tournament} - {formatMatchDateTime(pick.match.scheduledAt)}
                  </p>
                  <p className="text-zinc-300 text-sm mt-3">{pick.summary}</p>
                </div>

                <div className="lg:text-right space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-sm">
                    <TrendingUp size={14} />
                    Score {pick.score.toFixed(1)}
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">Recomendacao</div>
                    <div className="text-orange-300 font-semibold">
                      Moneyline {pick.recommendation.team} @ {pick.recommendation.odds.toFixed(2)}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">
                      Edge {pick.recommendation.edge.toFixed(1)} p.p. | Modelo {pick.recommendation.modelProbability.toFixed(1)}%
                    </div>
                  </div>
                  <div className={`inline-flex px-2 py-1 rounded text-xs ${getConfidenceBadge(pick.confidenceLevel)}`}>
                    Confianca {pick.confidenceLevel}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-400 mb-3">{pick.confidenceReason}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {pick.supportSignals.slice(0, 3).map((signal) => (
                    <div
                      key={signal.key}
                      className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">{signal.title}</span>
                        <span className="text-xs text-zinc-400">Impacto {signal.impact.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-2">{signal.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4">
        <p className="text-zinc-400 text-xs">
          MVP pre-jogo: score combina forma recente, split casa/fora, descanso e variacao de odds. Use como apoio,
          nao como garantia de resultado.
        </p>
      </div>
    </div>
  );
}
