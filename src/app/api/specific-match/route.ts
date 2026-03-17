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
    console.log(
      "🎯 Buscando jogo específico: Sharks vs Gaimin Gladiators (CCT South America)"
    );

    // Buscar jogos ao vivo em sport_ids prováveis para CS2
    const cs2SportIds = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 35, 40, 45, 50, 100, 200,
      300, 400, 500,
    ];

    let foundMatch = null;
    const searchResults = [];

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

          for (const match of matches) {
            const leagueName = (
              match.league?.name ||
              match.league_name ||
              ""
            ).toLowerCase();
            const homeName = (
              match.home?.name ||
              match.home_name ||
              ""
            ).toLowerCase();
            const awayName = (
              match.away?.name ||
              match.away_name ||
              ""
            ).toLowerCase();

            // Verificar se é o jogo específico
            const isSharksGaimin =
              (homeName.includes("shark") && awayName.includes("gaimin")) ||
              (homeName.includes("gaimin") && awayName.includes("shark"));

            const isCCT =
              leagueName.includes("cct") ||
              leagueName.includes("south america");

            searchResults.push({
              sportId,
              league: match.league?.name || match.league_name,
              home: match.home?.name || match.home_name,
              away: match.away?.name || match.away_name,
              isTargetMatch: isSharksGaimin && isCCT,
              match,
            });

            if (isSharksGaimin && isCCT) {
              foundMatch = {
                sportId,
                match: {
                  id: match.id || match.event_id,
                  league: match.league?.name || match.league_name,
                  home: match.home?.name || match.home_name,
                  away: match.away?.name || match.away_name,
                  time: match.time,
                  status: match.ss,
                  scores: match.scores,
                  timer: match.timer,
                },
                raw: match,
              };
              console.log(
                `🎯 ENCONTRADO! Sharks vs Gaimin Gladiators no sport_id=${sportId}`
              );
              break;
            }
          }

          if (foundMatch) break;
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.log(`❌ Erro no sport ${sportId}`);
      }
    }

    if (foundMatch) {
      return NextResponse.json({
        success: true,
        found: true,
        message: "Jogo encontrado!",
        match: foundMatch,
        searchSummary: {
          sportIdsTested: cs2SportIds.length,
          totalMatchesChecked: searchResults.length,
          foundInSportId: foundMatch.sportId,
        },
      });
    } else {
      return NextResponse.json({
        success: true,
        found: false,
        message: "Jogo não encontrado no momento",
        searchSummary: {
          sportIdsTested: cs2SportIds.length,
          totalMatchesChecked: searchResults.length,
          possibleReasons: [
            "Jogo já terminou",
            "Jogo ainda não começou",
            "Nomes dos times diferentes na API",
            "Liga classificada de forma diferente",
          ],
        },
        sampleMatches: searchResults.slice(0, 10), // Mostrar primeiros 10 jogos encontrados
      });
    }
  } catch (error: any) {
    console.error("Erro na busca específica:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
