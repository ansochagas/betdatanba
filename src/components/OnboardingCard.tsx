"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { CheckCircle, Circle, X } from "lucide-react";

import { isGoldListEnabled } from "@/lib/feature-flags";

type OnboardingStepId =
  | "telegram"
  | "alerts"
  | "gold"
  | "live"
  | "upgrade";

type OnboardingState = {
  completedSteps: OnboardingStepId[];
  dismissed: boolean;
};

const STORAGE_KEY = "betdatanba-onboarding";

const steps: {
  id: OnboardingStepId;
  title: string;
  description: string;
  cta?: { label: string; href: string };
}[] = [
  {
    id: "telegram",
    title: "Vincule o bot no Telegram",
    description: "Conecte o bot oficial para receber notificacoes e futuros alertas live.",
    cta: { label: "Abrir configuracoes", href: "/settings" },
  },
  {
    id: "alerts",
    title: "Revise seus alertas",
    description: "Confirme que sua conta esta pronta para receber mensagens no Telegram.",
    cta: { label: "Ver integracao", href: "/settings" },
  },
  {
    id: "gold",
    title: "Explore Melhores do Dia",
    description: "Veja os jogos mais fortes do dia na sua rotina pre-jogo.",
    cta: { label: "Ir para Melhores do Dia", href: "/dashboard?tool=gold-list" },
  },
  {
    id: "live",
    title: "Acompanhe o painel Live",
    description: "Monitore os jogos ao vivo e acompanhe a evolucao das oportunidades.",
    cta: { label: "Abrir painel Live", href: "/dashboard?tool=live" },
  },
  {
    id: "upgrade",
    title: "Mantenha seu plano ativo",
    description: "Garanta acesso completo as ferramentas e alertas premium.",
    cta: { label: "Ver planos", href: "/upgrade" },
  },
];

const defaultState: OnboardingState = { completedSteps: [], dismissed: false };

export default function OnboardingCard() {
  const visibleSteps = steps.filter((step) =>
    step.id === "gold" ? isGoldListEnabled() : true
  );
  const [state, setState] = useState<OnboardingState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as OnboardingState;
        setState(parsed);
      }
    } catch {
      // ignore parse errors
    } finally {
      setHydrated(true);
    }
  }, []);

  const persist = useCallback((next: OnboardingState) => {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore persistence errors
    }
  }, []);

  const toggleStep = (id: OnboardingStepId) => {
    const completed = new Set(state.completedSteps);
    completed.has(id) ? completed.delete(id) : completed.add(id);
    persist({ ...state, completedSteps: Array.from(completed) });
  };

  const dismiss = () => persist({ ...state, dismissed: true });

  const completedAll = visibleSteps.every((step) => state.completedSteps.includes(step.id));

  if (!hydrated || state.dismissed) return null;

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 shadow-lg shadow-black/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-orange-400 font-semibold">Onboarding</p>
          <h3 className="text-xl font-bold text-white mt-1">
            Guia rapido para aproveitar a plataforma
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            Complete os passos abaixo para deixar sua conta pronta para pre-jogo, live e Telegram.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="text-zinc-500 hover:text-white transition-colors"
          aria-label="Fechar onboarding"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {visibleSteps.map((step) => {
          const done = state.completedSteps.includes(step.id);
          return (
            <div
              key={step.id}
              className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4"
            >
              <button
                onClick={() => toggleStep(step.id)}
                className={`mt-0.5 ${done ? "text-green-400" : "text-zinc-500"}`}
                aria-label={done ? "Marcar como nao concluido" : "Marcar como concluido"}
              >
                {done ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-white">{step.title}</h4>
                  {done && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/40">
                      Concluido
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-1">{step.description}</p>
                {step.cta && (
                  <div className="mt-2">
                    <Link
                      href={step.cta.href}
                      className="text-xs font-semibold text-orange-400 hover:text-orange-300"
                    >
                      {step.cta.label}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="text-xs text-zinc-400">
          Progresso: {state.completedSteps.length}/{visibleSteps.length} passos
        </div>
        <button
          onClick={() =>
            persist({
              ...state,
              completedSteps: visibleSteps.map((step) => step.id),
            })
          }
          className="text-xs px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 transition-colors"
        >
          Marcar tudo concluido
        </button>
        {completedAll && (
          <button
            onClick={dismiss}
            className="text-xs px-3 py-2 rounded-md border border-green-600 bg-green-600/10 text-green-200 hover:bg-green-600/20 transition-colors"
          >
            Ocultar onboarding concluido
          </button>
        )}
      </div>
    </div>
  );
}
