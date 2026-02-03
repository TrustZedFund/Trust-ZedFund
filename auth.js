import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  set,
  push
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const auth = getAuth();
const db = getDatabase();

/* -------------------- DOM -------------------- */
const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");

const fullNameInput = document.getElementById("fullNameInput");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const referralCodeInput = document.getElementById("referralCodeInput");

/* -------------------- HELPERS -------------------- */
function generateReferralCode(uid) {
  return uid.slice(0, 6).toUpperCase();
}

/* -------------------- SIGN UP -------------------- */
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const referredBy = referralCodeInput?.value.trim() || null;

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      const referralCode = generateReferralCode(user.uid);

      await set(ref(db, `users/${user.uid}`), {
        profile: {
          fullName,
          email,
          createdAt: Date.now()
        },
        balances: {
          deposit: 0,
          earnings: 0,
          referralWallet: 0
        },
        referral: {
          code: referralCode,
          referredBy
        }
      });

      await push(ref(db, `notifications/${user.uid}`), {
        message: "🎉 Welcome to Trust ZedFund!",
        read: false,
        time: Date.now(),
        type: "welcome"
      });

      window.location.href = "dashboard.html";

    } catch (err) {
      alert(err.message);
    }
  });
}

/* -------------------- LOGIN -------------------- */
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "dashboard.html";
    } catch (err) {
      alert(err.message);
    }
  });
}

/* -------------------- LOGOUT -------------------- */
window.logout = async function () {
  await signOut(auth);
  window.location.href = "login.html";
};

/* -------------------- AUTH GUARD -------------------- */
onAuthStateChanged(auth, (user) => {
  const protectedPages = ["dashboard.html", "wallet.html", "investments.html"];
  const currentPage = location.pathname.split("/").pop();

  if (!user && protectedPages.includes(currentPage)) {
    window.location.href = "login.html";
  }
});
