"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { PaymentSelector } from "@/components/checkout/PaymentSelector";
import { ShieldCheck, Lock, BadgeCheck, CreditCard, Sparkles, CheckCircle2, Shield } from "lucide-react";

interface SessionResponse {
  id: string;
  chargeId: string;
  merchantId: string;
  status: "CREATED" | "OPENED" | "COMPLETED" | "EXPIRED";
  amountCents: number;
  currency: string;
  description: string | null;
  pix?: { qrCode: string; copyPaste: string; expiresAt: string };
  boleto?: { boletoUrl: string; expiresAt: string };
  theme?: { logoUrl?: string | null; themeTokens?: Record<string, unknown> | null; animations?: boolean } | null;
  expiresAt: string | null;
  createdAt: string;
}

function formatBRL(amountCents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amountCents / 100);
}

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function CheckoutThemeContainer({ session }: { session: SessionResponse }) {
  const initialTokens = (session.theme?.themeTokens || {}) as Record<string, unknown>;
  const [tokens, setTokens] = useState<Record<string, unknown>>(initialTokens);

  useEffect(() => {
    // Notificar que o checkout carregou
    try { window.parent?.postMessage({ type: "checkout.loaded", sessionId: session.id }, "*"); } catch {}

    const handler = (evt: MessageEvent) => {
      const data = evt.data as { type?: string; themeTokens?: Record<string, unknown> };
      if (data && data.type === "turbofy.theme.update" && data.themeTokens) {
        setTokens(data.themeTokens);
        try { window.parent?.postMessage({ type: "checkout.theme_updated", themeTokens: data.themeTokens }, "*"); } catch {}
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [session.id]);

  const hasTokens = Object.keys(tokens).length > 0;
  const primary = (tokens["primary"] as string) || undefined;
  const bg = (tokens["background"] as string) || undefined;
  const text = (tokens["text"] as string) || undefined;
  const radius = Number((tokens["radius"] as number) || 16);
  const brandName = (tokens["brandName"] as string) || "Sua Marca";

  const containerStyle = useMemo(() => (hasTokens && (bg || text) ? ({ background: bg, color: text }) as React.CSSProperties : undefined), [bg, text, hasTokens]);
  const cardStyle = useMemo(() => (hasTokens ? ({ borderRadius: radius, borderColor: primary }) as React.CSSProperties : ({ borderRadius: radius }) as React.CSSProperties), [radius, primary, hasTokens]);

  return (
    <div 
      className={cn("min-h-screen relative overflow-hidden", !hasTokens && "bg-linear-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-foreground")} 
      style={containerStyle}
    >
      {/* Background decorativo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 lg:py-12">
        {/* Header premium */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            {session.theme?.logoUrl ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Image src={session.theme.logoUrl} alt="Logo" width={140} height={48} className="h-12 w-auto" />
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-2xl font-bold bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"
              >
                Checkout Seguro
              </motion.div>
            )}
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm"
          >
            <Lock size={16} className="text-emerald-600" />
            <span className="font-medium text-emerald-600">Conexão Segura</span>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Sidebar: Resumo do produto */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-2"
          >
            <div 
              className="sticky top-8 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 bg-linear-to-br from-white/80 to-gray-50/80 dark:from-gray-900/80 dark:to-gray-950/80 backdrop-blur-xl shadow-2xl" 
              style={{ borderRadius: radius }}
            >
              <div className="space-y-6">
                {/* Produto */}
                <div>
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-linear-to-br from-emerald-500/20 to-teal-500/20 rounded-xl blur-lg" />
                      <div className="relative bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                        <Image src="/file.svg" alt="Produto" width={48} height={48} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold wrap-break-word mb-1">{session.description || "Produto"}</h3>
                      <p className="text-sm opacity-70">Pagamento único ou parcelado</p>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-gray-800" />

                {/* Valores */}
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-medium opacity-70 mb-2">Valor à vista</div>
                    <div className="text-3xl font-bold bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                      {formatBRL(session.amountCents)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium opacity-70 mb-2">Ou parcelado em até 12x de</div>
                    <div className="text-xl font-semibold" style={primary ? { color: text } : undefined}>
                      {formatBRL(Math.round(session.amountCents / 12))}
                    </div>
                    <p className="text-xs opacity-60 mt-1">sem juros no cartão</p>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-gray-800" />

                {/* Bandeiras aceitas */}
                <div>
                  <div className="text-xs font-medium opacity-70 mb-3">Bandeiras aceitas</div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                      <Image src="/visaico.svg" alt="Visa" width={36} height={24} />
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                      <Image src="/mastercardico.svg" alt="Mastercard" width={36} height={24} />
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                      <Image src="/outrasbandeiras.svg" alt="Outras" width={36} height={24} />
                    </div>
                  </div>
                </div>

                {/* Trust badges premium */}
                <div className="pt-4 space-y-2">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center gap-2 text-sm"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    </div>
                    <span className="opacity-80">Pagamento 100% seguro</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex items-center gap-2 text-sm"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10">
                      <Shield size={16} className="text-blue-600" />
                    </div>
                    <span className="opacity-80">Dados criptografados</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex items-center gap-2 text-sm"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/10">
                      <Sparkles size={16} className="text-purple-600" />
                    </div>
                    <span className="opacity-80">Aprovação instantânea</span>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main: Formulário de pagamento */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="lg:col-span-3"
          >
            <div
              className={cn("p-8 lg:p-10 shadow-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 backdrop-blur-xl", !hasTokens && "backdrop-blur-xl", "transition-colors")}
              style={cardStyle}
            >
              {/* Header do formulário */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-3xl font-bold">{formatBRL(session.amountCents)}</h2>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    {session.currency}
                  </span>
                </div>
                {session.description && (
                  <p className="text-base opacity-70">{session.description}</p>
                )}
              </div>

              {/* Tabs de método de pagamento */}
              <div className="mb-8">
                <div className="text-sm font-medium mb-4 opacity-70">Método de pagamento</div>
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative overflow-hidden inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors"
                    aria-label="Cartão de crédito"
                  >
                    <CreditCard size={20} className="text-emerald-600" />
                    <span className="font-medium">Cartão</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative overflow-hidden inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-emerald-500 bg-emerald-500/5 transition-colors"
                    aria-label="Pix"
                    style={primary ? { borderColor: primary } : undefined}
                  >
                    <Image src="/pix.svg" alt="Pix" width={20} height={20} />
                    <span className="font-medium text-emerald-600">Pix</span>
                  </motion.button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Formulário de dados */}
                <div className="lg:col-span-3 space-y-6">
                  <div>
                    <div className="text-sm font-medium mb-4 opacity-70">Dados do pagador</div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-medium opacity-70 mb-2 block">Nome completo</label>
                        <input
                          className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                          placeholder="Digite seu nome completo"
                          aria-label="Nome completo"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium opacity-70 mb-2 block">E-mail</label>
                        <input
                          className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                          placeholder="seu@email.com"
                          type="email"
                          aria-label="Email"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium opacity-70 mb-2 block">CPF/CNPJ</label>
                        <input
                          className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                          placeholder="000.000.000-00"
                          aria-label="CPF ou CNPJ"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Selector de pagamento */}
                  <div>
                    <PaymentSelector chargeId={session.chargeId} session={session} primary={primary} />
                  </div>
                </div>

                {/* Resumo lateral */}
                <div className="lg:col-span-2">
                  <div className="sticky top-8 space-y-4">
                    <div className="text-sm font-medium opacity-70 mb-4">Resumo do pedido</div>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-6 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="opacity-70">Subtotal</span>
                        <span className="font-medium">{formatBRL(session.amountCents)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="opacity-70">Taxas</span>
                        <span className="font-medium text-emerald-600">Incluídas</span>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Total</span>
                          <span className="text-xl font-bold bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            {formatBRL(session.amountCents)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer com badges de segurança */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-12"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/10">
                <ShieldCheck size={20} className="text-emerald-600" />
              </div>
              <div>
                <div className="text-xs font-medium">Criptografia</div>
                <div className="text-xs opacity-60">TLS 1.3</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10">
                <BadgeCheck size={20} className="text-blue-600" />
              </div>
              <div>
                <div className="text-xs font-medium">Privacidade</div>
                <div className="text-xs opacity-60">LGPD</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-500/10">
                <Shield size={20} className="text-purple-600" />
              </div>
              <div>
                <div className="text-xs font-medium">Proteção</div>
                <div className="text-xs opacity-60">Anti-fraude</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/10">
                <Lock size={20} className="text-orange-600" />
              </div>
              <div>
                <div className="text-xs font-medium">Segurança</div>
                <div className="text-xs opacity-60">PCI DSS</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center space-y-2">
            <p className="text-sm font-medium opacity-70">{brandName}</p>
            <p className="text-xs opacity-50">
              <button className="hover:opacity-80 transition-opacity">Termos de uso</button>
              {" • "}
              <button className="hover:opacity-80 transition-opacity">Política de privacidade</button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
