import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDltNqesCmeG8UCh_1JJFpdUxyg6vx6pBg",
  authDomain: "brozza-1f6be.firebaseapp.com",
  projectId: "brozza-1f6be",
  storageBucket: "brozza-1f6be.firebasestorage.app",
  messagingSenderId: "297709421963",
  appId: "1:297709421963:web:a4bc73ae0944d173cb5b8e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  console.log("Fetching dishes collection...");
  try {
    const dishesSnap = await getDocs(collection(db, 'dishes'));
    console.log(`Total documents in 'dishes': ${dishesSnap.size}`);
    dishesSnap.forEach(d => {
      const data = d.data();
      console.log(`Doc ID: ${d.id} | name: ${data.name} | available: ${data.available} | cafeClosed: ${data.cafeClosed}`);
    });
  } catch (e: any) {
    console.error("Error fetching dishes:", e.message);
  }

  try {
    const catSnap = await getDoc(doc(db, 'orders', 'barozza_menu_catalog'));
    if (catSnap.exists()) {
      const data = catSnap.data();
      console.log("Catalog doc dishes count:", (data.dishes || []).length);
      console.log("Catalog doc customerDishes count:", (data.customerDishes || []).length);
    } else {
      console.log("barozza_menu_catalog not found");
    }
  } catch (e: any) {
    console.error("Error fetching catalog:", e.message);
  }

  process.exit(0);
}

main();
