"use strict";
// 📦 APPLICATION: Use case to create a Charge with full business orchestration
// 🔐 SECURITY: All inputs must be validated before reaching this layer (HTTP schemas)
// 🛠️ MAINTAINABILITY: Follows Clean Architecture – ports injected via constructor
// 🧪 TESTABILITY: Pure class, collaborators mocked in unit tests
// 🔄 EXTENSIBILITY: Easy to add new payment methods (Pix, Boleto, CreditCard, etc.)
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCharge = void 0;
const Charge_1 = require("../../domain/entities/Charge");
const ChargeSplit_1 = require("../../domain/entities/ChargeSplit");
const Fee_1 = require("../../domain/entities/Fee");
const crypto_1 = require("crypto");
const logger_1 = require("../../infrastructure/logger");
const PaymentInteraction_1 = require("../../domain/entities/PaymentInteraction");
class CreateCharge {
    constructor(chargeRepository, paymentProvider, messaging, paymentInteractionRepository) {
        this.chargeRepository = chargeRepository;
        this.paymentProvider = paymentProvider;
        this.messaging = messaging;
        this.paymentInteractionRepository = paymentInteractionRepository;
    }
    async execute(input) {
        // 1. Idempotency check
        const existing = await this.chargeRepository.findByIdempotencyKey(input.idempotencyKey);
        if (existing) {
            logger_1.logger.info({
                useCase: "CreateCharge",
                message: "Idempotent request – returning existing charge",
                idempotencyKey: input.idempotencyKey,
            }, "Idempotent hit");
            return { charge: existing };
        }
        // 2. Build domain entity
        const charge = new Charge_1.Charge({
            id: (0, crypto_1.randomUUID)(),
            merchantId: input.merchantId,
            amountCents: input.amountCents,
            currency: input.currency,
            description: input.description,
            status: Charge_1.ChargeStatus.PENDING,
            method: input.method,
            expiresAt: input.expiresAt,
            idempotencyKey: input.idempotencyKey,
            externalRef: input.externalRef,
            metadata: input.metadata,
        });
        // 3. Validate splits if provided
        const splits = [];
        if (input.splits && input.splits.length > 0) {
            let totalSplitAmount = 0;
            for (const splitInput of input.splits) {
                const split = new ChargeSplit_1.ChargeSplit({
                    chargeId: charge.id,
                    merchantId: splitInput.merchantId,
                    amountCents: splitInput.amountCents,
                    percentage: splitInput.percentage,
                });
                const splitAmount = split.computeAmountForTotal(charge.amountCents);
                totalSplitAmount += splitAmount;
                if (totalSplitAmount > charge.amountCents) {
                    throw new Error(`Total split amount (${totalSplitAmount}) exceeds charge amount (${charge.amountCents})`);
                }
                splits.push(split);
            }
        }
        // 4. Validate fees if provided
        const fees = [];
        if (input.fees && input.fees.length > 0) {
            let totalFees = 0;
            for (const feeInput of input.fees) {
                const fee = new Fee_1.Fee({
                    chargeId: charge.id,
                    type: feeInput.type,
                    amountCents: feeInput.amountCents,
                });
                totalFees += fee.amountCents;
                fees.push(fee);
            }
            // Validate that fees don't exceed charge amount
            if (totalFees > charge.amountCents) {
                throw new Error(`Total fees (${totalFees}) exceed charge amount (${charge.amountCents})`);
            }
        }
        // 5. Persist initial charge
        let persisted = await this.chargeRepository.create(charge);
        // 6. Persist splits if any
        const persistedSplits = [];
        for (const split of splits) {
            const persistedSplit = await this.chargeRepository.addSplit(charge.id, split);
            persistedSplits.push(persistedSplit);
        }
        // 7. Persist fees if any
        const persistedFees = [];
        for (const fee of fees) {
            const persistedFee = await this.chargeRepository.addFee(charge.id, fee);
            persistedFees.push(persistedFee);
        }
        await this.paymentInteractionRepository.create(PaymentInteraction_1.PaymentInteraction.create({
            merchantId: persisted.merchantId,
            userId: input.initiatorUserId,
            chargeId: persisted.id,
            type: PaymentInteraction_1.PaymentInteractionType.CHARGE_CREATED,
            method: persisted.method,
            amountCents: persisted.amountCents,
            metadata: {
                idempotencyKey: input.idempotencyKey,
                splits: persistedSplits.length,
                fees: persistedFees.length,
            },
        }));
        // 8. Emit payment via provider depending on method
        if (persisted.method === Charge_1.ChargeMethod.PIX) {
            const pixData = await this.paymentProvider.issuePixCharge({
                amountCents: persisted.amountCents,
                merchantId: persisted.merchantId,
                description: persisted.description,
                expiresAt: persisted.expiresAt ?? undefined,
            });
            persisted = persisted.withPixData(pixData.qrCode, pixData.copyPaste);
            await this.paymentInteractionRepository.create(PaymentInteraction_1.PaymentInteraction.create({
                merchantId: persisted.merchantId,
                userId: input.initiatorUserId,
                chargeId: persisted.id,
                type: PaymentInteraction_1.PaymentInteractionType.PIX_ISSUED,
                method: Charge_1.ChargeMethod.PIX,
                amountCents: persisted.amountCents,
                metadata: {
                    expiresAt: (persisted.expiresAt ?? new Date()).toISOString(),
                },
            }));
        }
        else if (persisted.method === Charge_1.ChargeMethod.BOLETO) {
            const boletoData = await this.paymentProvider.issueBoletoCharge({
                amountCents: persisted.amountCents,
                merchantId: persisted.merchantId,
                description: persisted.description,
                expiresAt: persisted.expiresAt ?? undefined,
            });
            persisted = persisted.withBoletoData(boletoData.boletoUrl);
            await this.paymentInteractionRepository.create(PaymentInteraction_1.PaymentInteraction.create({
                merchantId: persisted.merchantId,
                userId: input.initiatorUserId,
                chargeId: persisted.id,
                type: PaymentInteraction_1.PaymentInteractionType.BOLETO_ISSUED,
                method: Charge_1.ChargeMethod.BOLETO,
                amountCents: persisted.amountCents,
                metadata: {
                    expiresAt: (persisted.expiresAt ?? new Date()).toISOString(),
                },
            }));
        }
        // 9. Update persisted charge with payment data (if any)
        if (persisted.pixQrCode || persisted.boletoUrl) {
            persisted = await this.chargeRepository.update(persisted);
        }
        // 10. Publish event (structured, idempotent)
        await this.messaging.publish({
            id: (0, crypto_1.randomUUID)(),
            type: "charge.created",
            timestamp: new Date().toISOString(),
            version: "v1",
            traceId: input.idempotencyKey,
            idempotencyKey: input.idempotencyKey,
            routingKey: "turbofy.payments.charge.created",
            payload: {
                id: persisted.id,
                merchantId: persisted.merchantId,
                amountCents: persisted.amountCents,
                currency: persisted.currency,
                status: persisted.status,
                method: persisted.method,
                splitsCount: persistedSplits.length,
                feesCount: persistedFees.length,
                createdAt: persisted.createdAt.toISOString(),
            },
        });
        // 11. Publish split events if any
        for (const split of persistedSplits) {
            await this.messaging.publish({
                id: (0, crypto_1.randomUUID)(),
                type: "charge.split.created",
                timestamp: new Date().toISOString(),
                version: "v1",
                traceId: input.idempotencyKey,
                idempotencyKey: input.idempotencyKey,
                routingKey: "turbofy.payments.charge.split.created",
                payload: {
                    id: split.id,
                    chargeId: split.chargeId,
                    merchantId: split.merchantId,
                    amountCents: split.amountCents ?? split.computeAmountForTotal(persisted.amountCents),
                    percentage: split.percentage,
                },
            });
        }
        return {
            charge: persisted,
            splits: persistedSplits.length > 0 ? persistedSplits : undefined,
            fees: persistedFees.length > 0 ? persistedFees : undefined,
        };
    }
}
exports.CreateCharge = CreateCharge;
