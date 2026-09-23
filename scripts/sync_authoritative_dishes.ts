import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { BAROZZA_CANONICAL_DISHES } from '../src/data/mockData';
import { buildAuthoritativeCustomerDishes, firestoreDb } from '../src/services/firebase';
import { CafeStatus } from '../src/types';

const db = firestoreDb;
if (!db) {
  console.error("firestoreDb is null!");
  process.exit(1);
}

async function main() {
  console.log("1. Fetching current cafe status from Firestore...");
  let currentStatus: CafeStatus = {
    isOpen: false,
    reopenTime: '',
    formattedReopenTime: '9:30 PM',
    closureReason: "currently cafe is closed. so I'm sorry boss ! . it will open at 9:30 PM."
  };

  try {
    const statusSnap = await getDoc(doc(db, 'orders', 'barozza_cafe_status'));
    if (statusSnap.exists()) {
      const data = statusSnap.data();
      currentStatus = {
        isOpen: data.isOpen ?? false,
        reopenTime: data.reopenTime || '',
        formattedReopenTime: data.formattedReopenTime || '9:30 PM',
        closureReason: data.closureReason || (data.isOpen ? '' : `currently cafe is closed. so I'm sorry boss ! . it will open at ${data.formattedReopenTime || 'Date and Time'}.`),
        closedBy: data.closedBy || 'Admin'
      };
      console.log(`Current Firestore cafe status: isOpen=${currentStatus.isOpen}`);
    }
  } catch (e: any) {
    console.warn("Could not fetch current cafe status:", e.message);
  }

  console.log("2. Fetching existing dishes in Firestore 'dishes' collection...");
  const dishesSnap = await getDocs(collection(db, 'dishes'));
  const existingDocs = dishesSnap.docs.map(d => ({ id: d.id, data: d.data() }));
  console.log(`Found ${existingDocs.length} existing documents in 'dishes'.`);

  console.log("3. Building authoritative customer dishes with all 18 canonical items...");
  const authoritativeDishes = buildAuthoritativeCustomerDishes(currentStatus, [], existingDocs);
  console.log(`Generated ${authoritativeDishes.length} authoritative dishes.`);

  const closureMsg = currentStatus.closureReason || 
    `currently cafe is closed. so I'm sorry boss ! . it will open at ${currentStatus.formattedReopenTime || 'Date and Time'}.`;

  console.log("4. Updating all dishes in 'dishes' collection...");
  for (const dish of authoritativeDishes) {
    await setDoc(doc(db, 'dishes', dish.id), {
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
      reopenTime: currentStatus.reopenTime || '',
      formattedReopenTime: currentStatus.formattedReopenTime || '',
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    console.log(`Updated dish [${dish.id}] - ${dish.name}: available=${dish.available}, cafeClosed=${!currentStatus.isOpen}`);
  }

  console.log("5. Updating orders/barozza_menu_catalog...");
  await setDoc(doc(db, 'orders', 'barozza_menu_catalog'), {
    isCatalog: true,
    type: 'menu_catalog',
    storeName: 'The Barozza Cafe',
    isCafeOpen: currentStatus.isOpen,
    isOpen: currentStatus.isOpen,
    status: currentStatus.isOpen ? 'open' : 'closed',
    reopenTime: currentStatus.reopenTime || '',
    formattedReopenTime: currentStatus.formattedReopenTime || '',
    closureMessage: currentStatus.isOpen ? '' : closureMsg,
    lastUpdated: new Date().toISOString(),
    dishes: authoritativeDishes,
    customerDishes: authoritativeDishes,
    totalDishes: authoritativeDishes.length
  }, { merge: true });

  console.log("Sync completed successfully!");
  process.exit(0);
}

main();
