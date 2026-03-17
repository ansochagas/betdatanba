export type TeamTier = "top" | "medium" | "low";

export class TeamRankingSystem {
  // Lista base de times (atualizada manualmente baseada em ranking HLTV e performance)
  private static readonly BASE_RANKINGS = {
    top: [
      "Natus Vincere",
      "FaZe Clan",
      "G2 Esports",
      "Team Vitality",
      "Furia",
      "MOUZ",
      "Heroic",
      "Cloud9",
      "ENCE",
      "Astralis",
      "Eternal Fire",
    ],

    medium: [
      "BIG",
      "Imperial",
      "Spirit",
      "Ninjas in Pyjamas",
      "Complexity",
      "Team Liquid",
      "Fluxo",
      "MIBR",
      "HAVU",
      "NRG",
      "PARIVISION",
      "Legacy",
    ],

    low: [
      "Ground Zero",
      "Sharks",
      "00 Nation",
      "Flamengo",
      "Pain",
      "Thunder Down Under",
      "SemperFi",
      "LITE",
      "Vantage",
      "Mindfreak",
      "Rooster",
      "Animus Victoria",
    ],
  };

  /**
   * Classifica um time baseado em nome e win rate
   */
  static classifyTeam(teamName: string, winRate?: number): TeamTier {
    if (!teamName) return "medium";

    const normalizedName = teamName.toLowerCase().trim();

    // Primeiro, verificar lista base
    if (
      this.BASE_RANKINGS.top.some(
        (name) =>
          name.toLowerCase().includes(normalizedName) ||
          normalizedName.includes(name.toLowerCase())
      )
    ) {
      // Times top podem cair se tiverem win rate muito baixo
      return winRate && winRate < 0.4 ? "medium" : "top";
    }

    if (
      this.BASE_RANKINGS.medium.some(
        (name) =>
          name.toLowerCase().includes(normalizedName) ||
          normalizedName.includes(name.toLowerCase())
      )
    ) {
      // Times médios podem subir ou cair
      if (winRate && winRate > 0.75) return "top";
      if (winRate && winRate < 0.35) return "low";
      return "medium";
    }

    if (
      this.BASE_RANKINGS.low.some(
        (name) =>
          name.toLowerCase().includes(normalizedName) ||
          normalizedName.includes(name.toLowerCase())
      )
    ) {
      // Times low podem subir se tiverem win rate alto
      return winRate && winRate > 0.65 ? "medium" : "low";
    }

    // Times não classificados: usar win rate como critério
    if (winRate !== undefined) {
      if (winRate >= 0.7) return "top";
      if (winRate >= 0.5) return "medium";
      return "low";
    }

    // Default para times desconhecidos
    return "medium";
  }

  /**
   * Retorna todos os times de uma categoria
   */
  static getTeamsByTier(tier: TeamTier): string[] {
    return this.BASE_RANKINGS[tier] || [];
  }

  /**
   * Verifica se um time está em uma categoria específica
   */
  static isTeamInTier(teamName: string, tier: TeamTier): boolean {
    return this.BASE_RANKINGS[tier].some(
      (name) =>
        name.toLowerCase().includes(teamName.toLowerCase()) ||
        teamName.toLowerCase().includes(name.toLowerCase())
    );
  }

  /**
   * Retorna estatísticas de ranking para debug
   */
  static getRankingStats(): { [key in TeamTier]: number } {
    return {
      top: this.BASE_RANKINGS.top.length,
      medium: this.BASE_RANKINGS.medium.length,
      low: this.BASE_RANKINGS.low.length,
    };
  }
}
