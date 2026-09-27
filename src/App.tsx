import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  listenToFirestoreOrders, 
  listenToRTDBOrders, 
  updateFirestoreOrderStatus, 
  updateRTDBOrderStatus,
  FirebaseConnectionStatus,
  firebaseConfig,
  pushOrderToFirestore,
  deleteOrderDocument,
  listenToMenuCatalog,
  syncDishesToFirestoreAndStore,
  deleteDishFromFirestoreCatalog,
  realtimeDb,
  normalizeOrderData,
  getInitialCafeStatus,
  syncCafeStatusToFirebaseAndStore,
  listenToCafeStatus,
  AuthOwnerUser,
  SingleUserLock,
  getCachedOwnerSession,
  logOutOwner,
  auth,
  getSingleUserLock,
  subscribeToSingleUserLock
} from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Order, OrderStatus, Product, SupportTicket, SyncLog, ApiSyncConfig, TicketStatus, TicketPriority, CafeStatus } from './types';
import { 
  INITIAL_ORDERS, 
  INITIAL_PRODUCTS, 
  INITIAL_TICKETS, 
  INITIAL_SYNC_LOGS, 
  INITIAL_API_CONFIG,
  deduplicateProducts
} from './data/mockData';
import { playOrderNotificationChime } from './utils/audio';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { OrdersView } from './components/OrdersView';
import { AnalyticsView } from './components/AnalyticsView';
import { InventoryView } from './components/InventoryView';
import { SupportView } from './components/SupportView';
import { ApiSyncView } from './components/ApiSyncView';
import { CustomerDashboardView } from './components/CustomerDashboardView';
import { OrderDetailsModal } from './components/OrderDetailsModal';
import { CreateOrderModal } from './components/CreateOrderModal';
import { FirebaseDiagnosticModal } from './components/FirebaseDiagnosticModal';
import { EditProductModal } from './components/EditProductModal';
import { CafeStatusModal } from './components/CafeStatusModal';
import { AuthGateway } from './components/AuthGateway';
import { CheckCircle2, AlertTriangle, Info, X, Home, Utensils, BarChart3, Store } from 'lucide-react';

