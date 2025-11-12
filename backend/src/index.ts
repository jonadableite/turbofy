// 🔐 SECURITY: Applies Helmet for secure HTTP headers, CORS with explicit origin, and basic rate limiting.
// 📈 SCALABILITY: Uses clustering via Node.js cluster (future), connection pooling via Prisma.
// 🛠️ MAINTAINABILITY: Modular middlewares and clear separation of concerns.
// 🧪 TESTABILITY: Server exported for integration testing, dependencies (prisma) injectable/mocked.
// 🔄 EXTENSIBILITY: Easy to add new routers and middlewares.

/**
 * @security Validates env vars through env.ts, applies security middlewares, disables x-powered-by header
 * @performance Utilises Prisma singleton client to reuse db connections
 * @maintainability Express app separated from server listen for easier testing
 * @testability Exports `app` instance to Supertest
 */

import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { logger } from "./infrastructure/logger";
import chalk from "chalk";
import { authRouter } from "./infrastructure/http/routes/authRoutes";
import { apiRouter } from "./infrastructure/http/routes/apiRoutes";
import { env } from "./config/env";
import { prisma } from "./infrastructure/database/prismaClient";
import { setupSwagger } from "./infrastructure/http/swagger";
import { chargesRouter } from "./infrastructure/http/routes/chargesRoutes";
import { settlementsRouter } from "./infrastructure/http/routes/settlementsRoutes";
import { reconciliationsRouter } from "./infrastructure/http/routes/reconciliationsRoutes";

const app = express();

// Middlewares
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*", // TODO: restrict in production
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "X-Idempotency-Key", "X-CSRF-Token"],
    credentials: true, // Permitir cookies (necessário para HttpOnly cookies)
  })
);
app.use(express.json());

// Middleware para ignorar requisições conhecidas que retornam 404
app.use((req, res, next) => {
  // Ignorar requisições do Socket.IO (não implementado no backend)
  if (req.url?.includes('/ws/socket.io/')) {
    return res.status(404).end();
  }
  // Ignorar requisições do Next.js que chegam ao backend por engano
  if (req.url?.includes('/_app/') || req.url?.includes('/_next/')) {
    return res.status(404).end();
  }
  next();
});

// Custom HTTP logger com formatação melhorada
app.use(
  pinoHttp({
    logger,
    customLogLevel: (req, res, err) => {
      // Ignorar logs de 404 para requisições conhecidas
      if (res.statusCode === 404) {
        const url = req.url || '';
        if (url.includes('/ws/socket.io/') || url.includes('/_app/') || url.includes('/_next/')) {
          return 'silent'; // Não logar essas requisições
        }
      }
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      if (res.statusCode >= 300) return 'info';
      return 'info';
    },
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        // Mostrar apenas headers relevantes
        headers: {
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type'],
          'authorization': req.headers['authorization'] ? '***REDACTED***' : undefined,
        },
        remoteAddress: req.remoteAddress,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
    customSuccessMessage: (req, res) => {
      const method = req.method;
      const url = req.url;
      const status = res.statusCode;
      const time = res.responseTime ? `${res.responseTime}ms` : '';
      
      // Usar símbolos ASCII ao invés de emojis para evitar problemas de encoding
      let symbol = '[OK]';
      if (status >= 500) symbol = '[ERROR]';
      else if (status >= 400) symbol = '[WARN]';
      else if (status >= 300) symbol = '[REDIRECT]';
      
      return `${symbol} ${method} ${url} -> ${status} ${time}`;
    },
    customErrorMessage: (req, res, err) => {
      return `[ERROR] ${req.method} ${req.url} -> ${res.statusCode} ERROR: ${err.message}`;
    },
  })
);

app.disable("x-powered-by");

// Basic rate limiting ~ 100 req / 15 min per IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Health & readiness endpoints
app.get("/healthz", async (_, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok" });
  } catch (err) {
    res.status(500).json({ status: "db_error" });
  }
});

app.use('/api', apiRouter);
app.use('/auth', authRouter);
app.use('/charges', chargesRouter);
app.use('/settlements', settlementsRouter);
app.use('/reconciliations', reconciliationsRouter);
// TODO: Register domain routers here (payments, merchants etc.)

// Swagger docs
setupSwagger(app);

const PORT = Number(env.PORT);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    // Banner de inicialização melhorado (usando símbolos ASCII para compatibilidade)
    console.log('\n' + chalk.cyan('═'.repeat(60)));
    console.log(chalk.bold.blue('  [TURBOFY GATEWAY - API BACKEND]'));
    console.log(chalk.cyan('═'.repeat(60)));
    console.log(chalk.green(`  [OK] Servidor:       http://localhost:${PORT}`));
    console.log(chalk.green(`  [OK] Documentação:   http://localhost:${PORT}/docs`));
    console.log(chalk.green(`  [OK] Health Check:   http://localhost:${PORT}/healthz`));
    console.log(chalk.cyan('═'.repeat(60)));
    console.log(chalk.yellow(`  [INFO] Ambiente:      ${env.NODE_ENV}`));
    console.log(chalk.yellow(`  [INFO] CORS Origin:   ${process.env.CORS_ORIGIN || '*'}`));
    console.log(chalk.cyan('═'.repeat(60)));
    console.log(chalk.magenta('  [ENDPOINTS] Disponíveis:'));
    console.log(chalk.white('     • POST /auth/register       - Criar conta'));
    console.log(chalk.white('     • POST /auth/login          - Fazer login'));
    console.log(chalk.white('     • POST /auth/forgot-password - Recuperar senha'));
    console.log(chalk.white('     • GET  /api/auth/csrf       - Token CSRF'));
    console.log(chalk.white('     • POST /charges             - Criar cobrança'));
    console.log(chalk.cyan('═'.repeat(60)));
    console.log(chalk.green.bold('  [READY] Servidor pronto para receber requisições!\n'));
    
    logger.info('[STARTED] Turbofy API iniciada com sucesso');
  });
}

export { app };
