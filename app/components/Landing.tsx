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
        <nav className="flex items-center gap-3 sm:gap-4 text-sm">
          <Link
            href="/sessions"
            className="px-4 sm:px-5 py-2 rounded-lg bg-[#2463EB] text-white font-medium hover:bg-[#1d4ed8] transition-colors inline-flex items-center gap-2 shadow-lg shadow-[#2463EB]/30"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Sessions
          </Link>
          <Link
            href="/slot"
            className="px-4 sm:px-5 py-2 rounded-lg bg-[#2463EB] text-white font-medium hover:bg-[#1d4ed8] transition-colors inline-flex items-center gap-2 shadow-lg shadow-[#2463EB]/30"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <circle cx="12" cy="12" r="2" />
            </svg>
            Slot
          </Link>
        </nav>
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
                <span className="whitespace-nowrap">Private <span className="relative inline-block">Payment<svg className="absolute left-0 bottom-0 w-full h-2 overflow-visible" viewBox="0 0 100 12" preserveAspectRatio="none"><path d="M 0 10 Q 50 2 100 10" stroke="#2463EB" strokeWidth="2.5" fill="none" strokeLinecap="round"/></svg></span>.</span>
                <br /> 
                That Just <span className="relative inline-block">Works<svg className="absolute left-0 bottom-0 w-full h-2 overflow-visible" viewBox="0 0 100 12" preserveAspectRatio="none"><path d="M 0 10 Q 50 2 100 10" stroke="#2463EB" strokeWidth="2.5" fill="none" strokeLinecap="round"/></svg></span>.
              </h1>
              
              {/* Subtext */}
              <p className="text-lg md:text-xl text-zinc-300 max-w-3xl mx-auto mb-10 leading-relaxed font-sans drop-shadow-md">
                Session-based private x402 on Solana — enabling continuous micropayments with a single, secure approval.
              </p>
            </div>
            
            {/* Get Started and Docs Buttons - Below the paragraph */}
            <div className="mt-8 sm:mt-10 flex items-center justify-center gap-4 sm:gap-6">
              <Link href="/started">
                <button className="min-w-[140px] sm:min-w-[160px] px-8 py-3 bg-[var(--button-bg)] text-[var(--button-text)] rounded-sm font-medium text-lg hover:opacity-90 transition-all duration-200 border border-transparent relative group overflow-hidden">
                  <span className="relative z-10">Get Started</span>
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </button>
              </Link>
              <a
                href="https://inco-pay-docs.vercel.app/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-[140px] sm:min-w-[160px] px-8 py-3 bg-transparent text-white border border-[#2463EB] rounded-sm font-medium text-lg hover:bg-[#2463EB]/10 transition-all duration-200 relative group inline-flex items-center justify-center"
              >
                <span className="relative z-10">Docs</span>
                <span className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-[#2463EB]" />
                <span className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-[#2463EB]" />
                <span className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-[#2463EB]" />
                <span className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-[#2463EB]" />
              </a>
            </div>

            {/* Social Links */}
            <div className="mt-6 flex items-center justify-center gap-5">
              <a
                href="https://x.com/IncoPayment"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="text-zinc-400 hover:text-white transition-colors duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://github.com/IncoPay"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="text-zinc-400 hover:text-white transition-colors duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
