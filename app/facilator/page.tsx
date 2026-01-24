'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Activity, 
  Shield, 
  Cpu, 
  Globe, 
  Zap, 
  Clock, 
  ChevronRight, 
  Settings,
  Lock,
  EyeOff,
  Server
} from 'lucide-react';

export default function FacilatorPage() {
  const [isNodeActive, setIsNodeActive] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    "System initialized...",
    "Waiting for secure handshake...",
  ]);

  const toggleNode = () => {
    setIsNodeActive(!isNodeActive);
    const newLog = !isNodeActive 
      ? `[${new Date().toLocaleTimeString()}] Node started. Listening for confidential requests.`
      : `[${new Date().toLocaleTimeString()}] Node stopped.`;
    setLogs(prev => [newLog, ...prev]);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#2463EB] selection:text-white overflow-hidden relative">
      
      {/* Background Gradients */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-[#2463EB]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-[#2463EB]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Grid Overlay */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <main className="container mx-auto px-6 py-10 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Facilator Dashboard</h1>
            <p className="text-zinc-400 max-w-xl text-lg">
              Manage your confidential compute node. Process encrypted intents and earn fees for facilitating private transactions on Solana via Inco.
            </p>
          </div>
          <button 
            onClick={toggleNode}
            className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all duration-300 ${
              isNodeActive 
                ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20' 
                : 'bg-[#2463EB] text-white hover:bg-[#1d4ed8] shadow-[0_0_20px_rgba(36,99,235,0.4)]'
            }`}
          >
            <Zap className={`w-5 h-5 ${isNodeActive ? '' : 'fill-current'}`} />
            {isNodeActive ? 'Stop Facilator Node' : 'Start Facilator Node'}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard 
            icon={<Activity className="w-5 h-5 text-[#2463EB]" />}
            label="Total Volume"
            value="$1,240,500.00"
            subtext="+12% from last week"
          />
          <StatCard 
            icon={<Cpu className="w-5 h-5 text-[#2463EB]" />}
            label="Compute Units"
            value="450.2M"
            subtext="Avg 85ms latency"
          />
          <StatCard 
            icon={<Lock className="w-5 h-5 text-[#2463EB]" />}
            label="Active Sessions"
            value="1,204"
            subtext="Encrypted Contexts"
          />
           <StatCard 
            icon={<Server className="w-5 h-5 text-[#2463EB]" />}
            label="Node Health"
            value="99.9%"
            subtext="Uptime"
          />
        </div>

        {/* Main Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recent Activity Feed */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Globe className="w-5 h-5 text-zinc-500" />
                Live Network Activity
              </h2>
              <button className="text-sm text-[#2463EB] hover:underline">View All</button>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md">
              <div className="p-4 border-b border-white/10 text-xs font-mono text-zinc-500 uppercase tracking-wider flex justify-between">
                <span>Transaction Hash</span>
                <span>Type</span>
                <span>Status</span>
                <span>Time</span>
              </div>
              <div className="divide-y divide-white/5">
                {[1, 2, 3, 4, 5].map((_, i) => (
                  <ActivityRow key={i} index={i} active={isNodeActive} />
                ))}
              </div>
            </div>
          </div>

          {/* Node Terminal / Logs */}
          <div className="space-y-6">
             <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5 text-zinc-500" />
                System Logs
              </h2>
            </div>
            <div className="bg-black border border-white/10 rounded-xl p-4 font-mono text-sm h-[400px] overflow-y-auto flex flex-col shadow-inner">
              {logs.map((log, i) => (
                <div key={i} className="mb-2 text-zinc-400">
                  <span className="text-[#2463EB] mr-2">➜</span>
                  {log}
                </div>
              ))}
              {isNodeActive && (
                <div className="mt-2 flex items-center gap-2 animate-pulse">
                  <span className="text-green-500">➜</span>
                  <span className="w-2 h-4 bg-green-500/50 block"></span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-[#2463EB]/10 border border-[#2463EB]/20 rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <EyeOff className="w-4 h-4" />
                Privacy Settings
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300">Obfuscate Traffic</span>
                  <div className="w-10 h-5 bg-[#2463EB] rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300">Tor Network Route</span>
                  <div className="w-10 h-5 bg-zinc-700 rounded-full relative cursor-pointer">
                    <div className="absolute left-1 top-1 w-3 h-3 bg-white/50 rounded-full shadow-sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, subtext }: { icon: React.ReactNode, label: string, value: string, subtext: string }) {
  return (
    <div className="bg-white/5 border border-white/10 p-6 rounded-xl backdrop-blur-sm hover:border-white/20 transition-colors group">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-white/5 rounded-lg group-hover:bg-[#2463EB]/10 group-hover:scale-110 transition-all">
          {icon}
        </div>
        <span className="text-xs font-mono text-zinc-500 bg-black/40 px-2 py-1 rounded border border-white/5">+2.4%</span>
      </div>
      <div>
        <h3 className="text-zinc-400 text-sm font-medium mb-1">{label}</h3>
        <p className="text-2xl font-bold text-white mb-1">{value}</p>
        <p className="text-xs text-zinc-500">{subtext}</p>
      </div>
    </div>
  );
}

function ActivityRow({ index, active }: { index: number, active: boolean }) {
  const hash = "0x" + Math.random().toString(16).substr(2, 8) + "..." + Math.random().toString(16).substr(2, 4);
  return (
    <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-zinc-700'}`} />
        <span className="font-mono text-zinc-300 text-sm group-hover:text-[#2463EB] transition-colors">{hash}</span>
      </div>
      <div className="px-3 py-1 rounded-full bg-white/5 text-xs text-zinc-300 border border-white/10">
        Confidential Swap
      </div>
      <div className="flex items-center gap-2">
         {active ? <Shield className="w-3 h-3 text-green-500" /> : <Clock className="w-3 h-3 text-zinc-500" />}
         <span className={`text-xs ${active ? 'text-green-500' : 'text-zinc-500'}`}>{active ? 'Secured' : 'Pending'}</span>
      </div>
      <span className="text-xs text-zinc-500 font-mono">2 min ago</span>
    </div>
  );
}
