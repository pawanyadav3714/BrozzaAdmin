import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  collection, 
  onSnapshot, 
  doc, 
  setDoc,
  updateDoc, 
  addDoc, 
  deleteDoc,
  serverTimestamp, 
  query, 
  orderBy, 
  limit,
  Firestore,
  setLogLevel,
  memoryLocalCache,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { 
  getDatabase, 
  ref, 
  onValue, 
  set, 
  push, 
  update,
  remove
} from 'firebase/database';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  Auth
} from 'firebase/auth';
import { Order, OrderStatus, PaymentStatus, ParcelType, PaymentMethodType, Product, CafeStatus } from '../types';
import { INITIAL_PRODUCTS, deduplicateProducts, BAROZZA_CANONICAL_DISHES } from '../data/mockData';

// Suppress transient WebChannel network retry / offline info logs from bubbling to dev overlays
try {
  setLogLevel('silent');
} catch (e) {}

export interface AppFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
  databaseURL?: string;
}

export const firebaseConfig: AppFirebaseConfig = {
  apiKey: "AIzaSyDltNqesCmeG8UCh_1JJFpdUxyg6vx6pBg",
  authDomain: "brozza-1f6be.firebaseapp.com",
  projectId: "brozza-1f6be",
  storageBucket: "brozza-1f6be.firebasestorage.app",
  messagingSenderId: "297709421963",
  appId: "1:297709421963:web:a4bc73ae0944d173cb5b8e",
  measurementId: "G-EF03518J0C"
};

// Initialize Firebase App singleton
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export let firestoreDb: Firestore | null = null;
export let realtimeDb: ReturnType<typeof getDatabase> | null = null;

// Initialize Firestore targeting the specific databaseId, using memoryLocalCache to prevent
// iframe sandbox IndexedDB permission restrictions and auto-detecting long-polling cleanly
try {
  if (firebaseConfig.firestoreDatabaseId) {
    firestoreDb = initializeFirestore(app, {
      localCache: memoryLocalCache(),
      experimentalAutoDetectLongPolling: true
    }, firebaseConfig.firestoreDatabaseId);
  } else {
    firestoreDb = initializeFirestore(app, {
      localCache: memoryLocalCache(),
      experimentalAutoDetectLongPolling: true
    });
  }
} catch (err) {
  try {
    firestoreDb = firebaseConfig.firestoreDatabaseId 
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  } catch (e2) {
    console.warn("Firestore fallback init notice:", e2);
  }
}

// Initialize Realtime DB safely only if explicitly configured
try {
  if (firebaseConfig.databaseURL && firebaseConfig.databaseURL.trim().length > 0) {
    realtimeDb = getDatabase(app);
  }
} catch (err) {
  realtimeDb = null;
}

// Initialize Firebase Auth singleton
export let auth: Auth | null = null;
try {
  auth = getAuth(app);
} catch (err) {
  console.warn("Auth initialization notice:", err);
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
  const s = String(raw).toLowerCase().replace(/[\s-]+/g, '_');
  if (s === 'received' || s === 'accepted' || s === 'parcel_received') return 'received';
  if (s === 'processing' || s === 'packing' || s === 'preparing') return 'processing';
  if (s === 'shipped' || s === 'dispatched') return 'shipped';
  if (s === 'out_for_delivery' || s.includes('out_for') || s.includes('delivery') || s === 'on_the_way' || s === 'rider_assigned') return 'out_for_delivery';
  if (s === 'delivered' || s === 'completed' || s === 'done') return 'delivered';
  if (s === 'cancelled' || s === 'rejected') return 'cancelled';
  if (s === 'ordered' || s === 'booked' || s === 'pending') return 'pending';
  return 'pending';
}

/**
 * Maps dish name or dish ID to actual customer dashboard dish image URL
 */
function getActualDishImageUrl(name: string, dishId?: string | number): string {
  const n = String(name || '').toLowerCase();
  const idStr = String(dishId || '');

  if (n.includes('aalu') || n.includes('aloo') || n.includes('matar') || n.includes('curry')) return 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&q=80';
  if (idStr === '1' || n.includes('french fries') || n.includes('fries')) return 'https://brozza.vercel.app/images/frenchh.png';
  if (idStr === '2' || n.includes('veg chow')) return 'https://brozza.vercel.app/images/chow.png';
  if (idStr === '3' || n.includes('egg chow')) return 'https://brozza.vercel.app/images/eggchowminn.png';
  if (idStr === '4' || n.includes('pasta')) return 'https://brozza.vercel.app/images/pastaa.png';
  if (idStr === '5' || n.includes('paneer')) return 'https://brozza.vercel.app/images/paneerchili.png';
  if (idStr === '6' || n.includes('momo')) return 'https://brozza.vercel.app/images/momos.png';
  if (idStr === '7' || n.includes('fried rice')) return 'https://brozza.vercel.app/images/fried.png';
  if (idStr === '8' || n.includes('baby corn')) return 'https://brozza.vercel.app/images/babycornchili.png';
  if (idStr === '9' || n.includes('mushroom')) return 'https://brozza.vercel.app/images/masroomchili.png';
  if (idStr === '10' || n.includes('manchurian')) return 'https://brozza.vercel.app/images/menchurian.png';
  if (idStr === '11' || n.includes('veg roll')) return 'https://brozza.vercel.app/images/vegrol.png';
  if (idStr === '12' || n.includes('egg roll')) return 'https://brozza.vercel.app/images/eggrol.png';
  if (idStr === '13' || n.includes('dosha') || n.includes('dosa')) return 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=300&q=80';
  
  if (n.includes('pizza')) return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&q=80';
  if (n.includes('burger')) return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&q=80';
  if (n.includes('coffee') || n.includes('beverage')) return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&q=80';

  return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80';
}

/**
 * Normalizes Firebase document or RTDB object to standard Order interface
 */
/**
 * Normalizes Firebase document or RTDB object to standard Order interface.
 * Returns null if the document is a dummy test, system metadata, or invalid junk.
 */
