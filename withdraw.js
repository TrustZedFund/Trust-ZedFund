import { auth, db } from "./firebase.js";
import { ref, get, set, update, onValue } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// Elements
const earningsBalanceEl = document.getElementById("earningsBalance");
const withdrawAmountInput = document.getElementById("withdrawAmount");
const chooseProviderBtn = document.getElementById("chooseProviderBtn");

const providerSection = document.getElementById("providerSection");
const airtelBtn = document.getElementById("airtelBtn");
const mtnBtn = document.getElementById("mtnBtn");

const paymentDetails = document.getElementById("paymentDetails");
const selectedProviderTitle = document.getElementById("selectedProviderTitle");
const payAmount = document.getElementById("payAmount");

const receiverNumberInput = document.getElementById("receiverNumber");
const confirmWithdrawBtn = document.getElementById("confirmWithdrawBtn");

const activeWithdrawalsList = document.getElementById("activeWithdrawalsList");
const transactionHistoryList = document.getElementById("transactionHistoryList");

let selectedProvider = "";
let currentWithdrawAmount = 0;
let currentUserId = null;
let earningsBalance = 0;

/* =========================
   AUTH + INIT
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUserId = user.uid;

  // Real-time listeners
  setupRealtimeBalance();
  setupRealtimeWithdrawals();
  setupRealtimeTransactions();
});

/* =========================
   REAL-TIME BALANCE (DEPOSITS + REFERRALS)
========================= */
function setupRealtimeBalance() {
  const earningsRef = ref(db, `users/${currentUserId}/balances/earnings`);
  const referralRef = ref(db, `users/${currentUserId}/balances/referral`);

  // Listen for earnings changes (deposits + admin adjustments)
  onValue(earningsRef, (snap) => {
    const earnings = snap.exists() ? Number(snap.val()) : 0;

    // Listen for referral bonus changes
    onValue(referralRef, (rSnap) => {
      const referral = rSnap.exists() ? Number(rSnap.val()) : 0;
      earningsBalance = earnings + referral;
      updateBalanceUI();
    });
  });
}

function updateBalanceUI() {
  earningsBalanceEl.textContent = `ZMK ${earningsBalance.toFixed(2)}`;
}

/* =========================
   CONTINUE BUTTON LOGIC
   (UNCHANGED)
========================= */
chooseProviderBtn.addEventListener("click", () => {
  const amount = parseFloat(withdrawAmountInput.value);

  if (!amount || amount < 10) {
    alert("Enter a valid withdrawal amount (minimum ZMK 10)");
    return;
  }

  if (amount > earningsBalance) {
    alert("Insufficient earnings balance");
    return;
  }

  currentWithdrawAmount = amount;
  providerSection.classList.remove("hidden");
});

airtelBtn.addEventListener("click", () => showPaymentDetails("Airtel Money"));
mtnBtn.addEventListener("click", () => showPaymentDetails("MTN Mobile Money"));

function showPaymentDetails(provider) {
  selectedProvider = provider;
  selectedProviderTitle.textContent = provider;
  payAmount.textContent = `ZMK ${currentWithdrawAmount.toFixed(2)}`;
  paymentDetails.classList.remove("hidden");
}

/* =========================
   CONFIRM WITHDRAW
========================= */
confirmWithdrawBtn.addEventListener("click", async () => {
  const receiverNumber = receiverNumberInput.value.trim();

  if (!receiverNumber) {
    alert("Enter your mobile number");
    return;
  }

  const withdrawId = "w_" + Date.now();
  const withdrawData = {
    uid: currentUserId,
    amount: currentWithdrawAmount,
    provider: selectedProvider,
    phone: receiverNumber,
    status: "pending",
    timestamp: Date.now()
  };

  try {
    // Save to user's withdrawal history
    await set(ref(db, `users/${currentUserId}/withdrawals/${withdrawId}`), withdrawData);

    // Save to global admin queue
    await set(ref(db, `withdrawalRequests/${withdrawId}`), withdrawData);

    // Deduct from earnings balance (HOLD funds)
    earningsBalance -= currentWithdrawAmount;
    await update(ref(db, `users/${currentUserId}/balances`), { earnings: earningsBalance });

    resetWithdrawFlow();
    alert("Withdrawal request submitted. Pending admin approval.");
  } catch (err) {
    console.error(err);
    alert("Failed to submit withdrawal. Try again.");
  }
});

/* =========================
   REAL-TIME PENDING WITHDRAWALS
========================= */
function setupRealtimeWithdrawals() {
  const wRef = ref(db, `users/${currentUserId}/withdrawals`);
  onValue(wRef, (snap) => {
    activeWithdrawalsList.innerHTML = "";
    if (!snap.exists()) {
      activeWithdrawalsList.innerHTML = `<p class="subtext">No pending withdrawals</p>`;
      return;
    }

    const data = snap.val();
    Object.values(data).forEach(w => {
      if (w.status === "pending") {
        addActiveWithdrawal(w.amount, w.provider);
      }
    });
  });
}

/* =========================
   REAL-TIME TRANSACTIONS
========================= */
function setupRealtimeTransactions() {
  const txRef = ref(db, `users/${currentUserId}/transactions`);
  onValue(txRef, (snap) => {
    transactionHistoryList.innerHTML = "";
    if (!snap.exists()) {
      transactionHistoryList.innerHTML = `<p class="subtext">No transactions yet</p>`;
      return;
    }

    const data = snap.val();
    Object.values(data).forEach(t => {
      const div = document.createElement("div");
      div.className = "list-item";
      div.textContent = `${t.type}: ZMK ${t.amount.toFixed(2)} via ${t.provider}`;
      transactionHistoryList.prepend(div);
    });
  });
}

/* =========================
   UI HELPERS
========================= */
function addActiveWithdrawal(amount, provider) {
  const div = document.createElement("div");
  div.className = "list-item";
  div.textContent = `${provider} — ZMK ${amount.toFixed(2)} — Pending`;
  activeWithdrawalsList.prepend(div);
}

function resetWithdrawFlow() {
  withdrawAmountInput.value = "";
  receiverNumberInput.value = "";

  providerSection.classList.add("hidden");
  paymentDetails.classList.add("hidden");

  currentWithdrawAmount = 0;
  selectedProvider = "";
}
import {
  ref,
  get,
  update
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

window.withdraw = async function(id) {
  const user = auth.currentUser;
  if (!user) return;

  const invRef = ref(db, `users/${user.uid}/investments/${id}`);
  const walletRef = ref(db, `users/${user.uid}/wallet`);

  const snap = await get(invRef);
  if (!snap.exists()) return;

  const inv = snap.val();

  const now = Date.now();
  const progress =
    (now - inv.start) / (inv.maturity - inv.start);

  let payout = 0;

  if (progress < 0.3) {
    payout = inv.amount * 0.8;
  } else if (progress < 0.7) {
    payout = inv.amount;
  } else {
    payout = inv.amount + inv.profit * 0.5;
  }

  const walletSnap = await get(walletRef);
  const wallet = walletSnap.val();

  await update(walletRef, {
    deposit: wallet.deposit + payout
  });

  await update(invRef, {
    status: "withdrawn"
  });

  alert(`Withdrawn ZMK ${payout.toFixed(2)}`);
};
push(ref(db, "notifications/" + user.uid), {
  message: "🏧 Withdrawal request received.",
  read: false,
  time: Date.now(),
  type: "withdrawal"
});
