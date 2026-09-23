import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  Eye, 
  Package, 
  Clock, 
  CheckCircle2, 
  Truck, 
  AlertCircle, 
  Layers, 
  Calendar,
  ExternalLink,
  ChevronRight,
  Database,
  MapPin,
  Phone,
  MessageSquare,
  Coins,
  QrCode,
  Pizza,
  ShoppingBasket,
  Cpu,
  ShieldCheck,
  Check,
  Navigation,
  Sparkles,
  LayoutGrid,
  List,
  Flame,
  ChevronDown,
  User,
  Lock,
  Power,
  Trash2
} from 'lucide-react';
import { Order, OrderStatus, ParcelType, PaymentStatus, CafeStatus, OrderItem } from '../types';

interface OrdersViewProps {
  orders: Order[];
  isDarkMode: boolean;
  onSelectOrder: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus, additionalFields?: Partial<Order>) => Promise<void>;
  onCreateSupportTicket: (order: Order) => void;
  onOpenCreateOrder: () => void;
  onOpenSyncGuide?: () => void;
  cafeStatus?: CafeStatus;
  onOpenCafeStatusModal?: () => void;
  onReopenCafeEarly?: () => Promise<void>;
  onSwitchToCustomerView?: () => void;
  onPurgeDummyOrders?: () => void;
  onSwitchToAnalytics?: () => void;
}

