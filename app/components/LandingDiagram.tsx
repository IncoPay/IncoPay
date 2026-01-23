'use client';

export default function LandingDiagram() {
  return (
    <div className="relative w-full h-full flex items-center justify-center py-2">
      {/* Background Circle */}
      <div className="absolute w-96 h-96 rounded-full bg-[var(--button-bg)] opacity-10 blur-3xl"></div>
      
      {/* Main Diagram - Flow from Top to Bottom */}
      <div className="relative z-10 flex flex-col items-center gap-2 w-full max-w-md">
        {/* Step 1: User/IncoPay */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-[var(--button-bg)] flex items-center justify-center shadow-lg">
            <svg
              className="w-7 h-7 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
              <circle cx="12" cy="14" r="1.5" fill="white"/>
              <circle cx="9" cy="12" r="1.5" fill="white"/>
              <circle cx="15" cy="12" r="1.5" fill="white"/>
            </svg>
          </div>
          <span className="text-[10px] font-semibold text-[var(--text-primary)]">User</span>
        </div>

        {/* Down Arrow */}
        <div className="flex flex-col items-center -my-1">
          <svg className="w-3 h-3 text-[var(--button-bg)] opacity-60" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M19 12l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Step 2: Create Custom SPL Token */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-14 h-14 rounded-lg bg-[var(--bg-box)] border-2 border-[var(--button-bg)] flex items-center justify-center shadow-md">
            <svg className="w-8 h-8 text-[var(--button-bg)]" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1"/>
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
              <path d="M12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18C15.31 18 18 15.31 18 12C18 8.69 15.31 6 12 6Z" fill="currentColor"/>
            </svg>
          </div>
          <span className="text-[10px] text-[var(--text-paragraph)] text-center font-medium">Create Custom<br/>SPL Token</span>
        </div>

        {/* Down Arrow */}
        <div className="flex flex-col items-center -my-1">
          <svg className="w-3 h-3 text-[var(--button-bg)] opacity-60" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M19 12l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Step 3: Encrypt Amount with Inco */}
        <div className="flex items-center gap-3 w-full">
          {/* Left: Encrypt Icon */}
          <div className="flex flex-col items-center gap-1 flex-1">
            <div className="w-12 h-12 rounded-lg bg-[var(--bg-box)] border-2 border-[var(--button-bg)] flex items-center justify-center">
              <svg className="w-7 h-7 text-[var(--button-bg)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="8" width="18" height="12" rx="2" fill="none"/>
                <path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="14" r="2" fill="currentColor" opacity="0.3"/>
              </svg>
            </div>
            <span className="text-[10px] text-[var(--text-paragraph)] text-center">Encrypt<br/>Amount</span>
          </div>

          {/* Center: Connection */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-[var(--button-bg)] flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-white"></div>
            </div>
          </div>

          {/* Right: Inco Network */}
          <div className="flex flex-col items-center gap-1 flex-1">
            <div className="w-12 h-12 rounded-lg bg-[var(--bg-box)] border-2 border-[var(--button-bg)] flex items-center justify-center">
              <svg className="w-7 h-7 text-[var(--button-bg)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor"/>
                <path d="M2 17L12 22L22 17V12L12 17L2 12V17Z" fill="currentColor"/>
              </svg>
            </div>
            <span className="text-[10px] text-[var(--text-paragraph)] text-center">Inco<br/>Network</span>
          </div>
        </div>

        {/* Down Arrow */}
        <div className="flex flex-col items-center -my-1">
          <svg className="w-3 h-3 text-[var(--button-bg)] opacity-60" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M19 12l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Step 4: Transfer on Solana */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-14 h-14 rounded-lg bg-[var(--bg-box)] border-2 border-[var(--button-bg)] flex items-center justify-center shadow-md">
            <svg className="w-8 h-8 text-[var(--button-bg)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1"/>
            </svg>
          </div>
          <span className="text-[10px] text-[var(--text-paragraph)] text-center font-medium">Confidential<br/>Transfer</span>
        </div>

        {/* Down Arrow */}
        <div className="flex flex-col items-center -my-1">
          <svg className="w-3 h-3 text-[var(--button-bg)] opacity-60" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M19 12l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Step 5: x402 Payment Protocol */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-14 h-14 rounded-lg bg-[var(--bg-box)] border-2 border-[var(--button-bg)] flex items-center justify-center shadow-md">
            <span className="text-lg font-bold text-[var(--button-bg)]">x402</span>
          </div>
          <span className="text-[10px] text-[var(--text-paragraph)] text-center font-medium">Payment<br/>Protocol</span>
        </div>

        {/* Flow Indicators - Side Arrows */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-8 hidden lg:block">
          <div className="flex flex-col gap-2 items-center">
            <svg className="w-4 h-4 text-[var(--button-bg)] opacity-40" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className="w-0.5 h-16 bg-[var(--button-bg)] opacity-20"></div>
            <svg className="w-4 h-4 text-[var(--button-bg)] opacity-40" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-8 hidden lg:block">
          <div className="flex flex-col gap-2 items-center">
            <svg className="w-4 h-4 text-[var(--button-bg)] opacity-40" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className="w-0.5 h-16 bg-[var(--button-bg)] opacity-20"></div>
            <svg className="w-4 h-4 text-[var(--button-bg)] opacity-40" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
