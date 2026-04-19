import { Telegraf } from "telegraf";

import { getPublicAppUrl } from "@/lib/app-url";
import {
  isSubscriptionAccessAllowed,
  linkTelegramAccount,
  normalizeSubscriptionStatus,
} from "@/lib/telegram-account";
import {
  getConfiguredTelegramBotName,
  getConfiguredTelegramBotUsername,
} from "@/lib/telegram-config";
import { prisma } from "@/lib/prisma";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_NAME = getConfiguredTelegramBotName();
const BOT_USERNAME = getConfiguredTelegramBotUsername();
const PUBLIC_APP_URL = getPublicAppUrl();
const SETTINGS_URL = `${PUBLIC_APP_URL}/settings`;

if (!BOT_TOKEN) {
  console.warn("[telegram] TELEGRAM_BOT_TOKEN nao configurado. Bot nao sera iniciado.");
}

class TelegramBot {
  private bot: Telegraf | null = null;
  private isInitialized = false;

  constructor() {
    if (!BOT_TOKEN) {
      return;
    }

    try {
      this.bot = new Telegraf(BOT_TOKEN, {
        telegram: {
          apiRoot: "https://api.telegram.org",
        },
      });
      this.setupCommands();
      this.isInitialized = true;
      console.log("[telegram] Bot inicializado com sucesso");
    } catch (error) {
      console.error("[telegram] Erro ao inicializar bot:", error);
      this.bot = null;
      this.isInitialized = false;
    }
  }

  private setupCommands() {
    if (!this.bot) return;

    this.bot.start(async (ctx) => {
      const telegramId = ctx.from.id.toString();
      const firstName = ctx.from.first_name || "usuario";

      const existingUser = await prisma.user.findFirst({
        where: { telegramId },
        include: { subscription: true },
      });

      if (existingUser) {
        await ctx.reply(
          [
            `Ola ${firstName}.`,
            "",
            `Sua conta ja esta vinculada ao ${BOT_NAME}.`,
            `Email: ${existingUser.email}`,
            "",
            "Use /status para verificar seu acesso.",
          ].join("\n")
        );
        return;
      }

      const lines = [
        `Ola ${firstName}.`,
        "",
        "Este e o bot oficial da BETDATA NBA.",
        "",
        "Para vincular sua conta:",
        `1. Entre em ${SETTINGS_URL}`,
        '2. Clique em "Gerar codigo de vinculacao"',
        "3. Copie o codigo LINK_XXXXXXXX que aparece no site",
        "4. Volte para este chat, cole o codigo e envie",
      ];

      if (BOT_USERNAME) {
        lines.push("", `Se precisar achar este bot depois, pesquise por @${BOT_USERNAME} no Telegram.`);
      }

      await ctx.reply(lines.join("\n"));
    });

    this.bot.help(async (ctx) => {
      const lines = [
        `${BOT_NAME} - ajuda`,
        "",
        "/start - iniciar o bot e ver as instrucoes",
        "/link - ver novamente como vincular a conta",
        "/status - verificar vinculo e status do plano",
        "/alerts - ver o status atual dos alertas",
        "/help - abrir esta ajuda",
        "",
        `Site: ${PUBLIC_APP_URL}`,
      ];

      await ctx.reply(lines.join("\n"));
    });

    this.bot.command("link", async (ctx) => {
      await ctx.reply(
        [
          "Para vincular sua conta:",
          `1. Entre em ${SETTINGS_URL}`,
          '2. Clique em "Gerar codigo de vinculacao"',
          "3. Copie o codigo LINK_... mostrado no site",
          "4. Volte para este chat, cole o codigo e envie",
          BOT_USERNAME
            ? `5. Se nao encontrar esta conversa, pesquise por @${BOT_USERNAME} no Telegram`
            : null,
        ]
          .filter(Boolean)
          .join("\n")
      );
    });

    this.bot.command("status", async (ctx) => {
      const telegramId = ctx.from.id.toString();

      const user = await prisma.user.findFirst({
        where: { telegramId },
        include: { subscription: true },
      });

      if (!user) {
        await ctx.reply(
          [
            "Conta nao vinculada.",
            "",
            `Acesse ${SETTINGS_URL} para gerar um codigo de vinculacao.`,
          ].join("\n")
        );
        return;
      }

      const subscription = user.subscription;
      const normalizedStatus = normalizeSubscriptionStatus(subscription?.status);
      const plan = subscription?.planId || "nenhum";
      const statusLabel =
        normalizedStatus === "active"
          ? "ativo"
          : normalizedStatus === "trialing"
            ? "trial"
            : subscription?.status || "inativo";

      await ctx.reply(
        [
          "Status da sua conta",
          "",
          `Usuario: ${user.name || user.email}`,
          `Email: ${user.email}`,
          `Plano: ${plan}`,
          `Status: ${statusLabel}`,
          "",
          isSubscriptionAccessAllowed(subscription)
            ? "Alertas habilitados para esta conta quando o servico estiver ativo."
            : "Seu plano nao esta ativo para receber alertas.",
        ].join("\n")
      );
    });

    this.bot.command("alerts", async (ctx) => {
      const telegramId = ctx.from.id.toString();

      const user = await prisma.user.findFirst({
        where: { telegramId },
        include: { telegramConfig: true },
      });

      if (!user) {
        await ctx.reply("Conta nao vinculada. Use /link para ver como conectar sua conta.");
        return;
      }

      const alertsEnabled = Boolean(user.telegramConfig?.alertsEnabled);
      const alertTypes = user.telegramConfig?.alertTypes || "[]";

      await ctx.reply(
        [
          "Configuracao atual de alertas",
          "",
          `Ativos: ${alertsEnabled ? "sim" : "nao"}`,
          `Categorias: ${alertTypes}`,
          "",
          "A base do bot esta pronta. Os alertas live serao habilitados na proxima etapa.",
        ].join("\n")
      );
    });

    this.bot.on("text", async (ctx) => {
      const message = (ctx.message.text || "").trim();
      if (!message.startsWith("LINK_")) {
        return;
      }

      const telegramId = ctx.from.id.toString();
      const chatId = ctx.chat.id.toString();

      try {
        const result = await linkTelegramAccount({
          linkCode: message,
          telegramId,
          chatId,
        });

        if (!result.success) {
          await ctx.reply(
            [
              "Nao foi possivel concluir a vinculacao.",
              result.error || "Gere um novo codigo no site e tente novamente.",
            ].join("\n")
          );
          return;
        }

        await ctx.reply(
          [
            "Conta vinculada com sucesso.",
            "",
            `Sua conta BETDATA NBA agora esta conectada ao ${BOT_NAME}.`,
            "Use /status para confirmar seu plano.",
            "Se quiser, volte ao site e clique em Atualizar status para ver a confirmacao na tela.",
          ].join("\n")
        );
      } catch (error) {
        console.error("[telegram] Erro ao vincular conta:", error);
        await ctx.reply(
          "Erro interno ao processar a vinculacao. Tente novamente em alguns minutos."
        );
      }
    });

    this.bot.catch((error, ctx) => {
      console.error("[telegram] Erro no bot:", error);
      void ctx.reply("Ocorreu um erro ao processar sua mensagem. Tente novamente.");
    });
  }

