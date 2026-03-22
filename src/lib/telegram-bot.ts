import { Telegraf } from "telegraf";
import { prisma } from "@/lib/prisma";
import { getInternalAppUrl } from "@/lib/app-url";

function normalizeSubscriptionStatus(status: unknown): string {
  if (!status) return "";
  return String(status).trim().toLowerCase();
}

function isSubscriptionAccessAllowed(subscription: any): boolean {
  if (!subscription) return false;

  const status = normalizeSubscriptionStatus(subscription.status);
  const now = new Date();

  if (status === "active") {
    return subscription.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd) > now
      : false;
  }

  if (status === "trialing") {
    const trialEnd = subscription.trialEndsAt
      ? new Date(subscription.trialEndsAt)
      : subscription.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd)
        : null;
    return trialEnd ? trialEnd > now : false;
  }

  return false;
}

// Token do bot (vai vir das env vars)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// Base interna para chamadas de API sem depender de DNS/HTTPS externo
const INTERNAL_BASE_URL = getInternalAppUrl();

if (!BOT_TOKEN) {
  console.warn("⚠️ TELEGRAM_BOT_TOKEN não configurado. Bot não será iniciado.");
}

class TelegramBot {
  private bot: Telegraf | null = null;
  private isInitialized = false;

  constructor() {
    if (BOT_TOKEN) {
      try {
        // Configurar Telegraf para usar IPv4 e evitar problemas de rede
        const telegrafOptions = {
          telegram: {
            apiRoot: "https://api.telegram.org",
            // Forçar IPv4
            agent: undefined, // Remover agent customizado que pode causar problemas
          },
        };

        this.bot = new Telegraf(BOT_TOKEN, telegrafOptions);
        this.setupCommands();
        this.isInitialized = true;
        console.log("✅ Bot Telegram inicializado com sucesso");
      } catch (error) {
        console.error("❌ Erro ao inicializar bot Telegram:", error);
        this.bot = null;
        this.isInitialized = false;
      }
    } else {
      console.warn("⚠️ TELEGRAM_BOT_TOKEN não configurado");
    }
  }

