/* ================= FIREBASE CONFIGURATION ================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { 
  getDatabase,
  ref,
  set,
  update,
  get,
  onValue,
  push,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { 
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDvkMDvK5d7P7p2zatUjIsJNGhBf18yeTQ",
  authDomain: "trust-zedfund.firebaseapp.com",
  databaseURL: "https://trust-zedfund-default-rtdb.firebaseio.com",
  projectId: "trust-zedfund",
  storageBucket: "trust-zedfund.appspot.com",
  messagingSenderId: "129257684900",
  appId: "1:129257684900:web:95e94293366a26f9448b31"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);

console.log("🔥 Firebase initialized successfully");

/* ===================================================
   AUTHENTICATION FUNCTIONS
=================================================== */

export async function signUpUser(email, password, name, referral = null) {
  try {
    // Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Generate referral code
    const myReferralCode = "TZF" + Math.floor(100000 + Math.random() * 900000);
    
    // Create user document in database
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
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      status: "active"
    });
    
    // Create welcome notification
    await push(ref(db, `notifications/${user.uid}`), {
      message: "🎉 Welcome to Trust ZedFund! Start investing wisely.",
      read: false,
      time: Date.now(),
      type: "welcome"
    });
    
    return { success: true, userId: user.uid };
  } catch (error) {
    console.error("Signup error:", error);
    throw error;
  }
}

export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update last login time
    await set(ref(db, `users/${user.uid}/lastLogin`), serverTimestamp());
    
    return { success: true, userId: user.uid };
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

export function monitorAuthState(callback) {
  onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}

/* ===================================================
   USER BALANCES & INVESTMENTS
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
   DEPOSIT PROOF UPLOAD
=================================================== */

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
        const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(Math.round(percent));
      },
      error => reject(error),
      async () => {
        const proofURL = await getDownloadURL(uploadTask.snapshot.ref);

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