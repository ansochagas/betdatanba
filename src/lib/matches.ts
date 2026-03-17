import { csgoAPI } from "@/lib/api/csgoAPI";
import { pandaScoreAPI } from "@/lib/api/pandascoreAPI";

const hasPandaScoreToken = Boolean(process.env.PANDASCORE_TOKEN);

type MatchArray = Awaited<ReturnType<typeof csgoAPI.getTodaysMatches>>;

const formatLineup = (
  players?: Array<{
    name: string | null;
    first_name?: string | null;
    last_name?: string | null;
  }>,
) => {
  if (!players) return [];
  return players
    .map((player) => {
      if (player.name) return player.name;
      const parts = [player.first_name, player.last_name].filter(Boolean);
      return parts.length ? parts.join(" ") : null;
    })
    .filter((value): value is string => Boolean(value));
};

const enrichWithPandaScore = async (matches: MatchArray) => {
  if (!hasPandaScoreToken) {
    return matches;
  }

  for (const match of matches) {
    try {
      const [homeTeam, awayTeam] = await Promise.all([
        pandaScoreAPI.findTeamByName(match.home.name),
        pandaScoreAPI.findTeamByName(match.away.name),
      ]);

      if (homeTeam) {
        match.home.logoUrl = homeTeam.image_url;
        match.home.slug = homeTeam.slug;
        match.home.country = homeTeam.location;
        match.home.lineup = formatLineup(homeTeam.players);
      }

      if (awayTeam) {
        match.away.logoUrl = awayTeam.image_url;
        match.away.slug = awayTeam.slug;
        match.away.country = awayTeam.location;
        match.away.lineup = formatLineup(awayTeam.players);
      }
    } catch (error) {
      console.warn(
        "[PandaScore] Falha ao enriquecer partida:",
        (error as Error).message,
      );
    }
  }

  return matches;
};

export async function getEnrichedMatches(type: "today" | "live" = "today") {
  const baseMatches =
    type === "live"
      ? await csgoAPI.getLiveMatches()
      : await csgoAPI.getTodaysMatches();

  return enrichWithPandaScore(baseMatches);
}

