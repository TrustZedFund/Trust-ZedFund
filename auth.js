import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  ref,
  set,
  push,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

/* ================= SIGN UP ================= */

const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // ✅ GET ELEMENTS PROPERLY
    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const referralInput = document.getElementById("referral");

    const signupError = document.getElementById("signupError");
    const signupSuccess = document.getElementById("signupSuccess");

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const referral = referralInput?.value.trim() || null;

    signupError.textContent = "";
    signupSuccess.textContent = "";

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      const referralCode =
        "TZF" + Math.floor(100000 + Math.random() * 900000);

      await set(ref(db, `users/${user.uid}`), {
        name,
        email,
        referralCode,
        referredBy: referral,
        balances: {
          deposit: 0,
          earnings: 0,
          referral: 0
        },
        createdAt: serverTimestamp()
      });

      await push(ref(db, `notifications/${user.uid}`), {
        message: "🎉 Welcome to Trust ZedFund!",
        read: false,
        time: Date.now(),
        type: "welcome"
      });

      signupSuccess.textContent = "Account created! Redirecting…";

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);

    } catch (err) {
      signupError.textContent = err.message;
      console.error(err);
    }
  });
}
