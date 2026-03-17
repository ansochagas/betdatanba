import WebSocket from "ws";
import { EventEmitter } from "events";

interface OddsData {
  sport: string;
  sportsbook: string;
  game: string;
  home_team: string;
  away_team: string;
  outcomes: Record<
    string,
    {
      odds: string;
      outcome_name: string;
      outcome_line: string | null;
      outcome_target: string;
    }
  >;
}

interface GameUpdate {
  action: "game_update" | "initial_state" | "line_update" | "game_removed";
  data: OddsData;
  timestamp: string;
}

export class SproAgencyAPI extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private isConnected = false;
  private apiKey: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `wss://spro.agency/api?key=${this.apiKey}`;
        console.log("🔌 Conectando ao Spro Agency WebSocket...");

        this.ws = new WebSocket(wsUrl);

        this.ws.on("open", () => {
          console.log("✅ Conectado ao Spro Agency WebSocket");
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.ws.on("message", (data: WebSocket.RawData) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            console.error("❌ Erro ao processar mensagem:", error);
          }
        });

        this.ws.on("error", (error: Error) => {
          console.error("❌ Erro no WebSocket:", error);
          this.isConnected = false;
          reject(error);
        });

        this.ws.on("close", (code: number, reason: Buffer) => {
          console.log(`🔌 WebSocket fechado: ${code} - ${reason.toString()}`);
          this.isConnected = false;
          this.handleReconnect();
        });
      } catch (error) {
        console.error("❌ Erro ao conectar:", error);
        reject(error);
      }
    });
  }

  private handleMessage(message: any): void {
    // console.log('📨 Mensagem recebida:', message.action);

    switch (message.action) {
      case "socket_connected":
        console.log("🎯 Conexão autenticada com sucesso");
        this.emit("connected");
        break;

      case "initial_state":
        console.log("📊 Estado inicial recebido");
        this.emit("initialState", message.data);
        break;

      case "game_update":
        // console.log('🔄 Jogo atualizado:', message.data.game);
        this.emit("gameUpdate", message.data);
        break;

      case "line_update":
        // console.log('📈 Linha atualizada:', message.data.game);
        this.emit("lineUpdate", message.data);
        break;

      case "game_removed":
        console.log("🗑️ Jogo removido:", message.data.game);
        this.emit("gameRemoved", message.data);
        break;

      case "subscription_updated":
        console.log("✅ Subscription atualizada:", message.message);
        break;

      case "error":
        console.error("❌ Erro da API:", message.message);
        this.emit("error", message.message);
        break;

      case "ping":
        // Responder ping automaticamente
        break;

      default:
        // console.log('📨 Mensagem não tratada:', message.action);
        break;
    }
  }

  async subscribeToCSGO(): Promise<void> {
    if (!this.isConnected || !this.ws) {
      throw new Error("WebSocket não conectado");
    }

    const subscription = {
      action: "subscribe",
      filters: {
        sports: ["CSL"], // CS:GO aparece como "CSL" na API
        sportsbooks: ["draftkings", "betmgm", "pinnacle", "bovada"], // Top sportsbooks
        markets: ["Moneyline", "Spread", "Total"], // Mercados principais
      },
    };

    console.log("🎯 Enviando subscription para CS:GO...");
    this.ws.send(JSON.stringify(subscription));
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("❌ Máximo de tentativas de reconexão atingido");
      this.emit("maxReconnectAttemptsReached");
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts} em ${this.reconnectDelay}ms...`
    );

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error("❌ Falha na reconexão:", error);
      });
    }, this.reconnectDelay);
  }

  disconnect(): void {
    if (this.ws) {
      console.log("🔌 Desconectando WebSocket...");
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  isWebSocketConnected(): boolean {
    return this.isConnected;
  }

  // Método para obter informações via REST API
  async getInfo(): Promise<any> {
    try {
      const response = await fetch(
        `https://spro.agency/api/get_info?key=${this.apiKey}`
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("❌ Erro ao obter info:", error);
      throw error;
    }
  }

  async getGames(): Promise<any> {
    try {
      const response = await fetch(
        `https://spro.agency/api/get_games?key=${this.apiKey}`
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("❌ Erro ao obter jogos:", error);
      throw error;
    }
  }

  async getMarkets(sports?: string[]): Promise<any> {
    try {
      let url = `https://spro.agency/api/get_markets?key=${this.apiKey}`;
      if (sports && sports.length > 0) {
        url += `&sports=${sports.join(",")}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("❌ Erro ao obter mercados:", error);
      throw error;
    }
  }
}
