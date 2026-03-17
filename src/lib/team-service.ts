import { prisma } from "./prisma";

export interface TeamWithLogo {
  name: string;
  logo?: string;
  country?: string;
}

export class TeamService {
  /**
   * Busca logo de um time pelo nome
   */
  static async getTeamLogo(teamName: string): Promise<string | null> {
    try {
      // Tenta buscar exatamente pelo nome
      let team = await prisma.cSGOTeam.findUnique({
        where: { name: teamName },
        select: { logo: true },
      });

      // Se não encontrou, tenta buscar por nomes similares
      if (!team) {
        const teams = await prisma.cSGOTeam.findMany({
          where: {
            OR: [
              { name: { contains: teamName } },
              // Adicionar aliases quando implementado
            ],
          },
          select: { name: true, logo: true },
        });

        // Encontra o melhor match
        const foundTeam = teams.find(
          (t) =>
            t.name.toLowerCase().includes(teamName.toLowerCase()) ||
            teamName.toLowerCase().includes(t.name.toLowerCase())
        );

        if (foundTeam) {
          team = { logo: foundTeam.logo };
        }
      }

      return team?.logo || null;
    } catch (error) {
      console.error(`Erro ao buscar logo do time ${teamName}:`, error);
      return null;
    }
  }

  /**
   * Busca logos para múltiplos times
   */
  static async getTeamsLogos(
    teamNames: string[]
  ): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {};

    for (const teamName of teamNames) {
      result[teamName] = await this.getTeamLogo(teamName);
    }

    return result;
  }

  /**
   * Busca informações completas de um time
   */
  static async getTeamInfo(teamName: string): Promise<TeamWithLogo | null> {
    try {
      const team = await prisma.cSGOTeam.findUnique({
        where: { name: teamName },
      });

      if (team) {
        return {
          name: team.name,
          logo: team.logo || undefined,
          country: team.country || undefined,
        };
      }

      return null;
    } catch (error) {
      console.error(`Erro ao buscar info do time ${teamName}:`, error);
      return null;
    }
  }

  /**
   * Lista todos os times disponíveis
   */
  static async getAllTeams(): Promise<TeamWithLogo[]> {
    try {
      const teams = await prisma.cSGOTeam.findMany({
        select: {
          name: true,
          logo: true,
          country: true,
        },
        orderBy: { name: "asc" },
      });

      return teams.map((team) => ({
        name: team.name,
        logo: team.logo || undefined,
        country: team.country || undefined,
      }));
    } catch (error) {
      console.error("Erro ao buscar todos os times:", error);
      return [];
    }
  }
}
