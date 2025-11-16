"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Charge = exports.ChargeMethod = exports.ChargeStatus = void 0;
const crypto_1 = require("crypto");
var ChargeStatus;
(function (ChargeStatus) {
    ChargeStatus["PENDING"] = "PENDING";
    ChargeStatus["PAID"] = "PAID";
    ChargeStatus["EXPIRED"] = "EXPIRED";
    ChargeStatus["CANCELED"] = "CANCELED";
})(ChargeStatus || (exports.ChargeStatus = ChargeStatus = {}));
var ChargeMethod;
(function (ChargeMethod) {
    ChargeMethod["PIX"] = "PIX";
    ChargeMethod["BOLETO"] = "BOLETO";
})(ChargeMethod || (exports.ChargeMethod = ChargeMethod = {}));
class Charge {
    constructor(props) {
        this.id = props.id || (0, crypto_1.randomUUID)();
        this.merchantId = props.merchantId;
        this.amountCents = props.amountCents;
        this.currency = props.currency || "BRL";
        this.description = props.description;
        this._status = props.status || ChargeStatus.PENDING;
        this._method = props.method;
        this.expiresAt = props.expiresAt;
        this.idempotencyKey = props.idempotencyKey;
        this.externalRef = props.externalRef;
        this.metadata = props.metadata;
        this.pixQrCode = props.pixQrCode;
        this.pixCopyPaste = props.pixCopyPaste;
        this.boletoUrl = props.boletoUrl;
        this.pixTxid = props.pixTxid;
        this.paidAt = props.paidAt;
        this.createdAt = props.createdAt || new Date();
        this.updatedAt = props.updatedAt || new Date();
    }
    get status() {
        return this._status;
    }
    get method() {
        return this._method;
    }
    setPaymentMethod(method) {
        this._method = method;
    }
    markAsPaid() {
        this._status = ChargeStatus.PAID;
        this.paidAt = new Date();
    }
    markAsExpired() {
        this._status = ChargeStatus.EXPIRED;
    }
    cancel() {
        this._status = ChargeStatus.CANCELED;
    }
    // ✨ Immutable helpers to enrich charge with payment data
    withPixData(qrCode, copyPaste) {
        return new Charge({
            id: this.id,
            merchantId: this.merchantId,
            amountCents: this.amountCents,
            currency: this.currency,
            description: this.description,
            status: this._status,
            method: this._method,
            expiresAt: this.expiresAt,
            idempotencyKey: this.idempotencyKey,
            externalRef: this.externalRef,
            metadata: this.metadata,
            pixQrCode: qrCode,
            pixCopyPaste: copyPaste,
            boletoUrl: this.boletoUrl,
            createdAt: this.createdAt,
            updatedAt: new Date(),
        });
    }
    withBoletoData(boletoUrl) {
        return new Charge({
            id: this.id,
            merchantId: this.merchantId,
            amountCents: this.amountCents,
            currency: this.currency,
            description: this.description,
            status: this._status,
            method: this._method,
            expiresAt: this.expiresAt,
            idempotencyKey: this.idempotencyKey,
            externalRef: this.externalRef,
            metadata: this.metadata,
            pixQrCode: this.pixQrCode,
            pixCopyPaste: this.pixCopyPaste,
            boletoUrl,
            createdAt: this.createdAt,
            updatedAt: new Date(),
        });
    }
    withMethod(method) {
        return new Charge({
            id: this.id,
            merchantId: this.merchantId,
            amountCents: this.amountCents,
            currency: this.currency,
            description: this.description,
            status: this._status,
            method,
            expiresAt: this.expiresAt,
            idempotencyKey: this.idempotencyKey,
            externalRef: this.externalRef,
            metadata: this.metadata,
            pixQrCode: this.pixQrCode,
            pixCopyPaste: this.pixCopyPaste,
            boletoUrl: this.boletoUrl,
            pixTxid: this.pixTxid,
            createdAt: this.createdAt,
            updatedAt: new Date(),
        });
    }
}
exports.Charge = Charge;
