"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const SlotMachine = dynamic(
  () => import("./SlotMachine").then((m) => ({ default: m.SlotMachine })),
  { ssr: false }
);

export default function SlotPage() {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="pointer-events-none absolute -z-10 inset-0">
        <div className="absolute w-[40rem] h-[40rem] bg-[#2463EB]/15 rounded-full blur-3xl opacity-60 top-[-10rem] right-[-10rem] animate-pulse" />
        <div className="absolute w-[40rem] h-[40rem] bg-[#2463EB]/10 rounded-full blur-3xl opacity-50 bottom-[-10rem] left-[-10rem] animate-pulse" />
      </div>

      <header className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 border-b border-white/10 bg-black/60 backdrop-blur-sm relative z-20">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#2463EB] flex items-center justify-center">
            <svg
              className="w-6 h-6 sm:w-7 sm:h-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
              <circle cx="12" cy="14" r="1.5" fill="white" />
              <circle cx="9" cy="12" r="1.5" fill="white" />
              <circle cx="15" cy="12" r="1.5" fill="white" />
            </svg>
          </div>
          <Link
            href="/"
            className="text-lg sm:text-2xl font-bold font-serif hover:opacity-80"
          >
            IncoPay
          </Link>
        </div>
        <nav className="flex items-center gap-3 sm:gap-4 text-sm">
          <Link
            href="/started"
            className="px-3 sm:px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/sessions"
            className="px-3 sm:px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors inline-flex items-center gap-2"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Sessions
          </Link>
          <Link
            href="/slot"
            className="px-4 sm:px-5 py-2 rounded-lg bg-[#2463EB] text-white font-medium hover:bg-[#1d4ed8] transition-colors inline-flex items-center gap-2 shadow-lg shadow-[#2463EB]/30"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <circle cx="12" cy="12" r="2" />
            </svg>
            Slot
          </Link>
        </nav>
      </header>

      <main className="relative z-10 pt-12 pb-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold font-serif tracking-tight text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-white/80 to-white/40">
              Pull Once, Settle Many — Privately
            </h1>
            <p className="text-lg text-white/50 max-w-2xl mx-auto">
              Every lever pull is a confidential{" "}
              <span className="text-[#60A5FA] font-semibold">0.10 USDC</span>{" "}
              settle on Solana via{" "}
              <span className="text-[#60A5FA] font-semibold">Inco Lightning</span>,
              backed by a one-time{" "}
              <span className="font-mono text-white/70">approve</span> signature.
            </p>
          </div>

          <SlotMachine />
        </div>
      </main>
    </div>
  );
}
