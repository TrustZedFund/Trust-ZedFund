import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  ref,
  set,
  get,
  update,
  child
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// 🔹 Auto-fill referral from URL
const params = new URLSearchParams(window.location.search);
const urlReferral = params.get("ref");
if (urlReferral) {
  document.getElementById("referral").value = urlReferral;
}

const signupForm = document.getElementById("signupForm");
const signupError = document.getElementById("signupError");
const signupText = document.getElementById("signupText");
const signupLoader = document.getElementById("signupLoader");

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  signupError.textContent = "";

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const referralCode = document.getElementById("referral").value.trim();

  signupText.style.display = "none";
  signupLoader.style.display = "inline";

  try {
    // 1) Create user
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    await updateProfile(user, { displayName: name });

    // 2) Validate referral code (if provided)
    let referredByUID = null;

    if (referralCode) {
      const usersRef = ref(db, "users");
      const snapshot = await get(usersRef);

      if (snapshot.exists()) {
        const users = snapshot.val();

        for (const uid in users) {
          if (users[uid].referralCode === referralCode) {
            referredByUID = uid;
            break;
          }
        }
      }

      if (!referredByUID) {
        signupText.style.display = "inline";
        signupLoader.style.display = "none";
        signupError.textContent = "Invalid referral code.";
        return;
      }
    }

    // 3) Generate referral code for new user
    const newReferralCode = "TZF-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    // 4) Save user record
    const userData = {
      uid: user.uid,
      name,
      email,
      referralCode: newReferralCode,
      referredBy: referralCode || null,
      balance: 0,
      referralEarnings: 0,
      createdAt: Date.now()
    };

    await set(ref(db, "users/" + user.uid), userData);

    // 5) Credit referrer (optional starter bonus logic)
    if (referredByUID) {
      const referrerRef = ref(db, "users/" + referredByUID);
      const referrerSnap = await get(referrerRef);

      if (referrerSnap.exists()) {
        const current = referrerSnap.val().referralEarnings || 0;

        await update(referrerRef, {
          referralEarnings: current + 0, // 💡 set signup bonus later if needed
        });

        // Optional: Track referral tree
        await set(ref(db, `referrals/${referredByUID}/${user.uid}`), {
          email,
          joinedAt: Date.now()
        });
      }
    }

    // 6) Redirect
    window.location.href = "dashboard.html";

  } catch (err) {
    signupError.textContent = err.message;
  }

  signupText.style.display = "inline";
  signupLoader.style.display = "none";
});
