interface PandaScoreTeam {
  id: number;
  name: string;
  acronym: string | null;
  slug: string;
  image_url: string | null;
  location: string;
  players: Array<{
    id: number;
    name: string;
    nickname: string | null;
    slug: string;
  }>;
}

interface PandaScoreMatch {
  id: number;
  name: string;
  status: "not_started" | "running" | "finished";
  begin_at: string;
  end_at: string | null;
  tournament_id: number;
  league_id: number;
  number_of_games?: number;
  games?: Array<{
    id: number;
    status: string;
    map: string | null;
    score: any;
  }>;
  opponents: Array<{
    opponent: {
      id: number;
      name: string;
      acronym: string | null;
      image_url: string | null;
    };
  }>;
}

export class PandaScoreService {
  private readonly API_KEY: string;
  private readonly BASE_URL = "https://api.pandascore.co";

  constructor() {
    const apiKey = process.env.PANDASCORE_API_KEY;
    if (!apiKey) {
      throw new Error("PANDASCORE_API_KEY não configurada no ambiente");
    }
    this.API_KEY = apiKey;
  }

  private async makeRequest(
    endpoint: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    const url = new URL(`${this.BASE_URL}${endpoint}`);
    url.searchParams.set("token", this.API_KEY);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(
        `PandaScore API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Busca times CS:GO da PandaScore
   */
  async getTeams(page = 1, perPage = 100): Promise<PandaScoreTeam[]> {
    try {
      return await this.makeRequest("/csgo/teams", { page, per_page: perPage });
    } catch (error) {
      console.error("Erro ao buscar times PandaScore:", error);
      return [];
    }
  }

  /**
   * Busca jogos CS:GO da PandaScore
   */
  async getMatches(
    params: {
      status?: string;
      page?: number;
      perPage?: number;
    } = {}
  ): Promise<PandaScoreMatch[]> {
    try {
      const { status, page = 1, perPage = 50 } = params;
      const requestParams: any = { page, per_page: perPage };

      if (status) {
        requestParams["filter[status]"] = status;
      }

      return await this.makeRequest("/csgo/matches", requestParams);
    } catch (error) {
      console.error("Erro ao buscar jogos PandaScore:", error);
      return [];
    }
  }

  /**
   * Busca detalhes de um jogo específico
   */
  async getMatchDetails(matchId: number): Promise<PandaScoreMatch | null> {
    try {
      return await this.makeRequest(`/csgo/matches/${matchId}`);
    } catch (error) {
      console.error(`Erro ao buscar detalhes do jogo ${matchId}:`, error);
      return null;
    }
  }

  /**
   * Busca torneios CS:GO
   */
  async getTournaments(
    params: {
      status?: string;
      page?: number;
      perPage?: number;
    } = {}
  ): Promise<any[]> {
    try {
      const { status, page = 1, perPage = 20 } = params;
      const requestParams: any = { page, per_page: perPage };

      if (status) {
        requestParams["filter[status]"] = status;
      }

      return await this.makeRequest("/csgo/tournaments", requestParams);
    } catch (error) {
      console.error("Erro ao buscar torneios PandaScore:", error);
      return [];
    }
  }

  /**
   * Cria um mapa de logos por nome de time
   * Compatível com o formato atual do sistema
   */
  async getTeamLogosMap(): Promise<Record<string, string | null>> {
    try {
      const teams = await this.getTeams(1, 200); // Buscar mais times
      const logosMap: Record<string, string | null> = {};

      teams.forEach((team) => {
        if (team.name && team.image_url) {
          logosMap[team.name] = team.image_url;
          // Também mapear por acronym se disponível
          if (team.acronym) {
            logosMap[team.acronym] = team.image_url;
          }
        }
      });

      console.log(
        `📸 PandaScore: ${Object.keys(logosMap).length} logos mapeados`
      );
      return logosMap;
    } catch (error) {
      console.error("Erro ao criar mapa de logos:", error);
      return {};
    }
  }

  /**
   * Converte dados PandaScore para formato compatível com o sistema atual
   */
  convertMatchToSystemFormat(pandaMatch: PandaScoreMatch): any {
    return {
      id: pandaMatch.id.toString(),
      league: "CS:GO",
      homeTeam: pandaMatch.opponents[0]?.opponent.name || "TBD",
      awayTeam: pandaMatch.opponents[1]?.opponent.name || "TBD",
      startTime: pandaMatch.begin_at,
      odds: [], // TODO: integrar com odds API
      status: pandaMatch.status,
      tournament_id: pandaMatch.tournament_id,
      league_id: pandaMatch.league_id,
      opponents: pandaMatch.opponents,
      number_of_games: pandaMatch.number_of_games,
      games: pandaMatch.games,
    };
  }
}
