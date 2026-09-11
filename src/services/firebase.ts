import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  limit,
  Firestore
} from 'firebase/firestore';
import { 
  getDatabase, 
  ref, 
  onValue, 
  set, 
  push, 
  update 
} from 'firebase/database';
import { Order, OrderStatus, PaymentStatus, ParcelType, PaymentMethodType } from '../types';

export const firebaseConfig = {
  apiKey: "AIzaSyAO_1T-8vlvcTRGd1X88Rs26_gqA85tI4Y",
  authDomain: "commanding-palisade-58gvj.firebaseapp.com",
  projectId: "commanding-palisade-58gvj",
  storageBucket: "commanding-palisade-58gvj.firebasestorage.app",
  messagingSenderId: "749088653483",
  appId: "1:749088653483:web:196293fd4a7678ec2e37ee",
  firestoreDatabaseId: "ai-studio-remixthebarozzac-0a0443a4-c36c-4a75-b9f6-4c49d5a7fd1d",
  databaseURL: "https://commanding-palisade-58gvj-default-rtdb.firebaseio.com"
};

// Initialize Firebase App singleton
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export let firestoreDb: Firestore | null = null;
export let realtimeDb: ReturnType<typeof getDatabase> | null = null;

// Initialize Firestore targeting the specific user databaseId, with graceful fallback
try {
  if (firebaseConfig.firestoreDatabaseId) {
    firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } else {
    firestoreDb = getFirestore(app);
  }
} catch (err) {
  console.warn("Target Firestore DB init notice, falling back to default:", err);
  try {
    firestoreDb = getFirestore(app);
  } catch (e2) {
    console.error("Default Firestore DB init failed:", e2);
  }
}

// Initialize Realtime DB
try {
  realtimeDb = getDatabase(app);
} catch (err) {
  console.warn("Realtime Database initialization notice:", err);
}

export interface FirebaseConnectionStatus {
  connected: boolean;
  type: 'firestore' | 'rtdb' | 'both' | 'disconnected';
  lastPing: string | null;
  errorMessage?: string;
  activeCollection: string;
  databaseId?: string;
  projectId?: string;
}

/**
 * Normalizes payment method string to standard values (COD / UPI / Card)
 */
export function normalizePaymentMethod(raw: any): PaymentMethodType | string {
  if (!raw) return 'cash_on_delivery';
  const str = String(raw).toLowerCase();
  if (str.includes('cod') || str.includes('cash')) return 'cash_on_delivery';
  if (str.includes('upi') || str.includes('gpay') || str.includes('phonepe') || str.includes('paytm') || str.includes('bhim')) return 'upi';
  if (str.includes('card') || str.includes('credit') || str.includes('debit')) return 'card';
  if (str.includes('wallet')) return 'wallet';
  return raw;
}

/**
 * Normalizes payment status string to Clear or Pending
 */
export function normalizePaymentStatus(raw: any, method: string): PaymentStatus {
  if (raw === true || raw === 'clear' || raw === 'paid' || raw === 'completed' || raw === 'success') {
    return 'clear';
  }
  if (raw === 'failed' || raw === 'declined') {
    return 'failed';
  }
  if (raw === 'refunded') {
    return 'refunded';
  }
  // If payment method is cash on delivery and not marked clear, default to pending
  return 'pending';
}

/**
 * Normalizes parcel type string (Blinkit grocery, Domino's hot food, electronics, parcel)
 */
export function normalizeParcelType(raw: any): ParcelType {
  if (!raw) return 'quick_grocery';
  const str = String(raw).toLowerCase();
  if (str.includes('food') || str.includes('pizza') || str.includes('domino') || str.includes('burger') || str.includes('restaurant')) {
    return 'hot_food';
  }
  if (str.includes('grocery') || str.includes('blinkit') || str.includes('instamart') || str.includes('zepto') || str.includes('fresh')) {
    return 'quick_grocery';
  }
  if (str.includes('electronic') || str.includes('gadget') || str.includes('phone') || str.includes('tech')) {
    return 'electronics';
  }
  if (str.includes('fragile') || str.includes('glass')) {
    return 'fragile';
  }
  if (str.includes('express') || str.includes('urgent')) {
    return 'express_courier';
  }
  return 'standard_parcel';
}

/**
 * Normalizes order status (received by worker, out for delivery, etc.)
 */
