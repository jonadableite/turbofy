import { Charge, ChargeMethod } from "../../domain/entities/Charge";
import { ChargeRepository } from "../../ports/ChargeRepository";
import { PaymentProviderPort } from "../../ports/PaymentProviderPort";
import { logger } from "../../infrastructure/logger";

interface IssuePaymentForChargeInput {
  chargeId: string;
  method: ChargeMethod;
}

interface IssuePaymentForChargeOutput {
  charge: Charge;
}

export class IssuePaymentForCharge {
  constructor(private readonly chargeRepository: ChargeRepository, private readonly paymentProvider: PaymentProviderPort) {}

  async execute(input: IssuePaymentForChargeInput): Promise<IssuePaymentForChargeOutput> {
    const charge = await this.chargeRepository.findById(input.chargeId);
    if (!charge) {
      throw new Error("Charge not found");
    }

    let updated = charge.withMethod(input.method);

    if (input.method === ChargeMethod.PIX) {
      const pixData = await this.paymentProvider.issuePixCharge({
        amountCents: updated.amountCents,
        merchantId: updated.merchantId,
        description: updated.description,
        expiresAt: updated.expiresAt ?? undefined,
      });
      updated = updated.withPixData(pixData.qrCode, pixData.copyPaste);
    } else if (input.method === ChargeMethod.BOLETO) {
      const boletoData = await this.paymentProvider.issueBoletoCharge({
        amountCents: updated.amountCents,
        merchantId: updated.merchantId,
        description: updated.description,
        expiresAt: updated.expiresAt ?? undefined,
      });
      updated = updated.withBoletoData(boletoData.boletoUrl);
    }

    updated = await this.chargeRepository.update(updated);

    logger.info({ useCase: "IssuePaymentForCharge", entityId: updated.id, method: updated.method }, "Payment issued for charge");

    return { charge: updated };
  }
}
