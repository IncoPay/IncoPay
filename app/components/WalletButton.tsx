"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import WalletMultiButton to avoid SSR issues
const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export default function WalletButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="px-4 py-2 bg-[var(--button-bg)] text-[var(--button-text)] rounded-lg font-medium text-sm sm:text-base opacity-50">
        Loading...
      </div>
    );
  }

  return (
    <div className="wallet-button-wrapper">
      <WalletMultiButton />
    </div>
  );
}
