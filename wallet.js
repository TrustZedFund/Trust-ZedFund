import { auth, db } from "./firebase.js";
import { ref, get, set, push, update, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// Elements
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
let currentUserId = null;
let depositBalance = 0;
let referralBalance = 0;

/* =========================
   INITIALIZATION
========================= */
document.addEventListener('DOMContentLoaded', () => {
  console.log("Wallet initialized");
  
  // Setup event listeners
  setupEventListeners();
  
  // Check authentication
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    currentUserId = user.uid;
    console.log("User authenticated:", user.email);
    
    // Setup real-time listeners
    setupRealtimeBalances();
    setupRealtimeDeposits();
    setupRealtimeTransactions();
    
    // Load initial data
    await loadInitialData(user.uid);
  });
});

/* =========================
   SETUP EVENT LISTENERS
========================= */
function setupEventListeners() {
  // Continue button
  if (chooseProviderBtn) {
    chooseProviderBtn.addEventListener("click", handleContinue);
  }
  
  // Provider selection buttons
  if (airtelBtn) {
    airtelBtn.addEventListener("click", () => selectProvider("Airtel Money"));
  }
  
  if (mtnBtn) {
    mtnBtn.addEventListener("click", () => selectProvider("MTN Mobile Money"));
  }
  
  // Confirm deposit button
  if (confirmDepositBtn) {
    confirmDepositBtn.addEventListener("click", handleConfirmDeposit);
  }
}

/* =========================
   LOAD INITIAL DATA
========================= */
async function loadInitialData(userId) {
  try {
    // Get user data
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const userData = snapshot.val();
      console.log("User data loaded:", userData);
      
      // Update balances from either data structure
      const depositBal = userData.balances?.deposit || userData.depositWallet || 0;
      const referralBal = userData.balances?.referralWallet || userData.referralWallet || 0;
      
      depositBalance = Number(depositBal);
      referralBalance = Number(referralBal);
      
      updateBalances();
    }
  } catch (error) {
    console.error("Error loading initial data:", error);
  }
}

/* =========================
   REAL-TIME BALANCES
========================= */
function setupRealtimeBalances() {
  if (!currentUserId) return;
  
  const userRef = ref(db, `users/${currentUserId}`);
  
  onValue(userRef, (snap) => {
    if (!snap.exists()) return;
    
    const userData = snap.val();
    
    // Handle both data structures
    const depositBal = userData.balances?.deposit || userData.depositWallet || 0;
    const referralBal = userData.balances?.referralWallet || userData.referralWallet || 0;
    
    depositBalance = Number(depositBal);
    referralBalance = Number(referralBal);
    
    updateBalances();
  });
}

function updateBalances() {
  if (depositBalanceEl) {
    depositBalanceEl.textContent = `ZMK ${depositBalance.toFixed(2)}`;
  }
  
  if (referralBalanceEl) {
    referralBalanceEl.textContent = `ZMK ${referralBalance.toFixed(2)}`;
  }
}

/* =========================
   CONTINUE BUTTON HANDLER
========================= */
function handleContinue() {
  const amount = parseFloat(depositAmountInput.value);

  if (!amount || amount < 10) {
    alert("Enter a valid deposit amount (minimum ZMK 10)");
    return;
  }

  currentDepositAmount = amount;
  
  // Show provider selection section
  if (providerSection) {
    providerSection.classList.remove("hidden");
    providerSection.style.display = "block";
    
    // Scroll to provider section
    providerSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  
  console.log("Amount set:", amount, "Now choose provider");
}

/* =========================
   SELECT PROVIDER
========================= */
function selectProvider(provider) {
  selectedProvider = provider;
  
  // Show payment details section
  if (selectedProviderTitle) {
    selectedProviderTitle.textContent = `${provider} Deposit`;
  }
  
  if (payAmount) {
    payAmount.textContent = `ZMK ${currentDepositAmount.toFixed(2)}`;
  }
  
  if (payToNumber) {
    payToNumber.textContent = provider === "Airtel Money"
      ? "Send to: 0779653509 (Trust ZedFund Admin — Leah Bwalya)"
      : "Send to: 0768 526 191 (Trust ZedFund Manager — Lewis Mwaba)";
  }
  
  if (paymentDetails) {
    paymentDetails.classList.remove("hidden");
    paymentDetails.style.display = "block";
    
    // Scroll to payment details
    paymentDetails.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Focus on first input
    senderNumberInput?.focus();
  }
  
  console.log("Provider selected:", provider);
}

/* =========================
   CONFIRM DEPOSIT HANDLER
========================= */
async function handleConfirmDeposit() {
  const senderNumber = senderNumberInput.value.trim();
  const txId = transactionIdInput.value.trim();

  if (!senderNumber || !txId) {
    alert("Please enter your mobile number and transaction ID");
    return;
  }

  if (!currentUserId) {
    alert("Please login again");
    window.location.href = "login.html";
    return;
  }

  const depositId = "d_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  const depositData = {
    uid: currentUserId,
    amount: currentDepositAmount,
    provider: selectedProvider,
    senderNumber: senderNumber,
    transactionId: txId,
    status: "pending",
    timestamp: Date.now(),
    createdAt: new Date().toISOString()
  };

  try {
    // Show loading state
    confirmDepositBtn.disabled = true;
    confirmDepositBtn.textContent = "Processing...";

    // 1. Save deposit to user's deposits
    await set(ref(db, `users/${currentUserId}/deposits/${depositId}`), depositData);
    
    // 2. Save deposit to admin queue
    await set(ref(db, `depositRequests/${depositId}`), depositData);
    
    // 3. Add to transaction history
    const transactionData = {
      type: "deposit",
      amount: currentDepositAmount,
      provider: selectedProvider,
      status: "pending",
      timestamp: Date.now(),
      depositId: depositId
    };
    
    await push(ref(db, `users/${currentUserId}/transactions`), transactionData);
    
    // 4. Send notification to user
    await push(ref(db, `notifications/${currentUserId}`), {
      message: `💰 Deposit of ZMK ${currentDepositAmount.toFixed(2)} submitted. Awaiting confirmation.`,
      read: false,
      time: Date.now(),
      type: "deposit",
      priority: "high"
    });

    // Reset form
    resetDepositFlow();
    
    // Show success message
    alert(`Deposit submitted successfully!\nAmount: ZMK ${currentDepositAmount.toFixed(2)}\nStatus: Pending confirmation\nTransaction ID: ${txId}`);
    
    console.log("Deposit submitted successfully:", depositData);
    
  } catch (err) {
    console.error("Deposit submission error:", err);
    alert("Failed to submit deposit. Please try again.");
  } finally {
    // Reset button state
    confirmDepositBtn.disabled = false;
    confirmDepositBtn.textContent = "Confirm Deposit";
  }
}

