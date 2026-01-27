import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  ref,
  get,
  set,
  update,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

/* =========================
   GLOBALS
========================= */
let confirmationResult = null;

/* =========================
   SIGNUP (EMAIL)
========================= */
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();
    const phone = document.getElementById("phone")?.value.trim();
    const referralCode = document.getElementById("referral")?.value.trim();

    const errorEl = document.getElementById("signupError");
    errorEl.textContent = "";

    if (!name || !email || !password || !phone) {
      errorEl.textContent = "All fields are required.";
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      const myReferralCode = "TZF" + Math.floor(100000 + Math.random() * 900000);

      await set(ref(db, `users/${user.uid}`), {
        name,
        email,
        phone,
        referralCode: myReferralCode,
        referredBy: referralCode || null,
        balances: { deposit: 0, earnings: 0, referral: 0 },
        createdAt: serverTimestamp()
      });

      if (referralCode) {
        const snap = await get(ref(db, "users"));
        if (snap.exists()) {
          const users = snap.val();
          const referrerId = Object.keys(users)
            .find(uid => users[uid].referralCode === referralCode);

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
      errorEl.textContent = err.message.replace("Firebase: ", "");
    }
  });
}

/* =========================
   LOGIN (EMAIL)
========================= */
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value.trim();
    const errorEl = document.getElementById("loginError");

    errorEl.textContent = "";

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "dashboard.html";
    } catch {
      errorEl.textContent = "Invalid email or password.";
    }
  });
}

/* =========================
   PHONE OTP LOGIN
========================= */
const sendOtpBtn = document.getElementById("sendOtpBtn");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");

if (sendOtpBtn) {
  window.recaptchaVerifier = new RecaptchaVerifier(
    auth,
    "recaptcha-container",
    { size: "invisible" }
  );

  sendOtpBtn.addEventListener("click", async () => {
    const phone = document.getElementById("phone")?.value.trim();
    const msg = document.getElementById("loginMsg");

    if (!phone || !phone.startsWith("+260")) {
      msg.textContent = "Use format +2609XXXXXXXX";
      return;
    }

    try {
      confirmationResult = await signInWithPhoneNumber(
        auth,
        phone,
        window.recaptchaVerifier
      );
      document.getElementById("otpModal").style.display = "flex";
      msg.textContent = "OTP sent via SMS";
    } catch (err) {
      msg.textContent = "OTP failed. Try again.";
    }
  });
}

if (verifyOtpBtn) {
  verifyOtpBtn.addEventListener("click", async () => {
    const code = document.getElementById("otpCode")?.value.trim();
    const msg = document.getElementById("otpMsg");

    if (!code || code.length !== 6) {
      msg.textContent = "Enter valid OTP";
      return;
    }

    try {
      await confirmationResult.confirm(code);
      window.location.href = "dashboard.html";
    } catch {
      msg.textContent = "Invalid or expired OTP";
    }
  });
}

/* =========================
   SESSION PROTECT
========================= */
onAuthStateChanged(auth, (user) => {
  if (!user && window.location.pathname.includes("dashboard")) {
    window.location.href = "login.html";
  }
});