export function normalizeOrderData(id: string, raw: any): Order | null {
  if (!raw || typeof raw !== 'object') return null;

  // STRICT PURGE: Block unwanted dummy/test/junk parcels and system collections
  const idLower = String(id || '').toLowerCase();
  const rawIdLower = String(raw.id || '').toLowerCase();
  const orderNumLower = String(raw.orderNumber || raw.order_number || raw.orderId || '').toLowerCase();
  const notesLower = String(raw.notes || raw.deliveryNotes || '').toLowerCase();
  const custNameLower = String(raw.customerName || raw.customer_name || raw.customer?.name || '').toLowerCase();

  if (
    raw.isTest || raw.isDummy || raw.dummy || raw.test || raw.isSimulated ||
    idLower.includes('dummy') || idLower.includes('test') || idLower === 'barozza_menu_catalog' || idLower === 'cafe_status' || idLower === 'barozza_cafe_status' ||
    rawIdLower.includes('dummy') || rawIdLower.includes('test') ||
    orderNumLower.includes('test') || orderNumLower.includes('dummy') ||
    custNameLower === 'dummy' || custNameLower === 'test' || custNameLower === 'test customer' ||
    notesLower.includes('diagnostic console') ||
    id === 'ord-cod-01' || id === 'ord-upi-02' ||
    orderNumLower === 'ord-9821' || orderNumLower === 'ord-9822'
  ) {
    return null;
  }

  // Address parsing with rich fields (supporting Cafe orders & Express parcels)
  const cust = raw.customer || {};
  const rawAddress = raw.customerAddress || raw.destinationLocation || cust.address || raw.address || raw.deliveryAddress || raw.shippingAddress || raw.fullAddress || '';
  const customerPhone = raw.customerPhone || raw.customer_phone || cust.phone || raw.phone || raw.phoneNumber || raw.mobile || raw.contact || '';
  const customerName = raw.customerName || raw.customer_name || cust.name || raw.name || raw.userName || '';

  // Extract products / dishes
  let items: any[] = [];
  if (Array.isArray(raw.items) && raw.items.length > 0) {
    items = raw.items.map((it: any, index: number) => {
      const itemName = it.name || it.dishName || it.title || it.productName || 'Dish Item';
      const dishId = it.id || it.dishId;
      const resolvedImage = it.image || it.imageUrl || it.img || it.dishImage || it.photo || it.picture || getActualDishImageUrl(itemName, dishId);
      return {
        id: dishId || `item_${index}`,
        name: itemName,
        sku: it.sku || (dishId ? `BRZ-DISH-${String(dishId).padStart(2, '0')}` : `SKU-${1000 + index}`),
        price: Number(it.price || it.unitPrice || it.amount || 0),
        quantity: Number(it.quantity || it.qty || 1),
        image: resolvedImage
      };
    });
  } else if (raw.dishName || raw.productName || raw.item || raw.dishId) {
    // Single dish direct order from customer site
    const singleName = raw.dishName || raw.productName || raw.item || 'Customer Dish';
    items = [{
      id: String(raw.dishId || 'item_0'),
      name: singleName,
      sku: raw.sku || (raw.dishId ? `BRZ-DISH-${String(raw.dishId).padStart(2, '0')}` : 'BRZ-DISH-01'),
      price: Number(raw.totalPrice && raw.quantity ? (raw.totalPrice / raw.quantity) : raw.price || raw.totalAmount || 0),
      quantity: Number(raw.quantity || 1),
      image: raw.image || raw.imageUrl || raw.img || raw.dishImage || raw.photo || raw.picture || getActualDishImageUrl(singleName, raw.dishId)
    }];
  } else {
    // No valid products/items found in this record - reject as invalid junk / dummy document
    return null;
  }

  const rawTotal = Number(raw.totalPrice || raw.totalAmount || raw.total || raw.amount || raw.grandTotal || raw.price || 0);
  if (rawTotal <= 0 && items.length === 0) {
    return null;
  }

  const method = normalizePaymentMethod(raw.paymentMethod || raw.payment_method || raw.payMode || raw.method);
  const paymentStatus = normalizePaymentStatus(raw.paymentStatus || raw.payment_status || raw.payStatus || raw.paid, method);
  const parcelType = normalizeParcelType(raw.parcelType || raw.parcel_type || raw.category || raw.type || raw.orderType);
  const status = normalizeOrderStatus(raw.status || raw.order_status || raw.parcelStatus);

  const orderNum = raw.orderNumber || raw.order_number || raw.orderId || raw.parcelId || (raw.trackingNumber ? `ORD-${raw.trackingNumber.slice(-6)}` : `ORD-${id.slice(0, 6).toUpperCase()}`);

  let createdAtStr = new Date().toISOString();
  if (raw.createdAt) {
    if (typeof raw.createdAt === 'object' && typeof raw.createdAt.toDate === 'function') {
      createdAtStr = raw.createdAt.toDate().toISOString();
    } else if (typeof raw.createdAt === 'object' && raw.createdAt.seconds) {
      createdAtStr = new Date(raw.createdAt.seconds * 1000).toISOString();
    } else {
      createdAtStr = String(raw.createdAt);
    }
  }

  const finalCustomerName = customerName || 'Customer';
  const finalPhone = customerPhone || '+91 98765 43210';
  const finalAddress = rawAddress || 'Customer Delivery Address';

  return {
    id: id || raw.id || `ord_${Date.now()}`,
    orderNumber: orderNum,
    customer: {
      name: finalCustomerName,
      email: cust.email || raw.customerEmail || raw.email || `${finalCustomerName.toLowerCase().replace(/\s+/g, '.')}@customer.com`,
      phone: finalPhone,
      address: finalAddress,
      flatNo: cust.flatNo || raw.flatNo || raw.flat || raw.houseNo || undefined,
      landmark: cust.landmark || raw.landmark || raw.nearBy || undefined,
      city: cust.city || raw.city || raw.destinationLocation || 'Giridih',
      pincode: cust.pincode || raw.pincode || raw.zip || raw.postalCode || '560001',
      deliveryInstructions: cust.deliveryInstructions || raw.deliveryInstructions || raw.deliveryNotes || raw.instructions || raw.notes || undefined
    },
    items,
    totalAmount: rawTotal,
    subtotal: Number(raw.subtotal || raw.subTotal || (rawTotal * 0.9)),
    shippingFee: Number(raw.shippingFee || raw.shipping || raw.deliveryFee || 0),
    tax: Number(raw.tax || 0),
    status,
    paymentStatus,
    paymentMethod: method,
    parcelType,
    createdAt: createdAtStr,
    source: raw.source || (raw.syncedToFirebase ? 'customer_storefront' : 'customer_website'),
    trackingNumber: raw.trackingNumber || raw.tracking_number || raw.parcelId,
    notes: raw.deliveryNotes || raw.notes || raw.note || raw.customerNotes,
    deliveryOtp: raw.deliveryOtp || raw.otp || `${Math.floor(1000 + Math.random() * 9000)}`,
    estimatedDeliveryMinutes: raw.estimatedDeliveryMinutes || raw.deliveryMinutes || (parcelType === 'quick_grocery' ? 10 : 30),
    assignedWorker: raw.assignedWorker || raw.workerName || raw.riderName || undefined,
    parcelReceivedAt: raw.parcelReceivedAt || (status !== 'pending' ? (raw.updatedAt ? String(raw.updatedAt) : createdAtStr) : undefined),
    deliveredAt: raw.deliveredAt || (status === 'delivered' ? (raw.updatedAt ? String(raw.updatedAt) : new Date().toISOString()) : undefined),
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
          if (docSnap.id === 'barozza_menu_catalog' || docSnap.data()?.isCatalog) {
            return;
          }
          const order = normalizeOrderData(docSnap.id, docSnap.data());
          if (order) {
            loaded.push(order);
          }
        });
        // Sort newest first
        loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(loaded);
      },
      (err) => {
        if (err.code === 'unavailable' || err.message?.includes('unavailable')) {
          // Firestore operates offline during transient reconnection
          return;
        }
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
            if (item) {
              const order = normalizeOrderData(String(index), item);
              if (order) loaded.push(order);
            }
          });
        } else if (typeof val === 'object') {
          Object.entries(val).forEach(([key, item]) => {
            if (key !== 'barozza_menu_catalog' && key !== 'cafe_status' && key !== 'barozza_cafe_status') {
              const order = normalizeOrderData(key, item);
              if (order) loaded.push(order);
            }
          });
        }
        loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(loaded);
      },
      (err) => {
        console.warn("RTDB listener notice:", err?.message || err);
        onError(err);
      }
    );

    return () => {
      try {
        unsubscribe();
      } catch (e) {}
    };
  } catch (err: any) {
    console.warn("RTDB subscribe notice:", err?.message || err);
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
 * Permanently delete an unwanted junk or dummy parcel document from Firestore and RTDB
 */
export async function deleteOrderDocument(
  orderId: string, 
  collectionName: string = 'orders', 
  rtdbPath: string = 'orders'
): Promise<void> {
  if (firestoreDb) {
    try {
      await deleteDoc(doc(firestoreDb, collectionName, orderId));
    } catch (e) {
      console.warn("Could not delete from Firestore:", e);
    }
  }
  if (realtimeDb) {
    try {
      await remove(ref(realtimeDb, `${rtdbPath}/${orderId}`));
    } catch (e) {
      console.warn("Could not delete from RTDB:", e);
    }
  }
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

/**
 * Real-time listener for dishes / menu catalog changes in Firestore
 */
export function listenToMenuCatalog(
  onUpdate: (dishes: Product[]) => void,
  onError?: (error: Error) => void
) {
  if (!firestoreDb) {
    if (onError) onError(new Error("Firestore not initialized"));
    return () => {};
  }

  try {
    const catalogDocRef = doc(firestoreDb, 'orders', 'barozza_menu_catalog');
    const unsubscribe = onSnapshot(
      catalogDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.dishes) && data.dishes.length > 0) {
            onUpdate(data.dishes);
          }
        }
      },
      (err) => {
        if (err.code === 'unavailable' || err.message?.includes('unavailable')) return;
        console.warn("Dishes catalog listener note:", err);
        if (onError) onError(err);
      }
    );
    return unsubscribe;
  } catch (err: any) {
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Helper to build the complete, authoritative list of customer dishes
 * combining BAROZZA_CANONICAL_DISHES (1 to 18) + current products + existing Firestore dishes
 */
export function buildAuthoritativeCustomerDishes(
  status: CafeStatus,
  currentProducts: Product[] = [],
  extraFirestoreDishes: Array<{ id: string; data: any }> = []
) {
  const closureMessage = status.closureReason || 
    `currently cafe is closed. so I'm sorry boss ! . it will open at ${status.formattedReopenTime || 'Date and Time'}.`;

  const deletedSet = new Set<string>();
  try {
    const rawDel = localStorage.getItem("barozza_deleted_dish_ids");
    if (rawDel) {
      const parsed = JSON.parse(rawDel);
      if (Array.isArray(parsed)) {
        parsed.forEach(id => deletedSet.add(String(id).toLowerCase().trim()));
      }
    }
  } catch (e) {}

  // Active products in the admin inventory must NEVER be suppressed by stale deletedSet entries!
  const activeKeys = new Set<string>();
  if (Array.isArray(currentProducts) && currentProducts.length > 0) {
    currentProducts.forEach(p => {
      if (p.id) activeKeys.add(String(p.id).toLowerCase().trim());
      if (p.dishId) activeKeys.add(String(p.dishId).toLowerCase().trim());
      if (p.sku) activeKeys.add(String(p.sku).toLowerCase().trim());
      if (p.name) activeKeys.add(String(p.name).toLowerCase().trim());
    });

    for (const key of activeKeys) {
      deletedSet.delete(key);
    }

    try {
      localStorage.setItem("barozza_deleted_dish_ids", JSON.stringify(Array.from(deletedSet)));
    } catch (e) {}
  }

  const dishMap = new Map<string, any>();

  // 1. Seed with the 18 canonical dishes required by brozza.vercel.app (excluding only truly deleted ones not present in admin)
  for (const canon of BAROZZA_CANONICAL_DISHES) {
    const cId = canon.id.toLowerCase().trim();
    const cName = canon.name.toLowerCase().trim();
    const cSku = `brz-dish-${canon.id.padStart(2, '0')}`;

    // If canon is active in currentProducts, it is protected
    const isActiveInAdmin = activeKeys.has(cId) || activeKeys.has(cName) || activeKeys.has(cSku);

    if (!isActiveInAdmin && (deletedSet.has(cId) || deletedSet.has(cName) || deletedSet.has(cSku))) {
      continue;
    }

    dishMap.set(canon.id, {
      id: canon.id,
      dishId: canon.id,
      sku: `BRZ-DISH-${canon.id.padStart(2, '0')}`,
      name: canon.name,
      price: canon.price,
      image: canon.imageUrl,
      imageUrl: canon.imageUrl,
      description: status.isOpen ? canon.description : closureMessage,
      originalDescription: canon.description,
      category: canon.category,
      available: status.isOpen,
      stock: status.isOpen ? 25 : 0,
      cafeClosed: !status.isOpen,
      reopenTime: status.isOpen ? '' : (status.reopenTime || ''),
      formattedReopenTime: status.isOpen ? '' : (status.formattedReopenTime || '')
    });
  }

  // 2. Merge all current admin products (source of truth)
  const dedupedAdmin = deduplicateProducts(currentProducts);
  for (const p of dedupedAdmin) {
    const pId = String(p.id || '').toLowerCase().trim();
    const pDishId = String(p.dishId || '').toLowerCase().trim();
    const pSku = String(p.sku || '').toLowerCase().trim();
    const pName = String(p.name || '').toLowerCase().trim();

    // If it corresponds to a canonical dish by dishId or exact name
    const canonMatch = BAROZZA_CANONICAL_DISHES.find(c => 
      c.id === p.dishId || 
      c.id === p.id ||
      c.name.trim().toLowerCase() === pName
    );

    if (canonMatch) {
      const parsedStock = p.stock !== undefined ? Number(p.stock) : undefined;
      const isAvail = status.isOpen && p.status !== 'out_of_stock' && (parsedStock === undefined || parsedStock > 0);
      const stockVal = status.isOpen ? (parsedStock !== undefined ? parsedStock : 25) : 0;
      const cleanDesc = (p.description && !p.description.includes('currently cafe is closed') && !p.description.includes('sorry boss'))
        ? p.description
        : canonMatch.description;
      const desc = status.isOpen ? cleanDesc : closureMessage;
      const dishName = (p.name && p.name.trim()) ? p.name.trim() : canonMatch.name;
      const dishImage = p.imageUrl || (p as any).image || canonMatch.imageUrl;
      const dishCategory = (p.category && p.category.trim()) ? p.category.trim() : canonMatch.category;

      dishMap.set(canonMatch.id, {
        id: canonMatch.id,
        dishId: canonMatch.id,
        sku: p.sku || `BRZ-DISH-${canonMatch.id.padStart(2, '0')}`,
        name: dishName, // Respect admin renamed dish name!
        price: Number(p.price) || canonMatch.price,
        costPrice: (p as any).costPrice || canonMatch.price * 0.5,
        lowStockThreshold: (p as any).lowStockThreshold || 5,
        status: p.status || (stockVal === 0 ? 'out_of_stock' : stockVal <= 5 ? 'low_stock' : 'in_stock'),
        image: dishImage, // Respect admin updated image!
        imageUrl: dishImage,
        description: desc,
        originalDescription: cleanDesc,
        category: dishCategory, // Respect admin updated category!
        available: isAvail,
        stock: stockVal,
        cafeClosed: !status.isOpen,
        reopenTime: status.isOpen ? '' : (status.reopenTime || ''),
        formattedReopenTime: status.isOpen ? '' : (status.formattedReopenTime || '')
      });
    } else {
      // Custom extra product
      let customKey = p.dishId || p.id || `custom-${Date.now()}`;
      if (Number(customKey) >= 1 && Number(customKey) <= 18) {
        customKey = `item-${customKey}`;
      }
      const parsedStock = p.stock !== undefined ? Number(p.stock) : undefined;
      const isAvail = status.isOpen && p.status !== 'out_of_stock' && (parsedStock === undefined || parsedStock > 0);
      const stockVal = status.isOpen ? (parsedStock !== undefined ? parsedStock : 25) : 0;
      const desc = status.isOpen ? (p.description || `${p.name} freshly prepared at The Barozza Cafe.`) : closureMessage;

      dishMap.set(customKey, {
        id: customKey,
        dishId: customKey,
        sku: p.sku || `BRZ-CUST-${customKey}`,
        name: p.name,
        price: Number(p.price) || 50,
        costPrice: (p as any).costPrice || Math.round((Number(p.price) || 50) * 0.5),
        lowStockThreshold: (p as any).lowStockThreshold || 5,
        status: p.status || (stockVal === 0 ? 'out_of_stock' : stockVal <= 5 ? 'low_stock' : 'in_stock'),
        image: p.imageUrl || (p as any).image || "/images/frenchh.png",
        imageUrl: p.imageUrl || (p as any).image || "/images/frenchh.png",
        description: desc,
        originalDescription: p.description || `${p.name} freshly prepared at The Barozza Cafe.`,
        category: p.category || "General",
        available: isAvail,
        stock: stockVal,
        cafeClosed: !status.isOpen,
        reopenTime: status.isOpen ? '' : (status.reopenTime || ''),
        formattedReopenTime: status.isOpen ? '' : (status.formattedReopenTime || '')
      });
    }
  }

  // 3. Merge any extra dishes present in Firestore dishes collection (strictly ignoring any deleted dishes)
  for (const fDoc of extraFirestoreDishes) {
    const fData = fDoc.data;
    if (!fData) continue;
    const key = fDoc.id;
    const fNameLower = String(fData.name || '').toLowerCase().trim();
    const fSkuLower = String(fData.sku || '').toLowerCase().trim();
    const fDishIdLower = String(fData.dishId || key || '').toLowerCase().trim();

    if (
      deletedSet.has(key.toLowerCase()) || 
      deletedSet.has(fNameLower) || 
      deletedSet.has(fSkuLower) || 
      deletedSet.has(fDishIdLower)
    ) {
      continue;
    }
    
    // Check if this matches a canonical dish by ID or by name
    const canonMatch = BAROZZA_CANONICAL_DISHES.find(c => 
      c.id === key || 
      c.name.trim().toLowerCase() === fNameLower ||
      (c.id === '3' && fNameLower.includes('chowmin'))
    );

    if (canonMatch) {
      if (deletedSet.has(canonMatch.id.toLowerCase()) || deletedSet.has(canonMatch.name.toLowerCase().trim())) {
        continue;
      }
      const existing = dishMap.get(canonMatch.id);
      // When cafe is open, never inherit stale closure availability/stock
      const isAvail = status.isOpen;
      const stockVal = status.isOpen ? (existing?.stock !== undefined ? existing.stock : 25) : 0;
      const rawDesc = existing?.description || fData.originalDescription || fData.description || '';
      const cleanDesc = (rawDesc && !rawDesc.includes('currently cafe is closed') && !rawDesc.includes('sorry boss')) 
        ? rawDesc 
        : canonMatch.description;
      const desc = status.isOpen ? cleanDesc : closureMessage;
      const dishName = existing?.name || (fData.name && fData.name.trim() ? fData.name.trim() : canonMatch.name);
      const dishImage = existing?.imageUrl || existing?.image || fData.imageUrl || fData.image || canonMatch.imageUrl;
      const dishCategory = existing?.category || fData.category || canonMatch.category;

      dishMap.set(canonMatch.id, {
        id: canonMatch.id,
        dishId: canonMatch.id,
        sku: existing?.sku || `BRZ-DISH-${canonMatch.id.padStart(2, '0')}`,
        name: dishName,
        price: Number(fData.price) || existing?.price || canonMatch.price,
        image: dishImage,
        imageUrl: dishImage,
        description: desc,
        originalDescription: cleanDesc,
        category: dishCategory,
        available: isAvail,
        stock: stockVal,
        cafeClosed: !status.isOpen,
        reopenTime: status.isOpen ? '' : (status.reopenTime || ''),
        formattedReopenTime: status.isOpen ? '' : (status.formattedReopenTime || '')
      });
    } else {
      let finalKey = key;
      if (Number(key) >= 1 && Number(key) <= 18) {
        finalKey = `custom-${key}`;
      }
      const existing = dishMap.get(finalKey);
      const isAvail = status.isOpen && (fData.cafeClosed ? true : (fData.available !== false && (fData.stock === undefined || Number(fData.stock) > 0)));
      const stockVal = status.isOpen ? (fData.stock && Number(fData.stock) > 0 ? Number(fData.stock) : 25) : 0;
      const rawDesc = fData.originalDescription || fData.description || existing?.description || '';
      const cleanDesc = (rawDesc && !rawDesc.includes('currently cafe is closed') && !rawDesc.includes('sorry boss')) 
        ? rawDesc 
        : `${fData.name || 'Dish'} freshly prepared at The Barozza Cafe.`;
      const desc = status.isOpen ? cleanDesc : closureMessage;

      const dishImage = existing?.imageUrl || existing?.image || fData.imageUrl || fData.image || "/images/frenchh.png";
      dishMap.set(finalKey, {
        id: finalKey,
        dishId: finalKey,
        sku: fData.sku || existing?.sku || `BRZ-CUST-${finalKey}`,
        name: fData.name || `Dish ${finalKey}`,
        price: Number(fData.price || existing?.price || 50),
        image: dishImage,
        imageUrl: dishImage,
        description: desc,
        originalDescription: cleanDesc,
        category: fData.category || existing?.category || "General",
        available: isAvail,
        stock: stockVal,
        cafeClosed: !status.isOpen,
        reopenTime: status.isOpen ? '' : (status.reopenTime || ''),
        formattedReopenTime: status.isOpen ? '' : (status.formattedReopenTime || '')
      });
    }
  }

  // Final check:
  if (status.isOpen) {
    // When cafe is OPEN: Default all dishes count to 25 till the owner setZero on their own
    const ownerZeroSet = new Set<string>();
    try {
      const rawZero = localStorage.getItem("barozza_owner_zero_dishes");
      if (rawZero) {
        const parsedZero = JSON.parse(rawZero);
        if (Array.isArray(parsedZero)) {
          parsedZero.forEach(z => ownerZeroSet.add(String(z).toLowerCase().trim()));
        }
      }
    } catch (e) {}

    for (const [k, d] of dishMap.entries()) {
      const canon = BAROZZA_CANONICAL_DISHES.find(c => c.id === k);
      let desc = d.description;
      if (!desc || desc.includes("currently cafe is closed") || desc.includes("sorry boss")) {
        desc = d.originalDescription || canon?.description || `${d.name} freshly prepared at The Barozza Cafe.`;
      }

      const dIdLower = String(d.id || k).toLowerCase().trim();
      const dDishIdLower = String(d.dishId || k).toLowerCase().trim();
      const dSkuLower = String(d.sku || '').toLowerCase().trim();
      const dNameLower = String(d.name || '').toLowerCase().trim();

      const isOwnerZero = 
        ownerZeroSet.has(dIdLower) || 
        ownerZeroSet.has(dDishIdLower) || 
        ownerZeroSet.has(dSkuLower) || 
        ownerZeroSet.has(dNameLower);

      let finalStock = 25;
      if (isOwnerZero) {
        finalStock = 0;
      } else if (typeof d.stock === 'number' && d.stock >= 0) {
        finalStock = d.stock;
      } else {
        finalStock = 25;
      }

      dishMap.set(k, {
        ...d,
        name: d.name || (canon ? canon.name : `Dish ${k}`),
        image: d.imageUrl || d.image || (canon ? canon.imageUrl : '/images/frenchh.png'),
        imageUrl: d.imageUrl || d.image || (canon ? canon.imageUrl : '/images/frenchh.png'),
        category: d.category || (canon ? canon.category : 'General'),
        available: finalStock > 0,
        stock: finalStock,
        status: finalStock === 0 ? 'out_of_stock' : finalStock <= 5 ? 'low_stock' : 'in_stock',
        cafeClosed: false,
        description: desc,
        originalDescription: d.originalDescription || canon?.description || desc,
        reopenTime: '',
        formattedReopenTime: ''
      });
    }
  } else {
    // When cafe is CLOSED: Enforce 100% unavailability on EVERY dish without exception!
    for (const [k, d] of dishMap.entries()) {
      dishMap.set(k, {
        ...d,
        available: false,
        stock: 0,
        cafeClosed: true,
        description: closureMessage,
        reopenTime: status.reopenTime || '',
        formattedReopenTime: status.formattedReopenTime || ''
      });
    }
  }

  // Strictly filter out any dish whose id, dishId, sku, or name is in deletedSet
  return Array.from(dishMap.values()).filter(d => {
    const dId = String(d.id || '').toLowerCase().trim();
    const dDishId = String(d.dishId || '').toLowerCase().trim();
    const dSku = String(d.sku || '').toLowerCase().trim();
    const dName = String(d.name || '').toLowerCase().trim();
    return !deletedSet.has(dId) && !deletedSet.has(dDishId) && !deletedSet.has(dSku) && !deletedSet.has(dName);
  });
}

/**
 * Synchronize dishes across:
 * 1. Firebase Firestore (orders/barozza_menu_catalog)
 * 2. LocalStorage (barozza_cafe_dishes) for customer website
 * 3. BroadcastChannels (barozza_cafe_dishes & barozza_menu_sync)
 * 4. Cross-window postMessage
 */
export async function syncDishesToFirestoreAndStore(products: Product[]): Promise<void> {
  const currentStatus = getInitialCafeStatus();
  const uniqueProducts = deduplicateProducts(products);
  const customerDishes = buildAuthoritativeCustomerDishes(currentStatus, uniqueProducts);

  // 1. Write to localStorage for instant customer storefront reflection
  try {
    localStorage.setItem("barozza_cafe_dishes", JSON.stringify(customerDishes));
    localStorage.setItem("barozza_admin_products", JSON.stringify(uniqueProducts));
  } catch (e) {
    console.warn("Failed to write dishes to localStorage:", e);
  }

  // 2. Broadcast across tabs and windows
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      ['barozza_cafe_dishes', 'barozza_menu_sync'].forEach(chName => {
        try {
          const bc = new BroadcastChannel(chName);
          bc.postMessage({ type: 'DISHES_UPDATED', dishes: customerDishes, products });
          setTimeout(() => { try { bc.close(); } catch (e) {} }, 3000);
        } catch (e) {}
      });
    }
  } catch (e) {}

  // 3. PostMessage to any listening frames / tabs
  try {
    window.postMessage({ type: 'BAROZZA_DISHES_UPDATED', dishes: customerDishes }, '*');
  } catch (e) {}

  // 4. Update Firestore doc orders/barozza_menu_catalog & dishes collection
  try {
    if (firestoreDb) {
      const catalogDocRef = doc(firestoreDb, 'orders', 'barozza_menu_catalog');
      await setDoc(catalogDocRef, {
        isCatalog: true,
        type: 'menu_catalog',
        storeName: 'The Barozza Cafe',
        isCafeOpen: currentStatus.isOpen,
        isOpen: currentStatus.isOpen,
        status: currentStatus.isOpen ? 'open' : 'closed',
        reopenTime: currentStatus.isOpen ? '' : (currentStatus.reopenTime || ''),
        formattedReopenTime: currentStatus.isOpen ? '' : (currentStatus.formattedReopenTime || ''),
        closureMessage: currentStatus.isOpen ? '' : (currentStatus.closureReason || `currently cafe is closed. so I'm sorry boss ! . it will open at ${currentStatus.formattedReopenTime || 'Date and Time'}.`),
        lastUpdated: new Date().toISOString(),
        dishes: customerDishes,
        customerDishes,
        totalDishes: customerDishes.length
      }, { merge: true });

      await Promise.allSettled(
        customerDishes.map(dish => 
          setDoc(doc(firestoreDb!, 'dishes', String(dish.dishId || dish.id)), {
            id: dish.id,
            dishId: dish.dishId || dish.id,
            sku: dish.sku,
            name: dish.name,
            price: dish.price,
            category: dish.category,
            description: dish.description,
            image: dish.image || dish.imageUrl,
            imageUrl: dish.imageUrl || dish.image,
            available: dish.available,
            stock: dish.stock,
            cafeClosed: !currentStatus.isOpen,
            reopenTime: currentStatus.isOpen ? '' : (currentStatus.reopenTime || ''),
            formattedReopenTime: currentStatus.isOpen ? '' : (currentStatus.formattedReopenTime || ''),
            lastUpdated: new Date().toISOString()
          }, { merge: true })
        )
      );
    }
  } catch (err) {
    console.warn("Failed to sync dishes catalog to Firestore:", err);
  }

  // 5. Also sync to Realtime Database (/dishes and /menu_catalog) for instant multi-client reflection
  if (realtimeDb) {
    try {
      await set(ref(realtimeDb, 'dishes'), customerDishes);
      await set(ref(realtimeDb, 'menu_catalog'), {
        dishes: customerDishes,
        lastUpdated: new Date().toISOString()
      });
    } catch (e) {
      console.warn("RTDB dishes sync note:", e);
    }
  }
}

