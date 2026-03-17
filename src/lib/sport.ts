export type ActiveSport = "nba" | "csgo";

export const getActiveSport = (): ActiveSport => {
  const raw = (process.env.SPORT || "").toLowerCase();
  return raw === "nba" ? "nba" : "csgo";
};

export const isNba = (): boolean => getActiveSport() === "nba";
export const isCsgo = (): boolean => getActiveSport() === "csgo";
