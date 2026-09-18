import React, { useState } from 'react';
import { 
  X, 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MapPin, 
  User, 
  CreditCard, 
  Save, 
  Printer,
  ExternalLink,
  Phone,
  MessageSquare,
  Navigation,
  Coins,
  QrCode,
  Pizza,
  ShoppingBasket,
  Cpu,
  ShieldCheck,
  Check,
  Hash,
  Sparkles
} from 'lucide-react';
import { Order, OrderStatus, ParcelType } from '../types';

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: OrderStatus, additionalFields?: Partial<Order>) => Promise<void>;
  onCreateSupportTicket: (order: Order) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose,
  onUpdateStatus,
  onCreateSupportTicket
}) => {
  if (!isOpen || !order) return null;

  const [currentStatus, setCurrentStatus] = useState<OrderStatus>(order.status);
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState(order.paymentStatus);
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [assignedWorker, setAssignedWorker] = useState(order.assignedWorker || 'Warehouse Worker');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const isCOD = order.paymentMethod === 'cash_on_delivery' || order.paymentMethod.toLowerCase().includes('cash');
  const isUPI = order.paymentMethod === 'upi' || order.paymentMethod.toLowerCase().includes('upi');

  const statusSteps: OrderStatus[] = ['pending', 'received', 'processing', 'out_for_delivery', 'delivered'];

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'received': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'processing': return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'out_for_delivery': return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
      case 'delivered': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'cancelled': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default: return 'bg-slate-800 text-slate-300';
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateStatus(order.id, currentStatus, {
        paymentStatus: currentPaymentStatus,
        trackingNumber: trackingNumber.trim() || undefined,
        assignedWorker: assignedWorker.trim() || undefined,
        cashCollected: currentPaymentStatus === 'clear' && isCOD
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl text-slate-900 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Banner matching reference design */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Parcel Received</h2>
              <p className="text-xs text-slate-500 mt-0.5">The order has been successfully received.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Parcel Received</span>
            </span>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs bg-slate-50/50">
          {/* Customer & Address Card with Quick Action Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Details */}
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Customer Details
                  </span>
                </div>
                {order.deliveryOtp && (
                  <span className="flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono font-bold border border-emerald-200">
                    <Hash className="w-3 h-3" />
                    OTP: {order.deliveryOtp}
                  </span>
                )}
              </div>

              <div>
                <p className="text-sm font-extrabold text-slate-900">{order.customer.name}</p>
                <p className="text-slate-600 font-mono mt-0.5 font-medium">{order.customer.phone}</p>
                {order.customer.email && (
                  <p className="text-slate-400 text-[11px]">{order.customer.email}</p>
                )}
              </div>

              {/* Quick Contact Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <a
                  href={`tel:${order.customer.phone}`}
                  className="flex-1 py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-center font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Call</span>
                </a>
                <a
                  href={`https://wa.me/${order.customer.phone.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(order.customer.name)},%20regarding%20your%20order%20${order.orderNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-center font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Delivery Address & Navigation */}
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Delivery Address
                </span>
              </div>

              <div className="text-slate-700 leading-relaxed">
                <p className="font-medium">{order.customer.address}</p>
                {order.customer.landmark && (
                  <p className="text-amber-700 text-[11px] mt-1">
                    <strong>Landmark:</strong> {order.customer.landmark}
                  </p>
                )}
                {order.customer.deliveryInstructions && (
                  <p className="text-indigo-700 text-[11px] italic mt-1">
                    <strong>Instructions:</strong> "{order.customer.deliveryInstructions}"
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customer.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 px-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-center font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Open Directions in Google Maps</span>
                </a>
              </div>
            </div>
          </div>

          {/* Item Details Card matching reference */}
          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                {getParcelIcon(order.parcelType)}
              </div>
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Item Details</span>
            </div>

            <div className="space-y-3">
              {order.items.map((item, idx) => {
                const itemImg = item.image || (item as any).imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&q=80';
                return (
                  <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <img
                        src={itemImg}
                        alt={item.name}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0 shadow-xs"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&q=80';
                        }}
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">₹{item.price.toFixed(2)} each</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-center shadow-xs">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Quantity</div>
                        <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">{item.quantity}</div>
                      </div>

                      <div className="px-5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-right shadow-xs">
                        <div className="text-[10px] text-emerald-600 uppercase font-bold">Total Price</div>
                        <div className="text-sm font-bold text-emerald-700 font-mono mt-0.5">₹{(item.price * item.quantity).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom 3 Cards Row: Order Time, Payment Method, Payment Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Order Time Card */}
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Order Time</span>
              </div>
              <div className="text-sm font-bold text-slate-900 font-mono pt-1">
                {new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <div className="text-xs font-semibold text-slate-500 font-mono">
                {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* Payment Method Card */}
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Payment Method</span>
              </div>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-lg font-black text-slate-900 tracking-wider font-mono">
                  {isCOD ? 'COD' : 'UPI'}
                </span>
                <span className="text-xs text-slate-500">
                  {isCOD ? '(Cash on Delivery)' : '(Google Pay)'}
                </span>
              </div>
            </div>

            {/* Payment Status Card */}
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Payment Status</span>
              </div>
              <div className="pt-1">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  currentPaymentStatus === 'clear' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${currentPaymentStatus === 'clear' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  <span>{currentPaymentStatus === 'clear' ? 'Payment Successful' : 'Payment Pending'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Worker Delivery Stage Progression & Assignment */}
          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Worker Fulfillment Pipeline & Status
              </span>
              <span className="text-[11px] text-indigo-600 font-mono font-medium">
                Click step to update stage
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {statusSteps.map((step, idx) => {
                const currentIndex = statusSteps.indexOf(currentStatus);
                const isPassed = currentIndex >= idx;
                const isCurrent = currentStatus === step;

                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setCurrentStatus(step)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      isCurrent
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                        : isPassed
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="capitalize">{step.replace('_', ' ')}</div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-slate-600 block mb-1 text-[11px] font-medium">Assigned Delivery Rider / Worker</label>
                <input
                  type="text"
                  value={assignedWorker}
                  onChange={(e) => setAssignedWorker(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-indigo-500"
                  placeholder="Rider name e.g. Suresh Patel"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1 text-[11px] font-medium">Tracking / Dispatch Batch #</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder="TRK-98124"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
          <button
            type="button"
            onClick={() => onCreateSupportTicket(order)}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
          >
            Create Customer Support Ticket
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              Close
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-200 transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Syncing...' : savedSuccess ? 'Saved & Synced!' : 'Save & Sync Update'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
