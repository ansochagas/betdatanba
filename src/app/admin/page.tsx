"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Users,
  UserCheck,
  UserPlus,
  MessageSquare,
  Send,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertTriangle,
  Zap,
  Clock,
  Info,
  Settings,
  HelpCircle,
  Activity,
  Shield,
  RefreshCw,
  Lock,
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  trialUsers: number;
  telegramLinkedUsers: number;
  recentSignups: number;
  monthlyRevenue: number;
}

interface BroadcastMessage {
  title: string;
  message: string;
  target: "all" | "active" | "trial";
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [broadcastMessage, setBroadcastMessage] = useState<BroadcastMessage>({
    title: "",
    message: "",
    target: "all",
  });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);
  const [integrityCheck, setIntegrityCheck] = useState<any>(null);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);
  const [alertsData, setAlertsData] = useState<any>(null);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [sendingAlerts, setSendingAlerts] = useState(false);
  const [alertResult, setAlertResult] = useState<string | null>(null);
  const [gameAlertsStatus, setGameAlertsStatus] = useState<any>(null);
  const [checkingGameAlerts, setCheckingGameAlerts] = useState(false);
  const [gameAlertResult, setGameAlertResult] = useState<string | null>(null);
  const [telegramUnlinkEmail, setTelegramUnlinkEmail] = useState("");
  const [telegramUnlinking, setTelegramUnlinking] = useState(false);
  const [telegramUnlinkResult, setTelegramUnlinkResult] = useState<string | null>(
    null
  );
  const [subSearchEmail, setSubSearchEmail] = useState("");
  const [subsList, setSubsList] = useState<any[]>([]);
  const [subPage, setSubPage] = useState(1);
  const [subTotal, setSubTotal] = useState(0);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [updatingSub, setUpdatingSub] = useState(false);
  const subPageSize = 20;
  const [subForm, setSubForm] = useState({
    email: "",
    planId: "",
    status: "",
    currentPeriodEnd: "",
  });
  const [subResult, setSubResult] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const subTotalPages = Math.max(1, Math.ceil(subTotal / subPageSize));

  useEffect(() => {
    // Verificar se usuário é admin
    if (session?.user?.email && !isAdmin(session.user.email)) {
      window.location.href = "/dashboard";
      return;
    }

    fetchAdminStats();
    handleLoadSubscriptions(1);
  }, [session]);

  const isAdmin = (email: string) => {
    // Lista de emails administrativos
    const adminEmails = [
      "admin@csgoscout.com",
      "andersonchagas45@gmail.com", // Conta admin criada
      // Adicionar mais emails conforme necessário
    ];

    // Verificar se é admin
    return adminEmails.includes(email);
  };

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/stats");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.title || !broadcastMessage.message) {
      alert("Preencha título e mensagem");
      return;
    }

    try {
      setSendingBroadcast(true);
      setBroadcastResult(null);

      const response = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(broadcastMessage),
      });

      const data = await response.json();

      if (data.success) {
        setBroadcastResult(
          `Mensagem enviada para ${data.sentCount} usuários!`
        );
        setBroadcastMessage({ title: "", message: "", target: "all" });
      } else {
        setBroadcastResult(`Erro: ${data.error}`);
      }
    } catch (error) {
      setBroadcastResult("Erro ao enviar mensagem");
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleAdminTelegramUnlink = async () => {
    const email = telegramUnlinkEmail.trim();

    if (!email) {
      alert("Informe o email do usuário");
      return;
    }

    const confirmed = window.confirm(
      `Desvincular Telegram do usuário ${email}?\n\nEssa ação remove o vínculo e o usuário precisará vincular novamente.`
    );

    if (!confirmed) return;

    try {
      setTelegramUnlinking(true);
      setTelegramUnlinkResult(null);

      const response = await fetch("/api/telegram/unlink", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setTelegramUnlinkResult(
          `Telegram desvinculado: ${data.data?.email || email}`
        );
        setTelegramUnlinkEmail("");
        fetchAdminStats();
      } else {
        setTelegramUnlinkResult(`Erro: ${data.error || "Erro"}`);
      }
    } catch (error) {
      setTelegramUnlinkResult("Erro ao desvincular Telegram");
    } finally {
      setTelegramUnlinking(false);
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  const handleIntegrityCheck = async () => {
    try {
      setCheckingIntegrity(true);
      const response = await fetch("/api/admin/subscription-integrity");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setIntegrityCheck(data.integrity);
        }
      }
    } catch (error) {
      console.error("Erro na verificação de integridade:", error);
    } finally {
      setCheckingIntegrity(false);
    }
  };

  const handleLoadAlerts = async () => {
    try {
      setLoadingAlerts(true);
      const response = await fetch("/api/admin/subscription-alerts");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAlertsData(data);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar alertas:", error);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleSendAlerts = async () => {
    try {
      setSendingAlerts(true);
      setAlertResult(null);

      const response = await fetch("/api/admin/subscription-alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "send" }),
      });

      const data = await response.json();

      if (data.success) {
        setAlertResult(`${data.result.sent} alertas enviados com sucesso!`);
        // Recarregar dados
        handleLoadAlerts();
      } else {
        setAlertResult(`Erro: ${data.error}`);
      }
    } catch (error) {
      setAlertResult("Erro ao enviar alertas");
    } finally {
      setSendingAlerts(false);
    }
  };

  const handleCheckGameAlerts = async () => {
    try {
      setCheckingGameAlerts(true);
      setGameAlertResult(null);

      const response = await fetch("/api/admin/game-alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "check" }),
      });

      const data = await response.json();

      if (data.success) {
        setGameAlertResult(`${data.message}`);
        // Recarregar status
        handleLoadGameAlertsStatus();
      } else {
        setGameAlertResult(`Erro: ${data.error}`);
      }
    } catch (error) {
      setGameAlertResult("Erro ao verificar alertas de jogos");
    } finally {
      setCheckingGameAlerts(false);
    }
  };

  const handleLoadGameAlertsStatus = async () => {
    try {
      const response = await fetch("/api/admin/game-alerts");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setGameAlertsStatus(data.status);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar status dos alertas de jogos:", error);
    }
  };

  const handleLoadSubscriptions = async (page = 1) => {
    try {
      setLoadingSubs(true);
      setSubResult(null);
      const emailFilter = subSearchEmail.trim();
      const params = new URLSearchParams();
      if (emailFilter) {
        params.set("email", emailFilter);
      }
      params.set("page", String(page));
      params.set("limit", String(subPageSize));
      const response = await fetch(`/api/admin/subscriptions?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setSubsList(data.data || []);
        setSubTotal(data.total || 0);
        setSubPage(data.page || page);
      } else {
        setSubResult(data.error || "Erro ao carregar assinaturas");
        setSubsList([]);
        setSubTotal(0);
      }
    } catch (error) {
      setSubResult("Erro ao carregar assinaturas");
      setSubsList([]);
      setSubTotal(0);
    } finally {
      setLoadingSubs(false);
    }
  };

  const handleSelectSub = (sub: any) => {
    setSubForm({
      email: sub.email,
      planId: sub.subscription?.planId || "",
      status: sub.subscription?.status || "",
      currentPeriodEnd: sub.subscription?.currentPeriodEnd
        ? new Date(sub.subscription.currentPeriodEnd).toISOString().slice(0, 10)
        : "",
    });
    setResetEmail(sub.email);
  };

  const handleUpdateSub = async () => {
    if (!subForm.email) {
      setSubResult("Informe o email");
      return;
    }
    try {
      setUpdatingSub(true);
      setSubResult(null);
      const payload: any = { email: subForm.email };
      if (subForm.planId) payload.planId = subForm.planId;
      if (subForm.status) payload.status = subForm.status;
      if (subForm.currentPeriodEnd) payload.currentPeriodEnd = subForm.currentPeriodEnd;

      const response = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        setSubResult("Assinatura atualizada");
        handleLoadSubscriptions(subPage);
      } else {
        setSubResult(data.error || "Erro ao atualizar");
      }
    } catch (error) {
      setSubResult("Erro ao atualizar");
    } finally {
      setUpdatingSub(false);
    }
  };

  const handleResetPassword = async (emailOverride?: string) => {
    const email = (emailOverride || resetEmail).trim();
    const customPassword = resetPassword.trim();
    const confirmPassword = resetPasswordConfirm.trim();
    const hasCustomPassword = customPassword.length > 0;
    if (!email) {
      setResetResult("Informe o email");
      return;
    }
    if (hasCustomPassword && customPassword.length < 6) {
      setResetResult("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (hasCustomPassword && customPassword !== confirmPassword) {
      setResetResult("As senhas não conferem");
      return;
    }
    const confirmText = hasCustomPassword
      ? "Definir senha manual para " + email + "?"
      : "Gerar senha temporária para " + email + "?";
    const confirmed = window.confirm(confirmText);
    if (!confirmed) return;
    try {
      setResetLoading(true);
      setResetResult(null);
      setResetEmail(email);
      const payload: any = { email };
      if (hasCustomPassword) payload.password = customPassword;
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        const label = data.customPasswordUsed
          ? "Senha definida"
          : "Senha temporária";
        setResetResult(label + " para " + email + ": " + data.tempPassword);
        setResetPassword("");
        setResetPasswordConfirm("");
      } else {
        setResetResult(data.error || "Erro ao resetar");
      }
    } catch (error) {
      setResetResult("Erro ao resetar senha");
    } finally {
      setResetLoading(false);
    }
  };

  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={64} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Acesso Negado</h1>
          <p className="text-zinc-400 mb-8">
            Você não tem permissão para acessar esta página.
          </p>
          <button
            onClick={() => (window.location.href = "/dashboard")}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              ADMIN PANEL
            </div>
            <span className="text-zinc-400"></span>
            <span className="text-zinc-400">Dashboard Administrativo</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">
              Admin: {session?.user?.name}
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

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Métricas Principais */}
          <div className="lg:col-span-2 space-y-8">
            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <Users className="text-blue-400" size={32} />
                  <div>
                    <p className="text-2xl font-bold">
                      {stats?.totalUsers || 0}
                    </p>
                    <p className="text-zinc-400 text-sm">Total de Usuários</p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <UserCheck className="text-green-400" size={32} />
                  <div>
                    <p className="text-2xl font-bold">
                      {stats?.activeSubscriptions || 0}
                    </p>
                    <p className="text-zinc-400 text-sm">Assinaturas Ativas</p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <UserPlus className="text-orange-400" size={32} />
                  <div>
                    <p className="text-2xl font-bold">
                      {stats?.trialUsers || 0}
                    </p>
                    <p className="text-zinc-400 text-sm">Em Trial</p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <MessageSquare className="text-cyan-400" size={32} />
                  <div>
                    <p className="text-2xl font-bold">
                      {stats?.telegramLinkedUsers || 0}
                    </p>
                    <p className="text-zinc-400 text-sm">Telegram Vinculado</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Receita e Novos Usuários */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <DollarSign className="text-green-400" size={24} />
                  <h3 className="text-lg font-semibold">Receita Mensal</h3>
                </div>
                <p className="text-3xl font-bold text-green-400">
                  R$ {stats?.monthlyRevenue?.toFixed(2) || "0.00"}
                </p>
                <p className="text-zinc-400 text-sm mt-2">
                  <TrendingUp size={14} className="inline mr-1" />
                  +12% em relação ao mês passado
                </p>
              </div>

              <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Calendar className="text-blue-400" size={24} />
                  <h3 className="text-lg font-semibold">Novos Cadastros</h3>
                </div>
                <p className="text-3xl font-bold text-blue-400">
                  {stats?.recentSignups || 0}
                </p>
                <p className="text-zinc-400 text-sm mt-2">
                  Nos últimos 30 dias
                </p>
              </div>
            </div>

            {/* Verificação de Integridade */}
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <AlertTriangle className="text-orange-400" size={24} />
                  <div>
                    <h3 className="text-lg font-semibold">
                      Integridade das Subscriptions
                    </h3>
                    <p className="text-zinc-400 text-sm">
                      Verifique a saúde dos planos dos usuários
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleIntegrityCheck}
                  disabled={checkingIntegrity}
                  className="bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-600 text-white px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {checkingIntegrity ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Verificando...
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={16} />
                      Verificar
                    </>
                  )}
                </button>
              </div>

              {integrityCheck && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-400">
                        {integrityCheck.totalSubscriptions}
                      </p>
                      <p className="text-xs text-zinc-400">Total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-400">
                        {integrityCheck.validSubscriptions}
                      </p>
                      <p className="text-xs text-zinc-400">Válidas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-400">
                        {integrityCheck.invalidSubscriptions}
                      </p>
                      <p className="text-xs text-zinc-400">Inválidas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-400">
                        {integrityCheck.expiredSubscriptions}
                      </p>
                      <p className="text-xs text-zinc-400">Expiradas</p>
                    </div>
                  </div>

                  {integrityCheck.issues.length > 0 && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                      <h4 className="text-red-400 font-semibold mb-2">
                        ️ Problemas encontrados ({integrityCheck.issues.length}
                        )
                      </h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {integrityCheck.issues
                          .slice(0, 5)
                          .map((issue: string, index: number) => (
                            <p key={index} className="text-red-300 text-sm">
                               {issue}
                            </p>
                          ))}
                        {integrityCheck.issues.length > 5 && (
                          <p className="text-red-300 text-sm">
                            ... e mais {integrityCheck.issues.length - 5}{" "}
                            problemas
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {integrityCheck.issues.length === 0 && (
                    <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                      <p className="text-green-400 text-sm">
                         Todas as assinaturas estão íntegras!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Alertas de Expiração */}
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <AlertTriangle className="text-red-400" size={24} />
                  <div>
                    <h3 className="text-lg font-semibold">
                      Alertas de Expiração
                    </h3>
                    <p className="text-zinc-400 text-sm">
                      Usuários próximos da expiração do plano
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleLoadAlerts}
                    disabled={loadingAlerts}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-600 text-white px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loadingAlerts ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Carregando...
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={16} />
                        Verificar
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSendAlerts}
                    disabled={sendingAlerts || !alertsData?.alerts?.length}
                    className="bg-red-500 hover:bg-red-600 disabled:bg-zinc-600 text-white px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sendingAlerts ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Enviar Alertas
                      </>
                    )}
                  </button>
                </div>
              </div>

              {alertResult && (
                <div
                  className={`mb-4 p-3 rounded-lg text-sm ${
                    alertResult.includes("")
                      ? "bg-green-500/20 border border-green-500/50 text-green-400"
                      : "bg-red-500/20 border border-red-500/50 text-red-400"
                  }`}
                >
                  {alertResult}
                </div>
              )}

              {alertsData && (
                <div className="space-y-4">
                  {/* Resumo */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-400">
                        {alertsData.summary?.critical || 0}
                      </p>
                      <p className="text-xs text-zinc-400">
                        Críticos (3 dias)
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-400">
                        {alertsData.summary?.warning || 0}
                      </p>
                      <p className="text-xs text-zinc-400">Avisos (7 dias)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-400">
                        {alertsData.summary?.expired || 0}
                      </p>
                      <p className="text-xs text-zinc-400">Expirados</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-400">
                        {alertsData.summary?.total || 0}
                      </p>
                      <p className="text-xs text-zinc-400">Total</p>
                    </div>
                  </div>

                  {/* Lista de Alertas */}
                  {alertsData.alerts?.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-zinc-300">
                        Usuários que precisam de alertas:
                      </h4>
                      {alertsData.alerts
                        .slice(0, 10)
                        .map((alert: any, index: number) => (
                          <div
                            key={index}
                            className={`p-3 rounded-lg border ${
                              alert.alertType === "critical"
                                ? "bg-red-500/10 border-red-500/30"
                                : alert.alertType === "warning"
                                ? "bg-orange-500/10 border-orange-500/30"
                                : "bg-gray-500/10 border-gray-500/30"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium text-white">
                                  {alert.userEmail}
                                </p>
                                <p className="text-xs text-zinc-400 mt-1">
                                  {alert.message}
                                </p>
                              </div>
                              <div
                                className={`px-2 py-1 rounded text-xs font-bold ${
                                  alert.alertType === "critical"
                                    ? "bg-red-500/20 text-red-400"
                                    : alert.alertType === "warning"
                                    ? "bg-orange-500/20 text-orange-400"
                                    : "bg-gray-500/20 text-gray-400"
                                }`}
                              >
                                {alert.daysRemaining} dias
                              </div>
                            </div>
                          </div>
                        ))}
                      {alertsData.alerts.length > 10 && (
                        <p className="text-xs text-zinc-400 text-center">
                          ... e mais {alertsData.alerts.length - 10} usuários
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-zinc-400">
                         Nenhum alerta necessário no momento!
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Todos os usuários estão com planos em dia
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Alertas de Jogos */}
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Zap className="text-yellow-400" size={24} />
                  <div>
                    <h3 className="text-lg font-semibold">Alertas de Jogos</h3>
                    <p className="text-zinc-400 text-sm">
                      Notificações automáticas de jogos próximos
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCheckGameAlerts}
                  disabled={checkingGameAlerts}
                  className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-zinc-600 text-white px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {checkingGameAlerts ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Verificando...
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      Verificar Jogos
                    </>
                  )}
                </button>
              </div>

              {gameAlertResult && (
                <div
                  className={`mb-4 p-3 rounded-lg text-sm ${
                    gameAlertResult.includes("")
                      ? "bg-green-500/20 border border-green-500/50 text-green-400"
                      : "bg-red-500/20 border border-red-500/50 text-red-400"
                  }`}
                >
                  {gameAlertResult}
                </div>
              )}

              {gameAlertsStatus && (
                <div className="space-y-4">
                  {/* Status do Sistema */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                      <div
                        className={`w-4 h-4 rounded-full mx-auto mb-2 ${
                          gameAlertsStatus.serviceActive
                            ? "bg-green-400"
                            : "bg-red-400"
                        }`}
                      ></div>
                      <p className="text-sm text-zinc-400">Status</p>
                      <p className="text-white font-medium">
                        {gameAlertsStatus.serviceActive ? "Ativo" : "Inativo"}
                      </p>
                    </div>

                    <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                      <Clock size={20} className="mx-auto mb-2 text-blue-400" />
                      <p className="text-sm text-zinc-400">
                        ltima Verificação
                      </p>
                      <p className="text-white font-medium">
                        {new Date(
                          gameAlertsStatus.lastCheck
                        ).toLocaleTimeString("pt-BR")}
                      </p>
                    </div>

                    <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                      <Settings
                        size={20}
                        className="mx-auto mb-2 text-purple-400"
                      />
                      <p className="text-sm text-zinc-400">Intervalo</p>
                      <p className="text-white font-medium">
                        {gameAlertsStatus.checkInterval}
                      </p>
                    </div>
                  </div>

                  {/* Informações do Sistema */}
                  <div className="bg-zinc-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Info size={16} className="text-blue-400" />
                      Informações do Sistema
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">
                          Alertas Habilitados:
                        </span>
                        <span
                          className={`font-medium ${
                            gameAlertsStatus.alertsEnabled
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {gameAlertsStatus.alertsEnabled ? "Sim" : "Não"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Mensagem:</span>
                        <span className="text-white">
                          {gameAlertsStatus.message}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Como Funciona */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <h4 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                      <HelpCircle size={16} />
                      Como Funciona
                    </h4>
                    <ul className="text-sm text-zinc-300 space-y-1">
                      <li>  Verifica jogos a cada 1 minuto</li>
                      <li>  Alerta 10min, 5min e no início do jogo</li>
                      <li>
                          Envia via Telegram para usuários configurados
                      </li>
                      <li>  Evita alertas duplicados (1h de bloqueio)</li>
                      <li>  Funciona 24/7 em background</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Gestão de Usuários */}
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Shield className="text-green-400" size={24} />
                  <h3 className="text-lg font-semibold">
                    Gestão de Usuários (Admin)
                  </h3>
                </div>
                <button
                  onClick={() => handleLoadSubscriptions(1)}
                  disabled={loadingSubs}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingSubs ? "animate-spin" : ""}`} />
                  Carregar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-zinc-300 mb-1">
                    Buscar por email
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={subSearchEmail}
                      onChange={(e) => setSubSearchEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
                      placeholder="cliente@email.com"
                    />
                    <button
                      onClick={() => handleLoadSubscriptions(1)}
                      disabled={loadingSubs}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50"
                    >
                      Buscar
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400 mb-4">
                <span>Total: {subTotal}</span>
                <span>
                  Pagina {subPage} de {subTotalPages}
                </span>
                <button
                  onClick={() => handleLoadSubscriptions(Math.max(1, subPage - 1))}
                  disabled={loadingSubs || subPage <= 1}
                  className="px-3 py-1 rounded border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() =>
                    handleLoadSubscriptions(Math.min(subTotalPages, subPage + 1))
                  }
                  disabled={loadingSubs || subPage >= subTotalPages}
                  className="px-3 py-1 rounded border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
                >
                  Proxima
                </button>
              </div>

              {subResult && (
                <div
                  className={`mb-4 p-3 rounded-lg text-sm ${
                    subResult.toLowerCase().includes("erro")
                      ? "bg-red-500/20 border border-red-500/50 text-red-300"
                      : "bg-green-500/20 border border-green-500/50 text-green-300"
                  }`}
                >
                  {subResult}
                </div>
              )}

              {subsList.length > 0 && (
                <div className="mb-4 overflow-x-auto border border-zinc-800 rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-zinc-900/80">
                      <tr className="text-left text-zinc-400">
                        <th className="p-3">Usuario</th>
                        <th className="p-3">Contato</th>
                        <th className="p-3">Plano / Status</th>
                        <th className="p-3">Período</th>
                        <th className="p-3">Criado</th>
                        <th className="p-3">Acoes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {subsList.map((u) => {
                        const periodEnd = u.subscription?.currentPeriodEnd
                          ? new Date(u.subscription.currentPeriodEnd)
                          : null;
                        const trialEnds = u.subscription?.trialEndsAt
                          ? new Date(u.subscription.trialEndsAt)
                          : null;
                        const createdAt = u.createdAt
                          ? new Date(u.createdAt)
                          : null;
                        const daysLeft = periodEnd
                          ? Math.max(
                              0,
                              Math.ceil(
                                (periodEnd.getTime() - Date.now()) /
                                  (1000 * 60 * 60 * 24)
                              )
                            )
                          : null;
                        const stripeId = u.subscription?.stripeCustomerId || "";
                        const stripeLabel = stripeId
                          ? `${stripeId.slice(0, 6)}...${stripeId.slice(-4)}`
                          : "N/A";

                        return (
                          <tr key={u.id} className="bg-zinc-950/40">
                            <td className="p-3 align-top">
                              <div className="text-white font-semibold">
                                {u.email}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {u.name || "Sem nome"}
                              </div>
                              <div className="text-[11px] text-zinc-500">
                                ID: {u.id}
                              </div>
                            </td>
                            <td className="p-3 align-top text-zinc-300">
                              <div>{u.phone || "Sem telefone"}</div>
                              <div className="text-xs text-zinc-400">
                                Telegram: {u.telegramId || "Não vinculado"}
                              </div>
                            </td>
                            <td className="p-3 align-top text-zinc-300">
                              <div>{u.subscription?.planId || "Sem plano"}</div>
                              <div className="text-xs text-zinc-400">
                                {u.subscription?.status || "N/A"}
                              </div>
                              <div className="text-[11px] text-zinc-500">
                                Stripe: {stripeLabel}
                              </div>
                            </td>
                            <td className="p-3 align-top text-zinc-300">
                              <div>
                                Fim:{" "}
                                {periodEnd
                                  ? periodEnd.toLocaleDateString("pt-BR")
                                  : "N/A"}
                              </div>
                              <div className="text-xs text-zinc-400">
                                Dias: {daysLeft !== null ? daysLeft : "N/A"}
                              </div>
                              <div className="text-[11px] text-zinc-500">
                                Trial:{" "}
                                {trialEnds
                                  ? trialEnds.toLocaleDateString("pt-BR")
                                  : "N/A"}
                              </div>
                            </td>
                            <td className="p-3 align-top text-zinc-300">
                              {createdAt
                                ? createdAt.toLocaleDateString("pt-BR")
                                : "N/A"}
                            </td>
                            <td className="p-3 align-top">
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => handleSelectSub(u)}
                                  className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg"
                                >
                                  Selecionar
                                </button>
                                <button
                                  onClick={() => handleResetPassword(u.email)}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                                  disabled={resetLoading}
                                >
                                  Resetar senha
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm text-zinc-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={subForm.email}
                    onChange={(e) =>
                      setSubForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
                    placeholder="cliente@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-300 mb-1">
                    Plano
                  </label>
                  <select
                    value={subForm.planId}
                    onChange={(e) =>
                      setSubForm((prev) => ({ ...prev, planId: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">(manter)</option>
                    <option value="nba_trial">Trial NBA</option>
                    <option value="nba_monthly">NBA Mensal</option>
                    <option value="nba_quarterly">NBA Trimestral</option>
                    <option value="nba_semestral">NBA Semestral</option>
                    <option value="nba_lifetime">NBA Vitalício</option>
                    <option value="combo_manual">Combo Manual (CS + NBA)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-300 mb-1">
                    Status
                  </label>
                  <select
                    value={subForm.status}
                    onChange={(e) =>
                      setSubForm((prev) => ({ ...prev, status: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">(manter)</option>
                    <option value="active">ACTIVE</option>
                    <option value="trialing">TRIALING</option>
                    <option value="past_due">PAST_DUE</option>
                    <option value="canceled">CANCELED</option>
                    <option value="expired">EXPIRED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-300 mb-1">
                    Fim do período
                  </label>
                  <input
                    type="date"
                    value={subForm.currentPeriodEnd}
                    onChange={(e) =>
                      setSubForm((prev) => ({
                        ...prev,
                        currentPeriodEnd: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={handleUpdateSub}
                  disabled={updatingSub || !subForm.email}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
                >
                  {updatingSub ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </div>

            {/* Reset de senha (admin) */}
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="text-orange-400" size={22} />
                <h3 className="text-lg font-semibold">Reset de senha (admin)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-sm text-zinc-300 mb-1">
                    Email do usuário
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
                    placeholder="cliente@email.com"
                  />
                </div>
                <button
                  onClick={() => handleResetPassword()}
                  disabled={resetLoading || !resetEmail}
                  className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {resetLoading
                    ? "Salvando..."
                    : resetPassword.trim()
                    ? "Definir senha"
                    : "Gerar senha temporária"}
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-zinc-300 mb-1">
                    Nova senha (opcional)
                  </label>
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
                    placeholder="Minimo 6 caracteres"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-300 mb-1">
                    Confirmar senha
                  </label>
                  <input
                    type="password"
                    value={resetPasswordConfirm}
                    onChange={(e) => setResetPasswordConfirm(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
                    placeholder="Repita a senha"
                  />
                </div>
                <div className="text-xs text-zinc-500 flex items-end">
                  Se deixar vazio, o sistema gera uma senha temporária.
                </div>
              </div>
              {resetResult && (
                <div className="mt-3 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200">
                  {resetResult}
                </div>
              )}
              <p className="text-xs text-zinc-500 mt-2">
                A senha definida (ou temporária) aparece aqui para você enviar ao cliente. Recomende que ele altere após o login.
              </p>
            </div>
          </div>

          {/* Painel de Broadcast */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-xl p-6 sticky top-8">
              <div className="flex items-center gap-3 mb-6">
                <Send className="text-orange-400" size={24} />
                <h2 className="text-xl font-bold">Broadcast Telegram</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Título da Mensagem
                  </label>
                  <input
                    type="text"
                    value={broadcastMessage.title}
                    onChange={(e) =>
                      setBroadcastMessage((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
                    placeholder="Ex: Manutenção Programada"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Mensagem
                  </label>
                  <textarea
                    value={broadcastMessage.message}
                    onChange={(e) =>
                      setBroadcastMessage((prev) => ({
                        ...prev,
                        message: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none resize-none"
                    rows={4}
                    placeholder="Digite sua mensagem..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Público Alvo
                  </label>
                  <select
                    value={broadcastMessage.target}
                    onChange={(e) =>
                      setBroadcastMessage((prev) => ({
                        ...prev,
                        target: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                  >
                    <option value="all">Todos os usuários vinculados</option>
                    <option value="active">Apenas assinantes ativos</option>
                    <option value="trial">Apenas usuários em trial</option>
                  </select>
                </div>

                {broadcastResult && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      broadcastResult.includes("")
                        ? "bg-green-500/20 border border-green-500/50 text-green-400"
                        : "bg-red-500/20 border border-red-500/50 text-red-400"
                    }`}
                  >
                    {broadcastResult}
                  </div>
                )}

                <button
                  onClick={handleBroadcast}
                  disabled={
                    sendingBroadcast ||
                    !broadcastMessage.title ||
                    !broadcastMessage.message
                  }
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-zinc-600 disabled:to-zinc-700 text-white font-bold py-3 px-4 rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sendingBroadcast ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Enviar Broadcast
                    </>
                  )}
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-zinc-800">
                <h3 className="text-sm font-medium mb-3">Informações</h3>
                <div className="text-xs text-zinc-400 space-y-2">
                  <p>
                     Apenas usuários com Telegram vinculado recebem as
                    mensagens
                  </p>
                  <p> Mensagens são enviadas em lote para evitar sobrecarga</p>
                  <p> Use com responsabilidade</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-zinc-800">
                <h3 className="text-sm font-medium mb-3">
                  Desvincular Telegram (Admin)
                </h3>

                <div className="space-y-3">
                  <input
                    type="email"
                    value={telegramUnlinkEmail}
                    onChange={(e) => setTelegramUnlinkEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
                    placeholder="Email do usuário (ex: cliente@email.com)"
                  />

                  {telegramUnlinkResult && (
                    <div
                      className={`p-3 rounded-lg text-sm ${
                        telegramUnlinkResult.includes("o.")
                          ? "bg-green-500/20 border border-green-500/50 text-green-400"
                          : "bg-red-500/20 border border-red-500/50 text-red-400"
                      }`}
                    >
                      {telegramUnlinkResult}
                    </div>
                  )}

                  <button
                    onClick={handleAdminTelegramUnlink}
                    disabled={telegramUnlinking || !telegramUnlinkEmail.trim()}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 disabled:text-zinc-500 text-white font-semibold py-3 px-4 rounded-lg transition-all border border-zinc-700 disabled:cursor-not-allowed"
                  >
                    {telegramUnlinking
                      ? "Desvinculando..."
                      : "Desvincular Telegram"}
                  </button>

                  <p className="text-xs text-zinc-400">
                    Remove o vínculo atual (telegramId/config/códigos) para o
                    usuário poder vincular novamente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
