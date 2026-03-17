import { NextRequest, NextResponse } from "next/server";

const BETSAPI_BASE_URL = "https://api.b365api.com/v1";
const API_TOKEN = process.env.API_KEY_1;

export async function GET(request: NextRequest) {
  if (!API_TOKEN || API_TOKEN === "YOUR_BETSAPI_TOKEN_HERE") {
    return NextResponse.json(
      {
        error: "API token not configured",
      },
      { status: 400 }
    );
  }

  try {
    console.log("🔍 Buscando TODOS os jogos ao vivo disponíveis...");

    // Testar sport_ids mais prováveis para CS2
    const cs2SportIds = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 35, 40, 45, 50, 100, 200,
      300, 400, 500, 600, 700, 800, 900, 1000,
    ];

    const allLiveMatches: any[] = [];
    const cs2Candidates: any[] = [];

    for (const sportId of cs2SportIds) {
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
          const matches = liveData.results || [];

          if (matches.length > 0) {
            console.log(`📺 Sport ${sportId}: ${matches.length} jogos ao vivo`);

            // Adicionar todos os jogos encontrados
            matches.forEach((match: any) => {
              const matchInfo = {
                sportId,
                id: match.id || match.event_id,
                league: match.league?.name || match.league_name || "Unknown",
                home: match.home?.name || match.home_name || "Unknown",
                away: match.away?.name || match.away_name || "Unknown",
                time: match.time,
                status: match.ss,
                scores: match.scores,
                raw: match,
              };

              allLiveMatches.push(matchInfo);

              // Verificar se pode ser CS2
              const text =
                `${matchInfo.league} ${matchInfo.home} ${matchInfo.away}`.toLowerCase();
              if (
                text.includes("cs2") ||
                text.includes("counter") ||
                text.includes("strike") ||
                text.includes("cct") ||
                text.includes("sharks") ||
                text.includes("gaimin") ||
                text.includes("esports") ||
                text.includes("e-sports")
              ) {
                cs2Candidates.push(matchInfo);
              }
            });
          }
        }

        // Pausa menor para ser mais rápido
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.log(`❌ Erro no sport ${sportId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalLiveMatches: allLiveMatches.length,
      cs2Candidates: cs2Candidates,
      allMatches: allLiveMatches.slice(0, 50), // Limitar para não sobrecarregar
      summary: {
        sportIdsTested: cs2SportIds.length,
        totalMatchesFound: allLiveMatches.length,
        cs2CandidatesFound: cs2Candidates.length,
        sportsWithMatches: [...new Set(allLiveMatches.map((m) => m.sportId))],
      },
    });
  } catch (error: any) {
    console.error("Erro:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
