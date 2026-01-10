import ThemeToggle from "./components/ThemeToggle";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-[var(--border-color)]">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">x402-solana</h1>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Text Content */}
          <div className="space-y-6">
            <h2 className="text-4xl lg:text-5xl font-bold text-[var(--text-primary)]">
              Confidential Gaming
            </h2>
            <div className="space-y-4">
              <h3 className="text-2xl lg:text-3xl font-semibold text-[var(--text-primary)]">
                The confidentiality layer of web3
              </h3>
              <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
                Inco is the missing layer of the blockchain stack, empowering smart contracts with confidentiality to unlock use cases and enable widespread web3 adoption.
              </p>
            </div>
            <button className="px-6 py-3 bg-[var(--button-bg)] text-[var(--button-text)] rounded-lg font-medium hover:opacity-90 transition-all duration-200">
              Get Started
            </button>
          </div>

          {/* Right Side - Simple Professional Box */}
          <div className="bg-[var(--bg-box)] border border-[var(--border-color)] rounded-lg p-12 flex flex-col items-center justify-center text-center space-y-4">
            <Image
              src="https://s2.coinmarketcap.com/static/img/coins/200x200/5426.png"
              alt="Solana"
              width={80}
              height={80}
              className="mb-4"
              priority
            />
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">Solana</h3>
            <p className="text-[var(--text-secondary)] max-w-xs">
              High-performance blockchain powered by Inco Network
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
