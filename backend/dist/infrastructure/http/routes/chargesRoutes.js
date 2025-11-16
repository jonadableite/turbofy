"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chargesRouter = void 0;
const express_1 = require("express");
const charges_1 = require("../schemas/charges");
const zod_1 = require("zod");
const PrismaChargeRepository_1 = require("../../database/PrismaChargeRepository");
const PaymentProviderFactory_1 = require("../../adapters/payment/PaymentProviderFactory");
const InMemoryMessagingAdapter_1 = require("../../adapters/messaging/InMemoryMessagingAdapter");
const CreateCharge_1 = require("../../../application/useCases/CreateCharge");
const logger_1 = require("../../logger");
const PrismaPaymentInteractionRepository_1 = require("../../database/repositories/PrismaPaymentInteractionRepository");
exports.chargesRouter = (0, express_1.Router)();
// Middleware de idempotência
exports.chargesRouter.use((req, res, next) => {
    const idemKey = req.header("X-Idempotency-Key");
    if (!idemKey) {
        return res.status(400).json({ error: { code: "IDEMPOTENCY_KEY_MISSING", message: "Header X-Idempotency-Key é obrigatório" } });
    }
    next();
});
exports.chargesRouter.post("/", async (req, res) => {
    try {
        const parsed = charges_1.CreateChargeRequestSchema.parse(req.body);
        // Cria instâncias dos adapters (em produção usar DI/container)
        const chargeRepository = new PrismaChargeRepository_1.PrismaChargeRepository();
        const paymentProvider = PaymentProviderFactory_1.PaymentProviderFactory.create();
        const messaging = new InMemoryMessagingAdapter_1.InMemoryMessagingAdapter();
        const paymentInteractionRepository = new PrismaPaymentInteractionRepository_1.PrismaPaymentInteractionRepository();
        const useCase = new CreateCharge_1.CreateCharge(chargeRepository, paymentProvider, messaging, paymentInteractionRepository);
        // With nativeEnum, parsed.method is already a ChargeMethod
        const methodEnum = parsed.method;
        const result = await useCase.execute({
            idempotencyKey: req.header("X-Idempotency-Key"),
            merchantId: parsed.merchantId,
            initiatorUserId: req.user?.id,
            amountCents: parsed.amountCents,
            currency: parsed.currency,
            description: parsed.description,
            method: methodEnum,
            expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
            externalRef: parsed.externalRef,
            metadata: parsed.metadata,
            splits: parsed.splits,
            fees: parsed.fees,
        });
        const { charge, splits, fees } = result;
        const responseData = {
            id: charge.id,
            merchantId: charge.merchantId,
            amountCents: charge.amountCents,
            currency: charge.currency,
            description: charge.description ?? null,
            status: charge.status,
            method: charge.method ?? null,
            expiresAt: charge.expiresAt ? charge.expiresAt.toISOString() : null,
            idempotencyKey: charge.idempotencyKey,
            externalRef: charge.externalRef ?? null,
            metadata: charge.metadata ?? null,
            pix: charge.pixQrCode ? { qrCode: charge.pixQrCode, copyPaste: charge.pixCopyPaste, expiresAt: (charge.expiresAt ?? new Date()).toISOString() } : undefined,
            boleto: charge.boletoUrl ? { boletoUrl: charge.boletoUrl, expiresAt: (charge.expiresAt ?? new Date()).toISOString() } : undefined,
            createdAt: charge.createdAt.toISOString(),
            updatedAt: charge.updatedAt.toISOString(),
        };
        // Add splits and fees if present
        if (splits && splits.length > 0) {
            responseData.splits = splits.map((split) => ({
                id: split.id,
                merchantId: split.merchantId,
                amountCents: split.amountCents ?? split.computeAmountForTotal(charge.amountCents),
                percentage: split.percentage,
            }));
        }
        if (fees && fees.length > 0) {
            responseData.fees = fees.map((fee) => ({
                id: fee.id,
                type: fee.type,
                amountCents: fee.amountCents,
            }));
        }
        // Validate response with schema (now supports splits and fees)
        const response = charges_1.CreateChargeResponseSchema.parse(responseData);
        res.status(201).json(response);
    }
    catch (err) {
        if (err instanceof zod_1.ZodError) {
            return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: err.message, details: err.flatten() } });
        }
        logger_1.logger.error({ err }, "Erro inesperado no POST /charges");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno" } });
    }
});
