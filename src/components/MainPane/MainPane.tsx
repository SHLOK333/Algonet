"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PeraWalletConnect } from "@perawallet/connect";
import algosdk from "algosdk";

// Configuration for Algorand TestNet
const ALGOD_SERVER = process.env.NEXT_PUBLIC_ALGOD_TESTNET_URL || "https://testnet-api.algonode.cloud";
const fallbackPayee = "TKUTQNBZAMY26ZT6AYRX26556WUYCB65I5QLUHB6NPY6ZDKYD7VZECHPMU";
const RECEIVER_WALLET = process.env.NEXT_PUBLIC_X402_PAYEE_ADDRESS ? process.env.NEXT_PUBLIC_X402_PAYEE_ADDRESS : fallbackPayee; 
const PAYMENT_ALGO = 0.1;

// Instantiate PeraWalletConnect
const peraWallet = new PeraWalletConnect({ shouldShowSignTxnToast: false });

const MainPane = () => {
  const searchParams = useSearchParams();
  
  // URL Params State
  const [tok, setTok] = useState<string | null>(null);
  const [ip, setIp] = useState<string | null>(null);

  // App & Wallet State
  const [accountAddress, setAccountAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "pending_sig" | "confirming" | "verifying" | "unlocked" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Extract query parameters from OpenNDS (tok, ip)
    setTok(searchParams.get("tok") || searchParams.get("fas"));
    setIp(searchParams.get("ip") || searchParams.get("clientip"));

    // Reconnect to wallet if session exists
    peraWallet.reconnectSession().then((accounts) => {
      if (accounts.length > 0) {
        setAccountAddress(accounts[0]);
      }
    }).catch(console.error);

    // Clean up on disconnect
    peraWallet.connector?.on("disconnect", () => {
      setAccountAddress(null);
    });
  }, [searchParams]);

  // STEP 1: Connect Wallet
  const connectWallet = async () => {
    try {
      setStatus("connecting");
      setErrorMessage(null);
      const newAccounts = await peraWallet.connect();
      if (newAccounts.length > 0) {
        setAccountAddress(newAccounts[0]);
        setStatus("idle");
      }
    } catch (error: any) {
      if (error?.data?.type !== "CONNECT_MODAL_CLOSED") {
        setErrorMessage("Connecting wallet failed. Please ensure the Pera app is installed.");
      }
      setStatus("idle");
    }
  };

  const disconnectWallet = () => {
    peraWallet.disconnect();
    setAccountAddress(null);
  };

  // STEP 2 & 4: Sign, Broadcast, & Verify Payment
  const processPayment = async () => {
    if (!accountAddress) return;

    try {
      setStatus("pending_sig");
      setErrorMessage(null);

      const algod = new algosdk.Algodv2("", ALGOD_SERVER, "");
      const suggestedParams = await algod.getTransactionParams().do();

      // Create Payment Transaction
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: accountAddress,
        receiver: RECEIVER_WALLET,
        amount: algosdk.algosToMicroalgos(PAYMENT_ALGO),
        suggestedParams,
      });

      // Prepare signature request for Pera
      const singleTxnGroup = [{ txn, signers: [accountAddress] }];
      const signedTxn = await peraWallet.signTransaction([singleTxnGroup]);

      setStatus("confirming");
      
      // Broadcast to Algorand TestNet
      const { txid } = await algod.sendRawTransaction(signedTxn).do();

      // Wait for block confirmation
      await algosdk.waitForConfirmation(algod, txid, 4);

      // STEP 4: Call Backend API Verification
      setStatus("verifying");
      const response = await fetch("/api/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: accountAddress,
          txId: txid,
          ip: ip,
          tok: tok
        }),
      });

      if (!response.ok) {
        throw new Error("Verification by server failed.");
      }

      // STEP 5: Success Flow
      setStatus("unlocked");
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error?.message || "Transaction failed or was rejected.");
      setStatus("idle");
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0A0D14", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px", fontFamily: "sans-serif", color: "#E2E8F0" }}>
      
      <div style={{ width: "100%", maxWidth: "440px", backgroundColor: "#111722", border: "1px solid #1F2937", borderRadius: "16px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", overflow: "hidden", display: "flex", flexDirection: "column", position: "relative", paddingBottom: "24px" }}>
        
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "32px", paddingBottom: "24px", paddingLeft: "24px", paddingRight: "24px" }}>
          <div style={{ backgroundColor: "#12D4A3", color: "#0A0D14", width: "56px", height: "56px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "900", marginBottom: "16px" }}>
            A
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: "600", color: "white", letterSpacing: "0.025em", margin: 0 }}>Algorand WiFi Portal</h1>
          <p style={{ color: "#9CA3AF", fontSize: "15px", marginTop: "4px", marginBottom: 0 }}>Verify your wallet to get internet access</p>
        </div>

        {/* Subtle Divider line */}
        <div style={{ height: "1px", width: "100%", backgroundColor: "#1C2533" }}></div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Status Box */}
          <div style={{ backgroundColor: "#19212E", border: "1px solid #263143", borderRadius: "8px", padding: "16px", display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <div style={{ width: "10px", height: "10px", backgroundColor: "#12D4A3", borderRadius: "50%", boxShadow: "0 0 8px #12D4A3" }}></div>
            <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
              <span style={{ fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>Connected to</span>
              <span style={{ fontSize: "15px", fontWeight: 500, color: "#E2E8F0" }}>AlgoNet Hotspot</span>
            </div>
          </div>

          {/* Dynamic States */}
          {status === "unlocked" ? (
            <div style={{ backgroundColor: "#19212E", border: "1px solid #12D4A3", borderRadius: "12px", padding: "24px", textAlign: "center" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#12D4A3", marginBottom: "8px", marginTop: 0 }}>🌍 Internet Unlocked!</h2>
              <p style={{ color: "#D1D5DB", fontWeight: 500, margin: 0 }}>You now have 60 minutes of premium access.</p>
              <p style={{ fontSize: "14px", color: "#6B7280", marginTop: "8px", marginBottom: 0 }}>You can minimize or close this window now to start browsing.</p>
            </div>
          ) : (
            <>
              {/* Form Content */}
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", textAlign: "left" }}>
                  <label style={{ fontSize: "12px", textTransform: "uppercase", color: "#6B7280", fontWeight: "bold", letterSpacing: "0.1em" }}>
                    ENTER YOUR ALGORAND WALLET ADDRESS
                  </label>
                  <div style={{ backgroundColor: "#1F2633", border: "1px solid #2D384A", borderRadius: "8px", padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "14px", color: "#D1D5DB", opacity: 0.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {accountAddress 
                        ? `${accountAddress.slice(0, 16)}...${accountAddress.slice(-8)}` 
                        : "ALGO... (58 characters)"}
                    </span>
                    {accountAddress && (
                      <button onClick={disconnectWallet} style={{ fontSize: "12px", color: "#F87171", fontWeight: "bold", background: "none", border: "none", cursor: "pointer", marginLeft: "8px" }}>
                        Disconnect
                      </button>
                    )}
                  </div>
                </div>

                {!accountAddress ? (
                  <>
                    <button
                      onClick={connectWallet}
                      disabled={status === "connecting"}
                     style={{ width: "100%", backgroundColor: "transparent", border: "1px solid #2D3A4F", color: "#E2E8F0", fontWeight: 600, padding: "14px 16px", borderRadius: "8px", cursor: status === "connecting" ? "not-allowed" : "pointer", opacity: status === "connecting" ? 0.5 : 1, transition: "all 0.2s" }}
                    >
                      {status === "connecting" ? "Connecting..." : "Look up wallet"}
                    </button>

                    <div style={{ display: "flex", alignItems: "center", gap: "16px", margin: "8px 0" }}>
                      <div style={{ flex: 1, height: "1px", backgroundColor: "#1C2533" }}></div>
                      <span style={{ color: "#4B5563", fontSize: "14px", fontWeight: 500 }}>then</span>
                      <div style={{ flex: 1, height: "1px", backgroundColor: "#1C2533" }}></div>
                    </div>

                    <button
                      onClick={connectWallet}
                      disabled={status === "connecting"}
                      style={{ width: "100%", backgroundColor: "transparent", border: "1px solid #2D3A4F", color: "#E2E8F0", fontWeight: 600, padding: "14px 16px", borderRadius: "8px", cursor: status === "connecting" ? "not-allowed" : "pointer", opacity: status === "connecting" ? 0.5 : 1, transition: "all 0.2s" }}
                    >
                      Connect wallet & get internet
                    </button>
                  </>
                ) : (
                  <>
                    {/* Step 2: Pay flow when connected */}
                    <div style={{ backgroundColor: "#19212E", border: "1px solid rgba(18, 212, 163, 0.2)", borderRadius: "8px", padding: "16px", textAlign: "center", marginTop: "16px", marginBottom: "16px" }}>
                      <h3 style={{ fontSize: "24px", fontWeight: 900, color: "#12D4A3", margin: 0 }}>{PAYMENT_ALGO} ALGO</h3>
                      <p style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "4px", marginBottom: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>for 60 minutes access</p>
                    </div>

                    <button
                      onClick={processPayment}
                      disabled={status !== "idle"}
                      style={{ width: "100%", backgroundColor: "#1F2633", border: "1px solid #2D3A4F", color: "white", fontWeight: 600, padding: "14px 16px", borderRadius: "8px", cursor: status !== "idle" ? "not-allowed" : "pointer", opacity: status !== "idle" ? 0.5 : 1, transition: "all 0.2s" }}
                    >
                      {status === "idle" && "Pay & Unock Internet"}
                      {status === "pending_sig" && "Awaiting Pera App..."}
                      {status === "confirming" && "Checking Blockchain..."}
                      {status === "verifying" && "Verifying Access..."}
                    </button>
                  </>
                )}

                {errorMessage && (
                  <p style={{ color: "#F87171", fontSize: "14px", fontWeight: 500, marginTop: "8px", backgroundColor: "rgba(69, 10, 10, 0.3)", padding: "12px", border: "1px solid rgba(127, 29, 29, 0.5)", borderRadius: "4px", textAlign: "center" }}>
                    ⚠️ {errorMessage}
                  </p>
                )}

                <div style={{ textAlign: "center", paddingTop: "16px" }}>
                  <button style={{ fontSize: "13px", color: "#6B7280", textDecoration: "underline", textUnderlineOffset: "4px", background: "none", border: "none", cursor: "pointer" }}>
                    Skip — just browse without wallet
                  </button>
                </div>
                
              </div>
            </>
          )}

        </div>

      </div>
      
      {/* Footer Branding outside the card */}
      <div style={{ marginTop: "32px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "#6B7280" }}>
        <div style={{ width: "6px", height: "6px", backgroundColor: "#12D4A3", borderRadius: "50%" }}></div>
        <p style={{ fontSize: "12px", margin: 0 }}>Powered by Algorand blockchain · Carbon negative since 2021</p>
      </div>

    </div>
  );
};

export default MainPane;
