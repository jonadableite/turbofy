"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { PaymentSelector } from "@/components/checkout/PaymentSelector";

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
  }, []);

  const hasTokens = Object.keys(tokens).length > 0;
  const primary = (tokens["primary"] as string) || undefined;
  const bg = (tokens["background"] as string) || undefined;
  const text = (tokens["text"] as string) || undefined;
  const radius = Number((tokens["radius"] as number) || 16);

  const containerStyle = useMemo(() => (hasTokens && (bg || text) ? ({ background: bg, color: text }) as React.CSSProperties : undefined), [bg, text, hasTokens]);
  const cardStyle = useMemo(() => (hasTokens ? ({ borderRadius: radius, borderColor: primary }) as React.CSSProperties : ({ borderRadius: radius }) as React.CSSProperties), [radius, primary, hasTokens]);

  return (
    <div className={cn("min-h-screen", !hasTokens && "bg-background text-foreground")} style={containerStyle}>
      <div className="mx-auto max-w-md px-4 py-8">
        <div className="flex items-center justify-center mb-6">
          {session.theme?.logoUrl ? (
            <Image src={session.theme.logoUrl} alt="Logo" width={120} height={40} />
          ) : (
            <div className="text-xl font-semibold">Checkout</div>
          )}
        </div>
        <div
          className={cn("p-6 shadow-xl", "border", !hasTokens && "glass", "transition-colors")}
          style={cardStyle}
        >
          <div className="mb-4">
            <div className="text-2xl font-bold">{formatBRL(session.amountCents)}</div>
            {session.description && <div className="mt-1 opacity-80">{session.description}</div>}
          </div>
          <PaymentSelector chargeId={session.chargeId} session={session} primary={primary}
          />
        </div>
        <div className="mt-6 text-center opacity-60 text-sm">Powered by Turbofy</div>
      </div>
    </div>
  );
}
