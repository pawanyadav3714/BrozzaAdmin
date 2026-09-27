import React, { useState, useRef, useEffect } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Moon,
  Sun,
  BarChart3,
  Lock,
  Unlock,
  Power,
  Store,
  ShieldCheck,
  LogOut,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import { FirebaseConnectionStatus, AuthOwnerUser } from '../services/firebase';
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
  authenticatedOwner?: AuthOwnerUser | null;
  onLogOut?: () => void;
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
  onReopenCafeEarly,
  authenticatedOwner,
  onLogOut
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isProfileMenuOpen]);

  return (
    <header className={`${isDarkMode ? 'bg-slate-900 text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200'} border-b sticky top-0 z-30 shadow-xs`}>
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Store Status */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-md text-white shrink-0">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className={`text-sm sm:text-lg font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'} leading-none`}>
                The Admin <span className="hidden sm:inline">( Rohit )</span>
              </h1>
              <span className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full border ${isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                PRO
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Status & Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Cafe Status Toggle Button (Requested feature in admin dashboard) */}
          {cafeStatus.isOpen ? (
            <button
              id="cafe-status-open-btn"
              onClick={onOpenCafeStatusModal}
              className={`px-2 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold flex items-center gap-1.5 sm:gap-2 transition shadow-xs cursor-pointer ${
                isDarkMode
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
              }`}
              title="Click to Close Cafe and set opening Date & Time"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span><span className="hidden xs:inline">Cafe: </span>OPEN</span>
              <span className="text-[10px] opacity-75 font-normal border-l pl-1.5 border-emerald-500/30 hidden md:inline">Close Cafe</span>
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                id="cafe-status-closed-btn"
                onClick={onOpenCafeStatusModal}
                className="px-2 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 bg-neutral-900 border-neutral-700 text-white shadow-xs hover:border-neutral-500 transition cursor-pointer"
                title="Cafe is currently CLOSED. Click to view or adjust reopen time."
              >
                <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400 animate-pulse" />
                <span><span className="hidden xs:inline">Cafe: </span>CLOSED</span>
                <span className="text-[10px] text-neutral-400 font-mono hidden md:inline">
                  Opens {cafeStatus.formattedReopenTime}
                </span>
              </button>

              {/* Instant Reopen Button (Off that feature / button as earliest) */}
              <button
                id="reopen-early-btn"
                onClick={onReopenCafeEarly}
                className="hidden sm:flex px-2 sm:px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold transition items-center gap-1 shadow-xs cursor-pointer"
                title="Open Cafe immediately (turns off closure)"
              >
                <Power className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Open Early</span>
              </button>
            </div>
          )}

          {/* Dark Mode Toggle */}
          <button
            id="dark-mode-toggle-btn"
            onClick={() => setIsDarkMode(prev => !prev)}
            className={`hidden sm:flex p-1.5 sm:p-2 rounded-lg text-xs border transition-colors items-center gap-1 cursor-pointer ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-amber-600 hover:bg-slate-200'
            }`}
            title={isDarkMode ? "Switch to White / Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />}
            <span className="text-[11px] font-semibold hidden md:inline">{isDarkMode ? 'Light' : 'Dark'}</span>
          </button>

          {/* Sound Toggle */}
          <button
            id="sound-toggle-btn"
            onClick={() => setSoundEnabled(prev => !prev)}
            className={`hidden sm:flex p-1.5 sm:p-2 rounded-lg text-xs border transition-colors items-center cursor-pointer ${
              soundEnabled
                ? (isDarkMode ? 'bg-slate-800 border-slate-700 text-indigo-400 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-indigo-600 hover:bg-slate-200')
                : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200')
            }`}
            title={soundEnabled ? "Order chime alerts active" : "Order chime alerts muted"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          {/* Authenticated Owner Badge & Dropdown for Sign Out */}
          {authenticatedOwner && (
            <div ref={profileMenuRef} className="relative flex items-center pl-1 sm:pl-2 border-l border-slate-700/60">
              <div 
                role="button"
                tabIndex={0}
                id="owner-profile-button"
                onClick={() => setIsProfileMenuOpen(prev => !prev)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsProfileMenuOpen(prev => !prev);
                  }
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl border text-xs cursor-pointer select-none transition-all duration-300 ease-out active:scale-95 ${
                  isDarkMode 
                    ? 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 hover:border-slate-600 text-slate-200' 
                    : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 hover:border-slate-300 text-slate-800'
                } ${isProfileMenuOpen ? (isDarkMode ? 'bg-slate-800 border-indigo-500/60 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-950/30' : 'bg-white border-indigo-400 ring-2 ring-indigo-500/20 shadow-md') : ''}`}
                title="Click profile to open account menu and log out"
              >
                {authenticatedOwner.photoURL ? (
                  <img src={authenticatedOwner.photoURL} alt="Owner" className="w-5 h-5 rounded-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                    {authenticatedOwner.displayName ? authenticatedOwner.displayName[0].toUpperCase() : 'O'}
                  </div>
                )}
                <div className="hidden sm:flex flex-col text-left leading-tight">
                  <span className="font-bold text-[11px] truncate max-w-[120px]">{authenticatedOwner.displayName || 'System Owner'}</span>
                  <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" /> Sole Owner
                  </span>
                </div>
                <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform duration-300 ease-out ${isProfileMenuOpen ? 'rotate-180 text-indigo-400' : 'text-slate-400'}`} />
              </div>

              {/* Profile Dropdown with Logout Button - Smooth transition & animation */}
              <div
                className={`absolute right-0 top-full mt-2.5 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl border shadow-2xl p-2.5 z-50 transform origin-top-right transition-all duration-300 ease-out ${
                  isProfileMenuOpen 
                    ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto visible' 
                    : 'opacity-0 scale-95 -translate-y-2 pointer-events-none invisible'
                } ${
                  isDarkMode 
                    ? 'bg-slate-900/95 backdrop-blur-md border-slate-700/80 text-slate-100 shadow-2xl shadow-black/80' 
                    : 'bg-white/95 backdrop-blur-md border-slate-200/90 text-slate-900 shadow-xl shadow-slate-300/50'
                }`}
              >
                <div className="px-2.5 py-2 border-b border-slate-700/40 mb-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    {authenticatedOwner.photoURL ? (
                      <img src={authenticatedOwner.photoURL} alt="Owner" className="w-7 h-7 rounded-full object-cover shadow-xs" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                        {authenticatedOwner.displayName ? authenticatedOwner.displayName[0].toUpperCase() : 'O'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate leading-tight">{authenticatedOwner.displayName || 'System Owner'}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate leading-tight">{authenticatedOwner.email || 'Owner Account'}</p>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Sole Platform Owner</span>
                  </div>
                </div>

                {/* System Controls - In responsiveness shown right above the logout button */}
                <div className="py-2 border-t border-slate-700/40 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-0.5">
                    Quick Controls
                  </div>

                  {/* Reopen Early Button (When Cafe is Closed) */}
                  {!cafeStatus.isOpen && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onReopenCafeEarly();
                      }}
                      className="w-full px-2.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-between shadow-xs cursor-pointer active:scale-98"
                      title="Open Cafe immediately (turns off closure)"
                    >
                      <div className="flex items-center gap-2">
                        <Power className="w-3.5 h-3.5 text-white" />
                        <span>Open Cafe Early</span>
                      </div>
                      <span className="text-[9px] font-mono uppercase bg-emerald-700/80 px-1.5 py-0.5 rounded-sm">Instant</span>
                    </button>
                  )}

                  {/* Dark Mode Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsDarkMode(prev => !prev)}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs font-semibold border transition flex items-center justify-between cursor-pointer active:scale-98 ${
                      isDarkMode 
                        ? 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-amber-300' 
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
                      <span>Theme</span>
                    </div>
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-black/20">
                      {isDarkMode ? 'Dark' : 'Light'}
                    </span>
                  </button>

                  {/* Sound Toggle */}
                  <button
                    type="button"
                    onClick={() => setSoundEnabled(prev => !prev)}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs font-semibold border transition flex items-center justify-between cursor-pointer active:scale-98 ${
                      soundEnabled
                        ? (isDarkMode ? 'bg-indigo-950/40 border-indigo-700/50 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700')
                        : (isDarkMode ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500')
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-indigo-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                      <span>Order Alerts</span>
                    </div>
                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md ${
                      soundEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {soundEnabled ? 'ON' : 'MUTED'}
                    </span>
                  </button>
                </div>

                {onLogOut && (
                  <button
                    id="profile-dropdown-logout-btn"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onLogOut();
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 active:scale-[0.98] text-rose-400 hover:text-white border border-rose-500/25 hover:border-rose-600 transition-all duration-200 text-xs font-bold flex items-center justify-between cursor-pointer group shadow-xs"
                    title="Lock console & Sign out of single-user session"
                  >
                    <div className="flex items-center gap-2">
                      <LogOut className="w-4 h-4 text-rose-400 group-hover:text-white transition-colors" />
                      <span>Lock & Sign Out</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 group-hover:opacity-100">Exit</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

