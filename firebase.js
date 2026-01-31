// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getDatabase, ref, set, update, get, onValue } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// ================= FIREBASE CONFIG =================
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
console.log("🔥 Firebase initialized for Trust ZedFund");

/* ==================================
   USER BALANCES
================================== */
export async function initUserBalances(userId) {
  const balRef = ref(db, `users/${userId}/balances`);
  const snap = await get(balRef);
  if (!snap.exists()) {
    await set(balRef, { deposit:0, earnings:0, referralWallet:0 });
  }
}

export async function updateUserBalance(userId, type, amount) {
  const balRef = ref(db, `users/${userId}/balances`);
  const snap = await get(balRef);
  const balances = snap.exists() ? snap.val() : { deposit:0, earnings:0, referralWallet:0 };
  balances[type] = (balances[type] || 0) + amount;
  await update(balRef, balances);
}

export function onBalanceChange(userId, callback){
  const balRef = ref(db, `users/${userId}/balances`);
  onValue(balRef, snap => callback(snap.exists() ? snap.val() : { deposit:0, earnings:0, referralWallet:0 }));
}

/* ==================================
   WITHDRAWALS + ADMIN QUEUE
================================== */
export async function requestWithdrawal(userId, withdrawData){
  const withdrawId = "w_" + Date.now();
  withdrawData.uid = userId;

  await set(ref(db, `users/${userId}/withdrawals/${withdrawId}`), withdrawData);
  await set(ref(db, `withdrawalRequests/${withdrawId}`), withdrawData);

  const snap = await get(ref(db, `users/${userId}/balances/earnings`));
  const currentEarnings = snap.exists() ? Number(snap.val()) : 0;
  await update(ref(db, `users/${userId}/balances`), { earnings: currentEarnings - withdrawData.amount });
}

export function onUserWithdrawalsChange(userId, callback){
  const wRef = ref(db, `users/${userId}/withdrawals`);
  onValue(wRef, snap => callback(snap.exists()? snap.val() : {}));
}

export function onUserTransactionsChange(userId, callback){
  const tRef = ref(db, `users/${userId}/transactions`);
  onValue(tRef, snap => callback(snap.exists()? snap.val() : {}));
}

export function onAdminWithdrawalQueue(callback){
  const queueRef = ref(db, "withdrawalRequests");
  onValue(queueRef, snap => callback(snap.exists()? snap.val() : {}));
}

export async function approveWithdrawal(withdrawId){
  const wRef = ref(db, `withdrawalRequests/${withdrawId}`);
  const snap = await get(wRef);
  if(!snap.exists()) throw new Error("Withdrawal request not found");

  const data = snap.val();
  data.status = "approved";
  await update(ref(db, `users/${data.uid}/withdrawals/${withdrawId}`), { status:"approved" });
  await set(wRef, null);
  return data;
}

export async function rejectWithdrawal(withdrawId){
  const wRef = ref(db, `withdrawalRequests/${withdrawId}`);
  const snap = await get(wRef);
  if(!snap.exists()) throw new Error("Withdrawal request not found");

  const data = snap.val();
  data.status = "rejected";

  const balSnap = await get(ref(db, `users/${data.uid}/balances/earnings`));
  const currentEarnings = balSnap.exists()? Number(balSnap.val()) : 0;
  await update(ref(db, `users/${data.uid}/balances`), { earnings: currentEarnings + data.amount });
  await update(ref(db, `users/${data.uid}/withdrawals/${withdrawId}`), { status:"rejected" });
  await set(wRef, null);
  return data;
}

/* ==================================
   VENTURES + CONTRIBUTIONS
================================== */
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

export async function contributeToVenture(userId, ventureId, amount){
  const balSnap = await get(ref(db, `users/${userId}/balances`));
  const balances = balSnap.exists()? balSnap.val() : { deposit:0, earnings:0, referralWallet:0 };
  const totalAvailable = (balances.deposit||0)+(balances.earnings||0);

  if(amount>totalAvailable) throw new Error("Insufficient funds");

  let depositDeduct = Math.min(amount, balances.deposit||0);
  let earningsDeduct = amount - depositDeduct;
  balances.deposit -= depositDeduct;
  balances.earnings -= earningsDeduct;
  await update(ref(db, `users/${userId}/balances`), balances);

  const ventureRef = ref(db, `ventures/${ventureId}`);
  const ventureSnap = await get(ventureRef);
  if(!ventureSnap.exists()) throw new Error("Venture not found");

  const venture = ventureSnap.val();
  venture.totalAllocated = (venture.totalAllocated||0)+amount;
  venture.contributors = venture.contributors||{};
  venture.contributors[userId] = (venture.contributors[userId]||0)+amount;
  await update(ventureRef, venture);

  const txId = "tx_" + Date.now();
  await set(ref(db, `users/${userId}/transactions/${txId}`), {
    type:"Venture Contribution",
    amount,
    to:venture.name,
    status:"Completed",
    date:new Date().toISOString()
  });

  return { balances, ventureTotal: venture.totalAllocated };
}

export function onVenturesChange(callback){
  const venturesRef = ref(db, 'ventures');
  onValue(venturesRef, snap => callback(snap.exists()? snap.val() : {}));
}
