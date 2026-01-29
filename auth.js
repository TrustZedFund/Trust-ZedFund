import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  ref,
  set,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

/* =====================
   SIGNUP
===================== */

const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = nameEl("name");
    const email = nameEl("email");
    const password = nameEl("password");
    const referral = nameEl("referral");

    const error = document.getElementById("signupError");
    const success = document.getElementById("signupSuccess");
    error.textContent = "";
    success.textContent = "";

    if (password.length < 6) {
      error.textContent = "Password must be at least 6 characters.";
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      await set(ref(db, `users/${cred.user.uid}`), {
        name,
        email,
        referralCode: "TZF" + Math.floor(100000 + Math.random() * 900000),
        referredBy: referral || null,
        createdAt: serverTimestamp(),
        balances: {
          deposit: 0,
          earnings: 0,
          referral: 0
        }
      });

      success.textContent = "Account created successfully. Please login.";
      signupForm.reset();

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);

    } catch (err) {
      error.textContent = err.message.replace("Firebase: ", "");
    }
  });
}

/* =====================
   LOGIN
===================== */

const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = nameEl("loginEmail");
    const password = nameEl("loginPassword");
    const error = document.getElementById("loginError");
    error.textContent = "";

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "dashboard.html";
    } catch {
      error.textContent = "Invalid email or password.";
    }
  });
}

/* =====================
   RESET PASSWORD MODAL
===================== */

const modal = document.getElementById("resetModal");

document.getElementById("openReset")?.addEventListener("click", (e) => {
  e.preventDefault();
  modal.style.display = "flex";
});

document.getElementById("closeReset")?.addEventListener("click", () => {
  modal.style.display = "none";
});

document.getElementById("sendReset")?.addEventListener("click", async () => {
  const email = nameEl("resetEmail");
  const msg = document.getElementById("resetMsg");
  msg.textContent = "";

  if (!email) {
    msg.textContent = "Enter your email address.";
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    msg.textContent = "Password reset link sent. Check your email.";
  } catch (err) {
    msg.textContent = err.message.replace("Firebase: ", "");
  }
});

/* =====================
   HELPER
===================== */

function nameEl(id) {
  return document.getElementById(id)?.value.trim() || "";
}
/* =====================
   PASSWORD VISIBILITY
===================== */

document.querySelectorAll(".toggle-eye").forEach(eye => {
  eye.addEventListener("click", () => {
    const input = document.getElementById(eye.dataset.target);
    if (!input) return;

    if (input.type === "password") {
      input.type = "text";
      eye.textContent = "🙈";
    } else {
      input.type = "password";
      eye.textContent = "👁️";
    }
  });
});
