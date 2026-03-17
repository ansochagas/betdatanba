import Image from "next/image";

export interface GoldCardMatch {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string | Date;
  odds?: {
    moneyline?: {
      home: number;
      away: number;
      draw?: number;
    };
  };
  status?: "scheduled" | "live" | "finished" | string;
}

interface GoldCardProps {
  title: string;
  description: string;
  match: GoldCardMatch;
  value: string;
  icon: string;
  color: string;
  teamLogos: Record<string, string | null>;
}

export default function GoldCard({
  title,
  description,
  match,
  value,
  icon,
  color,
  teamLogos,
}: GoldCardProps) {
  const formatTime = (dateInput: string | Date) => {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatus = (status?: string) => {
    if (status === "live") {
      return { label: "AO VIVO", className: "bg-red-500/20 text-red-400" };
    }
    if (status === "finished") {
      return { label: "FINALIZADO", className: "bg-green-500/20 text-green-400" };
    }
    return { label: "AGENDADO", className: "bg-blue-500/20 text-blue-400" };
  };

  const status = getStatus(match.status);

  return (
    <div
      className={`relative bg-gradient-to-br ${color} rounded-2xl p-6 overflow-hidden group hover:scale-105 transition-all duration-300 shadow-2xl border border-white/10`}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
      </div>

      {/* Crown Icon */}
      <div className="absolute top-4 right-4 text-4xl opacity-80 group-hover:scale-110 transition-transform">
        🏆
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl">{icon}</div>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
            <p className="text-white/80 text-sm">{description}</p>
          </div>
        </div>

        {/* Value Highlight */}
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/20">
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-1">{value}</div>
            <div className="text-white/70 text-sm">Valor Estimado</div>
          </div>
        </div>

        {/* Match Info */}
        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          {/* Teams */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center overflow-hidden">
                {teamLogos[match.homeTeam] ? (
                  <img
                    src={teamLogos[match.homeTeam]!}
                    alt={`${match.homeTeam} logo`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-lg">🎯</span>
                )}
              </div>
              <div>
                <div className="font-bold text-white text-sm">{match.homeTeam}</div>
                <div className="text-xs text-white/60">Casa</div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-white font-bold">VS</div>
              <div className="text-xs text-white/60">{match.league}</div>
            </div>

            <div className="flex items-center gap-3">
              <div>
                <div className="font-bold text-white text-sm text-right">
                  {match.awayTeam}
                </div>
                <div className="text-xs text-white/60 text-right">Visitante</div>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center overflow-hidden">
                {teamLogos[match.awayTeam] ? (
                  <img
                    src={teamLogos[match.awayTeam]!}
                    alt={`${match.awayTeam} logo`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-lg">⭐</span>
                )}
              </div>
            </div>
          </div>

          {/* Time & Status */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-white/80">
              <span>⏰</span>
              <span>{formatTime(match.startTime)}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className={`px-2 py-1 rounded text-xs font-bold ${status.className}`}>
                {status.label}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shine Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
    </div>
  );
}
