import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Send, 
  ShoppingBag, 
  User, 
  CreditCard, 
  Database, 
  Check, 
  Pizza, 
  ShoppingBasket, 
  Cpu, 
  Package, 
  MapPin, 
  Phone, 
  Coins, 
  QrCode, 
  Clock, 
  Sparkles,
  Zap
} from 'lucide-react';
import { Order, OrderItem, Product, ParcelType, PaymentMethodType, PaymentStatus } from '../types';
import { pushOrderToFirestore, pushOrderToRTDB } from '../services/firebase';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  collectionName: string;
  rtdbPath: string;
  onOrderCreated: (newOrder: Order) => void;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  products,
  collectionName,
  rtdbPath,
  onOrderCreated
}) => {
  if (!isOpen) return null;

  // Parcel & Store type
  const [parcelType, setParcelType] = useState<ParcelType>('quick_grocery');
  
  // Customer details
  const [customerName, setCustomerName] = useState('Rahul Verma');
  const [customerPhone, setCustomerPhone] = useState('+91 98765 43210');
  const [customerEmail, setCustomerEmail] = useState('rahul.verma@example.com');
  const [flatNo, setFlatNo] = useState('Flat 402, Tower 4');
  const [landmark, setLandmark] = useState('Near Green Park Metro');
  const [streetAddress, setStreetAddress] = useState('Sector 62, MG Road');
  const [city, setCity] = useState('Bangalore');
  const [pincode, setPincode] = useState('560001');
  const [deliveryInstructions, setDeliveryInstructions] = useState('Please leave parcel at security desk if unavailable');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('cash_on_delivery');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  
  // Target
  const [destination, setDestination] = useState<'both' | 'firestore' | 'rtdb'>('firestore');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected line items
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([
    {
      id: 'item-1',
      name: 'Farm Fresh Organic Milk (1L)',
      sku: 'BLK-MILK-01',
      price: 68.00,
      quantity: 2
    },
    {
      id: 'item-2',
      name: 'Artisan Multigrain Sourdough Bread',
      sku: 'BLK-BREAD-02',
      price: 85.00,
      quantity: 1
    }
  ]);

  // Quick Preset Helper
  const loadPreset = (preset: 'blinkit' | 'dominos') => {
    if (preset === 'blinkit') {
      setParcelType('quick_grocery');
      setPaymentMethod('cash_on_delivery');
      setPaymentStatus('pending');
      setCustomerName('Priya Sharma');
      setCustomerPhone('+91 98112 34567');
      setFlatNo('A-304, Palm Springs Apartments');
      setLandmark('Opposite DLF Phase 2');
      setStreetAddress('Golf Course Road');
      setCity('Gurugram');
      setPincode('122002');
      setDeliveryInstructions('Call before arriving. Keep in eco paper bag.');
      setSelectedItems([
        {
          id: 'item-b1',
          name: 'Farm Fresh Milk (1L)',
          sku: 'BLK-MILK-01',
          price: 68.00,
          quantity: 2
        },
        {
          id: 'item-b2',
          name: 'Brown Eggs (Pack of 6)',
          sku: 'BLK-EGGS-06',
          price: 75.00,
          quantity: 1
        },
        {
          id: 'item-b3',
          name: 'Fresh Cavendish Bananas (500g)',
          sku: 'BLK-FRUIT-BN',
          price: 49.00,
          quantity: 1
        }
      ]);
    } else {
      setParcelType('hot_food');
      setPaymentMethod('upi');
      setPaymentStatus('clear');
      setCustomerName('Vikram Malhotra');
      setCustomerPhone('+91 98200 88991');
      setFlatNo('Villa 18, Orchid Meadows');
      setLandmark('Behind Royal Oak Club');
      setStreetAddress('Koramangala 4th Block');
      setCity('Bangalore');
      setPincode('560034');
      setDeliveryInstructions('Hot pizza bag required. Ring bell twice.');
      setSelectedItems([
        {
          id: 'item-d1',
          name: 'Domino’s Farmhouse Cheese Burst (Medium)',
          sku: 'DOM-PIZZA-CH',
          price: 459.00,
          quantity: 1
        },
        {
          id: 'item-d2',
          name: 'Stuffed Garlic Bread with Cheese Dip',
          sku: 'DOM-SIDE-GB',
          price: 159.00,
          quantity: 1
        },
        {
          id: 'item-d3',
          name: 'Choco Lava Cake',
          sku: 'DOM-DESS-CL',
          price: 109.00,
          quantity: 2
        }
      ]);
    }
  };

  const handleAddItem = (product: Product) => {
    setSelectedItems(prev => {
      const existing = prev.find(item => item.sku === product.sku);
      if (existing) {
        return prev.map(item => item.sku === product.sku ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        quantity: 1,
        image: product.imageUrl
      }];
    });
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, delta: number) => {
    setSelectedItems(prev => prev.map((item, i) => {
      if (i === index) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const subtotal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingFee = subtotal > 500 ? 0 : 25; // Blinkit/Domino's delivery charge
  const tax = Number((subtotal * 0.05).toFixed(2)); // 5% GST
  const totalAmount = Number((subtotal + shippingFee + tax).toFixed(2));

  const fullAddress = `${flatNo ? flatNo + ', ' : ''}${streetAddress}${landmark ? ' (Landmark: ' + landmark + ')' : ''}, ${city} - ${pincode}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) return;

    setIsSubmitting(true);
    const orderNumber = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    const deliveryOtp = `${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: `ord_${Date.now()}`,
      orderNumber,
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        address: fullAddress,
        flatNo,
        landmark,
        city,
        pincode,
        deliveryInstructions
      },
      items: selectedItems,
      subtotal,
      shippingFee,
      tax,
      totalAmount,
      status: 'pending',
      paymentStatus: paymentMethod === 'cash_on_delivery' ? 'pending' : paymentStatus,
      paymentMethod,
      parcelType,
      createdAt: new Date().toISOString(),
      source: 'customer_website',
      notes: deliveryInstructions || 'Standard customer online order',
      deliveryOtp,
      estimatedDeliveryMinutes: parcelType === 'quick_grocery' ? 10 : 30
    };

    try {
      if (destination === 'firestore' || destination === 'both') {
        try {
          const fsId = await pushOrderToFirestore(newOrder, collectionName);
          newOrder.id = fsId;
        } catch (fsErr) {
          console.warn("Firestore push notice:", fsErr);
        }
      }

      if (destination === 'rtdb' || destination === 'both') {
        try {
          await pushOrderToRTDB(newOrder, rtdbPath);
        } catch (rtdbErr) {
          console.warn("RTDB push notice:", rtdbErr);
        }
      }

      onOrderCreated(newOrder);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Simulate Customer Website Order
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  Live Firebase Sync
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Place an order as a customer to test instant delivery worker parcel arrival
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

        {/* Quick Presets Bar */}
        <div className="px-6 py-2.5 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Quick 1-Click Carts:
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadPreset('blinkit')}
              className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60 font-medium transition flex items-center gap-1"
            >
              <ShoppingBasket className="w-3 h-3" />
              <span>Blinkit 10m Grocery (COD)</span>
            </button>
            <button
              type="button"
              onClick={() => loadPreset('dominos')}
              className="px-2.5 py-1 rounded-lg bg-red-950/60 border border-red-800/60 text-red-300 hover:bg-red-900/60 font-medium transition flex items-center gap-1"
            >
              <Pizza className="w-3 h-3" />
              <span>Domino's Pizza (UPI Paid)</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* 1. Parcel Type Selection */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-300 uppercase tracking-wider block text-[11px]">
              1. Select Parcel / Store Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setParcelType('quick_grocery')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-center transition ${
                  parcelType === 'quick_grocery'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <ShoppingBasket className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-slate-200">Blinkit Grocery</span>
                <span className="text-[10px] text-slate-400">10-Min Essentials</span>
              </button>

              <button
                type="button"
                onClick={() => setParcelType('hot_food')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-center transition ${
                  parcelType === 'hot_food'
                    ? 'bg-red-600/20 border-red-500 text-red-300 shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Pizza className="w-4 h-4 text-red-400" />
                <span className="font-bold text-slate-200">Domino's Hot Food</span>
                <span className="text-[10px] text-slate-400">Pizza & Kitchen</span>
              </button>

              <button
                type="button"
                onClick={() => setParcelType('electronics')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-center transition ${
                  parcelType === 'electronics'
                    ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300 shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-slate-200">Electronics</span>
                <span className="text-[10px] text-slate-400">Gadget / OTP</span>
              </button>

              <button
                type="button"
                onClick={() => setParcelType('standard_parcel')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-center transition ${
                  parcelType === 'standard_parcel'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Package className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-slate-200">Standard Parcel</span>
                <span className="text-[10px] text-slate-400">Courier Box</span>
              </button>
            </div>
          </div>

          {/* 2. Customer Contact & Delivery Address */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <label className="font-semibold text-slate-300 uppercase tracking-wider block text-[11px] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              2. Customer Name & Delivery Address
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Rahul Verma"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Contact Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Flat / House / Floor No. *</label>
                <input
                  type="text"
                  required
                  value={flatNo}
                  onChange={(e) => setFlatNo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="Flat 402, Block B"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Nearby Landmark</label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="Near Apollo Pharmacy / Metro Gate 2"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-slate-400 block mb-1">Area / Street / Colony *</label>
                <input
                  type="text"
                  required
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="Sector 62, MG Road"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Pincode *</label>
                <input
                  type="text"
                  required
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder="560001"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Rider Delivery Instructions</label>
              <input
                type="text"
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                placeholder="e.g. Leave with guard / Don't ring doorbell / Call on gate arrival"
              />
            </div>
          </div>

          {/* 3. Payment Method & Status */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <label className="font-semibold text-slate-300 uppercase tracking-wider block text-[11px] flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              3. Payment Method & Payment Status
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Payment Method Option */}
              <div>
                <label className="text-slate-400 block mb-1.5">Payment Method</label>
                <div className="space-y-2">
                  <label
                    onClick={() => {
                      setPaymentMethod('cash_on_delivery');
                      setPaymentStatus('pending');
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                      paymentMethod === 'cash_on_delivery'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-amber-400" />
                      <div>
                        <div>Cash on Delivery (COD)</div>
                        <div className="text-[10px] text-slate-400 font-normal">Collect cash from customer at door</div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="payMethod"
                      checked={paymentMethod === 'cash_on_delivery'}
                      onChange={() => {}}
                      className="text-amber-500"
                    />
                  </label>

                  <label
                    onClick={() => {
                      setPaymentMethod('upi');
                      setPaymentStatus('clear');
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                      paymentMethod === 'upi'
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-purple-400" />
                      <div>
                        <div>UPI Instant (GPay / PhonePe / Paytm)</div>
                        <div className="text-[10px] text-slate-400 font-normal">Instant digital payment transfer</div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="payMethod"
                      checked={paymentMethod === 'upi'}
                      onChange={() => {}}
                      className="text-purple-500"
                    />
                  </label>
                </div>
              </div>

              {/* Payment Status Option */}
              <div>
                <label className="text-slate-400 block mb-1.5">Payment Status</label>
                <div className="space-y-2">
                  <label
                    onClick={() => setPaymentStatus('clear')}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                      paymentStatus === 'clear'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div>Clear (Paid & Settled)</div>
                        <div className="text-[10px] text-slate-400 font-normal">Money already received</div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="payStatus"
                      checked={paymentStatus === 'clear'}
                      onChange={() => {}}
                      className="text-emerald-500"
                    />
                  </label>

                  <label
                    onClick={() => setPaymentStatus('pending')}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                      paymentStatus === 'pending'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <div>
                        <div>Pending (To Collect at Door)</div>
                        <div className="text-[10px] text-slate-400 font-normal">Worker must collect ₹{totalAmount}</div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="payStatus"
                      checked={paymentStatus === 'pending'}
                      onChange={() => {}}
                      className="text-amber-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Order Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300 uppercase tracking-wider block text-[11px]">
                4. Items in Parcel ({selectedItems.length})
              </label>
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto">
              {selectedItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-200">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">₹{item.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-slate-700 rounded">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(idx, -1)}
                        className="px-2 py-0.5 hover:bg-slate-800 text-slate-300"
                      >
                        -
                      </button>
                      <span className="px-2 text-white font-mono">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(idx, 1)}
                        className="px-2 py-0.5 hover:bg-slate-800 text-slate-300"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-mono text-white font-bold w-16 text-right">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bill Summary */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400">Total Payable ({selectedItems.reduce((s, i) => s + i.quantity, 0)} items + Delivery + GST):</span>
              <div className="text-xl font-bold text-emerald-400 font-mono">₹{totalAmount.toFixed(2)}</div>
            </div>
            <div className="text-right">
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                paymentMethod === 'cash_on_delivery' ? 'bg-amber-500/20 text-amber-300' : 'bg-purple-500/20 text-purple-300'
              }`}>
                {paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery (COD)' : 'UPI Pre-Paid'}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {paymentStatus === 'clear' ? 'Status: Clear' : 'Status: Pending Collection'}
              </p>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Direct push to Firebase database <strong className="text-slate-200">commanding-palisade-58gvj</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || selectedItems.length === 0}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Pushing to Firebase...' : 'Place Order & Send to Worker'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