/**
 * Permanently delete a dish from Firestore menu catalog and individual dishes collection
 */
export async function deleteDishFromFirestoreCatalog(targetProduct: Product): Promise<void> {
  if (!firestoreDb || !targetProduct) return;
  try {
    const idLower = String(targetProduct.id || '').toLowerCase().trim();
    const dishIdLower = String(targetProduct.dishId || '').toLowerCase().trim();
    const skuLower = String(targetProduct.sku || '').toLowerCase().trim();
    const nameLower = String(targetProduct.name || '').toLowerCase().trim();

    const catalogDocRef = doc(firestoreDb, 'orders', 'barozza_menu_catalog');
    const catalogSnap = await getDoc(catalogDocRef);
    if (catalogSnap.exists()) {
      const data = catalogSnap.data();
      const list = data.dishes || data.customerDishes || [];
      const prevDeleted = Array.isArray(data.deletedDishIds) ? data.deletedDishIds : [];
      const newDeletedIds = Array.from(new Set([
        ...prevDeleted,
        idLower,
        dishIdLower,
        skuLower,
        nameLower,
        targetProduct.id,
        targetProduct.dishId,
        targetProduct.sku,
        targetProduct.name
      ])).filter(Boolean);

      const newDishes = list.filter((d: any) => {
        const dId = String(d.id || '').toLowerCase().trim();
        const dDishId = String(d.dishId || '').toLowerCase().trim();
        const dSku = String(d.sku || '').toLowerCase().trim();
        const dName = String(d.name || '').toLowerCase().trim();
        return (
          dId !== idLower &&
          dDishId !== dishIdLower &&
          dDishId !== idLower &&
          dId !== dishIdLower &&
          dSku !== skuLower &&
          dName !== nameLower
        );
      });

      await setDoc(catalogDocRef, {
        ...data,
        dishes: newDishes,
        customerDishes: newDishes,
        totalDishes: newDishes.length,
        deletedDishIds: newDeletedIds,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }

    // Delete all document variants from 'dishes' collection
    const keysToDelete = [targetProduct.id, targetProduct.dishId, targetProduct.sku].filter(Boolean);
    for (const key of keysToDelete) {
      if (key) {
        await deleteDoc(doc(firestoreDb, 'dishes', String(key))).catch(() => {});
      }
    }

    // Also delete any document in 'dishes' collection whose data matches name or dishId
    try {
      const dishesSnap = await getDocs(collection(firestoreDb, 'dishes'));
      for (const d of dishesSnap.docs) {
        const data = d.data();
        const dName = String(data.name || '').toLowerCase().trim();
        const dDishId = String(data.dishId || '').toLowerCase().trim();
        if (dName === nameLower || dDishId === dishIdLower || d.id === targetProduct.id || d.id === targetProduct.dishId) {
          await deleteDoc(doc(firestoreDb, 'dishes', d.id)).catch(() => {});
        }
      }
    } catch (e) {}

    // Also if Realtime DB is connected, remove from RTDB
    if (realtimeDb) {
      for (const key of keysToDelete) {
        if (key) {
          await remove(ref(realtimeDb, `dishes/${key}`)).catch(() => {});
          await remove(ref(realtimeDb, `menu/${key}`)).catch(() => {});
        }
      }
    }
  } catch (e) {
    console.warn("Firestore permanent dish delete error:", e);
  }
}

/**
 * Listen to live catalog updates in Firestore so dishes and prices stay in sync with customer dashboard
 */
export function listenToCatalogDishes(
  onUpdate: (dishes: any[]) => void
): () => void {
  if (!firestoreDb) return () => {};
  try {
    const catalogDocRef = doc(firestoreDb, 'orders', 'barozza_menu_catalog');
    const unsub = onSnapshot(catalogDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const list = data.dishes || data.customerDishes;
        if (Array.isArray(list) && list.length > 0) {
          // Read local deleted dish registry
          const deletedSet = new Set<string>();
          try {
            const rawDel = localStorage.getItem("barozza_deleted_dish_ids");
            if (rawDel) {
              const parsed = JSON.parse(rawDel);
              if (Array.isArray(parsed)) {
                parsed.forEach(x => deletedSet.add(String(x).toLowerCase().trim()));
              }
            }
          } catch (e) {}

          if (Array.isArray(data.deletedDishIds)) {
            data.deletedDishIds.forEach((x: any) => deletedSet.add(String(x).toLowerCase().trim()));
          }

          const filtered = list.filter((d: any) => {
            const dId = String(d.id || '').toLowerCase().trim();
            const dDishId = String(d.dishId || '').toLowerCase().trim();
            const dSku = String(d.sku || '').toLowerCase().trim();
            const dName = String(d.name || '').toLowerCase().trim();
            return !deletedSet.has(dId) && !deletedSet.has(dDishId) && !deletedSet.has(dSku) && !deletedSet.has(dName);
          });

          onUpdate(filtered);
        }
      }
    }, (err) => {
      if (err.code === 'unavailable' || err.message?.includes('unavailable')) return;
      console.warn("Catalog listener notice:", err?.message || err);
    });
    return unsub;
  } catch (err) {
    console.warn("Catalog listener init notice:", err);
    return () => {};
  }
}

