import { NextResponse } from "next/server";
import crypto from "crypto";

// Ensure this matches your Next.js config or adjust dynamically
const ALGOD_SERVER = process.env.NEXT_PUBLIC_INDEXER_TESTNET_URL || "https://testnet-idx.algonode.cloud";
const EXPECTED_PAYEE = process.env.NEXT_PUBLIC_X402_PAYEE_ADDRESS || "TKUTQNBZAMY26ZT6AYRX26556WUYCB65I5QLUHB6NPY6ZDKYD7VZECHPMU";
const EXPECTED_AMOUNT = 100000; // 0.1 ALGO in microAlgos
const FAS_KEY = "mysecretkey"; // Define this properly or read from .env for openNDS auth

export async function POST(req: Request) {
  try {
    const { wallet, txId, ip, tok } = await req.json();

    if (!wallet || !txId) {
      return NextResponse.json({ message: "Missing wallet or txId parameters" }, { status: 400 });
    }

    // 1. Verify Transaction on Algorand Indexer
    console.log(`Verifying txId: ${txId} for wallet: ${wallet}`);
    const response = await fetch(`${ALGOD_SERVER}/v2/transactions/${txId}`);

    if (!response.ok) {
      return NextResponse.json({ message: "Transaction not found on blockchain" }, { status: 400 });
    }

    const data = await response.json();
    const transaction = data?.transaction || data?.transactions?.[0] || data;
    const paymentTransaction = transaction?.paymentTransaction || transaction?.["payment-transaction"] || transaction?.payment_transaction;
    
    const sender = transaction?.sender || transaction?.senderAddress || transaction?.from;
    const receiver = paymentTransaction?.receiver || paymentTransaction?.rcv || paymentTransaction?.to;
    const amount = Number(paymentTransaction?.amount ?? paymentTransaction?.amt ?? 0);
    const txType = transaction?.txType || transaction?.["tx-type"] || transaction?.type;

    // 2. Validate Payment Rules
    if (txType !== "pay") {
      return NextResponse.json({ message: "Invalid transaction type" }, { status: 400 });
    }
    if (String(sender).toLowerCase() !== String(wallet).toLowerCase()) {
      return NextResponse.json({ message: "Sender mismatch" }, { status: 400 });
    }
    if (String(receiver).toLowerCase() !== String(EXPECTED_PAYEE).toLowerCase()) {
      return NextResponse.json({ message: "Receiver mismatch" }, { status: 400 });
    }
    if (amount < EXPECTED_AMOUNT) {
      return NextResponse.json({ message: "Insufficient payment amount" }, { status: 400 });
    }

    console.log("✅ Blockchain validation passed.");

    // 3. Optional: Notify OpenNDS (Mock or Physical)
    const clientIP = ip || "127.0.0.1";
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      // Tell Router that user paid
      const authRes = await fetch("http://192.168.130.210:5002/api/verified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientip: clientIP }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!authRes.ok) console.warn("Failed router /api/verified");
    } catch (e: any) {
      console.warn("Mock Auth: Physical router unreachable, ignoring...", e.message);
    }

    // Generate OpenNDS SHA256 Auth Hash
    // Example format: sha256(hid + faskey). If we don't have "hid", you can generate a random token or adapt OpenNDS script.
    const mockHid = "dummy-hid";
    const hash = crypto.createHash("sha256").update(mockHid + FAS_KEY).digest("hex");
    
    return NextResponse.json({
      success: true,
      message: "Authorized",
      token: hash
    }, { status: 200 });

  } catch (error: any) {
    console.error("Verification backend error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}