/* =========================
   REAL-TIME ACTIVE DEPOSITS
========================= */
function setupRealtimeDeposits() {
  if (!currentUserId) return;
  
  const depositsRef = ref(db, `users/${currentUserId}/deposits`);
  
  onValue(depositsRef, (snap) => {
    if (!activeDepositsList) return;
    
    activeDepositsList.innerHTML = "";
    
    if (!snap.exists()) {
      activeDepositsList.innerHTML = `<p class="subtext">No active deposits yet</p>`;
      return;
    }

    const data = snap.val();
    let hasActiveDeposits = false;
    
    // Sort by timestamp (newest first)
    const sortedDeposits = Object.values(data)
      .filter(deposit => deposit.status === "pending" || deposit.status === "approved")
      .sort((a, b) => b.timestamp - a.timestamp);
    
    if (sortedDeposits.length === 0) {
      activeDepositsList.innerHTML = `<p class="subtext">No active deposits yet</p>`;
      return;
    }
    
    sortedDeposits.forEach(deposit => {
      const div = document.createElement("div");
      div.className = "list-item";
      
      const date = new Date(deposit.timestamp).toLocaleDateString();
      const time = new Date(deposit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${deposit.provider}</strong><br>
            <small>${date} ${time}</small>
          </div>
          <div style="text-align: right;">
            <strong>ZMK ${deposit.amount.toFixed(2)}</strong><br>
            <small style="color: ${deposit.status === 'approved' ? '#10b981' : '#f59e0b'}">
              ${deposit.status.toUpperCase()}
            </small>
          </div>
        </div>
      `;
      
      activeDepositsList.appendChild(div);
      hasActiveDeposits = true;
    });
    
    if (!hasActiveDeposits) {
      activeDepositsList.innerHTML = `<p class="subtext">No active deposits yet</p>`;
    }
  });
}

/* =========================
   REAL-TIME TRANSACTIONS
========================= */
function setupRealtimeTransactions() {
  if (!currentUserId) return;
  
  const txRef = ref(db, `users/${currentUserId}/transactions`);
  
  onValue(txRef, (snap) => {
    if (!transactionHistoryList) return;
    
    transactionHistoryList.innerHTML = "";
    
    if (!snap.exists()) {
      transactionHistoryList.innerHTML = `<p class="subtext">No transactions yet</p>`;
      return;
    }

    const data = snap.val();
    
    // Sort by timestamp (newest first)
    const sortedTransactions = Object.values(data)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10); // Show last 10 transactions
    
    if (sortedTransactions.length === 0) {
      transactionHistoryList.innerHTML = `<p class="subtext">No transactions yet</p>`;
      return;
    }
    
    sortedTransactions.forEach(transaction => {
      const div = document.createElement("div");
      div.className = "list-item";
      
      const date = new Date(transaction.timestamp).toLocaleDateString();
      const time = new Date(transaction.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const statusColor = transaction.status === 'approved' ? '#10b981' : 
                         transaction.status === 'failed' ? '#ef4444' : '#f59e0b';
      
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${transaction.type.toUpperCase()}</strong><br>
            <small>${transaction.provider} • ${date} ${time}</small>
          </div>
          <div style="text-align: right;">
            <strong>ZMK ${transaction.amount.toFixed(2)}</strong><br>
            <small style="color: ${statusColor}">
              ${transaction.status?.toUpperCase() || 'PENDING'}
            </small>
          </div>
        </div>
      `;
      
      transactionHistoryList.appendChild(div);
    });
  });
}

/* =========================
   RESET DEPOSIT FLOW
========================= */
function resetDepositFlow() {
  // Reset inputs
  depositAmountInput.value = "";
  senderNumberInput.value = "";
  transactionIdInput.value = "";
  
  // Hide sections
  if (providerSection) {
    providerSection.classList.add("hidden");
    providerSection.style.display = "none";
  }
  
  if (paymentDetails) {
    paymentDetails.classList.add("hidden");
    paymentDetails.style.display = "none";
  }
  
  // Reset variables
  currentDepositAmount = 0;
  selectedProvider = "";
  
  // Focus back on deposit amount input
  depositAmountInput.focus();
}

/* =========================
   NAVIGATION FUNCTIONS
   (For use in HTML if needed)
========================= */
function goBack() {
  resetDepositFlow();
}

// Make functions available globally
window.selectProvider = selectProvider;
window.goBack = goBack;