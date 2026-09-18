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
  serverTimestamp, 
  query, 
  orderBy, 
  limit,
  Firestore,
  setLogLevel,
  memoryLocalCache
} from 'firebase/firestore';
import { 
  getDatabase, 
  ref, 
  onValue, 
  set, 
  push, 
  update 
} from 'firebase/database';
import { Order, OrderStatus, PaymentStatus, ParcelType, PaymentMethodType, Product } from '../types';

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
export function normalizeOrderData(id: string, raw: any): Order {
  const method = normalizePaymentMethod(raw.paymentMethod || raw.payment_method || raw.payMode || raw.method);
  const paymentStatus = normalizePaymentStatus(raw.paymentStatus || raw.payment_status || raw.payStatus || raw.paid, method);
  const parcelType = normalizeParcelType(raw.parcelType || raw.parcel_type || raw.category || raw.type || raw.orderType);
  const status = normalizeOrderStatus(raw.status || raw.order_status || raw.parcelStatus);

  // Address parsing with rich fields (supporting Cafe orders & Express parcels)
  const cust = raw.customer || {};
  const rawAddress = raw.customerAddress || raw.destinationLocation || cust.address || raw.address || raw.deliveryAddress || raw.shippingAddress || raw.fullAddress || '';
  const customerPhone = raw.customerPhone || raw.customer_phone || cust.phone || raw.phone || raw.phoneNumber || raw.mobile || raw.contact || '+91 98765 43210';
  const customerName = raw.customerName || raw.customer_name || cust.name || raw.name || raw.userName || 'Customer';

  const rawTotal = Number(raw.totalPrice || raw.totalAmount || raw.total || raw.amount || raw.grandTotal || raw.price || 0);

  const items = Array.isArray(raw.items) && raw.items.length > 0
    ? raw.items.map((it: any, index: number) => {
        const itemName = it.name || it.dishName || it.title || it.productName || 'Order Item';
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
      })
    : [{
        id: String(raw.dishId || 'item_0'),
        name: raw.dishName || raw.productName || raw.item || (parcelType === 'hot_food' ? 'Farmhouse Cheese Burst Pizza' : 'Fresh Farm Grocery Essentials'),
        sku: raw.sku || (raw.dishId ? `BRZ-DISH-${String(raw.dishId).padStart(2, '0')}` : 'BRZ-DISH-01'),
        price: Number(raw.totalPrice && raw.quantity ? (raw.totalPrice / raw.quantity) : raw.price || rawTotal || 30),
        quantity: Number(raw.quantity || 1),
        image: raw.image || raw.imageUrl || raw.img || raw.dishImage || raw.photo || raw.picture || getActualDishImageUrl(raw.dishName || raw.productName || raw.item || '', raw.dishId)
      }];

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

  return {
    id: id || raw.id || `ord_${Date.now()}`,
    orderNumber: orderNum,
    customer: {
      name: customerName,
      email: cust.email || raw.customerEmail || raw.email || `${customerName.toLowerCase().replace(/\s+/g, '.')}@customer.com`,
      phone: customerPhone,
      address: rawAddress || 'Indiranagar, Bangalore',
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
          loaded.push(normalizeOrderData(docSnap.id, docSnap.data()));
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
 * Synchronize dishes across:
 * 1. Firebase Firestore (orders/barozza_menu_catalog)
 * 2. LocalStorage (barozza_cafe_dishes) for customer website
 * 3. BroadcastChannels (barozza_cafe_dishes & barozza_menu_sync)
 * 4. Cross-window postMessage
 */
export async function syncDishesToFirestoreAndStore(products: Product[]): Promise<void> {
  const customerDishes = products.map((p, idx) => {
    let dishIdStr = p.dishId;
    if (!dishIdStr) {
      const match = p.sku.match(/\d+/) || p.id.match(/\d+/);
      dishIdStr = match ? String(parseInt(match[0], 10)) : String(idx + 1);
    }
    return {
      id: dishIdStr,
      name: p.name,
      price: Number(p.price),
      image: p.imageUrl || "/images/frenchh.png",
      description: p.description || `${p.name} freshly prepared at The Barozza Cafe.`,
      category: p.category || "General",
      available: p.status !== 'out_of_stock' && p.stock > 0
    };
  });

  // 1. Write to localStorage for instant customer storefront reflection
  try {
    localStorage.setItem("barozza_cafe_dishes", JSON.stringify(customerDishes));
    localStorage.setItem("barozza_admin_products", JSON.stringify(products));
  } catch (e) {
    console.warn("Failed to write dishes to localStorage:", e);
  }

  // 2. Broadcast across tabs and windows
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc1 = new BroadcastChannel("barozza_cafe_dishes");
      bc1.postMessage({ type: 'DISHES_UPDATED', dishes: customerDishes, products });
      bc1.close();

      const bc2 = new BroadcastChannel("barozza_menu_sync");
      bc2.postMessage({ type: 'DISHES_UPDATED', dishes: customerDishes, products });
      bc2.close();
    }
  } catch (e) {
    //
  }

  // 3. PostMessage to any listening frames / tabs
  try {
    window.postMessage({ type: 'BAROZZA_DISHES_UPDATED', dishes: customerDishes }, '*');
  } catch (e) {
    //
  }

  // 4. Update Firestore doc orders/barozza_menu_catalog
  try {
    if (firestoreDb) {
      const catalogDocRef = doc(firestoreDb, 'orders', 'barozza_menu_catalog');
      await setDoc(catalogDocRef, {
        isCatalog: true,
        type: 'menu_catalog',
        storeName: 'The Barozza Cafe',
        lastUpdated: new Date().toISOString(),
        dishes: products,
        customerDishes,
        totalDishes: products.length
      }, { merge: true });
    }
  } catch (err) {
    console.warn("Failed to sync dishes catalog to Firestore:", err);
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
          onUpdate(list);
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

