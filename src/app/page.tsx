"use client"; // Adiciona esta diretiva para indicar que é um Componente de Cliente

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();

  return (
    <>
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-white">
            BETDATA
          </Link>
          <div className="flex items-center gap-4">
            {session ? (
              <Link
                href="/dashboard"
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Acessar Plataforma
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-zinc-300 hover:text-white transition-colors"
                >
                  Entrar
                </Link>
                <Link
                  href="/register"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Teste Grátis
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Seção Herói */}
      <div
        className="relative h-[80vh] flex items-center justify-center text-center overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 119, 198, 0.3), transparent), radial-gradient(ellipse 80% 50% at 50% 120%, rgba(90, 119, 198, 0.15), transparent), #020209",
          clipPath: "polygon(0 0, 100% 0, 100% 90%, 0 100%)",
        }}
      >
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-repeat [mask-image:linear-gradient(to_bottom,white_20%,transparent_100%)]"></div>

        <div className="relative z-10 p-8">
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-4">
            Eleve seu Jogo no Basquete.
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            A BETDATA transforma dados da NBA em vantagem competitiva.
            Antecipe resultados, estude times e domine o pr?-jogo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-300 w-full sm:w-auto"
            >
              TESTE GRÁTIS
            </Link>
            <Link
              href="/login"
              className="bg-transparent border border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700 font-bold py-3 px-8 rounded-lg text-lg transition duration-300 w-full sm:w-auto"
            >
              JÁ É CLIENTE? FAÇA LOGIN
            </Link>
          </div>
        </div>
      </div>

      {/* Seção de Vantagens */}
      <main className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 text-center">
          {/* Card 1 */}
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden p-8 flex flex-col items-center justify-center">
            <Image
              src="/images/feature-1.jpg"
              alt="Análise de partida"
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
              className="object-cover opacity-20"
            />
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-orange-400 mb-2">
                Análise Precisa
              </h3>
              <p className="text-gray-300">
                Estat?sticas detalhadas de times, forma recente e desempenho em
                casa/fora para decis?es informadas.
              </p>
            </div>
          </div>
          {/* Card 2 */}
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden p-8 flex flex-col items-center justify-center">
            <Image
              src="/images/feature-2.jpg"
              alt="Dados competitivos"
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
              className="object-cover opacity-20"
            />
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-orange-400 mb-2">
                Dados Atualizados
              </h3>
              <p className="text-gray-300">
                Informa??es das ?ltimas partidas da temporada, com contexto
                r?pido para o pr?ximo jogo.
              </p>
            </div>
          </div>
          {/* Card 3 */}
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden p-8 flex flex-col items-center justify-center">
            <Image
              src="/images/feature-3.jpg"
              alt="Estratégia de aposta"
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
              className="object-cover opacity-20"
            />
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-orange-400 mb-2">
                Vantagem Competitiva
              </h3>
              <p className="text-gray-300">
                Use nossos insights para entender tend?ncias e tomar decis?es
                com mais segurança.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

