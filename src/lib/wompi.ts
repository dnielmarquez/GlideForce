/**
 * wompi.ts — Server-only Wompi utilities
 * NEVER import this from client components.
 */
import crypto from 'crypto';

// ─── Reference Generator ───────────────────────────────────────────────────
/**
 * Generates a unique Wompi payment reference.
 * Format: GF-<purpose>-<entityId-truncated>-<timestamp>-<random>
 * Must be alphanumeric + hyphens, max 64 chars.
 */
export function generateWompiReference(
    purpose: 'star' | 'booking',
    entityId: string
): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const shortId = entityId.replace(/-/g, '').substring(0, 8).toUpperCase();
    return `GF-${purpose.toUpperCase()}-${shortId}-${ts}-${rand}`;
}

// ─── Integrity Hash ─────────────────────────────────────────────────────────
/**
 * Generates the SHA-256 signature:integrity hash required by Wompi.
 * Concatenation: reference + amountInCents + currency + integritySecret
 * https://docs.wompi.co/docs/colombia/widget-checkout-web/
 */
export function generateIntegrityHash(
    reference: string,
    amountInCents: number,
    currency: string
): string {
    const secret = process.env.WOMPI_INTEGRITY_SECRET;
    if (!secret) throw new Error('WOMPI_INTEGRITY_SECRET is not defined');

    const data = `${reference}${amountInCents}${currency}${secret}`;
    return crypto.createHash('sha256').update(data).digest('hex');
}

// ─── Webhook Signature Verifier ─────────────────────────────────────────────
/**
 * Validates Wompi's X-Event-Checksum header.
 * Concatenation: event_timestamp + events_secret
 * Then SHA-256 of the result.
 * Returns true if the checksum matches.
 */
export function verifyWebhookSignature(body: any): boolean {
    const secret = process.env.WOMPI_EVENTS_SECRET;
    if (!secret) throw new Error('WOMPI_EVENTS_SECRET is not defined');

    const signature = body?.signature;
    const data = body?.data;
    const timestamp = body?.timestamp;

    if (!signature || !signature.properties || !signature.checksum || !data || !timestamp) {
        return false;
    }

    // 1. Concatenate the values of the fields specified in signature.properties
    let concatenatedValues = '';
    for (const prop of signature.properties) {
        const keys = prop.split('.');
        let value: any = data;
        for (const key of keys) {
            if (value && typeof value === 'object') {
                value = value[key];
            } else {
                value = undefined;
            }
        }
        if (value !== undefined && value !== null) {
            concatenatedValues += String(value);
        }
    }

    // 2. Append timestamp and secret
    const dataToHash = `${concatenatedValues}${timestamp}${secret}`;
    const expected = crypto.createHash('sha256').update(dataToHash).digest('hex');

    return expected === signature.checksum;
}
