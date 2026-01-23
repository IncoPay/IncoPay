import ThemeToggle from "./ThemeToggle";
import CyclingText from "./CyclingText";
import Image from "next/image";
import Link from "next/link";
import LandingDiagram from "./LandingDiagram";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 border-b border-[var(--border-color)]">
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
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-8 py-4 sm:py-6 mt-4 sm:mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
          {/* Left: Text Content */}
          <div className="space-y-4 sm:space-y-6">
            {/* X402 on Solana powered by Inco - Small text above */}
            <p className="text-sm sm:text-base lg:text-xl text-[var(--text-paragraph)] flex items-center gap-2 mb-2 sm:mb-4 font-sans flex-wrap">
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
            
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-[var(--text-primary)] font-serif leading-tight">
              Confidential <CyclingText />
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-[var(--text-paragraph)] leading-relaxed font-sans">
              Empowering smart contracts with confidentiality to <br className="hidden sm:block"/> unlock use cases and enable widespread web3 adoption.
            </p>
            <Link href="/started">
              <button className="px-5 py-2.5 sm:px-6 sm:py-3 bg-[var(--button-bg)] text-[var(--button-text)] rounded-lg font-medium hover:opacity-90 transition-all duration-200 text-sm sm:text-base">
                Get Started
              </button>
            </Link>
          </div>

          {/* Right: Diagram */}
          <div className="hidden lg:flex items-center justify-center h-full">
            <LandingDiagram />
          </div>
        </div>
      </main>
    </div>
  );
}

