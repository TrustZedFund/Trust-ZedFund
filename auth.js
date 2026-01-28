import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { ref, set, update, serverTimestamp, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

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
const forgotModal = document.getElementById("forgotPasswordModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const sendResetBtn = document.getElementById("sendResetBtn");
const resetEmailInput = document.getElementById("resetEmail");
const resetMessage = document.getElementById("resetMessage");

forgotPasswordLink.addEventListener("click", (e) => {
  e.preventDefault();
  resetEmailInput.value = "";
  resetMessage.textContent = "";
  forgotModal.classList.add("show");
});

closeModalBtn.addEventListener("click", () => {
  forgotModal.classList.remove("show");
});

sendResetBtn.addEventListener("click", async () => {
  const email = resetEmailInput.value.trim();
  resetMessage.textContent = "";
  resetMessage.classList.remove("error");

  if (!email) {
    resetMessage.textContent = "Enter your email.";
    resetMessage.classList.add("error");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email, {
      url: window.location.origin + "/login.html"
    });
    resetMessage.textContent = "Reset link sent! Check your email.";
  } catch (err) {
    console.error(err);
    resetMessage.textContent = "Failed to send. Check your email.";
    resetMessage.classList.add("error");
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