export const DEFAULT_CAFE_STATUS: CafeStatus = {
  isOpen: true,
  reopenTime: '',
  formattedReopenTime: '',
  closedBy: 'The Admin ( Rohit )',
  closureReason: "currently cafe is closed. so I'm sorry boss ! . it will open at Date and Time."
};

/**
 * Retrieves the initial cafe status from localStorage or default
 */
export function getInitialCafeStatus(): CafeStatus {
  try {
    const saved = localStorage.getItem('barozza_cafe_status');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Auto check if expired
      if (parsed && !parsed.isOpen && parsed.reopenTime) {
        const reopenTimestamp = new Date(parsed.reopenTime).getTime();
        if (!isNaN(reopenTimestamp) && Date.now() >= reopenTimestamp) {
          // Reopening time has passed!
          const autoReopened = { ...parsed, isOpen: true, reopenTime: '', formattedReopenTime: '' };
          localStorage.setItem('barozza_cafe_status', JSON.stringify(autoReopened));
          return autoReopened;
        }
      }
      return parsed;
    }
  } catch (e) {
    console.warn("Error reading cafe status from localStorage:", e);
  }
  return DEFAULT_CAFE_STATUS;
}

/**
 * Synchronize Cafe Status across:
 * 1. Firebase Firestore (orders/barozza_cafe_status, orders/cafe_status, settings/cafe_status, orders/barozza_menu_catalog)
 * 2. Firebase Realtime Database (cafe_status, orders/cafe_status, barozza_cafe_status)
 * 3. LocalStorage (barozza_cafe_status & barozza_cafe_dishes)
 * 4. BroadcastChannels (barozza_cafe_status, customer_cafe_status, cafe_status)
 * 5. Cross-window postMessage & custom DOM events
 * Runs status writes concurrently for zero-delay instant propagation.
 */
