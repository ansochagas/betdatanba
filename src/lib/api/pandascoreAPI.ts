const PANDASCORE_BASE_URL =
  process.env.PANDASCORE_BASE_URL ?? "https://api.pandascore.co";
const PANDASCORE_TOKEN = process.env.PANDASCORE_TOKEN;

interface PandaScorePlayer {
  id: number;
  name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  nationality?: string | null;
}

export interface PandaScoreTeam {
  id: number;
  name: string;
  slug: string;
  acronym: string | null;
  image_url: string | null;
  location: string | null;
  players: PandaScorePlayer[];
}

type Query = Record<string, string>;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

class PandaScoreAPI {
  private cache = new Map<string, PandaScoreTeam | null>();

  private ensureToken() {
    if (!PANDASCORE_TOKEN) {
      throw new Error(
        "PANDASCORE_TOKEN não definido. Adicione o token no .env.local",
      );
    }
  }

  private async request<T>(endpoint: string, query: Query = {}) {
    this.ensureToken();
    const url = new URL(`${PANDASCORE_BASE_URL}${endpoint}`);
    Object.entries(query).forEach(([key, value]) =>
      url.searchParams.set(key, value),
    );
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${PANDASCORE_TOKEN}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `PandaScore request failed (${endpoint}): ${response.status}`,
      );
    }

    return (await response.json()) as T;
  }

  private selectBestMatch(
    teams: PandaScoreTeam[],
    targetName: string,
  ): PandaScoreTeam | null {
    if (!teams.length) return null;
    const normalizedTarget = normalize(targetName);
    const direct = teams.find(
      (team) =>
        normalize(team.name) === normalizedTarget ||
        normalize(team.slug ?? "") === normalizedTarget ||
        normalize(team.acronym ?? "") === normalizedTarget,
    );
    if (direct) return direct;
    return teams[0];
  }

  async findTeamByName(name: string): Promise<PandaScoreTeam | null> {
    if (!name) return null;
    const cacheKey = normalize(name);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) ?? null;
    }

    try {
      const teams = await this.request<PandaScoreTeam[]>("/csgo/teams", {
        "search[name]": name,
        per_page: "5",
        sort: "name",
      });

      const match = this.selectBestMatch(teams ?? [], name);
      this.cache.set(cacheKey, match ?? null);
      return match ?? null;
    } catch (error) {
      console.warn(
        `[PandaScore] Falha ao buscar time "${name}":`,
        (error as Error).message,
      );
      this.cache.set(cacheKey, null);
      return null;
    }
  }
}

export const pandaScoreAPI = new PandaScoreAPI();
export default pandaScoreAPI;

