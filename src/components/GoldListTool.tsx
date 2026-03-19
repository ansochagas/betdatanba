"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Clock3,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  NbaGoldListMarket,
  NbaGoldListPick,
  NbaGoldListResponse,
} from "@/modules/nba/types";

const marketTheme: Record<
  NbaGoldListMarket,
  {
    chip: string;
    accent: string;
    panel: string;
    ring: string;
    label: string;
  }
> = {
  points: {
    chip: "border-amber-200/12 bg-amber-50/[0.06] text-amber-100",
    accent: "text-amber-100",
    panel: "from-amber-50/[0.05] via-zinc-900 to-zinc-950",
    ring: "border-amber-100/10",
    label: "Pontos",
  },
  rebounds: {
    chip: "border-sky-200/12 bg-sky-50/[0.05] text-sky-100",
    accent: "text-sky-100",
    panel: "from-sky-50/[0.05] via-zinc-900 to-zinc-950",
    ring: "border-sky-100/10",
    label: "Rebotes",
  },
  assists: {
    chip: "border-emerald-200/12 bg-emerald-50/[0.05] text-emerald-100",
    accent: "text-emerald-100",
    panel: "from-emerald-50/[0.05] via-zinc-900 to-zinc-950",
    ring: "border-emerald-100/10",
    label: "Assistencias",
  },
};

const confidenceTheme: Record<string, string> = {
  alta: "border-emerald-200/12 bg-emerald-50/[0.05] text-emerald-100",
  media: "border-amber-200/12 bg-amber-50/[0.05] text-amber-100",
  baixa: "border-rose-200/12 bg-rose-50/[0.05] text-rose-100",
};

const matchupLabel: Record<string, string> = {
  muito_favoravel: "Muito favoravel",
  favoravel: "Favoravel",
  neutro: "Neutro",
  dificil: "Mais duro",
};

const trendLabel: Record<string, string> = {
  subindo: "Subindo",
  estavel: "Estavel",
  caindo: "Caindo",
};

