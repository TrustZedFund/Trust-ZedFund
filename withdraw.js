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
   REAL-TIME BALANCE
========================= */
function setupRealtimeBalance() {
  const balRef = ref(db, `users/${currentUserId}/balances/earnings`);
  onValue(balRef, (snap) => {
    earningsBalance = snap.exists() ? Number(snap.val()) : 0;
    updateBalanceUI();
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
