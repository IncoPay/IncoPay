"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";

// Dynamically import SolanaProvider to avoid SSR issues with Solana packages
const SolanaProvider = dynamic(
  () => import("./SolanaProvider").then((mod) => ({ default: mod.SolanaProvider })),
  { 
    ssr: false,
    loading: () => null
  }
);

interface SolanaProviderWrapperProps {
  children: ReactNode;
}

export default function SolanaProviderWrapper({ children }: SolanaProviderWrapperProps) {
  return <SolanaProvider>{children}</SolanaProvider>;
}
