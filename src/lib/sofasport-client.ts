import axios, { AxiosInstance } from "axios";

export interface SofaSportConfig {
  baseURL: string;
  headers: {
    "x-rapidapi-host": string;
    "x-rapidapi-key": string;
  };
}

export interface CsgoMatchData {
  id: number;
  length: number;
  status: {
    code: number;
    description: string;
    type: string;
  };
  winnerCode: number;
  map: {
    name: string;
    id: number;
  };
  homeScore: {
    display: number;
    period1?: number;
    period2?: number;
  };
  awayScore: {
    display: number;
    period1?: number;
    period2?: number;
  };
  homeTeamStartingSide?: number;
  hasCompleteStatistics: boolean;
  startTimestamp: number;
}

export interface SofaSportResponse {
  data: CsgoMatchData[];
}

export class SofaSportClient {
  private client: AxiosInstance;
  private readonly defaultEventId = "10289011";

  constructor() {
    const config: SofaSportConfig = {
      baseURL: "https://sofasport.p.rapidapi.com/v1",
      headers: {
        "x-rapidapi-host": "sofasport.p.rapidapi.com",
        "x-rapidapi-key":
          process.env.NEXT_PUBLIC_SOFASPORT_API_KEY ||
          "d5da2b13a6msh434479d753d8387p12bae1jsn117c3b0f7da9",
      },
    };

    this.client = axios.create(config);
  }

  /**
   * Busca jogos de eSports/CS:GO
   */
  async getEsportsGames(eventId?: string): Promise<SofaSportResponse> {
    try {
      const response = await this.client.get(
        `/events/esports-games?event_id=${eventId || this.defaultEventId}`,
        {
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error) {
      console.error("Erro ao buscar jogos de eSports:", error);
      throw error;
    }
  }

  /**
   * Busca estatísticas detalhadas de um jogo específico
   */
  async getMatchStatistics(matchId: string): Promise<any> {
    try {
      const response = await this.client.get(`/events/${matchId}/statistics`, {
        timeout: 10000,
      });

      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar estatísticas do jogo ${matchId}:`, error);
      throw error;
    }
  }

  /**
   * Busca lista de esportes disponíveis
   */
  async getSports(): Promise<any> {
    try {
      const response = await this.client.get("/sports", {
        timeout: 10000,
      });

      return response.data;
    } catch (error) {
      console.error("Erro ao buscar esportes:", error);
      throw error;
    }
  }

  /**
   * Testa conectividade da API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getEsportsGames();
      return true;
    } catch (error) {
      console.error("Falha na conexão com SofaSport API:", error);
      return false;
    }
  }
}
