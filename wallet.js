// wallet.js

let depositBalance = 0;
let referralBalance = 0;

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

let selectedProvider = "";
let currentDepositAmount = 0;

// INIT UI
updateBalances();

chooseProviderBtn.addEventListener("click", () => {
  const amount = parseFloat(depositAmountInput.value);

  if (!amount || amount < 10) {
    alert("Enter a valid deposit amount (minimum ZMK 10)");
    return;
  }

  currentDepositAmount = amount;
  providerSection.classList.remove("hidden");
});

airtelBtn.addEventListener("click", () => {
  showPaymentDetails("Airtel Money");
});

mtnBtn.addEventListener("click", () => {
  showPaymentDetails("MTN Mobile Money");
});

function showPaymentDetails(provider) {
  selectedProvider = provider;

  selectedProviderTitle.textContent = provider;
  payAmount.textContent = `ZMK ${currentDepositAmount.toFixed(2)}`;

  if (provider === "Airtel Money") {
    payToNumber.textContent = "Send to: 0978 000 111 (AfriLeap)";
  } else {
    payToNumber.textContent = "Send to: 0966 000 222 (AfriLeap)";
  }

  paymentDetails.classList.remove("hidden");
}

confirmDepositBtn.addEventListener("click", () => {
  const senderNumber = senderNumberInput.value.trim();
  const txId = transactionIdInput.value.trim();

  if (!senderNumber || !txId) {
    alert("Enter your mobile number and transaction ID");
    return;
  }

  // Simulate backend confirmation
  depositBalance += currentDepositAmount;

  addActiveDeposit(currentDepositAmount, selectedProvider);
  addTransaction("Deposit", currentDepositAmount, selectedProvider);

  resetDepositFlow();
  updateBalances();

  alert("Deposit submitted successfully. Pending confirmation.");
});

function updateBalances() {
  depositBalanceEl.textContent = `ZMK ${depositBalance.toFixed(2)}`;
  referralBalanceEl.textContent = `ZMK ${referralBalance.toFixed(2)}`;
}

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