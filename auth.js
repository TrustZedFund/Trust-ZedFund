import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  ref,
  set,
  update,
  get,
  push
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

/* ======================
   AUTO REFERRAL
====================== */
const params = new URLSearchParams(window.location.search);
const refCode = params.get("ref");
if (refCode && document.getElementById("referral")) {
  document.getElementById("referral").value = refCode;
}

/* ======================
   SIGNUP
====================== */
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const referral = document.getElementById("referral").value.trim();

    const errorBox = document.getElementById("signupError");
    const btnText = document.getElementById("signupText");
    const loader = document.getElementById("signupLoader");

    errorBox.textContent = "";
    btnText.style.display = "none";
    loader.style.display = "inline";

    try {
      // Create user
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      // Initialize user in Realtime DB
      await set(ref(db, "users/" + uid), {
        firstName: name,
        email,
        referredBy: referral || null,
        depositWallet: 0,
        earningsWallet: 0,
        referralWallet: 0,
        createdAt: Date.now()
      });

      alert("Signup successful. Please login.");
      window.location.href = "login.html";

    } catch (err) {
      errorBox.textContent =
        err.code === "auth/email-already-in-use"
          ? "Email already registered."
          : err.code === "auth/weak-password"
          ? "Password must be at least 6 characters."
          : err.message || "Signup failed.";

      btnText.style.display = "inline";
      loader.style.display = "none";
    }
  });
}

/* ======================
   LOGIN
====================== */
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const errorBox = document.getElementById("loginError");
    const btnText = document.getElementById("loginText");
    const loader = document.getElementById("loginLoader");

    errorBox.textContent = "";
    btnText.style.display = "none";
    loader.style.display = "inline";

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "dashboard.html";

    } catch (err) {
      errorBox.textContent =
        err.code === "auth/user-not-found"
          ? "No account found with this email."
          : err.code === "auth/wrong-password"
          ? "Incorrect password."
          : err.message || "Login failed.";

      btnText.style.display = "inline";
      loader.style.display = "none";
    }
  });
}

/* ======================
   HANDLE DEPOSITS
====================== */
export async function handleDeposit(userId, depositAmount) {
  const userSnap = await get(ref(db, "users/" + userId));
  const userData = userSnap.val();

  if (!userData) throw new Error("User not found");

  // Update deposit wallet
  const newDepositWallet = (userData.depositWallet || 0) + depositAmount;
  await update(ref(db, "users/" + userId), {
    depositWallet: newDepositWallet
  });

  // Add transaction record
  await push(ref(db, `transactions/${userId}`), {
    type: "deposit",
    amount: depositAmount,
    date: Date.now(),
    status: "pending"
  });

  // Apply referral bonus
  if (userData.referredBy) {
    const refId = userData.referredBy;
    const refSnap = await get(ref(db, "users/" + refId));
    if (refSnap.exists()) {
      const refUser = refSnap.val();
      const bonusPercent = 0.05; // 5%
      const bonus = depositAmount * bonusPercent;

      await update(ref(db, "users/" + refId), {
        referralWallet: (refUser.referralWallet || 0) + bonus
      });

      // Log referral bonus
      await push(ref(db, `referrals/${refId}`), {
        from: userId,
        amount: depositAmount,
        bonus,
        date: Date.now()
      });
    }
  }
}
