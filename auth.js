import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged
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

      // Referral bonus
      if (referralCode) {
        const usersRef = ref(db, "users");
        const snap = await get(usersRef);
        if (snap.exists()) {
          const users = snap.val();
          const referrerId = Object.keys(users).find(
            uid => users[uid].referralCode === referralCode
          );
          if (referrerId) {
            const balRef = ref(db, `users/${referrerId}/balances/referral`);
            const balSnap = await get(balRef);
            const current = balSnap.exists() ? Number(balSnap.val()) : 0;
            await update(ref(db, `users/${referrerId}/balances`), { referral: current + 5 });
          }
        }
      }

      await sendEmailVerification(user);
      successEl.textContent = "Account created! Please verify your email before login.";

    } catch (err) {
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
    const successEl = document.getElementById("loginSuccess");
    errorEl.textContent = "";
    successEl.textContent = "";

    if (!email || !password) {
      errorEl.textContent = "Enter email and password.";
      return;
    }

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      if (!userCred.user.emailVerified) {
        errorEl.textContent = "Please verify your email before login.";
        return;
      }
      successEl.textContent = "Login successful! Redirecting...";
      setTimeout(() => { window.location.href = "dashboard.html"; }, 800);
    } catch (err) {
      errorEl.textContent = "Invalid email or password.";
    }
  });
}

/* =========================
   RESET PASSWORD
========================= */
const showModalBtn = document.getElementById("showResetModal");
const resetModal = document.getElementById("resetModal");
const closeModalBtn = document.getElementById("closeResetModal");
const resetBtn = document.getElementById("resetPasswordBtn");

if (showModalBtn && resetModal) {
  showModalBtn.onclick = () => resetModal.style.display = "block";
  closeModalBtn.onclick = () => resetModal.style.display = "none";
  window.onclick = (e) => { if (e.target == resetModal) resetModal.style.display = "none"; }
}

if (resetBtn) {
  resetBtn.addEventListener("click", async () => {
    const email = document.getElementById("resetEmail").value.trim();
    const errorEl = document.getElementById("resetError");
    const successEl = document.getElementById("resetSuccess");
    errorEl.textContent = "";
    successEl.textContent = "";

    if (!email) { errorEl.textContent = "Enter your email."; return; }

    try {
      await sendPasswordResetEmail(auth, email);
      successEl.textContent = "Reset email sent! Check your inbox.";
    } catch (err) {
      errorEl.textContent = "Failed to send reset email. Check your email address.";
    }
  });
}

/* =========================
   SESSION PROTECT
========================= */
onAuthStateChanged(auth, (user) => {
  const path = window.location.pathname;
  if (!user && path.includes("dashboard")) {
    window.location.href = "login.html";
  }
});
