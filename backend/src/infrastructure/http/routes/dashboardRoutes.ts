import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../../database/prismaClient";
import { logger } from "../../logger";
import { authMiddleware } from "../middlewares/authMiddleware";
import { PrismaProviderCredentialsRepository } from "../../database/repositories/PrismaProviderCredentialsRepository";
import { PaymentProviderFactory } from "../../adapters/payment/PaymentProviderFactory";

export const dashboardRouter = Router();

// Rate limiter para endpoints do dashboard - mais permissivo em desenvolvimento
const isDevelopment = process.env.NODE_ENV === 'development';
const dashboardLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: isDevelopment ? 200 : 50, // 200 req/min em dev, 50 em produção
  message: 'Too many requests, please try again later.',
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

// GET /dashboard/metrics - Métricas gerais do dashboard
dashboardRouter.get("/metrics", dashboardLimiter, async (req: Request, res: Response) => {
  try {
    const merchantId = req.query.merchantId as string;

    if (!merchantId) {
      return res.status(400).json({
        error: { code: "MERCHANT_ID_REQUIRED", message: "merchantId é obrigatório" },
      });
    }

    // Total de vendas (charges pagas)
    const totalSales = await prisma.charge.aggregate({
      where: {
        merchantId,
        status: "PAID",
      },
      _sum: {
        amountCents: true,
      },
    });

    // Total de transações
    const totalTransactions = await prisma.charge.count({
      where: {
        merchantId,
        status: "PAID",
      },
    });

    // Ticket médio
    const averageTicket =
      totalTransactions > 0 && totalSales._sum.amountCents
        ? totalSales._sum.amountCents / totalTransactions
        : 0;

    // Vendas por método de pagamento
    const pixSales = await prisma.charge.aggregate({
      where: {
        merchantId,
        status: "PAID",
        method: "PIX",
      },
      _sum: {
        amountCents: true,
      },
    });

    const cardSales = await prisma.charge.aggregate({
      where: {
        merchantId,
        status: "PAID",
        method: "CARTAO", // Ajustar conforme o schema
      },
      _sum: {
        amountCents: true,
      },
    });

    const boletoSales = await prisma.charge.aggregate({
      where: {
        merchantId,
        status: "PAID",
        method: "BOLETO",
      },
      _sum: {
        amountCents: true,
      },
    });

    // Pagamentos aprovados, reembolsados e com falha
    const approvedPayments = await prisma.charge.aggregate({
      where: {
        merchantId,
        status: "PAID",
      },
      _sum: {
        amountCents: true,
      },
    });

    const refundedPayments = await prisma.charge.aggregate({
      where: {
        merchantId,
        status: "CANCELED", // Ajustar conforme lógica de negócio
      },
      _sum: {
        amountCents: true,
      },
    });

    const failedPayments = await prisma.charge.aggregate({
      where: {
        merchantId,
        status: "EXPIRED", // Ajustar conforme lógica de negócio
      },
      _sum: {
        amountCents: true,
      },
    });

    res.json({
      totalSales: totalSales._sum.amountCents || 0,
      totalTransactions,
      averageTicket: Math.round(averageTicket),
      pixSales: pixSales._sum.amountCents || 0,
      cardSales: cardSales._sum.amountCents || 0,
      boletoSales: boletoSales._sum.amountCents || 0,
      approvedPayments: approvedPayments._sum.amountCents || 0,
      refundedPayments: refundedPayments._sum.amountCents || 0,
      failedPayments: failedPayments._sum.amountCents || 0,
    });
  } catch (err) {
    logger.error({ err }, "Erro ao buscar métricas do dashboard");
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Erro interno" },
    });
  }
});

