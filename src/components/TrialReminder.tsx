"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Subscription {
  id: string;
  status: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
}

export default function TrialReminder() {
  const { data: session } = useSession();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [daysLeft, setDaysLeft] = useState<number>(0);
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!(session?.user as any)?.id) return;

      try {
        const response = await fetch(`/api/user/subscription`);
        if (response.ok) {
          const data = await response.json();
          setSubscription(data.subscription);

          if (data.subscription?.trialEndsAt) {
            const trialEnd = new Date(data.subscription.trialEndsAt);
            const now = new Date();
            const diffTime = trialEnd.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            setDaysLeft(Math.max(0, diffDays)); // Não mostrar negativo

            // Mostrar lembrete se faltar 3 dias ou menos
            setShowReminder(diffDays <= 3 && diffDays >= 0);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar assinatura:", error);
      }
    };

    fetchSubscription();
  }, [session]);

  if (!showReminder || !subscription) return null;

  const getReminderStyle = () => {
    if (daysLeft <= 1) return "bg-red-500/10 border-red-500/20 text-red-400";
    if (daysLeft <= 2)
      return "bg-orange-500/10 border-orange-500/20 text-orange-400";
    return "bg-yellow-500/10 border-yellow-500/20 text-yellow-400";
  };

  const getReminderIcon = () => {
    if (daysLeft <= 1) return "🚨";
    if (daysLeft <= 2) return "⚠️";
    return "⏰";
  };

  const getReminderTitle = () => {
    if (daysLeft <= 1) return "Seu trial expira hoje!";
    if (daysLeft === 1) return "Último dia do seu trial!";
    return `${daysLeft} dias restantes no trial`;
  };

  const getReminderMessage = () => {
    if (daysLeft <= 1) {
      return "Renove agora para continuar tendo acesso aos dados exclusivos e manter sua vantagem competitiva.";
    }
    return "Não perca o acesso aos dados exclusivos. Renove seu plano e continue dominando as apostas.";
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-xl border backdrop-blur-xl shadow-2xl ${getReminderStyle()}`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">{getReminderIcon()}</div>
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-2">{getReminderTitle()}</h3>
          <p className="text-sm mb-4 opacity-90">{getReminderMessage()}</p>
          <div className="flex gap-2">
            <Link
              href="/upgrade"
              className="px-4 py-2 bg-current text-black font-bold rounded-lg text-sm hover:opacity-90 transition-opacity"
            >
              Renovar Agora
            </Link>
            <button
              onClick={() => setShowReminder(false)}
              className="px-4 py-2 border border-current/30 rounded-lg text-sm hover:bg-current/10 transition-colors"
            >
              Lembrar Depois
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowReminder(false)}
          className="text-current/60 hover:text-current transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
