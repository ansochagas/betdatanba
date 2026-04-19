"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type TelegramBotView = {
  name: string;
  username: string | null;
  url: string | null;
};

type TelegramStatusView = {
  linked: boolean;
  bot: TelegramBotView;
  alertsEnabled: boolean;
  alertTypes: string[];
  telegramId: string | null;
  chatId: string | null;
};

const defaultBot: TelegramBotView = {
  name: "BETDATA NBA Bot",
  username: null,
  url: null,
};

const defaultStatus: TelegramStatusView = {
  linked: false,
  bot: defaultBot,
  alertsEnabled: false,
  alertTypes: [],
  telegramId: null,
  chatId: null,
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [telegramStatus, setTelegramStatus] = useState<TelegramStatusView>(defaultStatus);
  const [statusLoading, setStatusLoading] = useState(true);
  const [loadingCode, setLoadingCode] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkExpiresAt, setLinkExpiresAt] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTelegramStatus = useCallback(async () => {
    setStatusLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/telegram/status", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Nao foi possivel carregar o status do Telegram");
      }

      setTelegramStatus({
        linked: Boolean(data.linked),
        bot: data.bot || defaultBot,
        alertsEnabled: Boolean(data.data?.alertsEnabled),
        alertTypes: Array.isArray(data.data?.alertTypes) ? data.data.alertTypes : [],
        telegramId: data.data?.telegramId || null,
        chatId: data.data?.chatId || null,
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erro ao carregar status");
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      void fetchTelegramStatus();
    }
  }, [fetchTelegramStatus, router, status]);

  const botLabel = useMemo(() => {
    if (telegramStatus.bot.username) {
      return `@${telegramStatus.bot.username}`;
    }

    return telegramStatus.bot.name;
  }, [telegramStatus.bot]);

  const generateLinkCode = async () => {
    setLoadingCode(true);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch("/api/telegram/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao gerar codigo de vinculacao");
      }

      setLinkCode(data.data.linkCode);
      setLinkExpiresAt(data.data.expiresAt || null);
      setFeedback("Codigo gerado. Abra o bot e envie a chave para concluir a vinculacao.");

      if (data.data.bot) {
        setTelegramStatus((current) => ({
          ...current,
          bot: data.data.bot,
        }));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Erro ao gerar codigo");
    } finally {
      setLoadingCode(false);
    }
  };

  const unlinkTelegram = async () => {
    setUnlinking(true);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch("/api/telegram/unlink", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Nao foi possivel desvincular o Telegram");
      }

      setLinkCode(null);
      setLinkExpiresAt(null);
      setFeedback("Telegram desvinculado. Voce pode gerar um novo codigo quando quiser.");
      await fetchTelegramStatus();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Erro ao desvincular Telegram");
    } finally {
      setUnlinking(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback("Codigo copiado para a area de transferencia.");
      setError(null);
    } catch {
      setError("Nao foi possivel copiar automaticamente. Copie manualmente o codigo exibido.");
    }
  };

  if (status === "loading" || statusLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Configuracoes</h1>
          <p className="text-gray-400">Gerencie suas preferencias e integracoes da BETDATA NBA.</p>
        </div>

        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="text-blue-500">Telegram</span>
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Vincule sua conta ao {botLabel} para receber notificacoes e, na proxima etapa, alertas live.
              </p>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-sm ${
                telegramStatus.linked ? "bg-green-600 text-white" : "bg-red-600 text-white"
              }`}
            >
              {telegramStatus.linked ? "Vinculado" : "Nao vinculado"}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}

          {feedback && (
            <div className="mb-4 rounded-md border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">
              {feedback}
            </div>
          )}

          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-300">
              <div className="flex flex-wrap items-center gap-3">
                <span>Bot:</span>
                <strong className="text-white">{telegramStatus.bot.name}</strong>
                {telegramStatus.bot.username && (
                  <span className="text-blue-300">@{telegramStatus.bot.username}</span>
                )}
              </div>
              {telegramStatus.bot.url && (
                <a
                  href={telegramStatus.bot.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-orange-400 hover:text-orange-300"
                >
                  Abrir bot no Telegram
                </a>
              )}
            </div>

            {!telegramStatus.linked && (
              <div className="space-y-4 border-t border-zinc-800 pt-4">
                <div>
                  <h3 className="font-semibold mb-2">Como vincular sua conta</h3>
                  <ol className="space-y-2 text-sm text-gray-400 list-decimal list-inside">
                    <li>Clique em "Gerar codigo de vinculacao".</li>
                    <li>Copie o codigo LINK_...</li>
                    <li>Abra o bot oficial no Telegram.</li>
                    <li>Envie o codigo no chat do bot.</li>
                    <li>Volte aqui e clique em "Atualizar status" para confirmar.</li>
                  </ol>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={generateLinkCode}
                    disabled={loadingCode}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    {loadingCode ? "Gerando codigo..." : "Gerar codigo de vinculacao"}
                  </button>

                  <button
                    onClick={() => void fetchTelegramStatus()}
                    className="border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Atualizar status
                  </button>

                  {telegramStatus.bot.url && (
                    <a
                      href={telegramStatus.bot.url}
                      target="_blank"
                      rel="noreferrer"
                      className="border border-orange-700 bg-orange-950/40 hover:bg-orange-950/70 text-orange-100 px-4 py-2 rounded-lg transition-colors"
                    >
                      Abrir {botLabel}
                    </a>
                  )}
                </div>

                {linkCode && (
                  <div className="rounded-lg border border-zinc-800 bg-black/30 p-4">
                    <p className="text-sm text-zinc-400 mb-2">Envie este codigo ao bot:</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <code className="text-lg font-semibold text-white tracking-wide">{linkCode}</code>
                      <button
                        onClick={() => void copyToClipboard(linkCode)}
                        className="border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-md transition-colors"
                      >
                        Copiar codigo
                      </button>
                    </div>
                    {linkExpiresAt && (
                      <p className="mt-2 text-xs text-zinc-500">
                        Expira em: {new Date(linkExpiresAt).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {telegramStatus.linked && (
              <div className="space-y-4 border-t border-zinc-800 pt-4">
                <div className="rounded-lg border border-emerald-900 bg-emerald-950/20 p-4 text-sm text-emerald-100">
                  <p className="font-semibold">Conta vinculada com sucesso</p>
                  <p className="mt-2 text-emerald-200/90">
                    Telegram ID: {telegramStatus.telegramId || "nao informado"}
                  </p>
                  <p className="text-emerald-200/90">
                    Chat ID: {telegramStatus.chatId || "nao informado"}
                  </p>
                  <p className="text-emerald-200/90">
                    Alertas habilitados: {telegramStatus.alertsEnabled ? "sim" : "nao"}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Estado atual da integracao</h3>
                  <p className="text-sm text-gray-400">
                    A infraestrutura do bot esta pronta para vinculo e notificacoes manuais. Os alertas live serao adicionados na proxima etapa.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={unlinkTelegram}
                    disabled={unlinking}
                    className="bg-red-700 hover:bg-red-800 disabled:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    {unlinking ? "Desvinculando..." : "Desvincular Telegram"}
                  </button>

                  <button
                    onClick={() => void fetchTelegramStatus()}
                    className="border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Atualizar status
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
