"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, ArrowLeft } from "lucide-react";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormInput } from "@/components/auth/FormInput";
import { AceternityButton } from "@/components/auth/AceternityButton";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validation";
import { api, ApiException } from "@/lib/api";
import { useRecaptcha } from "@/hooks/useRecaptcha";

export default function ForgotPasswordPage() {
  const { executeRecaptcha, isReady } = useRecaptcha();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      setIsSubmitting(true);
      setError("");
      setSuccess(false);

      // Execute reCAPTCHA
      const recaptchaToken = await executeRecaptcha("forgot_password");

      // Chamada à API
      // Nota: Este endpoint ainda não existe no backend
      // Quando implementado, deve enviar um email com link de reset
      await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          recaptchaToken,
        }),
      });

      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiException) {
        // Para segurança, não revelar se o email existe ou não
        // Mostrar mensagem genérica de sucesso mesmo se falhar
        setSuccess(true);
      } else {
        setError("Erro ao processar solicitação. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <AuthLayout
        title="Email enviado"
        subtitle="Verifique sua caixa de entrada"
      >
        <div className="text-center space-y-6">
          <motion.div
            className="flex justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <CheckCircle2 className="w-16 h-16 text-primary" />
          </motion.div>

          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-foreground">
              Se o email informado estiver cadastrado, você receberá um link
              para redefinir sua senha.
            </p>
            <p className="text-sm text-muted-foreground">
              Não se esqueça de verificar sua caixa de spam.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/50 rounded"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para login
            </Link>
          </motion.div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle="Digite seu email para receber instruções"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Error message */}
        {error && (
          <motion.div
            className="p-3 rounded-md bg-destructive/10 border border-destructive/20"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-sm text-destructive">{error}</p>
          </motion.div>
        )}

        {/* Info message */}
        <motion.div
          className="p-3 rounded-md bg-primary/10 border border-primary/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-sm text-foreground">
            Informe o email cadastrado e enviaremos um link para redefinir sua
            senha.
          </p>
        </motion.div>

        {/* Email */}
        <FormInput
          {...register("email")}
          label="Email"
          type="email"
          placeholder="seu@email.com"
          autoComplete="email"
          error={errors.email?.message}
        />

        {/* Submit button - Estilo Aceternity */}
        <AceternityButton
          type="submit"
          disabled={!isValid || isSubmitting || !isReady}
          className="flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enviando...
            </>
          ) : (
            "Enviar link de recuperação →"
          )}
        </AceternityButton>

        {/* Back to login */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para login
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

