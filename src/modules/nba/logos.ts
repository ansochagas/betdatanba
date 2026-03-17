const NBA_LOGO_BASE_URL = "https://a.espncdn.com/i/teamlogos/nba/500";
const NBA_FALLBACK_LOGO = "/icons/basketball.svg";

type NbaTeamLogoEntry = {
  canonicalName: string;
  logoCode: string;
  aliases: string[];
};

const TEAM_LOGO_ENTRIES: NbaTeamLogoEntry[] = [
  { canonicalName: "Atlanta Hawks", logoCode: "atl", aliases: ["atl hawks", "atlanta hawks", "hawks"] },
  { canonicalName: "Boston Celtics", logoCode: "bos", aliases: ["bos celtics", "boston celtics", "celtics"] },
  { canonicalName: "Brooklyn Nets", logoCode: "bkn", aliases: ["bk nets", "bkn nets", "brooklyn nets", "nets"] },
  { canonicalName: "Charlotte Hornets", logoCode: "cha", aliases: ["cha hornets", "charlotte hornets", "hornets"] },
  { canonicalName: "Chicago Bulls", logoCode: "chi", aliases: ["chi bulls", "chicago bulls", "bulls"] },
  { canonicalName: "Cleveland Cavaliers", logoCode: "cle", aliases: ["cle cavaliers", "cleveland cavaliers", "cavaliers", "cavs"] },
  { canonicalName: "Dallas Mavericks", logoCode: "dal", aliases: ["dal mavericks", "dallas mavericks", "mavericks", "mavs"] },
  { canonicalName: "Denver Nuggets", logoCode: "den", aliases: ["den nuggets", "denver nuggets", "nuggets"] },
  { canonicalName: "Detroit Pistons", logoCode: "det", aliases: ["det pistons", "detroit pistons", "pistons"] },
  { canonicalName: "Golden State Warriors", logoCode: "gs", aliases: ["gs warriors", "gsw warriors", "golden state warriors", "warriors"] },
  { canonicalName: "Houston Rockets", logoCode: "hou", aliases: ["hou rockets", "houston rockets", "rockets"] },
  { canonicalName: "Indiana Pacers", logoCode: "ind", aliases: ["ind pacers", "indiana pacers", "pacers"] },
  { canonicalName: "LA Clippers", logoCode: "lac", aliases: ["la clippers", "los angeles clippers", "clippers", "lac clippers"] },
  { canonicalName: "LA Lakers", logoCode: "lal", aliases: ["la lakers", "los angeles lakers", "lakers", "lal lakers"] },
  { canonicalName: "Memphis Grizzlies", logoCode: "mem", aliases: ["mem grizzlies", "memphis grizzlies", "grizzlies"] },
  { canonicalName: "Miami Heat", logoCode: "mia", aliases: ["mia heat", "miami heat", "heat"] },
  { canonicalName: "Milwaukee Bucks", logoCode: "mil", aliases: ["mil bucks", "milwaukee bucks", "bucks"] },
  { canonicalName: "Minnesota Timberwolves", logoCode: "min", aliases: ["min timberwolves", "minnesota timberwolves", "timberwolves", "wolves"] },
  { canonicalName: "New Orleans Pelicans", logoCode: "no", aliases: ["no pelicans", "new orleans pelicans", "pelicans", "nop pelicans"] },
  { canonicalName: "New York Knicks", logoCode: "ny", aliases: ["ny knicks", "new york knicks", "knicks", "nyk knicks"] },
  { canonicalName: "Oklahoma City Thunder", logoCode: "okc", aliases: ["okc thunder", "oklahoma city thunder", "thunder"] },
  { canonicalName: "Orlando Magic", logoCode: "orl", aliases: ["orl magic", "orlando magic", "magic"] },
  { canonicalName: "Philadelphia 76ers", logoCode: "phi", aliases: ["phi 76ers", "philadelphia 76ers", "76ers", "sixers"] },
  { canonicalName: "Phoenix Suns", logoCode: "phx", aliases: ["phx suns", "phoenix suns", "suns"] },
  { canonicalName: "Portland Trail Blazers", logoCode: "por", aliases: ["por trail blazers", "portland trail blazers", "trail blazers", "blazers"] },
  { canonicalName: "Sacramento Kings", logoCode: "sac", aliases: ["sac kings", "sacramento kings", "kings"] },
  { canonicalName: "San Antonio Spurs", logoCode: "sa", aliases: ["sa spurs", "san antonio spurs", "spurs", "sas spurs"] },
  { canonicalName: "Toronto Raptors", logoCode: "tor", aliases: ["tor raptors", "toronto raptors", "raptors"] },
  { canonicalName: "Utah Jazz", logoCode: "utah", aliases: ["utah jazz", "uta jazz", "jazz"] },
  { canonicalName: "Washington Wizards", logoCode: "wsh", aliases: ["wsh wizards", "was wizards", "washington wizards", "wizards"] },
];

const normalizeTeamName = (value: string): string => {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
};

const aliasIndex = new Map<string, NbaTeamLogoEntry>();
for (const entry of TEAM_LOGO_ENTRIES) {
  aliasIndex.set(normalizeTeamName(entry.canonicalName), entry);
  for (const alias of entry.aliases) {
    aliasIndex.set(normalizeTeamName(alias), entry);
  }
}

export type NbaTeamIdentity = {
  canonicalName: string;
  logoCode: string | null;
  logoUrl: string;
  found: boolean;
};

export const getNbaTeamIdentity = (teamName: string): NbaTeamIdentity => {
  const key = normalizeTeamName(teamName || "");
  const direct = aliasIndex.get(key);

  if (direct) {
    return {
      canonicalName: direct.canonicalName,
      logoCode: direct.logoCode,
      logoUrl: `${NBA_LOGO_BASE_URL}/${direct.logoCode}.png`,
      found: true,
    };
  }

  for (const [aliasKey, entry] of aliasIndex.entries()) {
    if (aliasKey.includes(key) || key.includes(aliasKey)) {
      return {
        canonicalName: entry.canonicalName,
        logoCode: entry.logoCode,
        logoUrl: `${NBA_LOGO_BASE_URL}/${entry.logoCode}.png`,
        found: true,
      };
    }
  }

  return {
    canonicalName: teamName || "Time NBA",
    logoCode: null,
    logoUrl: NBA_FALLBACK_LOGO,
    found: false,
  };
};

export const getNbaTeamLogoUrl = (teamName: string): string => {
  return getNbaTeamIdentity(teamName).logoUrl;
};

export const getNbaKnownTeams = (): string[] => {
  return TEAM_LOGO_ENTRIES.map((entry) => entry.canonicalName);
};
