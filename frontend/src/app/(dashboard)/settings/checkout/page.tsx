"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";

interface CheckoutConfigResponse {
  merchantId: string;
  logoUrl: string | null;
  themeTokens: Record<string, unknown> | null;
  animations: boolean;
  updatedAt: string;
}

const schema = z.object({
  merchantId: z.string().uuid(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  primary: z.string().optional(),
  background: z.string().optional(),
  text: z.string().optional(),
  radius: z.coerce.number().int().min(0).max(64).optional(),
  fontFamily: z.string().optional(),
  animations: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

export default function CheckoutBrandingPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const defaultMerchantId = process.env.NEXT_PUBLIC_DEV_MERCHANT_ID || "";
  const { user } = useAuth();
  const [inferredMerchantId, setInferredMerchantId] = useState<string | undefined>(user?.merchantId || defaultMerchantId || undefined);
  const [mode, setMode] = useState<"simples" | "avancado">("simples");

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      merchantId: inferredMerchantId,
      logoUrl: "",
      primary: "oklch(0.65 0.2 250)",
      background: "oklch(0.12 0.03 255)",
      text: "oklch(0.95 0.02 255)",
      radius: 16,
      fontFamily: "Inter, system-ui, sans-serif",
      animations: true,
    },
  });

  const previewStyle = useMemo(() => {
    const values = form.getValues();
    return {
      background: values.background,
      color: values.text,
      borderColor: values.primary,
      borderRadius: `${values.radius}px`,
      fontFamily: values.fontFamily,
    } as React.CSSProperties;
  }, [form]);

  const presets = [
    { name: "Azul", primary: "oklch(0.65 0.2 250)", background: "oklch(0.12 0.03 255)", text: "oklch(0.95 0.02 255)" },
    { name: "Verde", primary: "oklch(0.65 0.2 150)", background: "oklch(0.12 0.03 155)", text: "oklch(0.95 0.02 155)" },
    { name: "Roxo", primary: "oklch(0.65 0.2 320)", background: "oklch(0.12 0.03 325)", text: "oklch(0.95 0.02 325)" },
    { name: "Vermelho", primary: "oklch(0.65 0.2 30)", background: "oklch(0.12 0.03 35)", text: "oklch(0.95 0.02 35)" },
  ];

  const [hue, setHue] = useState<number>(250);
  useEffect(() => {
    if (mode !== "simples") return;
    const primary = `oklch(0.65 0.2 ${hue})`;
    form.setValue("primary", primary);
  }, [hue, mode]);

  async function load() {
    const merchantId = inferredMerchantId || form.getValues("merchantId");
    if (!merchantId) return;
    setLoading(true);
    try {
      const res = await api.get<CheckoutConfigResponse>("/checkout/config", { params: { merchantId } });
      const t = (res.data.themeTokens || {}) as Record<string, unknown>;
      form.reset({
        merchantId: res.data.merchantId,
        logoUrl: (res.data.logoUrl || undefined) as string | undefined,
        primary: (t["primary"] as string) || "oklch(0.65 0.2 250)",
        background: (t["background"] as string) || "oklch(0.12 0.03 255)",
        text: (t["text"] as string) || "oklch(0.95 0.02 255)",
        radius: (t["radius"] as number) || 16,
        fontFamily: (t["fontFamily"] as string) || "Inter, system-ui, sans-serif",
        animations: res.data.animations,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ensure = async () => {
      try {
        if (!inferredMerchantId && user) {
          const res = await api.post<{ merchantId: string }>("/dashboard/merchant/ensure");
          setInferredMerchantId(res.data.merchantId);
          form.setValue("merchantId", res.data.merchantId);
        }
      } catch {
        // ignore
      }
    };
    ensure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function onSubmit(values: FormData) {
    setSaving(true);
    try {
      await api.put("/checkout/config", {
        merchantId: values.merchantId,
        logoUrl: values.logoUrl || null,
        animations: values.animations,
        themeTokens: {
          primary: values.primary,
          background: values.background,
          text: values.text,
          radius: values.radius,
          fontFamily: values.fontFamily,
        },
      });
      // Aplicar no iframe imediatamente após salvar
      const msg = {
        type: "turbofy.theme.update",
        themeTokens: {
          primary: values.primary,
          background: values.background,
          text: values.text,
          radius: values.radius,
          fontFamily: values.fontFamily,
        },
      } as const;
      try {
        const frame = document.querySelector<HTMLIFrameElement>("iframe[src*='/checkout/']");
        frame?.contentWindow?.postMessage(msg, "*");
      } catch {}
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Configuração de Branding do Checkout</h1>
      <p className="text-sm opacity-70 mb-6">Defina logo, paleta OKLCH, tipografia e radius para personalizar seu checkout.</p>
      <div className="mb-4 flex gap-2">
        <button type="button" className={`px-3 py-2 border rounded ${mode === "simples" ? "bg-primary text-black" : ""}`} onClick={() => setMode("simples")}>Modo Simples</button>
        <button type="button" className={`px-3 py-2 border rounded ${mode === "avancado" ? "bg-primary text-black" : ""}`} onClick={() => setMode("avancado")}>Avançado</button>
      </div>

      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(!user?.merchantId) && (
            <div>
              <Label htmlFor="merchantId">Merchant ID</Label>
              <Input id="merchantId" {...form.register("merchantId")} placeholder="UUID do Merchant" />
            </div>
          )}
          <div>
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input id="logoUrl" {...form.register("logoUrl")} placeholder="https://.../logo.png" />
          </div>
          {mode === "simples" ? (
            <div className="md:col-span-2">
              <Label>Paleta</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {presets.map((p) => (
                  <button key={p.name} type="button" className="px-3 py-2 border rounded" onClick={() => {
                    form.setValue("primary", p.primary);
                    form.setValue("background", p.background);
                    form.setValue("text", p.text);
                  }}>{p.name}</button>
                ))}
              </div>
              <div className="mt-4">
                <Label>Cor Primária</Label>
                <input type="range" min={0} max={360} value={hue} onChange={(e) => setHue(Number(e.target.value))} className="w-full" />
              </div>
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="primary">Primary (OKLCH)</Label>
                <Input id="primary" {...form.register("primary")} placeholder="oklch(0.65 0.2 250)" />
              </div>
              <div>
                <Label htmlFor="background">Background (OKLCH)</Label>
                <Input id="background" {...form.register("background")} placeholder="oklch(0.12 0.03 255)" />
              </div>
              <div>
                <Label htmlFor="text">Text (OKLCH)</Label>
                <Input id="text" {...form.register("text")} placeholder="oklch(0.95 0.02 255)" />
              </div>
            </>
          )}
          <div>
            <Label htmlFor="radius">Radius (px)</Label>
            <Input id="radius" type="number" {...form.register("radius", { valueAsNumber: true })} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="fontFamily">Fonte</Label>
            <select id="fontFamily" {...form.register("fontFamily")} className="w-full border rounded px-3 py-2">
              <option value="Inter, system-ui, sans-serif">Inter</option>
              <option value="system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif">System UI</option>
              <option value="Roboto, system-ui, sans-serif">Roboto</option>
              <option value="Montserrat, system-ui, sans-serif">Montserrat</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={load} className="px-4 py-2 border rounded">Carregar</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded text-black" style={{ background: form.getValues("primary") }}>
            {saving ? "Salvando..." : "Salvar e Atualizar"}
          </button>
        </div>
      </form>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Preview</h2>
        <div className="p-6 border shadow" style={previewStyle}>
          <div className="text-xl font-bold mb-2">{form.getValues("logoUrl") ? "Sua Marca" : "Checkout"}</div>
          <div className="opacity-80 text-sm">Exemplo de cartão do checkout com suas cores e fonte.</div>
        </div>
        <LiveCheckoutPreview
          merchantId={form.watch("merchantId") || inferredMerchantId}
          theme={{
            primary: form.watch("primary") || "oklch(0.65 0.2 250)",
            background: form.watch("background") || "oklch(0.12 0.03 255)",
            text: form.watch("text") || "oklch(0.95 0.02 255)",
            radius: form.watch("radius") || 16,
            fontFamily: form.watch("fontFamily") || "Inter, system-ui, sans-serif",
          }}
        />
      </div>
    </div>
  );
}

function LiveCheckoutPreview({ merchantId, theme }: { merchantId?: string | null; theme: Record<string, unknown> }) {
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [iframeEl, setIframeEl] = useState<HTMLIFrameElement | null>(null);
  async function createSession() {
    setError(null);
    try {
      if (!merchantId) {
        setError("Informe o Merchant ID para criar a sessão de teste.");
        return;
      }
      const idem = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}`;
      const res = await api.post("/checkout/sessions", {
        merchantId,
        amountCents: 5500,
        currency: "BRL",
        description: "Teste de Checkout",
      }, { headers: { "X-Idempotency-Key": idem } });
      const data = res.data as { id: string; url: string };
      setSessionId(data.id);
      setSessionUrl(data.url);
    } catch (e: any) {
      setError(e?.message || "Falha ao criar sessão de checkout.");
    }
  }
  
  useEffect(() => {
    if (iframeEl && sessionUrl) {
      iframeEl.contentWindow?.postMessage({ type: "turbofy.theme.update", themeTokens: theme }, "*");
    }
  }, [iframeEl, sessionUrl, theme]);
  return (
    <div className="mt-6">
      <div className="flex gap-3 items-center">
        <button type="button" onClick={createSession} className="px-4 py-2 rounded bg-primary text-primary-foreground">Criar sessão de teste</button>
        {sessionUrl && <a href={sessionUrl} target="_blank" rel="noreferrer" className="underline">Abrir Hosted</a>}
        {sessionId && <a href={`/preview/checkout/${sessionId}`} target="_blank" rel="noreferrer" className="underline">Abrir com Sidebar</a>}
      </div>
      {error && <div className="mt-2 text-sm text-destructive">{error}</div>}
      {sessionUrl && (
        <div className="mt-4">
          <iframe src={sessionUrl} style={{ width: "100%", height: 600, border: 0 }} ref={(el) => setIframeEl(el)} />
        </div>
      )}
    </div>
  );
}
