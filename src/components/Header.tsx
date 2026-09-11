import React from 'react';
import { 
  ShoppingBag, 
  Database, 
  Volume2, 
  VolumeX, 
  PlusCircle, 
  Activity, 
  Boxes, 
  Headphones, 
  Layers, 
  RefreshCw,
  ExternalLink
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
  onOpenFirebaseModal: () => void;
  onOpenNewOrderModal: () => void;
  isSyncing: boolean;
  onTriggerSync: () => void;
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
  onOpenFirebaseModal,
  onOpenNewOrderModal,
  isSyncing,
  onTriggerSync
}) => {
  return (
    <header className="bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-30 shadow-md">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Store Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-inner text-white">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">OmniStore Admin</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-slate-700">
                v2.4
              </span>
            </div>
            <p className="text-xs text-slate-400">Multi-Channel E-Commerce & Realtime Logistics</p>
          </div>
        </div>

        {/* Real-time Status & Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Firebase Real-Time Status Pill */}
          <button
            id="firebase-status-pill-btn"
            onClick={onOpenFirebaseModal}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              firebaseStatus.connected
                ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-amber-950/70 border-amber-700/60 text-amber-300 hover:bg-amber-900/60'
            }`}
            title="Click to view Firebase connection diagnostics and realtime configuration"
          >
            <span className="relative flex h-2 w-2">
              {firebaseStatus.connected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${firebaseStatus.connected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <Database className="w-3.5 h-3.5" />
            <span>Firebase: <strong className="font-mono">{firebaseStatus.activeCollection || 'orders'}</strong></span>
            <span className="hidden md:inline text-[10px] opacity-75">({firebaseStatus.type.toUpperCase()})</span>
          </button>

          {/* Sound Toggle */}
          <button
            id="sound-toggle-btn"
            onClick={() => setSoundEnabled(prev => !prev)}
            className={`p-2 rounded-lg text-xs border transition-colors ${
              soundEnabled
                ? 'bg-slate-800 border-slate-700 text-indigo-400 hover:bg-slate-700'
                : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'
            }`}
            title={soundEnabled ? "Order chime alerts active (click to mute)" : "Order chime alerts muted (click to enable)"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Refresh / Sync Button */}
          <button
            id="refresh-sync-btn"
            onClick={onTriggerSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Poll & verify database sync"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>

          {/* Quick Dispatch Order Button */}
          <button
            id="create-test-order-btn"
            onClick={onOpenNewOrderModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-900 transition active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Dispatch Order</span>
          </button>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/80">
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2 scrollbar-none" aria-label="Tabs">
          <button
            id="tab-orders"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'orders'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-indigo-400" />
            <span>Orders</span>
            {ordersCount > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {ordersCount}
              </span>
            )}
          </button>

          <button
            id="tab-analytics"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'analytics'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Real-Time Analytics</span>
          </button>

          <button
            id="tab-inventory"
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'inventory'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Boxes className="w-4 h-4 text-amber-400" />
            <span>Inventory Management</span>
            {lowStockCount > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {lowStockCount} alert{lowStockCount > 1 ? 's' : ''}
              </span>
            )}
          </button>

          <button
            id="tab-support"
            onClick={() => setActiveTab('support')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'support'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Headphones className="w-4 h-4 text-cyan-400" />
            <span>Customer Support</span>
            {openTicketsCount > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {openTicketsCount}
              </span>
            )}
          </button>

          <button
            id="tab-api-sync"
            onClick={() => setActiveTab('api-sync')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'api-sync'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Store API & Sync Hub</span>
            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              API
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
};
