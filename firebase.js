// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getDatabase, ref, set, get, update, onValue } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// ------------------- FIREBASE CONFIG -------------------
const firebaseConfig = {
  apiKey: "AIzaSyDvkMDvK5d7P7p2zatUjIsJNGhBf18yeTQ",
  authDomain: "trust-zedfund.firebaseapp.com",
  databaseURL: "https://trust-zedfund-default-rtdb.firebaseio.com",
  projectId: "trust-zedfund",
  storageBucket: "trust-zedfund.firebasestorage.app",
  messagingSenderId: "129257684900",
  appId: "1:129257684900:web:95e94293366a26f9448b31"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// ------------------- USER INIT -------------------
export async function initUser(userId, name, email){
  const userRef = ref(db, `users/${userId}`);
  const snap = await get(userRef);
  if(!snap.exists()){
    await set(userRef, {
      name,
      email,
      wallet: { available: 0 },
      transactions: {}
    });
  }
}

// ------------------- WALLET -------------------
export async function addToWallet(userId, amount){
  if(amount <= 0) throw new Error("Amount must be > 0");
  const walletRef = ref(db, `users/${userId}/wallet`);
  const snap = await get(walletRef);
  let available = snap.exists() ? snap.val().available : 0;
  available += amount;
  await update(walletRef, { available });

  // log transaction
  const txId = "tx_" + Date.now();
  await set(ref(db, `users/${userId}/transactions/${txId}`), {
    type: "Wallet Top-up",
    amount,
    to: "Wallet",
    status: "Completed",
    date: new Date().toISOString()
  });

  return available;
}

// ------------------- VENTURES -------------------
export async function allocateToVenture(userId, ventureId, amount){
  const walletSnap = await get(ref(db, `users/${userId}/wallet`));
  let wallet = walletSnap.exists() ? walletSnap.val().available : 0;
  if(amount > wallet) throw new Error("Insufficient wallet balance");

  // deduct wallet
  wallet -= amount;
  await update(ref(db, `users/${userId}/wallet`), { available: wallet });

  // update venture
  const ventureRef = ref(db, `ventures/${ventureId}`);
  const ventureSnap = await get(ventureRef);
  if(!ventureSnap.exists()) throw new Error("Venture not found");

  const venture = ventureSnap.val();
  venture.totalAllocated = (venture.totalAllocated || 0) + amount;
  venture.contributors = venture.contributors || {};
  venture.contributors[userId] = (venture.contributors[userId] || 0) + amount;
  await update(ventureRef, venture);

  // log transaction
  const txId = "tx_" + Date.now();
  await set(ref(db, `users/${userId}/transactions/${txId}`), {
    type: "Venture Contribution",
    amount,
    to: venture.name,
    status: "Completed",
    date: new Date().toISOString()
  });

  return { wallet, ventureTotal: venture.totalAllocated };
}

// ------------------- REAL-TIME LISTENERS -------------------
export function onWalletChange(userId, callback){
  const walletRef = ref(db, `users/${userId}/wallet`);
  onValue(walletRef, snap => {
    callback(snap.exists() ? snap.val() : { available: 0 });
  });
}

export function onTransactionsChange(userId, callback){
  const txRef = ref(db, `users/${userId}/transactions`);
  onValue(txRef, snap => {
    callback(snap.exists() ? snap.val() : {});
  });
}

export function onVenturesChange(callback){
  const venturesRef = ref(db, `ventures`);
  onValue(venturesRef, snap => {
    callback(snap.exists() ? snap.val() : {});
  });
}

// ------------------- SEED DEMO VENTURES -------------------
export async function seedVentures(){
  const venturesSnap = await get(ref(db, 'ventures'));
  if(!venturesSnap.exists()){
    const demo = {
      "v_001": { name:"Mary & James Bakery", description:"Community bakery in Lusaka", totalAllocated:0, contributors:{} },
      "v_002": { name:"Eco Solar Kits", description:"Solar kits for rural homes", totalAllocated:0, contributors:{} },
      "v_003": { name:"Local Artisans Hub", description:"Support local crafts", totalAllocated:0, contributors:{} }
    };
    for(const id in demo){
      await set(ref(db, `ventures/${id}`), demo[id]);
    }
  }
}
