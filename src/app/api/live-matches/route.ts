import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BETSAPI_BASE_URL = "https://api.b365api.com";
const API_TOKEN = process.env.API_KEY_1;

interface LiveMatch {
  id: string;
  time: string;
  eventTimestamp?: number;
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
  status: string;
  scores?: {
    home: number;
    away: number;
  };
  timer?: string;
  totalRounds?: number;
  scoreDiff?: number;
  momentum?: "equilibrado" | "vantagem_home" | "vantagem_away";
  statusText?: string;
}

// Detecta se um jogo é de CS:GO/CS2 por palavras-chave
function checkIfCsgoMatch(match: any): boolean {
  if (!match) return false;

  const leagueName = (
    match.league?.name ||
    match.league_name ||
    ""
  ).toLowerCase();
  const homeName = (match.home?.name || match.home_name || "").toLowerCase();
  const awayName = (match.away?.name || match.away_name || "").toLowerCase();

  // Filtros para evitar ligas de outros jogos (dota, lol etc.)
  const blacklist = ["dota", "dota2", "lol", "league of legends", "valorant"];
  const combined = `${leagueName} ${homeName} ${awayName}`;
  if (blacklist.some((word) => combined.includes(word))) return false;

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
    "cct",
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

// Filtra eventos muito antigos ou muito futuros
function isFreshEvent(raw: any, nowSeconds: number): boolean {
  const eventTime = Number(raw?.time || raw?.time_str);
  if (!Number.isFinite(eventTime)) return true; // sem tempo confiável, não filtra

  const ageHours = (nowSeconds - eventTime) / 3600;

  // Aceita eventos até 24h no passado e 6h no futuro (janelas mais tolerantes).
  // Evita descartar jogos recém-encerrados que ainda aparecem como "inplay".
  if (ageHours > 24) return false;
  if (ageHours < -6) return false;

  return true;
}

// Mapeia o resultado cru da BetsAPI para o shape usado no front
function mapToLiveMatch(raw: any): LiveMatch {
  let homeScore = 0;
  let awayScore = 0;

  // scores podem vir como "ss": "12-8"
  if (typeof raw?.ss === "string" && raw.ss.includes("-")) {
    const [h, a] = raw.ss.split("-").map((n: string) => parseInt(n, 10));
    homeScore = Number.isFinite(h) ? h : 0;
    awayScore = Number.isFinite(a) ? a : 0;
  } else if (raw?.scores) {
    homeScore = Number(raw.scores?.home || 0);
    awayScore = Number(raw.scores?.away || 0);
  }

  const timerValue =
    raw?.timer && typeof raw.timer === "object"
      ? raw.timer.tt || raw.timer.ts || String(raw.timer.tm ?? "")
      : raw?.timer || raw?.time_str || undefined;

  const status = String(
    raw?.time_status ||
      raw?.status ||
      raw?.time ||
      raw?.time_str ||
      raw?.timer ||
      "desconhecido"
  );

  const totalRounds = homeScore + awayScore;
  const scoreDiff = homeScore - awayScore;
  let momentum: "equilibrado" | "vantagem_home" | "vantagem_away" =
    "equilibrado";
  if (scoreDiff > 0) momentum = "vantagem_home";
  if (scoreDiff < 0) momentum = "vantagem_away";

  return {
    id: String(raw?.id || raw?.ID || Math.random()),
    time: String(raw?.time || raw?.time_str || ""),
    eventTimestamp: Number(raw?.time || raw?.time_str) || undefined,
    league: {
      name: raw?.league?.name || raw?.league_name || "League",
      id: String(raw?.league?.id || raw?.league_id || ""),
    },
    home: {
      name: raw?.home?.name || raw?.home_name || "Time A",
      id: String(raw?.home?.id || raw?.home_id || ""),
    },
    away: {
      name: raw?.away?.name || raw?.away_name || "Time B",
      id: String(raw?.away?.id || raw?.away_id || ""),
    },
    status: String(status),
    scores: {
      home: homeScore,
      away: awayScore,
    },
    timer: timerValue || undefined,
    totalRounds,
    scoreDiff,
    momentum,
    statusText: status,
  };
}

export async function GET(request: NextRequest) {
  if (!API_TOKEN || API_TOKEN === "YOUR_BETSAPI_TOKEN_HERE") {
    return NextResponse.json(
      {
        success: false,
        error: "API token não configurado. Defina API_KEY_1 no .env",
      },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const sportId = searchParams.get("sport_id") || "151"; // e-sports (ajustar se houver ID específico de CS2)
    const eventId = searchParams.get("event_id");

    console.log(
      `🔴 Buscando jogos AO VIVO na BetsAPI sport_id=${sportId}${
        eventId ? ` event_id=${eventId}` : ""
      }`
    );

    let apiUrl = `${BETSAPI_BASE_URL}/v3/events/inplay?sport_id=${sportId}&token=${API_TOKEN}`;
    if (eventId) {
      apiUrl += `&event_id=${eventId}`;
    }

    const liveResponse = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "CSGO-Intel/1.0",
      },
    });

    if (!liveResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Erro na API BETSAPI: ${liveResponse.status}`,
        },
        { status: liveResponse.status }
      );
    }

    const liveData = await liveResponse.json();
    const results = Array.isArray(liveData?.results) ? liveData.results : [];
    const nowSeconds = Math.floor(Date.now() / 1000);
    const freshResults = results.filter((r: any) => isFreshEvent(r, nowSeconds));
    const mapped = freshResults.map(mapToLiveMatch);
    const filtered = mapped.filter((m: LiveMatch) => checkIfCsgoMatch(m));

    console.log(
      "LIVE-MATCHES DEBUG",
      JSON.stringify({
        raw: results.length,
        fresh: freshResults.length,
        filtered: filtered.length,
        sample: filtered.slice(0, 3),
      })
    );

    return NextResponse.json({
      success: true,
      data: filtered,
      totalLiveMatches: filtered.length,
      csgoSportIds: [Number(sportId)],
      testedSports: [],
      metadata: {
        csgoLiveMatchesFound: filtered.length,
        sportIdsTested: 1,
        workingSportIds: filtered.length > 0 ? 1 : 0,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Erro ao buscar jogos ao vivo:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao buscar jogos ao vivo",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
