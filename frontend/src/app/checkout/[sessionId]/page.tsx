import "../../globals.css";
import { Suspense } from "react";
import { CheckoutThemeContainer } from "@/components/checkout/CheckoutThemeContainer";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

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

async function getSession(sessionId: string): Promise<SessionResponse> {
  const res = await fetch(`${API_BASE_URL}/checkout/sessions/${sessionId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Sessão não encontrada");
  return res.json();
}

function formatBRL(amountCents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amountCents / 100);
}

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

function toDataUrl(base64: string): string {
  return `data:image/png;base64,${base64}`;
}

export default async function Page({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  return <CheckoutThemeContainer session={session} />;
}
