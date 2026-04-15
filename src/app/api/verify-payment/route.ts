import { NextResponse } from "next/server";
import { withX402Auth } from "@x402-avm/next";
import crypto from "crypto";

const EXPECTED_PAYEE = process.env.NEXT_PUBLIC_X402_PAYEE_ADDRESS || "TKUTQNBZAMY26ZT6AYRX26556WUYCB65I5QLUHB6NPY6ZDKYD7VZECHPMU";
const FAS_KEY = "mysecretkey";

// The withX402Auth wrapper natively decodes the x402 header & verifies the crypto signature.
export const POST = withX402Auth(async (req, paymentContext) => {
  try {
    const { ip, tok } = await req.json().catch(() => ({ ip: null, tok: null }));

    console.log("✅ Blockchain validation passed via x402 AVM native wrapper.");

    const clientIP = ip || "127.0.0.1";
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

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

    const mockHid = "dummy-hid";
    const hash = crypto.createHash("sha256").update(mockHid + FAS_KEY).digest("hex");

    return NextResponse.json({
      success: true,
      message: "Authorized via x402-AVM",
      token: hash,
      verifiedTx: paymentContext.txId
    }, { status: 200 });

  } catch (error: any) {
    console.error("Verification backend error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}, {
  expectedPayee: EXPECTED_PAYEE,
  expectedAssets: [0], // 0 validates it is ALGO strictly 
});