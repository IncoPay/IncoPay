'use client';

import CyclingText from "./CyclingText";
import Image from "next/image";
import Link from "next/link";
import Plasma from "@/components/Plasma";

export default function Landing() {
  return (
    <div className="min-h-screen bg-transparent text-[var(--text-primary)] transition-colors relative z-10">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 border-b border-[var(--border-color)] bg-[var(--bg-primary)] relative z-20">
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
          <h1 className="text-lg sm:text-2xl font-bold text-[var(--text-primary)] font-serif">IncoPay</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-8 py-2 sm:py-4 mt-1 sm:mt-2 relative" style={{ minHeight: 'calc(100vh - 100px)' }}>
        {/* Plasma Background - Only in main content area */}
        <div 
          className="absolute inset-0 -z-10" 
          style={{ 
            width: '100%', 
            height: '100vh',
            position: 'absolute',
            top: 0,
            left: 0
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
        <div className="flex items-center justify-center min-h-[calc(100vh-100px)] relative z-10">
          {/* Centered Text Content */}
          <div className="text-center max-w-4xl mx-auto">
            <div className="space-y-4 sm:space-y-5">
              {/* X402 on Solana powered by Inco - Small text above */}
              <div className="inline-flex items-center justify-center mb-2 sm:mb-4">
                <p className="text-sm sm:text-base lg:text-xl text-[var(--text-paragraph)] flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-3 border border-[var(--border-color)] rounded-full font-sans flex-wrap bg-[var(--bg-primary)] relative z-10">
                  <span>X402 on</span>
                  <Image
                    src="https://s2.coinmarketcap.com/static/img/coins/200x200/5426.png"
                    alt="Solana"
                    width={16}
                    height={16}
                    className="inline-block rounded-full sm:w-5 sm:h-5"
                  />
                  <span>powered by</span>
                  <Image
                    src="https://media.licdn.com/dms/image/v2/D560BAQHz8aSdTjC7Uw/company-logo_200_200/company-logo_200_200/0/1706036067148/inco_network_logo?e=2147483647&v=beta&t=n1a2L2ZHH60t8T_ga0ADkPw-BLZf8c3o6XHzYd05xMY"
                    alt="Inco Network"
                    width={16}
                    height={16}
                    className="inline-block rounded-full sm:w-5 sm:h-5"
                  />
                </p>
              </div>
              
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-[var(--text-primary)] font-serif leading-tight">
                Confidential <CyclingText />
              </h2>
              <div className="inline-flex items-center justify-center">
                <p className="text-xs sm:text-sm text-[var(--text-paragraph)] flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-3 border border-[var(--border-color)] rounded-full font-sans flex-wrap bg-[var(--bg-primary)] relative z-10 leading-relaxed">
                  Empowering smart contracts with confidentiality to <br className="hidden sm:block"/> unlock use cases and enable widespread web3 adoption.
                </p>
              </div>
            </div>
            {/* Get Started and Docs Buttons - Below the paragraph */}
            <div className="mt-4 sm:mt-6 flex items-center justify-center gap-3 sm:gap-4 -ml-4 sm:-ml-6">
              <Link href="/started">
                <button className="px-5 py-2.5 sm:px-6 sm:py-3 bg-[var(--button-bg)] text-[var(--button-text)] rounded-lg font-medium hover:opacity-90 transition-all duration-200 text-sm sm:text-base">
                  Get Started
                </button>
              </Link>
              <Link href="/docs">
                <button className="px-5 py-2.5 sm:px-6 sm:py-3 bg-black text-white rounded-lg font-medium hover:opacity-90 transition-all duration-200 text-sm sm:text-base">
                  Docs
                </button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

