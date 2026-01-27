import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

import {
  ref,
  set,
  get,
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

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const password = passwordInput.value.trim();
    const referralCode = referralInput.value.trim();

    signupError.textContent = "";

    if (!name || !email || !phone || !password) {
      signupError.textContent = "All fields are required.";
      return;
    }

    if (password.length < 6) {
      signupError.textContent = "Password must be at least 6 characters.";
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      const myReferral = "TZF" + Math.floor(100000 + Math.random() * 900000);

      await set(ref(db, `users/${user.uid}`), {
        name,
        email,
        phone,
        referralCode: myReferral,
        referredBy: referralCode || null,
        balances: {
          deposit: 0,
          earnings: 0,
          referral: 0
        },
        createdAt: serverTimestamp()
      });

      // Referral reward
      if (referralCode) {
        const snap = await get(ref(db, "users"));
        if (snap.exists()) {
          const users = snap.val();
          const referrerId = Object.keys(users).find(
            uid => users[uid].referralCode === referralCode
          );

          if (referrerId) {
            const balRef = ref(db, `users/${referrerId}/balances/referral`);
            const balSnap = await get(balRef);
            const current = balSnap.exists() ? Number(balSnap.val()) : 0;

            await update(ref(db, `users/${referrerId}/balances`), {
              referral: current + 5
            });
          }
        }
      }

      window.location.href = "dashboard.html";

    } catch (err) {
      signupError.textContent = err.message.replace("Firebase: ", "");
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

    const input = loginInput.value.trim();
    const password = loginPassword.value.trim();

    loginError.textContent = "";

    if (!input || !password) {
      loginError.textContent = "Enter credentials.";
      return;
    }

    // Phone → convert to email lookup
    let email = input;
    if (input.startsWith("+")) {
      const snap = await get(ref(db, "users"));
      if (!snap.exists()) {
        loginError.textContent = "Account not found.";
        return;
      }
      const users = snap.val();
      const match = Object.values(users).find(u => u.phone === input);
      if (!match) {
        loginError.textContent = "Account not found.";
        return;
      }
      email = match.email;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "dashboard.html";
    } catch {
      loginError.textContent = "Invalid login credentials.";
    }
  });
}

/* =========================
   FORGOT PASSWORD
========================= */
window.resetPassword = async function () {
  const email = resetEmail.value.trim();
  resetMsg.textContent = "";

  if (!email) {
    resetMsg.textContent = "Enter your email.";
    resetMsg.className = "error-text";
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    resetMsg.textContent = "Password reset link sent. Check your email.";
    resetMsg.className = "success-text";
  } catch {
    resetMsg.textContent = "Failed to send reset email.";
    resetMsg.className = "error-text";
  }
};

/* =========================
   SESSION GUARD
========================= */
onAuthStateChanged(auth, (user) => {
  if (!user && location.pathname.includes("dashboard")) {
    location.href = "login.html";
  }
});
