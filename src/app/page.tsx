"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  CreditCard,
  LineChart,
  Lock,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import BrandLogo from "@/components/brand/BrandLogo";

const publicPlans = [
  {
    name: "NBA Mensal",
    price: "R$ 49,90",
    period: "/mês",
    description: "Entrada rápida para usar a plataforma no dia a dia.",
    highlight: false,
    bullets: [
      "Pre-jogo de hoje e amanhã",
      "Análise de jogadores",
      "Melhores do Dia",
    ],
  },
  {
    name: "NBA Trimestral",
    price: "R$ 99,90",
    period: "/3 meses",
    description: "Melhor equilíbrio entre preço e tempo de uso.",
    highlight: true,
    bullets: [
      "Custo menor por mês",
      "Acesso completo ao painel NBA",
      "Mais tempo para consolidar rotina",
    ],
  },
  {
    name: "NBA Semestral",
    price: "R$ 189,90",
    period: "/6 meses",
    description: "Opção para quem quer o menor custo por mês.",
    highlight: false,
    bullets: [
      "Melhor custo total",
      "Acesso completo e contínuo",
      "Mais economia no longo prazo",
    ],
  },
];

const featureCards = [
  {
    icon: CalendarDays,
    title: "Pre-jogo organizado",
    description:
      "Agenda limpa para ver rápido o que merece atenção hoje.",
  },
  {
    icon: BarChart3,
    title: "Análise de jogadores",
    description:
      "Pontos, rebotes e assistências em leitura direta e objetiva.",
  },
  {
    icon: TrendingUp,
    title: "Melhores do Dia",
    description:
      "Uma tela para responder o que olhar primeiro no cardápio do dia.",
  },
];

const workflowSteps = [
  {
    number: "01",
    title: "Abra a agenda",
    description:
      "Veja os jogos do dia e corte o ruído.",
  },
  {
    number: "02",
    title: "Leia os jogadores",
    description:
      "Entenda o momento recente antes de entrar no mercado.",
  },
  {
    number: "03",
    title: "Decida com critério",
    description:
      "Use Melhores do Dia para fechar a leitura.",
  },
];

const faqItems = [
  {
    question: "O acesso é imediato?",
    answer: "Sim. Pagamento aprovado, acesso liberado.",
  },
  {
    question: "Quais métodos de pagamento estão disponíveis?",
    answer: "Checkout pelo Mercado Pago com Pix e cartão.",
  },
  {
    question: "O que eu encontro dentro da assinatura?",
    answer: "Pre-jogo, análise de jogadores e Melhores do Dia.",
  },
];