export async function syncCafeStatusToFirebaseAndStore(
  status: CafeStatus, 
  currentProducts?: Product[]
): Promise<void> {
  const payload = {
    ...status,
    updatedAt: new Date().toISOString(),
    storeName: 'The Barozza Cafe'
  };

  const closureMessage = status.closureReason || 
    `currently cafe is closed. so I'm sorry boss ! . it will open at ${status.formattedReopenTime || 'Date and Time'}.`;

  // 1. LocalStorage (Immediate synchronous update)
  try {
    localStorage.setItem('barozza_cafe_status', JSON.stringify(status));
  } catch (e) {
    console.warn("Error writing cafe status to localStorage:", e);
  }

  // 2. Custom DOM Event (Instant 0ms in-window propagation)
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('barozza_cafe_status_change', { detail: status }));
    }
  } catch (e) {}

  // 3. BroadcastChannel (Cross-tab instant sync without early channel termination)
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      ['barozza_cafe_status', 'customer_cafe_status', 'cafe_status'].forEach(channelName => {
        try {
          const bc = new BroadcastChannel(channelName);
          bc.postMessage({ type: 'CAFE_STATUS_CHANGED', status });
          setTimeout(() => {
            try { bc.close(); } catch (e) {}
          }, 3000);
        } catch (e) {}
      });
    }
  } catch (e) {}

  // 4. PostMessage for iframe / parent communication
  try {
    if (typeof window !== 'undefined') {
      window.postMessage({ type: 'BAROZZA_CAFE_STATUS_UPDATE', status }, '*');
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'BAROZZA_CAFE_STATUS_UPDATE', status }, '*');
      }
      if (window.opener) {
        window.opener.postMessage({ type: 'BAROZZA_CAFE_STATUS_UPDATE', status }, '*');
      }
    }
  } catch (e) {}

  // 5. Resolve products list to sync dishes availability
  // When cafe is opened: clear manual zero set so default 25 count applies for every open of cafe
  if (status.isOpen) {
    try {
      localStorage.removeItem("barozza_owner_zero_dishes");
    } catch (e) {}
  }

  let prods = currentProducts;
  if (status.isOpen && prods && prods.length > 0) {
    // Ensure all dishes passed have stock 25 by default upon open
    prods = prods.map(p => ({
      ...p,
      stock: 25,
      status: 'in_stock' as const,
      available: true,
      cafeClosed: false
    }));
  }
  if (!prods || prods.length === 0) {
    try {
      const saved = localStorage.getItem("barozza_admin_products");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          prods = parsed;
        }
      }
    } catch (e) {}
  }
  if (!prods || prods.length === 0) {
    prods = INITIAL_PRODUCTS;
  }

  // Pre-build dishes for instant localStorage & BroadcastChannel distribution
  const syncedCustomerDishes = buildAuthoritativeCustomerDishes(status, prods);

  // Save customer dishes to localStorage for brozza.vercel.app shared tab cache
  try {
    localStorage.setItem("barozza_cafe_dishes", JSON.stringify(syncedCustomerDishes));
    if (typeof BroadcastChannel !== 'undefined') {
      ['barozza_cafe_dishes', 'barozza_menu_sync'].forEach(chName => {
        try {
          const bc = new BroadcastChannel(chName);
          bc.postMessage({ type: 'DISHES_UPDATED', dishes: syncedCustomerDishes, cafeStatus: status });
          setTimeout(() => {
            try { bc.close(); } catch (e) {}
          }, 3000);
        } catch (e) {}
      });
    }
  } catch (e) {}

  // 6. Ultra-Fast Parallel Cloud Sync: Fire all Firestore status paths + RTDB paths simultaneously!
  const syncPromises: Promise<any>[] = [];

  // Firestore status documents & menu catalog
  if (firestoreDb) {
    const docPaths = [
      ['orders', 'barozza_cafe_status'],
      ['orders', 'cafe_status'],
      ['settings', 'cafe_status'],
      ['cafe_status', 'status']
    ] as const;

    docPaths.forEach(([col, docId]) => {
      syncPromises.push(
        setDoc(doc(firestoreDb!, col, docId), payload, { merge: true }).catch(err => {
          console.warn(`Firestore status sync error on ${col}/${docId}:`, err);
        })
      );
    });

    // Also immediately update orders/barozza_menu_catalog which controls customer storefront
    const catalogDocRef = doc(firestoreDb, 'orders', 'barozza_menu_catalog');
    syncPromises.push(
      setDoc(catalogDocRef, {
        isCatalog: true,
        type: 'menu_catalog',
        storeName: 'The Barozza Cafe',
        isCafeOpen: status.isOpen,
        isOpen: status.isOpen,
        status: status.isOpen ? 'open' : 'closed',
        reopenTime: status.isOpen ? '' : (status.reopenTime || ''),
        formattedReopenTime: status.isOpen ? '' : (status.formattedReopenTime || ''),
        closureMessage: status.isOpen ? '' : closureMessage,
        lastUpdated: new Date().toISOString(),
        dishes: syncedCustomerDishes,
        customerDishes: syncedCustomerDishes,
        totalDishes: syncedCustomerDishes.length
      }, { merge: true }).catch(err => {
        console.warn("Firestore menu catalog status sync error:", err);
      })
    );
  }

  // Firebase Realtime Database (RTDB) sync (executed in the exact same concurrent burst)
  if (realtimeDb) {
    const rtdbPaths = ['cafe_status', 'orders/cafe_status', 'barozza_cafe_status', 'status'];
    rtdbPaths.forEach(p => {
      syncPromises.push(
        set(ref(realtimeDb!, p), payload).catch(err => {
          console.warn(`RTDB status sync error on ${p}:`, err);
        })
      );
    });
  }

  // Wait for the primary instant status writes to complete
  await Promise.allSettled(syncPromises);

  // 7. Background update for individual dishes in 'dishes' collection (fire-and-forget so UI is never delayed)
  if (firestoreDb) {
    (async () => {
      try {
        await Promise.allSettled(
          syncedCustomerDishes.map(dish => 
            setDoc(doc(firestoreDb!, 'dishes', dish.id), {
              id: dish.id,
              dishId: dish.id,
              name: dish.name,
              price: dish.price,
              category: dish.category,
              description: dish.description,
              image: dish.image,
              imageUrl: dish.imageUrl,
              available: dish.available,
              stock: dish.stock,
              cafeClosed: !status.isOpen,
              reopenTime: status.isOpen ? '' : (status.reopenTime || ''),
              formattedReopenTime: status.isOpen ? '' : (status.formattedReopenTime || ''),
              lastUpdated: new Date().toISOString()
            }, { merge: true })
          )
        );
      } catch (e) {
        console.warn("Background dish collection update notice:", e);
      }
    })();
  }
}

