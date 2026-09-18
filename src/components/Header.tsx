import React from 'react';
import { 
  ShoppingBag, 
  Volume2, 
  VolumeX, 
  Boxes,
  Moon,
  Sun,
  User,
  Settings,
  BarChart3
} from 'lucide-react';
import { FirebaseConnectionStatus } from '../services/firebase';

interface HeaderProps {
  activeTab: 'orders' | 'analytics' | 'inventory' | 'support' | 'api-sync';
  setActiveTab: (tab: 'orders' | 'analytics' | 'inventory' | 'support' | 'api-sync') => void;
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
  onOpenNewOrderModal
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
              <h1 className={`text-lg font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>EcomAnalytics</h1>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                PRO
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Status & Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* User Profile */}
          <button
            id="user-profile-btn"
            className={`p-2 rounded-lg text-xs border transition-colors ${
              isDarkMode
                ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title="User Profile"
          >
            <User className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button
            id="settings-btn"
            className={`p-2 rounded-lg text-xs border transition-colors ${
              isDarkMode
                ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title="Dashboard Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

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

      {/* Navigation Tab Bar */}
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t ${isDarkMode ? 'border-slate-800/80' : 'border-slate-100'}`}>
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto py-2 scrollbar-none" aria-label="Tabs">
          <button
            id="tab-orders"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'orders'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-indigo-200" />
            <span>Orders & Parcels</span>
            {ordersCount > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white">
                {ordersCount}
              </span>
            )}
          </button>

          <button
            id="tab-inventory"
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'inventory'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Boxes className="w-4 h-4 text-amber-400" />
            <span>Upgrade Menu</span>
            {lowStockCount > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {lowStockCount} alert{lowStockCount > 1 ? 's' : ''}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
};
