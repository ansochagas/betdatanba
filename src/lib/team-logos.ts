// Sistema completo de logos de times CS:GO
// Combina dados da PandaScore com logos locais

export interface TeamLogo {
  teamName: string;
  logoUrl: string;
  source: "pandascore" | "local" | "fallback";
  lastUpdated?: string;
}

// Logos locais para times importantes (salvos no projeto)
export const LOCAL_TEAM_LOGOS: Record<string, string> = {
  // Times brasileiros
  FURIA: "/logos/furia.png",
  Imperial: "/logos/imperial.png",
  MIBR: "/logos/mibr.png",
  Fluxo: "/logos/fluxo.png",
  Pain: "/logos/pain.png",
  Flamengo: "/logos/flamengo.png",

  // Times internacionais top
  "Natus Vincere": "/logos/navi.png",
  "FaZe Clan": "/logos/faze.png",
  "G2 Esports": "/logos/g2.png",
  "Team Vitality": "/logos/vitality.png",
  Astralis: "/logos/astralis.png",
  "Ninjas in Pyjamas": "/logos/nip.png",
  fnatic: "/logos/fnatic.png",
  "Team Liquid": "/logos/liquid.png",
  Cloud9: "/logos/cloud9.png",
  ENCE: "/logos/ence.png",
  Heroic: "/logos/heroic.png",
  BIG: "/logos/big.png",
  "Eternal Fire": "/logos/eternalfire.png",
  MOUZ: "/logos/mouz.png",
  Spirit: "/logos/spirit.png",
  TheMongolz: "/logos/mongolz.png",

  // Times regionais importantes
  FlyQuest: "/logos/flyquest.png",
  Complexity: "/logos/complexity.png",
  NRG: "/logos/nrg.png",
  "Evil Geniuses": "/logos/eg.png",
  "100 Thieves": "/logos/100t.png",
  Version1: "/logos/v1.png",
  "Party Astronauts": "/logos/pa.png",
  "Bad News Eagles": "/logos/bne.png",
  Monte: "/logos/monte.png",
  "Into The Breach": "/logos/itb.png",
  Sashi: "/logos/sashi.png",
  Preasy: "/logos/preasy.png",
  Permitta: "/logos/permitta.png",
  Apeks: "/logos/apeks.png",
  Nexus: "/logos/nexus.png",
  ECSTATIC: "/logos/ecstatic.png",
  "ALTERNATE aTTaX": "/logos/alternate.png",
  Sprout: "/logos/sprout.png",
  OG: "/logos/og.png",
  HAVU: "/logos/havu.png",
  "Movistar Riders": "/logos/movistar.png",
  x6tence: "/logos/x6tence.png",
  OFFSET: "/logos/offset.png",
  "Young Ninjas": "/logos/youngninjas.png",
  GODSENT: "/logos/godsent.png",
  Tricked: "/logos/tricked.png",
  Sinners: "/logos/sinners.png",
  PACT: "/logos/pact.png",
  Illuminar: "/logos/illuminar.png",
  Entropiq: "/logos/entropiq.png",
  "1WIN": "/logos/1win.png",
  forZe: "/logos/forze.png",
  Nemiga: "/logos/nemiga.png",
  BetBoom: "/logos/betboom.png",
  Falcons: "/logos/falcons.png",
  HEET: "/logos/heet.png",
  INTOXICANTS: "/logos/intoxicants.png",
  KOI: "/logos/koi.png",
  Nouns: "/logos/nouns.png",
  "Rare Atom": "/logos/rareatom.png",
  Rebels: "/logos/rebels.png",
  TYLOO: "/logos/tyloo.png",
  ViCi: "/logos/vici.png",
  "Wings Up": "/logos/wingsup.png",
  "Zero Tenacity": "/logos/zerotenacity.png",
  "ZETA DIVISION": "/logos/zeta.png",
  "9z": "/logos/9z.png",
  Case: "/logos/case.png",
  FENNEL: "/logos/fennel.png",
  Galorys: "/logos/galorys.png",
  Giants: "/logos/giants.png",
  GUN5: "/logos/gun5.png",
  HONORIS: "/logos/honoris.png",
  IKLA: "/logos/ikla.png",
  "LDLC OL": "/logos/ldlc.png",
  "MAD Lions": "/logos/mad-lions.png",
  MASONIC: "/logos/masonic.png",
  OCEAN: "/logos/ocean.png",
  paiN: "/logos/pain.png",
  "RUSH B": "/logos/rush-b.png",
  SAW: "/logos/saw.png",
  Sharks: "/logos/sharks.png",
  Titan: "/logos/titan.png",
  Wildcard: "/logos/wildcard.png",
  "YFP Gaming": "/logos/yfp.png",
};

