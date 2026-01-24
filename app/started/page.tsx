"use client";
import React from "react";
import Link from "next/link";
import { BackgroundBeams } from "../components/background-beams";
import WalletButton from "../components/WalletButton";
import Plasma from "@/components/Plasma";

// --- Color Palette (Blue Theme) ---
const COLORS = {
  BACKGROUND: '#0A0A0A',
  BOX_BG: '#020408', // Very dark blue/black
  BLUE_PRIMARY: '#2463EB',
  BLUE_ACCENT: '#60A5FA',
  BLUE_DARK: '#1E3A8A',
  USDC_BLUE: '#3D7BFD',
  BUTTON_BG: '#2563EB',
  TEXT_COLOR_DIM: '#9CA3AF',
  GLOW_BLUE: '#3B82F6',
};

// --- Custom CSS for complex shapes and borders ---
const customStyles = `
  /* Enhanced geometric frame for token boxes */
  .token-box-frame {
    clip-path: polygon(
      2% 0, 98% 0, 100% 2%, 100% 98%, 98% 100%, 2% 100%, 0 98%, 0 2%
    );
    border: 3px solid ${COLORS.BLUE_PRIMARY};
    background: linear-gradient(135deg, ${COLORS.BOX_BG} 0%, #050a14 100%);
    position: relative;
    z-index: 10;
    box-shadow: 
      0 0 20px rgba(36, 99, 235, 0.3),
      0 0 40px rgba(59, 130, 246, 0.2),
      inset 0 0 30px rgba(0, 0, 0, 0.5);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    animation: pulse-glow-blue 3s ease-in-out infinite;
  }
  
  .token-box-frame:hover {
    border-color: ${COLORS.GLOW_BLUE};
    box-shadow: 
      0 0 30px rgba(59, 130, 246, 0.6),
      0 0 60px rgba(37, 99, 235, 0.3),
      inset 0 0 30px rgba(0, 0, 0, 0.5);
    transform: translateY(-4px);
  }
  
  /* Multiple inner borders for depth */
  .token-box-frame::before {
    content: '';
    position: absolute;
    top: 4px;
    left: 4px;
    right: 4px;
    bottom: 4px;
    border: 2px solid ${COLORS.BLUE_DARK};
    pointer-events: none;
    z-index: 1;
    clip-path: polygon(
      2% 0, 98% 0, 100% 2%, 100% 98%, 98% 100%, 2% 100%, 0 98%, 0 2%
    );
  }
  
  .token-box-frame::after {
    content: '';
    position: absolute;
    top: 8px;
    left: 8px;
    right: 8px;
    bottom: 8px;
    border: 1px solid ${COLORS.BLUE_ACCENT};
    opacity: 0.3;
    pointer-events: none;
    z-index: 1;
  }

  /* Enhanced decorative stripes */
  .deco-stripes {
    position: absolute;
    top: 8px;
    left: 8px;
    width: 40px;
    height: 12px;
    overflow: hidden;
    z-index: 20;
  }
  .deco-stripes div {
    float: left;
    width: 4px;
    height: 100%;
    background: linear-gradient(180deg, ${COLORS.BLUE_PRIMARY} 0%, ${COLORS.BLUE_ACCENT} 100%);
    margin-right: 3px;
    opacity: 0.5;
    transform: skewX(-25deg);
  }
  
  /* Corner decorations */
  .corner-accent {
    position: absolute;
    width: 24px;
    height: 24px;
    border: 2px solid ${COLORS.BLUE_PRIMARY};
    z-index: 30;
  }
  .corner-accent.top-left {
    top: -2px;
    left: -2px;
    border-right: none;
    border-bottom: none;
  }
  .corner-accent.top-right {
    top: -2px;
    right: -2px;
    border-left: none;
    border-bottom: none;
  }
  .corner-accent.bottom-left {
    bottom: -2px;
    left: -2px;
    border-right: none;
    border-top: none;
  }
  .corner-accent.bottom-right {
    bottom: -2px;
    right: -2px;
    border-left: none;
    border-top: none;
  }

  /* Swap button with enhanced styling - single border with design */
  .swap-button-style {
    clip-path: polygon(
      2% 0, 98% 0, 100% 2%, 100% 98%, 98% 100%, 2% 100%, 0 98%, 0 2%
    );
    border: 2px solid ${COLORS.BLUE_PRIMARY};
    background: linear-gradient(135deg, ${COLORS.BOX_BG} 0%, #050a14 100%);
    position: relative;
    z-index: 10;
    box-shadow: 
      0 0 20px rgba(36, 99, 235, 0.3),
      0 0 40px rgba(59, 130, 246, 0.2),
      inset 0 0 30px rgba(0, 0, 0, 0.5);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    animation: pulse-glow-blue 3s ease-in-out infinite;
    text-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
  }
  .swap-button-style:hover {
    border-color: ${COLORS.GLOW_BLUE};
    box-shadow: 
      0 0 30px rgba(59, 130, 246, 0.6),
      0 0 60px rgba(37, 99, 235, 0.3),
      inset 0 0 30px rgba(0, 0, 0, 0.5);
    transform: translateY(-4px);
  }
  /* Corner accent decorations for border design */
  .swap-button-corner {
    position: absolute;
    width: 12px;
    height: 12px;
    border: 3px solid ${COLORS.BLUE_ACCENT};
    pointer-events: none;
    z-index: 1;
  }
  .swap-button-corner.top-left {
    top: -3px;
    left: -3px;
    border-right: none;
    border-bottom: none;
  }
  .swap-button-corner.top-right {
    top: -3px;
    right: -3px;
    border-left: none;
    border-bottom: none;
  }
  .swap-button-corner.bottom-left {
    bottom: -3px;
    left: -3px;
    border-right: none;
    border-top: none;
  }
  .swap-button-corner.bottom-right {
    bottom: -3px;
    right: -3px;
    border-left: none;
    border-top: none;
  }
  
  /* Dot effect animation */
  @keyframes dot-pulse {
    0%, 100% {
      opacity: 0.3;
    }
    50% {
      opacity: 1;
    }
  }
  
  .dot-effect {
    position: relative;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .dot-effect span {
    position: absolute;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${COLORS.BLUE_ACCENT};
    animation: dot-pulse 1.5s ease-in-out infinite;
    box-shadow: 0 0 8px rgba(96, 165, 250, 0.6);
  }
  
  /* Position dots in a circle */
  .dot-effect span:nth-child(1) {
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    animation-delay: 0s;
  }
  .dot-effect span:nth-child(2) {
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    animation-delay: 0.2s;
  }
  .dot-effect span:nth-child(3) {
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    animation-delay: 0.4s;
  }
  .dot-effect span:nth-child(4) {
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    animation-delay: 0.6s;
  }
  
  /* Pulse glow animation */
  @keyframes pulse-glow-blue {
    0%, 100% {
      box-shadow: 
        0 0 20px rgba(36, 99, 235, 0.3),
        0 0 40px rgba(59, 130, 246, 0.2),
        inset 0 0 30px rgba(0, 0, 0, 0.5);
    }
    50% {
      box-shadow: 
        0 0 30px rgba(59, 130, 246, 0.5),
        0 0 60px rgba(37, 99, 235, 0.3),
        inset 0 0 30px rgba(0, 0, 0, 0.5);
    }
  }
  
  /* Animated background glow */
  .glow-background {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.3;
    pointer-events: none;
    z-index: 0;
    animation: pulse-glow 4s ease-in-out infinite;
  }
  
  @keyframes pulse-glow {
    0%, 100% {
      opacity: 0.3;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

export default function Started() {
  return (
    <>
      <style>{customStyles}</style>
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
          
          {/* Payment Box - Centered in middle with Enhanced Industrial Design */}
          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text-primary)] font-serif">
              402 Premium Content
            </h2>
            
            {/* Enhanced Token Box Frame */}
            <div className="token-box-frame p-8 w-full max-w-lg min-h-[280px] flex flex-col justify-between relative">
              
              {/* Animated background glow effects */}
              <div 
                className="glow-background"
                style={{
                  top: '10%',
                  left: '5%',
                  width: '200px',
                  height: '200px',
                  background: `radial-gradient(circle, ${COLORS.BLUE_PRIMARY} 0%, transparent 70%)`,
                }}
              />
              <div 
                className="glow-background"
                style={{
                  bottom: '10%',
                  right: '5%',
                  width: '250px',
                  height: '250px',
                  background: `radial-gradient(circle, ${COLORS.GLOW_BLUE} 0%, transparent 70%)`,
                  animationDelay: '2s',
                }}
              />
              
              {/* Decorative elements */}
              <div className="deco-stripes">
                <div /><div /><div /><div /><div />
              </div>
              
              {/* Corner accents */}
              <div className="corner-accent top-left" />
              <div className="corner-accent top-right" />
              <div className="corner-accent bottom-left" />
              <div className="corner-accent bottom-right" />

              {/* Content Container */}
              <div className="relative z-20 space-y-6">
                <p className="text-base sm:text-lg font-sans" style={{ color: COLORS.TEXT_COLOR_DIM }}>
                  Access exclusive content through confidential x402
                </p>
                <div className="space-y-4">
                  <button 
                    className="swap-button-style w-full py-3 px-6 text-xl font-bold text-white text-center relative rounded-none"
                  >
                    <div className="swap-button-corner top-left" />
                    <div className="swap-button-corner top-right" />
                    <div className="swap-button-corner bottom-left" />
                    <div className="swap-button-corner bottom-right" />
                    Pay 1 USDC
                  </button>
                </div>
              </div>

              {/* Bottom Section: Dot effect and decorations */}
              <div className="flex justify-between items-end relative z-20 pt-4 mt-4">
                <div className="dot-effect">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                {/* Tech decoration */}
                <div className="text-xs font-mono opacity-40" style={{ color: COLORS.BLUE_PRIMARY }}>
                  <div>SECURE</div>
                  <div className="text-right">ENCRYPTED</div>
                </div>
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
                <p className="text-xs sm:text-sm text-[#FFFFFF] flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-full font-sans flex-wrap bg-black/40 backdrop-blur-sm leading-relaxed max-w-lg">
                  Welcome to the world of private transaction. Everything you need is privacy and we are here to help you with this.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
