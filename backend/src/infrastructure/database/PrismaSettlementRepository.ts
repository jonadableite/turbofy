import { PrismaClient, Prisma } from "@prisma/client";
import { Settlement, SettlementStatus } from "../../domain/entities/Settlement";
import { SettlementRepository } from "../../ports/SettlementRepository";
import { prisma } from "./prismaClient";

function mapPrismaSettlementToDomain(model: any): Settlement {
  return new Settlement({
    id: model.id,
    merchantId: model.merchantId,
    amountCents: model.amountCents,
    currency: model.currency,
    status: model.status as SettlementStatus,
    scheduledFor: model.scheduledFor ?? undefined,
    processedAt: model.processedAt ?? undefined,
    bankAccountId: model.bankAccountId ?? undefined,
    transactionId: model.transactionId ?? undefined,
    failureReason: model.failureReason ?? undefined,
    metadata: model.metadata ? (model.metadata as Record<string, unknown>) : undefined,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  });
}

export class PrismaSettlementRepository implements SettlementRepository {
  async findById(id: string): Promise<Settlement | null> {
    const found = await prisma.settlement.findUnique({ where: { id } });
    return found ? mapPrismaSettlementToDomain(found) : null;
  }

  async findByMerchantId(merchantId: string, status?: string): Promise<Settlement[]> {
    const where: Prisma.SettlementWhereInput = { merchantId };
    if (status) {
      where.status = status as SettlementStatus;
    }
    const found = await prisma.settlement.findMany({ where, orderBy: { createdAt: "desc" } });
    return found.map(mapPrismaSettlementToDomain);
  }

  async findDueSettlements(): Promise<Settlement[]> {
    const now = new Date();
    const found = await prisma.settlement.findMany({
      where: {
        OR: [
          { status: SettlementStatus.PENDING },
          {
            status: SettlementStatus.SCHEDULED,
            scheduledFor: { lte: now },
          },
        ],
      },
      orderBy: { scheduledFor: "asc" },
    });
    return found.map(mapPrismaSettlementToDomain);
  }

  async create(settlement: Settlement): Promise<Settlement> {
    const created = await prisma.settlement.create({
      data: {
        id: settlement.id,
        merchantId: settlement.merchantId,
        amountCents: settlement.amountCents,
        currency: settlement.currency,
        status: settlement.status,
        scheduledFor: settlement.scheduledFor ?? null,
        processedAt: settlement.processedAt ?? null,
        bankAccountId: settlement.bankAccountId ?? null,
        transactionId: settlement.transactionId ?? null,
        failureReason: settlement.failureReason ?? null,
        metadata: settlement.metadata ? (settlement.metadata as Prisma.InputJsonValue) : null,
      },
    });
    return mapPrismaSettlementToDomain(created);
  }

  async update(settlement: Settlement): Promise<Settlement> {
    const updated = await prisma.settlement.update({
      where: { id: settlement.id },
      data: {
        status: settlement.status,
        scheduledFor: settlement.scheduledFor ?? null,
        processedAt: settlement.processedAt ?? null,
        bankAccountId: settlement.bankAccountId ?? null,
        transactionId: settlement.transactionId ?? null,
        failureReason: settlement.failureReason ?? null,
        metadata: settlement.metadata ? (settlement.metadata as Prisma.InputJsonValue) : null,
      },
    });
    return mapPrismaSettlementToDomain(updated);
  }
}

