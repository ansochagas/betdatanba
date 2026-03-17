import axios, { AxiosInstance } from "axios";

export interface PinnacleConfig {
  baseURL: string;
  headers: {
    "x-rapidapi-host": string;
    "x-rapidapi-key": string;
  };
}

export interface PinnacleEvent {
  event_id: number;
  sport_id: number;
  league_id: number;
  league_name: string;
  starts: string;
  home: string;
  away: string;
  event_type: string;
  periods: {
    num_0: {
      money_line?: {
        home: number;
        draw?: number;
        away: number;
      };
      spreads?: {
        [key: string]: {
          hdp: number;
          home: number;
          away: number;
        };
      };
      totals?: {
        [key: string]: {
          points: number;
          over: number;
          under: number;
        };
      };
    };
  };
}

export interface PinnacleResponse {
  sport_id: number;
  sport_name: string;
  last: number;
  events: PinnacleEvent[];
}

export interface CsgoMatch {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: Date;
  odds: {
    moneyline?: {
      home: number;
      draw?: number;
      away: number;
    };
    spreads?: Array<{
      hdp: number;
      home: number;
      away: number;
    }>;
    totals?: Array<{
      points: number;
      over: number;
      under: number;
    }>;
  };
}

export class PinnacleClient {
  private client: AxiosInstance;
  private readonly esportsSportId = 10; // E Sports

  constructor() {
    const apiKey = process.env.PINNACLE_API_KEY;
    if (!apiKey) {
      throw new Error("PINNACLE_API_KEY não configurada no ambiente");
    }

    const config: PinnacleConfig = {
      baseURL: "https://pinnacle-odds.p.rapidapi.com",
      headers: {
        "x-rapidapi-host": "pinnacle-odds.p.rapidapi.com",
        "x-rapidapi-key": apiKey,
      },
    };

    this.client = axios.create(config);
  }

  /**
   * Busca jogos de eSports/CS:GO futuros
   */
  async getEsportsMatches(): Promise<PinnacleResponse> {
    try {
      const response = await this.client.get("/kit/v1/markets", {
        params: {
          sport_id: this.esportsSportId,
          is_have_odds: true,
          event_type: "prematch",
        },
        timeout: 15000,
      });

      return response.data;
    } catch (error) {
      console.error("Erro ao buscar jogos de eSports:", error);
      throw error;
    }
  }

  /**
   * Busca jogos de CS:GO específicos (filtrando apenas CS2)
   */
  async getCsgoMatches(): Promise<CsgoMatch[]> {
    try {
      const data = await this.getEsportsMatches();

      // Filtrar apenas jogos de CS:GO/CS2
      const csgoEvents = data.events.filter(
        (event) =>
          event.league_name?.toLowerCase().includes("cs2") ||
          event.league_name?.toLowerCase().includes("counter") ||
          event.league_name?.toLowerCase().includes("starladder") ||
          event.league_name?.toLowerCase().includes("esl") ||
          event.league_name?.toLowerCase().includes("gamers club") ||
          event.home?.toLowerCase().includes("furia") ||
          event.away?.toLowerCase().includes("navi") ||
          event.home?.toLowerCase().includes("mibr") ||
          event.away?.toLowerCase().includes("faze") ||
          event.home?.toLowerCase().includes("astralis") ||
          event.away?.toLowerCase().includes("vitality")
      );

      // Mapear para formato CS:GO SCOUT
      const csgoMatches: CsgoMatch[] = csgoEvents.map((event) => ({
        id: event.event_id.toString(),
        league: event.league_name,
        homeTeam: event.home,
        awayTeam: event.away,
        startTime: new Date(event.starts),
        odds: {
          moneyline: event.periods?.num_0?.money_line,
          spreads: event.periods?.num_0?.spreads
            ? Object.values(event.periods.num_0.spreads)
            : undefined,
          totals: event.periods?.num_0?.totals
            ? Object.values(event.periods.num_0.totals)
            : undefined,
        },
      }));

      // Ordenar por data
      csgoMatches.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      return csgoMatches;
    } catch (error) {
      console.error("Erro ao buscar jogos de CS:GO:", error);
      throw error;
    }
  }

  /**
   * Busca estatísticas detalhadas de um jogo específico
   */
  async getMatchDetails(eventId: string): Promise<any> {
    try {
      const response = await this.client.get(`/kit/v1/details`, {
        params: {
          event_id: eventId,
        },
        timeout: 10000,
      });

      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar detalhes do jogo ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Testa conectividade da API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getEsportsMatches();
      return true;
    } catch (error) {
      console.error("Falha na conexão com Pinnacle API:", error);
      return false;
    }
  }
}
