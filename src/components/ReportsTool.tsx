"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, CheckCircle, Clock, RefreshCw, XCircle } from "lucide-react";

type ReportSummary = {
  total: number;
  wins: number;
  losses: number;
  pending: number;
  voided: number;
  accuracy: number;
  windowDays: number;
};

type ReportItem = {
  id: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  tournament?: string | null;
  scheduledAt?: string | null;
  predictedWinner: string;
  actualWinner?: string | null;
  confidence: number;
  status: "PENDING" | "WIN" | "LOSS" | "VOID";
  scoreHome?: number | null;
  scoreAway?: number | null;
};

export default function ReportsTool() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async (refresh = false) => {
    try {
      setError(null);
      refresh ? setRefreshing(true) : setLoading(true);
      const response = await fetch(
        `/api/reports/favorites${refresh ? "?refresh=true" : ""}`
      );
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Erro ao carregar relatorio");
      }
      setSummary(data.data.summary);
      setItems(data.data.items || []);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar relatorio");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(false);
  }, [fetchReport]);

  const formatDate = (value?: string | null) => {
    if (!value) return "Data indefinida";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "Data indefinida";
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusBadge = (status: ReportItem["status"]) => {
    switch (status) {
      case "WIN":
        return "bg-green-500/20 text-green-300 border-green-500/40";
      case "LOSS":
        return "bg-red-500/20 text-red-300 border-red-500/40";
      case "VOID":
        return "bg-zinc-700/40 text-zinc-300 border-zinc-600";
      default:
        return "bg-yellow-500/10 text-yellow-300 border-yellow-500/30";
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-zinc-400">Carregando relatorios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-black p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(234,88,12,0.18),_transparent_45%),radial-gradient(circle_at_center,_rgba(37,99,235,0.16),_transparent_45%)]" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-orange-400 text-sm font-semibold">
              <BarChart3 className="w-4 h-4" />
              Relatorio de favoritismo
            </div>
            <h2 className="text-2xl font-bold text-white mt-2">
              Desempenho das previsoes pre-live
            </h2>
            <p className="text-sm text-zinc-400 mt-2 max-w-xl">
              Acompanhe quantas vezes o favorito indicado venceu e use isso
              como prova social para conversao.
            </p>
          </div>
          <button
            onClick={() => fetchReport(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-200 hover:bg-orange-500/20 transition-colors disabled:opacity-60"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Atualizar resultados
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-300">
          {error}
        </div>
      )}

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
            <div className="text-xs text-zinc-400">Total analisado</div>
            <div className="text-2xl font-bold text-white">
              {summary.total}
            </div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
            <div className="text-xs text-zinc-400">Acertos</div>
            <div className="text-2xl font-bold text-green-400">
              {summary.wins}
            </div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
            <div className="text-xs text-zinc-400">Erros</div>
            <div className="text-2xl font-bold text-red-400">
              {summary.losses}
            </div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
            <div className="text-xs text-zinc-400">Taxa de acerto</div>
            <div className="text-2xl font-bold text-orange-300">
              {summary.accuracy.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Historico</h3>
            <p className="text-xs text-zinc-400">
              Ultimos {summary?.windowDays ?? 30} dias
            </p>
          </div>
          <div className="text-xs text-zinc-500">
            {summary?.pending ?? 0} pendentes
          </div>
        </div>
        <div className="divide-y divide-zinc-800">
          {items.length === 0 && (
            <div className="p-6 text-center text-zinc-500">
              Nenhuma previsao registrada ainda.
            </div>
          )}
          {items.map((item) => (
            <div key={item.id} className="p-6 flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusBadge(
                    item.status
                  )}`}
                >
                  {item.status === "WIN"
                    ? "ACERTOU"
                    : item.status === "LOSS"
                    ? "ERROU"
                    : item.status === "VOID"
                    ? "SEM RESULTADO"
                    : "PENDENTE"}
                </span>
                <span className="text-sm text-zinc-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {formatDate(item.scheduledAt)}
                </span>
                {item.tournament && (
                  <span className="text-xs text-zinc-500">
                    {item.tournament}
                  </span>
                )}
              </div>

              <div className="grid md:grid-cols-[1fr,1fr,auto] gap-4 items-center">
                <div>
                  <div className="text-sm text-zinc-400">Confronto</div>
                  <div className="text-lg font-semibold text-white">
                    {item.homeTeam} vs {item.awayTeam}
                  </div>
                  {(item.scoreHome !== null || item.scoreAway !== null) && (
                    <div className="text-sm text-zinc-500">
                      Placar: {item.scoreHome ?? "-"} x {item.scoreAway ?? "-"}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm text-zinc-400">Favorito indicado</div>
                  <div className="text-lg font-semibold text-orange-300">
                    {item.predictedWinner}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Confianca: {Math.round(item.confidence)}%
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm font-semibold">
                  {item.status === "WIN" && (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                  {item.status === "LOSS" && (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  {item.status === "PENDING" && (
                    <Clock className="w-5 h-5 text-yellow-400" />
                  )}
                  <span className="text-zinc-200">
                    {item.actualWinner || "Resultado pendente"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
