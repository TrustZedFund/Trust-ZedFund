// wallet.js
import { auth, db } from "./firebase.js";
import {
  ref,
  get,
  set,
  update
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// DOM Elements
const depositBalanceEl = document.getElementById("depositBalance");
const referralBalanceEl = document.getElementById("referralBalance");

const depositAmountInput = document.getElementById("depositAmount");
const chooseProviderBtn = document.getElementById("chooseProviderBtn");

const providerSection = document.getElementById("providerSection");
const airtelBtn = document.getElementById("airtelBtn");
const mtnBtn = document.getElementById("mtnBtn");

const paymentDetails = document.getElementById("paymentDetails");
const selectedProviderTitle = document.getElementById("selectedProviderTitle");
const payToNumber = document.getElementById("payToNumber");
const payAmount = document.getElementById("payAmount");

const senderNumberInput = document.getElementById("senderNumber");
const transactionIdInput = document.getElementById("transactionId");
const confirmDepositBtn = document.getElementById("confirmDepositBtn");

const activeDepositsList = document.getElementById("activeDepositsList");
const transactionHistoryList = document.getElementById("transactionHistoryList");

// State
let selectedProvider = "";
let currentDepositAmount = 0;
let currentUserId = null;
let depositBalance = 0;
let referralBalance = 0;

/* =========================
   AUTH + LOAD BALANCES
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUserId = user.uid;
  await loadBalances();
  await loadActiveDeposits();
  await loadTransactionHistory();
});

/* =========================
   LOAD BALANCES
========================= */
async function loadBalances() {
  const depositSnap = await get(ref(db, `users/${currentUserId}/depositWallet`));
  depositBalance = depositSnap.exists() ? Number(depositSnap.val()) : 0;

  const referralSnap = await get(ref(db, `users/${currentUserId}/referralWallet`));
  referralBalance = referralSnap.exists() ? Number(referralSnap.val()) : 0;

  updateBalances();
}

function updateBalances() {
  depositBalanceEl.textContent = `ZMK ${depositBalance.toFixed(2)}`;
  referralBalanceEl.textContent = `ZMK ${referralBalance.toFixed(2)}`;
}

/* =========================
   CONTINUE BUTTON
========================= */
chooseProviderBtn.addEventListener("click", () => {
  const amount = parseFloat(depositAmountInput.value);

  if (!amount || amount < 10) {
    alert("Enter a valid deposit amount (minimum ZMK 10)");
    return;
  }

  currentDepositAmount = amount;
  providerSection.classList.remove("hidden");
});

airtelBtn.addEventListener("click", () => showPaymentDetails("Airtel Money"));
mtnBtn.addEventListener("click", () => showPaymentDetails("MTN Mobile Money"));

function showPaymentDetails(provider) {
  selectedProvider = provider;
  selectedProviderTitle.textContent = provider;
  payAmount.textContent = `ZMK ${currentDepositAmount.toFixed(2)}`;

  if (provider === "Airtel Money") {
    payToNumber.textContent = "Send to: 0978 000 111 (Trust ZedFund)";
  } else {
    payToNumber.textContent = "Send to: 0966 000 222 (Trust ZedFund)";
  }

  paymentDetails.classList.remove("hidden");
}

/* =========================
   CONFIRM DEPOSIT
========================= */
confirmDepositBtn.addEventListener("click", async () => {
  const senderNumber = senderNumberInput.value.trim();
  const txId = transactionIdInput.value.trim();

  if (!senderNumber || !txId) {
    alert("Enter your mobile number and transaction ID");
    return;
  }

  const depositId = "d_" + Date.now();

  const depositData = {
    uid: currentUserId,
    amount: currentDepositAmount,
    provider: selectedProvider,
    senderNumber,
    transactionId: txId,
    status: "pending",
    timestamp: Date.now()
  };

  try {
    // Save deposit to user
    await set(ref(db, `users/${currentUserId}/deposits/${depositId}`), depositData);

    // Optionally update deposit balance in real time (if you want to show total including pending)
    depositBalance += currentDepositAmount;
    await update(ref(db, `users/${currentUserId}`), { depositWallet: depositBalance });

    // Update UI
    addActiveDeposit(currentDepositAmount, selectedProvider);
    addTransaction("Deposit", currentDepositAmount, selectedProvider);

    resetDepositFlow();
    updateBalances();

    alert("Deposit submitted successfully. Pending confirmation.");
  } catch (err) {
    console.error(err);
    alert("Failed to submit deposit. Try again.");
  }
});

/* =========================
   LOAD ACTIVE DEPOSITS
========================= */
async function loadActiveDeposits() {
  const snap = await get(ref(db, `users/${currentUserId}/deposits`));
  activeDepositsList.innerHTML = "";

  if (!snap.exists()) {
    activeDepositsList.innerHTML = `<p class="subtext">No active deposits yet</p>`;
    return;
  }

  const data = snap.val();
  Object.values(data).forEach(d => {
    if (d.status === "pending") {
      addActiveDeposit(d.amount, d.provider);
    }
  });
}

/* =========================
   LOAD TRANSACTION HISTORY
========================= */
async function loadTransactionHistory() {
  const snap = await get(ref(db, `users/${currentUserId}/deposits`));
  transactionHistoryList.innerHTML = "";

  if (!snap.exists()) {
    transactionHistoryList.innerHTML = `<p class="subtext">No transactions yet</p>`;
    return;
  }

  const data = snap.val();
  Object.values(data).forEach(d => addTransaction("Deposit", d.amount, d.provider));
}

/* =========================
   UI HELPERS
========================= */
function addActiveDeposit(amount, provider) {
  const div = document.createElement("div");
  div.className = "list-item";
  div.textContent = `${provider} — ZMK ${amount.toFixed(2)} — Pending`;
  activeDepositsList.prepend(div);
}

function addTransaction(type, amount, provider) {
  const div = document.createElement("div");
  div.className = "list-item";
  div.textContent = `${type}: ZMK ${amount.toFixed(2)} via ${provider}`;
  transactionHistoryList.prepend(div);
}

function resetDepositFlow() {
  depositAmountInput.value = "";
  senderNumberInput.value = "";
  transactionIdInput.value = "";

  providerSection.classList.add("hidden");
  paymentDetails.classList.add("hidden");

  currentDepositAmount = 0;
  selectedProvider = "";
}
