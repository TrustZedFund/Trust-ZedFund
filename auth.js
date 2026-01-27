import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  confirmPasswordReset
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
        balances: { deposit: 0, earnings: 0, referral: 0 },
        createdAt: serverTimestamp()
      };

      await set(ref(db, `users/${user.uid}`), userData);

      // Credit referrer if any
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
const forgotModal = document.getElementById("forgotModal");
const forgotLink = document.getElementById("forgotPasswordLink");
const closeModal = document.getElementById("closeForgotModal");
const sendBtn = document.getElementById("sendResetEmailBtn");
const resetEmailInput = document.getElementById("resetEmail");
const resetMessage = document.getElementById("resetMessage");

// Open modal
if (forgotLink && forgotModal) {
  forgotLink.addEventListener("click", (e) => {
    e.preventDefault();
    resetMessage.textContent = "";
    resetEmailInput.value = "";
    forgotModal.style.display = "flex";
  });
}

// Close modal
if (closeModal) {
  closeModal.addEventListener("click", () => forgotModal.style.display = "none");
}
window.addEventListener("click", (e) => {
  if (e.target === forgotModal) forgotModal.style.display = "none";
});

// Send reset email
if (sendBtn) {
  sendBtn.addEventListener("click", async () => {
    const email = resetEmailInput.value.trim();
    resetMessage.textContent = "";
    if (!email) {
      resetMessage.style.color = "red";
      resetMessage.textContent = "Enter your email.";
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email, {
        url: window.location.origin + "/reset-password.html"
      });
      resetMessage.style.color = "green";
      resetMessage.textContent = "Reset email sent! Check your inbox.";
    } catch (err) {
      console.error(err);
      resetMessage.style.color = "red";
      resetMessage.textContent = "Failed to send reset email. Check your email address.";
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