  async launch() {
    if (!this.isInitialized || !this.bot) {
      console.warn("[telegram] Bot nao inicializado.");
      return;
    }

    try {
      console.log("[telegram] Iniciando bot...");
      await this.bot.launch();
      const botInfo = await this.bot.telegram.getMe();
      console.log(
        `[telegram] Bot conectado como @${botInfo.username || "sem-username"} (${botInfo.first_name})`
      );
    } catch (error) {
      console.error("[telegram] Erro ao iniciar bot:", error);
      throw error;
    }
  }

  async stop() {
    if (!this.bot) {
      return;
    }

    await this.bot.stop();
    console.log("[telegram] Bot parado");
  }

  async handleUpdate(update: unknown) {
    if (!this.bot) {
      return false;
    }

    try {
      await this.bot.handleUpdate(update as Parameters<Telegraf["handleUpdate"]>[0]);
      return true;
    } catch (error) {
      console.error("[telegram] Erro ao processar update:", error);
      return false;
    }
  }

  async sendMessage(chatId: string | number, message: string, options?: unknown) {
    if (!this.bot) return false;

    try {
      await this.bot.telegram.sendMessage(chatId, message, options as never);
      return true;
    } catch (error) {
      console.error("[telegram] Erro ao enviar mensagem:", error);
      return false;
    }
  }

  async userHasActiveSubscription(telegramId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findFirst({
        where: { telegramId },
        include: { subscription: true },
      });

      return isSubscriptionAccessAllowed(user?.subscription);
    } catch (error) {
      console.error("[telegram] Erro ao verificar assinatura:", error);
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
