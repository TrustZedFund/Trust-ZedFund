// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  update,
  get,
  push
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

/* ================= FIREBASE CONFIG ================= */

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

export const auth = getAuth(app);
export const db = getDatabase(app);

console.log("🔥 Firebase initialized");

/* ================= INVESTMENT ================= */

export async function createInvestment(uid, plan, amount) {
  if (!uid) throw new Error("User not authenticated");
  if (!plan) throw new Error("Plan missing");
  if (!amount || amount <= 0) throw new Error("Invalid amount");

  const balRef = ref(db, `users/${uid}/balances`);
  const balSnap = await get(balRef);

  if (!balSnap.exists()) throw new Error("Wallet not found");

  const balances = balSnap.val();

  if ((balances.deposit || 0) < amount) {
    throw new Error("Insufficient deposit balance");
  }

  // Deduct deposit
  await update(balRef, {
    deposit: balances.deposit - amount
  });

  const profit = amount * plan.percent / 100;
  const totalPayout = amount + profit;
  const now = Date.now();
  const maturity = now + plan.days * 86400000;

  // Save investment
  const invRef = push(ref(db, `users/${uid}/investments`));
  await set(invRef, {
    planName: plan.name,
    amount,
    profit,
    totalPayout,
    percent: plan.percent,
    startTime: now,
    maturityTime: maturity,
    status: "active"
  });

  // Log transaction
  await set(push(ref(db, `users/${uid}/transactions`)), {
    type: "Investment",
    amount,
    plan: plan.name,
    status: "Locked",
    date: new Date().toISOString()
  });

  return true;
}
