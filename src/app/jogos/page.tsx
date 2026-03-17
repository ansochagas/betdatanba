import { Metadata } from "next";
import { getEnrichedMatches } from "@/lib/matches";

export const metadata: Metadata = {
  title: "Jogos de CS:GO Hoje | CS:GO Intel",
  description:
    "Lista em tempo real dos campeonatos de CS2/CS:GO do dia, com horário e confrontos atualizados.",
};

const formatMatchTime = (isoDate: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));

export default async function JogosPage() {
  const enriched = await getEnrichedMatches("today");
  const sortedMatches = [...enriched].sort((a, b) => a.timestamp - b.timestamp);
  const liveMatches = sortedMatches.filter((match) => match.isLive).length;
  const totalLeagues = new Set(sortedMatches.map((match) => match.league.name));

  const highlightStats = [
    { label: "Partidas monitoradas", value: sortedMatches.length },
    { label: "Ao vivo agora", value: liveMatches },
    { label: "Ligas diferentes", value: totalLeagues.size },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#010106] via-[#050715] to-[#010104] px-6 py-12 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="glass-panel space-y-6 p-8 text-center md:text-left">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-gray-500">
              Agenda competitiva
            </p>
            <h1 className="mt-2 text-4xl font-black">
              Jogos de CS2 / CS:GO do dia
            </h1>
            <p className="mt-3 text-sm text-gray-400">
              Atualizamos a cada chamada às APIs parceiras. Apenas confrontos de
              Counter-Strike, com horário local e indícios de line-up.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {highlightStats.map((stat) => (
              <div
                key={stat.label}
                className="card-modern border-white/5 bg-[#050917]/80 p-4"
              >
                <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500">
                  {stat.label}
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </header>

        {sortedMatches.length === 0 ? (
          <div className="glass-panel p-10 text-center text-gray-300">
            Nenhuma partida de CS encontrada para a janela configurada. Volte em
            instantes.
          </div>
        ) : (
          <div className="space-y-6">
            {sortedMatches.map((match) => (
              <article key={match.id} className="glass-panel space-y-5 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-[#5E98D9]">
                      {match.league.name}
                    </p>
                    <h2 className="text-2xl font-bold">
                      {match.home.name} vs {match.away.name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    {match.isLive && (
                      <span className="badge-hot inline-flex items-center gap-2 text-xs uppercase tracking-[0.35em]">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                        ao vivo
                      </span>
                    )}
                    <div className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-yellow-200">
                      {formatMatchTime(match.startsAt)}
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 text-sm text-gray-300 sm:grid-cols-2">
                  {[match.home, match.away].map((team, index) => (
                    <div
                      key={team.id ?? `${match.id}-${index}`}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <p className="text-xs uppercase tracking-[0.35em] text-gray-400">
                        {index === 0 ? "Time A" : "Time B"}
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#070c19] ring-1 ring-white/10">
                          {team.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={team.logoUrl}
                              alt={`${team.name} logo`}
                              className="h-14 w-14 rounded-2xl object-contain"
                            />
                          ) : (
                            <span className="text-lg font-semibold">
                              {team.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-white">
                            {team.name}
                          </p>
                          {team.country && (
                            <p className="text-[10px] uppercase tracking-[0.35em] text-gray-500">
                              {team.country}
                            </p>
                          )}
                        </div>
                      </div>

                      {team.lineup && team.lineup.length > 0 && (
                        <div className="mt-4 space-y-1 rounded-2xl border border-white/10 bg-black/30 p-3 text-xs text-gray-300">
                          <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500">
                            Line-up provável
                          </p>
                          <ul className="text-sm leading-relaxed text-gray-200">
                            {team.lineup.slice(0, 5).map((player) => (
                              <li key={player}>• {player}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
