import { Order, Product, SupportTicket, SyncLog, ApiSyncConfig } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    sku: 'BLK-MILK-01',
    name: 'Farm Fresh Organic Full Cream Milk (1L)',
    category: 'Daily Dairy & Essentials',
    price: 68.00,
    costPrice: 48.00,
    stock: 45,
    lowStockThreshold: 10,
    status: 'in_stock',
    syncedWithExternalStore: true,
    lastSyncedAt: new Date().toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&q=80'
  },
  {
    id: 'prod-2',
    sku: 'DOM-PIZZA-CH',
    name: 'Domino’s Farmhouse Cheese Burst Pizza (Medium)',
    category: 'Hot Food & Kitchen',
    price: 459.00,
    costPrice: 210.00,
    stock: 28,
    lowStockThreshold: 5,
    status: 'in_stock',
    syncedWithExternalStore: true,
    lastSyncedAt: new Date().toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&q=80'
  },
  {
    id: 'prod-3',
    sku: 'BLK-BREAD-02',
    name: 'Artisan Multigrain Sourdough Bread (400g)',
    category: 'Bakery & Breakfast',
    price: 85.00,
    costPrice: 45.00,
    stock: 18,
    lowStockThreshold: 6,
    status: 'in_stock',
    syncedWithExternalStore: true,
    lastSyncedAt: new Date().toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&q=80'
  },
  {
    id: 'prod-4',
    sku: 'TECH-CHG-65W',
    name: '65W GaN Fast Charger & Type-C Braided Cable',
    category: 'Electronics & Accessories',
    price: 1299.00,
    costPrice: 650.00,
    stock: 12,
    lowStockThreshold: 4,
    status: 'in_stock',
    syncedWithExternalStore: true,
    lastSyncedAt: new Date().toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=300&q=80'
  }
];

// No dummy orders - cleanly starts with real orders synchronized from Firebase
export const INITIAL_ORDERS: Order[] = [];

export const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 'tkt-101',
    ticketNumber: 'TCK-501',
    customerName: 'Aarav Sharma',
    customerEmail: 'aarav.sharma@gmail.com',
    orderId: 'ORD-LIVE-01',
    subject: 'Request gate entry delivery instructions',
    category: 'address_change',
    priority: 'high',
    status: 'in_progress',
    assignedTo: 'Store Manager',
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    messages: [
      {
        id: 'msg-1',
        sender: 'customer',
        senderName: 'Aarav Sharma',
        message: 'Please tell the delivery partner to dial flat 302 at the security gate intercom.',
        timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString()
      },
      {
        id: 'msg-2',
        sender: 'agent',
        senderName: 'Worker Dispatch',
        message: 'Noted! We have updated the rider parcel delivery instructions.',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString()
      }
    ]
  }
];

export const INITIAL_SYNC_LOGS: SyncLog[] = [
  {
    id: 'log-1',
    timestamp: new Date().toISOString(),
    type: 'order.inbound',
    source: 'Firebase (commanding-palisade-58gvj)',
    status: 'success',
    statusCode: 200,
    details: 'Connected to Firestore database: ai-studio-remixthebarozzac-0a0443a4-c36c-4a75-b9f6-4c49d5a7fd1d'
  }
];

export const INITIAL_API_CONFIG: ApiSyncConfig = {
  apiKey: 'sk_live_omni_7f9b82c4109e4a3b8d',
  webhookSecret: 'whsec_98fbc102a394ec5620ab',
  partnerStoreUrl: 'https://customer-website.example.com',
  autoSyncStock: true,
  lastHandshake: new Date().toISOString(),
  endpointOrders: 'https://ais-dev-rkajnv7cjdlc456zix2sff-711623448022.asia-southeast1.run.app/api/v1/orders',
  endpointStock: 'https://ais-dev-rkajnv7cjdlc456zix2sff-711623448022.asia-southeast1.run.app/api/v1/stock/update',
  firestoreDatabaseId: 'ai-studio-remixthebarozzac-0a0443a4-c36c-4a75-b9f6-4c49d5a7fd1d',
  projectId: 'commanding-palisade-58gvj'
};
