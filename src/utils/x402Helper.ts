/**
 * x402 Payment Helper Utilities
 * Builds and manages x402 V2 payment transaction groups for Algorand
 * Reference: https://spec.x402.org/v2
 */

export interface X402PaymentConfig {
  facilitorUrl: string;
  payeeAddress: string;
  paymentAmount: number;
  paymentAsset: number; // ASA ID, 0 for native ALGO
  networkId: string; // CAIP-2 identifier (e.g., "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=")
  clientAddress: string;
  metadata?: Record<string, string>;
}

export interface X402Payment {
  x402Version: number;
  network: string;
  payload: {
    paymentGroup: any[]; // base64-encoded transaction group
    paymentIndex: number;
    facilitatorAddress?: string;
    metadata?: Record<string, string>;
  };
  transactionId?: string;
  signature?: string;
}

/**
 * Parse CAIP-2 Algorand network identifier to extract chain reference
 * Example: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=" -> "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="
 */
export function parseAlgorandNetworkId(caip2: string): string {
  if (!caip2.startsWith("algorand:")) {
    throw new Error("Invalid CAIP-2 network identifier");
  }
  return caip2.replace("algorand:", "");
}

/**
 * Validate x402 V2 payment payload structure
 */
export function isValidX402Payload(payload: unknown): payload is X402Payment {
  if (!payload || typeof payload !== "object") return false;

  const p = payload as any;

  if (p.x402Version !== 2) return false;
  if (typeof p.network !== "string" || !p.network.startsWith("algorand:")) return false;
  if (!p.payload || !Array.isArray(p.payload.paymentGroup)) return false;
  if (typeof p.payload.paymentIndex !== "number") return false;
  if (p.payload.paymentIndex < 0 || p.payload.paymentIndex >= p.payload.paymentGroup.length) return false;

  return true;
}

/**
 * Build mock x402 payment structure for testing
 * In production, this requires:
 * 1. Building actual Algorand transaction group with payment + fees
 * 2. Signing with user's private key via wallet
 * 3. Encoding to base64
 * 
 * @param config Payment configuration
 * @returns X402 payment object ready for submittal to FAS
 * 
 * TODO: Replace with actual transaction building when use-wallet integration ready
 */
export function buildX402MockPayment(config: X402PaymentConfig): X402Payment {
  // Placeholder for MVP - client must provide real signed txns
  return {
    x402Version: 2,
    network: config.networkId,
    payload: {
      paymentGroup: [
        // Placeholder: these would be base64-encoded signed Algorand transactions
        encodeBase64(JSON.stringify({
          type: "pay",
          from: config.clientAddress,
          to: config.payeeAddress,
          amount: config.paymentAmount,
          assetId: config.paymentAsset,
        })),
      ],
      paymentIndex: 0,
      facilitatorAddress: config.facilitorUrl,
      metadata: config.metadata || {
        timestamp: new Date().toISOString(),
        purpose: "wifi-access",
      },
    },
  };
}

/**
 * Format x402 payment for display (truncate large fields)
 */
export function formatX402PaymentSummary(payment: X402Payment): string {
  return `x402 V${payment.x402Version} | Network: ${payment.network} | Tx Group Size: ${payment.payload.paymentGroup.length}`;
}

/**
 * Build X-PAYMENT header value for HTTP x402 protocol
 */
export function buildX402Header(payment: X402Payment): string {
  return `x402 ${encodeBase64(JSON.stringify(payment))}`;
}

/**
 * Parse X-PAYMENT header value
 */
export function parseX402Header(headerValue: string): X402Payment | null {
  try {
    if (!headerValue.startsWith("x402 ")) return null;
    const base64Payload = headerValue.slice(5);
    const jsonPayload = decodeBase64(base64Payload);
    const payment = JSON.parse(jsonPayload) as X402Payment;
    return isValidX402Payload(payment) ? payment : null;
  } catch {
    return null;
  }
}

function encodeBase64(value: string): string {
  if (typeof btoa === "function") {
    return btoa(value);
  }

  return Buffer.from(value, "utf-8").toString("base64");
}

function decodeBase64(value: string): string {
  if (typeof atob === "function") {
    return atob(value);
  }

  return Buffer.from(value, "base64").toString("utf-8");
}
