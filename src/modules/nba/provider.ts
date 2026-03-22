import {
  fetchNbaMatchesFromApiBasketball,
  getApiBasketballFriendlyMessage,
} from "@/modules/nba/adapters/api-basketball/client";
import {
  fetchNbaMatchesFromBetsApi,
  fetchNbaPlayerAnalysisFromBetsApi,
  getBetsApiFriendlyMessage,
} from "@/modules/nba/adapters/betsapi/client";
import { NbaMatchesResult, NbaPlayerAnalysisResponse } from "@/modules/nba/types";

export type NbaProvider = "api-basketball" | "betsapi";

export const getNbaProvider = (): NbaProvider => {
  const raw = (process.env.NBA_DATA_PROVIDER || "api-basketball").toLowerCase();
  return raw === "betsapi" ? "betsapi" : "api-basketball";
};

export const fetchNbaMatchesFromProvider = async (
  days: number,
  provider: NbaProvider = getNbaProvider()
): Promise<NbaMatchesResult> => {
  if (provider === "betsapi") {
    return fetchNbaMatchesFromBetsApi(days);
  }

  return fetchNbaMatchesFromApiBasketball(days);
};

export const getNbaProviderFriendlyMessage = (
  error: unknown,
  provider: NbaProvider = getNbaProvider()
): string => {
  if (provider === "betsapi") {
    return getBetsApiFriendlyMessage(error);
  }

  return getApiBasketballFriendlyMessage(error);
};

export const fetchNbaPlayerAnalysisFromProvider = async (
  matchId: string,
  options: {
    bet365Id?: string | null;
    homeTeam?: string | null;
    awayTeam?: string | null;
    scheduledAt?: string | null;
    league?: string | null;
  } = {},
  provider: NbaProvider = getNbaProvider()
): Promise<NbaPlayerAnalysisResponse> => {
  if (provider === "betsapi") {
    return fetchNbaPlayerAnalysisFromBetsApi(matchId, options);
  }

  throw new Error("Análise de jogadores disponível apenas para o provedor configurado no momento.");
};
