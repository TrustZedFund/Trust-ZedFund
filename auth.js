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
   SIGNUP HANDLER (unchanged)
========================= */
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const phone = document.getElementById("phone")?.value.trim();
    const password = document.getElementById("password")?.value.trim();
    const referralCode = document.getElementById("referral")?.value.trim();
    const errorEl = document.getElementById("signupError");
    errorEl.textContent = "";

    if (!name || !password || (!email && !phone)) {
      errorEl.textContent = "Enter name, password, and either email or phone.";
      return;
    }
    if (password.length < 6) {
      errorEl.textContent = "Password must be at least 6 characters.";
      return;
    }

    try {
      const authEmail = email || phone + "@trustzedfund.local";
      const userCred = await createUserWithEmailAndPassword(auth, authEmail, password);
      const user = userCred.user;

      const myReferralCode = "TZF" + Math.floor(100000 + Math.random() * 900000);

      const userData = {
        name,
        email: email || null,
        phone: phone || null,
        referralCode: myReferralCode,
        referredBy: referralCode || null,
        balances: { deposit: 0, earnings: 0, referral: 0 },
        createdAt: serverTimestamp()
      };

      await set(ref(db, `users/${user.uid}`), userData);

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
    const identifier = document.getElementById("loginIdentifier")?.value.trim();
    const password = document.getElementById("loginPassword")?.value.trim();
    const errorEl = document.getElementById("loginError");
    errorEl.textContent = "";

    if (!identifier || !password) {
      errorEl.textContent = "Enter email/phone and password.";
      return;
    }

    try {
      if (identifier.includes("@")) {
        await signInWithEmailAndPassword(auth, identifier, password);
      } else {
        const snap = await get(ref(db, "users"));
        const users = snap.val();
        const uid = Object.keys(users).find(u => users[u].phone === identifier);
        if (!uid) throw new Error("Phone number not found");
        const userEmail = users[uid].email || users[uid].phone + "@trustzedfund.local";
        await signInWithEmailAndPassword(auth, userEmail, password);
      }
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error(err);
      errorEl.textContent = "Invalid credentials.";
    }
  });
}

/* =========================
   FORGOT PASSWORD MODAL
========================= */
const forgotLink = document.getElementById("forgotPasswordLink");
const modal = document.getElementById("forgotModal");
const closeModal = document.getElementById("modalClose");
const resetBtn = document.getElementById("resetPasswordBtn");
const resetInput = document.getElementById("resetIdentifier");
const resetMessage = document.getElementById("resetMessage");

forgotLink.addEventListener("click", () => modal.style.display = "block");
closeModal.addEventListener("click", () => modal.style.display = "none");
window.addEventListener("click", e => { if(e.target == modal) modal.style.display = "none"; });

resetBtn.addEventListener("click", async () => {
  const identifier = resetInput.value.trim();
  resetMessage.textContent = "";
  resetMessage.className = "";

  if (!identifier) {
    resetMessage.textContent = "Enter email or phone.";
    resetMessage.className = "error-text";
    return;
  }

  try {
    if (identifier.includes("@")) {
      // Email users
      await sendPasswordResetEmail(auth, identifier);
      resetMessage.textContent = "Password reset email sent!";
      resetMessage.className = "success-text";
    } else {
      // Phone users - simulate password reset
      const snap = await get(ref(db, "users"));
      const users = snap.val();
      const uid = Object.keys(users).find(u => users[u].phone === identifier);
      if (!uid) throw new Error("Phone not found");

      // For phone, we can reset to default temp password 123456 and prompt user to login and change
      const tempPassword = "123456";
      const emailForAuth = users[uid].email || users[uid].phone + "@trustzedfund.local";
      await update(ref(db, `users/${uid}`), { tempPassword: tempPassword });

      resetMessage.textContent = `Temporary password set. Login with 123456 and change it.`;
      resetMessage.className = "success-text";
    }
  } catch (err) {
    console.error(err);
    resetMessage.textContent = err.message.replace("Firebase: ", "");
    resetMessage.className = "error-text";
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
