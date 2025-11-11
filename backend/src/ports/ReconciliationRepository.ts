import { Reconciliation } from "../domain/entities/Reconciliation";

export interface ReconciliationRepository {
  findById(id: string): Promise<Reconciliation | null>;
  findByMerchantId(merchantId: string, status?: string): Promise<Reconciliation[]>;
  findByDateRange(merchantId: string, startDate: Date, endDate: Date): Promise<Reconciliation[]>;
  create(reconciliation: Reconciliation): Promise<Reconciliation>;
  update(reconciliation: Reconciliation): Promise<Reconciliation>;
}

