"use client";
import React from "react";
import { BackgroundBeams } from "../components/background-beams";

export default function Started() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex">
      {/* Left side - Line */}
      <div className="w-1/2 flex items-center justify-center">
        <div className="w-full h-px bg-[var(--border-color)]"></div>
      </div>
      
      {/* Right side - BackgroundBeams Demo */}
      <div className="w-1/2 h-screen rounded-md bg-[var(--bg-primary)] relative flex flex-col items-center justify-center antialiased overflow-hidden">
        <div className="max-w-2xl mx-auto p-4 relative z-10">
          <h1 className="relative z-10 text-lg md:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-[var(--text-primary)] to-[var(--text-paragraph)] text-center font-sans font-bold">
            Join the waitlist
          </h1>
          <p className="text-[var(--text-paragraph)] max-w-lg mx-auto my-2 text-sm text-center relative z-10">
            Welcome to IncoPay, the best confidential payment service on the web.
            We provide reliable, scalable, and customizable payment solutions for
            your business. Whether you&apos;re sending confidential transactions,
            secure payments, or private transfers, IncoPay has got you covered.
          </p>
          <input
            type="text"
            placeholder="hi@example.com"
            className="rounded-lg border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--button-bg)] w-full relative z-10 mt-4 bg-[var(--bg-box)] text-[var(--text-primary)] placeholder:text-[var(--text-paragraph)] px-4 py-2"
          />
        </div>
        <BackgroundBeams />
      </div>
    </div>
  );
}

