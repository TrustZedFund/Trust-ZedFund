import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { ref, get, update, push, onValue } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

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

  // Extract first name from name field
  let firstName = "User";
  if (data.profile && data.profile.name) {
    firstName = data.profile.name.split(" ")[0];
  } else if (data.name) {
    firstName = data.name.split(" ")[0];
  }

  // 🔥 FIX: Update greeting with actual name
  document.getElementById("heroHeading").textContent = `Hello, ${firstName}`;
  document.getElementById("heroSubheading").textContent = "Welcome to your portfolio";

  // Dashboard Cards - Check both old and new data structures
  const depositAmount = data.balances?.deposit || data.depositWallet || 0;
  const earningsAmount = data.balances?.earnings || data.earningsWallet || 0;
  const returnsAmount = data.balances?.returns || data.returnsWallet || 0;
  const referralAmount = data.balances?.referralWallet || data.referralWallet || 0;

  document.getElementById("depositWallet").textContent = `ZMK ${depositAmount.toFixed(2)}`;
  document.getElementById("earningsWallet").textContent = `ZMK ${earningsAmount.toFixed(2)}`;
  document.getElementById("returnsWallet").textContent = `ZMK ${returnsAmount.toFixed(2)}`;
  document.getElementById("referralWallet").textContent = `ZMK ${referralAmount.toFixed(2)}`;
  
  // Active Investments
  document.getElementById("activeInvestments").textContent = data.activeInvestments || "No active investments yet";

  // Load notifications
  loadNotifications(user.uid);
  
  // Load investments
  loadInvestments(user.uid);
  
  // Set up real-time balance updates
  setupRealTimeUpdates(user.uid);
});

/* ======================
   LOGOUT
====================== */
document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (confirm("Are you sure you want to logout?")) {
        await signOut(auth);
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "login.html?logout=success";
      }
    });
  }
});

/* ======================
   PROFILE DROPDOWN TOGGLE - FIXED
====================== */
function setupProfileDropdown() {
  const profileBtn = document.getElementById("profileBtn");
  const profileDropdown = document.getElementById("profileDropdown");
  
  if (!profileBtn || !profileDropdown) {
    console.error("Profile dropdown elements not found");
    return;
  }
  
  console.log("Setting up profile dropdown");
  
  // Toggle dropdown on button click
  profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    console.log("Profile button clicked");
    
    // Close notification panel if open
    const notifPanel = document.getElementById("notifPanel");
    if (notifPanel && notifPanel.style.display === "block") {
      notifPanel.style.display = "none";
    }
    
    // Toggle profile dropdown
    profileDropdown.classList.toggle("show");
  });
  
  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
      profileDropdown.classList.remove("show");
    }
  });
  
  // Close dropdown when clicking on dropdown items
  const dropdownItems = profileDropdown.querySelectorAll("button, .dropdown-link");
  dropdownItems.forEach(item => {
    item.addEventListener("click", () => {
      profileDropdown.classList.remove("show");
    });
  });
}

/* ======================
   NOTIFICATION TOGGLE - FIXED
====================== */
function setupNotifications() {
  const notifBell = document.querySelector(".notif-bell");
  const notifPanel = document.getElementById("notifPanel");
  
  if (!notifBell || !notifPanel) return;
  
  notifBell.addEventListener("click", (e) => {
    e.stopPropagation();
    
    // Close profile dropdown if open
    const profileDropdown = document.getElementById("profileDropdown");
    if (profileDropdown && profileDropdown.classList.contains("show")) {
      profileDropdown.classList.remove("show");
    }
    
    // Toggle notification panel
    notifPanel.style.display = notifPanel.style.display === "block" ? "none" : "block";
  });
}

