import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  ref,
  get,
  set,
  update,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

/* =========================
   SIGNUP
========================= */
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const referralCode = document.getElementById("referral").value.trim();

    const errorEl = document.getElementById("signupError");
    const successEl = document.getElementById("signupSuccess");

    errorEl.textContent = "";
    successEl.textContent = "";

    if (password.length < 6) {
      errorEl.textContent = "Password must be at least 6 characters.";
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      const myReferralCode = "TZF" + Math.floor(100000 + Math.random() * 900000);

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

      successEl.textContent = "Account created successfully. Please log in.";
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);

    } catch (err) {
      errorEl.textContent = err.message.replace("Firebase: ", "");
    }
  });
}


/* Save user */
await set(ref(db, "users/" + user.uid), {
  name,
  email,
  referralUsed: referral || null,
  createdAt: Date.now()
});

/* 🔔 Welcome notification */
await push(ref(db, "notifications/" + user.uid), {
  message: "🎉 Welcome to Trust ZedFund! Start investing wisely.",
  read: false,
  time: Date.now(),
  type: "welcome"
});

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
      errorEl.textContent = "Invalid email or password.";
    }
  });
}