export default function Home() {
  const { data: session } = useSession();
  const primaryHref = session ? "/dashboard" : "/register";
  const secondaryHref = session ? "/dashboard/gold-list" : "/login";
  const primaryLabel = session ? "Abrir plataforma" : "Criar conta";
  const secondaryLabel = session ? "Ver Melhores do Dia" : "Entrar";

  return (
    <div className="min-h-screen bg-[#060709] text-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(circle_at_top,rgba(215,162,75,0.16),transparent_42%)]" />
        <div className="absolute right-[-12%] top-20 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(93,115,145,0.18),transparent_64%)] blur-3xl" />
        <div className="absolute left-[-10%] top-[28rem] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(18,43,71,0.28),transparent_62%)] blur-3xl" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.06]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/8 bg-black/45 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-white">
            <BrandLogo size="md" />
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-zinc-300 lg:flex">
            <a href="#produto" className="transition-colors hover:text-white">
              Produto
            </a>
            <a href="#como-funciona" className="transition-colors hover:text-white">
              Como funciona
            </a>
            <a href="#planos" className="transition-colors hover:text-white">
              Planos
            </a>
            <a href="#faq" className="transition-colors hover:text-white">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:border-white/20 hover:text-white sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              href={primaryHref}
              className="inline-flex items-center rounded-full bg-[#D7A24B] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#e3b25f]"
            >
              {primaryLabel}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pb-24 lg:pt-24">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_460px] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#D7A24B]/20 bg-[#D7A24B]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#E7C17A]">
                <LineChart className="h-3.5 w-3.5" />
                Plataforma NBA de pre-jogo
              </div>

              <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl lg:text-7xl">
                Saia do achismo na NBA.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
                Aposte com números, estatísticas e contexto. Veja rápido o que
                olhar hoje antes de entrar no mercado.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  href={primaryHref}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D7A24B] px-6 py-3.5 text-base font-semibold text-black transition hover:bg-[#e3b25f]"
                >
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={secondaryHref}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3.5 text-base font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
                >
                  {secondaryLabel}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                    Foco
                  </p>
                  <p className="mt-3 text-lg font-semibold text-white">
                    Pre-jogo diário
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                    Método
                  </p>
                  <p className="mt-3 text-lg font-semibold text-white">
                    Jogadores e contexto
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                    Checkout
                  </p>
                  <p className="mt-3 text-lg font-semibold text-white">
                    Pix e cartão no checkout
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-[2rem] bg-[linear-gradient(135deg,rgba(215,162,75,0.22),rgba(22,29,38,0.1),rgba(93,115,145,0.18))] blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(16,18,22,0.96),rgba(7,8,10,0.96))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                <div className="flex items-center justify-between border-b border-white/8 pb-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                      Painel de hoje
                    </p>
                    <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
                      O que olhar hoje sem perder tempo
                    </p>
                  </div>
                  <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                    Ao vivo
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                    <div className="max-w-lg">
                      <p className="text-xl font-bold text-white sm:text-2xl">
                        Melhores oportunidades do dia PTS / REB / AST
                      </p>
                    </div>
                    <div className="mt-4 grid gap-3">
                      <div className="rounded-xl border border-white/6 bg-black/30 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              Luka Doncic
                            </p>
                            <p className="mt-1 text-sm text-zinc-400">
                              Pontos com forte contexto no dia
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                              Score de probabilidade
                            </p>
                            <p className="mt-1 text-2xl font-black text-[#E7C17A]">
                              86,5
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/6 bg-black/30 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              Jalen Johnson
                            </p>
                            <p className="mt-1 text-sm text-zinc-400">
                              Assist?ncias com forte contexto no dia
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                              Score de probabilidade
                            </p>
                            <p className="mt-1 text-2xl font-black text-emerald-300">
                              86,3
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                      <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                        Análise de jogadores
                      </p>
                      <p className="mt-3 text-lg font-semibold text-white">
                        Pontos, rebotes e assistências em uma tela s?.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                      <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                        Agenda organizada
                      </p>
                      <p className="mt-3 text-lg font-semibold text-white">
                        Hoje e amanhã organizados no painel.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="produto" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#E7C17A]">
              O que existe dentro
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
              Clareza para decidir melhor.
            </h2>
            <p className="mt-4 text-lg leading-8 text-zinc-400">
              Menos ruído. Mais critério. Mais velocidade para ler o dia.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {featureCards.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="group rounded-[1.75rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-7 transition hover:border-white/14 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))]"
                >
                  <div className="inline-flex rounded-2xl border border-[#D7A24B]/15 bg-[#D7A24B]/10 p-3 text-[#E7C17A]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-6 text-2xl font-bold tracking-[-0.03em] text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-base leading-7 text-zinc-400">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section
          id="como-funciona"
          className="border-y border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]"
        >
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-16">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#E7C17A]">
                  Como usar
                </p>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
                  Abra. Leia. Decida.
                </h2>
                <p className="mt-4 text-lg leading-8 text-zinc-400">
                  O fluxo foi desenhado para ser simples e rápido.
                </p>
              </div>

              <div className="grid gap-5">
                {workflowSteps.map((step) => (
                  <div
                    key={step.number}
                    className="grid gap-5 rounded-[1.75rem] border border-white/8 bg-black/30 p-6 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-start"
                  >
                    <div className="text-4xl font-black tracking-[-0.08em] text-[#E7C17A]">
                      {step.number}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold tracking-[-0.03em] text-white">
                        {step.title}
                      </h3>
                      <p className="mt-3 text-base leading-7 text-zinc-400">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="planos" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#E7C17A]">
              Planos
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
              Entre na plataforma hoje.
            </h2>
            <p className="mt-4 text-lg leading-8 text-zinc-400">
              Pix e cartão no Mercado Pago. Acesso liberado após a aprovação.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {publicPlans.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-[1.9rem] border p-7 ${
                  plan.highlight
                    ? "border-[#D7A24B]/40 bg-[linear-gradient(180deg,rgba(215,162,75,0.12),rgba(255,255,255,0.03))]"
                    : "border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold tracking-[-0.03em] text-white">
                      {plan.name}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-zinc-400">
                      {plan.description}
                    </p>
                  </div>
                  {plan.highlight && (
                    <div className="rounded-full border border-[#D7A24B]/25 bg-[#D7A24B]/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#E7C17A]">
                      Mais indicado
                    </div>
                  )}
                </div>

                <div className="mt-8 flex items-end gap-2">
                  <span className="text-5xl font-black tracking-[-0.06em] text-white">
                    {plan.price}
                  </span>
                  <span className="pb-1 text-sm uppercase tracking-[0.2em] text-zinc-500">
                    {plan.period}
                  </span>
                </div>

                <div className="mt-8 space-y-3">
                  {plan.bullets.map((bullet) => (
                    <div key={bullet} className="flex items-start gap-3">
                      <div className="mt-0.5 inline-flex rounded-full bg-emerald-400/12 p-1 text-emerald-300">
                        <Check className="h-4 w-4" />
                      </div>
                      <p className="text-sm leading-6 text-zinc-300">{bullet}</p>
                    </div>
                  ))}
                </div>

                <Link
                  href={primaryHref}
                  className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-5 py-3 font-semibold transition ${
                    plan.highlight
                      ? "bg-[#D7A24B] text-black hover:bg-[#e3b25f]"
                      : "border border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  Entrar agora
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#E7C17A]">
                FAQ
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
                Dúvidas rápidas.
              </h2>
            </div>

            <div className="grid gap-4">
              {faqItems.map((item) => (
                <article
                  key={item.question}
                  className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-300">
                      <CircleHelp className="h-4 w-4" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">
                      {item.question}
                    </h3>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-zinc-400">
                    {item.answer}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/8 bg-[linear-gradient(180deg,rgba(215,162,75,0.08),rgba(255,255,255,0.01))]">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-8 rounded-[2rem] border border-white/10 bg-black/35 p-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
              <div>
                <h2 className="text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
                  Não aposte no escuro.
                </h2>
                <div className="mt-6 grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-emerald-300" />
                    Checkout seguro
                  </div>
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4 text-[#E7C17A]" />
                    Pix e cartão
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-zinc-300" />
                    Acesso imediato
                  </div>
                  <div className="flex items-center gap-3">
                    <Lock className="h-4 w-4 text-zinc-300" />
                    Área exclusiva para assinantes
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href={primaryHref}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D7A24B] px-6 py-3.5 text-base font-semibold text-black transition hover:bg-[#e3b25f]"
                >
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3.5 text-base font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
                >
                  J? tenho conta
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
