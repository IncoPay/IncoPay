"use client";
import React from "react";
import Link from "next/link";
import { BackgroundBeams } from "../components/background-beams";
import WalletButton from "../components/WalletButton";
import Plasma from "@/components/Plasma";

export default function Started() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex">
      {/* Left side - Logo, Name, Theme Toggle, and Payment Box */}
      <div className="w-1/2 relative flex flex-col px-8 py-6 sm:px-12 sm:py-8">
        {/* Header at top */}
        <div className="w-full flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[var(--button-bg)] flex items-center justify-center">
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7 text-white transition-colors"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Cloud shape */}
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" stroke="white" strokeWidth="1.5" fill="none"/>
                {/* Data nodes inside cloud */}
                <circle cx="12" cy="14" r="1.5" fill="white"/>
                <circle cx="9" cy="12" r="1.5" fill="white"/>
                <circle cx="15" cy="12" r="1.5" fill="white"/>
                <circle cx="10.5" cy="16" r="1.5" fill="white"/>
                <circle cx="13.5" cy="16" r="1.5" fill="white"/>
                {/* Connection lines */}
                <line x1="12" y1="14" x2="9" y2="12" stroke="white" strokeWidth="0.8" opacity="0.4"/>
                <line x1="12" y1="14" x2="15" y2="12" stroke="white" strokeWidth="0.8" opacity="0.4"/>
                <line x1="12" y1="14" x2="10.5" y2="16" stroke="white" strokeWidth="0.8" opacity="0.4"/>
                <line x1="12" y1="14" x2="13.5" y2="16" stroke="white" strokeWidth="0.8" opacity="0.4"/>
              </svg>
            </div>
            <Link href="/" className="text-lg sm:text-2xl font-bold text-[var(--text-primary)] font-serif hover:opacity-80 transition-opacity cursor-pointer">
              IncoPay
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <WalletButton />
          </div>
        </div>
        
        {/* Payment Box - Centered in middle */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text-primary)] font-serif">
            402 Premium Content
          </h2>
          <div className="w-full max-w-lg bg-[var(--bg-box)] border border-[var(--border-color)] rounded-lg p-8 sm:p-10 space-y-6">
            <p className="text-base sm:text-lg text-[var(--text-paragraph)] font-sans">
              Access exclusive content through confidential x402
            </p>
            <div className="space-y-4">
              <p className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] font-sans">
                Price: 1 USDC
              </p>
              <button className="w-full px-6 py-3 bg-[var(--button-bg)] text-[var(--button-text)] rounded-lg font-medium hover:opacity-90 transition-all duration-200 text-base sm:text-lg">
                Pay
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - Text Content with Plasma Background */}
      <div className="w-1/2 h-screen rounded-md bg-black relative antialiased overflow-hidden">
        {/* Plasma Background - Full Coverage */}
        <div 
          className="absolute inset-0"
          style={{ 
            width: '100%',
            height: '100vh',
            zIndex: 0,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
        >
          <Plasma
            color="#2463EB"
            speed={0.6}
            direction="forward"
            scale={1.0}
            opacity={1}
            mouseInteractive={true}
          />
        </div>
        {/* Text Content Overlay */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
          <div className="max-w-2xl mx-auto p-4">
            <div className="space-y-2 sm:space-y-4 ml-4 sm:ml-8">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#2463EB] drop-shadow-lg">
                Private.
              </h2>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#2463EB] drop-shadow-lg">
                Anonymous.
              </h2>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#2463EB] drop-shadow-lg">
                Unlinkable.
              </h2>
            </div>
            <div className="flex items-center justify-center mt-6 sm:mt-8">
              <p className="text-xs sm:text-sm text-[#FFFFFF] flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-3 border border-[var(--border-color)] rounded-full font-sans flex-wrap bg-black/40 backdrop-blur-sm leading-relaxed max-w-lg">
                Welcome to the world of private transaction. Everything you need is privacy and we are here to help you with this.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