// Mapeamento de variações de nomes
export const TEAM_NAME_VARIATIONS: Record<string, string[]> = {
  FURIA: ["FURIA", "Furia Esports", "FURIA Esports"],
  Imperial: ["Imperial", "Imperial Esports", "Team Imperial"],
  MIBR: ["MIBR", "Made in Brazil", "Made in Brazil Red"],
  "Natus Vincere": ["Natus Vincere", "NaVi", "Natus Vincere"],
  "FaZe Clan": ["FaZe Clan", "FaZe", "FaZe Clan"],
  "G2 Esports": ["G2 Esports", "G2", "G2 Esports"],
  "Team Vitality": ["Team Vitality", "Vitality", "Team Vitality"],
  Astralis: ["Astralis", "Astralis"],
  "Ninjas in Pyjamas": ["Ninjas in Pyjamas", "NiP", "Ninjas in Pyjamas"],
  fnatic: ["fnatic", "Fnatic"],
  "Team Liquid": ["Team Liquid", "Liquid"],
  Cloud9: ["Cloud9", "C9"],
  ENCE: ["ENCE", "ENCE eSports"],
  Heroic: ["Heroic", "Heroic"],
  BIG: ["BIG", "BIG Clan"],
  "Eternal Fire": ["Eternal Fire", "Eternal Fire"],
  MOUZ: ["MOUZ", "mousesports", "MOUSESPORTS"],
  Spirit: ["Spirit", "Team Spirit"],
  FlyQuest: ["FlyQuest", "FlyQuest Red"],
  Complexity: ["Complexity", "compLexity"],
  NRG: ["NRG", "NRG Esports"],
  HAVU: ["HAVU", "HAVU Gaming"],
  TYLOO: ["TYLOO", "TyLoo"],
  Aurora: ["Aurora", "Aurora Gaming"],
  Falcons: ["Falcons", "Falcons Esports"],
  HEET: ["HEET", "HEET Esports"],
  "Rare Atom": ["Rare Atom", "Rare Atom"],
  "Zero Tenacity": ["Zero Tenacity", "ZT"],
  "ZETA DIVISION": ["ZETA DIVISION", "ZETA"],
  "9z": ["9z", "9z Team"],
  Case: ["Case", "Case Esports"],
  Galorys: ["Galorys", "Galorys"],
  Giants: ["Giants", "Giants Gaming"],
  GUN5: ["GUN5", "GUN5"],
  HONORIS: ["HONORIS", "HONORIS"],
  IKLA: ["IKLA", "IKLA"],
  "LDLC OL": ["LDLC OL", "LDLC"],
  "MAD Lions": ["MAD Lions", "MAD Lions"],
  MASONIC: ["MASONIC", "Masonic"],
  OCEAN: ["OCEAN", "Ocean"],
  paiN: ["paiN", "paiN Gaming"],
  "RUSH B": ["RUSH B", "Rush B"],
  SAW: ["SAW", "SAW"],
  Sharks: ["Sharks", "Sharks Esports"],
  SKADE: ["SKADE", "SKADE"],
  Titan: ["Titan", "Titan Esports"],
  Wildcard: ["Wildcard", "Wildcard Gaming"],
  "Wisla Krakow": ["Wisla Krakow", "Wisła Kraków"],
  "YFP Gaming": ["YFP Gaming", "YFP"],
};

