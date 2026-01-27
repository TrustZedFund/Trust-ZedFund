// withdraw.js
import {
  auth,
  db,
  onBalanceChange,
  requestWithdrawal,
  onUserWithdrawalsChange,
  onUserTransactionsChange
} from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// UI Elements
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

// State
let selectedProvider = "";
let currentWithdrawAmount = 0;
let currentUserId = null;
let earningsBalance = 0;

/* =========================
   AUTH + LOAD BALANCES
========================= */

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUserId = user.uid;

  // Listen for real-time balance changes
  onBalanceChange(currentUserId, (balances) => {
    earningsBalance = balances.earnings || 0;
    updateBalances();
  });

  // Load withdrawals and transactions
  onUserWithdrawalsChange(currentUserId, (withdrawals) => {
    renderActiveWithdrawals(withdrawals);
  });

  onUserTransactionsChange(currentUserId, (transactions) => {
    renderTransactions(transactions);
  });
});

/* =========================
   UI HELPERS
========================= */

function updateBalances() {
  earningsBalanceEl.textContent = `ZMK ${earningsBalance.toFixed(2)}`;
}

function renderActiveWithdrawals(withdrawals) {
  activeWithdrawalsList.innerHTML = "";
  const pending = Object.values(withdrawals || {}).filter(w => w.status === "pending");

  if (!pending.length) {
    activeWithdrawalsList.innerHTML = `<p class="subtext">No pending withdrawals</p>`;
    return;
  }

  pending.forEach(w => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.textContent = `${w.provider} — ZMK ${w.amount.toFixed(2)} — Pending`;
    activeWithdrawalsList.prepend(div);
  });
}

function renderTransactions(transactions) {
  transactionHistoryList.innerHTML = "";
  const list = Object.values(transactions || {});

  if (!list.length) {
    transactionHistoryList.innerHTML = `<p class="subtext">No transactions yet</p>`;
    return;
  }

  list.forEach(t => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.textContent = `Withdrawal: ZMK ${t.amount.toFixed(2)} via ${t.provider} — ${t.status}`;
    transactionHistoryList.prepend(div);
  });
}

/* =========================
   CONTINUE BUTTON
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
   CONFIRM WITHDRAWAL
========================= */

confirmWithdrawBtn.addEventListener("click", async () => {
  const receiverNumber = receiverNumberInput.value.trim();

  if (!receiverNumber) {
    alert("Enter your mobile number");
    return;
  }

  const withdrawData = {
    uid: currentUserId,
    amount: currentWithdrawAmount,
    provider: selectedProvider,
    phone: receiverNumber,
    status: "pending",
    timestamp: Date.now()
  };

  try {
    await requestWithdrawal(currentUserId, withdrawData);

    resetWithdrawFlow();
    alert("Withdrawal request submitted. Pending admin approval.");
  } catch (err) {
    console.error(err);
    alert("Failed to submit withdrawal. Try again.");
  }
});

/* =========================
   RESET FLOW
========================= */

function resetWithdrawFlow() {
  withdrawAmountInput.value = "";
  receiverNumberInput.value = "";

  providerSection.classList.add("hidden");
  paymentDetails.classList.add("hidden");

  currentWithdrawAmount = 0;
  selectedProvider = "";
}
