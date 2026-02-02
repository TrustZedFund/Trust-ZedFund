// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  update,
  get,
  onValue,
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

/* ===================================================
   USER BALANCES
=================================================== */

export async function initUserBalances(uid) {
  const balRef = ref(db, `users/${uid}/balances`);
  const snap = await get(balRef);

  if (!snap.exists()) {
    await set(balRef, {
      deposit: 0,
      earnings: 0,
      referralWallet: 0
    });
  }
}

export function onBalanceChange(uid, callback) {
  onValue(ref(db, `users/${uid}/balances`), snap => {
    callback(
      snap.exists()
        ? snap.val()
        : { deposit: 0, earnings: 0, referralWallet: 0 }
    );
  });
}

/* ===================================================
   INVESTMENTS (CORE)
=================================================== */

export async function createInvestment(uid, plan, amount) {
  if (!uid) throw new Error("User not authenticated");
  if (!plan) throw new Error("Plan missing");
  if (!amount || amount <= 0)
    throw new Error("Invalid investment amount");

  // 1️⃣ Load balances
  const balRef = ref(db, `users/${uid}/balances`);
  const balSnap = await get(balRef);

  if (!balSnap.exists()) {
    throw new Error("Wallet not found");
  }

  const balances = balSnap.val();

  if ((balances.deposit || 0) < amount) {
    throw new Error("Insufficient deposit balance");
  }

  // 2️⃣ Deduct deposit wallet
  await update(balRef, {
    deposit: balances.deposit - amount
  });

  // 3️⃣ Calculate returns
  const profit = amount * plan.percent / 100;
  const totalPayout = amount + profit;

  const now = Date.now();
  const maturity = now + plan.days * 86400000;

  // 4️⃣ Save investment
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

  // 5️⃣ Log transaction
  await set(push(ref(db, `users/${uid}/transactions`)), {
    type: "Investment",
    plan: plan.name,
    amount,
    status: "Locked",
    date: new Date().toISOString()
  });

  return {
    investmentId: invRef.key,
    totalPayout
  };
}

/* ===================================================
   AUTO MATURITY PROCESSOR
=================================================== */

export async function processInvestmentMaturity(uid) {
  if (!uid) return;

  const invRef = ref(db, `users/${uid}/investments`);
  const snap = await get(invRef);

  if (!snap.exists()) return;

  const investments = snap.val();
  const now = Date.now();

  for (const id in investments) {
    const inv = investments[id];

    if (inv.status === "active" && inv.maturityTime <= now) {
      // Credit earnings
      const earnRef = ref(db, `users/${uid}/balances/earnings`);
      const earnSnap = await get(earnRef);
      const current = earnSnap.exists()
        ? Number(earnSnap.val())
        : 0;

      await update(ref(db, `users/${uid}/balances`), {
        earnings: current + inv.totalPayout
      });

      // Mark completed
      await update(ref(db, `users/${uid}/investments/${id}`), {
        status: "completed",
        completedAt: new Date().toISOString()
      });
    }
  }
}

/* ===================================================
   REAL-TIME INVESTMENTS LIST
=================================================== */

export function onUserInvestments(uid, callback) {
  onValue(ref(db, `users/${uid}/investments`), snap => {
    callback(snap.exists() ? snap.val() : {});
  });
}