// GET /dashboard/revenue-history - Histórico de faturamento
dashboardRouter.get("/revenue-history", dashboardLimiter, async (req: Request, res: Response) => {
  try {
    const merchantId = req.query.merchantId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    if (!merchantId) {
      return res.status(400).json({
        error: { code: "MERCHANT_ID_REQUIRED", message: "merchantId é obrigatório" },
      });
    }

    const where: any = {
      merchantId,
      status: "PAID",
    };

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else {
      // Últimos 7 dias por padrão
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      where.createdAt = {
        gte: start,
        lte: end,
      };
    }

    const charges = await prisma.charge.findMany({
      where,
      select: {
        createdAt: true,
        amountCents: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Agrupar por dia
    const dailyRevenue: Record<string, number> = {};
    charges.forEach((charge) => {
      const date = charge.createdAt.toISOString().split("T")[0];
      dailyRevenue[date] = (dailyRevenue[date] || 0) + charge.amountCents;
    });

    const revenueData = Object.entries(dailyRevenue).map(([date, revenue]) => ({
      date,
      revenue,
    }));

    res.json(revenueData);
  } catch (err) {
    logger.error({ err }, "Erro ao buscar histórico de faturamento");
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Erro interno" },
    });
  }
});

// GET /dashboard/health - Saúde da conta
dashboardRouter.get("/health", dashboardLimiter, async (req: Request, res: Response) => {
  try {
    const merchantId = req.query.merchantId as string;

    if (!merchantId) {
      return res.status(400).json({
        error: { code: "MERCHANT_ID_REQUIRED", message: "merchantId é obrigatório" },
      });
    }

    const approvedPayments = await prisma.charge.aggregate({
      where: {
        merchantId,
        status: "PAID",
      },
      _sum: {
        amountCents: true,
      },
    });

    const refundedPayments = await prisma.charge.aggregate({
      where: {
        merchantId,
        status: "CANCELED",
      },
      _sum: {
        amountCents: true,
      },
    });

    const failedPayments = await prisma.charge.aggregate({
      where: {
        merchantId,
        status: "EXPIRED",
      },
      _sum: {
        amountCents: true,
      },
    });

    // Calcular taxa de chargeback (mock - ajustar conforme lógica real)
    const totalAmount = approvedPayments._sum.amountCents || 0;
    const chargebackRate = totalAmount > 0 ? 1.71 : 0; // Mock

    res.json({
      approvedPayments: approvedPayments._sum.amountCents || 0,
      refundedPayments: refundedPayments._sum.amountCents || 0,
      failedPayments: failedPayments._sum.amountCents || 0,
      chargebackRate,
    });
  } catch (err) {
    logger.error({ err }, "Erro ao buscar saúde da conta");
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Erro interno" },
    });
  }
});

// GET /dashboard/top-products - Produtos mais vendidos
dashboardRouter.get("/top-products", dashboardLimiter, async (req: Request, res: Response) => {
  try {
    const merchantId = req.query.merchantId as string;
    const limit = parseInt(req.query.limit as string) || 5;

    if (!merchantId) {
      return res.status(400).json({
        error: { code: "MERCHANT_ID_REQUIRED", message: "merchantId é obrigatório" },
      });
    }

    // Agrupar por descrição (ajustar conforme schema real)
    const charges = await prisma.charge.findMany({
      where: {
        merchantId,
        status: "PAID",
      },
      select: {
        description: true,
        amountCents: true,
      },
    });

    // Agrupar por produto (descrição)
    const productRevenue: Record<string, number> = {};
    charges.forEach((charge) => {
      const productName = charge.description || "Produto sem nome";
      productRevenue[productName] =
        (productRevenue[productName] || 0) + charge.amountCents;
    });

    const topProducts = Object.entries(productRevenue)
      .map(([name, revenue]) => ({
        id: name,
        name,
        category: "Geral", // Mock - ajustar conforme schema
        revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    res.json(topProducts);
  } catch (err) {
    logger.error({ err }, "Erro ao buscar produtos mais vendidos");
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Erro interno" },
    });
  }
});

dashboardRouter.get("/interactions", dashboardLimiter, async (req: Request, res: Response) => {
  try {
    const merchantId = req.query.merchantId as string;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);

    if (!merchantId) {
      return res.status(400).json({
        error: { code: "MERCHANT_ID_REQUIRED", message: "merchantId é obrigatório" },
      });
    }

    const interactions = await prisma.paymentInteraction.findMany({
      where: { merchantId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        chargeId: true,
        sessionId: true,
        type: true,
        method: true,
        provider: true,
        amountCents: true,
        metadata: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    type InteractionRow = (typeof interactions)[number];
    const formatted = interactions.map((interaction: InteractionRow) => ({
      id: interaction.id,
      chargeId: interaction.chargeId,
      sessionId: interaction.sessionId,
      type: interaction.type,
      method: interaction.method,
      provider: interaction.provider,
      amountCents: interaction.amountCents ?? 0,
      metadata: interaction.metadata ?? {},
      createdAt: interaction.createdAt.toISOString(),
      user: interaction.user
        ? {
            id: interaction.user.id,
            email: interaction.user.email,
          }
        : null,
    }));

    res.json(formatted);
  } catch (err) {
    logger.error({ err }, "Erro ao listar interações de pagamento");
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Erro interno" },
    });
  }
});
// POST /dashboard/merchant/ensure - cria/associa Merchant ao usuário autenticado se não existir
dashboardRouter.post("/merchant/ensure", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Usuário não autenticado" } });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, email: true, merchantId: true } });
    if (!user) {
      return res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "Usuário não encontrado" } });
    }

    if (user.merchantId) {
      return res.status(200).json({ merchantId: user.merchantId });
    }

    const name = (user.email || "Merchant").split("@")[0];
    const document = `AUTO-${user.id}`; // placeholder único para desenvolvimento

    const merchant = await prisma.merchant.create({
      data: {
        name,
        email: user.email,
        document,
        active: true,
      },
      select: { id: true },
    });

    await prisma.user.update({ where: { id: user.id }, data: { merchantId: merchant.id } });

    logger.info({ userId: user.id, merchantId: merchant.id }, "Merchant criado e associado ao usuário");
    return res.status(201).json({ merchantId: merchant.id });
  } catch (err) {
    logger.error({ err }, "Erro ao garantir Merchant para usuário");
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno" } });
  }
});

