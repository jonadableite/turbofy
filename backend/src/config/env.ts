// 🔐 SECURITY: Centralized, strict validation of environment variables prevents runtime with missing or malformed secrets
// 📈 SCALABILITY: Explicit env contract makes deployment across environments predictable
// 🛠️ MAINTAINABILITY: Single source of truth for configuration values
// 🧪 TESTABILITY: Schema can be reused in tests to mock envs safely
// 🔄 EXTENSIBILITY: Add new variables by extending the schema

/**
 * @security Ensures required secrets (e.g., DATABASE_URL, JWT_SECRET) exist and meet format constraints
 * @performance Fails fast at boot time, avoiding expensive debugging later
 * @maintainability Strongly typed config accessible across project
 * @testability Allows easy stubbing of `process.env` in unit tests
 */

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().regex(/^\d+$/).default("3000"),
  DATABASE_URL: z.string().url(),
  RABBITMQ_URI: z.string().nonempty(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  SMTP_HOST: z.string().nonempty(),
  SMTP_PORT: z.string().regex(/^\d+$/).transform(Number),
  SMTP_USERNAME: z.string().nonempty(),
  SMTP_PASSWORD: z.string().nonempty(),
  SMTP_SENDER_EMAIL: z.string().nonempty(),
  SMTP_AUTH_DISABLED: z.string().default('false').transform((v) => v === 'true'),
  RECAPTCHA_SECRET_KEY: z.string().optional(), // Opcional para desenvolvimento
  FRONTEND_URL: z.string().url().default("http://localhost:3001"), // URL do frontend para links de email
  ALERT_EMAIL_TO: z.string().optional(),
  TURBOFY_CREDENTIALS_ENC_KEY: z.string().min(32, "TURBOFY_CREDENTIALS_ENC_KEY must be at least 32 characters").default("x".repeat(32)),
  
  // Transfeera API Configuration
  TRANSFEERA_CLIENT_ID: z.string().optional(), // Opcional - usado apenas se Transfeera estiver habilitado
  TRANSFEERA_CLIENT_SECRET: z.string().optional(), // Opcional - usado apenas se Transfeera estiver habilitado
  TRANSFEERA_API_URL: z.string().url().default("https://api-sandbox.transfeera.com"), // URL da API Transfeera
  TRANSFEERA_LOGIN_URL: z.string().url().default("https://login-api-sandbox.transfeera.com"), // URL de autenticação Transfeera
  TRANSFEERA_ENABLED: z.string().default("false").transform((v) => v === "true"), // Habilitar/desabilitar Transfeera
  TRANSFEERA_PIX_KEY: z.string().optional(), // Chave Pix registrada na Transfeera para recebimentos
  TRANSFEERA_WEBHOOK_SECRET: z.string().min(32, "TRANSFEERA_WEBHOOK_SECRET must be at least 32 characters").optional(), // Secret para validar assinatura de webhooks
});

const parsed = envSchema.safeParse(process.env);

function testDefaults(): z.infer<typeof envSchema> {
  return {
    NODE_ENV: "test",
    PORT: "3000",
    DATABASE_URL: process.env.DATABASE_URL || "postgresql://localhost:5432/test",
    RABBITMQ_URI: process.env.RABBITMQ_URI || "amqp://localhost",
    JWT_SECRET: process.env.JWT_SECRET || "j".repeat(32),
    SMTP_HOST: process.env.SMTP_HOST || "localhost",
    SMTP_PORT: Number(process.env.SMTP_PORT || "25") as any,
    SMTP_USERNAME: process.env.SMTP_USERNAME || "user",
    SMTP_PASSWORD: process.env.SMTP_PASSWORD || "pass",
    SMTP_SENDER_EMAIL: process.env.SMTP_SENDER_EMAIL || "test@example.com",
    SMTP_AUTH_DISABLED: true,
    RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY,
    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3001",
    ALERT_EMAIL_TO: process.env.ALERT_EMAIL_TO,
    TURBOFY_CREDENTIALS_ENC_KEY: process.env.TURBOFY_CREDENTIALS_ENC_KEY || "x".repeat(32),
    TRANSFEERA_CLIENT_ID: process.env.TRANSFEERA_CLIENT_ID,
    TRANSFEERA_CLIENT_SECRET: process.env.TRANSFEERA_CLIENT_SECRET,
    TRANSFEERA_API_URL: process.env.TRANSFEERA_API_URL || "https://api-sandbox.transfeera.com",
    TRANSFEERA_LOGIN_URL: process.env.TRANSFEERA_LOGIN_URL || "https://login-api-sandbox.transfeera.com",
    TRANSFEERA_ENABLED: false,
    TRANSFEERA_PIX_KEY: process.env.TRANSFEERA_PIX_KEY,
    TRANSFEERA_WEBHOOK_SECRET: process.env.TRANSFEERA_WEBHOOK_SECRET,
  };
}

export const env = parsed.success ? parsed.data : (process.env.NODE_ENV === "test" ? testDefaults() : (() => { console.error("❌ Invalid environment variables: ", parsed.error.format()); process.exit(1); })());
