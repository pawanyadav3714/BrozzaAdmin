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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              {getParcelIcon(order.parcelType)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono">{order.orderNumber}</h2>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border uppercase tracking-wider ${getStatusBadge(order.status)}`}>
                  {order.status.replace('_', ' ')}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase font-bold">
                  {order.parcelType.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Received from customer website on {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Print Parcel Invoice / Slip"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Worker Delivery Stage Progression */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Worker Parcel Fulfillment Pipeline
              </span>
              <span className="text-[11px] text-indigo-400 font-mono">
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
                    className={`py-2 px-1 text-center rounded-lg text-xs font-semibold border transition ${
                      isCurrent
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                        : isPassed
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/40'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="capitalize">{step.replace('_', ' ')}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer & Address Card with Quick Action Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Details */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  Customer Information
                </span>
                {order.deliveryOtp && (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    <Hash className="w-3 h-3" />
                    OTP: {order.deliveryOtp}
                  </span>
                )}
              </div>

              <div>
                <p className="text-sm font-bold text-white">{order.customer.name}</p>
                <p className="text-slate-400 font-mono mt-0.5">{order.customer.phone}</p>
                {order.customer.email && (
                  <p className="text-slate-500 text-[11px]">{order.customer.email}</p>
                )}
              </div>

              {/* Quick Contact Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                <a
                  href={`tel:${order.customer.phone}`}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-center font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Call</span>
                </a>
                <a
                  href={`https://wa.me/${order.customer.phone.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(order.customer.name)},%20regarding%20your%20order%20${order.orderNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 text-center font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Delivery Address & Navigation */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                Delivery Address Details
              </span>

              <div className="text-slate-300 leading-relaxed">
                <p className="font-medium">{order.customer.address}</p>
                {order.customer.landmark && (
                  <p className="text-amber-400/90 text-[11px] mt-1">
                    <strong>Landmark:</strong> {order.customer.landmark}
                  </p>
                )}
                {order.customer.deliveryInstructions && (
                  <p className="text-indigo-300 text-[11px] italic mt-1">
                    <strong>Instructions:</strong> "{order.customer.deliveryInstructions}"
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customer.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-1.5 px-2 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800/60 text-indigo-300 text-center font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Open Directions in Google Maps</span>
                </a>
              </div>
            </div>
          </div>

          {/* Payment & Billing Breakdown Card */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                Payment & Billing Information
              </span>

              {/* Payment Method Badge */}
              <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-bold uppercase ${
                isCOD ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              }`}>
                {isCOD ? <Coins className="w-3.5 h-3.5" /> : <QrCode className="w-3.5 h-3.5" />}
                <span>{isCOD ? 'Cash on Delivery (COD)' : 'UPI Digital Instant'}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
              <div>
                <div className="text-slate-400">Total Order Amount Payable:</div>
                <div className="text-2xl font-bold text-white font-mono mt-0.5">
                  ₹{order.totalAmount.toFixed(2)}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Subtotal: ₹{order.subtotal.toFixed(2)} • Delivery: ₹{order.shippingFee.toFixed(2)} • Taxes: ₹{order.tax.toFixed(2)}
                </p>
              </div>

              {/* Payment Status Switcher / Cash Collected Button */}
              <div className="space-y-2">
                <label className="text-slate-400 block text-[11px]">Payment Status:</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPaymentStatus('clear')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                      currentPaymentStatus === 'clear'
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    Clear (Paid)
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentPaymentStatus('pending')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                      currentPaymentStatus === 'pending'
                        ? 'bg-amber-600 border-amber-500 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    Pending (Collect Cash)
                  </button>
                </div>

                {isCOD && currentPaymentStatus === 'pending' && (
                  <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Worker must collect ₹{order.totalAmount.toFixed(2)} in cash from customer upon delivery.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Parcel Items Table */}
          <div className="space-y-2">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] block">
              Parcel Contents ({order.items.length} item{order.items.length > 1 ? 's' : ''})
            </span>

            <div className="rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{item.sku}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-white">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        ₹{item.price.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Worker Assignment and Rider Tracking */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <label className="text-slate-400 block mb-1 text-[11px]">Assigned Delivery Rider / Worker</label>
              <input
                type="text"
                value={assignedWorker}
                onChange={(e) => setAssignedWorker(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                placeholder="Rider name e.g. Suresh Patel"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 text-[11px]">Tracking / Dispatch Batch #</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                placeholder="TRK-98124"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onCreateSupportTicket(order)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Create Customer Support Ticket
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Close
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-950/40 transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Syncing to Firebase...' : savedSuccess ? 'Saved & Synced!' : 'Save & Sync Update'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
