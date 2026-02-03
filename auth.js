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

// Import from your central firebase module
import { auth, db } from "./firebase.js";

/* ================= SIGN UP ================= */
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Signup form submitted"); // Debug log

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
      console.log("Attempting to create user..."); // Debug log
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      console.log("User created:", user.uid); // Debug log

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
      console.error("Signup error:", err); // Debug log
      if (errorEl) errorEl.textContent = err.message;
    }
  });
}

/* ================= LOGIN ================= */
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Login form submitted"); // Debug log

    const email = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value;

    const errorEl = document.getElementById("loginError");
    if (errorEl) errorEl.textContent = "";

    if (!email || !password) {
      if (errorEl) errorEl.textContent = "Email and password required";
      return;
    }

    try {
      console.log("Attempting login..."); // Debug log
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Login successful, redirecting..."); // Debug log
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error("Login error:", err); // Debug log
      if (errorEl) errorEl.textContent = err.message;
    }
  });
}

// You'll need to import these functions if they're not in firebase.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

import {
  ref,
  set,
  push
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

/* ================= LOGOUT ================= */
window.logout = async function () {
  await signOut(auth);
  window.location.href = "login.html";
};

/* ================= AUTH GUARD ================= */
onAuthStateChanged(auth, (user) => {
  console.log("Auth state changed:", user ? "User logged in" : "No user"); // Debug log
  
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
