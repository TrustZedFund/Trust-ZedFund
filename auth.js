import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { ref, set, get, update, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

/* =========================
   SIGNUP HANDLER
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

    if (!name || !email || !password) {
      errorEl.textContent = "All fields are required.";
      return;
    }

    if (password.length < 6) {
      errorEl.textContent = "Password must be at least 6 characters.";
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      const myReferralCode = "TZF" + Math.floor(100000 + Math.random() * 900000);

      const userData = {
        name,
        email,
        referralCode: myReferralCode,
        referredBy: referralCode || null,
        balances: { deposit: 0, earnings: 0, referral: 0 },
        createdAt: serverTimestamp()
      };

      await set(ref(db, `users/${user.uid}`), userData);

      // Credit referrer
      if (referralCode) {
        const usersRef = ref(db, "users");
        const snap = await get(usersRef);
        if (snap.exists()) {
          const users = snap.val();
          const referrerId = Object.keys(users).find(uid => users[uid].referralCode === referralCode);
          if (referrerId) {
            const balRef = ref(db, `users/${referrerId}/balances/referral`);
            const balSnap = await get(balRef);
            const current = balSnap.exists() ? Number(balSnap.val()) : 0;
            await update(ref(db, `users/${referrerId}/balances`), { referral: current + 5 });
          }
        }
      }

      successEl.textContent = "Account created successfully! Redirecting...";
      setTimeout(() => window.location.href = "dashboard.html", 1200);

    } catch (err) {
      errorEl.textContent = err.message.replace("Firebase: ", "");
    }
  });
}

/* =========================
   LOGIN HANDLER
========================= */
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    const errorEl = document.getElementById("loginError");
    const successEl = document.getElementById("loginSuccess");
    errorEl.textContent = "";
    successEl.textContent = "";

    if (!email || !password) {
      errorEl.textContent = "Enter email and password.";
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      successEl.textContent = "Login successful! Redirecting...";
      setTimeout(() => window.location.href = "dashboard.html", 800);
    } catch (err) {
      errorEl.textContent = "Invalid email or password.";
    }
  });
}

/* =========================
   FORGOT PASSWORD HANDLER
========================= */
const forgotLink = document.getElementById("forgotPasswordLink");
const forgotModal = document.getElementById("forgotPasswordModal");
const closeModal = document.getElementById("closeForgotModal");
const resetBtn = document.getElementById("resetPasswordBtn");

if (forgotLink && forgotModal) {
  forgotLink.addEventListener("click", (e) => {
    e.preventDefault();
    forgotModal.classList.remove("hidden");
  });
}

if (closeModal && forgotModal) {
  closeModal.addEventListener("click", () => forgotModal.classList.add("hidden"));
}

if (resetBtn) {
  resetBtn.addEventListener("click", async () => {
    const email = document.getElementById("resetEmail").value.trim();
    const errorEl = document.getElementById("resetError");
    const successEl = document.getElementById("resetSuccess");
    errorEl.textContent = "";
    successEl.textContent = "";

    if (!email) {
      errorEl.textContent = "Enter your email.";
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      successEl.textContent = "Reset link sent! Check your email.";
    } catch (err) {
      errorEl.textContent = err.message.replace("Firebase: ", "");
    }
  });
}

/* =========================
   SESSION PROTECTION
========================= */
onAuthStateChanged(auth, (user) => {
  const path = window.location.pathname;
  if (!user && path.includes("dashboard")) {
    window.location.href = "login.html";
  }
});
