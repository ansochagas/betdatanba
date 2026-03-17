import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isReportsEnabled } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

function reportsDisabledResponse() {
  return NextResponse.json(
    {
      success: false,
      error: "Relatorios temporariamente desabilitados para o teste externo.",
    },
    { status: 403 }
  );
}

const PANDASCORE_BASE_URL =
  process.env.PANDASCORE_BASE_URL ?? "https://api.pandascore.co";
const PANDASCORE_API_KEY = process.env.PANDASCORE_API_KEY || "";
const BETSAPI_BASE_URL = "https://api.b365api.com/v3";
const BETSAPI_TOKEN = process.env.API_KEY_1 || "";
const BETSAPI_CS2_SPORT_ID = "151";
const BETSAPI_ENDED_MAX_PAGES = Math.min(
  Math.max(Number(process.env.BETSAPI_ENDED_MAX_PAGES || "20"), 1),
  20
);

type MatchResult = {
  finished: boolean;
  winnerName: string | null;
  scoreHome: number | null;
  scoreAway: number | null;
};

function safeLower(value: string | null | undefined) {
  return (value || "").toLowerCase();
}

const TEAM_STOP_WORDS = new Set([
  "esports",
  "esport",
  "gaming",
  "club",
  "team",
  "academy",
  "sport",
]);

function normalizeTeamName(
  value: string | null | undefined,
  mode: "strict" | "loose" = "strict"
) {
  const raw = safeLower(value);
  if (mode === "strict") {
    return raw.replace(/[^a-z0-9]+/g, "");
  }

  const tokens = raw
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .filter((token) => !TEAM_STOP_WORDS.has(token));

  return tokens.join("");
}

function formatDayUTC(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

type BetsApiEvent = {
  id: string;
  time: string;
  time_status: string;
  league?: { id?: string; name?: string };
  home?: { name?: string };
  away?: { name?: string };
  ss?: string | null;
  scores?: Record<string, { home?: string; away?: string }>;
};

const ENDED_EVENTS_TTL_MS = 10 * 60 * 1000;
const endedEventsCache = new Map<
  string,
  { updatedAt: number; events: BetsApiEvent[] }
>();

function parseEventScore(event: BetsApiEvent) {
  const raw =
    typeof event.ss === "string" && event.ss.includes("-")
      ? event.ss
      : event.scores?.["4"]
        ? `${event.scores?.["4"].home}-${event.scores?.["4"].away}`
        : null;

  if (!raw) return null;

  const [homeStr, awayStr] = raw.split("-");
  const scoreHome = Number(homeStr);
  const scoreAway = Number(awayStr);

  if (Number.isNaN(scoreHome) || Number.isNaN(scoreAway)) {
    return null;
  }

  return { scoreHome, scoreAway };
}

async function fetchEndedEvents(day: string) {
  const cached = endedEventsCache.get(day);
  if (cached && Date.now() - cached.updatedAt < ENDED_EVENTS_TTL_MS) {
    return cached.events;
  }

  if (!BETSAPI_TOKEN) {
    console.error("API_KEY_1 nao configurada para BetsAPI");
    return [];
  }

  const results: BetsApiEvent[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= BETSAPI_ENDED_MAX_PAGES) {
    const response = await fetch(
      `${BETSAPI_BASE_URL}/events/ended?token=${BETSAPI_TOKEN}&sport_id=${BETSAPI_CS2_SPORT_ID}&day=${day}&page=${page}`,
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );

    if (!response.ok) {
      console.error(`BetsAPI error: ${response.status}`);
      break;
    }

    const payload = await response.json();
    const pageResults = Array.isArray(payload?.results) ? payload.results : [];
    results.push(...pageResults);

    const pager = payload?.pager;
    if (pager?.total && pager?.per_page) {
      totalPages = Math.ceil(pager.total / pager.per_page);
    } else {
      totalPages = 1;
    }

    page += 1;
  }

  if (totalPages > BETSAPI_ENDED_MAX_PAGES) {
    console.warn(
      `BetsAPI ended: totalPages=${totalPages} acima do limite ${BETSAPI_ENDED_MAX_PAGES} para o dia ${day}`
    );
  }

  endedEventsCache.set(day, { updatedAt: Date.now(), events: results });
  return results;
}

async function fetchBetsApiResult(prediction: {
  homeTeam: string;
  awayTeam: string;
  scheduledAt: Date | null;
}): Promise<MatchResult | null> {
  if (!BETSAPI_TOKEN) {
    return null;
  }

  const targetHomeStrict = normalizeTeamName(prediction.homeTeam, "strict");
  const targetAwayStrict = normalizeTeamName(prediction.awayTeam, "strict");
  const targetHomeLoose = normalizeTeamName(prediction.homeTeam, "loose");
  const targetAwayLoose = normalizeTeamName(prediction.awayTeam, "loose");

  const scheduledAt = prediction.scheduledAt ?? new Date();
  const dayCandidates = [
    scheduledAt,
    new Date(scheduledAt.getTime() + 24 * 60 * 60 * 1000),
    new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000),
  ];
  const daysToCheck = Array.from(
    new Set(dayCandidates.map((date) => formatDayUTC(date)))
  );

  for (const day of daysToCheck) {
    const endedEvents = await fetchEndedEvents(day);
    const match = endedEvents.find((event) => {
      if (event.time_status !== "3") return false;
      const leagueName = safeLower(event.league?.name);
      if (
        leagueName &&
        !(
          leagueName.includes("cs2") ||
          leagueName.includes("cs:go") ||
          leagueName.includes("csgo")
        )
      ) {
        return false;
      }

      const homeNameStrict = normalizeTeamName(event.home?.name, "strict");
      const awayNameStrict = normalizeTeamName(event.away?.name, "strict");
      const homeNameLoose = normalizeTeamName(event.home?.name, "loose");
      const awayNameLoose = normalizeTeamName(event.away?.name, "loose");

      const directStrict =
        homeNameStrict === targetHomeStrict &&
        awayNameStrict === targetAwayStrict;
      const swappedStrict =
        homeNameStrict === targetAwayStrict &&
        awayNameStrict === targetHomeStrict;

      const directLoose =
        homeNameLoose === targetHomeLoose && awayNameLoose === targetAwayLoose;
      const swappedLoose =
        homeNameLoose === targetAwayLoose && awayNameLoose === targetHomeLoose;

      return directStrict || swappedStrict || directLoose || swappedLoose;
    });

    if (!match) {
      continue;
    }

    const scores = parseEventScore(match);
    if (!scores) {
      continue;
    }

    let winnerName: string | null = null;
    if (scores.scoreHome > scores.scoreAway) {
      winnerName = match.home?.name || prediction.homeTeam;
    } else if (scores.scoreAway > scores.scoreHome) {
      winnerName = match.away?.name || prediction.awayTeam;
    }

    return {
      finished: true,
      winnerName,
      scoreHome: scores.scoreHome,
      scoreAway: scores.scoreAway,
    };
  }

  return null;
}