/* ======================
   INITIALIZE EVERYTHING
====================== */
document.addEventListener('DOMContentLoaded', () => {
  console.log("Dashboard initialized");
  
  // Setup profile dropdown
  setupProfileDropdown();
  
  // Setup notifications
  setupNotifications();
  
  // Setup logout button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (confirm("Are you sure you want to logout?")) {
        logoutBtn.disabled = true;
        logoutBtn.textContent = "Logging out...";
        
        try {
          await signOut(auth);
          console.log("User logged out");
          
          // Clear all stored data
          localStorage.clear();
          sessionStorage.clear();
          
          // Redirect to login
          window.location.href = "login.html?logout=success";
        } catch (error) {
          console.error("Logout error:", error);
          alert("Logout failed. Please try again.");
          logoutBtn.disabled = false;
          logoutBtn.textContent = "Logout";
        }
      }
    });
  }
  
  // Check auth state
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    currentUserId = user.uid;

    const snap = await get(ref(db, "users/" + user.uid));
    if (!snap.exists()) return;
    const data = snap.val();

    // Extract first name from name field
    let firstName = "User";
    if (data.profile && data.profile.name) {
      firstName = data.profile.name.split(" ")[0];
    } else if (data.name) {
      firstName = data.name.split(" ")[0];
    }

    // 🔥 FIX: Update greeting with actual name
    document.getElementById("heroHeading").textContent = `Hello, ${firstName}`;
    document.getElementById("heroSubheading").textContent = "Welcome to your portfolio";

    // Dashboard Cards - Check both old and new data structures
    const depositAmount = data.balances?.deposit || data.depositWallet || 0;
    const earningsAmount = data.balances?.earnings || data.earningsWallet || 0;
    const returnsAmount = data.balances?.returns || data.returnsWallet || 0;
    const referralAmount = data.balances?.referralWallet || data.referralWallet || 0;

    document.getElementById("depositWallet").textContent = `ZMK ${depositAmount.toFixed(2)}`;
    document.getElementById("earningsWallet").textContent = `ZMK ${earningsAmount.toFixed(2)}`;
    document.getElementById("returnsWallet").textContent = `ZMK ${returnsAmount.toFixed(2)}`;
    document.getElementById("referralWallet").textContent = `ZMK ${referralAmount.toFixed(2)}`;
    
    // Active Investments
    document.getElementById("activeInvestments").textContent = data.activeInvestments || "No active investments yet";

    // Load notifications
    loadNotifications(user.uid);
    
    // Load investments
    loadInvestments(user.uid);
    
    // Set up real-time balance updates
    setupRealTimeUpdates(user.uid);
  });
});

// Rest of your existing functions remain the same...
// (loadNotifications, loadInvestments, setupRealTimeUpdates, etc.)/* ======================
   PROFILE DROPDOWN TOGGLE
====================== */
const profileBtn = document.getElementById("profileBtn");
if (profileBtn) {
  profileBtn.addEventListener("click", () => {
    const profileDropdown = document.getElementById("profileDropdown");
    if (profileDropdown) {
      profileDropdown.classList.toggle("show");
    }
  });
}

// Close dropdown when clicking outside
window.addEventListener("click", (e) => {
  const profileDropdown = document.getElementById("profileDropdown");
  const notifPanel = document.getElementById("notifPanel");
  
  if (profileDropdown && !profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
    profileDropdown.classList.remove("show");
  }
  
  if (notifPanel) {
    const notifBell = document.querySelector(".notif-bell");
    if (!notifPanel.contains(e.target) && !notifBell.contains(e.target)) {
      notifPanel.style.display = "none";
    }
  }
});

/* ======================
   NAVIGATION FUNCTIONS
====================== */
// These are already in your dashboard.html, but ensure they work
function goHome() {
  window.location.href = "index.html";
}

function goRefer() {
  window.location.href = "refer.html";
}

function goInvestments() {
  window.location.href = "investments.html";
}

function goWallet() {
  window.location.href = "wallet.html";
}

function goWithdraw() {
  window.location.href = "withdraw.html";
}

function goAbout() {
  window.location.href = "about.html";
}

/* ======================
   NOTIFICATION FUNCTIONS
====================== */
function toggleNotifications() {
  const panel = document.getElementById("notifPanel");
  if (panel) {
    panel.style.display = panel.style.display === "block" ? "none" : "block";
  }
}

function markRead(item) {
  if (item.classList.contains("unread")) {
    item.classList.remove("unread");
    updateNotificationCount();
  }
}

function updateNotificationCount() {
  const unread = document.querySelectorAll(".notif-item.unread").length;
  const badge = document.getElementById("notifCount");
  if (badge) {
    badge.textContent = unread;
    badge.style.display = unread > 0 ? "inline-block" : "none";
  }
}

function loadNotifications(userId) {
  const notifRef = ref(db, "notifications/" + userId);

  onValue(notifRef, (snapshot) => {
    const panel = document.getElementById("notifPanel");
    const badge = document.getElementById("notifCount");

    if (!panel) return;

    panel.innerHTML = "<h4>Notifications</h4>";
    let unread = 0;

    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const data = child.val();
        const isUnread = !data.read;
        if (isUnread) unread++;

        const notifItem = document.createElement("div");
        notifItem.className = `notif-item ${isUnread ? "unread" : ""}`;
        notifItem.textContent = data.message || "Notification";
        notifItem.onclick = () => markRead(notifItem);
        
        panel.appendChild(notifItem);
      });
    } else {
      panel.innerHTML += '<div class="notif-item">No notifications</div>';
    }

    if (badge) {
      badge.textContent = unread;
      badge.style.display = unread > 0 ? "block" : "none";
    }
  });
}