export function normalizeOrderStatus(raw: any): OrderStatus {
  if (!raw) return 'pending';
  const s = String(raw).toLowerCase();
  if (s === 'received' || s === 'accepted' || s === 'parcel_received') return 'received';
  if (s === 'processing' || s === 'packing' || s === 'preparing') return 'processing';
  if (s === 'shipped' || s === 'dispatched') return 'shipped';
  if (s === 'out_for_delivery' || s === 'on_the_way' || s === 'rider_assigned') return 'out_for_delivery';
  if (s === 'delivered' || s === 'completed' || s === 'done') return 'delivered';
  if (s === 'cancelled' || s === 'rejected') return 'cancelled';
  return 'pending';
}

/**
 * Normalizes Firebase document or RTDB object to standard Order interface
 */
export function normalizeOrderData(id: string, raw: any): Order {
  const method = normalizePaymentMethod(raw.paymentMethod || raw.payment_method || raw.payMode || raw.method);
  const paymentStatus = normalizePaymentStatus(raw.paymentStatus || raw.payment_status || raw.payStatus || raw.paid, method);
  const parcelType = normalizeParcelType(raw.parcelType || raw.parcel_type || raw.category || raw.type || raw.orderType);
  const status = normalizeOrderStatus(raw.status || raw.order_status);

  // Address parsing with rich fields (like Blinkit / Domino's)
  const cust = raw.customer || {};
  const rawAddress = cust.address || raw.address || raw.deliveryAddress || raw.shippingAddress || raw.fullAddress || '';
  const customerPhone = cust.phone || raw.phone || raw.phoneNumber || raw.mobile || raw.contact || '+91 98765 43210';
  const customerName = cust.name || raw.customerName || raw.customer_name || raw.name || raw.userName || 'Customer';

  return {
    id: id || raw.id || `ord_${Date.now()}`,
    orderNumber: raw.orderNumber || raw.order_number || raw.orderId || `ORD-${id.slice(0, 6).toUpperCase()}`,
    customer: {
      name: customerName,
      email: cust.email || raw.customerEmail || raw.email || 'customer@store.com',
      phone: customerPhone,
      address: rawAddress || 'Flat 402, Green Valley Apartments, MG Road',
      flatNo: cust.flatNo || raw.flatNo || raw.flat || raw.houseNo || undefined,
      landmark: cust.landmark || raw.landmark || raw.nearBy || undefined,
      city: cust.city || raw.city || 'Bangalore',
      pincode: cust.pincode || raw.pincode || raw.zip || raw.postalCode || '560001',
      deliveryInstructions: cust.deliveryInstructions || raw.deliveryInstructions || raw.instructions || raw.notes || undefined
    },
    items: Array.isArray(raw.items) && raw.items.length > 0
      ? raw.items.map((it: any, index: number) => ({
          id: it.id || `item_${index}`,
          name: it.name || it.title || it.productName || 'Order Item',
          sku: it.sku || `SKU-${1000 + index}`,
          price: Number(it.price || it.unitPrice || it.amount || 0),
          quantity: Number(it.quantity || it.qty || 1),
          image: it.image || it.imageUrl || undefined
        }))
      : [{
          id: 'item_0',
          name: raw.productName || raw.item || (parcelType === 'hot_food' ? 'Farmhouse Cheese Burst Pizza' : 'Fresh Farm Grocery Essentials'),
          sku: 'SKU-EXPRESS-1',
          price: Number(raw.totalAmount || raw.total || raw.amount || raw.price || 349),
          quantity: 1
        }],
    totalAmount: Number(raw.totalAmount || raw.total || raw.amount || raw.grandTotal || raw.price || 0),
    subtotal: Number(raw.subtotal || raw.subTotal || (Number(raw.totalAmount || raw.total || raw.amount || 0) * 0.9)),
    shippingFee: Number(raw.shippingFee || raw.shipping || raw.deliveryFee || 0),
    tax: Number(raw.tax || 0),
    status,
    paymentStatus,
    paymentMethod: method,
    parcelType,
    createdAt: raw.createdAt 
      ? (typeof raw.createdAt === 'object' && raw.createdAt.toDate ? raw.createdAt.toDate().toISOString() : String(raw.createdAt))
      : new Date().toISOString(),
    source: raw.source || 'customer_website',
    trackingNumber: raw.trackingNumber || raw.tracking_number,
    notes: raw.notes || raw.note || raw.customerNotes,
    deliveryOtp: raw.deliveryOtp || raw.otp || `${Math.floor(1000 + Math.random() * 9000)}`,
    estimatedDeliveryMinutes: raw.estimatedDeliveryMinutes || raw.deliveryMinutes || (parcelType === 'quick_grocery' ? 10 : 30),
    assignedWorker: raw.assignedWorker || raw.workerName || raw.riderName || undefined,
    parcelReceivedAt: raw.parcelReceivedAt || (status !== 'pending' ? raw.updatedAt || raw.createdAt : undefined),
    deliveredAt: raw.deliveredAt || (status === 'delivered' ? raw.updatedAt || new Date().toISOString() : undefined),
    cashCollected: raw.cashCollected ?? (paymentStatus === 'clear' && method === 'cash_on_delivery')
  };
}

