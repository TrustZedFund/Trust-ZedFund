import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  ref,
  set,
  push,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

/* =========================
   SIGN UP
========================= */
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const referral = document.getElementById("referral")?.value.trim() || null;

    const errorEl = document.getElementById("signupError");
    const successEl = document.getElementById("signupSuccess");

    errorEl.textContent = "";
    successEl.textContent = "";

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      const myReferralCode = "TZF" + Math.floor(100000 + Math.random() * 900000);

      await set(ref(db, `users/${user.uid}`), {
        name,
        email,
        referralCode: myReferralCode,
        referredBy: referral,
        balances: {
          deposit: 0,
          earnings: 0,
          referral: 0
        },
        createdAt: serverTimestamp()
      });

      await push(ref(db, `notifications/${user.uid}`), {
        message: "🎉 Welcome to Trust ZedFund! Start investing wisely.",
        read: false,
        time: Date.now(),
        type: "welcome"
      });

      successEl.textContent = "Account created! Redirecting…";

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);

    } catch (err) {
      errorEl.textContent = err.message;
      console.error(err);
    }
  });
}

/* =========================
   LOGIN
========================= */
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const errorEl = document.getElementById("loginError");

    errorEl.textContent = "";

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "dashboard.html";
    } catch {
      errorEl.textContent = "Invalid email or password";
    }
  });
}

/* ================= FIREBASE IMPORTS ================= */

// COMMENT OUT THESE DUPLICATE IMPORTS - THEY'RE ALREADY IN firebase.js
/*
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";

import { getAuth } from
  "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  set,
  update,
  get,
  onValue,
  push
} from
  "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL
} from
  "https://www.gstatic.com/firebasejs/12.8.0/firebase-storage.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDvkMDvK5d7P7p2zatUjIsJNGhBf18yeTQ",
  authDomain: "trust-zedfund.firebaseapp.com",
  databaseURL: "https://trust-zedfund-default-rtdb.firebaseio.com",
  projectId: "trust-zedfund",
  storageBucket: "trust-zedfund.appspot.com",
  messagingSenderId: "129257684900",
  appId: "1:129257684900:web:95e94293366a26f9448b31"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);

console.log("🔥 Firebase initialized");

/* ===================================================
   USER BALANCES
=================================================== 

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
   INVESTMENTS
=================================================== 

export async function createInvestment(uid, plan, amount) {

  if (!amount || amount < 500) {
    throw new Error("Minimum investment is ZMK 500");
  }

  const balRef = ref(db, `users/${uid}/balances`);
  const balSnap = await get(balRef);

  if (!balSnap.exists()) {
    throw new Error("Wallet not found");
  }

  const balances = balSnap.val();

  if ((balances.deposit || 0) < amount) {
    throw new Error("Insufficient deposit balance");
  }

  await update(balRef, {
    deposit: balances.deposit - amount
  });

  const dailyProfit = (amount / 500) * 10;
  const now = Date.now();
  const maturityTime = now + plan.days * 86400000;

  const invRef = push(ref(db, `users/${uid}/investments`));

  await set(invRef, {
    planName: plan.name,
    amount,
    dailyProfit,
    startTime: now,
    maturityTime,
    lastProfitCalc: now,
    totalEarned: 0,
    status: "active"
  });

  await set(push(ref(db, `users/${uid}/transactions`)), {
    type: "Investment",
    plan: plan.name,
    amount,
    status: "Active",
    date: new Date().toISOString()
  });

  return { investmentId: invRef.key, dailyProfit };
}

/* ===================================================
   PROFIT ACCRUAL
=================================================== 

export async function processInvestmentProfits(uid) {

  const invRef = ref(db, `users/${uid}/investments`);
  const snap = await get(invRef);
  if (!snap.exists()) return;

  const investments = snap.val();
  const now = Date.now();

  for (const id in investments) {
    const inv = investments[id];
    if (inv.status !== "active") continue;

    const elapsed = now - inv.lastProfitCalc;
    const days = Math.floor(elapsed / 86400000);
    if (days <= 0) continue;

    const profit = days * inv.dailyProfit;

    const earnRef = ref(db, `users/${uid}/balances/earnings`);
    const earnSnap = await get(earnRef);
    const current = earnSnap.exists() ? Number(earnSnap.val()) : 0;

    await update(ref(db, `users/${uid}/balances`), {
      earnings: current + profit
    });

    await update(ref(db, `users/${uid}/investments/${id}`), {
      lastProfitCalc: inv.lastProfitCalc + days * 86400000,
      totalEarned: (inv.totalEarned || 0) + profit,
      matured: now >= inv.maturityTime
    });
  }
}

/* ===================================================
   REAL-TIME INVESTMENTS
=================================================== 

export function onUserInvestments(uid, callback) {
  onValue(ref(db, `users/${uid}/investments`), snap => {
    callback(snap.exists() ? snap.val() : {});
  });
}

/* ===================================================
   DEPOSIT PROOF UPLOAD (🔥 FIXED)
=================================================== 

export async function submitDepositProof(uid, data, file, onProgress) {

  if (!uid) throw new Error("User not authenticated");
  if (!file) throw new Error("No proof file selected");

  const filePath = `depositProofs/${uid}/${Date.now()}_${file.name}`;
  const proofRef = storageRef(storage, filePath);

  const uploadTask = uploadBytesResumable(proofRef, file);

  return new Promise((resolve, reject) => {

    uploadTask.on(
      "state_changed",

      snapshot => {
        const percent =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(Math.round(percent));
      },

      error => reject(error),

      async () => {
        const proofURL =
          await getDownloadURL(uploadTask.snapshot.ref);

        const depositRef = push(ref(db, `depositRequests`));
        await set(depositRef, {
          uid,
          amount: data.amount,
          method: data.method,
          proofURL,
          status: "pending",
          createdAt: Date.now()
        });

        await set(push(ref(db, `users/${uid}/transactions`)), {
          type: "Deposit",
          amount: data.amount,
          method: data.method,
          status: "Pending",
          date: new Date().toISOString()
        });

        resolve(true);
      }
    );
  });
}
*/