import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveSportAccess } from "@/lib/plans";

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage =
      req.nextUrl.pathname.startsWith("/login") ||
      req.nextUrl.pathname.startsWith("/register");
    const isProtectedPage =
      req.nextUrl.pathname.startsWith("/dashboard") ||
      req.nextUrl.pathname.startsWith("/analise");

    if (isProtectedPage && !isAuth) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (isAuthPage && isAuth) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Verificar assinatura ativa para rotas protegidas
    if (isProtectedPage && isAuth && token?.id) {
      try {
        const subscription = await prisma.subscription.findUnique({
          where: { userId: token.id as string },
        });

        if (!subscription) {
          // Usuário sem assinatura - redirecionar para upgrade
          return NextResponse.redirect(new URL("/upgrade", req.url));
        }

        const now = new Date();
        const isActive =
          subscription.status === "active" ||
          (subscription.status === "trialing" &&
            subscription.trialEndsAt &&
            subscription.trialEndsAt > now);

        const sportAccess = resolveSportAccess(
          subscription.planId,
          subscription.status
        );

        if (!isActive) {
          // Assinatura expirada - redirecionar para upgrade
          return NextResponse.redirect(new URL("/upgrade", req.url));
        }

        if (!sportAccess.hasNbaAccess) {
          return NextResponse.redirect(
            new URL("/upgrade?reason=nba_access", req.url)
          );
        }
      } catch (error) {
        console.error("Erro ao verificar assinatura:", error);
        // Em caso de erro, permitir acesso (fail-safe)
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/analise/:path*", "/login", "/register"],
};
