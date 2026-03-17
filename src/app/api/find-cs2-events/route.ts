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
      "🔍 Buscando TODOS os eventos disponíveis para encontrar CS2..."
    );

    // Primeiro, vamos tentar encontrar jogos futuros (upcoming) em sport_ids prováveis
    const possibleSportIds = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 35, 40, 45, 50, 100, 200,
      300, 400, 500, 600, 700, 800, 900, 1000,
    ];

    const allEvents = [];
    const cs2Events = [];

    console.log("📅 Buscando jogos futuros (upcoming)...");

    for (const sportId of possibleSportIds) {
      try {
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
          const events = upcomingData.results || [];

          for (const event of events) {
            const eventInfo = {
              id: event.id || event.event_id,
              sportId,
              type: "upcoming",
              league: event.league?.name || event.league_name || "Unknown",
              home: event.home?.name || event.home_name || "Unknown",
              away: event.away?.name || event.away_name || "Unknown",
              time: event.time,
              raw: event,
            };

            allEvents.push(eventInfo);

            // Verificar se é CS2
            const text =
              `${eventInfo.league} ${eventInfo.home} ${eventInfo.away}`.toLowerCase();
            if (
              text.includes("cs2") ||
              text.includes("counter") ||
              text.includes("strike") ||
              text.includes("cct") ||
              text.includes("sharks") ||
              text.includes("gaimin") ||
              text.includes("esports") ||
              text.includes("e-sports") ||
              text.includes("blast") ||
              text.includes("iem") ||
              text.includes("esl")
            ) {
              cs2Events.push(eventInfo);
              console.log(
                `🎯 CS2 Event encontrado: ${eventInfo.league} - ${eventInfo.home} vs ${eventInfo.away} (ID: ${eventInfo.id})`
              );
            }
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.log(`❌ Erro no sport ${sportId}`);
      }
    }

    console.log("🔴 Buscando jogos ao vivo (in-play)...");

    // Agora buscar jogos ao vivo
    for (const sportId of possibleSportIds) {
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
          const events = liveData.results || [];

          for (const event of events) {
            const eventInfo = {
              id: event.id || event.event_id,
              sportId,
              type: "live",
              league: event.league?.name || event.league_name || "Unknown",
              home: event.home?.name || event.home_name || "Unknown",
              away: event.away?.name || event.away_name || "Unknown",
              time: event.time,
              status: event.ss,
              scores: event.scores,
              raw: event,
            };

            allEvents.push(eventInfo);

            // Verificar se é CS2
            const text =
              `${eventInfo.league} ${eventInfo.home} ${eventInfo.away}`.toLowerCase();
            if (
              text.includes("cs2") ||
              text.includes("counter") ||
              text.includes("strike") ||
              text.includes("cct") ||
              text.includes("sharks") ||
              text.includes("gaimin") ||
              text.includes("esports") ||
              text.includes("e-sports") ||
              text.includes("blast") ||
              text.includes("iem") ||
              text.includes("esl")
            ) {
              cs2Events.push(eventInfo);
              console.log(
                `🔴 CS2 LIVE encontrado: ${eventInfo.league} - ${eventInfo.home} vs ${eventInfo.away} (ID: ${eventInfo.id})`
              );
            }
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.log(`❌ Erro no sport ${sportId} (live)`);
      }
    }

    console.log(`✅ Busca completa finalizada!`);
    console.log(`📊 Total de eventos encontrados: ${allEvents.length}`);
    console.log(`🎯 Eventos CS2 identificados: ${cs2Events.length}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalEvents: allEvents.length,
        cs2Events: cs2Events.length,
        sportIdsTested: possibleSportIds.length,
        upcomingEvents: allEvents.filter((e) => e.type === "upcoming").length,
        liveEvents: allEvents.filter((e) => e.type === "live").length,
      },
      cs2Events: cs2Events,
      sampleEvents: allEvents.slice(0, 20), // Primeiros 20 eventos como exemplo
      recommendations:
        cs2Events.length > 0
          ? [
              `🎯 Encontrados ${cs2Events.length} eventos CS2! Use os IDs para acessar detalhes.`,
            ]
          : [
              "❌ Nenhum evento CS2 encontrado. Verificar se há torneios ativos.",
            ],
    });
  } catch (error: any) {
    console.error("Erro na busca de eventos:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
