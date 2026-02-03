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
