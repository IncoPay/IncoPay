"use client";

import Link from "next/link";

/** IncoPay logo SVG — cloud + data nodes (same as header, scalable) */
function IncoPayLogo({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Cloud shape */}
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Data nodes inside cloud */}
      <circle cx="12" cy="14" r="1.5" fill="currentColor" />
      <circle cx="9" cy="12" r="1.5" fill="currentColor" />
      <circle cx="15" cy="12" r="1.5" fill="currentColor" />
      <circle cx="10.5" cy="16" r="1.5" fill="currentColor" />
      <circle cx="13.5" cy="16" r="1.5" fill="currentColor" />
      {/* Connection lines */}
      <line x1="12" y1="14" x2="9" y2="12" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
      <line x1="12" y1="14" x2="15" y2="12" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
      <line x1="12" y1="14" x2="10.5" y2="16" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
      <line x1="12" y1="14" x2="13.5" y2="16" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    </svg>
  );
}

export default function LogoPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center gap-8 max-w-2xl">
        {/* Big clear logo — icon in blue circle, large size */}
        <div className="w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 rounded-full bg-[#2463EB] flex items-center justify-center p-8 shadow-[0_0_60px_rgba(36,99,235,0.5)]">
          <IncoPayLogo className="w-full h-full text-white" />
        </div>
        {/* Wordmark */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[var(--text-primary)] font-serif tracking-tight">
          IncoPay
        </h1>
        <p className="text-sm text-[var(--text-paragraph)] font-sans">
          Private payments on Solana
        </p>
        <Link
          href="/"
          className="mt-4 text-sm font-medium text-[#2463EB] hover:underline"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
