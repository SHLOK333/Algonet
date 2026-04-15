import type { ReactNode } from "react";

import "@/styles/globals.css";
import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";

import { Providers } from "./providers";

const open_sans = Open_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NexPager",
  applicationName: "NexPager",
  description: "Algorand x402 WiFi Authentication Protocol",
  authors: {
    name: "Mohit",
    url: "",
  },
  icons: "NexPager-favicon.png",
  manifest: "site.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={open_sans.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
