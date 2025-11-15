"use client";

import { useState } from "react";

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

function toDataUrl(base64: string): string {
  return `data:image/png;base64,${base64}`;
}

export function PaymentSelector({ chargeId, session, primary }: { chargeId: string; session: SessionResponse; primary?: string }) {
  const [state, setState] = useState<SessionResponse>(session);
  const [loading, setLoading] = useState(false);

  async function issue(method: "PIX" | "BOLETO") {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/checkout/charges/${chargeId}/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ method }),
      });
      const data = await res.json();
      const next: SessionResponse = {
        ...state,
        pix: data.pix,
        boleto: data.boleto,
      };
      setState(next);
    } finally {
      setLoading(false);
    }
  }

  if (state.pix || state.boleto) {
    return (
      <div className="space-y-4">
        {state.pix && (
          <div className="space-y-3">
            <div className="text-sm opacity-80">Escaneie o QR Code Pix ou use copia e cola</div>
            <img src={toDataUrl(state.pix.qrCode)} alt="QR Pix" className="w-full rounded" />
            <div className="p-2 rounded bg-black/30 text-xs break-all">{state.pix.copyPaste}</div>
          </div>
        )}
        {state.boleto && (
          <div className="space-y-3">
            <a
              href={state.boleto.boletoUrl}
              className={"inline-block px-4 py-2 rounded bg-primary text-primary-foreground"}
              style={primary ? { background: primary } : undefined}
            >
              Ver boleto
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        className="w-full px-4 py-3 rounded bg-primary text-primary-foreground"
        style={primary ? { background: primary } : undefined}
        onClick={() => issue("PIX")}
        disabled={loading}
      >
        Pagar com Pix
      </button>
      <button
        className="w-full px-4 py-3 rounded border border-border text-foreground"
        style={primary ? { borderColor: primary } : undefined}
        onClick={() => issue("BOLETO")}
        disabled={loading}
      >
        Gerar Boleto
      </button>
    </div>
  );
}
