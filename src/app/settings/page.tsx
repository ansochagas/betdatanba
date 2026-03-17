"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const generateLinkCode = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/telegram/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        setLinkCode(data.data.linkCode);
      } else {
        alert("Erro ao gerar código: " + data.error);
      }
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao gerar código de vinculação");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Código copiado para a área de transferência!");
    } catch (error) {
      alert("Erro ao copiar: " + text);
    }
  };

  if (status === "loading") {
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Configurações</h1>
          <p className="text-gray-400">
            Gerencie suas preferências e integrações
          </p>
        </div>

        {/* Telegram Section */}
        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-blue-500">📱</span>
            Telegram Bot
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Status da Vinculação</h3>
                <p className="text-sm text-gray-400">
                  {telegramLinked
                    ? "Conta vinculada - Recebendo alertas"
                    : "Conta não vinculada - Sem alertas"}
                </p>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-sm ${
                  telegramLinked
                    ? "bg-green-600 text-white"
                    : "bg-red-600 text-white"
                }`}
              >
                {telegramLinked ? "Vinculado" : "Não Vinculado"}
              </div>
            </div>

            {!telegramLinked && (
              <div className="border-t border-zinc-800 pt-4">
                <h3 className="font-semibold mb-2">Como vincular:</h3>
                <ol className="text-sm text-gray-400 space-y-1 mb-4">
                  <li>1. Clique em "Gerar Código de Vinculação"</li>
                  <li>2. Copie o código gerado</li>
                  <li>3. Abra o chat com @CsgoScoutBot no Telegram</li>
                  <li>4. Envie o código para o bot</li>
                  <li>5. Pronto! Sua conta estará vinculada</li>
                </ol>

                {!linkCode ? (
                  <button
                    onClick={generateLinkCode}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    {loading ? "Gerando..." : "Gerar Código de Vinculação"}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-400">
                      Código gerado:{" "}
                      <strong className="text-white">{linkCode}</strong>
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(linkCode)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Copiar Código
                      </button>
                      <button
                        onClick={() => setLinkCode(null)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Gerar Novo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {telegramLinked && (
              <div className="border-t border-zinc-800 pt-4">
                <h3 className="font-semibold mb-2">Configurações de Alertas</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Configure quais tipos de alertas você quer receber:
                </p>

                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Jogos futuros</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Mudanças de odds</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Análises de jogos</span>
                  </label>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  *Funcionalidades avançadas em desenvolvimento
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Outras configurações futuras */}
        <div className="mt-8 bg-zinc-900 rounded-lg p-6 border border-zinc-800">
          <h2 className="text-xl font-bold mb-4">Outras Configurações</h2>
          <p className="text-gray-400">
            Mais opções de configuração em breve...
          </p>
        </div>
      </div>
    </div>
  );
}
