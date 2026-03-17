import { NextRequest, NextResponse } from "next/server";

const BETSAPI_BASE_URL = "https://api.b365api.com/v1";
const API_TOKEN = process.env.API_KEY_1;

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
    console.log("🏆 Buscando lista de esportes disponíveis...");

    // Tentar buscar lista de esportes
    const url = `${BETSAPI_BASE_URL}/bet365/sports?token=${API_TOKEN}`;
    const sportsResponse = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "CSGO-Intel/1.0",
      },
    });

    if (!sportsResponse.ok) {
      return NextResponse.json(
        {
          error: `Erro na API: ${sportsResponse.status}`,
          message:
            "Endpoint de esportes pode não estar disponível ou requer permissões especiais",
        },
        { status: sportsResponse.status }
      );
    }

    const sportsData = await sportsResponse.json();
    console.log(
      `✅ Lista de esportes obtida: ${sportsData.results?.length || 0} esportes`
    );

    // Procurar por CS:GO ou Counter-Strike
    const csgoSports =
      sportsData.results?.filter(
        (sport: any) =>
          sport.name?.toLowerCase().includes("counter") ||
          sport.name?.toLowerCase().includes("cs:go") ||
          sport.name?.toLowerCase().includes("csgo") ||
          sport.name?.toLowerCase().includes("esports") ||
          sport.name?.toLowerCase().includes("e-sports")
      ) || [];

    // Também procurar por IDs comuns de esports
    const esportsIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50];
    const potentialEsports =
      sportsData.results?.filter((sport: any) =>
        esportsIds.includes(sport.id)
      ) || [];

    return NextResponse.json({
      success: true,
      totalSports: sportsData.results?.length || 0,
      csgoCandidates: csgoSports,
      potentialEsports: potentialEsports,
      allSports: sportsData.results || [],
      recommendations: [
        csgoSports.length > 0
          ? `🎯 Encontrados ${csgoSports.length} possíveis esportes CS:GO!`
          : "❌ Nenhum esporte identificado como CS:GO. Verificar IDs manuais.",
        "🔍 Testar sport_id=2, 3, 4, 5 para esports",
        "📊 Verificar documentação da BETSAPI para IDs corretos",
      ],
    });
  } catch (error: any) {
    console.error("Erro ao buscar esportes:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao buscar lista de esportes",
        details: error.message,
        fallbackSuggestions: [
          "sport_id=1: Soccer/Futebol",
          "sport_id=2: Basketball",
          "sport_id=3: Baseball",
          "sport_id=4: Ice Hockey",
          "sport_id=5: Tennis",
          "sport_id=6: American Football",
          "sport_id=7: Snooker",
          "sport_id=8: Boxing/MMA",
          "sport_id=9: Volleyball",
          "sport_id=10: Table Tennis",
          "sport_id=20+: Geralmente esports (CS:GO pode ser 25, 30, etc.)",
        ],
      },
      { status: 500 }
    );
  }
}
