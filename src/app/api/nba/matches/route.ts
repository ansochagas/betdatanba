import { NextRequest, NextResponse } from "next/server";
import { getMockNbaMatches } from "@/modules/nba/mock";
import {
  fetchNbaMatchesFromProvider,
  getNbaProvider,
  getNbaProviderFriendlyMessage,
} from "@/modules/nba/provider";
import { NbaMatch } from "@/modules/nba/types";
import { advancedCache } from "@/services/advanced-cache-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawDays = Number(searchParams.get("days") ?? "2");
  const force = searchParams.get("force") === "true";
  const days = Number.isFinite(rawDays) ? Math.max(1, Math.min(rawDays, 7)) : 2;
  const provider = getNbaProvider();

  const cacheKey = `matches-v2-${provider}-${days}`;
  const backupKey = `matches-v2-backup-${provider}-${days}`;
  const startedAt = Date.now();

  if (!force) {
    const cached = await advancedCache.get<NbaMatch[]>("nba", cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        source: "cache",
        cached: true,
        responseTimeMs: Date.now() - startedAt,
      });
    }
  }

  try {
    const { matches, warnings } = await fetchNbaMatchesFromProvider(days, provider);

    await advancedCache.set("nba", cacheKey, matches, {
      memory: 900, // 15 min
      redis: 1800, // 30 min
    });
    await advancedCache.set("nba", backupKey, matches, {
      memory: 21600, // 6h
      redis: 21600,
    });

    return NextResponse.json({
      success: true,
      data: matches,
      source: provider,
      warnings,
      cached: false,
      responseTimeMs: Date.now() - startedAt,
    });
  } catch (error) {
    const warning = getNbaProviderFriendlyMessage(error, provider);
    const backup = await advancedCache.get<NbaMatch[]>("nba", backupKey);

    if (backup && backup.length > 0) {
      return NextResponse.json({
        success: true,
        data: backup,
        source: "cache-fallback",
        warnings: [warning],
        fallback: true,
        cached: true,
        responseTimeMs: Date.now() - startedAt,
      });
    }

    const mockMatches = getMockNbaMatches(days);
    await advancedCache.set("nba", cacheKey, mockMatches, {
      memory: 300, // 5 min
      redis: 900, // 15 min
    });
    await advancedCache.set("nba", backupKey, mockMatches, {
      memory: 21600, // 6h
      redis: 21600,
    });

    return NextResponse.json({
      success: true,
      data: mockMatches,
      source: "mock-fallback",
      warnings: [warning],
      fallback: true,
      cached: false,
      responseTimeMs: Date.now() - startedAt,
    });
  }
}
