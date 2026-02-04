import { auth, db } from "./firebase.js";
import {
  ref,
  set,
  update,
  onValue,
  push
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

/* ELEMENTS */
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

/* STATE */
let currentUserId = null;
let earningsBalance = 0;
let currentWithdrawAmount = 0;
let selectedProvider = "";

/* AUTH */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUserId = user.uid;
  listenToBalance();
  listenToWithdrawals();
});

/* BALANCE */
function listenToBalance() {
  const balRef = ref(db, `users/${currentUserId}/balances/earnings`);
  onValue(balRef, (snap) => {
    earningsBalance = snap.exists() ? Number(snap.val()) : 0;
    earningsBalanceEl.textContent = `ZMK ${earningsBalance.toFixed(2)}`;
  });
}

/* CONTINUE */
chooseProviderBtn.addEventListener("click", () => {
  const amount = parseFloat(withdrawAmountInput.value);

  if (!amount || amount < 10) {
    alert("Minimum withdrawal is ZMK 10");
    return;
  }

  if (amount > earningsBalance) {
    alert("Insufficient balance");
    return;
  }

  currentWithdrawAmount = amount;
  providerSection.classList.remove("hidden");
});

/* PROVIDERS */
airtelBtn.onclick = () => showDetails("Airtel Money");
mtnBtn.onclick = () => showDetails("MTN Mobile Money");

function showDetails(provider) {
  selectedProvider = provider;
  selectedProviderTitle.textContent = provider;
  payAmount.textContent = `ZMK ${currentWithdrawAmount.toFixed(2)}`;
  paymentDetails.classList.remove("hidden");
}

/* CONFIRM */
confirmWithdrawBtn.addEventListener("click", async () => {
  const phone = receiverNumberInput.value.trim();
  if (!phone) {
    alert("Enter mobile number");
    return;
  }

  const wid = "w_" + Date.now();
  const data = {
    uid: currentUserId,
    amount: currentWithdrawAmount,
    provider: selectedProvider,
    phone,
    status: "pending",
    timestamp: Date.now()
  };

  try {
    await set(ref(db, `users/${currentUserId}/withdrawals/${wid}`), data);
    await set(ref(db, `withdrawalRequests/${wid}`), data);

    await update(ref(db, `users/${currentUserId}/balances`), {
      earnings: earningsBalance - currentWithdrawAmount
    });

    await push(ref(db, `notifications/${currentUserId}`), {
      message: "🏧 Withdrawal request submitted",
      read: false,
      time: Date.now(),
      type: "withdrawal"
    });

    resetForm();
    alert("Withdrawal request submitted");
  } catch (e) {
    console.error(e);
    alert("Withdrawal failed");
  }
});

/* PENDING */
function listenToWithdrawals() {
  const wRef = ref(db, `users/${currentUserId}/withdrawals`);
  onValue(wRef, (snap) => {
    activeWithdrawalsList.innerHTML = "";
    if (!snap.exists()) {
      activeWithdrawalsList.innerHTML = `<p class="subtext">No pending withdrawals</p>`;
      return;
    }
    Object.values(snap.val()).forEach(w => {
      if (w.status === "pending") {
        const d = document.createElement("div");
        d.className = "list-item";
        d.textContent = `${w.provider} — ZMK ${w.amount.toFixed(2)} — Pending`;
        activeWithdrawalsList.prepend(d);
      }
    });
  });
}

/* RESET */
function resetForm() {
  withdrawAmountInput.value = "";
  receiverNumberInput.value = "";
  providerSection.classList.add("hidden");
  paymentDetails.classList.add("hidden");
  currentWithdrawAmount = 0;
  selectedProvider = "";
}