// Stylized 3D Delivery Box Icon matching image_16.png
const DeliveryBox3DIcon: React.FC = () => (
  <svg className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 select-none drop-shadow-sm" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="box-top-face" x1="16" y1="14" x2="56" y2="38" gradientUnits="userSpaceOnUse">
        <stop stopColor="#64748b" />
        <stop offset="1" stopColor="#475569" />
      </linearGradient>
      <linearGradient id="box-left-face" x1="16" y1="26" x2="36" y2="60" gradientUnits="userSpaceOnUse">
        <stop stopColor="#475569" />
        <stop offset="1" stopColor="#1e293b" />
      </linearGradient>
      <linearGradient id="box-right-face" x1="56" y1="26" x2="36" y2="60" gradientUnits="userSpaceOnUse">
        <stop stopColor="#334155" />
        <stop offset="1" stopColor="#0f172a" />
      </linearGradient>
      <linearGradient id="box-tape" x1="30" y1="16" x2="52" y2="30" gradientUnits="userSpaceOnUse">
        <stop stopColor="#94a3b8" />
        <stop offset="1" stopColor="#64748b" />
      </linearGradient>
    </defs>
    {/* Left Isometric Face */}
    <path d="M14 26L36 38.5V62L14 49.5V26Z" fill="url(#box-left-face)" stroke="#334155" strokeWidth="1" strokeLinejoin="round" />
    {/* Right Isometric Face */}
    <path d="M58 26L36 38.5V62L58 49.5V26Z" fill="url(#box-right-face)" stroke="#334155" strokeWidth="1" strokeLinejoin="round" />
    {/* Top Isometric Face */}
    <path d="M36 13.5L58 26L36 38.5L14 26L36 13.5Z" fill="url(#box-top-face)" stroke="#475569" strokeWidth="1" strokeLinejoin="round" />
    {/* Central Seam Tape across top */}
    <path d="M32 15.8L54 28.3L50 30.6L28 18.1L32 15.8Z" fill="url(#box-tape)" fillOpacity="0.8" />
    {/* Front Corner Seam highlight */}
    <path d="M36 38.5V62" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" />
    {/* Side Carton Detail Lines */}
    <line x1="50" y1="40" x2="54" y2="42.5" stroke="#94a3b8" strokeWidth="1.75" strokeLinecap="round" />
    <line x1="47" y1="45" x2="54" y2="49" stroke="#64748b" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

// Stylized Stack of Coins with Upward-Pointing Arrow Icon matching image_16.png
const CoinsRevenue3DIcon: React.FC = () => (
  <svg className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 select-none drop-shadow-sm" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="arrow-3d-grad" x1="54" y1="8" x2="54" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f8fafc" />
        <stop offset="0.4" stopColor="#cbd5e1" />
        <stop offset="1" stopColor="#64748b" />
      </linearGradient>
      <linearGradient id="coin-silver-top" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#94a3b8" />
        <stop offset="1" stopColor="#64748b" />
      </linearGradient>
      <linearGradient id="coin-silver-rim" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#64748b" />
        <stop offset="1" stopColor="#1e293b" />
      </linearGradient>
    </defs>
    
    {/* 3D Glossy Upward Arrow */}
    <path d="M54 7L66 22H59V42H49V22H42L54 7Z" fill="url(#arrow-3d-grad)" stroke="#94a3b8" strokeWidth="1" strokeLinejoin="round" />
    
    {/* Left Tall Coin Stack */}
    {/* Coin 1 bottom */}
    <path d="M12 47C12 50.5 19 53 28 53C37 53 44 50.5 44 47V51C44 54.5 37 57 28 57C19 57 12 54.5 12 51V47Z" fill="url(#coin-silver-rim)" stroke="#334155" strokeWidth="0.5" />
    {/* Coin 2 */}
    <path d="M12 41C12 44.5 19 47 28 47C37 47 44 44.5 44 41V45C44 48.5 37 51 28 51C19 51 12 48.5 12 45V41Z" fill="url(#coin-silver-rim)" stroke="#334155" strokeWidth="0.5" />
    {/* Coin 3 */}
    <path d="M12 35C12 38.5 19 41 28 41C37 41 44 38.5 44 35V39C44 42.5 37 45 28 45C19 45 12 42.5 12 39V35Z" fill="url(#coin-silver-rim)" stroke="#334155" strokeWidth="0.5" />
    {/* Coin 4 Top */}
    <path d="M12 29C12 32.5 19 35 28 35C37 35 44 32.5 44 29V33C44 36.5 37 39 28 39C19 39 12 36.5 12 33V29Z" fill="url(#coin-silver-rim)" stroke="#334155" strokeWidth="0.5" />
    <ellipse cx="28" cy="29" rx="16" ry="5.5" fill="url(#coin-silver-top)" stroke="#cbd5e1" strokeWidth="0.75" />

    {/* Right Shorter Coin Stack */}
    {/* Right bottom */}
    <path d="M38 51C38 54.2 44.5 56.5 52 56.5C59.5 56.5 66 54.2 66 51V54.5C66 57.7 59.5 60 52 60C44.5 60 38 57.7 38 54.5V51Z" fill="url(#coin-silver-rim)" stroke="#334155" strokeWidth="0.5" />
    {/* Right top */}
    <path d="M38 45C38 48.2 44.5 50.5 52 50.5C59.5 50.5 66 48.2 66 45V48.5C66 51.7 59.5 54 52 54C44.5 54 38 51.7 38 48.5V45Z" fill="url(#coin-silver-rim)" stroke="#334155" strokeWidth="0.5" />
    <ellipse cx="52" cy="45" rx="14" ry="4.5" fill="url(#coin-silver-top)" stroke="#cbd5e1" strokeWidth="0.75" />
  </svg>
);

// UPI Brand Icon matching image_16.png
const UpiBrandIcon: React.FC = () => (
  <div className="flex items-center gap-1 font-bold text-slate-300">
    <span className="italic font-black text-sm tracking-tight text-slate-200">UPI</span>
    <svg className="w-3.5 h-3.5 fill-slate-300 ml-0.5" viewBox="0 0 24 24">
      <path d="M4 5l8 7-8 7V5zm8 0l8 7-8 7V5z" />
    </svg>
  </div>
);

// COD Brand Icon matching image_16.png
const CodBrandIcon: React.FC = () => (
  <div className="flex items-center gap-2 font-bold text-slate-300">
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-600/80 bg-slate-800 text-[10px] font-extrabold text-slate-300 tracking-tight shadow-xs">
      <Lock className="w-2.5 h-2.5 text-slate-300" />
      COD
    </span>
  </div>
);

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  isDarkMode,
  onSelectOrder,
  onUpdateStatus,
  onCreateSupportTicket,
  onOpenCreateOrder,
  onOpenSyncGuide,
  cafeStatus,
  onOpenCafeStatusModal,
  onReopenCafeEarly,
  onSwitchToCustomerView,
  onPurgeDummyOrders,
  onSwitchToAnalytics
}) => {
  const [viewLayout, setViewLayout] = useState<'cards' | 'table'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [parcelTypeFilter, setParcelTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount_high' | 'amount_low'>('newest');
  const [selectedDayKey, setSelectedDayKey] = useState<string>('today');
  const [showDailyBreakdown, setShowDailyBreakdown] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string; price?: number; quantity?: number } | null>(null);

  // Helper to ensure ONLY authentic customer dashboard parcels are processed
  // STRICTLY blocks any unwanted junks and automatically created dummy parcels
  const isCustomerOrder = (ord: Order) => {
    if (!ord) return false;
    const idLower = (ord.id || '').toLowerCase();
    const orderNumLower = (ord.orderNumber || '').toLowerCase();
    const custNameLower = (ord.customer?.name || '').toLowerCase();
    const notesLower = (ord.notes || '').toLowerCase();

    // 1. Block legacy dummy mock IDs
    if (
      ord.id === 'ord-cod-01' || 
      ord.id === 'ord-upi-02' || 
      ord.orderNumber === 'ORD-9821' || 
      ord.orderNumber === 'ORD-9822'
    ) {
      return false;
    }

    // 2. Block any dummy/test markers in id, order number, name, notes
    if (
      idLower.includes('dummy') || idLower.includes('test') ||
      orderNumLower.includes('dummy') || orderNumLower.includes('test') ||
      custNameLower === 'dummy' || custNameLower === 'test' || custNameLower === 'test customer' ||
      notesLower.includes('diagnostic console')
    ) {
      return false;
    }

    // 3. Must have valid items (at least one real product)
    if (!ord.items || ord.items.length === 0) {
      return false;
    }

    // 4. Must have valid non-zero amount
    if (!ord.totalAmount || ord.totalAmount <= 0) {
      return false;
    }

    return true;
  };

  // Only real customer orders
  const customerOrders = useMemo(() => {
    return orders.filter(isCustomerOrder);
  }, [orders]);

  // Live timestamp updated every 10s so midnight 12:00 AM automatically rolls over and resets
  const [currentMs, setCurrentMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMs(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const todayDateStr = useMemo(() => {
    return new Date(currentMs).toDateString();
  }, [currentMs]);

  const sevenDaysAgoMs = 7 * 24 * 60 * 60 * 1000;

  // Valid customer orders (excluding delivered older than 7 days)
  const validCustomerOrders = useMemo(() => {
    return customerOrders.filter(ord => {
      const age = currentMs - new Date(ord.createdAt || Date.now()).getTime();
      if (ord.status === 'delivered' && age > sevenDaysAgoMs) {
        return false;
      }
      return true;
    });
  }, [customerOrders, currentMs]);

  // Total number of orders placed today (filtered for current date, resets to 0 at 12 AM)
  const todaysOrdersCount = useMemo(() => {
    return validCustomerOrders.filter(ord => {
      if (ord.status === 'cancelled') return false;
      const orderDate = new Date(ord.createdAt || Date.now()).toDateString();
      return orderDate === todayDateStr;
    }).length;
  }, [validCustomerOrders, todayDateStr]);

  // Total count of successful online UPI transactions for the current day only (resets daily at 12 AM)
  const todaysUpiOrdersCount = useMemo(() => {
    return validCustomerOrders.filter(ord => {
      if (ord.status === 'cancelled') return false;
      const orderDate = new Date(ord.createdAt || Date.now()).toDateString();
      if (orderDate !== todayDateStr) return false;

      const method = (ord.paymentMethod || '').toLowerCase();
      const isUPI = method === 'upi' || method.includes('upi') || method === 'online' || (!method.includes('cash') && !method.includes('cod'));
      const isSuccessful = ord.paymentStatus === 'clear' || ord.paymentStatus === 'paid';

      return isUPI && isSuccessful;
    }).length;
  }, [validCustomerOrders, todayDateStr]);

  // Total monetary amount of successful online UPI transactions for the current day only (resets daily at 12 AM)
  const todaysUpiTotalAmount = useMemo(() => {
    return validCustomerOrders
      .filter(ord => {
        if (ord.status === 'cancelled') return false;
        const orderDate = new Date(ord.createdAt || Date.now()).toDateString();
        if (orderDate !== todayDateStr) return false;

        const method = (ord.paymentMethod || '').toLowerCase();
        const isUPI = method === 'upi' || method.includes('upi') || method === 'online' || (!method.includes('cash') && !method.includes('cod'));
        const isSuccessful = ord.paymentStatus === 'clear' || ord.paymentStatus === 'paid';

        return isUPI && isSuccessful;
      })
      .reduce((sum, ord) => sum + ord.totalAmount, 0);
  }, [validCustomerOrders, todayDateStr]);

  // Total Cash on Delivery amount for the current day:
  // - Added whenever a customer orders a parcel via Cash on Delivery today
  // - Decreased whenever the parcel is delivered (or cancelled)
  // - Renews / resets automatically after a new day begins at 12 AM
  const todaysCodPendingAmount = useMemo(() => {
    return validCustomerOrders
      .filter(ord => {
        // Renews each new day: only consider orders from current day
        const orderDate = new Date(ord.createdAt || Date.now()).toDateString();
        if (orderDate !== todayDateStr) return false;

        // Decreased whenever the parcel is delivered or cancelled
        if (ord.status === 'delivered' || ord.status === 'cancelled') return false;
        if (ord.paymentStatus === 'clear') return false;

        const method = (ord.paymentMethod || '').toLowerCase();
        const isCOD = method.includes('cash') || method.includes('cod') || method === 'cash_on_delivery';
        return isCOD;
      })
      .reduce((sum, ord) => sum + ord.totalAmount, 0);
  }, [validCustomerOrders, todayDateStr]);

  // Total Revenue for current day (All completed payments today - UPI clear and delivered/collected COD)
  const todaysTotalRevenue = useMemo(() => {
    return validCustomerOrders
      .filter(ord => {
        if (ord.status === 'cancelled') return false;
        const orderDate = new Date(ord.createdAt || Date.now()).toDateString();
        if (orderDate !== todayDateStr) return false;

        const method = (ord.paymentMethod || '').toLowerCase();
        const isUPI = method === 'upi' || method.includes('upi') || method === 'online' || (!method.includes('cash') && !method.includes('cod'));
        const isSuccessfulUPI = isUPI && (ord.paymentStatus === 'clear' || ord.paymentStatus === 'paid');
        const isDeliveredCOD = (method.includes('cash') || method.includes('cod') || method === 'cash_on_delivery') && (ord.status === 'delivered' || ord.paymentStatus === 'clear');

        return isSuccessfulUPI || isDeliveredCOD;
      })
      .reduce((sum, ord) => sum + ord.totalAmount, 0);
  }, [validCustomerOrders, todayDateStr]);

  // Total count of Cash on Delivery orders placed today
  const todaysCodOrdersCount = useMemo(() => {
    return validCustomerOrders.filter(ord => {
      if (ord.status === 'cancelled') return false;
      const orderDate = new Date(ord.createdAt || Date.now()).toDateString();
      if (orderDate !== todayDateStr) return false;

      const method = (ord.paymentMethod || '').toLowerCase();
      return method.includes('cash') || method.includes('cod') || method === 'cash_on_delivery';
    }).length;
  }, [validCustomerOrders, todayDateStr]);

  // Active orders (status !== 'delivered' and created today)
  const activeOrders = useMemo(() => {
    return validCustomerOrders.filter(ord => {
      if (ord.status === 'delivered') return false;
      const orderDate = new Date(ord.createdAt || Date.now()).toDateString();
      return orderDate === todayDateStr;
    });
  }, [validCustomerOrders, todayDateStr]);

  // Delivered drafts / archive (status === 'delivered') - cleans each day at 12 AM
  const deliveredDrafts = useMemo(() => {
    return validCustomerOrders.filter(ord => {
      if (ord.status !== 'delivered') return false;
      const orderDate = new Date(ord.createdAt || Date.now()).toDateString();
      return orderDate === todayDateStr;
    });
  }, [validCustomerOrders, todayDateStr]);

  // Filtered & sorted active orders
  const filteredOrders = useMemo(() => {
    return activeOrders
      .filter((ord) => {
        const matchesSearch = 
          ord.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ord.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ord.customer.phone.includes(searchTerm) ||
          ord.customer.address.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || ord.status === statusFilter;
        
        const matchesPaymentMethod = 
          paymentMethodFilter === 'all' || 
          (paymentMethodFilter === 'cod' && (ord.paymentMethod === 'cash_on_delivery' || ord.paymentMethod.toLowerCase().includes('cash'))) ||
          (paymentMethodFilter === 'upi' && (ord.paymentMethod === 'upi' || ord.paymentMethod.toLowerCase().includes('upi')));

        const matchesPaymentStatus = 
          paymentStatusFilter === 'all' || 
          ord.paymentStatus === paymentStatusFilter;

        const matchesParcelType = 
          parcelTypeFilter === 'all' || 
          ord.parcelType === parcelTypeFilter;

        return matchesSearch && matchesStatus && matchesPaymentMethod && matchesPaymentStatus && matchesParcelType;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else if (sortBy === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else if (sortBy === 'amount_high') {
          return b.totalAmount - a.totalAmount;
        } else {
          return a.totalAmount - b.totalAmount;
        }
      });
  }, [activeOrders, searchTerm, statusFilter, paymentMethodFilter, paymentStatusFilter, parcelTypeFilter, sortBy]);

  // Pure customer order parcels: strictly and only the items chosen by the user appear in the order box
  const consolidatedParcels = useMemo<Order[]>(() => {
    return filteredOrders.map(ord => ({
      ...ord,
      // Strictly maintain only the items chosen by the user for this order - never merge or add items from other orders
      items: ord.items || [],
      isMultipleOrders: false,
      mergedOrderCount: 1,
      mergedOrderNumbers: [ord.orderNumber],
      mergedOrderIds: [ord.id]
    }));
  }, [filteredOrders]);

  // Metrics (strictly customer parcels only)
  const totalRevenue = validCustomerOrders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.totalAmount : 0), 0);
  const pendingReceiveCount = validCustomerOrders.filter(o => o.status === 'pending').length;
  const inTransitCount = validCustomerOrders.filter(o => o.status === 'out_for_delivery' || o.status === 'processing' || o.status === 'received').length;
  const codPendingTotal = validCustomerOrders
    .filter(o => o.status !== 'cancelled' && o.paymentStatus === 'pending')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  // Daily revenue statistics for each day & today till now (customer parcels only)
  const dailyStats = useMemo(() => {
    const today = new Date();
    const map = new Map<string, { date: Date; totalAmount: number; count: number }>();

    const getLocalKey = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const todayKey = getLocalKey(today);
    // Ensure today entry is initialized
    map.set(todayKey, { date: today, totalAmount: 0, count: 0 });

    customerOrders.forEach(o => {
      if (o.status === 'cancelled') return;
      try {
        const d = new Date(o.createdAt);
        if (isNaN(d.getTime())) return;
        const key = getLocalKey(d);
        const existing = map.get(key) || { date: d, totalAmount: 0, count: 0 };
        existing.totalAmount += Number(o.totalAmount) || 0;
        existing.count += 1;
        map.set(key, existing);
      } catch {
        // ignore date parse errors
      }
    });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = getLocalKey(yesterday);

    return Array.from(map.entries())
      .map(([key, item]) => {
        const isToday = key === todayKey;
        const isYesterday = key === yesterdayKey;
        let label = item.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        if (isToday) label = 'Today';
        else if (isYesterday) label = 'Yesterday';

        return {
          key,
          label,
          fullDate: item.date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
          isToday,
          totalAmount: item.totalAmount,
          count: item.count
        };
      })
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [orders]);

  const activeStat = useMemo(() => {
    if (selectedDayKey === 'today') {
      return dailyStats.find(d => d.isToday) || dailyStats[0];
    }
    return dailyStats.find(d => d.key === selectedDayKey) || dailyStats[0];
  }, [dailyStats, selectedDayKey]);

  // Helper badges
  const getParcelBadge = (type: ParcelType) => {
    switch (type) {
      case 'hot_food':
        return {
          icon: <Pizza className="w-3.5 h-3.5 text-red-400" />,
          label: "Domino's Hot Food",
          badgeClass: 'bg-red-500/20 text-red-300 border-red-500/30'
        };
      case 'quick_grocery':
        return {
          icon: <ShoppingBasket className="w-3.5 h-3.5 text-emerald-400" />,
          label: 'Blinkit Grocery',
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
        };
      case 'electronics':
        return {
          icon: <Cpu className="w-3.5 h-3.5 text-cyan-400" />,
          label: 'Electronics (OTP)',
          badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
        };
      default:
        return {
          icon: <Package className="w-3.5 h-3.5 text-purple-400" />,
          label: 'Standard Parcel',
          badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
        };
    }
  };

  const getParcelIcon = (type: ParcelType) => {
    switch (type) {
      case 'hot_food': return <Pizza className="w-4 h-4 text-red-400" />;
      case 'quick_grocery': return <ShoppingBasket className="w-4 h-4 text-emerald-400" />;
      case 'electronics': return <Cpu className="w-4 h-4 text-cyan-400" />;
      default: return <Package className="w-4 h-4 text-purple-400" />;
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'received':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'processing':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'out_for_delivery':
        return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
      case 'delivered':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'cancelled':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'Awaiting Worker Receipt';
      case 'received': return 'Parcel Received at Hub';
      case 'processing': return 'Packing & Staging';
      case 'out_for_delivery': return 'Rider Out for Delivery';
      case 'delivered': return 'Delivered to Customer';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const formatMinutesAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const formatDateWithDay = (dateStr: string) => {
    try {
      const d = new Date(dateStr || Date.now());
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  // Fast Worker Status Transitions
  const handleWorkerNextAction = async (ord: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetId = ord.mergedOrderIds && ord.mergedOrderIds.length > 0 ? ord.mergedOrderIds.join(',') : ord.id;
    if (ord.status === 'pending') {
      await onUpdateStatus(targetId, 'received', {
        assignedWorker: 'Delivery Partner Hub',
        parcelReceivedAt: new Date().toISOString()
      });
    } else if (ord.status === 'received') {
      await onUpdateStatus(targetId, 'processing');
    } else if (ord.status === 'processing') {
      await onUpdateStatus(targetId, 'out_for_delivery', {
        trackingNumber: `RDR-${Math.floor(100 + Math.random() * 900)}`
      });
    } else if (ord.status === 'out_for_delivery') {
      await onUpdateStatus(targetId, 'delivered', {
        deliveredAt: new Date().toISOString(),
        paymentStatus: 'clear',
        cashCollected: true
      });
    }
  };

  const handleMarkPaymentClear = async (ord: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetId = ord.mergedOrderIds && ord.mergedOrderIds.length > 0 ? ord.mergedOrderIds.join(',') : ord.id;
    await onUpdateStatus(targetId, ord.status, {
      paymentStatus: 'clear',
      cashCollected: true
    });
  };

  return (
    <div className="space-y-3">
      {/* 4-Panel Dark Grey Grid matching image */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Panel 1 (Top-Left): TODAY'S TOTAL ORDERS */}
        <div className={`p-4 sm:p-5 rounded-2xl ${isDarkMode ? 'bg-[#161922] border-slate-800/80 shadow-md' : 'bg-slate-900 border-slate-800 text-white shadow-md'} border flex flex-col justify-between`}>
          <div className="text-xs font-bold text-slate-300 tracking-wider uppercase">
            TODAY'S TOTAL ORDERS
          </div>
          <div className="flex items-center justify-between mt-3">
            <div>
              <div className="text-4xl sm:text-5xl font-extrabold text-white font-sans tracking-tight leading-none">
                {todaysOrdersCount}
              </div>
              <div className="flex items-center gap-3 mt-2 text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                <span>TOTAL</span>
                <span>ORDERS</span>
              </div>
            </div>
            <DeliveryBox3DIcon />
          </div>
        </div>

        {/* Panel 2 (Top-Right): TODAY'S TOTAL REVENUE */}
        <div className={`p-4 sm:p-5 rounded-2xl ${isDarkMode ? 'bg-[#161922] border-slate-800/80 shadow-md' : 'bg-slate-900 border-slate-800 text-white shadow-md'} border flex flex-col justify-between`}>
          <div className="text-xs font-bold text-slate-300 tracking-wider uppercase">
            TODAY'S TOTAL REVENUE
          </div>
          <div className="flex items-center justify-between mt-3">
            <div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white font-sans tracking-tight leading-none">
                ₹{todaysTotalRevenue.toFixed(2)}
              </div>
              <div className="flex items-center gap-3 mt-2 text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                <span>TOTAL</span>
                <span>REVENUE</span>
              </div>
            </div>
            <CoinsRevenue3DIcon />
          </div>
        </div>

        {/* Panel 3 (Bottom-Left): PAYMENT METHODS */}
        <div className={`p-4 sm:p-5 rounded-2xl ${isDarkMode ? 'bg-[#161922] border-slate-800/80 shadow-md' : 'bg-slate-900 border-slate-800 text-white shadow-md'} border flex flex-col justify-between`}>
          <div className="text-xs font-bold text-slate-300 tracking-wider uppercase">
            PAYMENT METHODS
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="grid grid-cols-2 divide-x divide-slate-800/90 pt-1 flex-1">
              {/* UPI Sub-section */}
              <div className="pr-3">
                <UpiBrandIcon />
                <div className="text-3xl sm:text-4xl font-extrabold text-white font-sans mt-2.5 leading-none">
                  {todaysUpiOrdersCount}
                </div>
              </div>
              {/* COD Sub-section */}
              <div className="pl-4 sm:pl-6">
                <CodBrandIcon />
                <div className="text-3xl sm:text-4xl font-extrabold text-white font-sans mt-2.5 leading-none">
                  {todaysCodOrdersCount}
                </div>
              </div>
            </div>
            <DeliveryBox3DIcon />
          </div>
        </div>

        {/* Panel 4 (Bottom-Right): REVENUE BREAKDOWN */}
        <div className={`p-4 sm:p-5 rounded-2xl ${isDarkMode ? 'bg-[#161922] border-slate-800/80 shadow-md' : 'bg-slate-900 border-slate-800 text-white shadow-md'} border flex flex-col justify-between`}>
          <div className="text-xs font-bold text-slate-300 tracking-wider uppercase">
            REVENUE BREAKDOWN
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="grid grid-cols-2 divide-x divide-slate-800/90 pt-1 flex-1">
              {/* UPI Amount Sub-section */}
              <div className="pr-3">
                <div className="text-[11px] sm:text-xs font-bold text-slate-300 tracking-wider uppercase">
                  UPI Received
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white font-sans mt-2.5 tracking-tight leading-none">
                  ₹{todaysUpiTotalAmount.toFixed(2)}
                </div>
              </div>
              {/* COD Pending Amount Sub-section */}
              <div className="pl-4 sm:pl-6">
                <div className="text-[11px] sm:text-xs font-bold text-slate-300 tracking-wider uppercase">
                  COD Pending
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white font-sans mt-2.5 tracking-tight leading-none">
                  ₹{todaysCodPendingAmount.toFixed(2)}
                </div>
              </div>
            </div>
            <CoinsRevenue3DIcon />
          </div>
        </div>
      </div>

      {/* Orders Management Anchor & Section */}
      <div id="orders-management-section" className="space-y-3 pt-2">

      {/* Search & Filter Toolbar */}

      {/* Search & Filter Toolbar - Professional & Compact */}
      <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-xs'} border flex flex-wrap items-center gap-2 text-xs`}>
        {/* Search input with small icon */}
        <div className="relative flex items-center flex-1 min-w-[140px]">
          <Search className="w-3 h-3 text-slate-400 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'} border rounded-lg pl-7 pr-7 py-1 text-[11px] focus:outline-none focus:border-indigo-500 transition-colors`}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 text-slate-500 hover:text-slate-300 text-[10px]"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Payment Method Filter */}
          <div className={`flex items-center gap-1 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'} border rounded-lg px-2 py-1`}>
            <Coins className="w-3 h-3 text-amber-400 shrink-0" />
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className={`bg-transparent border-none ${isDarkMode ? 'text-white' : 'text-slate-900'} text-[11px] font-medium focus:outline-none cursor-pointer pr-1`}
            >
              <option value="all" className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Payment: All</option>
              <option value="cod" className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>COD</option>
              <option value="upi" className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>UPI</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className={`flex items-center gap-1 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'} border rounded-lg px-2 py-1`}>
            <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className={`bg-transparent border-none ${isDarkMode ? 'text-white' : 'text-slate-900'} text-[11px] font-medium focus:outline-none cursor-pointer pr-1`}
            >
              <option value="all" className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Status: All</option>
              <option value="clear" className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Clear</option>
              <option value="pending" className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Pending</option>
            </select>
          </div>

          {/* View Switcher: Cards vs Table */}
          <div className={`flex items-center ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'} border rounded-lg p-0.5`}>
            <button
              onClick={() => setViewLayout('cards')}
              className={`p-1 rounded text-xs transition ${
                viewLayout === 'cards' ? 'bg-indigo-600 text-white shadow-sm' : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
              title="Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewLayout('table')}
              className={`p-1 rounded text-xs transition ${
                viewLayout === 'table' ? 'bg-indigo-600 text-white shadow-sm' : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Purge unwanted junks / dummy parcels */}
          {onPurgeDummyOrders && (
            <button
              onClick={onPurgeDummyOrders}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition ${
                isDarkMode 
                  ? 'bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/60' 
                  : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
              }`}
              title="Purge unwanted junks and dummy parcels"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              <span className="hidden sm:inline">Purge Dummy Junks</span>
            </button>
          )}
        </div>
      </div>

      {/* Orders Content: Empty State vs Cards vs Table */}
      {consolidatedParcels.length === 0 ? (
        <div className={`p-12 rounded-2xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'} border text-center space-y-4`}>
          <div className={`w-16 h-16 rounded-2xl ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100 border-slate-200'} border mx-auto flex items-center justify-center text-indigo-500`}>
            <Package className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No Customer Parcels Received Yet</h3>
          </div>
        </div>
      ) : viewLayout === 'cards' ? (
        /* WORKER PARCEL CARDS VIEW (Blinkit / Domino's Delivery Partner Format) */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {consolidatedParcels.map((ord) => {
            const isMultiple = Boolean(ord.isMultipleOrders && (ord.mergedOrderCount || 0) > 1);
            const parcelMeta = getParcelBadge(ord.parcelType);
            const isCOD = ord.paymentMethod === 'cash_on_delivery' || 
                          ord.paymentMethod.toLowerCase().includes('cash') ||
                          ord.paymentMethod.toLowerCase().includes('cod');
            const isUPI = ord.paymentMethod === 'upi' || 
                          ord.paymentMethod.toLowerCase().includes('upi') ||
                          ord.paymentMethod === 'card' ||
                          ord.paymentMethod === 'net_banking' ||
                          ord.paymentMethod === 'wallet';
            const isPendingPayment = ord.paymentStatus === 'pending';

            const cardBorderClass = isCOD
              ? 'card-cod-moving-border'
              : isUPI
              ? 'card-upi-green-border'
              : 'border border-slate-800 hover:border-slate-700';

              return (
              <div
                key={ord.id}
                onClick={() => onSelectOrder(ord)}
                className={`rounded-3xl ${isDarkMode ? 'bg-black border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} p-5 space-y-4 transition hover:shadow-xl cursor-pointer relative group flex flex-col justify-between shadow-xs ${cardBorderClass}`}
              >
                {/* Top Header Banner matching reference image */}
                <div className={`flex items-center gap-3 pb-3 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <div className={`w-10 h-10 rounded-2xl ${
                    isDarkMode 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-emerald-50 text-emerald-600'
                  } flex items-center justify-center shrink-0`}>
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Parcel Received • #{ord.orderNumber}
                      </h3>
                    </div>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      The order has been successfully received.
                    </p>
                  </div>
                </div>

                {/* Customer & Delivery Address Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Customer Details */}
                  <div className={`p-3.5 rounded-2xl ${isDarkMode ? 'bg-slate-800/80 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-900'} border space-y-2.5`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-2xl ${isDarkMode ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-600'} flex items-center justify-center shrink-0`}>
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-400'} uppercase tracking-wider`}>Customer Details</div>
                        <div className={`text-base sm:text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{ord.customer.name}</div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'} font-mono pl-1`}>
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{ord.customer.phone}</span>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div className={`p-3.5 rounded-2xl ${isDarkMode ? 'bg-slate-800/80 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-900'} border space-y-2.5`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-2xl ${isDarkMode ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-rose-50 text-rose-600'} flex items-center justify-center shrink-0`}>
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <div className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-400'} uppercase tracking-wider`}>Delivery Address</div>
                        <div className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Shipping Location</div>
                      </div>
                    </div>
                    <div className={`text-sm sm:text-base ${isDarkMode ? 'text-slate-200' : 'text-slate-800'} font-medium leading-relaxed pl-1`}>
                      {ord.customer.address}
                      {ord.customer.landmark && <span className="text-amber-500 block text-xs mt-0.5 font-medium">Near: {ord.customer.landmark}</span>}
                    </div>
                  </div>
                </div>

                {/* Item Details Card - Shows ALL products ordered by customer */}
                <div className={`rounded-2xl ${isDarkMode ? 'text-slate-200' : 'text-slate-900'} space-y-2`}>
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>
                      <div className={`w-6 h-6 rounded-lg ${
                        isDarkMode 
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                          : 'bg-purple-50 text-purple-600'
                      } flex items-center justify-center`}>
                        {getParcelIcon(ord.parcelType)}
                      </div>
                      <span>
                        Item Details ({ord.items.length})
                      </span>
                    </div>

                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                      isDarkMode ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {ord.items.reduce((s, it) => s + (it.quantity || 1), 0)} Qty Total
                    </span>
                  </div>

                  <div className="space-y-2">
                    {ord.items.map((item, idx) => {
                      const itemImg = item.image || (item as any).imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&q=80';
                      return (
                        <div key={item.id ? `${item.id}-${idx}` : `item-${idx}`} className={`flex items-center justify-between gap-3 p-3 rounded-2xl ${isDarkMode ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-900'} border shadow-xs overflow-hidden`}>
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <img
                              src={itemImg}
                              alt={item.name}
                              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-slate-200/60 shrink-0 shadow-xs"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&q=80';
                              }}
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0 flex-1">
                              <div className={`text-sm sm:text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'} leading-snug line-clamp-2`}>{item.name}</div>
                              <div className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-mono mt-0.5`}>₹{item.price.toFixed(2)} each</div>
                            </div>
                          </div>

                          {/* Vertical Arrangement for Qty & Total Price to prevent overflowing outside parcel box */}
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <div className={`px-2.5 py-1 rounded-xl ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'} border flex flex-col items-center justify-center text-center min-w-[70px]`}>
                              <div className={`text-[9px] ${isDarkMode ? 'text-slate-400' : 'text-slate-400'} uppercase font-bold leading-tight`}>Qty</div>
                              <div className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'} font-mono leading-tight`}>{item.quantity}</div>
                            </div>

                            <div className={`px-2.5 py-1 rounded-xl ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'} border flex flex-col items-center justify-center text-center min-w-[70px]`}>
                              <div className={`text-[9px] ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} uppercase font-bold leading-tight`}>Total</div>
                              <div className={`text-xs sm:text-sm font-extrabold ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'} font-mono leading-tight whitespace-nowrap`}>₹{(item.price * item.quantity).toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>



                {/* Worker Action Hub Buttons */}
                <div className={`pt-2 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'} flex items-center gap-2`}>
                  {ord.status === 'pending' && (
                    <button
                      onClick={(e) => handleWorkerNextAction(ord, e)}
                      className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Accept & Receive Parcel</span>
                    </button>
                  )}

                  {ord.status === 'received' && (
                    <button
                      onClick={(e) => handleWorkerNextAction(ord, e)}
                      className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingBasket className="w-3.5 h-3.5" />
                      <span>Mark Packed & Ready</span>
                    </button>
                  )}

                  {ord.status === 'processing' && (
                    <button
                      onClick={(e) => handleWorkerNextAction(ord, e)}
                      className="flex-1 py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Dispatch (Out for Delivery)</span>
                    </button>
                  )}

                  {ord.status === 'out_for_delivery' && (
                    <button
                      onClick={(e) => handleWorkerNextAction(ord, e)}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isCOD ? `Collect ₹${ord.totalAmount} & Deliver` : 'Mark Delivered'}</span>
                    </button>
                  )}

                  {ord.status === 'delivered' && isPendingPayment && isCOD && (
                    <button
                      onClick={(e) => handleMarkPaymentClear(ord, e)}
                      className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Confirm ₹{ord.totalAmount} Cash Clear</span>
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectOrder(ord);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* COMPACT TABLE VIEW */
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Payment Status</th>
                  <th className="py-3 px-4">Fulfillment Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {consolidatedParcels.map((ord) => {
                  const isMultiple = Boolean(ord.isMultipleOrders && (ord.mergedOrderCount || 0) > 1);
                  const parcelMeta = getParcelBadge(ord.parcelType);
                  const isCOD = ord.paymentMethod === 'cash_on_delivery' || 
                                ord.paymentMethod.toLowerCase().includes('cash') ||
                                ord.paymentMethod.toLowerCase().includes('cod');
                  const isUPI = ord.paymentMethod === 'upi' || 
                                ord.paymentMethod.toLowerCase().includes('upi') ||
                                ord.paymentMethod === 'card' ||
                                ord.paymentMethod === 'net_banking' ||
                                ord.paymentMethod === 'wallet';

                  return (
                    <tr 
                      key={ord.id}
                      className={`hover:bg-slate-800/40 transition-colors cursor-pointer group ${
                        isCOD 
                          ? 'border-l-4 border-l-rose-500 bg-rose-950/10' 
                          : isUPI 
                          ? 'border-l-4 border-l-emerald-500 bg-emerald-950/10' 
                          : ''
                      }`}
                      onClick={() => onSelectOrder(ord)}
                    >
                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white flex items-center gap-1.5 flex-wrap">
                          <span>{ord.customer.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {ord.customer.phone}
                        </div>
                      </td>

                      {/* Address */}
                      <td className="py-3.5 px-4 max-w-[220px]">
                        <div className="truncate text-slate-300">{ord.customer.address}</div>
                        {ord.customer.landmark && (
                          <div className="text-[10px] text-amber-400/80 truncate">Near: {ord.customer.landmark}</div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-mono font-bold text-white text-sm">
                        ₹{ord.totalAmount.toFixed(2)}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-black tracking-wider ${
                          isCOD 
                            ? 'bg-rose-500/20 text-rose-300 border-2 border-rose-500/50' 
                            : 'bg-emerald-500/20 text-emerald-300 border-2 border-emerald-500/50'
                        }`}>
                          {isCOD ? <Coins className="w-4 h-4 text-rose-400" /> : <QrCode className="w-4 h-4 text-emerald-400" />}
                          <span>{isCOD ? 'COD' : 'UPI'}</span>
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ord.paymentStatus === 'clear' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${ord.paymentStatus === 'clear' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                          <span>{ord.paymentStatus === 'clear' ? 'Clear' : 'Pending'}</span>
                        </span>
                      </td>

                      {/* Fulfillment Status */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={ord.status}
                          onChange={(e) => onUpdateStatus(ord.id, e.target.value as OrderStatus)}
                          className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border uppercase tracking-wider cursor-pointer bg-slate-950 focus:outline-none ${getStatusBadge(ord.status)}`}
                        >
                          <option value="pending">Awaiting Receipt</option>
                          <option value="received">Parcel Received</option>
                          <option value="processing">Processing/Packed</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectOrder(ord);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delivered Orders Drafts / Archive (Bottom of Dashboard, auto-cleans each day at 12 AM) */}
      <div className={`mt-8 pt-6 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'} space-y-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'} uppercase tracking-wider`}>Delivered Orders Drafts (Daily Auto Archive)</h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Completed deliveries stored for the current day and automatically cleaned each day at 12 AM.</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full ${isDarkMode ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-700 border border-slate-200'} font-mono text-xs`}>
            {deliveredDrafts.length} Archived
          </span>
        </div>

        {deliveredDrafts.length === 0 ? (
          <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-slate-900/50 border border-slate-800 text-slate-500' : 'bg-white border border-slate-200 text-slate-500 shadow-xs'} text-center text-xs italic`}>
            No delivered drafts stored for today. Completed orders appear here and automatically clean each day at 12 AM.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {deliveredDrafts.map((ord) => {
              return (
                <div
                  key={ord.id}
                  onClick={() => onSelectOrder(ord)}
                  className={`rounded-xl ${isDarkMode ? 'bg-black border-slate-800' : 'bg-white border-slate-200'} border p-4 space-y-3 transition hover:border-slate-700 cursor-pointer relative group flex flex-col justify-between shadow-xs`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-emerald-500">
                      {ord.orderNumber}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                      <Calendar className="w-3 h-3 text-indigo-400" />
                      <span>{formatDateWithDay(ord.createdAt)}</span>
                    </div>
                  </div>
                  <div className={`flex items-center justify-between text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{ord.customer.name}</span>
                    <span className="font-mono font-bold text-emerald-500">₹{ord.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} italic`}>
                    Auto-cleans daily at 12 AM
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      </div>

      {/* Floating Image Preview Lightbox Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-2xl p-4 max-w-sm w-full shadow-2xl space-y-3 relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              ✕
            </button>
            <div className="font-bold text-white text-base pt-1">{previewImage.name}</div>
            <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-square shadow-inner">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
            </div>
            {previewImage.price !== undefined && previewImage.quantity !== undefined && (
              <div className="flex items-center justify-between px-2 text-xs text-slate-300 font-mono">
                <span>Qty: {previewImage.quantity} x ₹{previewImage.price.toFixed(2)}</span>
                <span className="text-emerald-400 font-bold text-sm">Total: ₹{(previewImage.price * previewImage.quantity).toFixed(2)}</span>
              </div>
            )}
            <button
              onClick={() => setPreviewImage(null)}
              className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