async function fetchMatchResult(prediction: {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number | null;
  awayTeamId: number | null;
  scheduledAt: Date | null;
}): Promise<MatchResult | null> {
  let pandaResult: MatchResult | null = null;

  if (PANDASCORE_API_KEY) {
    const response = await fetch(
      `${PANDASCORE_BASE_URL}/csgo/matches/${prediction.matchId}`,
      {
        headers: {
          Authorization: `Bearer ${PANDASCORE_API_KEY}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(`PandaScore error: ${response.status}`);
    } else {
      const match = await response.json();
      const isFinished = match.status === "finished";

      if (!isFinished) {
        pandaResult = {
          finished: false,
          winnerName: null,
          scoreHome: null,
          scoreAway: null,
        };
      } else {
        const opponents = Array.isArray(match.opponents) ? match.opponents : [];
        const results = Array.isArray(match.results) ? match.results : [];

        const nameById = new Map<number, string>();
        opponents.forEach((opponent: any) => {
          if (opponent?.opponent?.id && opponent?.opponent?.name) {
            nameById.set(opponent.opponent.id, opponent.opponent.name);
          }
        });

        const scoreById = new Map<number, number>();
        results.forEach((result: any) => {
          if (typeof result?.team_id === "number") {
            scoreById.set(result.team_id, result.score ?? 0);
          }
        });

        const winnerId = match.winner?.id || null;
        let winnerName = winnerId ? nameById.get(winnerId) || null : null;

        let scoreHome: number | null = null;
        let scoreAway: number | null = null;

        if (prediction.homeTeamId) {
          scoreHome = scoreById.get(prediction.homeTeamId) ?? null;
        }
        if (prediction.awayTeamId) {
          scoreAway = scoreById.get(prediction.awayTeamId) ?? null;
        }

        if (scoreHome === null || scoreAway === null) {
          for (const [teamId, name] of nameById.entries()) {
            if (safeLower(name) === safeLower(prediction.homeTeam)) {
              scoreHome = scoreById.get(teamId) ?? scoreHome;
            }
            if (safeLower(name) === safeLower(prediction.awayTeam)) {
              scoreAway = scoreById.get(teamId) ?? scoreAway;
            }
          }
        }

        if (!winnerName && scoreHome !== null && scoreAway !== null) {
          if (scoreHome > scoreAway) winnerName = prediction.homeTeam;
          if (scoreAway > scoreHome) winnerName = prediction.awayTeam;
        }

        pandaResult = {
          finished: true,
          winnerName: winnerName || null,
          scoreHome,
          scoreAway,
        };
      }
    }
  }

  if (pandaResult?.finished) {
    return pandaResult;
  }

  const betsResult = await fetchBetsApiResult({
    homeTeam: prediction.homeTeam,
    awayTeam: prediction.awayTeam,
    scheduledAt: prediction.scheduledAt,
  });

  if (betsResult) {
    return betsResult;
  }

  return pandaResult;
}

async function refreshPending(limit: number) {
  const now = new Date();
  const pending = await prisma.matchPrediction.findMany({
    where: {
      status: "PENDING",
      scheduledAt: {
        lt: now,
      },
    },
    orderBy: {
      scheduledAt: "desc",
    },
    take: limit,
  });

  for (const prediction of pending) {
    if (!prediction.matchId) continue;
    try {
      const result = await fetchMatchResult({
        matchId: prediction.matchId,
        homeTeam: prediction.homeTeam,
        awayTeam: prediction.awayTeam,
        homeTeamId: prediction.homeTeamId ?? null,
        awayTeamId: prediction.awayTeamId ?? null,
        scheduledAt: prediction.scheduledAt ?? null,
      });

      if (!result || !result.finished) {
        continue;
      }

      let status = "VOID";
      if (result.winnerName) {
        const winnerNormalized = normalizeTeamName(result.winnerName, "loose");
        const predictedNormalized = normalizeTeamName(
          prediction.predictedWinner,
          "loose"
        );
        status =
          winnerNormalized &&
          predictedNormalized &&
          winnerNormalized === predictedNormalized
            ? "WIN"
            : "LOSS";
      }

      await prisma.matchPrediction.update({
        where: { id: prediction.id },
        data: {
          status,
          actualWinner: result.winnerName,
          scoreHome: result.scoreHome,
          scoreAway: result.scoreAway,
          resolvedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Erro ao atualizar resultado:", error);
    }
  }
}

async function reconcileResolved(limit: number) {
  const resolved = await prisma.matchPrediction.findMany({
    where: {
      status: {
        in: ["WIN", "LOSS", "VOID"],
      },
      actualWinner: {
        not: null,
      },
      resolvedAt: {
        not: null,
      },
    },
    orderBy: {
      resolvedAt: "desc",
    },
    take: limit,
  });

  for (const prediction of resolved) {
    const winnerNormalized = normalizeTeamName(
      prediction.actualWinner,
      "loose"
    );
    const predictedNormalized = normalizeTeamName(
      prediction.predictedWinner,
      "loose"
    );

    let desiredStatus = "VOID";
    if (winnerNormalized && predictedNormalized) {
      desiredStatus =
        winnerNormalized === predictedNormalized ? "WIN" : "LOSS";
    }

    if (desiredStatus !== prediction.status) {
      await prisma.matchPrediction.update({
        where: { id: prediction.id },
        data: {
          status: desiredStatus,
        },
      });
    }
  }
}

export async function GET(request: NextRequest) {
  if (!isReportsEnabled()) {
    return reportsDisabledResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get("refresh") === "true";
    const daysParam = Number(searchParams.get("days") || "30");
    const limitParam = Number(searchParams.get("limit") || "200");
    const refreshLimitParam = Number(
      searchParams.get("refreshLimit") || "30"
    );
    const refreshLimit = Number.isFinite(refreshLimitParam)
      ? Math.min(Math.max(Math.floor(refreshLimitParam), 1), 200)
      : 30;

    const days = Number.isFinite(daysParam) ? Math.min(daysParam, 120) : 30;
    const limit = Number.isFinite(limitParam) ? Math.min(limitParam, 500) : 200;

    if (refresh) {
      await refreshPending(refreshLimit);
      await reconcileResolved(refreshLimit);
    }

    const since = new Date(Date.now() - days * 86400000);

    const items = await prisma.matchPrediction.findMany({
      where: {
        createdAt: {
          gte: since,
        },
        source: "prelive",
      },
      orderBy: [
        { scheduledAt: "desc" },
        { createdAt: "desc" },
      ],
      take: limit,
    });

    // Mostrar primeiro jogos resolvidos (WIN/LOSS/VOID).
    const statusPriority: Record<string, number> = {
      WIN: 0,
      LOSS: 0,
      VOID: 0,
      PENDING: 1,
    };

    items.sort((a, b) => {
      const statusDiff =
        (statusPriority[a.status] ?? 1) - (statusPriority[b.status] ?? 1);
      if (statusDiff !== 0) return statusDiff;

      const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
      const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;

      const aCreated = new Date(a.createdAt).getTime();
      const bCreated = new Date(b.createdAt).getTime();
      return bCreated - aCreated;
    });

    const wins = items.filter((item) => item.status === "WIN").length;
    const losses = items.filter((item) => item.status === "LOSS").length;
    const pending = items.filter((item) => item.status === "PENDING").length;
    const voided = items.filter((item) => item.status === "VOID").length;
    const resolved = wins + losses;
    const accuracy = resolved > 0 ? (wins / resolved) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total: items.length,
          wins,
          losses,
          pending,
          voided,
          accuracy,
          windowDays: days,
        },
        items,
        refreshed: refresh,
      },
    });
  } catch (error: any) {
    console.error("Erro ao gerar relatorio:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno" },
      { status: 500 }
    );
  }
}