const formatDate = (dateString: string): string => {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${dateString}T12:00:00Z`));
};

const formatTime = (isoDate: string): string => {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  }).format(new Date(isoDate));
};

const formatNumber = (value: number): string =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);

const getConfidenceBadge = (value: string): string =>
  confidenceTheme[value] || confidenceTheme.media;

const SectionAnchor = ({ href, label }: { href: string; label: string }) => (
  <a
    href={href}
    className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300 transition hover:border-zinc-500 hover:text-white"
  >
    {label}
  </a>
);

function PickCard({
  pick,
  featured = false,
}: {
  pick: NbaGoldListPick;
  featured?: boolean;
}) {
  const theme = marketTheme[pick.market];

  return (
    <article
      className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br ${theme.panel} ${theme.ring} p-5 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.85)] ${
        featured ? "min-h-[360px]" : "min-h-[320px]"
      }`}
    >
      <div className="absolute right-4 top-4 text-5xl font-black text-white/5">
        {String(pick.rank).padStart(2, "0")}
      </div>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      <div className="relative z-10 flex h-full flex-col">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] ${theme.chip}`}>
                {theme.label}
              </span>
              <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${getConfidenceBadge(pick.confidenceLevel)}`}>
                Confianca {pick.confidenceLevel}
              </span>
            </div>
            <h3 className="mt-4 text-2xl font-black tracking-tight text-white">
              {pick.player.name}
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              {pick.player.team} vs {pick.player.opponent}
            </p>
          </div>

          <div className="self-start sm:pl-4 sm:text-right">
            <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
              Score do dia
            </p>
            <p className={`mt-1 text-3xl font-black ${theme.accent}`}>
              {formatNumber(pick.score)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-white/5 bg-black/20 p-4 sm:grid-cols-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Projecao</p>
            <p className="mt-1 text-xl font-black text-white">{formatNumber(pick.projection)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Media 5 jogos</p>
            <p className="mt-1 text-xl font-black text-white">{formatNumber(pick.recentAverage)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Media ult. 3</p>
            <p className="mt-1 text-xl font-black text-white">{formatNumber(pick.lastThreeAverage)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Matchup</p>
            <p className="mt-1 text-sm font-bold text-white">{matchupLabel[pick.matchupRating]}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-300">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1.5">
            <Clock3 size={13} className="text-zinc-500" />
            {formatTime(pick.match.scheduledAt)} BRT
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1.5">
            <TrendingUp size={13} className="text-zinc-500" />
            Tendencia {trendLabel[pick.trend]}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1.5">
            <BarChart3 size={13} className="text-zinc-500" />
            Rank time {pick.teamContext.teamRank ? `#${pick.teamContext.teamRank}` : "--"}
          </span>
        </div>

        <div className="mt-4">
          <p className="text-sm leading-6 text-zinc-300">{pick.summary}</p>
          <p className="mt-2 text-xs text-zinc-500">{pick.confidenceReason}</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {pick.recentValues.map((value, index) => (
            <span
              key={`${pick.player.id}-${pick.market}-${index}`}
              className="rounded-full border border-zinc-700 bg-zinc-950/80 px-3 py-1.5 text-xs font-semibold text-zinc-200"
            >
              {formatNumber(value)}
            </span>
          ))}
        </div>

        <div className="mt-5 grid gap-3 border-t border-white/5 pt-4">
          {pick.supportSignals.map((signal) => (
            <div
              key={`${pick.player.id}-${pick.market}-${signal.key}`}
              className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-white">{signal.title}</p>
                <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                  {formatNumber(signal.impact * 100)}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-zinc-400">{signal.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

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
        throw new Error(result?.error || "Nao foi possivel carregar Melhores do Dia.");
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

  const navItems = useMemo(
    () => [
      { href: "#top-do-dia", label: "Top do Dia" },
      { href: "#points", label: "Pontos" },
      { href: "#rebounds", label: "Rebotes" },
      { href: "#assists", label: "Assistencias" },
    ],
    []
  );

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-950/70">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-zinc-300" />
          <p className="mt-4 text-sm uppercase tracking-[0.24em] text-zinc-500">
            Montando Melhores do Dia
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-500/30 bg-rose-950/20 p-8 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-rose-200">Erro</p>
        <p className="mt-3 text-zinc-300">{error}</p>
        <button
          onClick={() => fetchGoldList(true)}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-rose-300/30 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-500/20"
        >
          <RefreshCw size={16} />
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
      <section className="relative overflow-hidden rounded-[28px] border border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.07),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.18),_transparent_34%),linear-gradient(135deg,rgba(10,10,10,0.98),rgba(20,20,20,0.94))] p-6 sm:p-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-200">
                <Sparkles size={14} />
                O que tem de melhor para apostar hoje
              </div>
              <h2 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">
                {data.heroTitle}
              </h2>
            </div>

            <button
              onClick={() => fetchGoldList(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-950/80 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-600 hover:bg-zinc-900"
            >
              <RefreshCw size={16} />
              Atualizar leitura
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Data</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-white">
                <CalendarDays size={16} className="text-orange-300" />
                {formatDate(data.date)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Jogos de hoje</p>
              <p className="mt-2 text-2xl font-black text-white">{data.metadata.totalMatches}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Jogadores analisados</p>
              <p className="mt-2 text-2xl font-black text-white">{data.metadata.totalPlayers}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Mercados destacados</p>
              <p className="mt-2 text-2xl font-black text-white">{data.metadata.opportunitiesCount}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <SectionAnchor key={item.href} href={item.href} label={item.label} />
            ))}
          </div>
        </div>
      </section>

      {data.topPicks.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-10 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-zinc-500">
            Sem leitura forte no momento
          </p>
          <p className="mt-3 text-zinc-300">
            Hoje nao conseguimos montar uma leitura forte o bastante para Pontos, Rebotes e Assistencias.
          </p>
        </div>
      ) : (
        <>
          <section id="top-do-dia" className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-zinc-500">
                  Radar Principal
                </p>
                <h3 className="text-2xl font-black tracking-tight text-white">
                  Top nomes do dia
                </h3>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              {data.topPicks.map((pick, index) => (
                <PickCard key={`${pick.player.id}-${pick.market}-${index}`} pick={pick} featured />
              ))}
            </div>
          </section>

          {data.sections.map((section) => (
            <section key={section.market} id={section.market} className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] ${marketTheme[section.market].chip}`}>
                    {marketTheme[section.market].label}
                  </p>
                  <h3 className="mt-3 text-2xl font-black tracking-tight text-white">{section.title}</h3>
                </div>
                <p className="max-w-xl text-sm text-zinc-400">{section.subtitle}</p>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                {section.picks.map((pick) => (
                  <PickCard key={`${pick.player.id}-${pick.market}-${pick.rank}`} pick={pick} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
        <p className="text-xs leading-6 text-zinc-500">
          MVP pre-jogo: esta tela prioriza apenas os jogos que acontecem hoje no horario de Brasilia. O score combina media recente do jogador, tendencia curta, papel no time, consistencia e contexto do confronto para Pontos, Rebotes e Assistencias.
        </p>
      </div>
    </div>
  );
}
