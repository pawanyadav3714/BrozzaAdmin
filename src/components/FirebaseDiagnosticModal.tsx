import React, { useState } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Send, 
  RefreshCw, 
  ShieldCheck, 
  Copy, 
  Check, 
  Server,
  Code,
  Pizza,
  ShoppingBasket,
  Coins
} from 'lucide-react';
import { firebaseConfig, FirebaseConnectionStatus, pushOrderToFirestore, pushOrderToRTDB } from '../services/firebase';
import { Order } from '../types';

interface FirebaseDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: FirebaseConnectionStatus;
  collectionName: string;
  setCollectionName: (name: string) => void;
  rtdbPath: string;
  setRtdbPath: (path: string) => void;
  activeOrders: Order[];
  onOrderAdded: (order: Order) => void;
}

export const FirebaseDiagnosticModal: React.FC<FirebaseDiagnosticModalProps> = ({
  isOpen,
  onClose,
  status,
  collectionName,
  setCollectionName,
  rtdbPath,
  setRtdbPath,
  activeOrders,
  onOrderAdded
}) => {
  const [copied, setCopied] = useState(false);
  const [targetType, setTargetType] = useState<'firestore' | 'rtdb'>('firestore');
  const [testingWrite, setTestingWrite] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  if (!isOpen) return null;

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(JSON.stringify(firebaseConfig, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDispatchTest = async () => {
    setTestingWrite(true);
    setTestResult(null);

    const testOrder: Partial<Order> = {
      orderNumber: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      customer: {
        name: 'Aman Deep (Live Sync Test)',
        email: 'aman.deep@customer.com',
        phone: '+91 98888 12345',
        address: 'Flat 302, Royal Palms, Outer Ring Road, Bangalore - 560103',
        flatNo: 'Flat 302',
        landmark: 'Near Marathahalli Bridge',
        city: 'Bangalore',
        pincode: '560103',
        deliveryInstructions: 'Urgent parcel - please deliver on 3rd floor'
      },
      items: [
        {
          id: 'test_item_1',
          name: 'Domino’s Farmhouse Cheese Burst Pizza',
          sku: 'DOM-PIZZA-CH',
          price: 459.00,
          quantity: 1
        },
        {
          id: 'test_item_2',
          name: 'Fresh Farm Organic Milk (1L)',
          sku: 'BLK-MILK-01',
          price: 68.00,
          quantity: 2
        }
      ],
      subtotal: 595.00,
      shippingFee: 25.00,
      tax: 29.75,
      totalAmount: 649.75,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'cash_on_delivery',
      parcelType: 'quick_grocery',
      source: 'customer_website',
      deliveryOtp: `${Math.floor(1000 + Math.random() * 9000)}`,
      notes: 'Dispatched via Firebase Diagnostic Console'
    };

    try {
      if (targetType === 'firestore') {
        const id = await pushOrderToFirestore(testOrder, collectionName);
        setTestResult({
          success: true,
          msg: `Successfully dispatched to Firestore [${collectionName}] with Document ID: ${id}`
        });
      } else {
        const id = await pushOrderToRTDB(testOrder, rtdbPath);
        setTestResult({
          success: true,
          msg: `Successfully dispatched to Realtime DB path [/${rtdbPath}] with Key: ${id}`
        });
      }
    } catch (err: any) {
      console.error("Test order push error:", err);
      setTestResult({
        success: false,
        msg: `Write error: ${err.message || 'Permission denied or network unreachable'}`
      });
    } finally {
      setTestingWrite(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Firebase Real-Time Connection
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-normal">
                  Live Stream
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Project: <span className="text-indigo-300 font-mono">brozza-1f6be</span> (Customer Dashboard: <span className="text-emerald-400">brozza.vercel.app</span>)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Live Status Pill */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3.5 h-3.5 rounded-full ${status.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></div>
              <div>
                <p className="font-bold text-white text-sm">
                  {status.connected ? 'Firebase Database Connected & Streaming' : 'Connecting to Firebase...'}
                </p>
                <p className="text-slate-400 text-xs">
                  Listening to Firestore collection <code className="text-indigo-300">orders</code> in database <code className="text-slate-300">ai-studio-remixthebarozzac-0a0443a4-c36c-4a75-b9f6-4c49d5a7fd1d</code>
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-emerald-400 font-mono font-bold text-sm">
                {activeOrders.length}
              </span>
              <p className="text-slate-500 text-[11px]">Synced Orders</p>
            </div>
          </div>

          {/* Test Write to Firebase */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Send className="w-4 h-4 text-indigo-400" />
                  Test Live Database Order Dispatch
                </h4>
                <p className="text-slate-400 text-xs">
                  Dispatches a test parcel order with customer name, address, COD amount, and parcel type.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetType('firestore')}
                className={`py-2 px-3 rounded-lg border font-semibold text-center transition ${
                  targetType === 'firestore'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Target: Firestore (orders)
              </button>
              <button
                type="button"
                onClick={() => setTargetType('rtdb')}
                className={`py-2 px-3 rounded-lg border font-semibold text-center transition ${
                  targetType === 'rtdb'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Target: Realtime DB (/orders)
              </button>
            </div>

            <button
              onClick={handleDispatchTest}
              disabled={testingWrite}
              className="w-full py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{testingWrite ? 'Injecting Order into Firebase...' : 'Dispatch Live Test Parcel Order'}</span>
            </button>

            {testResult && (
              <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 font-mono ${
                testResult.success 
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
              }`}>
                {testResult.success ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{testResult.msg}</span>
              </div>
            )}
          </div>

          {/* Config Preview */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Firebase Configuration JSON</span>
              <button
                onClick={handleCopyConfig}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Config'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
              {JSON.stringify(firebaseConfig, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
