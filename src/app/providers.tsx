"use client";
import { type ReactNode, useState, useEffect } from "react";

import { CacheProvider } from "@chakra-ui/next-js";
import { extendTheme, ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { WalletProvider } from "@txnlab/use-wallet";
export function Providers({ children }: Readonly<{ children: ReactNode }>) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const queryClient = new QueryClient();

  const theme = extendTheme({ initialColorMode: "dark", useSystemColorMode: false });

  return (
    <QueryClientProvider client={queryClient}>
      <CacheProvider>
        <ChakraProvider resetCSS theme={theme}>{mounted && children}</ChakraProvider>
      </CacheProvider>
    </QueryClientProvider>
  );
}