export default function App() {
  // Single-User Owner Authentication State
  const [currentUser, setCurrentUser] = useState<AuthOwnerUser | null>(() => getCachedOwnerSession());
  const [ownerLock, setOwnerLock] = useState<SingleUserLock | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Navigation
  const [activeTab, setActiveTab] = useState<'orders' | 'analytics' | 'inventory' | 'support' | 'api-sync' | 'customer'>('orders');
  const [isMinimized, setIsMinimized] = useState<boolean>(true);
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>(() => {
    return (localStorage.getItem('barozza_sidebar_position') as 'left' | 'right') || 'left';
  });
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('barozza_sidebar_width');
    return saved ? Number(saved) : 76;
  });

  // Cafe Status (Open vs Closed with automatic reopening and B&W UI)
  const [cafeStatus, setCafeStatus] = useState<CafeStatus>(getInitialCafeStatus);
  const [isCafeStatusModalOpen, setIsCafeStatusModalOpen] = useState<boolean>(false);

  // Helper to filter out permanently deleted products (never dropping active canonical/saved dishes)
  const filterDeletedProducts = useCallback((prods: Product[]) => {
    const deletedRegistry = new Set<string>();
    try {
      const rawDel = localStorage.getItem("barozza_deleted_dish_ids");
      if (rawDel) {
        const parsed = JSON.parse(rawDel);
        if (Array.isArray(parsed)) {
          parsed.forEach(id => deletedRegistry.add(String(id).toLowerCase().trim()));
        }
      }
    } catch (e) {}

    return prods.filter(p => {
      const pId = String(p.id || '').toLowerCase().trim();
      const pDishId = String(p.dishId || '').toLowerCase().trim();
      const pSku = String(p.sku || '').toLowerCase().trim();
      const pName = String(p.name || '').toLowerCase().trim();

      // Canonical dishes and active dishes are always protected unless explicitly deleted
      return !deletedRegistry.has(pId) && !deletedRegistry.has(pDishId) && !deletedRegistry.has(pSku) && !deletedRegistry.has(pName);
    });
  }, []);

  // Core Data States - Starts empty so ONLY authentic customer dashboard parcels are received
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>(() => {
    let initialList = INITIAL_PRODUCTS;
    try {
      const cached = localStorage.getItem("barozza_admin_products");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialList = parsed;
        }
      }
    } catch (e) {}

    const deletedRegistry = new Set<string>();
    try {
      const rawDel = localStorage.getItem("barozza_deleted_dish_ids");
      if (rawDel) {
        const parsed = JSON.parse(rawDel);
        if (Array.isArray(parsed)) {
          parsed.forEach(id => deletedRegistry.add(String(id).toLowerCase().trim()));
        }
      }
    } catch (e) {}

    // Self-heal: ensure active dishes are purged from deleted registry
    initialList.forEach(p => {
      if (p.id) deletedRegistry.delete(String(p.id).toLowerCase().trim());
      if (p.dishId) deletedRegistry.delete(String(p.dishId).toLowerCase().trim());
      if (p.sku) deletedRegistry.delete(String(p.sku).toLowerCase().trim());
      if (p.name) deletedRegistry.delete(String(p.name).toLowerCase().trim());
    });
    try {
      localStorage.setItem("barozza_deleted_dish_ids", JSON.stringify(Array.from(deletedRegistry)));
    } catch (e) {}

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

    const isCafeCurrentlyOpen = getInitialCafeStatus().isOpen;

    const valid = initialList.map((p: any) => {
      const pId = String(p.id || '').toLowerCase().trim();
      const pDishId = String(p.dishId || '').toLowerCase().trim();
      const pSku = String(p.sku || '').toLowerCase().trim();
      const pName = String(p.name || '').toLowerCase().trim();

      const isOwnerZero = 
        ownerZeroSet.has(pId) || 
        ownerZeroSet.has(pDishId) || 
        ownerZeroSet.has(pSku) || 
        ownerZeroSet.has(pName);

      // When cafe is open, default all dishes count to 25 unless owner explicitly setZero on their own
      let finalStock = p.stock;
      if (isCafeCurrentlyOpen) {
        if (isOwnerZero) {
          finalStock = 0;
        } else if (finalStock === undefined || finalStock === null) {
          finalStock = 25;
        }
      }

      return {
        ...p,
        stock: finalStock,
        status: (finalStock === 0 ? 'out_of_stock' : finalStock <= (p.lowStockThreshold || 5) ? 'low_stock' : 'in_stock') as Product['status'],
        syncedWithExternalStore: true,
        lastSyncedAt: p.lastSyncedAt || new Date().toISOString()
      };
    }).filter(p => {
      const pId = String(p.id || '').toLowerCase().trim();
      const pDishId = String(p.dishId || '').toLowerCase().trim();
      const pSku = String(p.sku || '').toLowerCase().trim();
      const pName = String(p.name || '').toLowerCase().trim();
      return !deletedRegistry.has(pId) && !deletedRegistry.has(pDishId) && !deletedRegistry.has(pSku) && !deletedRegistry.has(pName);
    });

    return deduplicateProducts(valid.length > 0 ? valid : INITIAL_PRODUCTS);
  });
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>(INITIAL_SYNC_LOGS);
  const [apiConfig, setApiConfig] = useState<ApiSyncConfig>(INITIAL_API_CONFIG);

  // Settings & Status (Dark Mode Enabled by Default)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('the_brozza_theme');
      if (saved !== null) {
        return saved === 'dark';
      }
    } catch {
      // ignore
    }
    return true; // Default to dark mode
  });

  // Sync dark mode class and persist user preference
  useEffect(() => {
    try {
      localStorage.setItem('the_brozza_theme', isDarkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  const [collectionName, setCollectionName] = useState<string>('orders');
  const [rtdbPath, setRtdbPath] = useState<string>('orders');
  const [firebaseStatus, setFirebaseStatus] = useState<FirebaseConnectionStatus>({
    connected: true,
    type: 'both',
    lastPing: new Date().toISOString(),
    activeCollection: 'orders'
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSyncingStock, setIsSyncingStock] = useState<boolean>(false);

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState<boolean>(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState<boolean>(false);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<{ title: string; message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (title: string, message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ title, message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Synchronize Single-User Lock & Authentication Session
  useEffect(() => {
    let isMounted = true;

    // 1. Initial lock retrieval
    getSingleUserLock().then((lock) => {
      if (isMounted) setOwnerLock(lock);
    }).catch(() => {});

    // 2. Real-time subscription to single-user lock status
    const unsubLock = subscribeToSingleUserLock((updatedLock) => {
      if (isMounted) setOwnerLock(updatedLock);
    });

    // 3. Firebase Auth listener
    let unsubAuth = () => {};
    if (auth) {
      unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
        if (!isMounted) return;
        if (fbUser) {
          const currentLock = await getSingleUserLock();
          if (isMounted) setOwnerLock(currentLock);

          if (currentLock.isInitialized) {
            const userEmail = (fbUser.email || '').toLowerCase().trim();
            const isOwner = 
              fbUser.uid === currentLock.ownerUid || 
              userEmail === currentLock.ownerEmail.toLowerCase().trim();

            if (isOwner) {
              const authUser: AuthOwnerUser = {
                uid: fbUser.uid,
                email: userEmail,
                displayName: currentLock.ownerName || fbUser.displayName || 'System Owner',
                firstName: currentLock.ownerFirstName,
                lastName: currentLock.ownerLastName,
                photoURL: fbUser.photoURL || undefined,
                provider: (fbUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'password') as 'password' | 'google'
              };
              setCurrentUser(authUser);
            } else {
              // Non-owner account -> eject immediately per strict single-user policy
              await logOutOwner();
              setCurrentUser(null);
              showToast("Access Denied", "Don't try to Enter this, You're not an OWNER", "error");
            }
          }
        } else {
          // If no active Firebase Auth session, check if a cached session exists
          const cached = getCachedOwnerSession();
          if (!cached) {
            setCurrentUser(null);
          }
        }
        if (isMounted) setIsAuthLoading(false);
      });
    } else {
      if (isMounted) setIsAuthLoading(false);
    }

    const handleLogoutEvt = () => {
      if (isMounted) setCurrentUser(null);
    };
    window.addEventListener('barozza_auth_logout', handleLogoutEvt);

    return () => {
      isMounted = false;
      unsubLock();
      unsubAuth();
      window.removeEventListener('barozza_auth_logout', handleLogoutEvt);
    };
  }, []);

  const handleAuthenticated = (user: AuthOwnerUser, lock: SingleUserLock) => {
    setCurrentUser(user);
    setOwnerLock(lock);
    showToast("Session Authorized", `Welcome, ${user.displayName || 'System Owner'}`, "success");
  };

  const handleLogOut = async () => {
    await logOutOwner();
    setCurrentUser(null);
    showToast("Session Locked", "System owner session securely closed.", "info");
  };

  // Ref to track known order IDs to prevent repeat chimes
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef<boolean>(true);

  // Setup Firebase Real-time Listeners
  useEffect(() => {
    let unsubscribeFirestore = () => {};
    let unsubscribeRTDB = () => {};
    let bcOrders1: BroadcastChannel | null = null;
    let bcOrders2: BroadcastChannel | null = null;

    const handleInboundCustomerOrder = (rawOrder: any) => {
      if (!rawOrder) return;
      if (
        rawOrder.id === 'ord-cod-01' || 
        rawOrder.id === 'ord-upi-02' || 
        rawOrder.orderNumber === 'ORD-9821' || 
        rawOrder.orderNumber === 'ORD-9822'
      ) {
        return;
      }
      try {
        const orderId = rawOrder.id || `ord_cust_${Date.now()}`;
        const normalized = normalizeOrderData(orderId, rawOrder);
        setOrders(prev => {
          const exists = prev.some(o => o.id === normalized.id || o.orderNumber === normalized.orderNumber);
          if (exists) {
            return prev.map(o => (o.id === normalized.id || o.orderNumber === normalized.orderNumber) ? normalized : o);
          }
          if (soundEnabled) {
            playOrderNotificationChime();
            showToast("Customer Parcel Received!", `Customer parcel #${normalized.orderNumber} received directly from customer dashboard`, 'success');
          }
          return [normalized, ...prev];
        });
      } catch (e) {
        console.warn("Could not process inbound customer order:", e);
      }
    };

    // Helper to strictly identify genuine customer parcels and reject unwanted junks/dummies
    const isAuthenticCustomerParcel = (fo: Order | null | undefined): fo is Order => {
      if (!fo) return false;
      const idLower = (fo.id || '').toLowerCase();
      const orderNumLower = (fo.orderNumber || '').toLowerCase();
      const nameLower = (fo.customer?.name || '').toLowerCase();
      const notesLower = (fo.notes || '').toLowerCase();

      if (
        fo.id === 'ord-cod-01' || 
        fo.id === 'ord-upi-02' || 
        fo.orderNumber === 'ORD-9821' || 
        fo.orderNumber === 'ORD-9822' ||
        idLower.includes('dummy') || idLower.includes('test') ||
        orderNumLower.includes('dummy') || orderNumLower.includes('test') ||
        nameLower.includes('dummy') || nameLower === 'test' || nameLower === 'test customer' ||
        notesLower.includes('diagnostic console')
      ) {
        return false;
      }

      // Must have at least 1 real item and a valid amount
      if (!fo.items || fo.items.length === 0) return false;
      if (!fo.totalAmount || fo.totalAmount <= 0) return false;

      return true;
    };

    try {
      // 1. Listen to Firestore - ONLY genuine customer dashboard orders
      unsubscribeFirestore = listenToFirestoreOrders(
        collectionName,
        (firebaseOrders) => {
          // Strictly filter only real customer parcels from customer dashboard (exclude any dummy / junk parcels)
          const customerOrders = firebaseOrders.filter(isAuthenticCustomerParcel);

          setOrders(customerOrders);

          if (isInitialLoadRef.current) {
            isInitialLoadRef.current = false;
            customerOrders.forEach(fo => knownOrderIdsRef.current.add(fo.id));
          } else {
            let hasNewIncoming = false;
            customerOrders.forEach(fo => {
              if (!knownOrderIdsRef.current.has(fo.id)) {
                hasNewIncoming = true;
                knownOrderIdsRef.current.add(fo.id);
              }
            });

            if (hasNewIncoming && soundEnabled && customerOrders.length > 0) {
              playOrderNotificationChime();
              showToast("Customer Parcel Received!", `Incoming customer parcel [${customerOrders[0]?.orderNumber || 'Live'}] from customer dashboard`, 'success');
            }
          }

          setFirebaseStatus(prev => ({
            ...prev,
            connected: true,
            type: 'firestore',
            lastPing: new Date().toISOString(),
            activeCollection: collectionName,
            errorMessage: undefined
          }));
        },
        (err) => {
          if (err.message?.includes('unavailable')) {
            return;
          }
          setFirebaseStatus(prev => ({
            ...prev,
            errorMessage: `Firestore: ${err.message}`
          }));
        }
      );

      // 2. Listen to Realtime Database if configured
      if (realtimeDb) {
        unsubscribeRTDB = listenToRTDBOrders(
          rtdbPath,
          (rtdbOrders) => {
            const customerRtdbOrders = rtdbOrders.filter(isAuthenticCustomerParcel);
            if (customerRtdbOrders.length > 0) {
              setOrders(prev => {
                let hasNewIncoming = false;
                customerRtdbOrders.forEach(ro => {
                  if (!knownOrderIdsRef.current.has(ro.id)) {
                    hasNewIncoming = true;
                    knownOrderIdsRef.current.add(ro.id);
                  }
                });

                if (hasNewIncoming && soundEnabled) {
                  playOrderNotificationChime();
                  showToast("New Customer Parcel Received!", `Incoming parcel from customer dashboard`, 'success');
                }

                const map = new Map<string, Order>();
                prev.filter(isAuthenticCustomerParcel).forEach(o => map.set(o.id, o));
                customerRtdbOrders.forEach(o => map.set(o.id, o));
                return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              });

              setFirebaseStatus(prev => ({
                ...prev,
                connected: true,
                type: 'both',
                lastPing: new Date().toISOString(),
                activeCollection: `${collectionName} & /${rtdbPath}`,
                errorMessage: undefined
              }));
            }
          },
          (err) => {
            console.warn("RTDB listener note:", err.message);
          }
        );
      }

      // 3. Realtime listener for dishes / menu catalog
      const unsubscribeCatalog = listenToMenuCatalog((catalogDishes) => {
        if (catalogDishes && catalogDishes.length > 0) {
          const filteredCatalog = filterDeletedProducts(catalogDishes);
          setProducts(prev => {
            // Build index of previous rich product entries to preserve fields like costPrice, lowStockThreshold, etc.
            const prevIndex = new Map<string, Product>();
            prev.forEach(p => {
              if (p.id) prevIndex.set(String(p.id).toLowerCase(), p);
              if (p.dishId) prevIndex.set(String(p.dishId).toLowerCase(), p);
              if (p.sku) prevIndex.set(String(p.sku).toLowerCase(), p);
              if (p.name) prevIndex.set(String(p.name).toLowerCase().trim(), p);
            });

            const enrichedCatalog: Product[] = filteredCatalog.map((cd: any) => {
              const key1 = String(cd.id || '').toLowerCase();
              const key2 = String(cd.dishId || '').toLowerCase();
              const key3 = String(cd.sku || '').toLowerCase();
              const key4 = String(cd.name || '').toLowerCase().trim();
              const existing = prevIndex.get(key1) || prevIndex.get(key2) || prevIndex.get(key3) || prevIndex.get(key4);

              const stockVal = typeof cd.stock === 'number' ? cd.stock : (existing?.stock ?? 25);
              const lowThreshold = existing?.lowStockThreshold ?? 5;
              const statusVal = stockVal === 0 ? 'out_of_stock' : stockVal <= lowThreshold ? 'low_stock' : 'in_stock';

              return {
                id: cd.id || existing?.id || `prod_${Date.now()}`,
                dishId: cd.dishId || cd.id || existing?.dishId,
                sku: cd.sku || existing?.sku || `BRZ-DISH-${cd.id}`,
                name: cd.name || existing?.name || 'Cafe Dish',
                price: typeof cd.price === 'number' ? cd.price : (existing?.price ?? 40),
                costPrice: existing?.costPrice ?? Math.round((Number(cd.price) || 40) * 0.5),
                category: cd.category || existing?.category || 'Starters',
                description: cd.description || existing?.description || '',
                imageUrl: cd.imageUrl || cd.image || existing?.imageUrl || '/images/frenchh.png',
                stock: stockVal,
                lowStockThreshold: lowThreshold,
                status: statusVal,
                available: cd.available !== undefined ? cd.available : stockVal > 0,
                syncedWithExternalStore: true,
                lastSyncedAt: cd.lastUpdated || existing?.lastSyncedAt || new Date().toISOString()
              };
            });

            // Keep custom local items that haven't synced yet
            const enrichedKeys = new Set(enrichedCatalog.map(e => String(e.id).toLowerCase()));
            enrichedCatalog.forEach(e => {
              if (e.dishId) enrichedKeys.add(String(e.dishId).toLowerCase());
              if (e.sku) enrichedKeys.add(String(e.sku).toLowerCase());
              if (e.name) enrichedKeys.add(String(e.name).toLowerCase().trim());
            });

            const localExtras = prev.filter(p => {
              const k1 = String(p.id || '').toLowerCase();
              const k2 = String(p.dishId || '').toLowerCase();
              const k3 = String(p.sku || '').toLowerCase();
              const k4 = String(p.name || '').toLowerCase().trim();
              return !enrichedKeys.has(k1) && !enrichedKeys.has(k2) && !enrichedKeys.has(k3) && !enrichedKeys.has(k4);
            });

            const merged = filterDeletedProducts(deduplicateProducts([...localExtras, ...enrichedCatalog]));
            try {
              localStorage.setItem("barozza_admin_products", JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
      });

      // 4. Cross-tab & BroadcastChannel listener for direct customer dashboard orders
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          bcOrders1 = new BroadcastChannel('barozza_orders');
          bcOrders1.onmessage = (event) => {
            if (event.data?.order) handleInboundCustomerOrder(event.data.order);
            else if (event.data?.type === 'NEW_CUSTOMER_ORDER' && event.data?.payload) handleInboundCustomerOrder(event.data.payload);
          };
          bcOrders2 = new BroadcastChannel('customer_orders');
          bcOrders2.onmessage = (event) => {
            if (event.data?.order) handleInboundCustomerOrder(event.data.order);
            else if (event.data?.type === 'NEW_CUSTOMER_ORDER' && event.data?.payload) handleInboundCustomerOrder(event.data.payload);
          };
        } catch (e) {}
      }

      const handleWindowMsg = (event: MessageEvent) => {
        if (event.data?.type === 'NEW_CUSTOMER_ORDER' && event.data?.order) {
          handleInboundCustomerOrder(event.data.order);
        }
      };
      window.addEventListener('message', handleWindowMsg);

      return () => {
        unsubscribeFirestore();
        unsubscribeRTDB();
        unsubscribeCatalog();
        if (bcOrders1) bcOrders1.close();
        if (bcOrders2) bcOrders2.close();
        window.removeEventListener('message', handleWindowMsg);
      };
    } catch (e: any) {
      console.warn("Realtime listener init error:", e);
      return () => {
        unsubscribeFirestore();
        unsubscribeRTDB();
        if (bcOrders1) bcOrders1.close();
        if (bcOrders2) bcOrders2.close();
      };
    }
  }, [collectionName, rtdbPath, soundEnabled]);

  // Sync initial menu catalog to the active Firebase database
  useEffect(() => {
    if (products.length > 0) {
      syncDishesToFirestoreAndStore(products).catch(() => {});
    }
  }, []);

  // Listen to Cafe Status changes in real-time (across Firestore, BroadcastChannel, localStorage)
  useEffect(() => {
    const unsubscribe = listenToCafeStatus((updatedStatus) => {
      setCafeStatus(prevStatus => {
        // If cafe transitioned from closed -> open
        if (!prevStatus.isOpen && updatedStatus.isOpen) {
          try {
            localStorage.removeItem('barozza_owner_zero_dishes');
          } catch (e) {}

          setProducts(prevProducts => {
            const resetProducts = prevProducts.map(p => ({
              ...p,
              stock: 25,
              status: 'in_stock' as const,
              available: true,
              cafeClosed: false,
              lastSyncedAt: new Date().toISOString()
            }));

            try {
              localStorage.setItem("barozza_admin_products", JSON.stringify(resetProducts));
              window.dispatchEvent(new CustomEvent('barozza_stock_updated', { detail: { newStock: 25, products: resetProducts } }));
            } catch (e) {}

            syncDishesToFirestoreAndStore(resetProducts).catch(() => {});
            return resetProducts;
          });
        }
        return updatedStatus;
      });
    });
    return unsubscribe;
  }, []);

  // Automatic Reopening Scheduler
  // "the set time for opening the cafe will automatically open the cafe at typed / seted time on admin dashboard"
  useEffect(() => {
    const checkAutoReopen = () => {
      if (!cafeStatus.isOpen && cafeStatus.reopenTime) {
        const targetTimestamp = new Date(cafeStatus.reopenTime).getTime();
        if (!isNaN(targetTimestamp) && Date.now() >= targetTimestamp) {
          const autoReopened: CafeStatus = {
            isOpen: true,
            reopenTime: '',
            formattedReopenTime: '',
            closedBy: 'The Admin ( Rohit ) System Auto-Reopen'
          };

          try {
            localStorage.removeItem('barozza_owner_zero_dishes');
          } catch (e) {}

          const resetProducts = products.map(p => ({
            ...p,
            stock: 25,
            status: 'in_stock' as const,
            available: true,
            cafeClosed: false,
            lastSyncedAt: new Date().toISOString()
          }));
          setProducts(resetProducts);

          try {
            localStorage.setItem("barozza_admin_products", JSON.stringify(resetProducts));
            window.dispatchEvent(new CustomEvent('barozza_stock_updated', { detail: { newStock: 25, products: resetProducts } }));
          } catch (e) {}

          syncDishesToFirestoreAndStore(resetProducts).catch(() => {});
          syncCafeStatusToFirebaseAndStore(autoReopened, resetProducts);
          setCafeStatus(autoReopened);

          showToast(
            "Cafe Auto-Reopened!",
            "Scheduled opening time reached. Customer storefront is open with all dishes count set to 25 by default.",
            "success"
          );
        }
      }
    };

    checkAutoReopen();
    const interval = setInterval(checkAutoReopen, 3000);
    return () => clearInterval(interval);
  }, [cafeStatus, products]);

  // Update Cafe Status from Admin Dashboard (Instant zero-delay update)
  const handleUpdateCafeStatus = async (newStatus: CafeStatus) => {
    // 1. Instant local state update in 0ms
    setCafeStatus(newStatus);

    let prodsToSync = products;

    if (newStatus.isOpen) {
      // "when the cafe is open then by default set all the dishes count 25 already till the owner setZero on its own. for every open of cafe"
      try {
        localStorage.removeItem('barozza_owner_zero_dishes');
      } catch (e) {}

      const resetProducts = products.map(p => ({
        ...p,
        stock: 25,
        status: 'in_stock' as const,
        available: true,
        cafeClosed: false,
        lastSyncedAt: new Date().toISOString()
      }));
      setProducts(resetProducts);
      prodsToSync = resetProducts;

      try {
        localStorage.setItem("barozza_admin_products", JSON.stringify(resetProducts));
        window.dispatchEvent(new CustomEvent('barozza_stock_updated', { detail: { newStock: 25, products: resetProducts } }));
      } catch (e) {}

      syncDishesToFirestoreAndStore(resetProducts).catch(() => {});
    }

    // 2. Instant localStorage & DOM event dispatch for 0ms multi-context reaction
    try {
      localStorage.setItem('barozza_cafe_status', JSON.stringify(newStatus));
      window.dispatchEvent(new CustomEvent('barozza_cafe_status_change', { detail: newStatus }));
    } catch (e) {}

    // 3. Cloud synchronization in background (Firestore & RTDB)
    syncCafeStatusToFirebaseAndStore(newStatus, prodsToSync).catch(err => {
      console.warn("Background cafe status sync error:", err);
    });

    if (!newStatus.isOpen) {
      showToast(
        "Cafe Closed Instantly",
        `Orders locked and customer storefront set to B&W. Opens at ${newStatus.formattedReopenTime}.`,
        "info"
      );
    } else {
      showToast(
        "Cafe Reopened (All Dishes Count: 25)",
        "Cafe is open! All dishes are set to 25 count by default till you set any dish to zero.",
        "success"
      );
    }
  };

  // Reopen Cafe Early (Turn Off feature as earliest as set time)
  const handleReopenCafeEarly = async () => {
    const earlyOpenStatus: CafeStatus = {
      isOpen: true,
      reopenTime: '',
      formattedReopenTime: '',
      closedBy: 'The Admin ( Rohit )'
    };
    await handleUpdateCafeStatus(earlyOpenStatus);
  };

  // Place Order from Customer Dashboard
  const handlePlaceCustomerOrder = async (orderData: Partial<Order>) => {
    if (!cafeStatus.isOpen) {
      throw new Error(`currently cafe is closed. so I'm sorry boss ! . it will open at ${cafeStatus.formattedReopenTime}`);
    }

    const orderNumber = orderData.orderNumber || `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: Order = {
      id: `ord-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      orderNumber,
      customer: orderData.customer || {
        name: 'Walk-in Customer',
        phone: '+91 98765 43210',
        address: 'Sector 14'
      },
      items: orderData.items || [],
      subtotal: orderData.subtotal || 0,
      shippingFee: orderData.shippingFee || 0,
      tax: 0,
      totalAmount: orderData.totalAmount || 0,
      status: 'pending',
      paymentStatus: orderData.paymentStatus || 'pending',
      paymentMethod: orderData.paymentMethod || 'cash_on_delivery',
      parcelType: orderData.parcelType || 'hot_food',
      source: 'customer_website',
      createdAt: new Date().toISOString(),
      trackingNumber: `TRK-IN-${Math.floor(100000 + Math.random() * 900000)}`,
      estimatedDeliveryMinutes: 30
    };

    // Add to known order IDs
    knownOrderIdsRef.current.add(newOrder.id);

    // Save to Firestore and local state
    await pushOrderToFirestore(newOrder, collectionName);
    setOrders(prev => [newOrder, ...prev]);

    if (soundEnabled) {
      playOrderNotificationChime();
    }

    showToast(
      "Customer Parcel Received!",
      `New Order #${orderNumber} for ₹${newOrder.totalAmount} (${newOrder.paymentMethod === 'cash_on_delivery' ? 'COD' : 'UPI'}) placed.`,
      "success"
    );
  };

  // Order Status Update
  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus, additionalFields?: Partial<Order>) => {
    const ids = orderId.includes(',') ? orderId.split(',').map(s => s.trim()) : [orderId];

    // 1. Update local state
    setOrders(prev => prev.map(o => {
      if (ids.includes(o.id)) {
        return {
          ...o,
          status,
          ...(additionalFields || {})
        };
      }
      return o;
    }));

    if (selectedOrder && ids.includes(selectedOrder.id)) {
      setSelectedOrder(prev => prev ? {
        ...prev,
        status,
        ...(additionalFields || {})
      } : null);
    }

    // 2. Try updating in Firebase for all ids
    for (const id of ids) {
      try {
        await updateFirestoreOrderStatus(id, status, additionalFields, collectionName);
      } catch (err) {
        console.warn(`Firebase update status skipped for ${id}:`, err);
      }

      try {
        await updateRTDBOrderStatus(id, status, rtdbPath);
      } catch (err) {
        console.warn(`RTDB update status skipped for ${id}:`, err);
      }
    }

    showToast("Status Updated", `Parcel order updated to "${status.replace('_', ' ')}"`, 'success');
  };

  // Create Order from Modal
  const handleOrderCreated = (newOrder: Order) => {
    knownOrderIdsRef.current.add(newOrder.id);
    setOrders(prev => [newOrder, ...prev]);

    if (soundEnabled) {
      playOrderNotificationChime();
    }

    showToast("Order Dispatched", `Order ${newOrder.orderNumber} successfully received and synchronized!`, 'success');

    // Also deduct stock for ordered items
    setProducts(prev => prev.map(prod => {
      const match = newOrder.items.find(it => it.sku === prod.sku);
      if (match) {
        const newStock = Math.max(0, prod.stock - match.quantity);
        return {
          ...prod,
          stock: newStock,
          status: newStock === 0 ? 'out_of_stock' : newStock <= prod.lowStockThreshold ? 'low_stock' : 'in_stock'
        };
      }
      return prod;
    }));

    // Add Sync Log
    setSyncLogs(prev => [
      {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'order.inbound',
        source: newOrder.source,
        status: 'success',
        statusCode: 200,
        details: `Order ${newOrder.orderNumber} processed (₹${newOrder.totalAmount.toFixed(2)})`,
        payload: { orderNumber: newOrder.orderNumber, total: newOrder.totalAmount }
      },
      ...prev
    ]);
  };

  // Stock update from Inventory tab
  const handleUpdateStock = (productId: string, newStock: number) => {
    let updatedProduct: Product | undefined;

    // Track owner zero choice: if newStock is 0, add to barozza_owner_zero_dishes, otherwise remove
    try {
      let zeroList: string[] = [];
      const savedZero = localStorage.getItem('barozza_owner_zero_dishes');
      if (savedZero) {
        const parsed = JSON.parse(savedZero);
        if (Array.isArray(parsed)) zeroList = parsed;
      }
      if (newStock === 0) {
        if (!zeroList.includes(productId)) zeroList.push(productId);
      } else {
        zeroList = zeroList.filter(z => z !== productId);
      }
      localStorage.setItem('barozza_owner_zero_dishes', JSON.stringify(zeroList));
    } catch (e) {}

    const updatedList = products.map(p => {
      if (p.id === productId || p.dishId === productId || p.sku === productId || String(p.id) === String(productId)) {
        updatedProduct = {
          ...p,
          stock: newStock,
          status: (newStock === 0 ? 'out_of_stock' : newStock <= p.lowStockThreshold ? 'low_stock' : 'in_stock') as Product['status'],
          lastSyncedAt: new Date().toISOString()
        };
        return updatedProduct;
      }
      return p;
    });

    setProducts(updatedList);
    try {
      localStorage.setItem("barozza_admin_products", JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent('barozza_stock_updated', { detail: { productId, newStock, products: updatedList } }));
    } catch (e) {}

    syncDishesToFirestoreAndStore(updatedList).catch(() => {});

    if (updatedProduct) {
      showToast(
        newStock === 0 ? 'Marked Sold Out (0 units)' : 'Quantity Updated (Live Sync)',
        newStock === 0
          ? `${updatedProduct.name}: Set to 0 units (Sold out on customer storefront till restocked).`
          : `${updatedProduct.name}: ${newStock} units available. Live changes synced to customer dashboard.`,
        newStock === 0 ? 'info' : 'success'
      );

      if (apiConfig.autoSyncStock) {
        setSyncLogs(prev => [
          {
            id: `log_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'stock.push',
            source: 'Live Storefront Sync Engine',
            status: 'success',
            statusCode: 200,
            details: `Updated inventory for ${updatedProduct?.name} (${newStock} units) — synced to ${apiConfig.partnerStoreUrl}`,
            payload: { sku: updatedProduct?.sku, stock: newStock }
          },
          ...prev
        ]);
      }
    }
  };

  // Bulk Stock update (e.g. Set All Dishes to 0 or Reset All Dishes to 25)
  const handleSetAllDishesStock = (targetStock: number) => {
    try {
      if (targetStock === 0) {
        const allIds = products.map(p => p.id);
        localStorage.setItem('barozza_owner_zero_dishes', JSON.stringify(allIds));
      } else {
        localStorage.removeItem('barozza_owner_zero_dishes');
      }
    } catch (e) {}

    const updatedList = products.map(p => ({
      ...p,
      stock: targetStock,
      status: (targetStock === 0 ? 'out_of_stock' : targetStock <= p.lowStockThreshold ? 'low_stock' : 'in_stock') as Product['status'],
      lastSyncedAt: new Date().toISOString()
    }));

    setProducts(updatedList);
    try {
      localStorage.setItem("barozza_admin_products", JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent('barozza_stock_updated', { detail: { newStock: targetStock, products: updatedList } }));
    } catch (e) {}

    syncDishesToFirestoreAndStore(updatedList).catch(() => {});

    showToast(
      targetStock === 0 ? "Owner Set All Zero" : `All Dishes Reset to ${targetStock}`,
      targetStock === 0
        ? "All dishes set to 0 (Sold Out). Will stay at 0 till you restock or next cafe open."
        : `All dishes count set to default ${targetStock} units.`,
      targetStock === 0 ? "info" : "success"
    );
  };

  // Save dish / product from modal
  const handleSaveProduct = async (productData: Partial<Product>) => {
    let updatedProducts: Product[] = [];
    if (productData.id) {
      // Edit existing dish
      updatedProducts = products.map(p => (p.id === productData.id || (productData.dishId && p.dishId === productData.dishId) || (productData.sku && p.sku === productData.sku)) ? { 
        ...p, 
        ...productData,
        syncedWithExternalStore: true,
        lastSyncedAt: new Date().toISOString()
      } as Product : p);
      setProducts(updatedProducts);
      try {
        localStorage.setItem("barozza_admin_products", JSON.stringify(updatedProducts));
        window.dispatchEvent(new CustomEvent('barozza_stock_updated', { detail: { products: updatedProducts } }));
      } catch (e) {}
      showToast("Dish Updated (Live Sync)", `"${productData.name}" (₹${Number(productData.price)}) updated and live-synced with customer website & dashboard!`);
    } else {
      // Add new dish with collision-free unique IDs
      const dishCount = products.filter(p => p.sku?.startsWith('BRZ-DISH')).length + 1;
      const now = Date.now();
      const uniqueSuffix = Math.random().toString(36).substring(2, 6);
      const newProdId = productData.id || `prod_${now}_${uniqueSuffix}`;
      const newDishId = productData.dishId || `dish_${now}`;
      const finalSku = productData.sku || `BRZ-DISH-${String(dishCount).padStart(2, '0')}`;

      // Cleanse from deleted registry so it is never filtered out
      try {
        const rawDel = localStorage.getItem("barozza_deleted_dish_ids");
        if (rawDel) {
          const parsed = JSON.parse(rawDel);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(id => {
              const str = String(id).toLowerCase().trim();
              return str !== newProdId.toLowerCase() &&
                     str !== newDishId.toLowerCase() &&
                     str !== finalSku.toLowerCase() &&
                     str !== (productData.name || '').toLowerCase().trim();
            });
            localStorage.setItem("barozza_deleted_dish_ids", JSON.stringify(cleaned));
          }
        }
      } catch (e) {}

      const newProd: Product = {
        id: newProdId,
        dishId: newDishId,
        sku: finalSku,
        name: productData.name || 'New Cafe Dish',
        category: productData.category || 'Starters',
        price: Number(productData.price || 40.00),
        costPrice: Number(productData.costPrice || 20.00),
        stock: Number(productData.stock ?? 25),
        lowStockThreshold: Number(productData.lowStockThreshold ?? 5),
        status: (Number(productData.stock ?? 25) <= Number(productData.lowStockThreshold ?? 5)) ? 'low_stock' : 'in_stock',
        syncedWithExternalStore: true,
        lastSyncedAt: new Date().toISOString(),
        imageUrl: productData.imageUrl || 'https://brozza.vercel.app/images/frenchh.png',
        description: productData.description || `${productData.name || 'Dish'} prepared fresh at The Barozza Cafe.`,
        available: Number(productData.stock ?? 25) > 0
      };
      updatedProducts = [newProd, ...products];
      setProducts(updatedProducts);
      try {
        localStorage.setItem("barozza_admin_products", JSON.stringify(updatedProducts));
        window.dispatchEvent(new CustomEvent('barozza_stock_updated', { detail: { products: updatedProducts } }));
      } catch (e) {}
      showToast("Dish Added to Catalog", `"${newProd.name}" (₹${newProd.price}) added and pushed to customer website!`);
    }

    // Sync to Firestore doc orders/barozza_menu_catalog & customer site
    try {
      await syncDishesToFirestoreAndStore(updatedProducts);
    } catch (syncErr) {
      console.warn("Background dish sync warning:", syncErr);
    }

    setSyncLogs(prev => [
      {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'stock.push',
        source: 'Live Customer Website Sync',
        status: 'success',
        statusCode: 200,
        details: `Synced dish [${productData.name}] (₹${productData.price}) with ${apiConfig.partnerStoreUrl} and Firestore`,
        payload: { name: productData.name, price: productData.price, category: productData.category, syncedWithCustomerSite: true }
      },
      ...prev
    ]);
  };

  // Delete dish from catalog & live store permanently
  const handleDeleteProduct = async (productId: string) => {
    const targetProduct = products.find(p => 
      p.id === productId || 
      p.dishId === productId || 
      p.sku === productId ||
      String(p.id).toLowerCase() === String(productId).toLowerCase()
    );

    const targetId = targetProduct?.id || productId;
    const targetDishId = targetProduct?.dishId;
    const targetSku = targetProduct?.sku;
    const targetName = targetProduct?.name?.trim().toLowerCase();

    // 1. Permanently register deleted dish identifiers so it NEVER resurrects in any tab or catalog
    try {
      const rawDel = localStorage.getItem("barozza_deleted_dish_ids");
      const deletedRegistry = new Set<string>();
      if (rawDel) {
        const parsed = JSON.parse(rawDel);
        if (Array.isArray(parsed)) {
          parsed.forEach(id => deletedRegistry.add(String(id).toLowerCase().trim()));
        }
      }
      deletedRegistry.add(String(productId).toLowerCase().trim());
      if (targetId) deletedRegistry.add(String(targetId).toLowerCase().trim());
      if (targetDishId) deletedRegistry.add(String(targetDishId).toLowerCase().trim());
      if (targetSku) deletedRegistry.add(String(targetSku).toLowerCase().trim());
      if (targetName) deletedRegistry.add(targetName);

      localStorage.setItem("barozza_deleted_dish_ids", JSON.stringify(Array.from(deletedRegistry)));
    } catch (e) {}

    // 2. Filter out of local products list immediately
    const updatedProducts = products.filter(p => {
      const pId = String(p.id || '').toLowerCase().trim();
      const pDishId = String(p.dishId || '').toLowerCase().trim();
      const pSku = String(p.sku || '').toLowerCase().trim();
      const pName = String(p.name || '').toLowerCase().trim();

      const matchTarget = 
        p.id === productId ||
        p.dishId === productId ||
        p.sku === productId ||
        (targetId && pId === String(targetId).toLowerCase().trim()) ||
        (targetDishId && pDishId === String(targetDishId).toLowerCase().trim()) ||
        (targetSku && pSku === String(targetSku).toLowerCase().trim()) ||
        (targetName && pName === targetName);

      return !matchTarget;
    });

    setProducts(updatedProducts);
    try {
      localStorage.setItem("barozza_admin_products", JSON.stringify(updatedProducts));
    } catch (e) {}

    // 3. Immediately broadcast deletion event to customer storefront
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc1 = new BroadcastChannel("barozza_cafe_dishes");
        bc1.postMessage({ type: 'DISHES_UPDATED', dishes: updatedProducts, deletedDishId: productId });
        setTimeout(() => { try { bc1.close(); } catch (e) {} }, 2000);

        const bc2 = new BroadcastChannel("barozza_menu_sync");
        bc2.postMessage({ type: 'DISHES_UPDATED', dishes: updatedProducts, deletedDishId: productId });
        setTimeout(() => { try { bc2.close(); } catch (e) {} }, 2000);
      }
      window.dispatchEvent(new CustomEvent('barozza_dish_deleted', { detail: { productId, targetProduct } }));
      window.postMessage({ type: 'BAROZZA_DISH_DELETED', productId, targetProduct }, '*');
    } catch (e) {}

    // 4. Permanently delete from Firestore catalog and dishes collection
    try {
      if (targetProduct) {
        await deleteDishFromFirestoreCatalog(targetProduct);
      } else {
        await deleteDishFromFirestoreCatalog({ id: productId, name: productId } as any);
      }
    } catch (e) {
      console.warn("Firestore permanent dish delete error:", e);
    }

    await syncDishesToFirestoreAndStore(updatedProducts);

    showToast("Dish Permanently Deleted", `"${targetProduct?.name || 'Dish'}" has been permanently removed from the database and customer storefront.`, "success");

    setSyncLogs(prev => [
      {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'stock.push',
        source: 'Admin Catalog Management',
        status: 'success',
        statusCode: 200,
        details: `Permanently deleted dish [${targetProduct?.name || productId}] from database & synced with storefront`,
        payload: { deletedProductId: productId, sku: targetProduct?.sku }
      },
      ...prev
    ]);
  };

  // Quick dish rename from inventory table (Live instant sync)
  const handleQuickRename = async (productId: string, newName: string) => {
    if (!newName || !newName.trim()) return;
    const trimmed = newName.trim();
    let renamedProduct: Product | undefined;

    const updatedProducts = products.map(p => {
      if (p.id === productId || p.dishId === productId || p.sku === productId) {
        renamedProduct = {
          ...p,
          name: trimmed,
          syncedWithExternalStore: true,
          lastSyncedAt: new Date().toISOString()
        };
        return renamedProduct;
      }
      return p;
    });

    setProducts(updatedProducts);
    try {
      localStorage.setItem("barozza_admin_products", JSON.stringify(updatedProducts));
      window.dispatchEvent(new CustomEvent('barozza_stock_updated', { detail: { products: updatedProducts } }));
    } catch (e) {}

    await syncDishesToFirestoreAndStore(updatedProducts);

    showToast(
      "Dish Renamed (Live Sync)",
      `Dish renamed to "${trimmed}" — Live changes synced to brozza.vercel.app & customer dashboard!`,
      'success'
    );

    setSyncLogs(prev => [
      {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'stock.push',
        source: 'Live Customer Storefront Sync',
        status: 'success',
        statusCode: 200,
        details: `Renamed dish to "${trimmed}" — Synced live to ${apiConfig.partnerStoreUrl}`,
        payload: { productId, name: trimmed, liveSync: true }
      },
      ...prev
    ]);
  };

  // Batch sync all dishes and stock to partner API & customer site
  const handleSyncAllStock = async () => {
    setIsSyncingStock(true);
    await syncDishesToFirestoreAndStore(products);
    await new Promise(r => setTimeout(r, 600));
    setIsSyncingStock(false);

    setProducts(prev => prev.map(p => ({
      ...p,
      syncedWithExternalStore: true,
      lastSyncedAt: new Date().toISOString()
    })));

    setSyncLogs(prev => [
      {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'stock.push',
        source: 'Full Catalog & Price Sync',
        status: 'success',
        statusCode: 200,
        details: `Successfully pushed entire dishes catalog (${products.length} items) & updated prices to ${apiConfig.partnerStoreUrl}`,
        payload: { syncedCount: products.length, timestamp: new Date().toISOString() }
      },
      ...prev
    ]);

    showToast("Dishes Synchronized", `Successfully synced ${products.length} dishes & prices with ${apiConfig.partnerStoreUrl}`, 'success');
  };

  // Quick price update from inventory table (Live instant sync)
  const handleQuickUpdatePrice = async (productId: string, newPrice: number) => {
    let updatedProd: Product | undefined;
    const updatedProducts = products.map(p => {
      if (p.id === productId || p.dishId === productId || p.sku === productId) {
        updatedProd = { ...p, price: newPrice, lastSyncedAt: new Date().toISOString() };
        return updatedProd;
      }
      return p;
    });
    setProducts(updatedProducts);
    try {
      localStorage.setItem("barozza_admin_products", JSON.stringify(updatedProducts));
      window.dispatchEvent(new CustomEvent('barozza_stock_updated', { detail: { products: updatedProducts } }));
    } catch (e) {}
    await syncDishesToFirestoreAndStore(updatedProducts);
    showToast("Dish Price Updated", `Updated ${updatedProd?.name || 'Dish'} price to ₹${newPrice} — synced with customer storefront!`, 'success');
  };

  // Support ticket actions
  const handleSendMessage = (ticketId: string, text: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          status: 'waiting_customer',
          updatedAt: new Date().toISOString(),
          messages: [
            ...t.messages,
            {
              id: `msg_${Date.now()}`,
              sender: 'agent',
              senderName: 'Admin Agent (You)',
              message: text,
              timestamp: new Date().toISOString()
            }
          ]
        };
      }
      return t;
    }));
  };

  const handleUpdateTicketStatus = (ticketId: string, status: TicketStatus) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status, updatedAt: new Date().toISOString() } : t));
    showToast("Ticket Status Updated", `Ticket marked as ${status}`);
  };

  const handleUpdateTicketPriority = (ticketId: string, priority: TicketPriority) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, priority, updatedAt: new Date().toISOString() } : t));
  };

  const handleCreateTicket = (newTicket: Partial<SupportTicket>) => {
    const tkt: SupportTicket = {
      id: `tkt_${Date.now()}`,
      ticketNumber: `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: newTicket.customerName || 'Customer',
      customerEmail: newTicket.customerEmail || 'customer@store.com',
      orderId: newTicket.orderId,
      subject: newTicket.subject || 'Customer Inquiry',
      category: newTicket.category || 'general',
      priority: newTicket.priority || 'medium',
      status: 'open',
      assignedTo: 'Admin Support',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: newTicket.messages || []
    };
    setTickets(prev => [tkt, ...prev]);
    setActiveTab('support');
    showToast("Ticket Raised", `Support ticket ${tkt.ticketNumber} created.`);
  };

  const handleCreateTicketFromOrder = (order: Order) => {
    handleCreateTicket({
      customerName: order.customer.name,
      customerEmail: order.customer.email,
      orderId: order.orderNumber,
      subject: `Support inquiry regarding order #${order.orderNumber}`,
      category: 'order_status',
      priority: 'high',
      messages: [
        {
          id: `msg_${Date.now()}`,
          sender: 'customer',
          senderName: order.customer.name,
          message: `Inquiry opened for order ${order.orderNumber}. Shipping status is currently "${order.status}".`,
          timestamp: new Date().toISOString()
        }
      ]
    });
  };

  const handleViewOrderDetailsFromTicket = (orderNumber: string) => {
    const match = orders.find(o => o.orderNumber.toLowerCase() === orderNumber.toLowerCase());
    if (match) {
      setSelectedOrder(match);
    } else {
      showToast("Order Lookup", `Order ${orderNumber} not found in active records`, 'info');
    }
  };

  // Inbound simulation from API Sync tab
  const handleSimulateInboundOrder = async (sampleOrder: Partial<Order>) => {
    const fullOrder: Order = {
      id: `ord_cust_${Date.now()}`,
      orderNumber: sampleOrder.orderNumber || `ORD-SYNC-${Math.floor(1000 + Math.random() * 9000)}`,
      customer: sampleOrder.customer || {
        name: 'Pooja Nair',
        email: 'pooja.nair@customer.com',
        phone: '+91 98765 11223',
        address: 'Flat 502, Orchid Heights, Indiranagar, Bangalore',
        city: 'Bangalore',
        pincode: '560038'
      },
      items: sampleOrder.items || [
        {
          id: 'item_1',
          name: 'Domino’s Farmhouse Cheese Burst Pizza',
          sku: 'DOM-PIZZA-CH',
          price: 459.00,
          quantity: 1
        }
      ],
      subtotal: sampleOrder.subtotal || 459.00,
      shippingFee: sampleOrder.shippingFee || 0,
      tax: sampleOrder.tax || 22.95,
      totalAmount: sampleOrder.totalAmount || 481.95,
      status: 'pending',
      paymentStatus: sampleOrder.paymentStatus || 'pending',
      paymentMethod: sampleOrder.paymentMethod || 'cash_on_delivery',
      parcelType: sampleOrder.parcelType || 'hot_food',
      createdAt: new Date().toISOString(),
      source: 'customer_website',
      deliveryOtp: `${Math.floor(1000 + Math.random() * 9000)}`,
      notes: sampleOrder.notes || 'Inbound order from customer storefront'
    };

    handleOrderCreated(fullOrder);
    try {
      await pushOrderToFirestore(fullOrder, collectionName);
    } catch (err) {
      console.warn("Could not push simulated order to Firestore directly:", err);
    }
    showToast("Customer Order Received", `Inbound order ${fullOrder.orderNumber} ingested from customer site`, 'success');
  };

  // Outbound stock simulation
  const handleSimulateOutboundStockPush = async (sku: string, newStock: number) => {
    await new Promise(r => setTimeout(r, 600));

    // Update local product stock
    setProducts(prev => prev.map(p => {
      if (p.sku === sku) {
        return {
          ...p,
          stock: newStock,
          status: newStock === 0 ? 'out_of_stock' : newStock <= p.lowStockThreshold ? 'low_stock' : 'in_stock',
          lastSyncedAt: new Date().toISOString()
        };
      }
      return p;
    }));

    setSyncLogs(prev => [
      {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'stock.push',
        source: 'Outbound Store Sync API',
        status: 'success',
        statusCode: 200,
        details: `Dispatched HTTP POST to ${apiConfig.partnerStoreUrl} for SKU: ${sku} (Stock: ${newStock})`,
        payload: { sku, stock: newStock, secretUsed: apiConfig.webhookSecret.slice(0, 10) + '...' }
      },
      ...prev
    ]);

    showToast("Stock Dispatched", `Synced SKU ${sku} (${newStock} units) to partner storefront`, 'success');
  };

  // Manual trigger sync
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    await new Promise(r => setTimeout(r, 700));
    setIsSyncing(false);
    showToast("Synced with Firebase", "Live customer order stream verified with brozza-1f6be", 'info');
  };

  // Permanently purge any unwanted dummy/junk parcels from dashboard and Firebase
  const handlePurgeDummyOrders = useCallback(async () => {
    const junkOrders = orders.filter(ord => {
      const idLower = (ord.id || '').toLowerCase();
      const orderNumLower = (ord.orderNumber || '').toLowerCase();
      const nameLower = (ord.customer?.name || '').toLowerCase();
      const notesLower = (ord.notes || '').toLowerCase();
      return (
        ord.id === 'ord-cod-01' || 
        ord.id === 'ord-upi-02' || 
        ord.orderNumber === 'ORD-9821' || 
        ord.orderNumber === 'ORD-9822' ||
        idLower.includes('dummy') || idLower.includes('test') ||
        orderNumLower.includes('dummy') || orderNumLower.includes('test') ||
        nameLower.includes('dummy') || nameLower === 'test' || nameLower === 'test customer' ||
        notesLower.includes('diagnostic console') ||
        !ord.items || ord.items.length === 0 ||
        !ord.totalAmount || ord.totalAmount <= 0
      );
    });

    for (const junk of junkOrders) {
      deleteOrderDocument(junk.id, 'orders', 'orders').catch(() => {});
    }

    setOrders(prev => prev.filter(ord => {
      const idLower = (ord.id || '').toLowerCase();
      const orderNumLower = (ord.orderNumber || '').toLowerCase();
      const nameLower = (ord.customer?.name || '').toLowerCase();
      const notesLower = (ord.notes || '').toLowerCase();
      return !(
        ord.id === 'ord-cod-01' || 
        ord.id === 'ord-upi-02' || 
        ord.orderNumber === 'ORD-9821' || 
        ord.orderNumber === 'ORD-9822' ||
        idLower.includes('dummy') || idLower.includes('test') ||
        orderNumLower.includes('dummy') || orderNumLower.includes('test') ||
        nameLower.includes('dummy') || nameLower === 'test' || nameLower === 'test customer' ||
        notesLower.includes('diagnostic console') ||
        !ord.items || ord.items.length === 0 ||
        !ord.totalAmount || ord.totalAmount <= 0
      );
    }));

    showToast("Unwanted Junks Removed", "All dummy parcels and unwanted test entries have been cleaned.", "success");
  }, [orders, showToast]);

  const openTicketsCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const lowStockCount = products.filter(p => p.status === 'low_stock' || p.stock <= p.lowStockThreshold).length;

  // Render Single-User Authentication Gateway if no active owner session
  if (!currentUser) {
    return (
      <div className="animate-in fade-in duration-300">
        <AuthGateway onAuthenticated={handleAuthenticated} isDarkMode={isDarkMode} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#0a0f1d] text-slate-100' : 'bg-white text-slate-900'} flex font-sans selection:bg-indigo-500 selection:text-white animate-in fade-in duration-300`}>
      {/* Minimized / Adjustable Vertical Sidebar (dockable Left or Right, manually resizable by admin) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMinimized={isMinimized}
        setIsMinimized={setIsMinimized}
        isDarkMode={isDarkMode}
        sidebarPosition={sidebarPosition}
        setSidebarPosition={setSidebarPosition}
        customWidth={sidebarWidth}
        setCustomWidth={setSidebarWidth}
      />

      {/* Main Content Area on the right (~90% width) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Global Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          ordersCount={orders.length}
          openTicketsCount={openTicketsCount}
          lowStockCount={lowStockCount}
          firebaseStatus={firebaseStatus}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
          onOpenNewOrderModal={() => setIsNewOrderModalOpen(true)}
          cafeStatus={cafeStatus}
          onOpenCafeStatusModal={() => setIsCafeStatusModalOpen(true)}
          onReopenCafeEarly={handleReopenCafeEarly}
          authenticatedOwner={currentUser}
          onLogOut={handleLogOut}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-6">
          {activeTab === 'orders' && (
            <OrdersView
              orders={orders}
              isDarkMode={isDarkMode}
              onSelectOrder={(ord) => setSelectedOrder(ord)}
              onUpdateStatus={handleUpdateOrderStatus}
              onCreateSupportTicket={handleCreateTicketFromOrder}
              onOpenCreateOrder={() => setIsNewOrderModalOpen(true)}
              cafeStatus={cafeStatus}
              onOpenCafeStatusModal={() => setIsCafeStatusModalOpen(true)}
              onReopenCafeEarly={handleReopenCafeEarly}
              onSwitchToCustomerView={() => setActiveTab('customer')}
              onPurgeDummyOrders={handlePurgeDummyOrders}
              onSwitchToAnalytics={() => setActiveTab('analytics')}
            />
          )}

        {activeTab === 'customer' && (
          <CustomerDashboardView
            products={products}
            cafeStatus={cafeStatus}
            isDarkMode={isDarkMode}
            onPlaceOrder={handlePlaceCustomerOrder}
            onOpenAdminCafeModal={() => setIsCafeStatusModalOpen(true)}
            onReopenCafeEarly={handleReopenCafeEarly}
            onUpdateCafeStatus={handleUpdateCafeStatus}
            onUpdateStock={handleUpdateStock}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            orders={orders}
            products={products}
            syncLogs={syncLogs}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            products={products}
            orders={orders}
            onUpdateStock={handleUpdateStock}
            onSetAllStock={handleSetAllDishesStock}
            onDeleteProduct={handleDeleteProduct}
            onOpenEditModal={(prod) => {
              setEditingProduct(prod);
              setIsEditProductModalOpen(true);
            }}
            onSyncAllStock={handleSyncAllStock}
            isSyncingStock={isSyncingStock}
            partnerStoreUrl={apiConfig.partnerStoreUrl}
            onQuickUpdatePrice={handleQuickUpdatePrice}
            onQuickRename={handleQuickRename}
            cafeStatus={cafeStatus}
            onOpenCafeStatusModal={() => setIsCafeStatusModalOpen(true)}
            onReopenCafeEarly={handleReopenCafeEarly}
            onSwitchToCustomerTab={() => setActiveTab('customer')}
          />
        )}

        {activeTab === 'support' && (
          <SupportView
            tickets={tickets}
            onSendMessage={handleSendMessage}
            onUpdateTicketStatus={handleUpdateTicketStatus}
            onUpdateTicketPriority={handleUpdateTicketPriority}
            onCreateTicket={handleCreateTicket}
            onViewOrderDetails={handleViewOrderDetailsFromTicket}
          />
        )}

        {activeTab === 'api-sync' && (
          <ApiSyncView
            apiConfig={apiConfig}
            setApiConfig={setApiConfig}
            syncLogs={syncLogs}
            onSimulateInboundOrder={handleSimulateInboundOrder}
            onSimulateOutboundStockPush={handleSimulateOutboundStockPush}
            products={products}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Visible only on phone/mobile screens < md) */}
      <nav 
        aria-label="Mobile Navigation"
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl px-2 py-2 flex items-center justify-around transition-colors shadow-2xl safe-area-inset-bottom ${
          isDarkMode 
            ? 'bg-[#0a0f1d]/95 border-slate-800 text-slate-400 shadow-black/80' 
            : 'bg-white/95 border-slate-200 text-slate-500 shadow-slate-300/60'
        }`}
      >
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all cursor-pointer relative min-h-[44px] ${
            activeTab === 'orders' 
              ? (isDarkMode ? 'text-indigo-400 font-bold' : 'text-indigo-600 font-bold') 
              : 'hover:text-slate-200'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <Home className="w-5 h-5" />
            {orders.length > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center font-mono shadow-xs">
                {orders.length}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-medium tracking-tight">Parcels</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all cursor-pointer relative min-h-[44px] ${
            activeTab === 'inventory' 
              ? (isDarkMode ? 'text-indigo-400 font-bold' : 'text-indigo-600 font-bold') 
              : 'hover:text-slate-200'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <Utensils className="w-5 h-5" />
            {lowStockCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-black text-[9px] font-bold flex items-center justify-center font-mono shadow-xs">
                {lowStockCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-medium tracking-tight">Menu & Stock</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all cursor-pointer relative min-h-[44px] ${
            activeTab === 'analytics' 
              ? (isDarkMode ? 'text-indigo-400 font-bold' : 'text-indigo-600 font-bold') 
              : 'hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium tracking-tight">Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('customer')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all cursor-pointer relative min-h-[44px] ${
            activeTab === 'customer' 
              ? (isDarkMode ? 'text-indigo-400 font-bold' : 'text-indigo-600 font-bold') 
              : 'hover:text-slate-200'
          }`}
        >
          <Store className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium tracking-tight">Storefront</span>
        </button>
      </nav>

      {/* Modals */}
      {/* 1. Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={handleUpdateOrderStatus}
          onCreateSupportTicket={handleCreateTicketFromOrder}
        />
      )}

      {/* 2. Dispatch / Create Order Modal */}
      {isNewOrderModalOpen && (
        <CreateOrderModal
          isOpen={isNewOrderModalOpen}
          onClose={() => setIsNewOrderModalOpen(false)}
          products={products}
          collectionName={collectionName}
          rtdbPath={rtdbPath}
          onOrderCreated={handleOrderCreated}
        />
      )}

      {/* 3. Firebase Diagnostic Modal */}
      {isFirebaseModalOpen && (
        <FirebaseDiagnosticModal
          isOpen={isFirebaseModalOpen}
          onClose={() => setIsFirebaseModalOpen(false)}
          status={firebaseStatus}
          collectionName={collectionName}
          setCollectionName={setCollectionName}
          rtdbPath={rtdbPath}
          setRtdbPath={setRtdbPath}
          activeOrders={orders}
          onOrderAdded={handleOrderCreated}
        />
      )}

      {/* 4. Edit / Add Product Modal */}
      {isEditProductModalOpen && (
        <EditProductModal
          product={editingProduct}
          isOpen={isEditProductModalOpen}
          availableCategories={Array.from(new Set(products.map(p => p.category)))}
          onClose={() => {
            setIsEditProductModalOpen(false);
            setEditingProduct(null);
          }}
          onSave={handleSaveProduct}
          onDelete={handleDeleteProduct}
        />
      )}

      {/* 5. Cafe Status / Ordering Controls Modal */}
      {isCafeStatusModalOpen && (
        <CafeStatusModal
          isOpen={isCafeStatusModalOpen}
          onClose={() => setIsCafeStatusModalOpen(false)}
          cafeStatus={cafeStatus}
          onUpdateCafeStatus={handleUpdateCafeStatus}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-start gap-3 p-4 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl max-w-sm animate-in slide-in-from-bottom-5 duration-200">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : toast.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs">
            <p className="font-bold text-white">{toast.title}</p>
            <p className="text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
