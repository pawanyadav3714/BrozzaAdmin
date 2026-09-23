import { Order, Product, SupportTicket, SyncLog, ApiSyncConfig } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-dosha',
    dishId: '19',
    sku: 'SWEET',
    name: 'dosha sambar',
    category: 'snakss',
    price: 90.00,
    costPrice: 100.00,
    stock: 25,
    lowStockThreshold: 10,
    status: 'in_stock',
    syncedWithExternalStore: true,
    lastSyncedAt: new Date().toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=300&q=80',
    description: 'Crispy South Indian dosa served hot with aromatic lentil sambar and chutneys.'
  },
  {
    id: 'prod-brz-1',
    dishId: '1',
    sku: 'BRZ-DISH-01',
    name: 'French Fries',
    category: 'Starters',
    price: 30.00,
    costPrice: 15.00,
    stock: 50,
    lowStockThreshold: 10,
    status: 'in_stock',
    syncedWithExternalStore: true,
    lastSyncedAt: new Date().toISOString(),
    imageUrl: 'https://brozza.vercel.app/images/frenchh.png',
    description: 'Crispy golden fries served hot and fresh.'
  },
  {
    id: 'prod-brz-2',
    dishId: '2',
    sku: 'BRZ-DISH-02',
    name: 'Veg Chow Mein',
    category: 'Chinese',
    price: 45.00,
    costPrice: 22.00,
    stock: 40,
    lowStockThreshold: 8,
    status: 'in_stock',
    syncedWithExternalStore: true,
    lastSyncedAt: new Date().toISOString(),
    imageUrl: 'https://brozza.vercel.app/images/chow.png',
    description: 'Stir-fried noodles with fresh vegetables and aromatic spices.'
  },
  {
    id: 'prod-brz-3',
    dishId: '3',
    sku: 'BRZ-DISH-03',
    name: 'Egg Chow Mein',
    category: 'Chinese',
    price: 55.00,
    costPrice: 28.00,
    stock: 35,
    lowStockThreshold: 8,
    status: 'in_stock',
    syncedWithExternalStore: true,
    lastSyncedAt: new Date().toISOString(),
    imageUrl: 'https://brozza.vercel.app/images/eggchowminn.png',
    description: 'Delicious stir-fried noodles with scrambled eggs and seasonal veggies.'
  },
  {
    id: 'prod-brz-4',
    dishId: '4',
    sku: 'BRZ-DISH-04',
    name: 'Creamy Pasta',
    category: 'Italian',
    price: 65.00,
    costPrice: 32.00,
    stock: 30,
    lowStockThreshold: 6,
    status: 'in_stock',
    syncedWithExternalStore: true,
    lastSyncedAt: new Date().toISOString(),
    imageUrl: 'https://brozza.vercel.app/images/pastaa.png',
    description: 'Italian pasta cooked in a rich, creamy sauce with exotic herbs.'
  },
  {
    id: 'prod-brz-5',
    dishId: '5',
    sku: 'BRZ-DISH-05',
    name: 'Paneer Chilli',
    category: 'Chinese',
    price: 80.00,
    costPrice: 42.00,
    stock: 25,
    lowStockThreshold: 5,
    status: 'in_stock',
    syncedWithExternalStore: true,
    lastSyncedAt: new Date().toISOString(),
    imageUrl: 'https://brozza.vercel.app/images/paneerchili.png',
    description: 'Spicy cottage cheese chunks tossed with bell peppers and onions.'
  },
  {
    id: 'prod-brz-6',
    dishId: '6',
    sku: 'BRZ-DISH-06',
    name: 'Steamed Veg Momos',
    category: 'Chinese',
    price: 40.00,
    costPrice: 18.00,
    stock: 45,
    lowStockThreshold: 10,
    status: 'in_stock',
    syncedWithExternalStore: true,
    lastSyncedAt: new Date().toISOString(),
    imageUrl: 'https://brozza.vercel.app/images/momos.png',
    description: 'Soft and succulent dumplings filled with garden-fresh vegetables.'
  },
  {
    id: 'prod-brz-7',
    dishId: '7',
    sku: 'BRZ-DISH-07',
    name: 'Fried Veg Momos',
    category: 'Chinese',
    price: 45.00,
    costPrice: 20.00,
    stock: 40,
    lowStockThreshold: 10,
    status: 'in_stock',
    syncedWithExternalStore: true,
    lastSyncedAt: new Date().toISOString(),
    imageUrl: 'https://brozza.vercel.app/images/fried.png',
    description: 'Crispy fried dumplings served with a hot and spicy red chutney.'
  },
  {
    id: 'prod-brz-8',
    dishId: '8',
    sku: 'BRZ-DISH-08',
    name: 'Baby Corn Chilli',
    category: 'Chinese',
    price: 70.00,
    costPrice: 35.00,
    stock: 20,
    lowStockThreshold: 5,
    status: 'in_stock',
    syncedWithExternalStore: true,
    lastSyncedAt: new Date().toISOString(),
    imageUrl: 'https://brozza.vercel.app/images/babycornchili.png',
    description: 'Tender baby corn tossed in a spicy and tangy Manchurian sauce.'
  },
  {
    id: 'prod-brz-9',
    dishId: '9',
    sku: 'BRZ-DISH-09',
    name: 'Mushroom Chilli',
    category: 'Chinese',
    price: 75.00,
    costPrice: 38.00,
    stock: 20,
    lowStockThreshold: 5,
    status: 'in_stock',
    syncedWithExternalStore: true,
    lastSyncedAt: new Date().toISOString(),
    imageUrl: 'https://brozza.vercel.app/images/masroomchili.png',
    description: 'Fresh mushrooms stir-fried with onions, capsicum, and oriental spices.'
  },
  {
    id: 'prod-brz-10',
    dishId: '10',
    sku: 'BRZ-DISH-10',
    name: 'Veg Manchurian',
    category: 'Chinese',
    price: 65.00,
    costPrice: 30.00,
    stock: 30,
    lowStockThreshold: 6,
    status: 'in_stock',
    syncedWithExternalStore: true,
    lastSyncedAt: new Date().toISOString(),
    imageUrl: 'https://brozza.vercel.app/images/menchurian.png',
    description: 'Golden vegetable balls tossed in a flavorful soy-based ginger sauce.'
  },
  {
    id: 'prod-brz-11',
    dishId: '11',
    sku: 'BRZ-DISH-11',
    name: 'Veg Roll',
    category: 'Rolls',
    price: 35.00,
    costPrice: 16.00,
    stock: 35,
    lowStockThreshold: 8,
    status: 'in_stock',
    syncedWithExternalStore: true,
    lastSyncedAt: new Date().toISOString(),
    imageUrl: 'https://brozza.vercel.app/images/vegrol.png',
    description: 'Freshly sautéed vegetables wrapped in a soft, flaky paratha.'
  },
  {
    id: 'prod-brz-12',
    dishId: '12',
    sku: 'BRZ-DISH-12',
    name: 'Egg Roll',
    category: 'Rolls',
    price: 40.00,
    costPrice: 18.00,
    stock: 35,
    lowStockThreshold: 8,
    status: 'in_stock',
    syncedWithExternalStore: true,
    lastSyncedAt: new Date().toISOString(),
    imageUrl: 'https://brozza.vercel.app/images/eggrol.png',
    description: 'A classic street food favorite with fluffy egg and zesty red onions.'
  },
  {
    id: 'prod-brz-13',
    dishId: '13',
    sku: 'BRZ-DISH-13',
    name: 'Paneer Roll',
    category: 'Rolls',
    price: 50.00,
    costPrice: 24.00,
    stock: 35,
    lowStockThreshold: 8,
    status: 'in_stock',
    syncedWithExternalStore: true,
    lastSyncedAt: new Date().toISOString(),
    imageUrl: 'https://brozza.vercel.app/images/paneerchili.png',
    description: 'Juicy paneer chunks wrapped with crunchy veggies and sauces.'
  },
  {
    id: 'prod-brz-14',
    dishId: '14',
    sku: 'BRZ-DISH-14',
    name: 'Cold Coffee with Ice Cream',
    category: 'Beverages',
    price: 90.00,
    costPrice: 40.00,
    stock: 40,
    lowStockThreshold: 10,
    status: 'in_stock',
    syncedWithExternalStore: true,
    lastSyncedAt: new Date().toISOString(),
    imageUrl: 'https://brozza.vercel.app/images/coldcoffe.png',
    description: 'Blended chilled coffee topped with rich vanilla ice cream.'
  },
  {
    id: 'prod-brz-15',
    dishId: '15',
    sku: 'BRZ-DISH-15',
    name: 'Veg Fried Rice',
    category: 'Chinese',
    price: 60.00,
    costPrice: 28.00,
    stock: 30,
    lowStockThreshold: 6,
    status: 'in_stock',
    syncedWithExternalStore: true,
    lastSyncedAt: new Date().toISOString(),
    imageUrl: 'https://brozza.vercel.app/images/chow.png',
    description: 'Fragrant basmati rice wok-tossed with fresh garden vegetables.'
  },
  {
    id: 'prod-brz-16',
    dishId: '16',
    sku: 'BRZ-DISH-16',
    name: 'Schezwan Noodles',
    category: 'Chinese',
    price: 70.00,
    costPrice: 32.00,
    stock: 30,
    lowStockThreshold: 6,
    status: 'in_stock',
    syncedWithExternalStore: true,
    lastSyncedAt: new Date().toISOString(),
    imageUrl: 'https://brozza.vercel.app/images/eggchowminn.png',
    description: 'Fiery wok-tossed noodles in pungent Schezwan chili garlic sauce.'
  },
  {
    id: 'prod-brz-17',
    dishId: '17',
    sku: 'BRZ-DISH-17',
    name: 'Cheesy Garlic Bread',
    category: 'Italian',
    price: 85.00,
    costPrice: 40.00,
    stock: 25,
    lowStockThreshold: 5,
    status: 'in_stock',
    syncedWithExternalStore: true,
    lastSyncedAt: new Date().toISOString(),
    imageUrl: 'https://brozza.vercel.app/images/pastaa.png',
    description: 'Toasted artisanal bread loaded with melted mozzarella and herbs.'
  },
  {
    id: 'prod-brz-18',
    dishId: '18',
    sku: 'BRZ-DISH-18',
    name: 'Unscripted Special Banner Item',
    category: 'Specials',
    price: 120.00,
    costPrice: 55.00,
    stock: 20,
    lowStockThreshold: 5,
    status: 'in_stock',
    syncedWithExternalStore: true,
    lastSyncedAt: new Date().toISOString(),
    imageUrl: 'https://brozza.vercel.app/images/unscriptedBanner.jpg',
    description: 'Featured house special creation displayed via unscripted banner.'
  }
];

