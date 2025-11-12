"use client";

import { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";
import Link from "next/link";
import { ArrowLeft, LifeBuoy, Zap } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen flex overflow-hidden bg-background">
      {/* Left Half - Welcome Section - Hidden on mobile, visible on lg+ */}
      <div className="hidden lg:flex lg:flex-1 relative min-h-screen bg-linear-to-br from-primary/5 via-background to-background">
        {/* Grid pattern */}
        <div className="absolute inset-0 z-0 w-full h-full bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-size-[2rem_2rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)]" />

        {/* Spotlight effect */}
        <div className="absolute top-0 left-0 w-full h-full bg-linear-to-br from-primary/10 via-transparent to-transparent" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-8 lg:px-12 xl:px-16 py-12">
          <div className="max-w-lg space-y-8">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <Zap className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Turbofy
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gateway de Pagamentos
                </p>
              </div>
            </div>

            {/* Main Title */}
            <div className="space-y-4">
              <h2 className="text-4xl xl:text-5xl font-bold leading-tight text-foreground">
                Transforme seus
                <span className="block text-primary">
                  pagamentos
                </span>
                em oportunidades
              </h2>

              <p className="text-lg text-muted-foreground leading-relaxed">
                Gateway completo com Pix, boleto, split de pagamentos e
                conciliação automática
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid gap-4">
              {[
                {
                  title: "Pix e Boleto",
                  description: "Receba pagamentos instantâneos",
                },
                {
                  title: "Split de Pagamentos",
                  description: "Divida valores automaticamente",
                },
                {
                  title: "Conciliação Automática",
                  description: "Reconcilie transações em tempo real",
                },
                {
                  title: "Dashboard Completo",
                  description: "Acompanhe todas suas transações",
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-4 rounded-lg bg-card backdrop-blur-sm border border-border hover:border-primary/50 hover:bg-card/80 transition-all duration-300 group shadow-lg"
                >
                  <div className="shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-primary rounded-full group-hover:scale-125 transition-transform duration-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {feature.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-border">
              <div>
                <div className="text-2xl font-bold text-foreground">99.9%</div>
                <div className="text-xs text-muted-foreground">Uptime</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">24/7</div>
                <div className="text-xs text-muted-foreground">Suporte</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">5.0⭐</div>
                <div className="text-xs text-muted-foreground">Avaliação</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Half - Form */}
      <div className="w-full lg:flex-1 relative min-h-screen">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-linear-to-bl from-primary/5 via-background to-background" />

        <div className="relative z-10 w-full h-full flex flex-col">
          {/* Header */}
          <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
              Voltar
            </Link>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Link
                href="/suporte"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 group"
              >
                <LifeBuoy className="h-4 w-4 group-hover:rotate-12 transition-transform duration-200" />
                Suporte
              </Link>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
            <div className="mx-auto w-full max-w-md rounded-none bg-card backdrop-blur-md p-4 md:rounded-2xl md:p-8 border border-border shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-primary">
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>

              {children}
            </div>
          </main>

          {/* Footer */}
          <footer className="text-center text-xs text-muted-foreground px-4 sm:px-6 lg:px-8 py-4">
            <div className="space-y-1">
              <p>© {new Date().getFullYear()} Turbofy. Todos os direitos reservados.</p>
              <div className="flex items-center justify-center space-x-4">
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  Termos
                </Link>
                <span className="text-muted-foreground/50">•</span>
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  Privacidade
                </Link>
                <span className="text-muted-foreground/50">•</span>
                <Link href="/contact" className="hover:text-foreground transition-colors">
                  Contato
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

