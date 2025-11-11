import { PrismaClient, Prisma } from "@prisma/client";
import {
  Reconciliation,
  ReconciliationStatus,
  ReconciliationType,
  ReconciliationMatch,
} from "../../domain/entities/Reconciliation";
import { ReconciliationRepository } from "../../ports/ReconciliationRepository";
import { prisma } from "./prismaClient";

function mapPrismaReconciliationToDomain(model: any): Reconciliation {
  const matches = model.matches
    ? (model.matches as ReconciliationMatch[])
    : [];
  const unmatchedCharges = model.unmatchedCharges || [];
  const unmatchedTransactions = model.unmatchedTransactions || [];

  return new Reconciliation({
    id: model.id,
    merchantId: model.merchantId,
    type: model.type as ReconciliationType,
    status: model.status as ReconciliationStatus,
    startDate: model.startDate,
    endDate: model.endDate,
    matches,
    unmatchedCharges,
    unmatchedTransactions,
    totalAmountCents: model.totalAmountCents,
    matchedAmountCents: model.matchedAmountCents,
    failureReason: model.failureReason ?? undefined,
    processedAt: model.processedAt ?? undefined,
    metadata: model.metadata ? (model.metadata as Record<string, unknown>) : undefined,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  });
}

export class PrismaReconciliationRepository implements ReconciliationRepository {
  async findById(id: string): Promise<Reconciliation | null> {
    const found = await prisma.reconciliation.findUnique({ where: { id } });
    return found ? mapPrismaReconciliationToDomain(found) : null;
  }

  async findByMerchantId(merchantId: string, status?: string): Promise<Reconciliation[]> {
    const where: Prisma.ReconciliationWhereInput = { merchantId };
    if (status) {
      where.status = status as ReconciliationStatus;
    }
    const found = await prisma.reconciliation.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return found.map(mapPrismaReconciliationToDomain);
  }

  async findByDateRange(
    merchantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Reconciliation[]> {
    const found = await prisma.reconciliation.findMany({
      where: {
        merchantId,
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    return found.map(mapPrismaReconciliationToDomain);
  }

  async create(reconciliation: Reconciliation): Promise<Reconciliation> {
    const created = await prisma.reconciliation.create({
      data: {
        id: reconciliation.id,
        merchantId: reconciliation.merchantId,
        type: reconciliation.type,
        status: reconciliation.status,
        startDate: reconciliation.startDate,
        endDate: reconciliation.endDate,
        matches: reconciliation.matches ? (reconciliation.matches as Prisma.InputJsonValue) : null,
        unmatchedCharges: reconciliation.unmatchedCharges,
        unmatchedTransactions: reconciliation.unmatchedTransactions,
        totalAmountCents: reconciliation.totalAmountCents,
        matchedAmountCents: reconciliation.matchedAmountCents,
        failureReason: reconciliation.failureReason ?? null,
        processedAt: reconciliation.processedAt ?? null,
        metadata: reconciliation.metadata
          ? (reconciliation.metadata as Prisma.InputJsonValue)
          : null,
      },
    });
    return mapPrismaReconciliationToDomain(created);
  }

  async update(reconciliation: Reconciliation): Promise<Reconciliation> {
    const updated = await prisma.reconciliation.update({
      where: { id: reconciliation.id },
      data: {
        status: reconciliation.status,
        matches: reconciliation.matches
          ? (reconciliation.matches as Prisma.InputJsonValue)
          : null,
        unmatchedCharges: reconciliation.unmatchedCharges,
        unmatchedTransactions: reconciliation.unmatchedTransactions,
        totalAmountCents: reconciliation.totalAmountCents,
        matchedAmountCents: reconciliation.matchedAmountCents,
        failureReason: reconciliation.failureReason ?? null,
        processedAt: reconciliation.processedAt ?? null,
        metadata: reconciliation.metadata
          ? (reconciliation.metadata as Prisma.InputJsonValue)
          : null,
      },
    });
    return mapPrismaReconciliationToDomain(updated);
  }
}