// Initial orders start empty so ONLY authentic customer dashboard parcels will be received
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
    source: 'Firebase (brozza-1f6be)',
    status: 'success',
    statusCode: 200,
    details: 'Connected to Firestore project: brozza-1f6be (Customer Dashboard)'
  }
];

export const INITIAL_API_CONFIG: ApiSyncConfig = {
  apiKey: 'sk_live_omni_7f9b82c4109e4a3b8d',
  webhookSecret: 'whsec_98fbc102a394ec5620ab',
  partnerStoreUrl: 'https://brozza.vercel.app',
  autoSyncStock: true,
  lastHandshake: new Date().toISOString(),
  endpointOrders: 'https://ais-dev-rkajnv7cjdlc456zix2sff-711623448022.asia-southeast1.run.app/api/v1/orders',
  endpointStock: 'https://ais-dev-rkajnv7cjdlc456zix2sff-711623448022.asia-southeast1.run.app/api/v1/stock/update',
  firestoreDatabaseId: undefined,
  projectId: 'brozza-1f6be'
};

/**
 * Normalizes and deduplicates an array of products to guarantee
 * unique keys, valid SKUs, and unambiguous dish IDs across all views.
 */
export function deduplicateProducts(rawProducts: Product[]): Product[] {
  if (!Array.isArray(rawProducts)) return [];
  const seenKeys = new Set<string>();
  const result: Product[] = [];

  for (const p of rawProducts) {
    if (!p) continue;
    const nameKey = (p.name || '').trim().toLowerCase();
    const dishIdKey = p.dishId ? `dish-${p.dishId}` : '';
    const skuKey = p.sku ? `sku-${p.sku.toLowerCase()}` : '';

    // Check if this product is already in our list
    if (
      (nameKey && seenKeys.has(nameKey)) ||
      (dishIdKey && seenKeys.has(dishIdKey)) ||
      (skuKey && seenKeys.has(skuKey))
    ) {
      continue;
    }

    if (nameKey) seenKeys.add(nameKey);
    if (dishIdKey) seenKeys.add(dishIdKey);
    if (skuKey) seenKeys.add(skuKey);

    // Extract dish number if any
    const numberMatch = (p.dishId || p.sku || p.id || '').match(/\d+/);
    const dishNumber = numberMatch ? parseInt(numberMatch[0], 10) : result.length + 1;
    const canonicalId = p.id && !p.id.match(/^item_\d+$/) ? p.id : `prod-brz-${dishNumber}`;

    result.push({
      ...p,
      id: canonicalId,
      dishId: p.dishId || String(dishNumber),
      sku: p.sku || `BRZ-DISH-${String(dishNumber).padStart(2, '0')}`,
      imageUrl: p.imageUrl || (p as any).image || '/images/frenchh.png',
      status: p.status || 'in_stock',
      stock: typeof p.stock === 'number' ? p.stock : 25
    });
  }

  return result;
}

