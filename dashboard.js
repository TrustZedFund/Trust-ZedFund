import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { ref, get, update } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

let currentUserId = null;

/* ======================
   AUTH GUARD + LOAD USER
====================== */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUserId = user.uid;

  const snap = await get(ref(db, "users/" + user.uid));
  if (!snap.exists()) return;
  const data = snap.val();

  const firstName = data.name.split(" ")[0] || data.name;

  // Hero Heading + Subheading
  document.getElementById("heroHeading").textContent = `Hello, ${firstName}`;
  document.getElementById("heroSubheading").textContent = "Welcome to your portfolio";

  // Dashboard Cards
  document.getElementById("depositWallet").textContent = `ZMK ${(data.depositWallet || 0).toFixed(2)}`;
  document.getElementById("earningsWallet").textContent = `ZMK ${(data.earningsWallet || 0).toFixed(2)}`;
  document.getElementById("returnsWallet").textContent = `ZMK ${(data.returnsWallet || 0).toFixed(2)}`;
  document.getElementById("referralWallet").textContent = `ZMK ${(data.referralWallet || 0).toFixed(2)}`;
  document.getElementById("activeInvestments").textContent = data.activeInvestments || "No active investments yet";
});

/* ======================
   LOGOUT
====================== */
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

/* ======================
   PROFILE DROPDOWN TOGGLE
====================== */
const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.querySelector(".profile-menu");

profileBtn.addEventListener("click", () => {
  profileMenu.classList.toggle("active");
});

/* ======================
   DEPOSIT / WITHDRAW / INVEST
====================== */
document.getElementById("depositBtn").addEventListener("click", async () => {
  const amount = parseFloat(prompt("Enter deposit amount in ZMK:"));
  if (!amount || amount <= 0) return alert("Invalid amount");

  const userSnap = await get(ref(db, "users/" + currentUserId));
  const userData = userSnap.val();
  const newBalance = (userData.depositWallet || 0) + amount;
  await update(ref(db, "users/" + currentUserId), { depositWallet: newBalance });

  // Referral bonus
  const referralCode = userData.referral;
  if (referralCode) {
    const refSnap = await get(ref(db, "users/" + referralCode));
    if (refSnap.exists()) {
      const refUserData = refSnap.val();
      const bonus = amount * 0.05;
      await update(ref(db, "users/" + referralCode), {
        referralWallet: (refUserData.referralWallet || 0) + bonus
      });
    }
  }

  document.getElementById("depositWallet").textContent = `ZMK ${newBalance.toFixed(2)}`;
  alert("Deposit successful!");
});

document.getElementById("withdrawBtn").addEventListener("click", async () => {
  const amount = parseFloat(prompt("Enter withdrawal amount in ZMK:"));
  if (!amount || amount <= 0) return alert("Invalid amount");

  const userSnap = await get(ref(db, "users/" + currentUserId));
  const userData = userSnap.val();
  if ((userData.earningsWallet || 0) < amount) return alert("Insufficient funds");

  const newBalance = (userData.earningsWallet || 0) - amount;
  await update(ref(db, "users/" + currentUserId), { earningsWallet: newBalance });
  document.getElementById("earningsWallet").textContent = `ZMK ${newBalance.toFixed(2)}`;
  alert("Withdrawal requested!");
});

document.getElementById("investBtn").addEventListener("click", () => {
  alert("Invest Now clicked! Implement investment logic here.");
});

document.getElementById("startInvestBtn").addEventListener("click", () => {
  alert("Start Investing clicked! Implement investment logic here.");
});
async function applyReferralBonus(userId, depositAmount) {
  const userSnap = await get(ref(db, "users/" + userId));
  const userData = userSnap.val();

  if (!userData || !userData.referredBy) return;

  const referrerId = userData.referredBy;

  const refSnap = await get(ref(db, "users/" + referrerId));
  if (!refSnap.exists()) return;

  const refUser = refSnap.val();

  const bonusPercent = 0.05; // 5%
  const bonus = depositAmount * bonusPercent;

  await update(ref(db, "users/" + referrerId), {
    referralWallet: (refUser.referralWallet || 0) + bonus
  });

  await push(ref(db, "referrals/" + referrerId), {
    from: userId,
    amount: depositAmount,
    bonus,
    date: Date.now()
  });
}
const refWallet = document.getElementById("refWallet");

const userRef = ref(db, "users/" + uid);
onValue(userRef, snap => {
  const data = snap.val();

  if (refWallet) {
    refWallet.innerText = "ZMW " + (data.referralWallet || 0).toFixed(2);
  }
});
const depositBtn = document.getElementById("depositBtn");

depositBtn.addEventListener("click", () => {
  // Redirect to Wallet page where the full deposit flow exists
  window.location.href = "wallet.html";
});
auth.onAuthStateChanged(async (user) => {
  if (!user) return; // or redirect to login

  const userId = user.uid;
  const userSnap = await get(ref(db, "users/" + userId));
  const userData = userSnap.val();

  document.getElementById("depositWallet").textContent = 
      `ZMK ${(userData.balance || 0).toFixed(2)}`;
});