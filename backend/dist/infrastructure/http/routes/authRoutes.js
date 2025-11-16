"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const AuthService_1 = require("../../../application/services/AuthService");
const zod_1 = require("zod");
const crypto_1 = __importDefault(require("crypto"));
const prismaClient_1 = require("../../database/prismaClient");
const EmailService_1 = require("../../email/EmailService");
const logger_1 = require("../../logger");
const api_1 = require("@opentelemetry/api");
// reCAPTCHA removido
const csrf_1 = require("../../security/csrf");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const authRouter = (0, express_1.Router)();
exports.authRouter = authRouter;
const authService = new AuthService_1.AuthService();
const emailService = new EmailService_1.EmailService();
const tracer = api_1.trace.getTracer('turbofy-auth');
// Rate limiter: mais permissivo em desenvolvimento
const isDevelopment = process.env.NODE_ENV === 'development';
// rate limiter: 10 requests / 10 minutes per IP for auth endpoints
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000, // 10 minutos
    max: isDevelopment ? 100 : 10, // 100 req/10min em dev, 10 em produção
    message: 'Too many auth attempts, please try again later.',
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
});
// MFA: stricter request rate limiting - mais permissivo em desenvolvimento
const mfaLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000, // 10 minutos
    max: isDevelopment ? 50 : 5, // 50 req/10min em dev, 5 em produção
    message: 'Too many MFA requests, please try again later.',
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
});
const mfaRequestSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
const mfaVerifySchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    otp: zod_1.z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
});
// Rate limiter mais permissivo para /auth/me (usado frequentemente)
const meLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: isDevelopment ? 100 : 30, // 100 req/min em dev, 30 em produção
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        if (isDevelopment) {
            const ip = req.ip || req.socket.remoteAddress || '';
            return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
        }
        return false;
    },
});
// Brute-force helpers (duplicated from AuthService logic for route-level control)
async function checkLock(email, ip) {
    const now = new Date();
    const attempt = await prismaClient_1.prisma.authAttempt.findFirst({ where: { email, ip } });
    if (attempt?.lockedUntil && attempt.lockedUntil > now) {
        throw new Error('Too many attempts, temporarily locked');
    }
}
// GET /auth/me - Obter dados do usuário autenticado
authRouter.get('/me', meLimiter, authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } });
        }
        // Buscar dados completos do usuário
        const user = await prismaClient_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                roles: true,
                document: true,
                phone: true,
                merchantId: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user) {
            return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Usuário não encontrado' } });
        }
        res.json({
            id: user.id,
            email: user.email,
            roles: user.roles,
            name: user.email.split('@')[0],
            document: user.document,
            phone: user.phone,
            merchantId: user.merchantId,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        });
    }
    catch (err) {
        logger_1.logger.error({ err }, 'Erro ao buscar dados do usuário');
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno' } });
    }
});
// GET /api/auth/csrf - Gerar token CSRF
authRouter.get('/csrf', async (req, res) => {
    try {
        const csrfToken = (0, csrf_1.generateCsrfToken)();
        res.json({ csrfToken });
    }
    catch (err) {
        logger_1.logger.error({ err }, 'Erro ao gerar token CSRF');
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao gerar token CSRF' } });
    }
});
// POST /auth/register - Registrar novo usuário
authRouter.post('/register', authLimiter, async (req, res) => {
    const span = tracer.startSpan('auth.register');
    try {
        const inputData = req.body;
        // reCAPTCHA removido: não validar token
        const input = AuthService_1.registerSchema.parse(inputData);
        const tokens = await authService.register(input);
        // Configurar HttpOnly cookies
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('accessToken', tokens.accessToken, {
            httpOnly: true,
            secure: isProduction, // HTTPS only em produção
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000, // 15 minutos
            path: '/',
        });
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
            path: '/',
        });
        res.status(201).json({
            success: true,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: 15 * 60, // 15 minutos em segundos
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Dados inválidos',
                    details: err.issues,
                },
            });
        }
        logger_1.logger.error({ err }, 'Erro no registro');
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno' } });
    }
    finally {
        span.end();
    }
});
// POST /auth/login - Login do usuário
authRouter.post('/login', authLimiter, async (req, res) => {
    const span = tracer.startSpan('auth.login');
    try {
        const inputData = req.body;
        const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
        // reCAPTCHA removido: não validar token
        await checkLock(inputData.email, clientIp);
        const input = AuthService_1.loginSchema.parse(inputData);
        const tokens = await authService.login(input, clientIp);
        // Configurar HttpOnly cookies
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('accessToken', tokens.accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000, // 15 minutos
            path: '/',
        });
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
            path: '/',
        });
        res.json({
            success: true,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: 15 * 60, // 15 minutos em segundos
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Dados inválidos',
                    details: err.issues,
                },
            });
        }
        if (err.message === 'Too many attempts, temporarily locked') {
            return res.status(429).json({ error: { code: 'TOO_MANY_ATTEMPTS', message: 'Muitas tentativas. Tente novamente mais tarde.' } });
        }
        if (err.message === 'Invalid credentials') {
            return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas' } });
        }
        logger_1.logger.error({ err }, 'Erro no login');
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno' } });
    }
    finally {
        span.end();
    }
});
// POST /auth/logout - Logout do usuário (não exige autenticação obrigatória)
authRouter.post('/logout', async (req, res) => {
    try {
        // Tentar invalidar token se existir (opcional)
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '');
            // TODO: Invalidar token no servidor (adicionar à blacklist)
            logger_1.logger.info({ tokenLength: token.length }, 'Token invalidated on logout');
        }
        // Sempre limpar cookies (mesmo sem token válido)
        res.clearCookie('accessToken', { path: '/' });
        res.clearCookie('refreshToken', { path: '/' });
        res.json({ success: true });
    }
    catch (err) {
        logger_1.logger.error({ err }, 'Erro no logout');
        // Mesmo em caso de erro, limpar cookies
        res.clearCookie('accessToken', { path: '/' });
        res.clearCookie('refreshToken', { path: '/' });
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno' } });
    }
});
// POST /auth/refresh - Refresh token
authRouter.post('/refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ error: { code: 'REFRESH_TOKEN_MISSING', message: 'Refresh token não fornecido' } });
        }
        const tokens = await authService.refreshToken(refreshToken);
        // Configurar novos cookies
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('accessToken', tokens.accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000,
            path: '/',
        });
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/',
        });
        res.json({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: 15 * 60,
        });
    }
    catch (err) {
        logger_1.logger.error({ err }, 'Erro ao renovar token');
        res.status(401).json({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Token de renovação inválido' } });
    }
});
// POST /auth/mfa/request - Solicitar OTP por e-mail
authRouter.post('/mfa/request', mfaLimiter, async (req, res) => {
    const span = tracer.startSpan('auth.mfa.request');
    try {
        const input = mfaRequestSchema.parse(req.body);
        const otp = await authService.requestMfa(input.email);
        await emailService.sendOtpEmail(input.email, otp);
        res.json({ success: true });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Email inválido' } });
        }
        logger_1.logger.error({ err }, 'Erro ao solicitar MFA');
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno' } });
    }
    finally {
        span.end();
    }
});
// POST /auth/mfa/verify - Verificar OTP e obter tokens
authRouter.post('/mfa/verify', mfaLimiter, async (req, res) => {
    const span = tracer.startSpan('auth.mfa.verify');
    try {
        const input = mfaVerifySchema.parse(req.body);
        const tokens = await authService.verifyMfa(input.email, input.otp);
        // Configurar HttpOnly cookies
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('accessToken', tokens.accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000,
            path: '/',
        });
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/',
        });
        res.json({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: 15 * 60,
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos' } });
        }
        if (err.message.includes('Invalid') || err.message.includes('expired')) {
            return res.status(401).json({ error: { code: 'INVALID_OTP', message: 'OTP inválido ou expirado' } });
        }
        logger_1.logger.error({ err }, 'Erro ao verificar MFA');
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno' } });
    }
    finally {
        span.end();
    }
});
// POST /auth/forgot-password - Solicitar recuperação de senha
authRouter.post('/forgot-password', authLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        // Verificar se usuário existe (não revelar se existe ou não por segurança)
        const user = await prismaClient_1.prisma.user.findUnique({ where: { email } });
        if (user) {
            // Gerar token de recuperação
            const resetToken = crypto_1.default.randomBytes(32).toString('hex');
            const tokenHash = crypto_1.default.createHash('sha256').update(resetToken).digest('hex');
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1); // Expira em 1 hora
            await prismaClient_1.prisma.passwordResetToken.create({
                data: {
                    userId: user.id,
                    tokenHash,
                    expiresAt,
                },
            });
            // Enviar email de recuperação
            const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`;
            await emailService.sendPasswordResetEmail(user.email, resetUrl);
        }
        // Sempre retornar sucesso (não revelar se email existe)
        res.json({ success: true, message: 'Se o email existir, você receberá instruções de recuperação' });
    }
    catch (err) {
        logger_1.logger.error({ err }, 'Erro ao solicitar recuperação de senha');
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno' } });
    }
});
