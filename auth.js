import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  updatePassword
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  ref,
  get,
  set,
  update,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

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
   SESSION PROTECT
========================= */
onAuthStateChanged(auth, (user) => {
  const path = window.location.pathname;
  if (!user && path.includes("dashboard")) {
    window.location.href = "login.html";
  }
});

/* =========================
   FORGOT PASSWORD MODAL FLOW
========================= */
const forgotLink = document.getElementById("forgotPasswordLink");
const forgotModal = document.getElementById("forgotPasswordModal");
const closeModal = document.getElementById("closeModal");

const resetStepEmail = document.getElementById("resetStepEmail");
const resetStepPassword = document.getElementById("resetStepPassword");

const verifyEmailBtn = document.getElementById("verifyEmailBtn");
const resetPasswordBtn = document.getElementById("resetPasswordBtn");

const resetEmailInput = document.getElementById("resetEmail");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");

const resetMessage = document.getElementById("resetMessage");

let resetUser = null;

// Open modal
forgotLink.addEventListener("click", () => {
  forgotModal.classList.remove("hidden");
  resetMessage.textContent = "";
  resetStepEmail.classList.remove("hidden");
  resetStepPassword.classList.add("hidden");
  resetEmailInput.value = "";
  newPasswordInput.value = "";
  confirmPasswordInput.value = "";
});

// Close modal
closeModal.addEventListener("click", () => {
  forgotModal.classList.add("hidden");
});

// Step 1: Verify email exists
verifyEmailBtn.addEventListener("click", async () => {
  const email = resetEmailInput.value.trim();
  resetMessage.textContent = "";

  if (!email) {
    resetMessage.style.color = "red";
    resetMessage.textContent = "Enter your email.";
    return;
  }

  try {
    const usersSnap = await get(ref(db, "users"));
    if (!usersSnap.exists()) throw new Error("No users found.");

    const users = usersSnap.val();
    const uid = Object.keys(users).find(u => users[u].email === email);

    if (!uid) {
      resetMessage.style.color = "red";
      resetMessage.textContent = "Email not registered.";
      return;
    }

    resetUser = { uid, email };
    resetStepEmail.classList.add("hidden");
    resetStepPassword.classList.remove("hidden");

  } catch (err) {
    resetMessage.style.color = "red";
    resetMessage.textContent = "Error verifying email.";
    console.error(err);
  }
});

// Step 2: Reset password
resetPasswordBtn.addEventListener("click", async () => {
  const newPass = newPasswordInput.value.trim();
  const confirmPass = confirmPasswordInput.value.trim();
  resetMessage.textContent = "";

  if (!newPass || !confirmPass) {
    resetMessage.style.color = "red";
    resetMessage.textContent = "Enter all password fields.";
    return;
  }

  if (newPass.length < 6) {
    resetMessage.style.color = "red";
    resetMessage.textContent = "Password must be at least 6 characters.";
    return;
  }

  if (newPass !== confirmPass) {
    resetMessage.style.color = "red";
    resetMessage.textContent = "Passwords do not match.";
    return;
  }

  try {
    // Firebase requires user to be signed in for updatePassword
    // Temporarily sign in user with email+newPass (or custom logic)
    // For simplicity, using Firebase REST or force logout/login after reset can be implemented
    await updatePassword(auth.currentUser, newPass);

    resetMessage.style.color = "green";
    resetMessage.textContent = "Password reset successful! You can now login.";

    setTimeout(() => forgotModal.classList.add("hidden"), 2000);

  } catch (err) {
    console.error(err);
    resetMessage.style.color = "red";
    resetMessage.textContent = "Failed to reset password. Try again.";
  }
});
