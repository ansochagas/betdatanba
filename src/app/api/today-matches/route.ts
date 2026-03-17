import { NextRequest, NextResponse } from "next/server";

const BETSAPI_BASE_URL = "https://api.b365api.com/v1";
const API_TOKEN = process.env.API_KEY_1;

interface CSGOMatch {
  id: string;
  time: string;
  league: {
    name: string;
    id: string;
  };
  home: {
    name: string;
    id: string;
  };
  away: {
    name: string;
    id: string;
  };
  ss?: string; // Match status
  scores?: {
    home: number;
    away: number;
  };
}

// Função para detectar se um jogo é de CS:GO
function checkIfCsgoMatch(match: any): boolean {
  if (!match) return false;

  const leagueName = (
    match.league?.name ||
    match.league_name ||
    ""
  ).toLowerCase();
  const homeName = (match.home?.name || match.home_name || "").toLowerCase();
  const awayName = (match.away?.name || match.away_name || "").toLowerCase();

  // Palavras-chave que indicam CS:GO/CS2
  const csgoKeywords = [
    "counter",
    "strike",
    "cs:go",
    "csgo",
    "cs2",
    "counter-strike",
    "counter strike",
    "esports",
    "e-sports",
    "blast",
    "iem",
    "esl",
    "pgl",
    "dreamhack",
    "starladder",
    "navi",
    "faze",
    "vitality",
    "astralis",
    "liquid",
    "fnatic",
    "cloud9",
    "g2",
    "heroic",
    "ence",
    "nip",
    "mouz",
    "big",
    "furia",
    "imperial",
    "pain",
    "fluxo",
    "case",
    "los gigantes",
    "9z",
    "red canids",
    "intz",
    "kabum",
    "vivo keyd",
  ];

  const allText = `${leagueName} ${homeName} ${awayName}`;

  return csgoKeywords.some((keyword) => allText.includes(keyword));
}

