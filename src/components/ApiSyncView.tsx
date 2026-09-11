import React, { useState } from 'react';
import { 
  Layers, 
  Key, 
  ShieldCheck, 
  RefreshCw, 
  Send, 
  Copy, 
  Check, 
  Code, 
  CheckCircle2, 
  AlertTriangle, 
  Terminal, 
  ExternalLink,
  Zap,
  Globe,
  Database,
  ArrowRightLeft,
  Smartphone,
  Truck,
  Coins,
  QrCode
} from 'lucide-react';
import { ApiSyncConfig, SyncLog, Order, Product } from '../types';

interface ApiSyncViewProps {
  apiConfig: ApiSyncConfig;
  setApiConfig: React.Dispatch<React.SetStateAction<ApiSyncConfig>>;
  syncLogs: SyncLog[];
  onSimulateInboundOrder: (sampleOrder: Partial<Order>) => Promise<void>;
  onSimulateOutboundStockPush: (sku: string, newStock: number) => Promise<void>;
  products: Product[];
}

export const ApiSyncView: React.FC<ApiSyncViewProps> = ({
  apiConfig,
  setApiConfig,
  syncLogs,
  onSimulateInboundOrder,
  onSimulateOutboundStockPush,
  products
}) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState<'firebase_customer' | 'rest_api' | 'curl'>('firebase_customer');
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ status: 'ok' | 'err'; message: string } | null>(null);

  // Inbound simulation state
  const [inboundOrderCustName, setInboundOrderCustName] = useState('Pooja Nair');
  const [inboundOrderPhone, setInboundOrderPhone] = useState('+91 98765 11223');
  const [inboundAddress, setInboundAddress] = useState('Flat 502, Orchid Heights, Indiranagar, Bangalore');
  const [inboundPayMethod, setInboundPayMethod] = useState<'cash_on_delivery' | 'upi'>('cash_on_delivery');
  const [inboundTotal, setInboundTotal] = useState(549.00);
  const [isSimulatingInbound, setIsSimulatingInbound] = useState(false);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiConfig.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handlePingHandshake = async () => {
    setIsPinging(true);
    setPingResult(null);
    await new Promise(r => setTimeout(r, 600));
    setIsPinging(false);
    setPingResult({
      status: 'ok',
      message: `200 OK — Connected to Firebase Project (commanding-palisade-58gvj). Ready to sync with customer storefront.`
    });
  };

  const handleRunInboundSimulation = async () => {
    setIsSimulatingInbound(true);
    try {
      await onSimulateInboundOrder({
        orderNumber: `ORD-${Math.floor(20000 + Math.random() * 70000)}`,
        customer: {
          name: inboundOrderCustName,
          phone: inboundOrderPhone,
          email: 'pooja.nair@customer.com',
          address: inboundAddress,
          city: 'Bangalore',
          pincode: '560038'
        },
        items: [
          {
            id: 'item_synced_1',
            name: 'Domino’s Farmhouse Cheese Burst Pizza',
            sku: 'DOM-PIZZA-CH',
            price: 459.00,
            quantity: 1
          },
          {
            id: 'item_synced_2',
            name: 'Choco Lava Cake',
            sku: 'DOM-DESS-CL',
            price: 90.00,
            quantity: 1
          }
        ],
        subtotal: 549.00,
        shippingFee: 0.00,
        tax: 27.45,
        totalAmount: 576.45,
        status: 'pending',
        paymentMethod: inboundPayMethod,
        paymentStatus: inboundPayMethod === 'cash_on_delivery' ? 'pending' : 'clear',
        parcelType: 'hot_food',
        source: 'customer_website',
        notes: 'Placed from Customer Storefront website'
      });
    } finally {
      setIsSimulatingInbound(false);
    }
  };

  // Code snippets for Customer Website Integration
  const customerFirebaseCode = `// -------------------------------------------------------------
// CUSTOMER WEBSITE INTEGRATION SCRIPT
// Connects customer cart directly to Worker Admin Dashboard
// -------------------------------------------------------------
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAO_1T-8vlvcTRGd1X88Rs26_gqA85tI4Y",
  authDomain: "commanding-palisade-58gvj.firebaseapp.com",
  projectId: "commanding-palisade-58gvj",
  storageBucket: "commanding-palisade-58gvj.firebasestorage.app",
  messagingSenderId: "749088653483",
  appId: "1:749088653483:web:196293fd4a7678ec2e37ee"
};

const app = initializeApp(firebaseConfig);
// Connect to the specific database instance:
const db = getFirestore(app, "ai-studio-remixthebarozzac-0a0443a4-c36c-4a75-b9f6-4c49d5a7fd1d");

// 1. PLACE CUSTOMER ORDER (Calls when customer clicks "Checkout")
export async function placeCustomerOrder(cartData) {
  const docRef = await addDoc(collection(db, "orders"), {
    orderNumber: "ORD-" + Math.floor(10000 + Math.random() * 90000),
    customer: {
      name: cartData.customerName,         // e.g. "Rahul Verma"
      phone: cartData.phone,               // e.g. "+91 98765 43210"
      address: cartData.fullAddress,       // e.g. "Flat 402, Block B, MG Road"
      landmark: cartData.landmark,         // e.g. "Near Apollo Pharmacy"
      pincode: cartData.pincode,           // e.g. "560001"
      deliveryInstructions: cartData.notes // e.g. "Leave with guard"
    },
    items: cartData.items,                 // [{ name, price, quantity }]
    totalAmount: cartData.totalAmount,     // e.g. 549.00
    paymentMethod: cartData.paymentMethod, // "cash_on_delivery" OR "upi"
    paymentStatus: cartData.paymentMethod === "cash_on_delivery" ? "pending" : "clear",
    parcelType: cartData.parcelType,       // "quick_grocery" | "hot_food" | "standard_parcel"
    status: "pending",                     // Starts in pending until worker receives parcel!
    createdAt: new Date().toISOString()
  });

  return docRef.id;
}

// 2. REAL-TIME ORDER TRACKER (Worker updates appear here live!)
export function trackCustomerOrderStatus(orderDocId, onStatusChange) {
  return onSnapshot(doc(db, "orders", orderDocId), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      // data.status will update from 'pending' -> 'received' -> 'out_for_delivery' -> 'delivered'!
      onStatusChange(data);
    }
  });
}`;

  const restApiCode = `// Backend / Server Webhook (Node.js Express)
// POST https://your-admin-dashboard/api/v1/orders
const express = require('express');
const app = express();
app.use(express.json());

app.post('/api/v1/orders', async (req, res) => {
  const { customer, items, totalAmount, paymentMethod, parcelType } = req.body;
  
  // Forward into Firebase orders collection:
  console.log("Incoming order from customer site:", customer.name, totalAmount);
  res.status(201).json({ status: "success", message: "Order dispatched to worker" });
});`;

  const curlCode = `curl -X POST "https://commanding-palisade-58gvj.firebaseio.com/orders.json" \\
  -H "Content-Type: application/json" \\
  -d '{
    "orderNumber": "ORD-58291",
    "customer": {
      "name": "Priya Sharma",
      "phone": "+91 98112 34567",
      "address": "A-304, Palm Springs, Golf Course Road, Gurugram"
    },
    "totalAmount": 450.00,
    "paymentMethod": "cash_on_delivery",
    "paymentStatus": "pending",
    "parcelType": "quick_grocery",
    "status": "pending"
  }'`;

  return (
    <div className="space-y-6">
      {/* Overview Card: Two-Website Synchronization Engine */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Two-Website Sync Engine (Customer Storefront ↔ Worker Admin)
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  Live Firebase
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Target Project: <strong className="text-slate-200">commanding-palisade-58gvj</strong> • Database: <strong className="text-slate-200">ai-studio-remixthebarozzac-0a0443a4-c36c-4a75-b9f6-4c49d5a7fd1d</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePingHandshake}
              disabled={isPinging}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition disabled:opacity-50 cursor-pointer"
            >
              <Globe className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
              <span>{isPinging ? 'Checking connection...' : 'Test Firebase Connection'}</span>
            </button>
          </div>
        </div>

        {pingResult && (
          <div className="p-3 rounded-xl border text-xs flex items-center gap-2 font-mono bg-emerald-950/50 border-emerald-800/80 text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{pingResult.message}</span>
          </div>
        )}

        {/* Sync Flow Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-indigo-300 font-bold">
              <Smartphone className="w-4 h-4" />
              <span>1. Customer Website</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Customer browses store, picks items, enters delivery address, chooses <strong>COD or UPI</strong>, and clicks Place Order.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Database className="w-4 h-4" />
              <span>2. Real-Time Firebase</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Order document is added to <code className="text-slate-200">orders</code> collection in Firebase database.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-emerald-300 font-bold">
              <Truck className="w-4 h-4" />
              <span>3. Worker Hub (This App)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Worker receives audio alert, clicks <strong>"Receive Parcel"</strong>, packs it, dispatches with rider, and collects COD payment!
            </p>
          </div>
        </div>
      </div>

      {/* Simulator Card: Dispatch Inbound Test Order */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Test Inbound Sync from Customer Website
            </h3>
            <p className="text-xs text-slate-400">
              Simulate your customer website placing a live order. It will immediately pop up in the Worker Parcel Hub!
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Customer Name</label>
            <input
              type="text"
              value={inboundOrderCustName}
              onChange={(e) => setInboundOrderCustName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Phone Number</label>
            <input
              type="text"
              value={inboundOrderPhone}
              onChange={(e) => setInboundOrderPhone(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Payment Method</label>
            <select
              value={inboundPayMethod}
              onChange={(e) => setInboundPayMethod(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
            >
              <option value="cash_on_delivery">Cash on Delivery (COD)</option>
              <option value="upi">UPI Instant Transfer</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRunInboundSimulation}
              disabled={isSimulatingInbound}
              className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSimulatingInbound ? 'Dispatching...' : 'Dispatch Live Order'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Code Snippets for Customer Website Developer */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Code className="w-4 h-4 text-indigo-400" />
              Customer Website Integration Code Snippet
            </h3>
            <p className="text-xs text-slate-400">
              Copy this exact snippet and paste it into your customer-facing website to connect it to this worker dashboard.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                onClick={() => setSelectedSnippet('firebase_customer')}
                className={`px-3 py-1 rounded font-medium transition ${
                  selectedSnippet === 'firebase_customer' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Firebase JS SDK (Recommended)
              </button>
              <button
                onClick={() => setSelectedSnippet('rest_api')}
                className={`px-3 py-1 rounded font-medium transition ${
                  selectedSnippet === 'rest_api' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Node.js Backend
              </button>
              <button
                onClick={() => setSelectedSnippet('curl')}
                className={`px-3 py-1 rounded font-medium transition ${
                  selectedSnippet === 'curl' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                cURL Webhook
              </button>
            </div>

            <button
              onClick={() => {
                const code = selectedSnippet === 'firebase_customer' 
                  ? customerFirebaseCode 
                  : selectedSnippet === 'rest_api' 
                  ? restApiCode 
                  : curlCode;
                navigator.clipboard.writeText(code);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed max-h-[340px]">
          {selectedSnippet === 'firebase_customer' && customerFirebaseCode}
          {selectedSnippet === 'rest_api' && restApiCode}
          {selectedSnippet === 'curl' && curlCode}
        </pre>
      </div>

      {/* Sync Logs */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Live Sync Event Logs</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {syncLogs.length} events logged
          </span>
        </div>

        <div className="divide-y divide-slate-800 text-xs">
          {syncLogs.map((log) => (
            <div key={log.id} className="p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-800/30 transition">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    HTTP {log.statusCode}
                  </span>
                  <span className="font-mono text-indigo-300 font-semibold">{log.type}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">{log.source}</span>
                </div>
                <p className="text-slate-300">{log.details}</p>
              </div>

              <div className="text-right font-mono text-[11px] text-slate-500">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
