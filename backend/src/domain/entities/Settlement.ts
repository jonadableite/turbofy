import { randomUUID } from "crypto";

export enum SettlementStatus {
  PENDING = "PENDING",
  SCHEDULED = "SCHEDULED",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELED = "CANCELED",
}

export interface SettlementProps {
  id?: string;
  merchantId: string;
  amountCents: number;
  currency?: string;
  status?: SettlementStatus;
  scheduledFor?: Date;
  processedAt?: Date;
  bankAccountId?: string;
  transactionId?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Settlement {
  readonly id: string;
  readonly merchantId: string;
  readonly amountCents: number;
  readonly currency: string;
  private _status: SettlementStatus;
  readonly scheduledFor?: Date;
  readonly processedAt?: Date;
  readonly bankAccountId?: string;
  readonly transactionId?: string;
  readonly failureReason?: string;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: SettlementProps) {
    this.id = props.id || randomUUID();
    this.merchantId = props.merchantId;
    this.amountCents = props.amountCents;
    this.currency = props.currency || "BRL";
    this._status = props.status || SettlementStatus.PENDING;
    this.scheduledFor = props.scheduledFor;
    this.processedAt = props.processedAt;
    this.bankAccountId = props.bankAccountId;
    this.transactionId = props.transactionId;
    this.failureReason = props.failureReason;
    this.metadata = props.metadata;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();

    // Validações de domínio
    if (this.amountCents <= 0) {
      throw new Error("Settlement amount must be greater than zero");
    }
  }

  get status(): SettlementStatus {
    return this._status;
  }

  schedule(scheduledFor: Date, bankAccountId: string): void {
    if (this._status !== SettlementStatus.PENDING) {
      throw new Error("Only PENDING settlements can be scheduled");
    }
    if (scheduledFor < new Date()) {
      throw new Error("Scheduled date must be in the future");
    }
    this._status = SettlementStatus.SCHEDULED;
    (this as { scheduledFor?: Date }).scheduledFor = scheduledFor;
    (this as { bankAccountId?: string }).bankAccountId = bankAccountId;
    (this as { updatedAt: Date }).updatedAt = new Date();
  }

  startProcessing(): void {
    if (this._status !== SettlementStatus.SCHEDULED && this._status !== SettlementStatus.PENDING) {
      throw new Error("Only SCHEDULED or PENDING settlements can be processed");
    }
    this._status = SettlementStatus.PROCESSING;
    (this as { updatedAt: Date }).updatedAt = new Date();
  }

  complete(transactionId: string): void {
    if (this._status !== SettlementStatus.PROCESSING) {
      throw new Error("Only PROCESSING settlements can be completed");
    }
    this._status = SettlementStatus.COMPLETED;
    (this as { transactionId?: string }).transactionId = transactionId;
    (this as { processedAt?: Date }).processedAt = new Date();
    (this as { updatedAt: Date }).updatedAt = new Date();
  }

  fail(failureReason: string): void {
    if (this._status !== SettlementStatus.PROCESSING) {
      throw new Error("Only PROCESSING settlements can fail");
    }
    this._status = SettlementStatus.FAILED;
    (this as { failureReason?: string }).failureReason = failureReason;
    (this as { updatedAt: Date }).updatedAt = new Date();
  }

  cancel(): void {
    if (this._status === SettlementStatus.COMPLETED) {
      throw new Error("Cannot cancel completed settlement");
    }
    this._status = SettlementStatus.CANCELED;
    (this as { updatedAt: Date }).updatedAt = new Date();
  }

  canBeProcessed(): boolean {
    return this._status === SettlementStatus.SCHEDULED || this._status === SettlementStatus.PENDING;
  }

  isDue(): boolean {
    if (!this.scheduledFor) {
      return this._status === SettlementStatus.PENDING;
    }
    return new Date() >= this.scheduledFor && this.canBeProcessed();
  }
}

