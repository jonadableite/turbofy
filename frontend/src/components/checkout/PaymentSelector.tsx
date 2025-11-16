"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Clipboard, Clock, Sparkles, CheckCircle2, Loader2, ChevronRight, QrCode, FileText, Shield } from "lucide-react";

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

const MotionButton = motion.button;

export function PaymentSelector({ chargeId, session, primary }: { chargeId: string; session: SessionResponse; primary?: string }) {
  const [state, setState] = useState<SessionResponse>(session);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const expiresAt = useMemo(() => {
    const date = state.pix?.expiresAt ? new Date(state.pix.expiresAt) : state.boleto?.expiresAt ? new Date(state.boleto.expiresAt) : undefined;
    return date;
  }, [state]);
  
  const [countdown, setCountdown] = useState<string | null>(null);
  const [percentRemaining, setPercentRemaining] = useState(100);

  useEffect(() => {
    if (!expiresAt) return;
    const totalTime = expiresAt.getTime() - Date.now();
    const tick = () => {
      const diff = expiresAt.getTime() - Date.now();
      if (diff <= 0) { 
        setCountdown("expirado"); 
        setPercentRemaining(0);
        return; 
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${m}m ${s}s`);
      setPercentRemaining((diff / totalTime) * 100);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  async function issue(method: "PIX" | "BOLETO") {
    setLoading(true);
    setProgress(0);
    
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 100);

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
      setProgress(100);
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 500);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(state.pix!.copyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silencioso
    }
  }

  if (state.pix || state.boleto) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="space-y-6"
        >
          {state.pix && (
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Header com badge de Pix */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.div
                    initial={{ rotate: -180, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-linear-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30"
                  >
                    <QrCode size={16} className="text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-500">Pix Gerado</span>
                  </motion.div>
                </div>
                {countdown && countdown !== "expirado" && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Clock size={16} className={percentRemaining < 20 ? "text-red-500" : "text-emerald-500"} />
                    <span className={percentRemaining < 20 ? "text-red-500 font-semibold" : "text-emerald-500"}>
                      {countdown}
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Progress bar de expiração */}
              {countdown && countdown !== "expirado" && (
                <div className="relative h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${percentRemaining < 20 ? "bg-red-500" : "bg-linear-to-r from-emerald-500 to-teal-500"}`}
                    initial={{ width: "100%" }}
                    animate={{ width: `${percentRemaining}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              )}

              {/* Instrução */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center"
              >
                <p className="text-sm font-medium mb-1">Escaneie o QR Code com seu app de pagamentos</p>
                <p className="text-xs opacity-70">Ou copie o código Pix Copia e Cola abaixo</p>
              </motion.div>

              {/* QR Code com efeito premium */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-linear-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
                <div className="relative bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-2xl border border-emerald-500/20">
                  <Image 
                    src={toDataUrl(state.pix.qrCode)} 
                    alt="QR Code Pix" 
                    className="w-full rounded-xl"
                    width={400}
                    height={400}
                  />
                  <div className="absolute top-4 right-4">
                    <div className="bg-emerald-500 text-white p-2 rounded-full shadow-lg">
                      <QrCode size={20} />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Código Pix Copia e Cola */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-2"
              >
                <label className="text-xs font-medium opacity-70">Código Pix Copia e Cola</label>
                <div className="relative group">
                  <div className="p-4 rounded-lg bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700 text-xs break-all font-mono leading-relaxed" aria-live="polite">
                    {state.pix.copyPaste}
                  </div>
                </div>
              </motion.div>

              {/* Botão de copiar premium */}
              <MotionButton
                type="button"
                onClick={handleCopy}
                disabled={copied}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full relative overflow-hidden group"
              >
                <div className={`absolute inset-0 bg-linear-to-r ${copied ? "from-emerald-500 to-teal-500" : "from-gray-900 to-gray-800 dark:from-gray-100 dark:to-gray-50"} transition-all duration-300`} />
                <div className="relative flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium">
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.div
                        key="copied"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="flex items-center gap-2 text-white"
                      >
                        <CheckCircle2 size={18} />
                        <span>Código Copiado!</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="copy"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`flex items-center gap-2 ${primary ? "text-white" : "text-white dark:text-gray-900"}`}
                      >
                        <Clipboard size={18} />
                        <span>Copiar Código Pix</span>
                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </MotionButton>

              {/* Trust indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex items-center justify-center gap-4 pt-2"
              >
                <div className="flex items-center gap-1.5 text-xs opacity-70">
                  <Shield size={14} />
                  <span>Pagamento seguro</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs opacity-70">
                  <Sparkles size={14} />
                  <span>Aprovação instantânea</span>
                </div>
              </motion.div>
            </motion.div>
          )}

          {state.boleto && (
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Header com badge de Boleto */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-linear-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30">
                  <FileText size={16} className="text-blue-500" />
                  <span className="text-sm font-medium text-blue-500">Boleto Gerado</span>
                </div>
                {countdown && countdown !== "expirado" && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock size={16} className="text-blue-500" />
                    <span className="text-blue-500">{countdown}</span>
                  </div>
                )}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <p className="text-sm font-medium mb-1">Seu boleto está pronto</p>
                <p className="text-xs opacity-70">Clique no botão abaixo para visualizar e imprimir</p>
              </motion.div>

              <MotionButton
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full relative overflow-hidden group"
                onClick={() => window.open(state.boleto!.boletoUrl, "_blank")}
              >
                <div 
                  className="absolute inset-0 bg-linear-to-r from-blue-500 to-indigo-500"
                  style={primary ? { background: `linear-gradient(to right, ${primary}, ${primary})` } : undefined}
                />
                <div className="relative flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white">
                  <FileText size={18} />
                  <span>Visualizar Boleto</span>
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </MotionButton>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-4 pt-2"
              >
                <div className="flex items-center gap-1.5 text-xs opacity-70">
                  <Shield size={14} />
                  <span>Pagamento seguro</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs opacity-70">
                  <FileText size={14} />
                  <span>Compensação em 1-2 dias úteis</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="text-sm font-medium mb-4">Selecione a forma de pagamento</div>
      
      {/* Botão Pix Premium */}
      <MotionButton
        className="w-full relative overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed"
        onClick={() => issue("PIX")}
        disabled={loading}
        whileHover={!loading ? { scale: 1.02 } : {}}
        whileTap={!loading ? { scale: 0.98 } : {}}
      >
        <div 
          className="absolute inset-0 bg-linear-to-r from-emerald-500 to-teal-500"
          style={primary ? { background: `linear-gradient(to right, ${primary}, ${primary})` } : undefined}
        />
        <div className="absolute inset-0 bg-linear-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
        <div className="relative flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold text-white">
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Gerando Pix...</span>
            </>
          ) : (
            <>
              <QrCode size={18} />
              <span>Pagar com Pix</span>
              <Sparkles size={16} className="ml-1" />
            </>
          )}
        </div>
      </MotionButton>

      {/* Divider com "OU" */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-3 text-gray-500 dark:text-gray-400">OU</span>
        </div>
      </div>

      {/* Botão Boleto Premium */}
      <MotionButton
        className="w-full relative overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed"
        onClick={() => issue("BOLETO")}
        disabled={loading}
        whileHover={!loading ? { scale: 1.02 } : {}}
        whileTap={!loading ? { scale: 0.98 } : {}}
      >
        <div className="absolute inset-0 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 group-hover:border-gray-400 dark:group-hover:border-gray-600 transition-colors" />
        <div className="relative flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold text-gray-900 dark:text-white">
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Gerando Boleto...</span>
            </>
          ) : (
            <>
              <FileText size={18} />
              <span>Gerar Boleto</span>
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </div>
      </MotionButton>

      {/* Progress bar durante loading */}
      {loading && progress > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden"
        >
          <motion.div
            className="h-full bg-linear-to-r from-emerald-500 to-teal-500"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      )}
    </motion.div>
  );
}