dashboardRouter.get("/providers/:provider/credentials", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Usuário não autenticado" } })
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { merchantId: true } })
    if (!user?.merchantId) return res.status(400).json({ error: { code: "MERCHANT_REQUIRED", message: "merchantId não associado" } })
    if (!req.user.roles?.includes('owner')) return res.status(403).json({ error: { code: "FORBIDDEN", message: "Acesso restrito ao proprietário da conta" } })
    const repo = new PrismaProviderCredentialsRepository()
    const rec = await repo.findByMerchantAndProvider(user.merchantId, req.params.provider.toUpperCase())
    return res.status(200).json({ credentials: rec ? { provider: rec.provider, clientId: rec.clientId } : null })
  } catch (err) {
    logger.error({ err }, "Erro ao obter credenciais do provider")
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno" } })
  }
})

dashboardRouter.put("/providers/:provider/credentials", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Usuário não autenticado" } })
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { merchantId: true } })
    if (!user?.merchantId) return res.status(400).json({ error: { code: "MERCHANT_REQUIRED", message: "merchantId não associado" } })
    if (!req.user.roles?.includes('owner')) return res.status(403).json({ error: { code: "FORBIDDEN", message: "Acesso restrito ao proprietário da conta" } })
    const { clientId, clientSecret } = req.body as { clientId: string; clientSecret: string }
    if (!clientId || !clientSecret) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "clientId e clientSecret são obrigatórios" } })
    const repo = new PrismaProviderCredentialsRepository()
    const saved = await repo.upsert({ merchantId: user.merchantId, provider: req.params.provider.toUpperCase(), clientId, clientSecret })
    return res.status(200).json({ provider: saved.provider })
  } catch (err) {
    logger.error({ err }, "Erro ao salvar credenciais do provider")
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno" } })
  }
})

dashboardRouter.get("/providers/:provider/balance", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Usuário não autenticado" } })
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { merchantId: true } })
    if (!user?.merchantId) return res.status(400).json({ error: { code: "MERCHANT_REQUIRED", message: "merchantId não associado" } })
    if (!req.user.roles?.includes('owner')) return res.status(403).json({ error: { code: "FORBIDDEN", message: "Acesso restrito ao proprietário da conta" } })
    const provider = await PaymentProviderFactory.createForMerchant(user.merchantId)
    if (!provider.getBalance) return res.status(400).json({ error: { code: "NOT_SUPPORTED", message: "Provider não suporta consulta de saldo" } })
    const balance = await provider.getBalance()
    return res.status(200).json({ balance })
  } catch (err) {
    logger.error({ err }, "Erro ao consultar saldo do provider")
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno" } })
  }
})