/**
 * Real-time listener for cafe status changes
 */
export function listenToCafeStatus(
  onUpdate: (status: CafeStatus) => void
): () => void {
  const broadcastChannels: BroadcastChannel[] = [];
  let isCleanedUp = false;
  
  // 1. BroadcastChannel listener for multi-tab sync
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      ['barozza_cafe_status', 'customer_cafe_status', 'cafe_status'].forEach(chName => {
        try {
          const bc = new BroadcastChannel(chName);
          bc.onmessage = (event) => {
            if (event.data && event.data.type === 'CAFE_STATUS_CHANGED' && event.data.status) {
              onUpdate(event.data.status);
            }
          };
          broadcastChannels.push(bc);
        } catch (e) {}
      });
    }
  } catch (e) {}

  // 2. Storage event listener (cross-window)
  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'barozza_cafe_status' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        onUpdate(parsed);
      } catch (err) {}
    }
  };
  window.addEventListener('storage', handleStorage);

  // 3. Custom in-window event (0ms intra-window dispatch)
  const handleCustomEvent = (e: Event) => {
    const customEvt = e as CustomEvent<CafeStatus>;
    if (customEvt.detail) {
      onUpdate(customEvt.detail);
    }
  };
  window.addEventListener('barozza_cafe_status_change', handleCustomEvent);

  // 4. Message event listener (postMessage)
  const handleWindowMessage = (e: MessageEvent) => {
    if (e.data && e.data.type === 'BAROZZA_CAFE_STATUS_UPDATE' && e.data.status) {
      onUpdate(e.data.status);
    }
  };
  window.addEventListener('message', handleWindowMessage);

  // 5. Polling fallback (every 800ms) to ensure zero desync even if backgrounded
  const pollInterval = setInterval(() => {
    if (isCleanedUp) return;
    try {
      const saved = localStorage.getItem('barozza_cafe_status');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.isOpen === 'boolean') {
          // Check if reopen time passed
          if (!parsed.isOpen && parsed.reopenTime) {
            const reopenTs = new Date(parsed.reopenTime).getTime();
            if (!isNaN(reopenTs) && Date.now() >= reopenTs) {
              const autoOpen: CafeStatus = { ...parsed, isOpen: true, reopenTime: '', formattedReopenTime: '' };
              localStorage.setItem('barozza_cafe_status', JSON.stringify(autoOpen));
              onUpdate(autoOpen);
              return;
            }
          }
          // Notify current status
          onUpdate(parsed);
        }
      }
    } catch (e) {}
  }, 800);

  // 6. Firestore listeners (Primary status doc + Menu catalog doc)
  let unsubFirestore1 = () => {};
  let unsubFirestore2 = () => {};
  let unsubFirestore3 = () => {};
  if (firestoreDb) {
    try {
      const statusDocRef = doc(firestoreDb, 'orders', 'barozza_cafe_status');
      unsubFirestore1 = onSnapshot(statusDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (typeof data.isOpen === 'boolean') {
            const status: CafeStatus = {
              isOpen: data.isOpen,
              reopenTime: data.reopenTime || '',
              formattedReopenTime: data.formattedReopenTime || '',
              closedAt: data.closedAt,
              closedBy: data.closedBy,
              closureReason: data.closureReason
            };
            onUpdate(status);
          }
        }
      }, (err) => {
        if (err.code === 'unavailable' || err.message?.includes('unavailable')) return;
        console.warn("Cafe status Firestore listener:", err?.message || err);
      });

      const statusDocRef2 = doc(firestoreDb, 'orders', 'cafe_status');
      unsubFirestore2 = onSnapshot(statusDocRef2, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (typeof data.isOpen === 'boolean') {
            onUpdate({
              isOpen: data.isOpen,
              reopenTime: data.reopenTime || '',
              formattedReopenTime: data.formattedReopenTime || '',
              closedAt: data.closedAt,
              closedBy: data.closedBy,
              closureReason: data.closureReason
            });
          }
        }
      }, () => {});

      const catalogDocRef = doc(firestoreDb, 'orders', 'barozza_menu_catalog');
      unsubFirestore3 = onSnapshot(catalogDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const openVal = typeof data.isOpen === 'boolean' ? data.isOpen : (typeof data.isCafeOpen === 'boolean' ? data.isCafeOpen : undefined);
          if (typeof openVal === 'boolean') {
            onUpdate({
              isOpen: openVal,
              reopenTime: data.reopenTime || '',
              formattedReopenTime: data.formattedReopenTime || '',
              closureReason: data.closureMessage
            });
          }
        }
      }, () => {});
    } catch (e) {}
  }

  // 7. Realtime Database listener
  let unsubRTDB = () => {};
  if (realtimeDb) {
    try {
      const cafeRef = ref(realtimeDb, 'cafe_status');
      unsubRTDB = onValue(cafeRef, (snapshot) => {
        const val = snapshot.val();
        if (val && typeof val.isOpen === 'boolean') {
          onUpdate({
            isOpen: val.isOpen,
            reopenTime: val.reopenTime || '',
            formattedReopenTime: val.formattedReopenTime || '',
            closedAt: val.closedAt,
            closedBy: val.closedBy,
            closureReason: val.closureReason
          });
        }
      });
    } catch (e) {}
  }

  return () => {
    isCleanedUp = true;
    clearInterval(pollInterval);
    broadcastChannels.forEach(bc => {
      try { bc.close(); } catch (e) {}
    });
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('barozza_cafe_status_change', handleCustomEvent);
    window.removeEventListener('message', handleWindowMessage);
    unsubFirestore1();
    unsubFirestore2();
    unsubFirestore3();
    unsubRTDB();
  };
}

