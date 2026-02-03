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
    const referralInput = document.getElementById("referral");
    const referralCode = referralInput ? referralInput.value.trim() : null;

    const errorEl = document.getElementById("signupError");
    const successEl = document.getElementById("signupSuccess");

    errorEl.textContent = "";
    successEl.textContent = "";

    if (!name || !email || !password) {
      errorEl.textContent = "All required fields must be filled.";
      return;
    }

    if (password.length < 6) {
      errorEl.textContent = "Password must be at least 6 characters.";
      return;
    }

    try {
      // Create auth account
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      // Generate referral code
      const myReferralCode = "TZF" + Math.floor(100000 + Math.random() * 900000);

      // Save user profile
      await set(ref(db, `users/${user.uid}`), {
        name,
        email,
        referralCode: myReferralCode,
        referredBy: referralCode || null,
        balances: {
          deposit: 0,
          earnings: 0,
          referral: 0
        },
        createdAt: serverTimestamp()
      });

      // Welcome notification
      await push(ref(db, `notifications/${user.uid}`), {
        message: "🎉 Welcome to Trust ZedFund! Start investing wisely.",
        read: false,
        time: Date.now(),
        type: "welcome"
      });

      successEl.textContent = "Account created successfully! Redirecting…";

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);

    } catch (err) {
      console.error(err);
      errorEl.textContent = err.message.replace("Firebase: ", "");
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

    if (!email || !password) {
      errorEl.textContent = "Email and password are required.";
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "dashboard.html";
    } catch (err) {
      errorEl.textContent = "Invalid email or password.";
    }
  });
}
