// Firebase imports
import { auth, db } from "./firebase.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// DOM elements
const referralLinkInput = document.getElementById("referralLink");

// Global user variable
let currentUser = null;
let referralLink = "";

/* =========================
   AUTH CHECK + LOAD REFERRAL
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("You must log in to access referrals.");
    window.location.href = "index.html";
    return;
  }

  currentUser = user;
  
  // Load referral code from Firebase
  try {
    const userRef = ref(db, `users/${user.uid}/referralCode`);
    const snap = await get(userRef);
    if (!snap.exists()) {
      alert("Referral code not found. Contact support.");
      return;
    }

    const referralCode = snap.val();
    referralLink = `${window.location.origin}/register.html?ref=${referralCode}`;
    referralLinkInput.value = referralLink;

  } catch (err) {
    console.error("Failed to load referral code:", err);
    alert("Error loading referral code. Try again later.");
  }
});

/* =========================
   COPY REFERRAL LINK TO CLIPBOARD
========================= */
export function copyReferral() {
  if (!referralLink) return alert("Referral link not ready yet.");
  
  navigator.clipboard.writeText(referralLink)
    .then(() => alert("Referral link copied to clipboard!"))
    .catch(() => alert("Failed to copy. Try manually."));
}

/* =========================
   COPY REFERRAL CODE ONLY TO CLIPBOARD
========================= */
export function copyRefCode() {
  if (!referralLink) return alert("Referral code not ready yet.");

  const code = referralLink.split("ref=")[1];
  navigator.clipboard.writeText(code)
    .then(() => alert("Referral code copied to clipboard!"))
    .catch(() => alert("Failed to copy. Try manually."));
}

/* =========================
   SHARE VIA WHATSAPP
========================= */
export function shareWhatsApp() {
  if (!referralLink) return alert("Referral link not ready yet.");

  const code = referralLink.split("ref=")[1];
  const text = `Join Trust ZedFund using my referral code: ${code}\n${referralLink}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

/* =========================
   UNIVERSAL SHARE (Any Platform)
========================= */
export async function shareLink() {
  if (!referralLink) return alert("Referral link not ready yet.");

  const code = referralLink.split("ref=")[1];
  const shareData = {
    title: "Join Trust ZedFund",
    text: `Use my referral code: ${code}`,
    url: referralLink
  };

  if (navigator.share) {
    // Native share supported
    try {
      await navigator.share(shareData);
    } catch (err) {
      console.error("Share failed:", err);
    }
  } else {
    // Fallback: open generic share page
    window.open(`https://www.addtoany.com/share#url=${encodeURIComponent(referralLink)}&title=${encodeURIComponent(shareData.title)}`, "_blank");
  }
}