// Função para encontrar logo de um time
export function findTeamLogo(teamName: string): TeamLogo {
  if (!teamName) {
    return {
      teamName: "Unknown",
      logoUrl: "/icons/counterstrike.svg",
      source: "fallback",
    };
  }

  const normalizedName = teamName.toLowerCase().trim();

  // 1. Tentar encontrar diretamente no mapeamento local
  for (const [key, logoUrl] of Object.entries(LOCAL_TEAM_LOGOS)) {
    if (key.toLowerCase() === normalizedName) {
      return {
        teamName: key,
        logoUrl,
        source: "local",
      };
    }
  }

  // 2. Tentar variações de nomes
  for (const [canonicalName, variations] of Object.entries(
    TEAM_NAME_VARIATIONS
  )) {
    for (const variation of variations) {
      if (variation.toLowerCase() === normalizedName) {
        const logoUrl = LOCAL_TEAM_LOGOS[canonicalName];
        if (logoUrl) {
          return {
            teamName: canonicalName,
            logoUrl,
            source: "local",
          };
        }
      }
    }
  }

  // 3. Tentar correspondência parcial
  for (const [key, logoUrl] of Object.entries(LOCAL_TEAM_LOGOS)) {
    if (
      key.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(key.toLowerCase())
    ) {
      return {
        teamName: key,
        logoUrl,
        source: "local",
      };
    }
  }

  // 4. Fallback para ícone padrão
  return {
    teamName: teamName,
    logoUrl: "/icons/counterstrike.svg",
    source: "fallback",
  };
}

// Função para atualizar cache de logos da PandaScore
export async function updatePandaScoreLogos(
  teamNames: string[]
): Promise<Record<string, string>> {
  const PANDASCORE_API_KEY =
    "POciMXi8fwRIbuW3qEWvPVqGTv_Yfv55T-_mwp8DzpYOR-1mYjo";

  const logos: Record<string, string> = {};

  try {
    console.log(
      `🔍 Buscando logos na PandaScore para ${teamNames.length} times...`
    );

    // Buscar times em lotes para não sobrecarregar a API
    const batchSize = 10;
    for (let i = 0; i < teamNames.length; i += batchSize) {
      const batch = teamNames.slice(i, i + batchSize);

      for (const teamName of batch) {
        try {
          // Tentar buscar time específico
          const response = await fetch(
            `https://api.pandascore.co/csgo/teams?token=${PANDASCORE_API_KEY}&filter[name]=${encodeURIComponent(
              teamName
            )}`
          );

          if (response.ok) {
            const teams = await response.json();

            if (teams && teams.length > 0) {
              const team = teams[0]; // Pegar o primeiro resultado

              if (team.image_url) {
                logos[teamName] = team.image_url;
                console.log(
                  `✅ Logo encontrado para ${teamName}: ${team.image_url}`
                );
              } else {
                console.log(`⚠️ Time ${teamName} encontrado, mas sem logo`);
              }
            } else {
              console.log(`❌ Time ${teamName} não encontrado na PandaScore`);
            }
          } else {
            console.log(`❌ Erro ao buscar ${teamName}: ${response.status}`);
          }

          // Pequena pausa para não sobrecarregar
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Erro ao buscar logo de ${teamName}:`, error);
          continue;
        }
      }
    }

    console.log(
      `📸 Encontradas ${Object.keys(logos).length}/${
        teamNames.length
      } logos na PandaScore`
    );
    return logos;
  } catch (error) {
    console.error("Erro geral ao buscar logos:", error);
    return {};
  }
}

// Função principal para obter logo de time (combina todas as fontes)
export function getTeamLogo(teamName: string): TeamLogo {
  // Primeiro tentar logo local
  const localLogo = findTeamLogo(teamName);

  if (localLogo.source === "local") {
    return localLogo;
  }

  // Se não encontrou local, tentar variações ou fallback
  return localLogo;
}

// Função para verificar se um time tem logo local
export function hasLocalLogo(teamName: string): boolean {
  const logo = findTeamLogo(teamName);
  return logo.source === "local";
}

// Função para obter todos os times que têm logos locais
export function getTeamsWithLocalLogos(): string[] {
  return Object.keys(LOCAL_TEAM_LOGOS);
}

// Função para adicionar nova logo local (para desenvolvimento)
export function addLocalLogo(teamName: string, logoPath: string): void {
  LOCAL_TEAM_LOGOS[teamName] = logoPath;
  console.log(`✅ Logo local adicionada: ${teamName} -> ${logoPath}`);
}
