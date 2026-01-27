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
   FORGOT PASSWORD FLOW INSIDE MODAL
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
    // Check if user exists in Firebase
    const usersSnap = await get(ref(db, "users"));
    if (!usersSnap.exists()) {
      throw new Error("No users found.");
    }

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
    // Update password using Firebase Auth
    await auth.updatePassword(await auth.signInWithEmailAndPassword(resetUser.email, newPass));
    
    resetMessage.style.color = "green";
    resetMessage.textContent = "Password reset successful! You can now login.";
    
    // Clear inputs
    newPasswordInput.value = "";
    confirmPasswordInput.value = "";

    setTimeout(() => {
      forgotModal.classList.add("hidden");
    }, 2000);

  } catch (err) {
    resetMessage.style.color = "red";
    resetMessage.textContent = "Failed to reset password. Try again.";
    console.error(err);
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