/**
 * Realtime listener for Firestore collection (default 'orders')
 */
export function listenToFirestoreOrders(
  collectionName: string = 'orders',
  onUpdate: (orders: Order[]) => void,
  onError: (error: Error) => void
) {
  if (!firestoreDb) {
    onError(new Error("Firestore is not initialized"));
    return () => {};
  }

  try {
    const ordersCol = collection(firestoreDb, collectionName);
    const q = query(ordersCol, limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: Order[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push(normalizeOrderData(docSnap.id, docSnap.data()));
        });
        // Sort newest first
        loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(loaded);
      },
      (err) => {
        console.warn("Firestore snapshot error:", err);
        onError(err);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    onError(err);
    return () => {};
  }
}

/**
 * Realtime listener for Firebase Realtime Database (/orders)
 */
export function listenToRTDBOrders(
  path: string = 'orders',
  onUpdate: (orders: Order[]) => void,
  onError: (error: Error) => void
) {
  if (!realtimeDb) {
    onError(new Error("Realtime Database is not initialized"));
    return () => {};
  }

  try {
    const ordersRef = ref(realtimeDb, path);
    const unsubscribe = onValue(
      ordersRef,
      (snapshot) => {
        const val = snapshot.val();
        if (!val) {
          onUpdate([]);
          return;
        }

        const loaded: Order[] = [];
        if (Array.isArray(val)) {
          val.forEach((item, index) => {
            if (item) loaded.push(normalizeOrderData(String(index), item));
          });
        } else if (typeof val === 'object') {
          Object.entries(val).forEach(([key, item]) => {
            loaded.push(normalizeOrderData(key, item));
          });
        }
        loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(loaded);
      },
      (err) => {
        console.warn("RTDB listener error:", err);
        onError(err);
      }
    );

    return () => unsubscribe();
  } catch (err: any) {
    onError(err);
    return () => {};
  }
}

/**
 * Dispatch / place order directly to Firestore (from customer website or simulator)
 */
export async function pushOrderToFirestore(order: Partial<Order>, collectionName: string = 'orders'): Promise<string> {
  if (!firestoreDb) throw new Error("Firestore not initialized");

  const docRef = await addDoc(collection(firestoreDb, collectionName), {
    ...order,
    createdAt: new Date().toISOString(),
    serverTimestamp: serverTimestamp()
  });
  return docRef.id;
}

/**
 * Dispatch / place order directly to RTDB
 */
export async function pushOrderToRTDB(order: Partial<Order>, path: string = 'orders'): Promise<string> {
  if (!realtimeDb) throw new Error("RTDB not initialized");

  const ordersRef = ref(realtimeDb, path);
  const newRef = push(ordersRef);
  await set(newRef, {
    ...order,
    createdAt: new Date().toISOString()
  });
  return newRef.key || 'order_rtdb';
}

/**
 * Update order status and worker notes in Firestore
 */
export async function updateFirestoreOrderStatus(
  orderId: string, 
  status: OrderStatus, 
  additionalFields: Partial<Order> = {},
  collectionName: string = 'orders'
) {
  if (!firestoreDb) throw new Error("Firestore not initialized");
  const docRef = doc(firestoreDb, collectionName, orderId);
  await updateDoc(docRef, {
    status,
    ...additionalFields,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Update order status in RTDB
 */
export async function updateRTDBOrderStatus(
  orderId: string, 
  status: OrderStatus, 
  additionalFields: Partial<Order> = {},
  path: string = 'orders'
) {
  if (!realtimeDb) throw new Error("RTDB not initialized");
  const orderRef = ref(realtimeDb, `${path}/${orderId}`);
  await update(orderRef, {
    status,
    ...additionalFields,
    updatedAt: new Date().toISOString()
  });
}
