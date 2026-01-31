// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getDatabase, ref, set, update, get, onValue } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// =====================
// FIREBASE CONFIG
// =====================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "trust-zedfund.firebaseapp.com",
  databaseURL: "https://trust-zedfund-default-rtdb.firebaseio.com",
  projectId: "trust-zedfund",
  storageBucket: "trust-zedfund.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// =====================
// USER WALLET & TRANSACTIONS
// =====================
export async function initUser(userId, name, email) {
  const userRef = ref(db, `users/${userId}`);
  const snap = await get(userRef);
  if (!snap.exists()) {
    await set(userRef, {
      profile: { name, email, role: "member", createdAt: new Date().toISOString() },
      wallet: { available: 0, locked: 0 },
      transactions: {}
    });
  }
}

export async function addToWallet(userId, amount) {
  const walletRef = ref(db, `users/${userId}/wallet`);
  const snap = await get(walletRef);
  const wallet = snap.exists() ? snap.val() : { available: 0, locked: 0 };
  const newAvailable = (wallet.available || 0) + amount;
  await update(walletRef, { available: newAvailable });

  const txnId = "txn_" + Date.now();
  await set(ref(db, `users/${userId}/transactions/${txnId}`), {
    type: "deposit",
    amount,
    from: "external",
    to: "wallet",
    status: "completed",
    reference: txnId,
    date: new Date().toISOString()
  });

  return newAvailable;
}

export async function allocateToVenture(userId, ventureId, amount) {
  const walletRef = ref(db, `users/${userId}/wallet`);
  const walletSnap = await get(walletRef);
  const wallet = walletSnap.exists() ? walletSnap.val() : { available: 0 };
  if (wallet.available < amount) throw new Error("Insufficient wallet balance");

  await update(walletRef, { available: wallet.available - amount });

  const ventureRef = ref(db, `ventures/${ventureId}`);
  const ventureSnap = await get(ventureRef);
  const venture = ventureSnap.exists() ? ventureSnap.val() : { totalAllocated: 0, contributors: {} };
  const contributors = venture.contributors || {};
  contributors[userId] = (contributors[userId] || 0) + amount;

  await update(ventureRef, { totalAllocated: (venture.totalAllocated || 0) + amount, contributors });

  const txnId = "txn_" + Date.now();
  await set(ref(db, `users/${userId}/transactions/${txnId}`), {
    type: "venture_allocation",
    amount,
    from: "wallet",
    to: ventureId,
    status: "completed",
    reference: txnId,
    date: new Date().toISOString()
  });

  return { newWallet: wallet.available - amount, ventureTotal: venture.totalAllocated + amount };
}

export async function allocateToCircle(userId, circleId, amount) {
  const walletRef = ref(db, `users/${userId}/wallet`);
  const walletSnap = await get(walletRef);
  const wallet = walletSnap.exists() ? walletSnap.val() : { available: 0 };
  if (wallet.available < amount) throw new Error("Insufficient wallet balance");

  await update(walletRef, { available: wallet.available - amount });

  const circleRef = ref(db, `savingsCircles/${circleId}`);
  const circleSnap = await get(circleRef);
  const circle = circleSnap.exists() ? circleSnap.val() : { totalAllocated: 0, contributors: {} };
  const contributors = circle.contributors || {};
  contributors[userId] = (contributors[userId] || 0) + amount;

  await update(circleRef, { totalAllocated: (circle.totalAllocated || 0) + amount, contributors });

  const txnId = "txn_" + Date.now();
  await set(ref(db, `users/${userId}/transactions/${txnId}`), {
    type: "circle_allocation",
    amount,
    from: "wallet",
    to: circleId,
    status: "completed",
    reference: txnId,
    date: new Date().toISOString()
  });

  return { newWallet: wallet.available - amount, circleTotal: circle.totalAllocated + amount };
}

// =====================
// REAL-TIME LISTENERS
// =====================
export function onWalletChange(userId, callback) {
  const walletRef = ref(db, `users/${userId}/wallet`);
  onValue(walletRef, snap => callback(snap.exists() ? snap.val() : { available: 0, locked: 0 }));
}

export function onTransactionsChange(userId, callback) {
  const txnRef = ref(db, `users/${userId}/transactions`);
  onValue(txnRef, snap => callback(snap.exists() ? snap.val() : {}));
}

export function onVenturesChange(callback) {
  const venturesRef = ref(db, `ventures`);
  onValue(venturesRef, snap => callback(snap.exists() ? snap.val() : {}));
}

export function onCirclesChange(callback) {
  const circlesRef = ref(db, `savingsCircles`);
  onValue(circlesRef, snap => callback(snap.exists() ? snap.val() : {}));
}
