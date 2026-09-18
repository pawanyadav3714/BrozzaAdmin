export type OrderStatus = 'pending' | 'received' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentStatus = 'clear' | 'paid' | 'pending' | 'failed' | 'refunded';
export type PaymentMethodType = 'cash_on_delivery' | 'upi' | 'card' | 'net_banking' | 'wallet';
export type ParcelType = 'quick_grocery' | 'hot_food' | 'electronics' | 'standard_parcel' | 'express_courier' | 'fragile';
export type OrderSource = 'customer_website' | 'worker_admin' | 'synced_partner_store' | 'firebase_stream';

export interface OrderItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface CustomerInfo {
  name: string;
  email?: string;
  phone: string;
  address: string;
  flatNo?: string;
  landmark?: string;
  city?: string;
  pincode?: string;
  deliveryInstructions?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: CustomerInfo;
  items: OrderItem[];
  totalAmount: number;
  subtotal: number;
  shippingFee: number;
  tax: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethodType | string;
  parcelType: ParcelType;
  createdAt: string;
  source: OrderSource;
  trackingNumber?: string;
  notes?: string;
  deliveryOtp?: string;
  estimatedDeliveryMinutes?: number;
  assignedWorker?: string;
  parcelReceivedAt?: string;
  deliveredAt?: string;
  cashCollected?: boolean;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  syncedWithExternalStore: boolean;
  lastSyncedAt?: string;
  imageUrl?: string;
  description?: string;
  dishId?: string;
  available?: boolean;
}

export type TicketPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved';

export interface TicketMessage {
  id: string;
  sender: 'customer' | 'agent' | 'system';
  senderName: string;
  message: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerName: string;
  customerEmail: string;
  orderId?: string;
  subject: string;
  category: 'order_status' | 'damaged_item' | 'return_refund' | 'address_change' | 'general';
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

export interface SyncLog {
  id: string;
  timestamp: string;
  type: 'order.inbound' | 'parcel.received' | 'status.update' | 'payment.cleared' | 'stock.push';
  source: string;
  status: 'success' | 'failed' | 'processing';
  statusCode: number;
  details: string;
  payload?: any;
}

export interface ApiSyncConfig {
  apiKey: string;
  webhookSecret: string;
  partnerStoreUrl: string;
  autoSyncStock: boolean;
  lastHandshake: string | null;
  endpointOrders: string;
  endpointStock: string;
  firestoreDatabaseId: string;
  projectId: string;
}