/* ======================
   INVESTMENT FUNCTIONS
====================== */
function loadInvestments(userId) {
  const container = document.getElementById("investments");
  if (!container) return;

  const invRef = ref(db, `users/${userId}/investments`);

  onValue(invRef, snapshot => {
    container.innerHTML = "";

    if (!snapshot.exists()) {
      container.innerHTML = "<p>No active investments</p>";
      return;
    }

    let activeCount = 0;
    snapshot.forEach(child => {
      const inv = child.val();
      if (inv.status === "active") {
        activeCount++;
        container.appendChild(renderInvestment(child.key, inv));
      }
    });

    // Update active investments count
    const activeInvestmentsEl = document.getElementById("activeInvestments");
    if (activeInvestmentsEl) {
      activeInvestmentsEl.textContent = activeCount > 0 ? 
        `${activeCount} active investment${activeCount > 1 ? 's' : ''}` : 
        "No active investments yet";
    }
  });
}

function renderInvestment(id, inv) {
  const div = document.createElement("div");
  div.className = "investment";

  const countdown = getRemaining(inv.maturity);

  div.innerHTML = `
    <strong>${inv.plan || 'Investment Plan'}</strong><br>
    Invested: ZMK ${inv.amount || 0}<br>
    Payout: ZMK ${inv.total || inv.amount || 0}<br>
    <small>${countdown}</small><br>
    <button onclick="withdrawInvestment('${id}')">Withdraw Early</button>
  `;

  return div;
}

function getRemaining(maturity) {
  if (!maturity) return "N/A";
  
  const diff = maturity - Date.now();
  if (diff <= 0) return "Matured";

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);

  return `${days} days ${hours} hrs remaining`;
}

function withdrawInvestment(investmentId) {
  if (!currentUserId) return;
  
  if (confirm("Withdraw this investment early? Fees may apply.")) {
    // Update investment status
    update(ref(db, `users/${currentUserId}/investments/${investmentId}`), {
      status: "withdrawn",
      withdrawnAt: Date.now()
    }).then(() => {
      alert("Investment withdrawal requested!");
    }).catch(error => {
      console.error("Withdrawal error:", error);
      alert("Withdrawal failed. Please try again.");
    });
  }
}

/* ======================
   REAL-TIME UPDATES
====================== */
function setupRealTimeUpdates(userId) {
  const userRef = ref(db, "users/" + userId);
  
  onValue(userRef, (snapshot) => {
    if (!snapshot.exists()) return;
    
    const data = snapshot.val();
    
    // Update wallet balances in real-time
    const depositAmount = data.balances?.deposit || data.depositWallet || 0;
    const earningsAmount = data.balances?.earnings || data.earningsWallet || 0;
    const returnsAmount = data.balances?.returns || data.returnsWallet || 0;
    const referralAmount = data.balances?.referralWallet || data.referralWallet || 0;

    const depositEl = document.getElementById("depositWallet");
    const earningsEl = document.getElementById("earningsWallet");
    const returnsEl = document.getElementById("returnsWallet");
    const referralEl = document.getElementById("referralWallet");

    if (depositEl) depositEl.textContent = `ZMK ${depositAmount.toFixed(2)}`;
    if (earningsEl) earningsEl.textContent = `ZMK ${earningsAmount.toFixed(2)}`;
    if (returnsEl) returnsEl.textContent = `ZMK ${returnsAmount.toFixed(2)}`;
    if (referralEl) referralEl.textContent = `ZMK ${referralAmount.toFixed(2)}`;
    
    // Update referral wallet if exists
    const refWallet = document.getElementById("refWallet");
    if (refWallet) {
      refWallet.textContent = `ZMK ${referralAmount.toFixed(2)}`;
    }
  });
}

/* ======================
   REFERRAL BONUS FUNCTION
====================== */
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

/* ======================
   BUTTON EVENT LISTENERS
====================== */
document.addEventListener('DOMContentLoaded', () => {
  // Investments button
  const investmentsBtn = document.getElementById("investmentsBtn");
  if (investmentsBtn) {
    investmentsBtn.addEventListener("click", () => {
      window.location.href = "investments.html";
    });
  }

  // Deposit button redirect
  const depositBtn = document.getElementById("depositBtn");
  if (depositBtn) {
    depositBtn.addEventListener("click", () => {
      window.location.href = "wallet.html";
    });
  }
});

// Make functions available globally
window.toggleNotifications = toggleNotifications;
window.markRead = markRead;
window.goHome = goHome;
window.goRefer = goRefer;
window.goInvestments = goInvestments;
window.goWallet = goWallet;
window.goWithdraw = goWithdraw;
window.goAbout = goAbout;
window.withdrawInvestment = withdrawInvestment;