import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
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
   SIGNUP HANDLER
========================= */
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();
    const referralCode = document.getElementById("referral")?.value.trim();

    const errorEl = document.getElementById("signupError");
    errorEl.textContent = "";

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
        balances: {
          deposit: 0,
          earnings: 0,
          referral: 0
        },
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

            await update(ref(db, `users/${referrerId}/balances`), {
              referral: current + 5
            });
          }
        }
      }

      window.location.href = "dashboard.html";

    } catch (err) {
      console.error(err);
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

    const email = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value.trim();

    const errorEl = document.getElementById("loginError");
    errorEl.textContent = "";

    if (!email || !password) {
      errorEl.textContent = "Enter email and password.";
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "dashboard.html";

    } catch (err) {
      console.error(err);
      errorEl.textContent = "Invalid email or password.";
    }
  });
}

/* =========================
   FORGOT PASSWORD MODAL
========================= */
const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const forgotPasswordModal = document.getElementById("forgotPasswordModal");
const closeModal = document.getElementById("closeModal");
const sendResetBtn = document.getElementById("sendResetBtn");
const resetEmailInput = document.getElementById("resetEmail");

forgotPasswordLink?.addEventListener("click", (e) => {
  e.preventDefault();
  forgotPasswordModal.classList.remove("hidden");
});

closeModal?.addEventListener("click", () => {
  forgotPasswordModal.classList.add("hidden");
});

sendResetBtn?.addEventListener("click", async () => {
  const email = resetEmailInput.value.trim();
  if (!email) {
    alert("Enter your email.");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Password reset email sent! Check your inbox.");
    resetEmailInput.value = "";
    forgotPasswordModal.classList.add("hidden");
  } catch (err) {
    console.error(err);
    alert(err.message.replace("Firebase: ", ""));
  }
});

/* =========================
   SESSION PROTECT
========================= */
onAuthStateChanged(auth, (user) => {
  const path = window.location.pathname;

  if (!user && path.includes("dashboard")) {
    window.location.href = "login.html";
  }
});
