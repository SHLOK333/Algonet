"use client";

import { type ChangeEvent, type FC, useEffect, useState } from "react";
import {
  Button,
  HStack,
  Input,
  Select,
  Text,
  Textarea,
  useToast,
  VStack,
} from "@chakra-ui/react";
import {
  Algodv2,
  algosToMicroalgos,
  makePaymentTxnWithSuggestedParamsFromObject,
  waitForConfirmation,
} from "algosdk";
import { PeraWalletConnect } from "@perawallet/connect";
import { encodePaymentSignatureHeader } from "@x402-avm/core/http";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

import { ALGOKIT_CONFIG, ALGORAND_NETWORKS, X402_CONFIG } from "@/config";

type SignMessageProps = {
  query: string | null;
};

type PaymentProof = {
  txid: string;
  sender: string;
  receiver: string;
  amountMicroAlgos: number;
  network: string;
  confirmedRound: number;
};

const SignMessage: FC<SignMessageProps> = ({ query }) => {
  const [peraWallet] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        Object.defineProperty(window.navigator, "maxTouchPoints", {
          get: () => 0,
        });
      } catch (e) {
        // Ignore if not configurable
      }
    }
    return new PeraWalletConnect({ shouldShowSignTxnToast: false });
  });
  const [algorandAddress, setAlgorandAddress] = useState("");
  const [authMode, setAuthMode] = useState<"pay_per_use" | "asa_nft_optional">("pay_per_use");
  const [paymentProof, setPaymentProof] = useState<PaymentProof | null>(null);
  const [assetId, setAssetId] = useState("10458941");
  const [minAmount, setMinAmount] = useState("1");
  const [paymentAmount, setPaymentAmount] = useState("0.1");
  const [isPending, setIsPending] = useState(false);
  const [isPeraConnected, setIsPeraConnected] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;

    const reconnect = async () => {
      try {
        const accounts = await peraWallet.reconnectSession();
        if (!cancelled && accounts?.length > 0) {
          setAlgorandAddress(accounts[0]);
          setIsPeraConnected(true);
        }
      } catch {
        // No persisted Pera session yet.
      }
    };

    void reconnect();

    return () => {
      cancelled = true;
    };
  }, [peraWallet]);

  const handlePeraConnect = async () => {
    try {
      const accounts = await peraWallet.connect();
      if (accounts?.length > 0) {
        setAlgorandAddress(accounts[0]);
        setIsPeraConnected(true);
        toast({
          title: "Pera Wallet connected.",
          description: "Algorand address imported from Pera Wallet.",
          status: "success",
          duration: 4000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "Pera Wallet connection failed.",
        description: error instanceof Error ? error.message : "Unable to connect to Pera Wallet.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handlePeraDisconnect = async () => {
    try {
      await peraWallet.disconnect();
      setIsPeraConnected(false);
      toast({
        title: "Pera Wallet disconnected.",
        status: "info",
        duration: 2500,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Disconnect failed.",
        description: error instanceof Error ? error.message : "Unable to disconnect Pera Wallet.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const handleRealTestnetPayment = async () => {
    if (!algorandAddress) {
      throw new Error("Connect Pera Wallet first or enter an Algorand address.");
    }

    if (!X402_CONFIG.AVM_PAYEE_ADDRESS) {
      throw new Error("NEXT_PUBLIC_X402_PAYEE_ADDRESS is not configured.");
    }

    const amountMicroAlgos = Number(algosToMicroalgos(Number(paymentAmount)));
    const algodClient = new Algodv2("", ALGOKIT_CONFIG.ALGOD_TESTNET_URL, "");
    const suggestedParams = await algodClient.getTransactionParams().do();

    const paymentTxn = makePaymentTxnWithSuggestedParamsFromObject({
      sender: algorandAddress,
      receiver: X402_CONFIG.AVM_PAYEE_ADDRESS,
      amount: amountMicroAlgos,
      suggestedParams,
      note: new TextEncoder().encode(`x402:${Date.now()}`),
    });

    const signedTxns = await peraWallet.signTransaction([[{ txn: paymentTxn, signers: [algorandAddress] }]]);
    const submitResponse = await algodClient.sendRawTransaction(signedTxns[0]).do();
    const txid = submitResponse.txid || submitResponse.txId || submitResponse.txID;

    if (!txid) {
      throw new Error("Unable to obtain txid for the submitted payment.");
    }

    const confirmedTxn = await waitForConfirmation(algodClient, txid, 4);
    const confirmedRound = Number(confirmedTxn.confirmedRound ?? confirmedTxn["confirmed-round"] ?? 0);

    const proof: PaymentProof = {
      txid,
      sender: algorandAddress,
      receiver: X402_CONFIG.AVM_PAYEE_ADDRESS,
      amountMicroAlgos,
      network: ALGORAND_NETWORKS.TESTNET,
      confirmedRound,
    };

    setPaymentProof(proof);
    return proof;
  };

  const handleAuthenticate = async () => {
    setIsPending(true);
    try {
      let paymentProofForAuth: PaymentProof | null = paymentProof;

      if (authMode === "pay_per_use") {
        paymentProofForAuth = await handleRealTestnetPayment();
      }

      const response = await fetch("/api/fas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          algorandAddress,
          authMode,
          paymentProof: paymentProofForAuth,
          nftOption: {
            assetId,
            minAmount,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Access granted.",
          description: "Algorand authentication successful.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        window.location.href = data.redirectUrl;
      } else {
        toast({
          title: "Access denied.",
          description: data.message || "Authentication failed.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch {
      toast({
        title: "Error.",
        description: "Invalid payload or server error while authenticating.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <VStack w={"45%"} minWidth={"270px"} gap={3} align="stretch">
      <HStack justify="space-between" w="100%">
        <Text fontSize="sm" color="gray.300">
          Pera Wallet {isPeraConnected ? "connected" : "disconnected"}
        </Text>
        {isPeraConnected ? (
          <Button size="sm" variant="outline" colorScheme="red" onClick={handlePeraDisconnect}>
            Disconnect Pera
          </Button>
        ) : (
          <Button size="sm" colorScheme="blue" onClick={handlePeraConnect}>
            Connect Pera Wallet
          </Button>
        )}
      </HStack>

      <Input
        value={algorandAddress}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setAlgorandAddress(e.target.value)}
        placeholder="Algorand wallet address"
      />

      <Select
        aria-label="Authentication mode"
        title="Authentication mode"
        value={authMode}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => setAuthMode(e.target.value as "pay_per_use" | "asa_nft_optional")}
      >
        <option value="pay_per_use">Pay-per-use (x402)</option>
        <option value="asa_nft_optional">Optional ASA/NFT Verification</option>
      </Select>

      {authMode === "pay_per_use" && (
        <>
          <Input
            type="number"
            step="0.001"
            value={paymentAmount}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPaymentAmount(e.target.value)}
            placeholder="Payment amount (ALGO on Testnet)"
          />
          <Button
            size="sm"
            colorScheme="purple"
            variant="outline"
            onClick={handleAuthenticate}
            isDisabled={!algorandAddress}
          >
            Pay with Pera Wallet and Authenticate
          </Button>
        </>
      )}

      {paymentProof && authMode === "pay_per_use" && (
        <Textarea value={JSON.stringify(paymentProof, null, 2)} readOnly fontSize="xs" maxH="150px" />
      )}

      {authMode === "asa_nft_optional" && (
        <>
          <Input
            value={assetId}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetId(e.target.value)}
            placeholder="ASA ID for optional NFT/token check"
          />
          <Input
            value={minAmount}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setMinAmount(e.target.value)}
            placeholder="Minimum ASA amount"
          />
        </>
      )}

      {authMode === "asa_nft_optional" && (
        <Button variant="ghost" onClick={handleAuthenticate} isLoading={isPending} className="custom-button">
          Authenticate With Algorand
        </Button>
      )}

      {authMode === "pay_per_use" && paymentProof && (
        <Text fontSize="xs" color="gray.400">
          Real Testnet payment confirmed in round {paymentProof.confirmedRound}.
        </Text>
      )}
    </VStack>
  );
};

export default SignMessage;
