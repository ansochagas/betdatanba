import { NextRequest, NextResponse } from "next/server";

const BETSAPI_BASE_URL = "https://api.b365api.com/v1";
const API_TOKEN = process.env.API_KEY_1;

interface APIEndpoint {
  name: string;
  url: string;
  description: string;
  params?: Record<string, string>;
}

const CSGO_ENDPOINTS: APIEndpoint[] = [
  {
    name: "Upcoming Matches",
    url: "/bet365/upcoming",
    description: "Lista de jogos futuros de CS:GO",
    params: { sport_id: "1" }, // CS:GO sport_id
  },
  {
    name: "In-Play Matches",
    url: "/bet365/inplay",
    description: "Jogos ao vivo em andamento",
    params: { sport_id: "1" },
  },
  {
    name: "Match Details",
    url: "/bet365/event",
    description: "Detalhes específicos de um jogo",
    params: { FI: "12345678" }, // Example match ID
  },
  {
    name: "Match Odds",
    url: "/bet365/prematch",
    description: "Odds e probabilidades de jogos",
    params: { FI: "12345678" },
  },
  {
    name: "Live Match Stats",
    url: "/bet365/result",
    description: "Estatísticas ao vivo dos jogos",
    params: { event_id: "12345678" },
  },
  {
    name: "Player Statistics",
    url: "/bet365/player_stats",
    description: "Estatísticas de jogadores",
    params: { event_id: "12345678" },
  },
  {
    name: "Tournament Standings",
    url: "/bet365/standings",
    description: "Classificação de torneios",
    params: { league_id: "12345" },
  },
  {
    name: "Team Information",
    url: "/bet365/teams",
    description: "Informações sobre times",
    params: { team_id: "12345" },
  },
];

async function testEndpoint(endpoint: APIEndpoint) {
  try {
    const params = new URLSearchParams({
      token: API_TOKEN!,
      ...endpoint.params,
    });

    const fullUrl = `${BETSAPI_BASE_URL}${endpoint.url}?${params}`;

    console.log(`Testing: ${endpoint.name} - ${fullUrl}`);

    const response = await fetch(fullUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "CSGO-Intel-Explorer/1.0",
      },
      // Add timeout
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        endpoint: endpoint.name,
        url: endpoint.url,
        status: response.status,
        error: `HTTP ${response.status}: ${response.statusText}`,
        available: false,
      };
    }

    const data = await response.json();

    // Analyze the response structure
    const analysis = analyzeResponseStructure(data);

    return {
      endpoint: endpoint.name,
      url: endpoint.url,
      status: response.status,
      available: true,
      dataStructure: analysis,
      sampleData: data,
      recordCount: Array.isArray(data.results) ? data.results.length : "N/A",
    };
  } catch (error: any) {
    return {
      endpoint: endpoint.name,
      url: endpoint.url,
      status: "ERROR",
      error: error.message,
      available: false,
    };
  }
}

function analyzeResponseStructure(data: any): any {
  if (!data || typeof data !== "object") {
    return { type: typeof data, value: data };
  }

  const structure: any = {};

  // Check for common BETSAPI response patterns
  if (data.success !== undefined) {
    structure.success = typeof data.success;
  }

  if (data.results) {
    structure.results = {
      type: Array.isArray(data.results) ? "array" : typeof data.results,
      count: Array.isArray(data.results) ? data.results.length : "N/A",
    };

    // Analyze first result if available
    if (Array.isArray(data.results) && data.results.length > 0) {
      structure.sampleResult = analyzeObjectStructure(data.results[0]);
    }
  }

  if (data.paging) {
    structure.paging = analyzeObjectStructure(data.paging);
  }

  // Check for CS:GO specific data
  if (data.league) {
    structure.league = analyzeObjectStructure(data.league);
  }

  if (data.home || data.away) {
    structure.teams = {
      home: data.home ? analyzeObjectStructure(data.home) : null,
      away: data.away ? analyzeObjectStructure(data.away) : null,
    };
  }

  if (data.events || data.matches) {
    const events = data.events || data.matches;
    structure.events = {
      type: Array.isArray(events) ? "array" : typeof events,
      count: Array.isArray(events) ? events.length : "N/A",
    };

    if (Array.isArray(events) && events.length > 0) {
      structure.sampleEvent = analyzeObjectStructure(events[0]);
    }
  }

  return structure;
}

function analyzeObjectStructure(obj: any): any {
  if (!obj || typeof obj !== "object") {
    return { type: typeof obj, value: obj };
  }

  const structure: any = {};
  const keys = Object.keys(obj);

  for (const key of keys.slice(0, 10)) {
    // Limit to first 10 keys
    const value = obj[key];
    structure[key] = {
      type: Array.isArray(value) ? `array[${value.length}]` : typeof value,
      sample:
        Array.isArray(value) && value.length > 0 ? typeof value[0] : value,
    };
  }

  if (keys.length > 10) {
    structure.moreKeys = `${keys.length - 10} more...`;
  }

  return structure;
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
    console.log("🚀 Starting BETSAPI exploration...");

    const results = [];

    // Test each endpoint
    for (const endpoint of CSGO_ENDPOINTS) {
      console.log(`\n📡 Testing ${endpoint.name}...`);
      const result = await testEndpoint(endpoint);
      results.push(result);

      // Add small delay between requests to be respectful
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const summary = {
      totalEndpoints: results.length,
      availableEndpoints: results.filter((r) => r.available).length,
      failedEndpoints: results.filter((r) => !r.available).length,
      timestamp: new Date().toISOString(),
      apiTokenConfigured: !!API_TOKEN,
    };

    return NextResponse.json({
      summary,
      results,
      recommendations: generateRecommendations(results),
    });
  } catch (error: any) {
    console.error("Exploration error:", error);
    return NextResponse.json(
      { error: "Failed to explore API", details: error.message },
      { status: 500 }
    );
  }
}

function generateRecommendations(results: any[]): string[] {
  const recommendations = [];

  const availableEndpoints = results.filter((r) => r.available);
  const failedEndpoints = results.filter((r) => !r.available);

  if (availableEndpoints.length === 0) {
    recommendations.push(
      "❌ Nenhum endpoint da API está acessível. Verifique o token da API."
    );
    return recommendations;
  }

  recommendations.push(
    `✅ ${availableEndpoints.length} endpoints funcionais encontrados`
  );

  // Check for key data types
  const hasUpcoming = availableEndpoints.some((r) =>
    r.endpoint.includes("Upcoming")
  );
  const hasLive = availableEndpoints.some((r) =>
    r.endpoint.includes("In-Play")
  );
  const hasDetails = availableEndpoints.some((r) =>
    r.endpoint.includes("Details")
  );
  const hasOdds = availableEndpoints.some((r) => r.endpoint.includes("Odds"));

  if (hasUpcoming) {
    recommendations.push(
      "📅 API suporta jogos futuros - podemos implementar previsões"
    );
  }

  if (hasLive) {
    recommendations.push(
      "🔴 API suporta jogos ao vivo - podemos implementar acompanhamento em tempo real"
    );
  }

  if (hasDetails) {
    recommendations.push(
      "📊 API suporta detalhes de jogos - podemos obter estatísticas detalhadas"
    );
  }

  if (hasOdds) {
    recommendations.push(
      "💰 API suporta odds - podemos implementar análise de probabilidades"
    );
  }

  if (failedEndpoints.length > 0) {
    recommendations.push(
      `⚠️ ${failedEndpoints.length} endpoints falharam - podem precisar de permissões adicionais`
    );
  }

  return recommendations;
}
