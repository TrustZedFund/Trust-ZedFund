import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

/* =========================
   LOGIN FORM
========================= */
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!email || !password) {
      loginError.textContent = "Enter email and password.";
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error(err);
      loginError.textContent = "Invalid email or password.";
    }
  });
}

/* =========================
   RESET PASSWORD MODAL
========================= */
const resetModal = document.getElementById("resetModal");
const openResetModal = document.getElementById("openResetModal");
const closeResetModal = document.getElementById("closeResetModal");
const sendResetEmail = document.getElementById("sendResetEmail");
const resetEmailInput = document.getElementById("resetEmail");
const resetMsg = document.getElementById("resetMsg");

openResetModal.addEventListener("click", (e) => {
  e.preventDefault();
  resetMsg.textContent = "";
  resetEmailInput.value = "";
  resetModal.style.display = "flex";
});

closeResetModal.addEventListener("click", () => {
  resetModal.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target === resetModal) {
    resetModal.style.display = "none";
  }
});

sendResetEmail.addEventListener("click", async () => {
  resetMsg.textContent = "";
  const email = resetEmailInput.value.trim();
  if (!email) {
    resetMsg.textContent = "Enter your email.";
    resetMsg.className = "modal-msg error";
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    resetMsg.textContent = "Reset email sent! Check your inbox.";
    resetMsg.className = "modal-msg success";
  } catch (err) {
    console.error(err);
    resetMsg.textContent = "Failed to send reset email. Check your email.";
    resetMsg.className = "modal-msg error";
  }
});

/* =========================
   SESSION PROTECT
========================= */
onAuthStateChanged(auth, (user) => {
  if (user && window.location.pathname.includes("login")) {
    window.location.href = "dashboard.html";
  }
});
