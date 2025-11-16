import { CreateCharge } from "../useCases/CreateCharge";
import { Charge } from "../../domain/entities/Charge";
import { ChargeRepository } from "../../ports/ChargeRepository";
import { PaymentProviderPort } from "../../ports/PaymentProviderPort";
import { StubPaymentProviderAdapter } from "../../infrastructure/adapters/payment/StubPaymentProviderAdapter";
import { MessagingPort } from "../../ports/MessagingPort";
import { ChargeMethod, ChargeStatus } from "../../domain/entities/Charge";
import { PaymentInteractionRepository } from "../../ports/repositories/PaymentInteractionRepository";

describe("CreateCharge use case", () => {
  const merchantId = "8a29e7a2-7b91-4b7a-9b3e-3a0f3d2b1d55";

  let chargeRepository: ChargeRepository;
  let paymentProvider: PaymentProviderPort;
  let messaging: MessagingPort;
  let paymentInteractionRepository: PaymentInteractionRepository;

  beforeEach(() => {
    const memory: Record<string, Charge> = {};

    chargeRepository = {
      findById: jest.fn(),
      findByIdempotencyKey: jest.fn(async (key: string) => memory[key]),
      create: jest.fn(async (charge: Charge) => {
        memory[charge.idempotencyKey] = charge;
        return charge;
      }),
      update: jest.fn(async (charge: Charge) => {
        memory[charge.idempotencyKey] = charge;
        return charge;
      }),
      addSplit: jest.fn(),
      addFee: jest.fn(),
    } as unknown as ChargeRepository;

    paymentProvider = new StubPaymentProviderAdapter();
    messaging = { publish: jest.fn(async () => {}) } as MessagingPort;
    paymentInteractionRepository = {
      create: jest.fn(async (interaction) => interaction),
      listRecentByMerchant: jest.fn(),
    } as unknown as PaymentInteractionRepository;
  });

  it("creates a PIX charge and enriches with provider data", async () => {
    const useCase = new CreateCharge(
      chargeRepository,
      paymentProvider,
      messaging,
      paymentInteractionRepository
    );
    const { charge } = await useCase.execute({
      idempotencyKey: "idem-PIX-001",
      merchantId,
      amountCents: 5000,
      currency: "BRL",
      description: "Pedido #123",
      method: ChargeMethod.PIX,
    });

    expect(charge.status).toBe(ChargeStatus.PENDING);
    expect(charge.method).toBe(ChargeMethod.PIX);
    expect(charge.pixQrCode).toBeDefined();
    expect(charge.pixCopyPaste).toBeDefined();
    expect((messaging.publish as jest.Mock).mock.calls.length).toBe(1);

    // update must be called to persist payment data
    expect((chargeRepository.update as jest.Mock).mock.calls.length).toBe(1);
  });

  it("is idempotent and returns existing charge on second call", async () => {
    const useCase = new CreateCharge(
      chargeRepository,
      paymentProvider,
      messaging,
      paymentInteractionRepository
    );

    const first = await useCase.execute({
      idempotencyKey: "idem-PIX-002",
      merchantId,
      amountCents: 2500,
      currency: "BRL",
      method: ChargeMethod.PIX,
    });

    const second = await useCase.execute({
      idempotencyKey: "idem-PIX-002",
      merchantId,
      amountCents: 2500,
      currency: "BRL",
      method: ChargeMethod.PIX,
    });

    expect(second.charge.id).toBe(first.charge.id);
    // No second create/update when idempotent hit
    expect((chargeRepository.create as jest.Mock).mock.calls.length).toBe(1);
    expect((chargeRepository.update as jest.Mock).mock.calls.length).toBe(1);
  });
});