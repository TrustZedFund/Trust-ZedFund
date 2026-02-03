// auth.js
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

/* =====================================================
   SIGN UP
===================================================== */

const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // ---- DOM ELEMENTS (explicit to avoid JS crashes)
    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const referralInput = document.getElementById("referral");

    const signupError = document.getElementById("signupError");
    const signupSuccess = document.getElementById("signupSuccess");

    signupError.textContent = "";
    signupSuccess.textContent = "";

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const referredBy = referralInput?.value.trim() || null;

    try {
      // 1️⃣ Create Auth account
      const cred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = cred.user;

      // 2️⃣ Generate referral code for this user
      const referralCode =
        "TZF" + Math.floor(100000 + Math.random() * 900000);

      // 3️⃣ Create user record (RULE-COMPLIANT)
      await set(ref(db, `users/${user.uid}`), {
        profile: {
          name,
          email
        },

        referralCode: referralCode,   // user’s invite code
        referredBy: referredBy,       // who invited them (if any)

        balances: {
          deposit: 0,
          earnings: 0,
          referralWallet: 0           // 🔑 REQUIRED by rules
        },

        createdAt: serverTimestamp()
      });

      // 4️⃣ Welcome notification (rules allow this)
      await push(ref(db, `notifications/${user.uid}`), {
        message: "🎉 Welcome to Trust ZedFund! Start investing wisely.",
        read: false,
        time: Date.now(),
        type: "welcome"
      });

      signupSuccess.textContent = "Account created! Redirecting…";

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);

    } catch (err) {
      signupError.textContent = err.message;
      console.error("Signup error:", err);
    }
  });
}

/* =====================================================
   LOGIN
===================================================== */

const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const loginError = document.getElementById("loginError");

    loginError.textContent = "";

    try {
      await signInWithEmailAndPassword(
        auth,
        emailInput.value.trim(),
        passwordInput.value.trim()
      );

      window.location.href = "dashboard.html";

    } catch (err) {
      loginError.textContent = "Invalid email or password";
      console.error("Login error:", err);
    }
  });
}
