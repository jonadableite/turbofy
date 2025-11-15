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

import { CheckoutThemeContainer } from "@/components/checkout/CheckoutThemeContainer";

export default async function Page({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  return <CheckoutThemeContainer session={session} />;
}