  private setupCommands() {
    if (!this.bot) return;

    // Comando /start
    this.bot.start(async (ctx) => {
      const telegramId = ctx.from.id;
      const firstName = ctx.from.first_name || "Usuário";

      // Verificar se usuário já está vinculado
      const existingUser = await prisma.user.findFirst({
        where: { telegramId: telegramId.toString() },
        include: { subscription: true },
      });

      if (existingUser) {
        await ctx.reply(
          `✅ Olá ${firstName}!\n\n` +
            `Sua conta já está vinculada à BETDATA NBA.\n` +
            `E-mail: ${existingUser.email}\n\n` +
            `Use /help para ver os comandos disponíveis.`
        );
      } else {
        await ctx.reply(
          `🤖 Olá ${firstName}!\n\n` +
            `Bem-vindo ao bot da BETDATA NBA!\n\n` +
            `Para vincular sua conta:\n` +
            `1. Acesse seu dashboard na BETDATA NBA\n` +
            `2. Vá em Configurações > Telegram\n` +
            `3. Clique em "Vincular Telegram"\n` +
            `4. Copie o código e me envie!\n\n` +
            `Use /help para mais informações.`
        );
      }
    });

    // Comando /help
    this.bot.help(async (ctx) => {
      await ctx.reply(
        `🤖 *BETDATA NBA Bot* - Ajuda\n\n` +
          `*Comandos disponíveis:*\n` +
          `/start - Iniciar bot e verificar vinculação\n` +
          `/status - Ver status da sua assinatura\n` +
          `/alerts - Ver seus alertas configurados\n` +
          `/help - Esta mensagem de ajuda\n\n` +
          `*Como configurar alertas:*\n` +
          `1. Vincule sua conta no dashboard\n` +
          `2. Configure alertas por time/torneio\n` +
          `3. Receba notificações em tempo real!\n\n` +
          `*Precisa de ajuda?* Entre em contato com o suporte.`,
        { parse_mode: "Markdown" }
      );
    });

    // Comando /status
    this.bot.command("status", async (ctx) => {
      const telegramId = ctx.from.id.toString();

      const user = await prisma.user.findFirst({
        where: { telegramId },
        include: { subscription: true },
      });

      if (!user) {
        await ctx.reply(
          `❌ Conta não vinculada!\n\n` +
            `Use /start para ver como vincular sua conta da BETDATA NBA.`
        );
        return;
      }

      const subscription = user.subscription;
      const plan = subscription?.planId || "Nenhum";
      const normalizedStatus = normalizeSubscriptionStatus(subscription?.status);
      const statusLabel =
        normalizedStatus === "active"
          ? "Ativo"
          : normalizedStatus === "trialing"
            ? "Acesso temporário"
            : subscription?.status || "Inativa";
      const status = statusLabel;
      const isAllowed = subscription
        ? isSubscriptionAccessAllowed(subscription)
        : false;

      await ctx.reply(
        `📊 *Status da sua conta:*\n\n` +
          `👤 *Usuário:* ${user.name || user.email}\n` +
          `📧 *E-mail:* ${user.email}\n` +
          `💎 *Plano:* ${plan}\n` +
          `📅 *Status:* ${status}\n\n` +
          `${
            isAllowed
              ? "✅ *Alertas ativos!*"
              : "❌ *Renove seu plano para receber alertas*"
          }`,
        { parse_mode: "Markdown" }
      );
    });

    // Comando /alerts
    this.bot.command("alerts", async (ctx) => {
      const telegramId = ctx.from.id.toString();

      const user = await prisma.user.findFirst({
        where: { telegramId },
      });

      if (!user) {
        await ctx.reply(`❌ Conta não vinculada! Use /start primeiro.`);
        return;
      }

      // Por enquanto, resposta básica
      await ctx.reply(
        `🔔 *Seus Alertas Ativos*\n\n` +
          `📅 *Jogos futuros:* Ativado\n` +
          `💰 *Mudanças de odds:* Ativado\n` +
          `📊 *Análises:* Ativado\n\n` +
          `*Configurações futuras:*\n` +
          `• Times favoritos\n` +
          `• Odds mínimas\n` +
          `• Torneios específicos\n\n` +
          `Em breve você poderá personalizar tudo!`,
        { parse_mode: "Markdown" }
      );
    });

    // Handler para mensagens de texto (códigos de vinculação)
    this.bot.on("text", async (ctx) => {
      const message = ctx.message.text;
      const telegramId = ctx.from.id;
      const chatId = ctx.chat.id;
      const firstName = ctx.from.first_name || "Usuário";

      console.log(
        `📨 Mensagem recebida de ${firstName} (${telegramId}): "${message}"`
      );

      // Verificar se é um código de vinculação (formato: LINK_XXXXXXXX)
      if (message.startsWith("LINK_")) {
        const linkCode = message;
        console.log(`🔗 Processando código de vinculação: ${linkCode}`);

        try {
          // Fazer requisição para API de vinculação
          const apiUrl = `${INTERNAL_BASE_URL}/api/telegram/link`;
          console.log(`🌐 Fazendo requisição para: ${apiUrl}`);

          const response = await fetch(apiUrl, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              linkCode,
              telegramId: telegramId.toString(),
              chatId: chatId.toString(),
            }),
          });

          console.log(`📡 Resposta da API: ${response.status}`);
          const data = await response.json();
          console.log(`📄 Dados da resposta:`, data);

          if (data.success) {
            console.log(
              `✅ Vinculação bem-sucedida para usuário ${telegramId}`
            );
            await ctx.reply(
              `✅ *Conta vinculada com sucesso!*\n\n` +
                `Olá ${firstName}! Sua conta na *CS2 BETDATA* agora está conectada ao nosso bot.\n` +
                `Você começará a receber alertas exclusivos de jogos, odds e análises diretamente aqui.\n\n` +
                `Comandos úteis:\n` +
                `• /status – ver seu plano e situação\n` +
                `• /alerts – revisar suas configurações de alertas\n\n` +
                `Bom proveito e bons greens!`,
              { parse_mode: "Markdown" }
            );
          } else {
            console.log(`❌ Erro na vinculação: ${data.error}`);
            await ctx.reply(
              `❌ *Erro na vinculação*\n\n` +
                `${data.error}\n\n` +
                `Tente gerar um novo código no dashboard e envie novamente.`
            );
          }
        } catch (error) {
          console.error("Erro ao vincular conta:", error);
          await ctx.reply(
            `❌ *Erro interno*\n\n` +
              `Ocorreu um erro ao processar sua vinculação.\n` +
              `Tente novamente em alguns minutos.`
          );
        }
      } else {
        console.log(`💬 Mensagem não é código de vinculação: "${message}"`);
      }
    });

    // Handler para erros
    this.bot.catch((err, ctx) => {
      console.error("Erro no bot Telegram:", err);
      ctx.reply("❌ Ocorreu um erro. Tente novamente mais tarde.");
    });
  }

  // Método para iniciar o bot
  async launch() {
    if (!this.isInitialized || !this.bot) {
      console.warn("⚠️ Bot Telegram não inicializado (token ausente)");
      return;
    }

    try {
      console.log("🤖 Iniciando bot Telegram...");

      // Forçar IPv4 definindo variável de ambiente
      process.env.NODE_OPTIONS =
        (process.env.NODE_OPTIONS || "") + " --dns-result-order=ipv4first";

      // Iniciar bot com opções simples
      await this.bot.launch({
        dropPendingUpdates: true,
      });

      console.log("✅ Bot Telegram iniciado com sucesso!");
      console.log("📱 Bot está ouvindo mensagens...");

      // Testar conexão
      const botInfo = await this.bot.telegram.getMe();
      console.log(
        `🤖 Bot conectado como: @${botInfo.username} (${botInfo.first_name})`
      );
    } catch (error) {
      console.error("❌ Erro ao iniciar bot Telegram:", error);
      console.error(
        "Detalhes do erro:",
        error instanceof Error ? error.message : String(error)
      );

      console.log("💡 Possíveis soluções:");
      console.log("   1. Verifique se o TELEGRAM_BOT_TOKEN está correto");
      console.log("   2. Teste a conectividade: ping api.telegram.org");
      console.log("   3. Verifique se há firewall/proxy bloqueando");
    }
  }

  // Método para parar o bot
  async stop() {
    if (this.bot) {
      await this.bot.stop();
      console.log("🤖 Bot Telegram parado");
    }
  }

  // Método para enviar mensagem para usuário específico
  async sendMessage(chatId: string | number, message: string, options?: any) {
    if (!this.bot) return false;

    try {
      await this.bot.telegram.sendMessage(chatId, message, options);
      return true;
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      return false;
    }
  }

  // Método para verificar se usuário tem assinatura ativa
  async userHasActiveSubscription(telegramId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findFirst({
        where: { telegramId },
        include: { subscription: true },
      });

      if (!user) return false;

      const subscription = user.subscription;
      return isSubscriptionAccessAllowed(subscription);
    } catch (error) {
      console.error("Erro ao verificar assinatura:", error);
      return false;
    }
  }
}

let telegramBotInstance: TelegramBot | null = null;

export function getTelegramBot() {
  if (!telegramBotInstance) {
    telegramBotInstance = new TelegramBot();
  }
  return telegramBotInstance;
}

export type TelegramBotInstance = TelegramBot;
