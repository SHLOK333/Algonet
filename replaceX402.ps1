# 1. Update SignMessage.tsx
$file1 = 'e:\AlgoBharat\algonet\src\components\MainPane\components\SignMessage.tsx'
$content1 = Get-Content $file1 -Raw
$content1 = $content1 -replace 'const mockX402HeaderValue = x402 \$\[Buffer[^;]*;', 'const { encodePaymentSignatureHeader } = await import("@x402-avm/core/http");
      const { ALGORAND_TESTNET_CAIP2 } = await import("@x402-avm/avm");
      const base64Txn = Buffer.from(signedTxn[0]).toString("base64");
      const mockX402HeaderValue = encodePaymentSignatureHeader({
        x402Version: 2,
        network: ALGORAND_TESTNET_CAIP2,
        payload: { paymentGroup: [base64Txn], paymentIndex: 0 }
      });'
Set-Content -Path $file1 -Value $content1

# 2. Update API verify-payment
$file2 = 'e:\AlgoBharat\algonet\src\app\api\verify-payment\route.ts'
$content2 = @"
import { NextResponse } from 'next/server';
import { withX402Auth } from '@x402-avm/next';

const EXPECTED_PAYEE = process.env.NEXT_PUBLIC_X402_PAYEE_ADDRESS || "TKUTQNBZAMY26ZT6AYRX26556WUYCB65I5QLUHB6NPY6ZDKYD7VZECHPMU";

export const GET = withX402Auth(async (req, paymentContext) => {
  return NextResponse.json({
    success: true,
    verifiedTx: paymentContext?.txId,
    message: "Valid Payment verified cryptographically by x402 AVM.",
  });
}, { expectedPayee: EXPECTED_PAYEE, expectedAssets: [0] });

export const POST = withX402Auth(async (req, paymentContext) => {
  return NextResponse.json({
    success: true,
    verifiedTx: paymentContext?.txId,
    message: "Valid Payment verified cryptographically by x402 AVM.",
  });
}, { expectedPayee: EXPECTED_PAYEE, expectedAssets: [0] });
