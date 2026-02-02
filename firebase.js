/* ===================================================
   FIREBASE.JS - COMPLETE VERSION
   Version: 12.8.0 (Ensure all imports use same version)
=================================================== */

/* ================= FIREBASE IMPORTS ================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  update,
  get,
  onValue,
  push,
  remove
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

/* ================= INITIALIZE FIREBASE ============= */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

console.log("🔥 Firebase initialized successfully");

/* ================= AUTH FUNCTIONS ================== */
export async function getCurrentUser() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    }, reject);
  });
}

export async function logoutUser() {
  try {
    await signOut(auth);
    console.log("User logged out");
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}

/* ================= USER BALANCES =================== */
export async function initUserBalances(uid) {
  try {
    console.log(`Initializing balances for user: ${uid}`);
    const refBal = ref(db, `users/${uid}/balances`);
    const snap = await get(refBal);

    if (!snap.exists()) {
      console.log("Creating new balance record");
      await set(refBal, {
        deposit: 0,
        earnings: 0,
        referralWallet: 0,
        totalBalance: 0,
        lastUpdated: Date.now()
      });
      console.log("✅ Balance record created");
    } else {
      console.log("✅ Balance record exists:", snap.val());
    }
  } catch (error) {
    console.error("Error initializing balances:", error);
    throw error;
  }
}

export function onBalanceChange(uid, callback) {
  try {
    const balanceRef = ref(db, `users/${uid}/balances`);
    
    onValue(balanceRef, (snap) => {
      if (snap.exists()) {
        const balances = snap.val();
        // Calculate total balance
        balances.totalBalance = 
          (balances.deposit || 0) + 
          (balances.earnings || 0) + 
          (balances.referralWallet || 0);
        callback(balances);
      } else {
        callback({ 
          deposit: 0, 
          earnings: 0, 
          referralWallet: 0,
          totalBalance: 0
        });
      }
    }, (error) => {
      console.error("Balance listener error:", error);
      callback({ 
        deposit: 0, 
        earnings: 0, 
        referralWallet: 0,
        totalBalance: 0
      });
    });
    
    console.log(`✅ Balance listener attached for user: ${uid}`);
  } catch (error) {
    console.error("Error setting up balance listener:", error);
  }
}

export async function getUserBalances(uid) {
  try {
    const refBal = ref(db, `users/${uid}/balances`);
    const snap = await get(refBal);
    
    if (snap.exists()) {
      const balances = snap.val();
      balances.totalBalance = 
        (balances.deposit || 0) + 
        (balances.earnings || 0) + 
        (balances.referralWallet || 0);
      return balances;
    }
    
    return { 
      deposit: 0, 
      earnings: 0, 
      referralWallet: 0,
      totalBalance: 0
    };
  } catch (error) {
    console.error("Error getting user balances:", error);
    throw error;
  }
}

/* ================= INVESTMENTS CORE ================ */
export async function createInvestment(uid, plan, amount) {
  try {
    console.log("🔄 createInvestment called with:", { uid, plan, amount });
    
    // Validate input
    if (!uid) throw new Error("User ID is required");
    if (!plan) throw new Error("Plan is required");
    if (!amount || amount <= 0) throw new Error("Invalid investment amount");
    if (!plan.percent || !plan.days || !plan.name) {
      throw new Error("Invalid plan data");
    }
    
    // Convert amount to number
    amount = Number(amount);
    if (isNaN(amount)) throw new Error("Amount must be a number");

    // 1️⃣ Load balances
    const balRef = ref(db, `users/${uid}/balances`);
    console.log("Fetching balances from:", `users/${uid}/balances`);
    
    const balSnap = await get(balRef);
    
    if (!balSnap.exists()) {
      throw new Error("Wallet not found. Please deposit first.");
    }

    const balances = balSnap.val();
    console.log("Current balances:", balances);

    const availableDeposit = Number(balances.deposit) || 0;
    if (availableDeposit < amount) {
      throw new Error(
        `Insufficient deposit balance. Available: ZMW ${availableDeposit.toFixed(2)}, Required: ZMW ${amount.toFixed(2)}`
      );
    }

    // 2️⃣ Deduct deposit wallet
    const newDeposit = availableDeposit - amount;
    await update(balRef, {
      deposit: newDeposit,
      lastUpdated: Date.now()
    });
    console.log(`✅ Deposit updated: ${availableDeposit} → ${newDeposit}`);

    // 3️⃣ Calculate returns
    const profit = amount * plan.percent / 100;
    const totalPayout = amount + profit;
    
    const now = Date.now();
    const maturity = now + (plan.days * 24 * 60 * 60 * 1000); // Convert days to milliseconds
    
    console.log(`📊 Investment calculations:
      Amount: ${amount}
      Profit: ${profit}
      Total Payout: ${totalPayout}
      Duration: ${plan.days} days
      Maturity: ${new Date(maturity).toLocaleString()}`);

    // 4️⃣ Generate investment ID
    const invRef = push(ref(db, `users/${uid}/investments`));
    const investmentId = invRef.key;
    
    console.log(`Generated investment ID: ${investmentId}`);

    // 5️⃣ Save investment
    const investmentData = {
      id: investmentId,
      planName: plan.name,
      amount: amount,
      profit: profit,
      totalPayout: totalPayout,
      percent: plan.percent,
      startTime: now,
      startDate: new Date(now).toISOString(),
      maturityTime: maturity,
      maturityDate: new Date(maturity).toISOString(),
      status: "active",
      days: plan.days,
      created: Date.now()
    };
    
    await set(invRef, investmentData);
    console.log("✅ Investment saved to database");

    // 6️⃣ Log transaction
    const transactionData = {
      id: push(ref(db, `users/${uid}/transactions`)).key,
      type: "Investment",
      plan: plan.name,
      amount: amount,
      status: "Locked",
      date: new Date().toISOString(),
      timestamp: Date.now(),
      investmentId: investmentId,
      description: `Invested in ${plan.name} for ${plan.days} days`
    };
    
    await set(push(ref(db, `users/${uid}/transactions`)), transactionData);
    console.log("✅ Transaction logged");

    // 7️⃣ Update user stats
    const userStatsRef = ref(db, `users/${uid}/stats`);
    const statsSnap = await get(userStatsRef);
    
    if (statsSnap.exists()) {
      const stats = statsSnap.val();
      await update(userStatsRef, {
        totalInvested: (stats.totalInvested || 0) + amount,
        activeInvestments: (stats.activeInvestments || 0) + 1,
        lastInvestment: Date.now()
      });
    } else {
      await set(userStatsRef, {
        totalInvested: amount,
        activeInvestments: 1,
        totalWithdrawn: 0,
        lastInvestment: Date.now()
      });
    }

    console.log("🎉 Investment created successfully!");
    
    return {
      success: true,
      investmentId: investmentId,
      totalPayout: totalPayout,
      maturityDate: new Date(maturity).toLocaleDateString()
    };
    
  } catch (error) {
    console.error("❌ Error in createInvestment:", error);
    throw error;
  }
}

/* ================= INVESTMENT MANAGEMENT =========== */
export async function processInvestmentMaturity(uid) {
  try {
    console.log(`Processing maturity for user: ${uid}`);
    const invRef = ref(db, `users/${uid}/investments`);
    const snap = await get(invRef);

    if (!snap.exists()) {
      console.log("No investments found");
      return { processed: 0 };
    }

    const investments = snap.val();
    const now = Date.now();
    let processedCount = 0;

    for (const id in investments) {
      const inv = investments[id];

      if (inv.status === "active" && inv.maturityTime <= now) {
        console.log(`Processing mature investment: ${id}`);
        
        // Credit earnings
        const earnRef = ref(db, `users/${uid}/balances/earnings`);
        const earnSnap = await get(earnRef);
        const currentEarnings = earnSnap.exists() ? Number(earnSnap.val()) : 0;
        
        const totalPayout = Number(inv.totalPayout) || 0;
        const newEarnings = currentEarnings + totalPayout;

        await update(ref(db, `users/${uid}/balances`), {
          earnings: newEarnings,
          lastUpdated: Date.now()
        });

        // Mark as completed
        await update(ref(db, `users/${uid}/investments/${id}`), {
          status: "completed",
          completedAt: new Date().toISOString(),
          payoutReceived: totalPayout,
          actualPayoutDate: Date.now()
        });

        // Log completion transaction
        await set(push(ref(db, `users/${uid}/transactions`)), {
          type: "Payout",
          amount: totalPayout,
          status: "Completed",
          date: new Date().toISOString(),
          timestamp: Date.now(),
          investmentId: id,
          description: `Payout from ${inv.planName} investment`
        });

        // Update stats
        const statsRef = ref(db, `users/${uid}/stats`);
        const statsSnap = await get(statsRef);
        
        if (statsSnap.exists()) {
          const stats = statsSnap.val();
          await update(statsRef, {
            activeInvestments: Math.max(0, (stats.activeInvestments || 1) - 1),
            completedInvestments: (stats.completedInvestments || 0) + 1,
            totalEarned: (stats.totalEarned || 0) + (inv.profit || 0)
          });
        }

        processedCount++;
        console.log(`✅ Investment ${id} matured and paid out: ZMW ${totalPayout}`);
      }
    }

    console.log(`Processed ${processedCount} mature investments`);
    return { processed: processedCount };
    
  } catch (error) {
    console.error("Error processing maturity:", error);
    throw error;
  }
}

export function onUserInvestments(uid, callback) {
  try {
    const invRef = ref(db, `users/${uid}/investments`);
    
    onValue(invRef, (snap) => {
      if (snap.exists()) {
        const investments = snap.val();
        const now = Date.now();
        
        // Process each investment to add calculated fields
        Object.keys(investments).forEach(id => {
          const inv = investments[id];
          
          // Add calculated fields
          inv.id = id;
          inv.isMatured = inv.status === "active" && inv.maturityTime <= now;
          inv.timeLeft = inv.status === "active" ? 
            Math.max(0, inv.maturityTime - now) : 0;
          inv.daysLeft = Math.ceil(inv.timeLeft / (24 * 60 * 60 * 1000));
          
          // Format dates
          if (inv.startTime) {
            inv.startDateFormatted = new Date(inv.startTime).toLocaleDateString();
          }
          if (inv.maturityTime) {
            inv.maturityDateFormatted = new Date(inv.maturityTime).toLocaleDateString();
          }
        });
        
        callback(investments);
      } else {
        callback({});
      }
    }, (error) => {
      console.error("Investments listener error:", error);
      callback({});
    });
    
    console.log(`✅ Investments listener attached for user: ${uid}`);
  } catch (error) {
    console.error("Error setting up investments listener:", error);
  }
}

export async function getUserInvestments(uid) {
  try {
    const invRef = ref(db, `users/${uid}/investments`);
    const snap = await get(invRef);
    
    if (!snap.exists()) return {};
    
    const investments = snap.val();
    const now = Date.now();
    
    // Add calculated fields
    Object.keys(investments).forEach(id => {
      const inv = investments[id];
      inv.id = id;
      inv.isMatured = inv.status === "active" && inv.maturityTime <= now;
      inv.timeLeft = inv.status === "active" ? 
        Math.max(0, inv.maturityTime - now) : 0;
    });
    
    return investments;
  } catch (error) {
    console.error("Error getting investments:", error);
    throw error;
  }
}

/* ================= TRANSACTIONS ==================== */
export function onUserTransactions(uid, callback) {
  try {
    const transRef = ref(db, `users/${uid}/transactions`);
    
    onValue(transRef, (snap) => {
      if (snap.exists()) {
        const transactions = snap.val();
        // Sort by timestamp (newest first)
        const sortedTransactions = Object.entries(transactions)
          .map(([id, trans]) => ({ id, ...trans }))
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        callback(sortedTransactions);
      } else {
        callback([]);
      }
    });
    
    console.log(`✅ Transactions listener attached for user: ${uid}`);
  } catch (error) {
    console.error("Error setting up transactions listener:", error);
  }
}

/* ================= UTILITY FUNCTIONS =============== */
export async function checkAndProcessMaturity(uid) {
  try {
    console.log("🔍 Checking for mature investments...");
    const result = await processInvestmentMaturity(uid);
    if (result.processed > 0) {
      console.log(`✅ ${result.processed} investments matured and paid out`);
    }
    return result;
  } catch (error) {
    console.error("Error in checkAndProcessMaturity:", error);
    return { processed: 0, error: error.message };
  }
}

export function formatCurrency(amount) {
  return `ZMW ${Number(amount).toFixed(2)}`;
}

export function formatDate(timestamp) {
  if (!timestamp) return "N/A";
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/* ================= EXPORT ALL ====================== */
export { auth, db };
export { onAuthStateChanged };
export { ref, set, update, get, push, remove, onValue };