export interface CanonicalDish {
  id: string;
  dishId: string;
  name: string;
  price: number;
  category: string;
  description: string;
  image: string;
  imageUrl: string;
}

export const BAROZZA_CANONICAL_DISHES: CanonicalDish[] = [
  { id: "1", dishId: "1", name: "French Fries", price: 30, category: "Starters", description: "Crispy golden fries served hot and fresh.", image: "https://brozza.vercel.app/images/frenchh.png", imageUrl: "https://brozza.vercel.app/images/frenchh.png" },
  { id: "2", dishId: "2", name: "Veg Chow Mein", price: 45, category: "Chinese", description: "Stir-fried noodles with fresh vegetables and aromatic spices.", image: "https://brozza.vercel.app/images/chow.png", imageUrl: "https://brozza.vercel.app/images/chow.png" },
  { id: "3", dishId: "3", name: "Egg Chow Mein", price: 55, category: "Chinese", description: "Delicious stir-fried noodles with scrambled eggs and seasonal veggies.", image: "https://brozza.vercel.app/images/eggchowminn.png", imageUrl: "https://brozza.vercel.app/images/eggchowminn.png" },
  { id: "4", dishId: "4", name: "Creamy Pasta", price: 65, category: "Italian", description: "Italian pasta cooked in a rich, creamy sauce with exotic herbs.", image: "https://brozza.vercel.app/images/pastaa.png", imageUrl: "https://brozza.vercel.app/images/pastaa.png" },
  { id: "5", dishId: "5", name: "Paneer Chilli", price: 80, category: "Chinese", description: "Spicy cottage cheese chunks tossed with bell peppers and onions.", image: "https://brozza.vercel.app/images/paneerchili.png", imageUrl: "https://brozza.vercel.app/images/paneerchili.png" },
  { id: "6", dishId: "6", name: "Steamed Veg Momos", price: 40, category: "Chinese", description: "Soft and succulent dumplings filled with garden-fresh vegetables.", image: "https://brozza.vercel.app/images/momos.png", imageUrl: "https://brozza.vercel.app/images/momos.png" },
  { id: "7", dishId: "7", name: "Fried Veg Momos", price: 45, category: "Chinese", description: "Crispy fried dumplings served with a hot and spicy red chutney.", image: "https://brozza.vercel.app/images/fried.png", imageUrl: "https://brozza.vercel.app/images/fried.png" },
  { id: "8", dishId: "8", name: "Baby Corn Chilli", price: 70, category: "Chinese", description: "Tender baby corn tossed in a spicy and tangy Manchurian sauce.", image: "https://brozza.vercel.app/images/babycornchili.png", imageUrl: "https://brozza.vercel.app/images/babycornchili.png" },
  { id: "9", dishId: "9", name: "Mushroom Chilli", price: 75, category: "Chinese", description: "Fresh mushrooms stir-fried with onions, capsicum, and oriental spices.", image: "https://brozza.vercel.app/images/masroomchili.png", imageUrl: "https://brozza.vercel.app/images/masroomchili.png" },
  { id: "10", dishId: "10", name: "Veg Manchurian", price: 65, category: "Chinese", description: "Golden vegetable balls tossed in a flavorful soy-based ginger sauce.", image: "https://brozza.vercel.app/images/menchurian.png", imageUrl: "https://brozza.vercel.app/images/menchurian.png" },
  { id: "11", dishId: "11", name: "Veg Roll", price: 35, category: "Rolls", description: "Freshly sautéed vegetables wrapped in a soft, flaky paratha.", image: "https://brozza.vercel.app/images/vegrol.png", imageUrl: "https://brozza.vercel.app/images/vegrol.png" },
  { id: "12", dishId: "12", name: "Egg Roll", price: 40, category: "Rolls", description: "A classic street food favorite with fluffy egg and zesty red onions.", image: "https://brozza.vercel.app/images/eggrol.png", imageUrl: "https://brozza.vercel.app/images/eggrol.png" },
  { id: "13", dishId: "13", name: "Paneer Roll", price: 50, category: "Rolls", description: "Juicy paneer chunks wrapped with crunchy veggies and sauces.", image: "https://brozza.vercel.app/images/paneerchili.png", imageUrl: "https://brozza.vercel.app/images/paneerchili.png" },
  { id: "14", dishId: "14", name: "Cold Coffee with Ice Cream", price: 90, category: "Beverages", description: "Blended chilled coffee topped with rich vanilla ice cream.", image: "https://brozza.vercel.app/images/coldcoffe.png", imageUrl: "https://brozza.vercel.app/images/coldcoffe.png" },
  { id: "15", dishId: "15", name: "Veg Fried Rice", price: 60, category: "Chinese", description: "Fragrant basmati rice wok-tossed with fresh garden vegetables.", image: "https://brozza.vercel.app/images/chow.png", imageUrl: "https://brozza.vercel.app/images/chow.png" },
  { id: "16", dishId: "16", name: "Schezwan Noodles", price: 70, category: "Chinese", description: "Fiery wok-tossed noodles in pungent Schezwan chili garlic sauce.", image: "https://brozza.vercel.app/images/eggchowminn.png", imageUrl: "https://brozza.vercel.app/images/eggchowminn.png" },
  { id: "17", dishId: "17", name: "Cheesy Garlic Bread", price: 85, category: "Italian", description: "Toasted artisanal bread loaded with melted mozzarella and herbs.", image: "https://brozza.vercel.app/images/pastaa.png", imageUrl: "https://brozza.vercel.app/images/pastaa.png" },
  { id: "18", dishId: "18", name: "Unscripted Special Banner Item", price: 120, category: "Specials", description: "Featured house special creation displayed via unscripted banner.", image: "https://brozza.vercel.app/images/unscriptedBanner.jpg", imageUrl: "https://brozza.vercel.app/images/unscriptedBanner.jpg" }
];

