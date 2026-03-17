import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Buscar jogos do banco de dados (sempre usar cache)
    const cachedMatches = await prisma.cSGOMatch.findMany({
      where: {
        status: "scheduled", // Apenas jogos agendados
      },
      orderBy: {
        createdAt: "desc", // Ordem por criação (mais recentes primeiro)
      },
      take: 50,
    });

    // Formatar dados do cache para o frontend
    const formattedMatches = cachedMatches.map((match) => ({
      id: match.externalId,
      league: "CS:GO",
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      startTime: match.startTime.toISOString(),
      odds: {}, // TODO: implementar odds no banco
      status: match.status,
    }));

    return NextResponse.json({
      success: true,
      data: formattedMatches,
      count: formattedMatches.length,
      source: "cache",
      lastUpdated:
        cachedMatches.length > 0
          ? cachedMatches[0].updatedAt.toISOString()
          : null,
    });
  } catch (error) {
    console.error("Erro ao buscar jogos do cache:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
      },
      { status: 500 }
    );
  }
}