export async function GET(request: NextRequest) {
  if (!API_TOKEN || API_TOKEN === "YOUR_BETSAPI_TOKEN_HERE") {
    return NextResponse.json(
      {
        error: "API token not configured. Please set API_KEY_1 in .env file",
        setup: {
          step1: "Add your BETSAPI token to .env file",
          step2: "Set API_KEY_1=your_token_here",
          step3: "Restart the development server",
        },
      },
      { status: 400 }
    );
  }

  try {
    console.log("🎮 Buscando jogos de CS:GO de hoje...");

    // Lista expandida de sport_ids possíveis para CS:GO/CS2
    const possibleSportIds = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80,
      90, 100, 150, 200, 250, 300, 350, 400, 450, 500,
    ];
    const csgoMatches = [];
    const testedSports = [];

    // Testar cada sport_id
    for (const sportId of possibleSportIds) {
      try {
        console.log(`🔍 Testando sport_id=${sportId}...`);

        // Buscar jogos futuros
        const upcomingResponse = await fetch(
          `${BETSAPI_BASE_URL}/bet365/upcoming?token=${API_TOKEN}&sport_id=${sportId}`,
          {
            headers: {
              Accept: "application/json",
              "User-Agent": "CSGO-Intel/1.0",
            },
          }
        );

        if (upcomingResponse.ok) {
          const upcomingData = await upcomingResponse.json();
          const matchCount = upcomingData.results?.length || 0;

          testedSports.push({
            sportId,
            status: "success",
            upcomingMatches: matchCount,
            hasData: matchCount > 0,
          });

          // Se encontrou jogos, verificar se são de CS:GO
          if (matchCount > 0) {
            const sampleMatch = upcomingData.results[0];
            const isCsgo = checkIfCsgoMatch(sampleMatch);

            if (isCsgo) {
              console.log(`🎯 CS:GO encontrado no sport_id=${sportId}!`);
              csgoMatches.push({
                sportId,
                type: "upcoming",
                matches: upcomingData.results,
                sampleMatch,
              });
            }
          }
        } else {
          testedSports.push({
            sportId,
            status: "error",
            error: upcomingResponse.status,
          });
        }

        // Pequena pausa para não sobrecarregar a API
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        testedSports.push({
          sportId,
          status: "error",
          error: "Network error",
        });
      }
    }

    // Buscar jogos ao vivo com sport_ids que funcionaram
    const workingSportIds = testedSports
      .filter((s) => s.status === "success")
      .map((s) => s.sportId);

    const liveMatches = [];
    for (const sportId of workingSportIds.slice(0, 3)) {
      // Limitar para não sobrecarregar
      try {
        const liveResponse = await fetch(
          `${BETSAPI_BASE_URL}/bet365/inplay?token=${API_TOKEN}&sport_id=${sportId}`,
          {
            headers: {
              Accept: "application/json",
              "User-Agent": "CSGO-Intel/1.0",
            },
          }
        );

        if (liveResponse.ok) {
          const liveData = await liveResponse.json();
          const matchCount = liveData.results?.length || 0;

          if (matchCount > 0) {
            const sampleMatch = liveData.results[0];
            const isCsgo = checkIfCsgoMatch(sampleMatch);

            if (isCsgo) {
              liveMatches.push({
                sportId,
                matches: liveData.results,
                sampleMatch,
              });
            }
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        // Ignorar erros de live matches
      }
    }

    // Combinar todos os jogos de CS:GO encontrados
    const allCsgoMatches = [
      ...csgoMatches.flatMap((c) => c.matches || []),
      ...liveMatches.flatMap((l) => l.matches || []),
    ];

    // Filtrar jogos de hoje e próximos dias
    const today = new Date();
    const todayString = today.toISOString().split("T")[0];

    const todayMatches = allCsgoMatches.filter((match: any) => {
      if (!match.time) return false;

      try {
        const matchDate = new Date(match.time * 1000);
        const matchDateString = matchDate.toISOString().split("T")[0];

        // Incluir jogos de hoje e próximos 2 dias
        const maxDate = new Date();
        maxDate.setDate(today.getDate() + 2);
        const maxDateString = maxDate.toISOString().split("T")[0];

        return (
          matchDateString >= todayString && matchDateString <= maxDateString
        );
      } catch (error) {
        console.warn(`Erro ao processar data do jogo: ${match.time}`, error);
        return false;
      }
    });

    console.log(`✅ Total de jogos CS:GO encontrados: ${todayMatches.length}`);

    // Formatar resposta
    const formattedMatches = todayMatches.map((match: any) => ({
      id: match.id || match.event_id,
      time: match.time
        ? new Date(match.time * 1000).toLocaleString("pt-BR")
        : "Horário não disponível",
      league: {
        name: match.league?.name || match.league_name || "Liga não informada",
        id: match.league?.id || match.league_id || "N/A",
      },
      home: {
        name: match.home?.name || match.home_name || "Time Casa",
        id: match.home?.id || match.home_id || "N/A",
      },
      away: {
        name: match.away?.name || match.away_name || "Time Visitante",
        id: match.away?.id || match.away_id || "N/A",
      },
      status: match.ss || "upcoming",
      scores: match.scores || null,
      raw: match, // Manter dados brutos para debug
    }));

    return NextResponse.json({
      success: true,
      date: todayString,
      totalMatches: formattedMatches.length,
      matches: formattedMatches,
      csgoSportIds: csgoMatches.map((c) => c.sportId),
      testedSports: testedSports,
      metadata: {
        csgoMatchesFound: csgoMatches.length,
        liveMatchesFound: liveMatches.length,
        sportIdsTested: possibleSportIds.length,
        workingSportIds: testedSports.filter((s) => s.status === "success")
          .length,
        recommendations:
          csgoMatches.length > 0
            ? [
                `🎯 CS:GO encontrado nos sport_ids: ${csgoMatches
                  .map((c) => c.sportId)
                  .join(", ")}`,
              ]
            : [
                "❌ Nenhum jogo de CS:GO encontrado. Verificar se o plano da API inclui esports.",
              ],
      },
    });
  } catch (error: any) {
    console.error("Erro ao buscar jogos de hoje:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao buscar jogos de CS:GO",
        details: error.message,
        date: new Date().toISOString().split("T")[0],
      },
      { status: 500 }
    );
  }
}
