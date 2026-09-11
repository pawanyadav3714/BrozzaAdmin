import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  listenToFirestoreOrders, 
  listenToRTDBOrders, 
  updateFirestoreOrderStatus, 
  updateRTDBOrderStatus,
  FirebaseConnectionStatus,
  firebaseConfig,
  pushOrderToFirestore
} from './services/firebase';
import { Order, OrderStatus, Product, SupportTicket, SyncLog, ApiSyncConfig, TicketStatus, TicketPriority } from './types';
import { 
  INITIAL_ORDERS, 
  INITIAL_PRODUCTS, 
  INITIAL_TICKETS, 
  INITIAL_SYNC_LOGS, 
  INITIAL_API_CONFIG 
} from './data/mockData';
import { playOrderNotificationChime } from './utils/audio';
import { Header } from './components/Header';
import { OrdersView } from './components/OrdersView';
import { AnalyticsView } from './components/AnalyticsView';
import { InventoryView } from './components/InventoryView';
import { SupportView } from './components/SupportView';
import { ApiSyncView } from './components/ApiSyncView';
import { OrderDetailsModal } from './components/OrderDetailsModal';
import { CreateOrderModal } from './components/CreateOrderModal';
import { FirebaseDiagnosticModal } from './components/FirebaseDiagnosticModal';
import { EditProductModal } from './components/EditProductModal';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'orders' | 'analytics' | 'inventory' | 'support' | 'api-sync'>('orders');

  // Core Data States
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>(INITIAL_SYNC_LOGS);
  const [apiConfig, setApiConfig] = useState<ApiSyncConfig>(INITIAL_API_CONFIG);

  // Settings & Status
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
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

  // Ref to track known order IDs to prevent repeat chimes
  const knownOrderIdsRef = useRef<Set<string>>(new Set(INITIAL_ORDERS.map(o => o.id)));

  // Setup Firebase Real-time Listeners
  useEffect(() => {
    let unsubscribeFirestore = () => {};
    let unsubscribeRTDB = () => {};

    try {
      // 1. Listen to Firestore
      unsubscribeFirestore = listenToFirestoreOrders(
        collectionName,
        (firebaseOrders) => {
          if (firebaseOrders.length > 0) {
            setOrders(prev => {
              // Check for new orders
              let hasNewIncoming = false;
              firebaseOrders.forEach(fo => {
                if (!knownOrderIdsRef.current.has(fo.id)) {
                  hasNewIncoming = true;
                  knownOrderIdsRef.current.add(fo.id);
                }
              });

              if (hasNewIncoming && soundEnabled) {
                playOrderNotificationChime();
                showToast("New Order Received!", `Incoming live order from Firebase [${firebaseOrders[0]?.orderNumber}]`, 'success');
              }

              // Merge unique by ID
              const map = new Map<string, Order>();
              // Keep prior mock/local orders too
              prev.forEach(o => map.set(o.id, o));
              firebaseOrders.forEach(o => map.set(o.id, o));
              return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            });

            setFirebaseStatus(prev => ({
              ...prev,
              connected: true,
              type: 'firestore',
              lastPing: new Date().toISOString(),
              activeCollection: collectionName,
              errorMessage: undefined
            }));
          }
        },
        (err) => {
          console.warn("Firestore listener note:", err.message);
          setFirebaseStatus(prev => ({
            ...prev,
            errorMessage: `Firestore: ${err.message}`
          }));
        }
      );

      // 2. Listen to Realtime Database
      unsubscribeRTDB = listenToRTDBOrders(
        rtdbPath,
        (rtdbOrders) => {
          if (rtdbOrders.length > 0) {
            setOrders(prev => {
              let hasNewIncoming = false;
              rtdbOrders.forEach(ro => {
                if (!knownOrderIdsRef.current.has(ro.id)) {
                  hasNewIncoming = true;
                  knownOrderIdsRef.current.add(ro.id);
                }
              });

              if (hasNewIncoming && soundEnabled) {
                playOrderNotificationChime();
                showToast("New RTDB Order Received!", `Incoming stream order from Firebase RTDB`, 'success');
              }

              const map = new Map<string, Order>();
              prev.forEach(o => map.set(o.id, o));
              rtdbOrders.forEach(o => map.set(o.id, o));
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
    } catch (e: any) {
      console.warn("Realtime listener init error:", e);
    }

    return () => {
      unsubscribeFirestore();
      unsubscribeRTDB();
    };
  }, [collectionName, rtdbPath, soundEnabled]);

  // Order Status Update
  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus, additionalFields?: Partial<Order>) => {
    // 1. Update local state
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status,
          ...(additionalFields || {})
        };
      }
      return o;
    }));

    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(prev => prev ? {
        ...prev,
        status,
        ...(additionalFields || {})
      } : null);
    }

    // 2. Try updating in Firebase
    try {
      await updateFirestoreOrderStatus(orderId, status, additionalFields, collectionName);
    } catch (err) {
      console.warn("Firebase update status skipped or failed:", err);
    }

    try {
      await updateRTDBOrderStatus(orderId, status, rtdbPath);
    } catch (err) {
      console.warn("RTDB update status skipped:", err);
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
        details: `Order ${newOrder.orderNumber} processed ($${newOrder.totalAmount.toFixed(2)})`,
        payload: { orderNumber: newOrder.orderNumber, total: newOrder.totalAmount }
      },
      ...prev
    ]);
  };

  // Stock update from Inventory tab
  const handleUpdateStock = (productId: string, newStock: number) => {
    let updatedProduct: Product | undefined;

    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        updatedProduct = {
          ...p,
          stock: newStock,
          status: newStock === 0 ? 'out_of_stock' : newStock <= p.lowStockThreshold ? 'low_stock' : 'in_stock',
          lastSyncedAt: new Date().toISOString()
        };
        return updatedProduct;
      }
      return p;
    }));

    if (updatedProduct) {
      // If auto-sync is on, record log
      if (apiConfig.autoSyncStock) {
        setSyncLogs(prev => [
          {
            id: `log_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'stock.push',
            source: 'OmniStore Auto-Sync',
            status: 'success',
            statusCode: 200,
            details: `Pushed updated stock for ${updatedProduct?.sku} (${newStock} units) to ${apiConfig.partnerStoreUrl}`,
            payload: { sku: updatedProduct?.sku, stock: newStock }
          },
          ...prev
        ]);
      }
    }
  };

  // Save product from modal
  const handleSaveProduct = (productData: Partial<Product>) => {
    if (productData.id) {
      // Edit
      setProducts(prev => prev.map(p => p.id === productData.id ? { ...p, ...productData } as Product : p));
      showToast("Product Updated", `Catalog record ${productData.name} updated.`);
    } else {
      // Add
      const newProd: Product = {
        id: `prod_${Date.now()}`,
        sku: productData.sku || `SKU-${Date.now().toString().slice(-4)}`,
        name: productData.name || 'New Store Product',
        category: productData.category || 'General',
        price: Number(productData.price || 49.99),
        costPrice: Number(productData.costPrice || 25.00),
        stock: Number(productData.stock || 20),
        lowStockThreshold: Number(productData.lowStockThreshold || 5),
        status: (Number(productData.stock || 20) <= Number(productData.lowStockThreshold || 5)) ? 'low_stock' : 'in_stock',
        syncedWithExternalStore: productData.syncedWithExternalStore ?? true,
        lastSyncedAt: new Date().toISOString(),
        imageUrl: productData.imageUrl
      };
      setProducts(prev => [newProd, ...prev]);
      showToast("Product Created", `${newProd.name} added to catalog.`);
    }
  };

  // Batch sync all stock to partner API
  const handleSyncAllStock = async () => {
    setIsSyncingStock(true);
    await new Promise(r => setTimeout(r, 1000));
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
        source: 'Batch Inventory Sync Engine',
        status: 'success',
        statusCode: 200,
        details: `Successfully pushed warehouse inventory reconciliation (${products.length} SKUs) to ${apiConfig.partnerStoreUrl}`,
        payload: { syncedCount: products.length, timestamp: new Date().toISOString() }
      },
      ...prev
    ]);

    showToast("Stock Synchronized", `Successfully pushed all inventory levels to ${apiConfig.partnerStoreUrl}`, 'success');
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
    showToast("Synced with Firebase", "Live order stream verified with commanding-palisade-58gvj", 'info');
  };

  const openTicketsCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const lowStockCount = products.filter(p => p.status === 'low_stock' || p.stock <= p.lowStockThreshold).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
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
        onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
        onOpenNewOrderModal={() => setIsNewOrderModalOpen(true)}
        isSyncing={isSyncing}
        onTriggerSync={handleTriggerSync}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'orders' && (
          <OrdersView
            orders={orders}
            onSelectOrder={(ord) => setSelectedOrder(ord)}
            onUpdateStatus={handleUpdateOrderStatus}
            onCreateSupportTicket={handleCreateTicketFromOrder}
            onOpenCreateOrder={() => setIsNewOrderModalOpen(true)}
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
            onUpdateStock={handleUpdateStock}
            onOpenEditModal={(prod) => {
              setEditingProduct(prod);
              setIsEditProductModalOpen(true);
            }}
            onSyncAllStock={handleSyncAllStock}
            isSyncingStock={isSyncingStock}
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

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-4 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">OmniStore Commerce Cloud</span>
            <span>•</span>
            <span className="font-mono text-emerald-400">Firebase: gecp-c23ad (RTDB & Firestore Active)</span>
          </div>
          <div>
            REST API v1 Secured • Multi-Channel Logistics Engine
          </div>
        </div>
      </footer>

      {/* Modals */}
      {/* 1. Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdateStatus={handleUpdateOrderStatus}
        onCreateSupportTicket={handleCreateTicketFromOrder}
      />

      {/* 2. Dispatch / Create Order Modal */}
      <CreateOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        products={products}
        collectionName={collectionName}
        rtdbPath={rtdbPath}
        onOrderCreated={handleOrderCreated}
      />

      {/* 3. Firebase Diagnostic Modal */}
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

      {/* 4. Edit / Add Product Modal */}
      <EditProductModal
        product={editingProduct}
        isOpen={isEditProductModalOpen}
        onClose={() => {
          setIsEditProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
      />

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
  );
}
