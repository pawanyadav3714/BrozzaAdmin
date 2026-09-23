import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Home, 
  FileText, 
  Menu as MenuIcon, 
  ChevronLeft,
  ChevronRight,
  GripVertical
} from 'lucide-react';

interface SidebarProps {
  activeTab: 'orders' | 'analytics' | 'inventory' | 'support' | 'api-sync' | 'customer';
  setActiveTab: (tab: 'orders' | 'analytics' | 'inventory' | 'support' | 'api-sync' | 'customer') => void;
  isMinimized: boolean;
  setIsMinimized: React.Dispatch<React.SetStateAction<boolean>>;
  isDarkMode: boolean;
  onFilterPaymentMethod?: (method: string) => void;
  sidebarPosition: 'left' | 'right';
  setSidebarPosition: React.Dispatch<React.SetStateAction<'left' | 'right'>>;
  customWidth: number;
  setCustomWidth: React.Dispatch<React.SetStateAction<number>>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isMinimized,
  setIsMinimized,
  isDarkMode,
  onFilterPaymentMethod,
  sidebarPosition,
  setSidebarPosition,
  customWidth,
  setCustomWidth
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  const navItems = [
    {
      id: 'orders',
      tabKey: 'orders' as const,
      label: 'Orders & Parcels',
      icon: Home,
      action: () => setActiveTab('orders')
    },
    {
      id: 'customize-menu',
      tabKey: 'inventory' as const,
      label: 'Customize Menu',
      icon: MenuIcon,
      action: () => setActiveTab('inventory')
    },
    {
      id: 'revenue',
      tabKey: 'analytics' as const,
      label: 'Revenue Reports',
      icon: FileText,
      action: () => setActiveTab('analytics')
    }
  ];

  // Mouse & Touch Drag Handlers to manually adjust sidebar width left or right
  const handleStartDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMove = (clientX: number) => {
      if (!isDraggingRef.current) return;
      let newWidth = 76;
      if (sidebarPosition === 'left') {
        newWidth = Math.max(68, Math.min(clientX, 480));
      } else {
        newWidth = Math.max(68, Math.min(window.innerWidth - clientX, 480));
      }

      setCustomWidth(newWidth);
      if (newWidth <= 92) {
        setIsMinimized(true);
      } else {
        setIsMinimized(false);
      }
      localStorage.setItem('barozza_sidebar_width', String(newWidth));
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        handleMove(e.touches[0].clientX);
      }
    };

    const handleEndDrag = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEndDrag);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleEndDrag);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEndDrag);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEndDrag);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [sidebarPosition, setCustomWidth, setIsMinimized]);

  const setPresetWidth = (width: number) => {
    setCustomWidth(width);
    setIsMinimized(width <= 92);
    localStorage.setItem('barozza_sidebar_width', String(width));
  };

  const currentDisplayWidth = isMinimized ? 76 : Math.max(customWidth, 200);

  return (
    <aside 
      style={{ width: `${currentDisplayWidth}px` }}
      className={`shrink-0 select-none flex flex-col justify-between z-20 relative transition-[width] duration-150 ${
        isDragging ? 'transition-none border-cyan-500' : ''
      } ${
        sidebarPosition === 'right' ? 'order-last border-l' : 'order-first border-r'
      } ${
        isDarkMode ? 'bg-[#0b101e] border-slate-800/90 text-slate-200' : 'bg-slate-900 border-slate-800 text-slate-200'
      } min-h-screen py-4`}
    >
      <div>
        {/* Top Header: Hamburger icon and controls */}
        <div className={`px-2.5 mb-4 flex flex-col ${isMinimized ? 'items-center text-center' : 'items-start pl-4'}`}>
          {!isMinimized && (
            <div className="flex items-center justify-end w-full">
              {/* Minimize to 10% icon */}
              <button
                onClick={() => {
                  setIsMinimized(true);
                  setPresetWidth(76);
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                title="Collapse to Minimized Sidebar (10%)"
              >
                {sidebarPosition === 'left' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Very small vertically stacked hamburger icon */}
          <button
            onClick={() => {
              if (isMinimized) {
                setIsMinimized(false);
                setPresetWidth(240);
              } else {
                setIsMinimized(true);
                setPresetWidth(76);
              }
            }}
            className="mt-1 p-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition cursor-pointer flex items-center justify-center border border-slate-700/60"
            title={isMinimized ? "Expand Sidebar" : "Minimize Sidebar to 10%"}
          >
            <MenuIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.tabKey;

            return (
              <button
                key={item.id}
                onClick={item.action}
                className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700/50 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                } ${isMinimized ? 'justify-center' : 'justify-start'}`}
                title={item.label}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-300' : 'text-slate-400'}`} />
                {!isMinimized && (
                  <span className="truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Manual Drag Resize Handle on the edge (Left or Right side border) */}
      <div
        onMouseDown={handleStartDrag}
        onTouchStart={handleStartDrag}
        className={`absolute top-0 bottom-0 ${
          sidebarPosition === 'left' ? '-right-1.5' : '-left-1.5'
        } w-3 z-30 cursor-col-resize group flex items-center justify-center hover:bg-cyan-500/20 active:bg-cyan-500/40 transition-colors select-none`}
        title={`Click & drag left or right to manually adjust sidebar width. Currently ${Math.round(currentDisplayWidth)}px`}
      >
        <div className={`w-1 h-12 rounded-full transition-colors flex items-center justify-center ${
          isDragging ? 'bg-cyan-400' : 'bg-slate-700/60 group-hover:bg-cyan-400'
        }`}>
          <GripVertical className="w-2.5 h-2.5 text-slate-900 opacity-80" />
        </div>
      </div>
    </aside>
  );
};
