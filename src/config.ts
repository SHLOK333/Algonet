// Algorand Network Configuration
export const ALGORAND_NETWORKS = {
  MAINNET: "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=",
  TESTNET: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
};

// Algorand Standard Assets (ASAs)
export const ALGORAND_ASSETS = {
  USDC_TESTNET: "10458941",
  USDC_MAINNET: "31566704",
  USDC_DECIMALS: 6,
};

// x402 Configuration
export const X402_CONFIG = {
  VERSION: 2,
  SCHEME: "exact",
  FACILITATOR_URL: process.env.NEXT_PUBLIC_FACILITATOR_URL || "https://facilitator.goplausible.xyz",
  AVM_PAYEE_ADDRESS: process.env.NEXT_PUBLIC_X402_PAYEE_ADDRESS || process.env.X402_PAYEE_ADDRESS || "",
  REDIRECT_URL: process.env.NEXT_PUBLIC_X402_REDIRECT_URL || "https://www.google.com",
};

// AlgoKit Utils Configuration
export const ALGOKIT_CONFIG = {
  ALGOD_MAINNET_URL: process.env.ALGOD_MAINNET_URL || "https://mainnet-api.algonode.cloud",
  ALGOD_TESTNET_URL: process.env.ALGOD_TESTNET_URL || "https://testnet-api.algonode.cloud",
  INDEXER_MAINNET_URL: process.env.INDEXER_MAINNET_URL || "https://mainnet-idx.algonode.cloud",
  INDEXER_TESTNET_URL: process.env.INDEXER_TESTNET_URL || "https://testnet-idx.algonode.cloud",
};

