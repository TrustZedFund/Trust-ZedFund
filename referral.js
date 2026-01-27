import { auth, db } from "./firebase.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

let referralCode = "";
let referralLink = "";

/* =========================
   AUTH + LOAD REFERRAL
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Please log in to view referral info.");
    window.location.href = "index.html";
    return;
  }

  const userId = user.uid;

  // Fetch referral code from Firebase
  try {
    const snap = await get(ref(db, `users/${userId}/referralCode`));
    if (snap.exists()) {
      referralCode = snap.val();
      referralLink = `${window.location.origin}/register.html?ref=${referralCode}`;
      document.getElementById("referralLink").value = referralLink;
    } else {
      alert("Referral code not found for your account.");
    }
  } catch (err) {
    console.error(err);
    alert("Failed to load referral info. Try again.");
  }
});

/* =========================
   CLIPBOARD FUNCTIONS
========================= */
export function copyReferral() {
  if (!referralLink) return alert("Referral link not available yet");
  navigator.clipboard.writeText(referralLink)
    .then(() => alert("Referral link copied!"))
    .catch(() => alert("Failed to copy link"));
}

export function copyRefCode() {
  if (!referralCode) return alert("Referral code not available yet");
  navigator.clipboard.writeText(referralCode)
    .then(() => alert("Referral code copied!"))
    .catch(() => alert("Failed to copy code"));
}

/* =========================
   SHARE FUNCTIONS
========================= */
export function shareWhatsApp() {
  if (!referralCode) return alert("Referral code not available yet");
  const text = `Join Trust ZedFund using my referral code: ${referralCode}\n${referralLink}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

export function shareLink() {
  if (!navigator.share) {
    // fallback: copy to clipboard
    copyReferral();
    alert("Your device does not support native share. Link copied to clipboard.");
    return;
  }
  navigator.share({
    title: "Trust ZedFund - Refer & Earn",
    text: `Join using my referral code: ${referralCode}`,
    url: referralLink
  }).catch(err => console.error(err));
}
