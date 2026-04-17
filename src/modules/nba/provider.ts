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

const resolveProvider = (rawValue: string | undefined, fallback: NbaProvider): NbaProvider => {
  const raw = (rawValue || fallback).toLowerCase();
  return raw === "betsapi" ? "betsapi" : "api-basketball";
};

export const getNbaPreGameProvider = (): NbaProvider =>
  resolveProvider(process.env.NBA_PREGAME_PROVIDER, "api-basketball");

export const getNbaPlayerAnalysisProvider = (): NbaProvider =>
  resolveProvider(process.env.NBA_PLAYER_ANALYSIS_PROVIDER || process.env.NBA_DATA_PROVIDER, "betsapi");

export const getNbaGoldListProvider = (): NbaProvider =>
  resolveProvider(process.env.NBA_GOLD_LIST_PROVIDER || process.env.NBA_DATA_PROVIDER, "betsapi");

export const getNbaLiveProvider = (): NbaProvider =>
  resolveProvider(process.env.NBA_LIVE_PROVIDER || process.env.NBA_DATA_PROVIDER, "betsapi");

export const getNbaProvider = (): NbaProvider => getNbaPreGameProvider();

export const fetchNbaMatchesFromProvider = async (
  days: number,
  provider: NbaProvider = getNbaPreGameProvider()
): Promise<NbaMatchesResult> => {
  if (provider === "betsapi") {
    return fetchNbaMatchesFromBetsApi(days);
  }

  return fetchNbaMatchesFromApiBasketball(days);
};

export const getNbaProviderFriendlyMessage = (
  error: unknown,
  provider: NbaProvider = getNbaPreGameProvider()
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
  provider: NbaProvider = getNbaPlayerAnalysisProvider()
): Promise<NbaPlayerAnalysisResponse> => {
  if (provider === "betsapi") {
    return fetchNbaPlayerAnalysisFromBetsApi(matchId, options);
  }

  throw new Error("Análise de jogadores disponível apenas para o provedor configurado no momento.");
};
