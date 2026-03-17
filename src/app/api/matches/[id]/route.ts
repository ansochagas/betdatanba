import { NextRequest, NextResponse } from "next/server";
import { csgoAPI } from "@/lib/api/csgoAPI";

interface Params {
  id: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Params },
) {
  try {
    const match = await csgoAPI.getMatchDetails(params.id);

    if (!match) {
      return NextResponse.json(
        {
          success: false,
          error: "Jogo não encontrado",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      match,
    });
  } catch (error: any) {
    console.error("Erro ao buscar detalhes do jogo:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? "Erro ao carregar detalhes",
      },
      { status: 500 },
    );
  }
}

