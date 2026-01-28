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

      // Generate referral code
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

      // Send email verification
      await sendEmailVerification(user);

      successEl.textContent = "Account created! Verify your email to continue.";

      // Clear form
      signupForm.reset();

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
      const user = userCred.user;

      if (!user.emailVerified) {
        errorEl.textContent = "Please verify your email before logging in.";
        return;
      }

      successEl.textContent = "Login successful! Redirecting...";
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1000);

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
const forgotModal = document.getElementById("forgotPasswordModal");
const closeModal = document.getElementById("closeModal");
const resetPasswordBtn = document.getElementById("resetPasswordBtn");

if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener("click", (e) => {
    e.preventDefault();
    forgotModal.classList.remove("hidden");
  });
}

if (closeModal) {
  closeModal.addEventListener("click", () => {
    forgotModal.classList.add("hidden");
    document.getElementById("resetEmail").value = "";
    document.getElementById("resetError").textContent = "";
    document.getElementById("resetSuccess").textContent = "";
  });
}

if (resetPasswordBtn) {
  resetPasswordBtn.addEventListener("click", async () => {
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
      successEl.textContent = "Password reset link sent! Check your email.";
    } catch (err) {
      console.error(err);
      errorEl.textContent = err.message.replace("Firebase: ", "");
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
