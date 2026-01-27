// firebase.js
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getDatabase, ref, set, update, get, push, onValue } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// Firebase config for Trust ZedFund
const firebaseConfig = {
  apiKey: "AIzaSyDvkMDvK5d7P7p2zatUjIsJNGhBf18yeTQ",
  authDomain: "trust-zedfund.firebaseapp.com",
  databaseURL: "https://trust-zedfund-default-rtdb.firebaseio.com",
  projectId: "trust-zedfund",
  storageBucket: "trust-zedfund.firebasestorage.app",
  messagingSenderId: "129257684900",
  appId: "1:129257684900:web:95e94293366a26f9448b31"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

console.log("🔥 Firebase initialized for Trust ZedFund");

/* ==================================
   Helper functions for balances
================================== */

// Initialize user balances if not exist
export async function initUserBalances(userId) {
  const balRef = ref(db, `users/${userId}/balances`);
  const snap = await get(balRef);

  if (!snap.exists()) {
    await set(balRef, {
      deposit: 0,
      earnings: 0,
      referralWallet: 0
    });
  }
}

// Update user balance (deposit, earnings, referral)
export async function updateUserBalance(userId, type, amount) {
  const balRef = ref(db, `users/${userId}/balances`);
  const snap = await get(balRef);
  const balances = snap.exists() ? snap.val() : { deposit: 0, earnings: 0, referralWallet: 0 };

  balances[type] = (balances[type] || 0) + amount;
  await update(balRef, balances);
}

// Get real-time balance
export function onBalanceChange(userId, callback) {
  const balRef = ref(db, `users/${userId}/balances`);
  onValue(balRef, (snap) => {
    callback(snap.exists() ? snap.val() : { deposit: 0, earnings: 0, referralWallet: 0 });
  });
}

/* ==================================
   Withdrawals + Admin Queue
================================== */

// Add withdrawal request
export async function requestWithdrawal(userId, withdrawData) {
  const withdrawId = "w_" + Date.now();

  // Save to user's withdrawals
  await set(ref(db, `users/${userId}/withdrawals/${withdrawId}`), withdrawData);

  // Save to global admin approval queue
  await set(ref(db, `withdrawalRequests/${withdrawId}`), withdrawData);

  // Deduct user's earnings immediately (hold)
  const snap = await get(ref(db, `users/${userId}/balances/earnings`));
  const currentEarnings = snap.exists() ? Number(snap.val()) : 0;
  await update(ref(db, `users/${userId}/balances`), { earnings: currentEarnings - withdrawData.amount });
}

// Real-time user withdrawal updates
export function onUserWithdrawalsChange(userId, callback) {
  const wRef = ref(db, `users/${userId}/withdrawals`);
  onValue(wRef, (snap) => {
    callback(snap.exists() ? snap.val() : {});
  });
}

// Real-time transaction history (withdrawals)
export function onUserTransactionsChange(userId, callback) {
  const tRef = ref(db, `users/${userId}/withdrawals`);
  onValue(tRef, (snap) => {
    callback(snap.exists() ? snap.val() : {});
  });
}

/* ==================================
   Admin helpers
================================== */

// Get all pending withdrawals for admin approval
export function onAdminWithdrawalQueue(callback) {
  const queueRef = ref(db, "withdrawalRequests");
  onValue(queueRef, (snap) => {
    callback(snap.exists() ? snap.val() : {});
  });
}

// Approve withdrawal
export async function approveWithdrawal(withdrawId) {
  const wRef = ref(db, `withdrawalRequests/${withdrawId}`);
  const snap = await get(wRef);
  if (!snap.exists()) throw new Error("Withdrawal request not found");

  const data = snap.val();
  data.status = "approved";

  // Update user withdrawal status
  await update(ref(db, `users/${data.uid}/withdrawals/${withdrawId}`), { status: "approved" });

  // Remove from admin queue
  await set(wRef, null);

  return data;
}

// Reject withdrawal (return funds)
export async function rejectWithdrawal(withdrawId) {
  const wRef = ref(db, `withdrawalRequests/${withdrawId}`);
  const snap = await get(wRef);
  if (!snap.exists()) throw new Error("Withdrawal request not found");

  const data = snap.val();
  data.status = "rejected";

  // Refund user's earnings
  const balSnap = await get(ref(db, `users/${data.uid}/balances/earnings`));
  const currentEarnings = balSnap.exists() ? Number(balSnap.val()) : 0;
  await update(ref(db, `users/${data.uid}/balances`), { earnings: currentEarnings + data.amount });

  // Update user withdrawal status
  await update(ref(db, `users/${data.uid}/withdrawals/${withdrawId}`), { status: "rejected" });

  // Remove from admin queue
  await set(wRef, null);

  return data;
}
