// app/api/get-auth-rules/route.ts
import { NextResponse } from "next/server";

// Sample in-memory storage for rules
let rules = [
  {
    id: 0,
    tokenType: "pay_per_use",
    address: "ALGOPAYEEADDRESS",
    tokenId: "10458941",
    tokenAmount: "10000",
  },
  {
    id: 1,
    tokenType: "asa_nft_optional",
    address: "ALGONFTOWNERADDRESS",
    tokenId: "10458941",
    tokenAmount: "1",
  },
];

export async function GET() {
  return NextResponse.json({ rules });
}
