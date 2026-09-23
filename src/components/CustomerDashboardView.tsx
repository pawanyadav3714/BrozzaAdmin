import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Clock, 
  MapPin, 
  Phone, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Coins, 
  ShieldCheck, 
  Lock, 
  Timer, 
  ArrowRight,
  Store,
  Info,
  ChevronRight,
  Flame,
  BadgeAlert
} from 'lucide-react';
import { Product, CafeStatus, Order, PaymentMethodType, ParcelType } from '../types';

interface CustomerDashboardViewProps {
  products: Product[];
  cafeStatus: CafeStatus;
  isDarkMode: boolean;
  onPlaceOrder: (orderData: Partial<Order>) => Promise<void>;
  onOpenAdminCafeModal?: () => void;
  onReopenCafeEarly?: () => Promise<void>;
  onUpdateCafeStatus?: (status: CafeStatus) => Promise<void>;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export const CustomerDashboardView: React.FC<CustomerDashboardViewProps> = ({
  products,
  cafeStatus,
  isDarkMode,
  onPlaceOrder,
  onOpenAdminCafeModal,
  onReopenCafeEarly,
  onUpdateCafeStatus
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [closedAlertOpen, setClosedAlertOpen] = useState(false);
  const [lastAttemptedDish, setLastAttemptedDish] = useState<string>('');

  // Checkout form fields
  const [customerName, setCustomerName] = useState('Aman Deep');
  const [customerPhone, setCustomerPhone] = useState('+91 98765 43210');
  const [deliveryAddress, setDeliveryAddress] = useState('Flat 204, Royal Palms, Sector 14');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('cash_on_delivery');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccessId, setOrderSuccessId] = useState<string | null>(null);

  // Live countdown timer for reopening
  const [countdown, setCountdown] = useState<string>('');

  useEffect(() => {
    if (cafeStatus.isOpen || !cafeStatus.reopenTime) {
      setCountdown('');
      return;
    }

    const calcCountdown = () => {
      const target = new Date(cafeStatus.reopenTime).getTime();
      const diff = target - Date.now();
      if (diff <= 0) {
        setCountdown('Opening momentarily...');
        return;
      }
      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(`${hrs > 0 ? `${hrs}h ` : ''}${mins}m ${secs}s`);
    };

    calcCountdown();
    const interval = setInterval(calcCountdown, 1000);
    return () => clearInterval(interval);
  }, [cafeStatus]);

  // Categories list
  const categories = useMemo(() => {
    const list = Array.from(new Set(products.map(p => p.category || 'General')));
    return ['All', ...list];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchTerm, selectedCategory]);

  // Handler for customer clicking on any dish / order button
  const handleDishClick = (dish: Product) => {
    if (!cafeStatus.isOpen) {
      setLastAttemptedDish(dish.name);
      setClosedAlertOpen(true);
      return;
    }

    if (dish.stock === 0 || dish.status === 'out_of_stock') {
      alert(`Sorry! ${dish.name} is currently out of stock (0 quantity available).`);
      return;
    }

    // Add to cart if open
    setCart(prev => {
      const exists = prev.find(item => item.product.id === dish.id);
      if (exists) {
        if (dish.stock !== undefined && exists.quantity >= dish.stock) {
          alert(`Only ${dish.stock} units of ${dish.name} available in kitchen.`);
          return prev;
        }
        return prev.map(item => item.product.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product: dish, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateCartQty = (productId: string, delta: number) => {
    if (!cafeStatus.isOpen) {
      setClosedAlertOpen(true);
      return;
    }

    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const deliveryFee = cartSubtotal > 0 ? 30 : 0;
  const totalAmount = cartSubtotal + deliveryFee;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cafeStatus.isOpen) {
      setClosedAlertOpen(true);
      return;
    }
    if (cart.length === 0) return;

    setIsSubmittingOrder(true);
    try {
      const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      const orderPayload: Partial<Order> = {
        orderNumber,
        customer: {
          name: customerName,
          phone: customerPhone,
          address: deliveryAddress
        },
        items: cart.map((it, idx) => ({
          id: it.product.id,
          name: it.product.name,
          sku: it.product.sku,
          price: it.product.price,
          quantity: it.quantity,
          image: it.product.imageUrl
        })),
        subtotal: cartSubtotal,
        shippingFee: deliveryFee,
        tax: 0,
        totalAmount,
        status: 'pending',
        paymentStatus: paymentMethod === 'cash_on_delivery' ? 'pending' : 'clear',
        paymentMethod,
        parcelType: 'hot_food',
        source: 'customer_website',
        createdAt: new Date().toISOString()
      };

      await onPlaceOrder(orderPayload);
      setOrderSuccessId(orderNumber);
      setCart([]);
      setIsCartOpen(false);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleQuickCloseTest = async () => {
    const target = new Date();
    target.setHours(target.getHours() + 1);
    const formatted = target.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const newStatus: CafeStatus = {
      isOpen: false,
      closedAt: new Date().toISOString(),
      reopenTime: target.toISOString(),
      formattedReopenTime: formatted,
      closedBy: 'The Admin ( Rohit )',
      closureReason: `currently cafe is closed. so I'm sorry boss ! . it will open at ${formatted}`
    };
    if (onUpdateCafeStatus) {
      await onUpdateCafeStatus(newStatus);
    } else if (onOpenAdminCafeModal) {
      onOpenAdminCafeModal();
    }
  };

  return (
    <div className={`space-y-6 transition-all duration-300 ${!cafeStatus.isOpen ? 'grayscale contrast-125 bg-black text-white p-3 sm:p-5 rounded-3xl border-2 border-neutral-700 shadow-2xl' : ''}`}>
      {/* Sticky Quick Alert Bar when Cafe is Closed */}
      {!cafeStatus.isOpen && (
        <div className="sticky top-16 z-30 py-3 px-4 sm:px-6 bg-black border-2 border-neutral-700 text-white rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <Lock className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-bold text-neutral-100">
              "currently cafe is closed. so I'm sorry boss ! . it will open at <strong className="text-amber-300 font-mono underline">{cafeStatus.formattedReopenTime || 'Date and Time'}</strong>."
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {countdown && (
              <span className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-amber-400 font-mono font-bold text-[11px]">
                ⏱️ {countdown}
              </span>
            )}
            <button
              onClick={() => setClosedAlertOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold transition shadow cursor-pointer"
            >
              View Alert
            </button>
            {onReopenCafeEarly && (
              <button
                onClick={onReopenCafeEarly}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold border border-neutral-600 transition cursor-pointer"
              >
                Open Early
              </button>
            )}
          </div>
        </div>
      )}

      {/* Interactive Black & White Cafe Closed Hero Alert Banner */}
      {!cafeStatus.isOpen ? (
        <div className="relative overflow-hidden rounded-2xl bg-black border-2 border-neutral-700 p-5 sm:p-6 text-white shadow-2xl animate-in fade-in duration-200">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center shrink-0 text-white shadow-inner">
                <Lock className="w-6 h-6 text-rose-400 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-neutral-800 text-white border border-neutral-600">
                    BLACK & WHITE MODE ACTIVE
                  </span>
                  <span className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    Orders Disabled
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                  Currently Cafe Is Closed
                </h2>
                
                {/* Requested prompt quote alert box */}
                <div className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-700 text-sm font-bold text-neutral-100 max-w-2xl leading-relaxed">
                  "currently cafe is closed. so I'm sorry boss ! . it will open at <span className="text-amber-300 font-extrabold underline">{cafeStatus.formattedReopenTime || 'Date and Time'}</span>."
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                  <div className="flex items-center gap-1.5 text-neutral-200 bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-700">
                    <Clock className="w-4 h-4 text-neutral-400" />
                    <span>Reopening: <strong className="text-white font-mono">{cafeStatus.formattedReopenTime || 'Scheduled Time'}</strong></span>
                  </div>
                  {countdown && (
                    <div className="flex items-center gap-1.5 text-neutral-200 bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-700">
                      <Timer className="w-4 h-4 text-amber-400" />
                      <span>Opens automatically in: <strong className="text-amber-400 font-mono">{countdown}</strong></span>
                    </div>
                  )}
                  <span className="text-neutral-400 text-xs italic">
                    (Touch any dish or button to see interactive alert)
                  </span>
                </div>
              </div>
            </div>

            {/* Admin control shortcuts */}
            <div className="shrink-0 flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <button
                onClick={() => setClosedAlertOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold border border-neutral-600 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>View Alert Message</span>
              </button>
              {onReopenCafeEarly && (
                <button
                  onClick={onReopenCafeEarly}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold transition shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Admin: Open Cafe Early</span>
                </button>
              )}
              {onOpenAdminCafeModal && (
                <button
                  onClick={onOpenAdminCafeModal}
                  className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-bold border border-neutral-700 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Adjust Time</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Cafe Open Welcome Banner with Admin Control to easily toggle Cafe Closed */
        <div className="rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-emerald-950 p-5 sm:p-6 border border-indigo-500/30 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Cafe is Open & Accepting Orders</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
                The Barozza Cafe • Customer Menu
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Fresh hot parcels dispatched straight to your door with live status tracking.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenAdminCafeModal && (
              <button
                onClick={onOpenAdminCafeModal}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-300 hover:text-white text-xs font-bold border border-rose-500/40 transition shadow-sm cursor-pointer"
                title="Admin: Close Cafe and schedule reopening time"
              >
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>Close Cafe (Admin)</span>
              </button>
            )}

            <button
              onClick={handleQuickCloseTest}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-white text-xs font-bold border border-amber-500/40 transition shadow-sm cursor-pointer"
              title="Test Black & White Cafe Closed feature immediately"
            >
              <Timer className="w-3.5 h-3.5 text-amber-400" />
              <span>Test B&W Closed Mode</span>
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-950/50 transition cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Cart ({cart.reduce((sum, i) => sum + i.quantity, 0)})</span>
              {cartSubtotal > 0 && <span className="font-mono ml-1">₹{cartSubtotal}</span>}
            </button>
          </div>
        </div>
      )}

      {/* Order Placed Success Alert */}
      {orderSuccessId && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-white flex items-center justify-between gap-4 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-200">Parcel Order Placed Successfully!</p>
              <p className="text-xs text-slate-300">
                Order <strong className="text-white font-mono">#{orderSuccessId}</strong> was sent to Rohit's Admin Console. The kitchen is preparing your parcel.
              </p>
            </div>
          </div>
          <button
            onClick={() => setOrderSuccessId(null)}
            className="text-xs font-bold text-emerald-300 hover:text-white px-3 py-1.5 rounded-lg bg-emerald-900/50 border border-emerald-700/50"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Category Filter Bar */}
      <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
        !cafeStatus.isOpen 
          ? 'bg-neutral-900 border-neutral-800 text-neutral-300' 
          : (isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs')
      }`}>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search favorite dish or snack..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-9 pr-4 py-1.5 rounded-lg text-xs border outline-hidden transition ${
              !cafeStatus.isOpen
                ? 'bg-black border-neutral-700 text-white placeholder-neutral-500'
                : (isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600')
            }`}
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? (!cafeStatus.isOpen ? 'bg-white text-black' : 'bg-indigo-600 text-white')
                  : (!cafeStatus.isOpen ? 'bg-neutral-800 text-neutral-400 hover:text-white' : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'))
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Dish Catalog Grid - STYLED BLACK & WHITE WHEN CAFE IS CLOSED */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${
        !cafeStatus.isOpen ? 'grayscale contrast-125' : ''
      }`}>
        {filteredProducts.map((dish, idx) => {
          const inCart = cart.find(i => i.product.id === dish.id);
          const isOutOfStock = dish.stock === 0 || dish.status === 'out_of_stock';
          return (
            <div
              key={dish.id ? `${dish.id}-${dish.sku || idx}` : `dish-${idx}`}
              onClick={() => handleDishClick(dish)}
              className={`group rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between cursor-pointer hover:shadow-xl ${
                !cafeStatus.isOpen
                  ? 'bg-neutral-900 border-neutral-700 text-white hover:border-neutral-500'
                  : isOutOfStock
                  ? 'bg-slate-900/60 border-rose-900/40 text-slate-300 opacity-80'
                  : (isDarkMode 
                      ? 'bg-slate-900 border-slate-800 text-white hover:border-indigo-500/50' 
                      : 'bg-white border-slate-200 text-slate-900 shadow-xs hover:border-indigo-300')
              }`}
            >
              <div>
                {/* Dish Image */}
                <div className="relative h-44 w-full overflow-hidden bg-neutral-950">
                  <img
                    src={dish.imageUrl || '/images/frenchh.png'}
                    alt={dish.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&q=80';
                    }}
                  />
                  
                  {/* Category badge */}
                  <span className={`absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                    !cafeStatus.isOpen
                      ? 'bg-black/80 text-white border border-neutral-600'
                      : 'bg-indigo-900/80 text-indigo-200 border border-indigo-500/40'
                  }`}>
                    {dish.category}
                  </span>

                  {/* SOLD OUT / Out of stock overlay badge */}
                  {!cafeStatus.isOpen ? (
                    <div className="absolute top-3 inset-x-0 flex items-center justify-center z-10">
                      <span className="px-3 py-1 rounded bg-red-600 text-white text-xs font-black uppercase tracking-widest shadow-2xl border border-red-500">
                        SOLD OUT
                      </span>
                    </div>
                  ) : isOutOfStock ? (
                    <div className="absolute top-3 inset-x-0 flex items-center justify-center z-10">
                      <span className="px-3 py-1 rounded bg-rose-600 text-white text-xs font-black uppercase tracking-widest shadow-2xl border border-rose-500">
                        OUT OF STOCK
                      </span>
                    </div>
                  ) : dish.stock !== undefined && dish.stock <= 5 ? (
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black flex items-center gap-1 shadow-md">
                      <span>Low ({dish.stock})</span>
                    </div>
                  ) : (
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center gap-1 shadow-md">
                      <span>4.5</span>
                      <span>★</span>
                    </div>
                  )}

                  {/* Quick price tag */}
                  <span className={`absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-xl text-xs font-black font-mono shadow-md ${
                    !cafeStatus.isOpen
                      ? 'bg-black text-red-500 border border-neutral-700'
                      : 'bg-slate-900/90 text-emerald-400 border border-slate-700'
                  }`}>
                    ₹{dish.price.toFixed(2)}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold tracking-tight line-clamp-1 group-hover:text-indigo-400 transition-colors">
                      {dish.name}
                    </h3>
                    <span className={`text-xs font-black font-mono ${!cafeStatus.isOpen ? 'text-red-500' : 'text-emerald-400'}`}>
                      ₹{dish.price.toFixed(2)}
                    </span>
                  </div>

                  {/* Stock Availability Indicator */}
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {isOutOfStock ? (
                      <span className="font-bold text-rose-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                        Out of stock (0 left)
                      </span>
                    ) : dish.stock !== undefined && dish.stock <= 5 ? (
                      <span className="font-bold text-amber-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        Only {dish.stock} portions left!
                      </span>
                    ) : (
                      <span className="font-medium text-emerald-400/90 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        {dish.stock ?? 25} available
                      </span>
                    )}
                  </div>

                  <p className={`text-xs line-clamp-2 leading-relaxed ${!cafeStatus.isOpen ? 'text-neutral-400' : (isDarkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                    {!cafeStatus.isOpen
                      ? (cafeStatus.closureReason || `currently cafe is closed. so I'm sorry boss ! . it will open at ${cafeStatus.formattedReopenTime || 'soon'}.`)
                      : (dish.description || `${dish.name} freshly prepared with signature recipes.`)}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className={`p-4 pt-0 flex items-center justify-between gap-2 border-t mt-3 pt-3 ${
                !cafeStatus.isOpen ? 'border-neutral-800' : (isDarkMode ? 'border-slate-800/80' : 'border-slate-100')
              }`}>
                <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  5-10 MIN
                  {cafeStatus.isOpen && (
                    <span className="ml-1 text-[10px] font-extrabold text-neutral-400 uppercase hidden sm:inline">
                      • FREE DELIVERY
                    </span>
                  )}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDishClick(dish);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    !cafeStatus.isOpen
                      ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border border-neutral-700 uppercase font-extrabold text-[10px]'
                      : isOutOfStock
                      ? 'bg-rose-950/60 border border-rose-800 text-rose-300 hover:bg-rose-900/60 font-bold'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                  }`}
                >
                  {!cafeStatus.isOpen ? (
                    <span>UNAVAILABLE</span>
                  ) : isOutOfStock ? (
                    <span>OUT OF STOCK</span>
                  ) : inCart ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Added ({inCart.quantity})</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Order Parcel</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE ALERT MODAL: "currently cafe is closed. so I'm sorry boss ! . it will open at Date and Time." */}
      {/* ========================================================================= */}
      {closedAlertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-neutral-950 border-2 border-neutral-700 text-white p-6 shadow-2xl space-y-5 relative">
            {/* Close Button */}
            <button
              onClick={() => setClosedAlertOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon Header */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-700 flex items-center justify-center text-amber-400 shadow-inner">
                <Store className="w-6 h-6 text-neutral-300" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-neutral-900 text-neutral-400 border border-neutral-700">
                  Cafe Notice
                </span>
                <h3 className="text-lg font-black tracking-tight text-white mt-0.5">
                  Ordering Locked
                </h3>
              </div>
            </div>

            {/* Exact Requested Prompt Alert Message */}
            <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-700 space-y-3">
              <div className="text-sm font-bold text-neutral-100 leading-relaxed font-sans">
                "currently cafe is closed. so I'm sorry boss ! . it will open at <span className="text-amber-300 font-extrabold underline">{cafeStatus.formattedReopenTime || 'Date and Time'}</span>."
              </div>
              {lastAttemptedDish && (
                <p className="text-xs text-neutral-400 pt-1 border-t border-neutral-800">
                  Attempted order: <strong className="text-neutral-200">{lastAttemptedDish}</strong>
                </p>
              )}
            </div>

            {/* Reopen Details Strip */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                <span className="text-neutral-400">Scheduled Reopening:</span>
                <span className="font-bold font-mono text-white">{cafeStatus.formattedReopenTime}</span>
              </div>
              {countdown && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                  <span className="text-neutral-400 flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5 text-neutral-400" />
                    Automatic Reopen In:
                  </span>
                  <span className="font-bold font-mono text-amber-400">{countdown}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setClosedAlertOpen(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold transition shadow cursor-pointer"
              >
                Understood, I Will Check Back Later
              </button>
              {onReopenCafeEarly ? (
                <button
                  onClick={async () => {
                    setClosedAlertOpen(false);
                    await onReopenCafeEarly();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold border border-neutral-600 transition cursor-pointer"
                >
                  Admin: Reopen Early
                </button>
              ) : onOpenAdminCafeModal ? (
                <button
                  onClick={() => {
                    setClosedAlertOpen(false);
                    onOpenAdminCafeModal();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold border border-neutral-600 transition cursor-pointer"
                >
                  Admin: Reopen Early
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Cart & Checkout Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className={`w-full max-w-md h-full flex flex-col justify-between border-l shadow-2xl ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Cart Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold">Your Parcel Basket</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-300 font-mono font-bold">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)} items
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {!cafeStatus.isOpen && (
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-700 text-white space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                    <Lock className="w-3.5 h-3.5" />
                    <span>CAFE IS CLOSED</span>
                  </div>
                  <p className="text-xs text-neutral-300">
                    Order checkout is disabled. Reopens at {cafeStatus.formattedReopenTime}.
                  </p>
                </div>
              )}

              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <ShoppingBag className="w-12 h-12 mx-auto text-slate-600" />
                  <p className="text-sm font-semibold">Your parcel basket is empty</p>
                  <p className="text-xs text-slate-500">Add delicious snacks or dishes from the menu above!</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div 
                    key={item.product.id ? `${item.product.id}-${idx}` : `cart-${idx}`}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={item.product.imageUrl || '/images/frenchh.png'} 
                        alt={item.product.name} 
                        className="w-12 h-12 rounded-lg object-cover bg-neutral-900 shrink-0"
                      />
                      <div>
                        <h4 className="text-xs font-bold line-clamp-1">{item.product.name}</h4>
                        <p className="text-xs text-emerald-400 font-mono font-semibold">
                          ₹{item.product.price} × {item.quantity} = ₹{item.product.price * item.quantity}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateCartQty(item.product.id, -1)}
                        className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-mono font-bold w-5 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateCartQty(item.product.id, 1)}
                        className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}

              {/* Delivery Details Form */}
              {cart.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Delivery & Customer Details
                  </h4>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Customer Full Name</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-lg text-xs border ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200'
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-lg text-xs border ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200'
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Delivery Address</label>
                    <textarea
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-lg text-xs border ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200'
                      }`}
                      required
                    />
                  </div>

                  {/* Payment Mode Selection */}
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash_on_delivery')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                          paymentMethod === 'cash_on_delivery'
                            ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <Coins className="w-4 h-4" />
                        <span>Cash on Delivery</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('upi')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                          paymentMethod === 'upi'
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Instant UPI</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className={`p-4 border-t space-y-3 ${
                isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold text-white">₹{cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Delivery Fee:</span>
                    <span className="font-mono font-semibold text-white">₹{deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-800">
                    <span>Total Amount:</span>
                    <span className="font-mono text-emerald-400 text-base">₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={isSubmittingOrder || !cafeStatus.isOpen}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    !cafeStatus.isOpen
                      ? 'bg-neutral-800 text-neutral-400 border border-neutral-600'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                  }`}
                >
                  {!cafeStatus.isOpen ? (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Cafe is Closed (Opens {cafeStatus.formattedReopenTime})</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>{isSubmittingOrder ? 'Placing Parcel...' : `Place Parcel Order (₹${totalAmount})`}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
