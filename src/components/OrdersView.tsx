import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
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
  Flame
} from 'lucide-react';
import { Order, OrderStatus, ParcelType, PaymentStatus } from '../types';

interface OrdersViewProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus, additionalFields?: Partial<Order>) => Promise<void>;
  onCreateSupportTicket: (order: Order) => void;
  onOpenCreateOrder: () => void;
  onOpenSyncGuide?: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  onSelectOrder,
  onUpdateStatus,
  onCreateSupportTicket,
  onOpenCreateOrder,
  onOpenSyncGuide
}) => {
  const [viewLayout, setViewLayout] = useState<'cards' | 'table'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [parcelTypeFilter, setParcelTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount_high' | 'amount_low'>('newest');

  // Filtered & sorted orders
  const filteredOrders = useMemo(() => {
    return orders
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
  }, [orders, searchTerm, statusFilter, paymentMethodFilter, paymentStatusFilter, parcelTypeFilter, sortBy]);

  // Metrics
  const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.totalAmount : 0), 0);
  const pendingReceiveCount = orders.filter(o => o.status === 'pending').length;
  const inTransitCount = orders.filter(o => o.status === 'out_for_delivery' || o.status === 'processing' || o.status === 'received').length;
  const codPendingTotal = orders
    .filter(o => o.status !== 'cancelled' && o.paymentStatus === 'pending')
    .reduce((sum, o) => sum + o.totalAmount, 0);

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

  // Fast Worker Status Transitions
  const handleWorkerNextAction = async (ord: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    if (ord.status === 'pending') {
      await onUpdateStatus(ord.id, 'received', {
        assignedWorker: 'Delivery Partner Hub',
        parcelReceivedAt: new Date().toISOString()
      });
    } else if (ord.status === 'received') {
      await onUpdateStatus(ord.id, 'processing');
    } else if (ord.status === 'processing') {
      await onUpdateStatus(ord.id, 'out_for_delivery', {
        trackingNumber: `RDR-${Math.floor(100 + Math.random() * 900)}`
      });
    } else if (ord.status === 'out_for_delivery') {
      await onUpdateStatus(ord.id, 'delivered', {
        deliveredAt: new Date().toISOString(),
        paymentStatus: 'clear',
        cashCollected: true
      });
    }
  };

  const handleMarkPaymentClear = async (ord: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    await onUpdateStatus(ord.id, ord.status, {
      paymentStatus: 'clear',
      cashCollected: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Real-time Worker Notification Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
            <Truck className="w-5 h-5 animate-pulse" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Worker Parcel Reception & Dispatch Console
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                Firebase Live
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Synced with customer website • Instant alerts for incoming parcels, COD collection & delivery fulfillment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCreateOrder}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>Simulate Customer Order</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Orders Received</span>
            <Package className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{orders.length}</p>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Real-time Firestore stream
          </div>
        </div>

        {/* Pending Worker Receipt */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Awaiting Worker Receipt</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-300 font-mono">{pendingReceiveCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Requires worker acceptance</p>
        </div>

        {/* In Fulfillment / Out for delivery */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Active Deliveries (In Transit)</span>
            <Truck className="w-4 h-4 text-violet-400" />
          </div>
          <p className="text-2xl font-bold text-violet-300 font-mono">{inTransitCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">On road or being packed</p>
        </div>

        {/* COD to Collect */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Pending COD Cash to Collect</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 font-mono">₹{codPendingTotal.toFixed(2)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Collect from customer at doorstep</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, phone, address, order #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Payment Method Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">Payment: All</option>
              <option value="cod">Cash on Delivery (COD)</option>
              <option value="upi">UPI (Instant)</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">Pay Status: All</option>
              <option value="clear">Clear (Paid)</option>
              <option value="pending">Pending (Unpaid)</option>
            </select>
          </div>

          {/* Parcel Type Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300">
            <ShoppingBasket className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={parcelTypeFilter}
              onChange={(e) => setParcelTypeFilter(e.target.value)}
              className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">Category: All</option>
              <option value="quick_grocery">Blinkit Grocery</option>
              <option value="hot_food">Domino's Hot Food</option>
              <option value="electronics">Electronics</option>
              <option value="standard_parcel">Standard Parcel</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">Status: All</option>
              <option value="pending">Awaiting Receipt</option>
              <option value="received">Parcel Received</option>
              <option value="processing">Processing/Packed</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* View Switcher: Cards vs Table */}
          <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setViewLayout('cards')}
              className={`p-1.5 rounded text-xs transition ${
                viewLayout === 'cards' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Worker Parcel Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewLayout('table')}
              className={`p-1.5 rounded text-xs transition ${
                viewLayout === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Compact Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Orders Content: Empty State vs Cards vs Table */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 mx-auto flex items-center justify-center text-indigo-400">
            <Package className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-white">No Customer Orders Yet</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Dummy data has been cleared. The admin dashboard is actively listening to Firebase Firestore database 
              <span className="text-indigo-400 font-mono mx-1 font-bold">commanding-palisade-58gvj</span> 
              (collection: <span className="font-mono text-slate-300">orders</span>).
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenCreateOrder}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-950/40 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Simulate Customer Order (COD / UPI)</span>
            </button>
          </div>
        </div>
      ) : viewLayout === 'cards' ? (
        /* WORKER PARCEL CARDS VIEW (Blinkit / Domino's Delivery Partner Format) */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((ord) => {
            const parcelMeta = getParcelBadge(ord.parcelType);
            const isCOD = ord.paymentMethod === 'cash_on_delivery' || ord.paymentMethod.toLowerCase().includes('cash');
            const isUPI = ord.paymentMethod === 'upi' || ord.paymentMethod.toLowerCase().includes('upi');
            const isPendingPayment = ord.paymentStatus === 'pending';

            return (
              <div
                key={ord.id}
                onClick={() => onSelectOrder(ord)}
                className="rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 space-y-4 shadow-sm transition hover:shadow-md cursor-pointer relative group flex flex-col justify-between"
              >
                {/* Card Header: Order #, Category, Elapsed Time */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-mono text-white group-hover:text-indigo-400 transition">
                        {ord.orderNumber}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${parcelMeta.badgeClass}`}>
                        {parcelMeta.icon}
                        <span>{parcelMeta.label}</span>
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{formatMinutesAgo(ord.createdAt)}</span>
                    </div>
                  </div>

                  {/* Customer Information Block */}
                  <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        {ord.customer.name}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${ord.customer.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 transition"
                          title="Call Customer"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`https://wa.me/${ord.customer.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(ord.customer.name)},%20your%20order%20${ord.orderNumber}%20is%20being%20processed.`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 transition"
                          title="WhatsApp Customer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Customer Address Details */}
                    <div className="text-[11px] text-slate-300 flex items-start gap-1.5 leading-relaxed">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <div>{ord.customer.address}</div>
                        {ord.customer.landmark && (
                          <div className="text-[10px] text-amber-300/80">
                            Landmark: {ord.customer.landmark}
                          </div>
                        )}
                        {ord.customer.deliveryInstructions && (
                          <div className="text-[10px] text-indigo-300/90 italic mt-0.5">
                            "{ord.customer.deliveryInstructions}"
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Items list preview */}
                  <div className="mt-3 text-[11px] text-slate-400">
                    <div className="flex items-center justify-between text-slate-300 mb-1">
                      <span>Items ({ord.items.reduce((s, i) => s + i.quantity, 0)}):</span>
                      <span className="font-mono text-slate-400">{ord.items.length} unique</span>
                    </div>
                    <div className="text-slate-300 truncate max-w-full font-medium">
                      {ord.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </div>
                  </div>

                  {/* Pricing, Payment Method & Payment Status */}
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-slate-400 text-[10px]">Total Amount</div>
                      <div className="text-base font-bold text-white font-mono">
                        ₹{ord.totalAmount.toFixed(2)}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {/* Payment Method Badge */}
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        isCOD 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      }`}>
                        {isCOD ? <Coins className="w-3 h-3" /> : <QrCode className="w-3 h-3" />}
                        <span>{isCOD ? 'Cash on Delivery' : 'UPI Instant'}</span>
                      </span>

                      {/* Payment Status Pill */}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                        ord.paymentStatus === 'clear' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${ord.paymentStatus === 'clear' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                        <span>{ord.paymentStatus === 'clear' ? 'Payment: CLEAR' : 'Payment: PENDING'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Worker Action Hub Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Order Stage:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(ord.status)}`}>
                      {getStatusLabel(ord.status)}
                    </span>
                  </div>

                  {/* Worker Fast Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {ord.status === 'pending' && (
                      <button
                        onClick={(e) => handleWorkerNextAction(ord, e)}
                        className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Accept & Receive Parcel</span>
                      </button>
                    )}

                    {ord.status === 'received' && (
                      <button
                        onClick={(e) => handleWorkerNextAction(ord, e)}
                        className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ShoppingBasket className="w-3.5 h-3.5" />
                        <span>Mark Packed & Ready</span>
                      </button>
                    )}

                    {ord.status === 'processing' && (
                      <button
                        onClick={(e) => handleWorkerNextAction(ord, e)}
                        className="flex-1 py-2 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Dispatch (Out for Delivery)</span>
                      </button>
                    )}

                    {ord.status === 'out_for_delivery' && (
                      <button
                        onClick={(e) => handleWorkerNextAction(ord, e)}
                        className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isCOD ? `Collect ₹${ord.totalAmount} & Deliver` : 'Mark Delivered'}</span>
                      </button>
                    )}

                    {ord.status === 'delivered' && isPendingPayment && isCOD && (
                      <button
                        onClick={(e) => handleMarkPaymentClear(ord, e)}
                        className="flex-1 py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
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
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="View Full Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
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
                  <th className="py-3 px-4">Order & Category</th>
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
                {filteredOrders.map((ord) => {
                  const parcelMeta = getParcelBadge(ord.parcelType);
                  const isCOD = ord.paymentMethod === 'cash_on_delivery' || ord.paymentMethod.toLowerCase().includes('cash');

                  return (
                    <tr 
                      key={ord.id}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      onClick={() => onSelectOrder(ord)}
                    >
                      {/* Order & Category */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-white group-hover:text-indigo-300">
                          {ord.orderNumber}
                        </div>
                        <div className="mt-1">
                          <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase ${parcelMeta.badgeClass}`}>
                            {parcelMeta.icon}
                            <span>{parcelMeta.label}</span>
                          </span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{ord.customer.name}</div>
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
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isCOD ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}>
                          {isCOD ? <Coins className="w-3 h-3" /> : <QrCode className="w-3 h-3" />}
                          <span>{isCOD ? 'Cash on Delivery (COD)' : 'UPI Instant'}</span>
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

      {/* Footer Info */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between text-xs text-slate-400">
        <div>
          Showing <span className="text-white font-bold">{filteredOrders.length}</span> of <span className="text-white font-bold">{orders.length}</span> live orders
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Target Firebase: <strong>commanding-palisade-58gvj</strong></span>
        </div>
      </div>
    </div>
  );
};
