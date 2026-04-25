"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { useMemo } from "react";

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

export default function PrivyContext({ children }: { children: React.ReactNode }) {
  const solanaConnectors = useMemo(
    () =>
      toSolanaWalletConnectors({
        shouldAutoConnect: true,
      }),
    [],
  );

  if (!APP_ID) {
    return (
      <div style={{ padding: 32, color: "#f87171", fontFamily: "monospace" }}>
        NEXT_PUBLIC_PRIVY_APP_ID not set in IncoPay/.env.local — Privy provider can&apos;t initialize.
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={APP_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#2463EB",
          walletChainType: "solana-only",
          walletList: ["phantom", "solflare", "backpack", "detected_solana_wallets"],
          logo: undefined,
        },
        loginMethodsAndOrder: {
          primary: ["email", "google", "phantom", "solflare"],
        },
        embeddedWallets: {
          ethereum: { createOnLogin: "off" },
          solana: { createOnLogin: "users-without-wallets" },
        },
        externalWallets: {
          solana: { connectors: solanaConnectors },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
