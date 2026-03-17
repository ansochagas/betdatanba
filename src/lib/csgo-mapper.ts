import { CsgoMatchData } from "./sofasport-client";

export interface CsgoMatch {
  id: string;
  eventId: string;
  map: string;
  homeTeam: {
    name: string;
    score: number;
    rounds: number[];
  };
  awayTeam: {
    name: string;
    score: number;
    rounds: number[];
  };
  winner: "home" | "away" | "draw";
  duration: number; // em segundos
  startTime: Date;
  status: string;
  hasStats: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CsgoTeam {
  id: string;
  name: string;
  logo?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Mapeia dados da SofaSport API para o formato CS:GO SCOUT
 */
export function mapSofaSportToCsgoMatch(
  sofaData: CsgoMatchData,
  eventId: string = "10289011"
): CsgoMatch {
  return {
    id: sofaData.id.toString(),
    eventId,
    map: sofaData.map.name,
    homeTeam: {
      name: "Time Casa", // TODO: Obter nomes reais dos times
      score: sofaData.homeScore.display,
      rounds: [
        sofaData.homeScore.period1 || 0,
        sofaData.homeScore.period2 || 0,
      ],
    },
    awayTeam: {
      name: "Time Visitante", // TODO: Obter nomes reais dos times
      score: sofaData.awayScore.display,
      rounds: [
        sofaData.awayScore.period1 || 0,
        sofaData.awayScore.period2 || 0,
      ],
    },
    winner:
      sofaData.winnerCode === 1
        ? "home"
        : sofaData.winnerCode === 2
        ? "away"
        : "draw",
    duration: sofaData.length,
    startTime: new Date(sofaData.startTimestamp * 1000),
    status: sofaData.status.description,
    hasStats: sofaData.hasCompleteStatistics,
  };
}

/**
 * Mapeia array de dados da SofaSport para matches CS:GO
 */
export function mapSofaSportToCsgoMatches(
  sofaDataArray: CsgoMatchData[],
  eventId: string = "10289011"
): CsgoMatch[] {
  return sofaDataArray.map((data) => mapSofaSportToCsgoMatch(data, eventId));
}

/**
 * Calcula estatísticas básicas de um jogo
 */
export function calculateMatchStats(match: CsgoMatch) {
  const totalRounds = match.homeTeam.score + match.awayTeam.score;
  const homeWinRate =
    totalRounds > 0 ? (match.homeTeam.score / totalRounds) * 100 : 0;
  const awayWinRate =
    totalRounds > 0 ? (match.awayTeam.score / totalRounds) * 100 : 0;

  return {
    totalRounds,
    homeWinRate: Math.round(homeWinRate * 100) / 100,
    awayWinRate: Math.round(awayWinRate * 100) / 100,
    winner: match.winner,
    duration: match.duration,
    map: match.map,
  };
}

/**
 * Formata duração do jogo para display
 */
export function formatMatchDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * Formata data do jogo para display
 */
export function formatMatchDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Obtém status do jogo formatado
 */
export function getMatchStatusText(status: string): string {
  switch (status.toLowerCase()) {
    case "ended":
    case "finished":
      return "Finalizado";
    case "live":
    case "in_progress":
      return "Ao Vivo";
    case "scheduled":
    case "not_started":
      return "Agendado";
    default:
      return status;
  }
}

/**
 * Obtém cor do status do jogo
 */
export function getMatchStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "ended":
    case "finished":
      return "text-green-400";
    case "live":
    case "in_progress":
      return "text-red-400 animate-pulse";
    case "scheduled":
    case "not_started":
      return "text-blue-400";
    default:
      return "text-gray-400";
  }
}
