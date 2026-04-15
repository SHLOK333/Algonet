import crypto from "crypto";

import { NextResponse } from "next/server";

import { ALGOKIT_CONFIG, X402_CONFIG } from "@/config";

const faskey = "mysecretkey";

function decodeToJson(base64String) {
  const decodedString = atob(base64String);
  const keyValuePairs = decodedString.split(", ").reduce((acc, pair) => {
    const [key, value] = pair.split("=");
    acc[key] = value ? decodeURIComponent(value) : null;
    return acc;
  }, {});
  return keyValuePairs;
}

async function verifyAsaHolding(algorandAddress, assetId, minAmount) {
  const url = `${ALGOKIT_CONFIG.INDEXER_TESTNET_URL}/v2/accounts/${algorandAddress}/assets/${assetId}`;
  const response = await fetch(url);

  if (!response.ok) return false;

  const data = await response.json();
  const currentAmount = Number(data?.assetHolding?.amount ?? 0);
  return currentAmount >= Number(minAmount || 1);
}

async function verifyX402Payment(paymentProof) {
  try {
    if (!paymentProof || typeof paymentProof !== "object") return false;
    if (!paymentProof.txid || !paymentProof.sender || !paymentProof.receiver) return false;
    if (!paymentProof.network || !String(paymentProof.network).startsWith("algorand:")) return false;

    const expectedPayee = X402_CONFIG.AVM_PAYEE_ADDRESS;
    if (!expectedPayee) return false;

    const response = await fetch(`${ALGOKIT_CONFIG.INDEXER_TESTNET_URL}/v2/transactions/${paymentProof.txid}`);

    if (!response.ok) {
      console.warn("Testnet transaction lookup failed:", response.status);
      return false;
    }

    const data = await response.json();
    const transaction = data?.transaction || data?.transactions?.[0] || data;
    const paymentTransaction = transaction?.paymentTransaction || transaction?.["payment-transaction"] || transaction?.payment_transaction;
    const sender = transaction?.sender || transaction?.senderAddress || transaction?.from;
    const receiver = paymentTransaction?.receiver || paymentTransaction?.rcv || paymentTransaction?.to;
    const amount = Number(paymentTransaction?.amount ?? paymentTransaction?.amt ?? 0);
    const txType = transaction?.txType || transaction?.["tx-type"] || transaction?.type;

    if (txType !== "pay") {
      return false;
    }

    if (String(sender) !== String(paymentProof.sender)) return false;
    if (String(receiver) !== String(expectedPayee)) return false;
    if (amount !== Number(paymentProof.amountMicroAlgos)) return false;

    return true;
  } catch (error) {
    console.error("x402 payment verification error:", error);
    return false;
  }
}
export async function POST(req) {
  try {
    const { query, algorandAddress, authMode, paymentProof, nftOption } = await req.json();

    if (!algorandAddress) {
      return NextResponse.json({ message: "Missing Algorand address" }, { status: 400 });
    }

    if (authMode === "pay_per_use") {
      const verified = await verifyX402Payment(paymentProof);
      if (!verified) {
        return NextResponse.json({ message: "Invalid or unconfirmed Testnet payment" }, { status: 401 });
      }
    }

    if (authMode === "asa_nft_optional") {
      const hasAsa = await verifyAsaHolding(
        algorandAddress,
        nftOption?.assetId || "10458941",
        nftOption?.minAmount || "1",
      );
      if (!hasAsa) {
        return NextResponse.json({ message: "Auth failed: ASA/NFT rule not satisfied" }, { status: 403 });
      }
    }

    const { clientip, hid } = query ? decodeToJson(query) : { clientip: "127.0.0.1", hid: "dummy-hid" };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch("http://192.168.130.210:5002/api/verified", {  
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clientip }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Failed to notify preauth verifier");
      }
    } catch (e) {
      console.warn("Mock Auth: Preauth verifier unreachable, continuing locally...", e.message);
    }

    const hash = crypto.createHash("sha256").update(hid + faskey).digest("hex");
    const nds_ip = "192.168.150.1";
    const nds_port = "2050";
    const authdir = "/";
    const tok = hash;
    const redir = X402_CONFIG.REDIRECT_URL;

    const ndsUrl = `http://${nds_ip}:${nds_port}${authdir}?tok=${tok}&redir=${redir}&custom=`;
    return NextResponse.json({ redirectUrl: ndsUrl }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server Error, try again" }, { status: 500 });
  }
}

export const revalidate = 0;
