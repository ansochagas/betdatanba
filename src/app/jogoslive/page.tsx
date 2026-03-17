"use client";

import NbaLiveTool from "@/components/nba/NbaLiveTool";

export default function JogosLivePage() {
  return (
    <div className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-6">
          <h1 className="text-3xl font-bold">Monitoramento NBA Live</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Painel em tela cheia para acompanhar placar, periodo e contexto de temporada.
          </p>
        </header>
        <NbaLiveTool />
      </div>
    </div>
  );
}
