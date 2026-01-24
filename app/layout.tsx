import type { Metadata } from "next";
import { Playfair_Display, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import SolanaProviderWrapper from "./components/SolanaProviderWrapper";
import DarkModeEnforcer from "./components/DarkModeEnforcer";

const playfairDisplay = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IncoPay",
  description: "A confidential payment application on Solana, powered by Inco Network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" className="dark">
      <body
        className={`${playfairDisplay.variable} ${geistMono.variable} antialiased`}
      >
        <DarkModeEnforcer />
        <SolanaProviderWrapper>{children}</SolanaProviderWrapper>
      </body>
    </html>
  );
}
