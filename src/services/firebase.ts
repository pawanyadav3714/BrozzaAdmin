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
  getDocs
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

  const dishMap = new Map<string, any>();

  // 1. Seed with the 18 canonical dishes required by brozza.vercel.app
  for (const canon of BAROZZA_CANONICAL_DISHES) {
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

  // 2. Merge current admin products
  const dedupedAdmin = deduplicateProducts(currentProducts);
  for (const p of dedupedAdmin) {
    // If it corresponds to a canonical dish by dishId or exact name
    const canonMatch = BAROZZA_CANONICAL_DISHES.find(c => 
      c.id === p.dishId || 
      c.id === p.id ||
      c.name.trim().toLowerCase() === p.name.trim().toLowerCase()
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
        image: p.imageUrl || "/images/frenchh.png",
        imageUrl: p.imageUrl || "/images/frenchh.png",
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

  // 3. Merge any extra dishes present in Firestore dishes collection
  for (const fDoc of extraFirestoreDishes) {
    const fData = fDoc.data;
    if (!fData) continue;
    const key = fDoc.id;
    
    // Check if this matches a canonical dish by ID or by name
    const canonMatch = BAROZZA_CANONICAL_DISHES.find(c => 
      c.id === key || 
      c.name.trim().toLowerCase() === (fData.name || '').trim().toLowerCase() ||
      (c.id === '3' && (fData.name || '').toLowerCase().includes('chowmin'))
    );

    if (canonMatch) {
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

      dishMap.set(finalKey, {
        id: finalKey,
        dishId: finalKey,
        sku: fData.sku || existing?.sku || `BRZ-CUST-${finalKey}`,
        name: fData.name || `Dish ${finalKey}`,
        price: Number(fData.price || existing?.price || 50),
        image: fData.image || fData.imageUrl || existing?.image || "/images/frenchh.png",
        imageUrl: fData.imageUrl || fData.image || existing?.imageUrl || "/images/frenchh.png",
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
    // When cafe is OPEN: Enforce that all dishes are available with positive stock and keep the renamed dish name
    for (const [k, d] of dishMap.entries()) {
      const canon = BAROZZA_CANONICAL_DISHES.find(c => c.id === k);
      let desc = d.description;
      if (!desc || desc.includes("currently cafe is closed") || desc.includes("sorry boss")) {
        desc = d.originalDescription || canon?.description || `${d.name} freshly prepared at The Barozza Cafe.`;
      }
      dishMap.set(k, {
        ...d,
        name: d.name || (canon ? canon.name : `Dish ${k}`),
        image: d.imageUrl || d.image || (canon ? canon.imageUrl : '/images/frenchh.png'),
        imageUrl: d.imageUrl || d.image || (canon ? canon.imageUrl : '/images/frenchh.png'),
        category: d.category || (canon ? canon.category : 'General'),
        available: typeof d.stock === 'number' ? d.stock > 0 : true,
        stock: typeof d.stock === 'number' ? d.stock : 25,
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

  return Array.from(dishMap.values());
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
          setDoc(doc(firestoreDb, 'dishes', dish.id), {
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
 * 1. Firebase Firestore (orders/barozza_cafe_status, orders/cafe_status, settings/cafe_status)
 * 2. Firebase Realtime Database (cafe_status, orders/cafe_status, barozza_cafe_status)
 * 3. LocalStorage (barozza_cafe_status)
 * 4. BroadcastChannels (barozza_cafe_status, customer_cafe_status)
 * 5. Cross-window postMessage
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

  // 1. LocalStorage
  try {
    localStorage.setItem('barozza_cafe_status', JSON.stringify(status));
  } catch (e) {
    console.warn("Error writing cafe status to localStorage:", e);
  }

  // 2. BroadcastChannel
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      ['barozza_cafe_status', 'customer_cafe_status', 'cafe_status'].forEach(channelName => {
        try {
          const bc = new BroadcastChannel(channelName);
          bc.postMessage({ type: 'CAFE_STATUS_CHANGED', status });
          bc.close();
        } catch (e) {}
      });
    }
  } catch (e) {}

  // 3. PostMessage for iframe / parent communication
  try {
    window.postMessage({ type: 'BAROZZA_CAFE_STATUS_UPDATE', status }, '*');
  } catch (e) {}

  // 4. Resolve products list to sync dishes availability with brozza.vercel.app
  let prods = currentProducts;
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
  let syncedCustomerDishes = buildAuthoritativeCustomerDishes(status, prods);

  // Save customer dishes to localStorage for brozza.vercel.app shared tab cache
  try {
    localStorage.setItem("barozza_cafe_dishes", JSON.stringify(syncedCustomerDishes));
    if (typeof BroadcastChannel !== 'undefined') {
      const bc1 = new BroadcastChannel("barozza_cafe_dishes");
      bc1.postMessage({ type: 'DISHES_UPDATED', dishes: syncedCustomerDishes, cafeStatus: status });
      bc1.close();

      const bc2 = new BroadcastChannel("barozza_menu_sync");
      bc2.postMessage({ type: 'DISHES_UPDATED', dishes: syncedCustomerDishes, cafeStatus: status });
      bc2.close();
    }
  } catch (e) {}

  // 5. Firestore sync
  try {
    if (firestoreDb) {
      // Standard cafe status document paths
      const docPaths = [
        ['orders', 'barozza_cafe_status'],
        ['orders', 'cafe_status'],
        ['settings', 'cafe_status'],
        ['cafe_status', 'status']
      ] as const;

      await Promise.allSettled(
        docPaths.map(([col, docId]) => 
          setDoc(doc(firestoreDb, col, docId), payload, { merge: true })
        )
      );

      // Fetch all existing dishes from the 'dishes' collection so ANY existing document is guaranteed closed/open
      let existingDishDocs: Array<{ id: string; data: any }> = [];
      try {
        const dishesSnap = await getDocs(collection(firestoreDb, 'dishes'));
        existingDishDocs = dishesSnap.docs.map(d => ({ id: d.id, data: d.data() }));
      } catch (e) {
        console.warn("Could not pre-fetch dishes collection:", e);
      }

      // Re-build authoritative dishes combining canonical + admin + existing firestore docs
      syncedCustomerDishes = buildAuthoritativeCustomerDishes(status, prods, existingDishDocs);

      // Push updated dishes and status to orders/barozza_menu_catalog
      // (This directly controls brozza.vercel.app catalog subscription)
      const catalogDocRef = doc(firestoreDb, 'orders', 'barozza_menu_catalog');
      await setDoc(catalogDocRef, {
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
      }, { merge: true });

      // Update every dish in the 'dishes' collection (which brozza.vercel.app also subscribes to)
      await Promise.allSettled(
        syncedCustomerDishes.map(dish => 
          setDoc(doc(firestoreDb, 'dishes', dish.id), {
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

      // Clean up any stray non-canonical docs in 'dishes' (e.g., test doc 65)
      if (status.isOpen && existingDishDocs.length > 0) {
        for (const docObj of existingDishDocs) {
          if (!syncedCustomerDishes.some(d => d.id === docObj.id)) {
            try {
              await deleteDoc(doc(firestoreDb, 'dishes', docObj.id));
            } catch (e) {}
          }
        }
      }
    }
  } catch (err) {
    console.warn("Error syncing cafe status to Firestore:", err);
  }

  // 6. Firebase Realtime Database (RTDB) sync
  try {
    if (realtimeDb) {
      const rtdbPaths = ['cafe_status', 'orders/cafe_status', 'barozza_cafe_status', 'status'];
      await Promise.allSettled(
        rtdbPaths.map(p => set(ref(realtimeDb, p), payload))
      );
    }
  } catch (err) {
    console.warn("Error syncing cafe status to Realtime Database:", err);
  }
}

/**
 * Real-time listener for cafe status changes
 */
export function listenToCafeStatus(
  onUpdate: (status: CafeStatus) => void
): () => void {
  const broadcastChannels: BroadcastChannel[] = [];
  
  // BroadcastChannel listener for multi-tab sync
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

  // Storage event listener
  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'barozza_cafe_status' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        onUpdate(parsed);
      } catch (err) {}
    }
  };
  window.addEventListener('storage', handleStorage);

  // Message event listener (postMessage)
  const handleWindowMessage = (e: MessageEvent) => {
    if (e.data && e.data.type === 'BAROZZA_CAFE_STATUS_UPDATE' && e.data.status) {
      onUpdate(e.data.status);
    }
  };
  window.addEventListener('message', handleWindowMessage);

  // Firestore listener
  let unsubFirestore1 = () => {};
  let unsubFirestore2 = () => {};
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
    } catch (e) {}
  }

  // Realtime Database listener
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
    broadcastChannels.forEach(bc => bc.close());
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('message', handleWindowMessage);
    unsubFirestore1();
    unsubFirestore2();
    unsubRTDB();
  };
}


