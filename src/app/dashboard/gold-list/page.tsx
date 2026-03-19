import Link from "next/link";
import GoldListTool from "@/components/GoldListTool";
import { isGoldListEnabled } from "@/lib/feature-flags";
import BrandLogo from "@/components/brand/BrandLogo";

export default function GoldListPage() {
  if (!isGoldListEnabled()) {
    return (
      <div className="min-h-screen bg-black px-4 py-16 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            Beta Fechado
          </p>
          <h1 className="mt-3 text-3xl font-black">Melhores do Dia indisponivel</h1>
          <p className="mt-3 text-zinc-400">
            Esta ferramenta foi desabilitada temporariamente para o teste externo.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-full border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-white">
              <BrandLogo size="sm" showMark={false} />
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
              Melhores do Dia
            </h1>
          </div>
          <Link
            href="/dashboard?tool=gold-list"
            className="inline-flex rounded-full border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500"
          >
            Abrir no dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <GoldListTool />
      </main>
    </div>
  );
}
