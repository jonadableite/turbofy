import { CreateCharge } from "./CreateCharge";
import { CheckoutConfigRepository } from "../../ports/repositories/CheckoutConfigRepository";
import { CheckoutSessionRepository, CheckoutSessionRecord } from "../../ports/repositories/CheckoutSessionRepository";
import { ChargeRepository } from "../../ports/ChargeRepository";
import { PaymentProviderPort } from "../../ports/PaymentProviderPort";
import { MessagingPort } from "../../ports/MessagingPort";
import { logger } from "../../infrastructure/logger";

interface CreateCheckoutSessionInput {
  idempotencyKey: string;
  merchantId: string;
  amountCents: number;
  currency: string;
  description?: string;
  expiresAt?: Date;
  externalRef?: string;
  metadata?: Record<string, unknown>;
  returnUrl?: string | null;
  cancelUrl?: string | null;
}

interface CreateCheckoutSessionOutput {
  session: CheckoutSessionRecord;
}

export class CreateCheckoutSession {
  constructor(
    private readonly chargeRepository: ChargeRepository,
    private readonly paymentProvider: PaymentProviderPort,
    private readonly messaging: MessagingPort,
    private readonly checkoutConfigRepository: CheckoutConfigRepository,
    private readonly checkoutSessionRepository: CheckoutSessionRepository
  ) {}

  async execute(input: CreateCheckoutSessionInput): Promise<CreateCheckoutSessionOutput> {
    const createCharge = new CreateCharge(this.chargeRepository, this.paymentProvider, this.messaging);
    const chargeResult = await createCharge.execute({
      idempotencyKey: input.idempotencyKey,
      merchantId: input.merchantId,
      amountCents: input.amountCents,
      currency: input.currency,
      description: input.description,
      expiresAt: input.expiresAt,
      externalRef: input.externalRef,
      metadata: input.metadata,
    });

    const config = await this.checkoutConfigRepository.findByMerchantId(input.merchantId);

    const session = await this.checkoutSessionRepository.create({
      chargeId: chargeResult.charge.id,
      merchantId: input.merchantId,
      returnUrl: input.returnUrl ?? null,
      cancelUrl: input.cancelUrl ?? null,
      themeSnapshot: config?.themeTokens ? { themeTokens: config.themeTokens, logoUrl: config.logoUrl, animations: config.animations } : null,
      expiresAt: input.expiresAt ?? null,
    });

    logger.info({ useCase: "CreateCheckoutSession", entityId: session.id }, "Checkout session created");

    return { session };
  }
}
