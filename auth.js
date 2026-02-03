// Import from your firebase.js module instead
import { auth, db } from "./firebase.js";

// REMOVE THESE LINES:
// const auth = getAuth();
// const db = getDatabase();
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  set,
  push
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const auth = getAuth();
const db = getDatabase();

/* ================= SIGN UP ================= */
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value;
    const referral = document.getElementById("referral")?.value.trim() || null;

    const errorEl = document.getElementById("signupError");
    const successEl = document.getElementById("signupSuccess");

    if (errorEl) errorEl.textContent = "";
    if (successEl) successEl.textContent = "";

    if (!name || !email || !password) {
      if (errorEl) errorEl.textContent = "All required fields must be filled";
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      const referralCode = "TZF" + user.uid.slice(0, 6).toUpperCase();

      await set(ref(db, `users/${user.uid}`), {
        profile: {
          name,
          email,
          createdAt: Date.now()
        },
        balances: {
          deposit: 0,
          earnings: 0,
          referralWallet: 0
        },
        referral: {
          code: referralCode,
          referredBy: referral
        }
      });

      await push(ref(db, `notifications/${user.uid}`), {
        message: "🎉 Welcome to Trust ZedFund!",
        read: false,
        time: Date.now()
      });

      if (successEl) successEl.textContent = "Account created. Redirecting…";

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1200);

    } catch (err) {
      if (errorEl) errorEl.textContent = err.message;
      console.error(err);
    }
  });
}

/* ================= LOGIN ================= */
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value;

    const errorEl = document.getElementById("loginError");
    if (errorEl) errorEl.textContent = "";

    if (!email || !password) {
      if (errorEl) errorEl.textContent = "Email and password required";
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "dashboard.html";
    } catch (err) {
      if (errorEl) errorEl.textContent = err.message;
    }
  });
}

/* ================= LOGOUT ================= */
window.logout = async function () {
  await signOut(auth);
  window.location.href = "login.html";
};

/* ================= AUTH GUARD ================= */
onAuthStateChanged(auth, (user) => {
  const protectedPages = [
    "dashboard.html",
    "wallet.html",
    "investments.html"
  ];

  const page = location.pathname.split("/").pop();

  if (!user && protectedPages.includes(page)) {
    window.location.href = "login.html";
  }
});
