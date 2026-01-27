import { auth, db } from "./firebase.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

let referralCode = "";
let referralLink = "";

// 🔐 Load referral code from Firebase
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Session expired. Please log in again.");
    window.location.href = "login.html";
    return;
  }

  const snap = await get(ref(db, `users/${user.uid}/referralCode`));

  if (!snap.exists()) {
    alert("Referral code not found.");
    return;
  }

  referralCode = snap.val();

  // 🔥 HARD-CODED correct GitHub Pages base
  const baseUrl = "https://trustzedfund.github.io/Trust-ZedFund/";

  referralLink = `${baseUrl}register.html?ref=${referralCode}`;

  document.getElementById("referralLink").value = referralLink;
});

/* =========================
   CLIPBOARD FUNCTIONS
========================= */

window.copyRefCode = function () {
  if (!referralCode) {
    alert("Referral code not loaded yet.");
    return;
  }

  navigator.clipboard.writeText(referralCode)
    .then(() => alert("Referral code copied to clipboard!"));
};

window.copyReferral = function () {
  if (!referralLink) {
    alert("Referral link not loaded yet.");
    return;
  }

  navigator.clipboard.writeText(referralLink)
    .then(() => alert("Referral link copied to clipboard!"));
};

window.shareWhatsApp = function () {
  if (!referralLink) {
    alert("Referral link not loaded yet.");
    return;
  }

  const text = `Join Trust ZedFund using my referral link:\n${referralLink}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
};

window.shareLink = function () {
  if (!referralLink) {
    alert("Referral link not loaded yet.");
    return;
  }

  if (navigator.share) {
    navigator.share({
      title: "Trust ZedFund Invitation",
      text: "Join Trust ZedFund using my referral link",
      url: referralLink
    });
  } else {
    copyReferral();
  }
};