// =========================================================================
// STRICT SINGLE-USER LOCK & AUTHENTICATION SYSTEM
// =========================================================================

export interface SingleUserLock {
  isInitialized: boolean;
  ownerUid: string;
  ownerEmail: string;
  ownerName: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  authProvider: 'password' | 'google';
  registeredAt: string;
  lastLoginAt: string;
}

export interface RegisterOwnerData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginOwnerData {
  email: string;
  password: string;
}

export interface AuthOwnerUser {
  uid: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  photoURL?: string;
  provider: 'password' | 'google';
}

const DEFAULT_UNINITIALIZED_LOCK: SingleUserLock = {
  isInitialized: false,
  ownerUid: '',
  ownerEmail: '',
  ownerName: '',
  authProvider: 'password',
  registeredAt: '',
  lastLoginAt: ''
};

let inMemoryLockCache: SingleUserLock | null = null;

/**
 * Retrieves the authoritative single-user lock status from fast in-memory/localStorage cache (0ms),
 * or Firestore with zero blocking delay.
 */
export async function getSingleUserLock(forceNetworkRefresh = false): Promise<SingleUserLock> {
  // Fast path 1: In-memory cache (0ms)
  if (!forceNetworkRefresh && inMemoryLockCache && inMemoryLockCache.isInitialized) {
    return inMemoryLockCache;
  }

  // Fast path 2: Check localStorage cache (0ms)
  if (!forceNetworkRefresh) {
    try {
      const cached = localStorage.getItem('barozza_single_user_lock');
      if (cached) {
        const parsed = JSON.parse(cached) as SingleUserLock;
        if (parsed && parsed.isInitialized) {
          inMemoryLockCache = parsed;
          return parsed;
        }
      }
    } catch (e) {}
  }

  // Fast path 3: Firestore with fast 800ms race timeout
  if (firestoreDb) {
    try {
      const lockDocRef = doc(firestoreDb, 'system_security', 'single_user_lock');
      const fetchPromise = getDoc(lockDocRef);
      const snap = await Promise.race([
        fetchPromise,
        new Promise<null>((r) => setTimeout(() => r(null), 800))
      ]);
      if (snap && snap.exists()) {
        const data = snap.data() as SingleUserLock;
        if (data && data.isInitialized) {
          inMemoryLockCache = data;
          try {
            localStorage.setItem('barozza_single_user_lock', JSON.stringify(data));
          } catch (e) {}
          return data;
        }
      }
    } catch (err) {
      console.warn("Firestore single_user_lock read warning:", err);
    }
  }

  // Fallback to localStorage
  try {
    const cached = localStorage.getItem('barozza_single_user_lock');
    if (cached) {
      const parsed = JSON.parse(cached) as SingleUserLock;
      if (parsed && parsed.isInitialized) {
        inMemoryLockCache = parsed;
        return parsed;
      }
    }
  } catch (e) {}

  return DEFAULT_UNINITIALIZED_LOCK;
}

/**
 * Real-time listener for the single-user lock status across Firestore and tabs
 */
export function subscribeToSingleUserLock(
  onUpdate: (lock: SingleUserLock) => void
): () => void {
  let unsubFirestore = () => {};

  if (firestoreDb) {
    try {
      const lockDocRef = doc(firestoreDb, 'system_security', 'single_user_lock');
      unsubFirestore = onSnapshot(lockDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as SingleUserLock;
          if (data && data.isInitialized) {
            inMemoryLockCache = data;
            try {
              localStorage.setItem('barozza_single_user_lock', JSON.stringify(data));
            } catch (e) {}
            onUpdate(data);
            return;
          }
        }
        // If doc does not exist
        inMemoryLockCache = DEFAULT_UNINITIALIZED_LOCK;
        onUpdate(DEFAULT_UNINITIALIZED_LOCK);
      }, (err) => {
        if (err.code === 'unavailable') return;
        console.warn("single_user_lock subscription notice:", err?.message || err);
      });
    } catch (e) {}
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'barozza_single_user_lock' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        inMemoryLockCache = parsed;
        onUpdate(parsed);
      } catch (err) {}
    }
  };
  window.addEventListener('storage', handleStorage);

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<SingleUserLock>;
    if (custom.detail) {
      inMemoryLockCache = custom.detail;
      onUpdate(custom.detail);
    }
  };
  window.addEventListener('barozza_lock_updated', handleCustomEvent);

  return () => {
    unsubFirestore();
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('barozza_lock_updated', handleCustomEvent);
  };
}

/**
 * Register the sole platform owner using Email/Password.
 * STRICT: Throws immediately if a user is already registered.
 */
