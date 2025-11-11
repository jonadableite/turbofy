import { randomUUID } from "crypto";

export enum ReconciliationStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  PARTIAL = "PARTIAL",
}

export enum ReconciliationType {
  AUTOMATIC = "AUTOMATIC",
  MANUAL = "MANUAL",
}

export interface ReconciliationMatch {
  chargeId: string;
  amountCents: number;
  transactionId: string;
  matchedAt: Date;
}

export interface ReconciliationProps {
  id?: string;
  merchantId: string;
  type: ReconciliationType;
  status?: ReconciliationStatus;
  startDate: Date;
  endDate: Date;
  matches?: ReconciliationMatch[];
  unmatchedCharges?: string[];
  unmatchedTransactions?: string[];
  totalAmountCents?: number;
  matchedAmountCents?: number;
  failureReason?: string;
  processedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Reconciliation {
  readonly id: string;
  readonly merchantId: string;
  readonly type: ReconciliationType;
  private _status: ReconciliationStatus;
  readonly startDate: Date;
  readonly endDate: Date;
  private _matches: ReconciliationMatch[];
  private _unmatchedCharges: string[];
  private _unmatchedTransactions: string[];
  private _totalAmountCents: number;
  private _matchedAmountCents: number;
  readonly failureReason?: string;
  readonly processedAt?: Date;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: ReconciliationProps) {
    this.id = props.id || randomUUID();
    this.merchantId = props.merchantId;
    this.type = props.type;
    this._status = props.status || ReconciliationStatus.PENDING;
    this.startDate = props.startDate;
    this.endDate = props.endDate;
    this._matches = props.matches || [];
    this._unmatchedCharges = props.unmatchedCharges || [];
    this._unmatchedTransactions = props.unmatchedTransactions || [];
    this._totalAmountCents = props.totalAmountCents || 0;
    this._matchedAmountCents = props.matchedAmountCents || 0;
    this.failureReason = props.failureReason;
    this.processedAt = props.processedAt;
    this.metadata = props.metadata;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();

    // Validações de domínio
    if (this.endDate < this.startDate) {
      throw new Error("End date must be after start date");
    }
  }

  get status(): ReconciliationStatus {
    return this._status;
  }

  get matches(): readonly ReconciliationMatch[] {
    return [...this._matches];
  }

  get unmatchedCharges(): readonly string[] {
    return [...this._unmatchedCharges];
  }

  get unmatchedTransactions(): readonly string[] {
    return [...this._unmatchedTransactions];
  }

  get totalAmountCents(): number {
    return this._totalAmountCents;
  }

  get matchedAmountCents(): number {
    return this._matchedAmountCents;
  }

  startProcessing(totalAmountCents: number): void {
    if (this._status !== ReconciliationStatus.PENDING) {
      throw new Error("Only PENDING reconciliations can start processing");
    }
    this._status = ReconciliationStatus.PROCESSING;
    this._totalAmountCents = totalAmountCents;
    (this as { updatedAt: Date }).updatedAt = new Date();
  }

  addMatch(chargeId: string, amountCents: number, transactionId: string): void {
    if (this._status !== ReconciliationStatus.PROCESSING) {
      throw new Error("Matches can only be added during processing");
    }
    this._matches.push({
      chargeId,
      amountCents,
      transactionId,
      matchedAt: new Date(),
    });
    this._matchedAmountCents += amountCents;
    (this as { updatedAt: Date }).updatedAt = new Date();
  }

  addUnmatchedCharge(chargeId: string): void {
    if (this._status !== ReconciliationStatus.PROCESSING) {
      throw new Error("Unmatched charges can only be added during processing");
    }
    if (!this._unmatchedCharges.includes(chargeId)) {
      this._unmatchedCharges.push(chargeId);
      (this as { updatedAt: Date }).updatedAt = new Date();
    }
  }

  addUnmatchedTransaction(transactionId: string): void {
    if (this._status !== ReconciliationStatus.PROCESSING) {
      throw new Error("Unmatched transactions can only be added during processing");
    }
    if (!this._unmatchedTransactions.includes(transactionId)) {
      this._unmatchedTransactions.push(transactionId);
      (this as { updatedAt: Date }).updatedAt = new Date();
    }
  }

  complete(): void {
    if (this._status !== ReconciliationStatus.PROCESSING) {
      throw new Error("Only PROCESSING reconciliations can be completed");
    }
    
    const hasUnmatched = this._unmatchedCharges.length > 0 || this._unmatchedTransactions.length > 0;
    this._status = hasUnmatched ? ReconciliationStatus.PARTIAL : ReconciliationStatus.COMPLETED;
    (this as { processedAt?: Date }).processedAt = new Date();
    (this as { updatedAt: Date }).updatedAt = new Date();
  }

  fail(failureReason: string): void {
    if (this._status !== ReconciliationStatus.PROCESSING) {
      throw new Error("Only PROCESSING reconciliations can fail");
    }
    this._status = ReconciliationStatus.FAILED;
    (this as { failureReason?: string }).failureReason = failureReason;
    (this as { updatedAt: Date }).updatedAt = new Date();
  }

  getMatchRate(): number {
    if (this._totalAmountCents === 0) {
      return 0;
    }
    return (this._matchedAmountCents / this._totalAmountCents) * 100;
  }
}

