'use client';

import CyclingText from "./CyclingText";
import Image from "next/image";
import Link from "next/link";
import LightPillar from "@/components/LightPillar";

export default function Landing() {
  return (
    <div className="min-h-screen bg-black text-[var(--text-primary)] transition-colors relative z-10 overflow-hidden">
      {/* LightPillar full background */}
      <div
        className="absolute inset-0 -z-10 w-full min-h-screen"
        style={{ width: '100%', height: '100%', minHeight: '100vh' }}
      >
        <LightPillar
          topColor="#2930ff"
          bottomColor="#9ecdff"
          intensity={1}
          rotationSpeed={0.3}
          glowAmount={0.002}
          pillarWidth={3}
          pillarHeight={0.4}
          noiseIntensity={0.5}
          pillarRotation={25}
          interactive={false}
          mixBlendMode="screen"
          quality="high"
        />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 border-b border-[var(--border-color)] bg-black relative z-20">
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
        
        {/* Background Glow Effects */}
        <div className="absolute w-96 h-96 bg-[#2463EB]/20 rounded-full blur-3xl opacity-60 bottom-10 left-10 animate-pulse pointer-events-none -z-5"></div>
        <div className="absolute w-96 h-96 bg-[#2463EB]/15 rounded-full blur-3xl opacity-50 top-10 right-10 animate-pulse pointer-events-none -z-5"></div>

        <div className="flex items-center justify-center min-h-[calc(100vh-150px)] relative z-10">
          {/* Centered Text Content */}
          <div className="text-center max-w-5xl mx-auto">
            <div className="space-y-6 sm:space-y-8">
              {/* X402 on Solana powered by Inco - Small text above */}
              <div className="inline-flex items-center justify-center mb-2 sm:mb-4">
                <p className="text-sm sm:text-base lg:text-xl text-[var(--text-paragraph)] flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-3 border border-[var(--border-color)] rounded-full font-sans flex-wrap bg-[var(--bg-primary)]/80 backdrop-blur-sm relative z-10">
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
              
              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold font-serif mb-6 leading-normal text-white drop-shadow-xl">
                <span className="whitespace-nowrap">Confidential <span className="px-2 bg-[#2463EB] text-white">Payments*</span>.</span>
                <br /> 
                Private <span className="px-2 bg-[#2463EB] text-white">Facilator</span>.
              </h1>
              
              {/* Subtext */}
              <p className="text-lg md:text-xl text-zinc-300 max-w-3xl mx-auto mb-10 leading-relaxed font-sans drop-shadow-md">
                Empowering smart contracts with confidentiality to unlock use cases and enable widespread web3 adoption.
              </p>
            </div>
            
            {/* Get Started and Docs Buttons - Below the paragraph */}
            <div className="mt-8 sm:mt-10 flex items-center justify-center gap-4 sm:gap-6">
              <Link href="/started">
                <button className="px-8 py-3 bg-[var(--button-bg)] text-[var(--button-text)] rounded-sm font-medium text-lg hover:opacity-90 transition-all duration-200 border border-transparent relative group overflow-hidden">
                  <span className="relative z-10">Get Started</span>
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </button>
              </Link>
              <Link href="/docs">
                <button className="px-8 py-3 bg-transparent text-white border border-[#2463EB] rounded-sm font-medium text-lg hover:bg-[#2463EB]/10 transition-all duration-200 relative group">
                  <span className="relative z-10">Docs</span>
                  {/* Corner accents for Docs button */}
                  <div className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-[#2463EB]"></div>
                  <div className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-[#2463EB]"></div>
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-[#2463EB]"></div>
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-[#2463EB]"></div>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