export async function registerFirstOwnerWithEmail(
  data: RegisterOwnerData
): Promise<{ user: AuthOwnerUser; lock: SingleUserLock }> {
  if (!auth) {
    throw new Error("Authentication service is unavailable. Please verify connection.");
  }

  const currentLock = await getSingleUserLock();
  if (currentLock.isInitialized) {
    throw new Error("Registration is closed. System initialized.");
  }

  const cleanEmail = data.email.toLowerCase().trim();
  const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();

  // 1. Create the Firebase Auth user
  const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, data.password);
  const fbUser = userCred.user;

  // 2. Set user display name
  try {
    await updateProfile(fbUser, { displayName: fullName });
  } catch (e) {}

  // 3. Establish the immutable single-user lock
  const newLock: SingleUserLock = {
    isInitialized: true,
    ownerUid: fbUser.uid,
    ownerEmail: cleanEmail,
    ownerName: fullName,
    ownerFirstName: data.firstName.trim(),
    ownerLastName: data.lastName.trim(),
    authProvider: 'password',
    registeredAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };

  // 4. Save to Firestore
  if (firestoreDb) {
    try {
      const lockDocRef = doc(firestoreDb, 'system_security', 'single_user_lock');
      await setDoc(lockDocRef, newLock, { merge: true });
    } catch (e) {
      console.warn("Could not write single_user_lock to Firestore:", e);
    }
  }

  // 5. Persist to localStorage & dispatch
  try {
    localStorage.setItem('barozza_single_user_lock', JSON.stringify(newLock));
    localStorage.setItem('barozza_auth_session', JSON.stringify({
      uid: fbUser.uid,
      email: cleanEmail,
      displayName: fullName,
      provider: 'password'
    }));
    window.dispatchEvent(new CustomEvent('barozza_lock_updated', { detail: newLock }));
  } catch (e) {}

  const authUser: AuthOwnerUser = {
    uid: fbUser.uid,
    email: cleanEmail,
    displayName: fullName,
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    provider: 'password'
  };

  return { user: authUser, lock: newLock };
}

/**
 * Sign in as the registered platform owner using Email/Password.
 * STRICT: Rejects any user who is not the registered owner.
 */
export async function loginOwnerWithEmail(
  data: LoginOwnerData
): Promise<{ user: AuthOwnerUser; lock: SingleUserLock }> {
  if (!auth) {
    throw new Error("Authentication service is unavailable.");
  }

  const currentLock = await getSingleUserLock();
  if (!currentLock.isInitialized) {
    throw new Error("System is not yet initialized. Please complete owner registration first.");
  }

  const cleanEmail = data.email.toLowerCase().trim();

  // Strict pre-check
  if (cleanEmail !== currentLock.ownerEmail.toLowerCase().trim()) {
    throw new Error("Don't try to Enter this, You're not an OWNER");
  }

  // Sign in with Firebase Auth
  const userCred = await signInWithEmailAndPassword(auth, cleanEmail, data.password);
  const fbUser = userCred.user;

  // Post-check verification
  if (
    fbUser.uid !== currentLock.ownerUid && 
    (fbUser.email || '').toLowerCase().trim() !== currentLock.ownerEmail.toLowerCase().trim()
  ) {
    await signOut(auth);
    throw new Error("Don't try to Enter this, You're not an OWNER");
  }

  // Update last login (non-blocking in background)
  const updatedLock: SingleUserLock = {
    ...currentLock,
    lastLoginAt: new Date().toISOString()
  };
  inMemoryLockCache = updatedLock;

  try {
    localStorage.setItem('barozza_single_user_lock', JSON.stringify(updatedLock));
    localStorage.setItem('barozza_auth_session', JSON.stringify({
      uid: fbUser.uid,
      email: cleanEmail,
      displayName: currentLock.ownerName,
      provider: 'password'
    }));
  } catch (e) {}

  if (firestoreDb) {
    const lockDocRef = doc(firestoreDb, 'system_security', 'single_user_lock');
    setDoc(lockDocRef, { lastLoginAt: updatedLock.lastLoginAt }, { merge: true }).catch(() => {});
  }

  const authUser: AuthOwnerUser = {
    uid: fbUser.uid,
    email: cleanEmail,
    displayName: currentLock.ownerName,
    firstName: currentLock.ownerFirstName,
    lastName: currentLock.ownerLastName,
    provider: 'password'
  };

  return { user: authUser, lock: updatedLock };
}

/**
 * Authenticate via Google OAuth.
 * If no owner exists yet, this Google account becomes the sole permanent owner.
 * If an owner already exists, only that specific Google account can sign in; any other is immediately rejected.
 */
export async function authenticateWithGoogle(): Promise<{ user: AuthOwnerUser; lock: SingleUserLock }> {
  if (!auth) {
    throw new Error("Authentication service is unavailable.");
  }

  const currentLock = await getSingleUserLock();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  let userCred;
  try {
    userCred = await signInWithPopup(auth, provider);
  } catch (popupErr: any) {
    if (popupErr?.code === 'auth/popup-blocked') {
      throw new Error("Google Sign-In popup was blocked by your browser. Please allow popups or use Email/Password.");
    }
    if (popupErr?.code === 'auth/cancelled-popup-request' || popupErr?.code === 'auth/popup-closed-by-user') {
      throw new Error("Authentication cancelled by user.");
    }
    throw popupErr;
  }

  const fbUser = userCred.user;
  const userEmail = (fbUser.email || '').toLowerCase().trim();

  // Case A: System already has an initialized owner
  if (currentLock.isInitialized) {
    const isAuthorized = 
      fbUser.uid === currentLock.ownerUid || 
      userEmail === currentLock.ownerEmail.toLowerCase().trim();

    if (!isAuthorized) {
      await signOut(auth);
      throw new Error(
        "Registration is closed. System initialized."
      );
    }

    // Update last login
    const updatedLock: SingleUserLock = {
      ...currentLock,
      lastLoginAt: new Date().toISOString()
    };
    inMemoryLockCache = updatedLock;

    try {
      localStorage.setItem('barozza_single_user_lock', JSON.stringify(updatedLock));
      localStorage.setItem('barozza_auth_session', JSON.stringify({
        uid: fbUser.uid,
        email: userEmail,
        displayName: currentLock.ownerName,
        photoURL: fbUser.photoURL || undefined,
        provider: 'google'
      }));
    } catch (e) {}

    if (firestoreDb) {
      setDoc(doc(firestoreDb, 'system_security', 'single_user_lock'), {
        lastLoginAt: updatedLock.lastLoginAt
      }, { merge: true }).catch(() => {});
    }

    const authUser: AuthOwnerUser = {
      uid: fbUser.uid,
      email: userEmail,
      displayName: currentLock.ownerName,
      photoURL: fbUser.photoURL || undefined,
      provider: 'google'
    };

    return { user: authUser, lock: updatedLock };
  }

  // Case B: First user claim! This Google user becomes the permanent single owner.
  const displayName = fbUser.displayName || 'Platform Owner';
  const nameParts = displayName.trim().split(' ');
  const firstName = nameParts[0] || 'Platform';
  const lastName = nameParts.slice(1).join(' ') || 'Owner';

  const newLock: SingleUserLock = {
    isInitialized: true,
    ownerUid: fbUser.uid,
    ownerEmail: userEmail,
    ownerName: displayName,
    ownerFirstName: firstName,
    ownerLastName: lastName,
    authProvider: 'google',
    registeredAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };

  if (firestoreDb) {
    try {
      const lockDocRef = doc(firestoreDb, 'system_security', 'single_user_lock');
      await setDoc(lockDocRef, newLock, { merge: true });
    } catch (e) {
      console.warn("Could not save initial Google lock to Firestore:", e);
    }
  }

  try {
    localStorage.setItem('barozza_single_user_lock', JSON.stringify(newLock));
    localStorage.setItem('barozza_auth_session', JSON.stringify({
      uid: fbUser.uid,
      email: userEmail,
      displayName,
      photoURL: fbUser.photoURL || undefined,
      provider: 'google'
    }));
    window.dispatchEvent(new CustomEvent('barozza_lock_updated', { detail: newLock }));
  } catch (e) {}

  const authUser: AuthOwnerUser = {
    uid: fbUser.uid,
    email: userEmail,
    displayName,
    firstName,
    lastName,
    photoURL: fbUser.photoURL || undefined,
    provider: 'google'
  };

  return { user: authUser, lock: newLock };
}

/**
 * Log out the system owner and clear session state
 */
export async function logOutOwner(): Promise<void> {
  if (auth) {
    try {
      await signOut(auth);
    } catch (e) {}
  }
  try {
    localStorage.removeItem('barozza_auth_session');
    window.dispatchEvent(new CustomEvent('barozza_auth_logout'));
  } catch (e) {}
}

/**
 * Synchronous retrieval of cached active owner session
 */
export function getCachedOwnerSession(): AuthOwnerUser | null {
  try {
    const raw = localStorage.getItem('barozza_auth_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.uid && parsed.email) {
        return parsed as AuthOwnerUser;
      }
    }
  } catch (e) {}
  return null;
}



