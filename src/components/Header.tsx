import React from 'react';
import { 
  Volume2, 
  VolumeX, 
  Moon,
  Sun,
  BarChart3,
  Lock,
  Unlock,
  Power,
  Store
} from 'lucide-react';
import { FirebaseConnectionStatus } from '../services/firebase';
import { CafeStatus } from '../types';

interface HeaderProps {
  activeTab: 'orders' | 'analytics' | 'inventory' | 'support' | 'api-sync' | 'customer';
  setActiveTab: (tab: 'orders' | 'analytics' | 'inventory' | 'support' | 'api-sync' | 'customer') => void;
  ordersCount: number;
  openTicketsCount: number;
  lowStockCount: number;
  firebaseStatus: FirebaseConnectionStatus;
  soundEnabled: boolean;
  setSoundEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  isDarkMode: boolean;
  setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenFirebaseModal: () => void;
  onOpenNewOrderModal: () => void;
  cafeStatus: CafeStatus;
  onOpenCafeStatusModal: () => void;
  onReopenCafeEarly: () => Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  ordersCount,
  openTicketsCount,
  lowStockCount,
  firebaseStatus,
  soundEnabled,
  setSoundEnabled,
  isDarkMode,
  setIsDarkMode,
  onOpenFirebaseModal,
  onOpenNewOrderModal,
  cafeStatus,
  onOpenCafeStatusModal,
  onReopenCafeEarly
}) => {
  return (
    <header className={`${isDarkMode ? 'bg-slate-900 text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200'} border-b sticky top-0 z-30 shadow-xs`}>
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Store Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-md text-white">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-lg font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>The Admin ( Rohit )</h1>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                PRO
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Status & Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Cafe Status Toggle Button (Requested feature in admin dashboard) */}
          {cafeStatus.isOpen ? (
            <button
              id="cafe-status-open-btn"
              onClick={onOpenCafeStatusModal}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition shadow-xs cursor-pointer ${
                isDarkMode
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
              }`}
              title="Click to Close Cafe and set opening Date & Time"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Cafe: OPEN</span>
              <span className="text-[10px] opacity-75 font-normal border-l pl-1.5 border-emerald-500/30">Close Cafe</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                id="cafe-status-closed-btn"
                onClick={onOpenCafeStatusModal}
                className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 bg-neutral-900 border-neutral-700 text-white shadow-xs hover:border-neutral-500 transition cursor-pointer"
                title="Cafe is currently CLOSED. Click to view or adjust reopen time."
              >
                <Lock className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>Cafe: CLOSED</span>
                <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">
                  Opens {cafeStatus.formattedReopenTime}
                </span>
              </button>

              {/* Instant Reopen Button (Off that feature / button as earliest) */}
              <button
                id="reopen-early-btn"
                onClick={onReopenCafeEarly}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                title="Open Cafe immediately (turns off closure)"
              >
                <Power className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open Early</span>
              </button>
            </div>
          )}

          {/* Dark Mode Toggle */}
          <button
            id="dark-mode-toggle-btn"
            onClick={() => setIsDarkMode(prev => !prev)}
            className={`p-2 rounded-lg text-xs border transition-colors flex items-center gap-1.5 ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-amber-600 hover:bg-slate-200'
            }`}
            title={isDarkMode ? "Switch to White / Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            <span className="text-[11px] font-semibold hidden sm:inline">{isDarkMode ? 'Light' : 'Dark'}</span>
          </button>

          {/* Sound Toggle */}
          <button
            id="sound-toggle-btn"
            onClick={() => setSoundEnabled(prev => !prev)}
            className={`p-2 rounded-lg text-xs border transition-colors ${
              soundEnabled
                ? (isDarkMode ? 'bg-slate-800 border-slate-700 text-indigo-400 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-indigo-600 hover:bg-slate-200')
                : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200')
            }`}
            title={soundEnabled ? "Order chime alerts active" : "Order chime alerts muted"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};

