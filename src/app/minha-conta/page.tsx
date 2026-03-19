"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  Calendar,
  CreditCard,
  MessageCircle,
  HelpCircle,
  User,
  Bell,
  Settings,
  Lock,
} from "lucide-react";
import BrandLogo from "@/components/brand/BrandLogo";

export default function MinhaContaPage() {
  const { data: session } = useSession();
  const [subscription, setSubscription] = useState<any>(null);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unlinkingTelegram, setUnlinkingTelegram] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordResult, setPasswordResult] = useState<string | null>(null);

  useEffect(() => {
    fetchAccountData();
  }, []);

  const fetchAccountData = async () => {
    try {
      // Buscar dados da assinatura com validação robusta
      const subResponse = await fetch("/api/user/subscription");
      if (subResponse.ok) {
        const subData = await subResponse.json();
        if (subData.success) {
          setSubscription(subData.subscription);
        }
      }

      // Verificar se Telegram está vinculado
      const telegramResponse = await fetch("/api/telegram/status");
      if (telegramResponse.ok) {
        const telegramData = await telegramResponse.json();
        if (telegramData.success) {
          setTelegramLinked(telegramData.linked);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar dados da conta:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysRemaining = () => {
    if (!subscription?.currentPeriodEnd) return 0;

    const endDate = new Date(subscription.currentPeriodEnd);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  };

  const getSubscriptionStatus = () => {
    if (!subscription) return { text: "Carregando...", color: "text-gray-400" };

    const status = subscription.status?.toLowerCase();

    switch (status) {
      case "active":
        return { text: "Ativo", color: "text-green-400" };
      case "trialing":
        return { text: "Trial", color: "text-blue-400" };
      case "canceled":
        return { text: "Cancelado", color: "text-red-400" };
      case "past_due":
        return { text: "Atrasado", color: "text-orange-400" };
      default:
        return { text: "Inativo", color: "text-gray-400" };
    }
  };

  const handleTelegramLink = async () => {
    try {
      const response = await fetch("/api/telegram/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!data.success) {
        alert("Erro ao gerar código: " + data.error);
        return;
      }

      const linkCode = data.data.linkCode as string;

      const instructions = `🚀 Vincular ao Telegram

Passo 1: Em breve teremos um bot exclusivo da BETDATA.
Passo 2: Copie o código abaixo e envie no chat do bot
Código: ${linkCode}

Depois de enviar, aguarde a confirmação no bot.`;

      let copied = false;
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        try {
          await navigator.clipboard.writeText(linkCode);
          copied = true;
        } catch (error) {
          console.warn("Falha ao copiar código para clipboard:", error);
        }
      }

      if (copied) {
        alert(`${instructions}\n\n✅ Código copiado automaticamente.`);
      } else {
        alert(
          `${instructions}\n\n⚠️ Se não copiou automaticamente, selecione o código acima e copie.`
        );
      }

      fetchAccountData();
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao gerar código de vinculação");
    }
  };

  const handleTelegramUnlink = async () => {
    const confirmed = window.confirm(
      "Tem certeza que deseja desvincular seu Telegram?\n\nVocê vai parar de receber alertas até vincular novamente."
    );

    if (!confirmed) return;

    try {
      setUnlinkingTelegram(true);

      const response = await fetch("/api/telegram/unlink", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        alert("Telegram desvinculado com sucesso!");
        await fetchAccountData();
      } else {
        alert("Erro ao desvincular Telegram: " + (data.error || "Erro"));
      }
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao desvincular Telegram");
    } finally {
      setUnlinkingTelegram(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordResult(null);

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setPasswordResult("Preencha todos os campos");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordResult("A nova senha deve ter pelo menos 8 caracteres");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordResult("As senhas nao conferem");
      return;
    }

    try {
      setPasswordLoading(true);
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setPasswordResult(
          "Senha alterada. Voce sera desconectado para entrar novamente."
        );
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setTimeout(() => {
          signOut({ callbackUrl: "/login" });
        }, 1200);
      } else {
        setPasswordResult(data.error || "Erro ao alterar senha");
      }
    } catch (error) {
      setPasswordResult("Erro ao alterar senha");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const daysRemaining = calculateDaysRemaining();
  const statusInfo = getSubscriptionStatus();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/dashboard" className="text-white">
              <BrandLogo size="md" />
            </Link>
            <span className="text-zinc-400">•</span>
            <span className="text-zinc-400">Minha Conta</span>
          </div>

          <div className="flex w-full flex-wrap items-center justify-between gap-4 sm:w-auto sm:justify-end">
            <span className="text-sm text-zinc-400">
              Olá, {session?.user?.name || "Usuário"}
            </span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          {/* Menu Lateral */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-xl sm:p-6">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <User size={20} className="text-orange-400" />
                Minha Conta
              </h2>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <Link
                  href="#plano"
                  className="w-full p-3 rounded-lg border border-zinc-700 hover:border-orange-500/50 hover:bg-orange-500/10 transition-all text-left flex items-center gap-3"
                >
                  <CreditCard size={16} className="text-orange-400" />
                  <span className="text-sm">Meu Plano</span>
                </Link>

                <Link
                  href="#senha"
                  className="w-full p-3 rounded-lg border border-zinc-700 hover:border-yellow-500/50 hover:bg-yellow-500/10 transition-all text-left flex items-center gap-3"
                >
                  <Lock size={16} className="text-yellow-400" />
                  <span className="text-sm">Alterar Senha</span>
                </Link>

                <Link
                  href="#telegram"
                  className="w-full p-3 rounded-lg border border-zinc-700 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all text-left flex items-center gap-3"
                >
                  <MessageCircle size={16} className="text-cyan-400" />
                  <span className="text-sm">Telegram Bot</span>
                </Link>

                <Link
                  href="#alertas"
                  className="w-full p-3 rounded-lg border border-zinc-700 hover:border-green-500/50 hover:bg-green-500/10 transition-all text-left flex items-center gap-3"
                >
                  <Bell size={16} className="text-green-400" />
                  <span className="text-sm">Configurações</span>
                </Link>

                <Link
                  href="#suporte"
                  className="w-full p-3 rounded-lg border border-zinc-700 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all text-left flex items-center gap-3"
                >
                  <HelpCircle size={16} className="text-purple-400" />
                  <span className="text-sm">Suporte</span>
                </Link>
              </div>

              {/* Status do Plano - Resumo */}
              <div className="mt-8 pt-6 border-t border-zinc-800">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Calendar size={14} />
                  Status do Plano
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-zinc-400">Status:</span>
                    <span className={statusInfo.color}>{statusInfo.text}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-zinc-400">Dias restantes:</span>
                    <span
                      className={
                        daysRemaining <= 7
                          ? "text-red-400 font-bold"
                          : "text-green-400"
                      }
                    >
                      {daysRemaining}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Conteúdo Principal */}
          <div className="lg:col-span-2 space-y-8">
            {/* Seção do Plano */}
            <div
              id="plano"
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur-xl sm:p-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <CreditCard size={24} className="text-orange-400" />
                <h2 className="text-xl font-bold sm:text-2xl">Meu Plano</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status Atual */}
                <div className="rounded-lg bg-zinc-800/50 p-5 sm:p-6">
                  <h3 className="text-lg font-semibold mb-4">Status Atual</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-zinc-400">Plano:</span>
                      <span className="text-white font-medium">
                        {subscription?.planId || "Nenhum"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-zinc-400">Status:</span>
                      <span className={`font-medium ${statusInfo.color}`}>
                        {statusInfo.text}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-zinc-400">Próxima cobrança:</span>
                      <span className="text-white">
                        {subscription?.currentPeriodEnd
                          ? new Date(
                              subscription.currentPeriodEnd
                            ).toLocaleDateString("pt-BR")
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dias Restantes */}
                <div className="rounded-lg bg-zinc-800/50 p-5 sm:p-6">
                  <h3 className="text-lg font-semibold mb-4">Tempo Restante</h3>
                  <div className="text-center">
                    <div
                      className={`mb-2 text-5xl font-bold sm:text-6xl ${
                        daysRemaining <= 7 ? "text-red-400" : "text-green-400"
                      }`}
                    >
                      {daysRemaining}
                    </div>
                    <div className="text-zinc-400 mb-4">dias restantes</div>

                    {daysRemaining <= 7 && (
                      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
                        <p className="text-red-400 text-sm">
                          ⚠️ Seu plano expira em breve! Renove para continuar
                          aproveitando todos os recursos.
                        </p>
                      </div>
                    )}

                    <Link
                      href="/upgrade"
                      className="inline-block bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-lg transition-all"
                    >
                      Renovar Plano
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Secao Alterar Senha */}
            <div
              id="senha"
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur-xl sm:p-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <Lock size={24} className="text-yellow-400" />
                <h2 className="text-xl font-bold sm:text-2xl">Alterar Senha</h2>
              </div>

              <div className="space-y-4 rounded-lg bg-zinc-800/50 p-5 sm:p-6">
                <div>
                  <label className="block text-sm text-zinc-300 mb-2">
                    Senha atual
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Digite sua senha atual"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-300 mb-2">
                      Nova senha
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Minimo 8 caracteres"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-300 mb-2">
                      Confirmar nova senha
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Repita a nova senha"
                    />
                  </div>
                </div>

                {passwordResult && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      passwordResult.toLowerCase().includes("erro") ||
                      passwordResult.toLowerCase().includes("incorreta")
                        ? "bg-red-500/20 border border-red-500/50 text-red-300"
                        : "bg-green-500/20 border border-green-500/50 text-green-300"
                    }`}
                  >
                    {passwordResult}
                  </div>
                )}

                <button
                  onClick={handlePasswordChange}
                  disabled={passwordLoading}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50"
                >
                  {passwordLoading ? "Salvando..." : "Alterar senha"}
                </button>

                <p className="text-xs text-zinc-400">
                  Por seguranca, voce sera desconectado apos alterar a senha.
                </p>
              </div>
            </div>

            {/* Seção Telegram */}
            <div
              id="telegram"
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur-xl sm:p-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <MessageCircle size={24} className="text-cyan-400" />
                <h2 className="text-xl font-bold sm:text-2xl">Telegram Bot</h2>
              </div>

              <div className="space-y-6">
                <div className="rounded-lg bg-zinc-800/50 p-5 sm:p-6">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">
                        Status da Vinculação
                      </h3>
                      <p className="text-zinc-400 text-sm">
                        {telegramLinked
                          ? "Sua conta está vinculada ao Telegram Bot"
                          : "Vincule sua conta para receber alertas automáticos"}
                      </p>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full ${
                        telegramLinked ? "bg-green-400" : "bg-red-400"
                      }`}
                    ></div>
                  </div>

                  {telegramLinked ? (
                    <>
                      <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                      <p className="text-green-400 text-sm">
                        ✅ Conta vinculada! Você receberá alertas automáticos
                        quando jogos começarem.
                      </p>
                    </div>

                    <div className="mt-3 space-y-2">
                      <button
                        onClick={handleTelegramUnlink}
                        disabled={unlinkingTelegram}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 disabled:text-zinc-500 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 border border-zinc-700 disabled:cursor-not-allowed"
                      >
                        {unlinkingTelegram
                          ? "Desvinculando..."
                          : "Desvincular Telegram"}
                      </button>
                      <p className="text-xs text-zinc-400">
                        Use isso caso você tenha trocado de conta no Telegram ou
                        precise refazer o vínculo.
                      </p>
                    </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
                        <p className="text-blue-400 text-sm mb-3">
                          📱 Vincule seu Telegram para receber alertas
                          automáticos de jogos!
                        </p>
                        <ul className="text-xs text-zinc-300 space-y-1">
                          <li>• Alertas quando jogos começam em 10 minutos</li>
                          <li>• Notificações de mudanças de odds</li>
                          <li>• Análises automáticas por Telegram</li>
                        </ul>
                      </div>

                      <button
                        onClick={handleTelegramLink}
                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        <MessageCircle size={18} />
                        Vincular Telegram
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Seção Configurações */}
            <div
              id="alertas"
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur-xl sm:p-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <Settings size={24} className="text-green-400" />
                <h2 className="text-xl font-bold sm:text-2xl">Configurações</h2>
              </div>

              <div className="space-y-6">
                <div className="rounded-lg bg-zinc-800/50 p-5 sm:p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Preferências de Alertas
                  </h3>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <span className="text-white font-medium">
                          Alertas de Jogos
                        </span>
                        <p className="text-zinc-400 text-sm">
                          Notificações quando jogos começam
                        </p>
                      </div>
                      <div className="w-12 h-6 bg-green-500 rounded-full relative">
                        <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <span className="text-white font-medium">
                          Mudanças de Odds
                        </span>
                        <p className="text-zinc-400 text-sm">
                          Alertas quando odds mudam significativamente
                        </p>
                      </div>
                      <div className="w-12 h-6 bg-zinc-600 rounded-full relative">
                        <div className="w-4 h-4 bg-white rounded-full absolute left-1 top-1"></div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <span className="text-white font-medium">
                          Análises Automáticas
                        </span>
                        <p className="text-zinc-400 text-sm">
                          Relatórios automáticos de performance
                        </p>
                      </div>
                      <div className="w-12 h-6 bg-zinc-600 rounded-full relative">
                        <div className="w-4 h-4 bg-white rounded-full absolute left-1 top-1"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção Suporte */}
            <div
              id="suporte"
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur-xl sm:p-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <HelpCircle size={24} className="text-purple-400" />
                <h2 className="text-xl font-bold sm:text-2xl">Suporte</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-800/50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-3">Contato</h3>
                  <div className="space-y-3">
                    <a
                      href="mailto:suporte@betdata.com"
                      className="flex items-center gap-3 text-zinc-300 hover:text-white transition-colors"
                    >
                      <span className="text-lg">📧</span>
                      <span>suporte@betdata.com</span>
                    </a>
                    <a
                      href="https://wa.me/5511999999999"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-zinc-300 hover:text-white transition-colors"
                    >
                      <span className="text-lg">💬</span>
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>

                <div className="bg-zinc-800/50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-3">Recursos</h3>
                  <div className="space-y-3">
                    <Link
                      href="/faq"
                      className="flex items-center gap-3 text-zinc-300 hover:text-white transition-colors"
                    >
                      <span className="text-lg">❓</span>
                      <span>Perguntas Frequentes</span>
                    </Link>
                    <Link
                      href="/tutorial"
                      className="flex items-center gap-3 text-zinc-300 hover:text-white transition-colors"
                    >
                      <span className="text-lg">📚</span>
                      <span>Tutoriais</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
