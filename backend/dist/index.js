"use strict";
// 🔐 SECURITY: Applies Helmet for secure HTTP headers, CORS with explicit origin, and basic rate limiting.
// 📈 SCALABILITY: Uses clustering via Node.js cluster (future), connection pooling via Prisma.
// 🛠️ MAINTAINABILITY: Modular middlewares and clear separation of concerns.
// 🧪 TESTABILITY: Server exported for integration testing, dependencies (prisma) injectable/mocked.
// 🔄 EXTENSIBILITY: Easy to add new routers and middlewares.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
/**
 * @security Validates env vars through env.ts, applies security middlewares, disables x-powered-by header
 * @performance Utilises Prisma singleton client to reuse db connections
 * @maintainability Express app separated from server listen for easier testing
 * @testability Exports `app` instance to Supertest
 */
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const pino_http_1 = __importDefault(require("pino-http"));
const logger_1 = require("./infrastructure/logger");
const chalk_1 = __importDefault(require("chalk"));
const authRoutes_1 = require("./infrastructure/http/routes/authRoutes");
const apiRoutes_1 = require("./infrastructure/http/routes/apiRoutes");
const env_1 = require("./config/env");
const prismaClient_1 = require("./infrastructure/database/prismaClient");
const swagger_1 = require("./infrastructure/http/swagger");
const chargesRoutes_1 = require("./infrastructure/http/routes/chargesRoutes");
const settlementsRoutes_1 = require("./infrastructure/http/routes/settlementsRoutes");
const reconciliationsRoutes_1 = require("./infrastructure/http/routes/reconciliationsRoutes");
const dashboardRoutes_1 = require("./infrastructure/http/routes/dashboardRoutes");
const transfeeraWebhookRoutes_1 = require("./infrastructure/http/routes/transfeeraWebhookRoutes");
const checkoutRoutes_1 = require("./infrastructure/http/routes/checkoutRoutes");
const prom_client_1 = require("prom-client");
const app = (0, express_1.default)();
exports.app = app;
// Middlewares
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
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
}));
app.use(express_1.default.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
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
app.use((0, pino_http_1.default)({
    logger: logger_1.logger,
    customLogLevel: (req, res, err) => {
        // Ignorar logs de 404 para requisições conhecidas
        if (res.statusCode === 404) {
            const url = req.url || '';
            if (url.includes('/ws/socket.io/') || url.includes('/_app/') || url.includes('/_next/')) {
                return 'silent'; // Não logar essas requisições
            }
        }
        if (res.statusCode >= 500 || err)
            return 'error';
        if (res.statusCode >= 400)
            return 'warn';
        if (res.statusCode >= 300)
            return 'info';
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
        const rt = res.responseTime;
        const time = rt ? `${rt}ms` : '';
        // Usar símbolos ASCII ao invés de emojis para evitar problemas de encoding
        let symbol = '[OK]';
        if (status >= 500)
            symbol = '[ERROR]';
        else if (status >= 400)
            symbol = '[WARN]';
        else if (status >= 300)
            symbol = '[REDIRECT]';
        return `${symbol} ${method} ${url} -> ${status} ${time}`;
    },
    customErrorMessage: (req, res, err) => {
        return `[ERROR] ${req.method} ${req.url} -> ${res.statusCode} ERROR: ${err.message}`;
    },
}));
app.disable("x-powered-by");
// Basic rate limiting - mais permissivo em desenvolvimento
const isDevelopment = process.env.NODE_ENV === 'development';
app.use((0, express_rate_limit_1.default)({
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
}));
// Health & readiness endpoints
app.get("/healthz", async (_, res) => {
    try {
        await prismaClient_1.prisma.$queryRaw `SELECT 1`;
        res.status(200).json({ status: "ok" });
    }
    catch (err) {
        res.status(500).json({ status: "db_error" });
    }
});
app.use('/api', apiRoutes_1.apiRouter);
app.use('/auth', authRoutes_1.authRouter);
app.use('/charges', chargesRoutes_1.chargesRouter);
app.use('/checkout', checkoutRoutes_1.checkoutRouter);
app.use('/settlements', settlementsRoutes_1.settlementsRouter);
app.use('/reconciliations', reconciliationsRoutes_1.reconciliationsRouter);
app.use('/dashboard', dashboardRoutes_1.dashboardRouter);
app.use('/webhooks/transfeera', transfeeraWebhookRoutes_1.transfeeraWebhookRouter);
app.get('/metrics', async (_req, res) => {
    res.setHeader('Content-Type', prom_client_1.register.contentType);
    res.end(await prom_client_1.register.metrics());
});
// TODO: Register domain routers here (payments, merchants etc.)
// Swagger docs
try {
    (0, swagger_1.setupSwagger)(app);
    logger_1.logger.info('[SWAGGER] Swagger configurado com sucesso');
}
catch (err) {
    logger_1.logger.error({ err }, '[SWAGGER] Erro ao configurar Swagger');
    console.error(chalk_1.default.red(`\n⚠️  Aviso: Erro ao configurar Swagger: ${err instanceof Error ? err.message : 'Erro desconhecido'}\n`));
    // Não interrompe o servidor se o Swagger falhar
}
const PORT = Number(env_1.env.PORT);
logger_1.logger.info({ port: PORT }, '[SERVER] Iniciando servidor na porta');
if (process.env.NODE_ENV !== "test") {
    try {
        const server = app.listen(PORT, "0.0.0.0", () => {
            // Banner de inicialização melhorado (usando símbolos ASCII para compatibilidade)
            console.log('\n' + chalk_1.default.cyan('═'.repeat(60)));
            console.log(chalk_1.default.bold.blue('  [TURBOFY GATEWAY - API BACKEND]'));
            console.log(chalk_1.default.cyan('═'.repeat(60)));
            console.log(chalk_1.default.green(`  [OK] Servidor:       http://localhost:${PORT}`));
            console.log(chalk_1.default.green(`  [OK] Documentação:   http://localhost:${PORT}/docs`));
            console.log(chalk_1.default.green(`  [OK] Health Check:   http://localhost:${PORT}/healthz`));
            console.log(chalk_1.default.cyan('═'.repeat(60)));
            console.log(chalk_1.default.yellow(`  [INFO] Ambiente:      ${env_1.env.NODE_ENV}`));
            console.log(chalk_1.default.yellow(`  [INFO] CORS Origin:   ${process.env.CORS_ORIGIN || '*'}`));
            console.log(chalk_1.default.cyan('═'.repeat(60)));
            console.log(chalk_1.default.magenta('  [ENDPOINTS] Disponíveis:'));
            console.log(chalk_1.default.white('     • POST /auth/register       - Criar conta'));
            console.log(chalk_1.default.white('     • POST /auth/login          - Fazer login'));
            console.log(chalk_1.default.white('     • POST /auth/forgot-password - Recuperar senha'));
            console.log(chalk_1.default.white('     • GET  /api/auth/csrf       - Token CSRF'));
            console.log(chalk_1.default.white('     • POST /charges             - Criar cobrança'));
            console.log(chalk_1.default.white('     • POST /checkout/sessions   - Criar sessão de checkout'));
            console.log(chalk_1.default.white('     • GET  /checkout/sessions/:id - Detalhes da sessão'));
            console.log(chalk_1.default.cyan('═'.repeat(60)));
            console.log(chalk_1.default.green.bold('  [READY] Servidor pronto para receber requisições!\n'));
            logger_1.logger.info('[STARTED] Turbofy API iniciada com sucesso');
        });
        // Tratamento de erros do servidor
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                logger_1.logger.error(`[ERROR] Porta ${PORT} já está em uso. Tente usar outra porta.`);
                console.error(chalk_1.default.red(`\n❌ Erro: Porta ${PORT} já está em uso!\n`));
                console.error(chalk_1.default.yellow('Soluções:'));
                console.error(chalk_1.default.white('  1. Pare o processo que está usando a porta 3000'));
                console.error(chalk_1.default.white('  2. Ou altere a variável PORT no arquivo .env\n'));
                process.exit(1);
            }
            else {
                logger_1.logger.error({ err }, '[ERROR] Erro ao iniciar servidor');
                console.error(chalk_1.default.red(`\n❌ Erro ao iniciar servidor: ${err.message}\n`));
                process.exit(1);
            }
        });
        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger_1.logger.info('[SHUTDOWN] Recebido SIGTERM, encerrando servidor...');
            server.close(() => {
                logger_1.logger.info('[SHUTDOWN] Servidor encerrado');
                process.exit(0);
            });
        });
        process.on('SIGINT', () => {
            logger_1.logger.info('[SHUTDOWN] Recebido SIGINT, encerrando servidor...');
            server.close(() => {
                logger_1.logger.info('[SHUTDOWN] Servidor encerrado');
                process.exit(0);
            });
        });
    }
    catch (err) {
        logger_1.logger.error({ err }, '[ERROR] Erro fatal ao inicializar servidor');
        console.error(chalk_1.default.red(`\n❌ Erro fatal: ${err instanceof Error ? err.message : 'Erro desconhecido'}\n`));
        process.exit(1);
    }
}
