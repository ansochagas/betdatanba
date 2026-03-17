/**
 * Utilitários para conversão de fusos horários
 * API retorna horários em UTC, Brasil está em UTC-3 (BRT)
 */

export class TimezoneUtils {
  /**
   * Converte horário UTC para horário do Brasil (UTC-3)
   */
  static utcToBRT(utcDate: Date | string): Date {
    const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;

    // Subtrair 3 horas (3600000ms * 3)
    const brtTime = new Date(date.getTime() - 3 * 60 * 60 * 1000);

    return brtTime;
  }

  /**
   * Formata data/hora para exibição no Brasil
   */
  static formatDateTimeBRT(date: Date | string): string {
    const brtDate = this.utcToBRT(date);

    return brtDate.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  /**
   * Formata apenas hora para exibição no Brasil
   */
  static formatTimeBRT(date: Date | string): string {
    const brtDate = this.utcToBRT(date);

    return brtDate.toLocaleString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  /**
   * Formata data completa para exibição no Brasil
   */
  static formatDateBRT(date: Date | string): string {
    const brtDate = this.utcToBRT(date);

    return brtDate.toLocaleString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  /**
   * Calcula minutos até o jogo (em horário BRT)
   */
  static minutesUntilGame(gameTime: Date | string): number {
    const brtGameTime = this.utcToBRT(gameTime);
    const now = new Date();

    const diffMs = brtGameTime.getTime() - now.getTime();
    return Math.floor(diffMs / (1000 * 60));
  }

  /**
   * Verifica se o jogo está próximo (≤15 minutos em BRT)
   */
  static isGameSoon(
    gameTime: Date | string,
    thresholdMinutes: number = 15
  ): boolean {
    const minutesUntil = this.minutesUntilGame(gameTime);
    return minutesUntil >= 0 && minutesUntil <= thresholdMinutes;
  }
}
