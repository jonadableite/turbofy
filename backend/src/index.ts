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
import { dashboardRouter } from "./infrastructure/http/routes/dashboardRoutes";
import { transfeeraWebhookRouter } from "./infrastructure/http/routes/transfeeraWebhookRoutes";
import { checkoutRouter } from "./infrastructure/http/routes/checkoutRoutes";
import { register } from "prom-client";

const app = express();

// Middlewares
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      const defaults = process.env.CORS_ORIGIN ?? "http://localhost:3001";
      const allowed = new Set([defaults, "http://localhost:3030"]);
      if (!origin || allowed.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Idempotency-Key",
      "X-Idempotency-Key",
      "X-CSRF-Token",
    ],
    credentials: true,
  })
);
app.use(express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));

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
      const rt = (res as any).responseTime;
      const time = rt ? `${rt}ms` : '';
      
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

// Basic rate limiting - mais permissivo em desenvolvimento
const isDevelopment = process.env.NODE_ENV === 'development';
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: isDevelopment ? 1000 : 100, // 1000 req/15min em dev, 100 em produção
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting para localhost em desenvolvimento
    skip: (req) => {
      if (isDevelopment) {
        const ip = req.ip || req.socket.remoteAddress || '';
        return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
      }
      return false;
    },
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
app.use('/checkout', checkoutRouter);
app.use('/settlements', settlementsRouter);
app.use('/reconciliations', reconciliationsRouter);
app.use('/dashboard', dashboardRouter);
app.use('/webhooks/transfeera', transfeeraWebhookRouter);
app.get('/metrics', async (_req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
});
// TODO: Register domain routers here (payments, merchants etc.)

// Swagger docs
try {
  setupSwagger(app);
  logger.info('[SWAGGER] Swagger configurado com sucesso');
} catch (err) {
  logger.error({ err }, '[SWAGGER] Erro ao configurar Swagger');
  console.error(chalk.red(`\n⚠️  Aviso: Erro ao configurar Swagger: ${err instanceof Error ? err.message : 'Erro desconhecido'}\n`));
  // Não interrompe o servidor se o Swagger falhar
}

const PORT = Number(env.PORT);
logger.info({ port: PORT }, '[SERVER] Iniciando servidor na porta');

if (process.env.NODE_ENV !== "test") {
  try {
    const server = app.listen(PORT, "0.0.0.0", () => {
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
      console.log(chalk.white('     • POST /checkout/sessions   - Criar sessão de checkout'));
      console.log(chalk.white('     • GET  /checkout/sessions/:id - Detalhes da sessão'));
      console.log(chalk.cyan('═'.repeat(60)));
      console.log(chalk.green.bold('  [READY] Servidor pronto para receber requisições!\n'));
      
      logger.info('[STARTED] Turbofy API iniciada com sucesso');
    });

    // Tratamento de erros do servidor
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`[ERROR] Porta ${PORT} já está em uso. Tente usar outra porta.`);
        console.error(chalk.red(`\n❌ Erro: Porta ${PORT} já está em uso!\n`));
        console.error(chalk.yellow('Soluções:'));
        console.error(chalk.white('  1. Pare o processo que está usando a porta 3000'));
        console.error(chalk.white('  2. Ou altere a variável PORT no arquivo .env\n'));
        process.exit(1);
      } else {
        logger.error({ err }, '[ERROR] Erro ao iniciar servidor');
        console.error(chalk.red(`\n❌ Erro ao iniciar servidor: ${err.message}\n`));
        process.exit(1);
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('[SHUTDOWN] Recebido SIGTERM, encerrando servidor...');
      server.close(() => {
        logger.info('[SHUTDOWN] Servidor encerrado');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('[SHUTDOWN] Recebido SIGINT, encerrando servidor...');
      server.close(() => {
        logger.info('[SHUTDOWN] Servidor encerrado');
        process.exit(0);
      });
    });
  } catch (err) {
    logger.error({ err }, '[ERROR] Erro fatal ao inicializar servidor');
    console.error(chalk.red(`\n❌ Erro fatal: ${err instanceof Error ? err.message : 'Erro desconhecido'}\n`));
    process.exit(1);
  }
}

export { app };
