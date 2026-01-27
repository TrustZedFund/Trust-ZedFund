import { auth, db } from "./firebase.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const refCodeInput = document.getElementById("refCode");
const referralLinkInput = document.getElementById("referralLink");
const copyBtn = document.getElementById("copyBtn");
const shareBtn = document.getElementById("shareBtn");

let currentUserId = null;
let referralCode = null;

/* =========================
   AUTH + LOAD REFERRAL CODE
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Session expired. Please log in again.");
    window.location.href = "index.html";
    return;
  }

  currentUserId = user.uid;

  try {
    const userSnap = await get(ref(db, `users/${currentUserId}`));
    if (!userSnap.exists()) throw new Error("User data not found");

    const userData = userSnap.val();
    referralCode = userData.referralCode || userData.uid; // fallback to UID if no code

    if (refCodeInput) refCodeInput.value = referralCode;

    const baseUrl = window.location.origin;
    const link = `${baseUrl}/register.html?ref=${referralCode}`;
    if (referralLinkInput) referralLinkInput.value = link;

  } catch (err) {
    console.error(err);
    alert("Failed to load referral code. Please refresh.");
  }
});

/* =========================
   COPY REFERRAL CODE
========================= */
function copyRefCode() {
  if (!refCodeInput || !refCodeInput.value) return;
  navigator.clipboard.writeText(refCodeInput.value).then(() => {
    alert("Referral code copied!");
  });
}

/* =========================
   COPY REFERRAL LINK
========================= */
function copyReferral() {
  if (!referralLinkInput || !referralLinkInput.value) return;
  navigator.clipboard.writeText(referralLinkInput.value).then(() => {
    alert("Referral link copied!");
  });
}

/* =========================
   SHARE VIA WHATSAPP
========================= */
function shareWhatsApp() {
  if (!referralCode) return;
  const link = `${window.location.origin}/register.html?ref=${referralCode}`;
  const text = `Join Trust ZedFund using my referral code: ${referralCode}\n${link}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

/* =========================
   ATTACH BUTTON EVENTS
========================= */
if (copyBtn) copyBtn.addEventListener("click", copyReferral);
if (shareBtn) shareBtn.addEventListener("click", shareWhatsApp);

// Optional: if you want the old direct copy input
if (refCodeInput) refCodeInput.addEventListener("click", copyRefCode);
