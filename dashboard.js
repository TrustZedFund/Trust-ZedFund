import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { ref, get, update, push, onValue } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

let currentUserId = null;

/* ======================
   INITIALIZATION
====================== */
document.addEventListener('DOMContentLoaded', () => {
  console.log("Dashboard initialized");
  
  // Setup UI components
  setupProfileDropdown();
  setupNotifications();
  setupLogoutButton();
  setupNavigationButtons();
  
  // Check authentication
  checkAuth();
});

/* ======================
   AUTHENTICATION CHECK
====================== */
function checkAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    currentUserId = user.uid;
    console.log("User authenticated:", user.email);
    
    // Load user data
    await loadUserData(user.uid);
    
    // Setup real-time listeners
    setupRealTimeUpdates(user.uid);
  });
}

/* ======================
   LOAD USER DATA
====================== */
async function loadUserData(userId) {
  try {
    const snap = await get(ref(db, "users/" + userId));
    if (!snap.exists()) {
      console.error("No user data found");
      return;
    }
    
    const data = snap.val();
    console.log("User data loaded:", data);
    
    // Update user greeting with actual name
    updateUserGreeting(data);
    
    // Update wallet balances
    updateWalletBalances(data);
    
    // Load notifications
    loadNotifications(userId);
    
    // Load investments
    loadInvestments(userId);
    
    // Update last login time
    updateLastLogin(userId);
    
  } catch (error) {
    console.error("Error loading user data:", error);
  }
}

/* ======================
   UPDATE USER GREETING
====================== */
function updateUserGreeting(data) {
  // Extract first name from name field
  let firstName = "User";
  if (data.profile && data.profile.name) {
    firstName = data.profile.name.split(" ")[0];
  } else if (data.name) {
    firstName = data.name.split(" ")[0];
  }
  
  console.log("Setting greeting for:", firstName);
  
  // Update greeting with actual name
  const heroHeading = document.getElementById("heroHeading");
  const heroSubheading = document.getElementById("heroSubheading");
  
  if (heroHeading) {
    heroHeading.textContent = `Hello, ${firstName}`;
  }
  
  if (heroSubheading) {
    heroSubheading.textContent = "Welcome to your portfolio";
  }
  
  // Store in localStorage for quick access
  localStorage.setItem('userFirstName', firstName);
  localStorage.setItem('userEmail', data.profile?.email || data.email || '');
}

/* ======================
   UPDATE WALLET BALANCES
====================== */
function updateWalletBalances(data) {
  // Check both old and new data structures
  const depositAmount = data.balances?.deposit || data.depositWallet || 0;
  const earningsAmount = data.balances?.earnings || data.earningsWallet || 0;
  const returnsAmount = data.balances?.returns || data.returnsWallet || 0;
  const referralAmount = data.balances?.referralWallet || data.referralWallet || 0;
  
  const formatCurrency = (amount) => {
    return `ZMK ${parseFloat(amount).toFixed(2)}`;
  };
  
  // Update wallet displays
  const depositEl = document.getElementById("depositWallet");
  const earningsEl = document.getElementById("earningsWallet");
  const returnsEl = document.getElementById("returnsWallet");
  const referralEl = document.getElementById("referralWallet");
  const activeInvestmentsEl = document.getElementById("activeInvestments");
  
  if (depositEl) depositEl.textContent = formatCurrency(depositAmount);
  if (earningsEl) earningsEl.textContent = formatCurrency(earningsAmount);
  if (returnsEl) returnsEl.textContent = formatCurrency(returnsAmount);
  if (referralEl) referralEl.textContent = formatCurrency(referralAmount);
  
  // Update active investments
  if (activeInvestmentsEl) {
    activeInvestmentsEl.textContent = data.activeInvestments || "No active investments yet";
  }
  
  // Update referral wallet if exists
  const refWallet = document.getElementById("refWallet");
  if (refWallet) {
    refWallet.textContent = formatCurrency(referralAmount);
  }
}

/* ======================
   PROFILE DROPDOWN SETUP
====================== */
function setupProfileDropdown() {
  const profileBtn = document.getElementById("profileBtn");
  const profileDropdown = document.getElementById("profileDropdown");
  
  if (!profileBtn || !profileDropdown) {
    console.warn("Profile dropdown elements not found");
    return;
  }
  
  // Toggle dropdown on button click
  profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    
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
   NOTIFICATIONS SETUP
====================== */
function setupNotifications() {
  const notifBell = document.querySelector(".notif-bell");
  const notifPanel = document.getElementById("notifPanel");
  
  if (!notifBell || !notifPanel) return;
  
  // Toggle notification panel
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
  
  // Close notification panel when clicking outside
  document.addEventListener("click", (e) => {
    if (!notifPanel.contains(e.target) && !notifBell.contains(e.target)) {
      notifPanel.style.display = "none";
    }
  });
}

/* ======================
   LOAD NOTIFICATIONS
====================== */
function loadNotifications(userId) {
  const notifRef = ref(db, "notifications/" + userId);
  const panel = document.getElementById("notifPanel");
  const badge = document.getElementById("notifCount");
  
  if (!panel) return;
  
  onValue(notifRef, (snapshot) => {
    panel.innerHTML = "<h4>Notifications</h4>";
    let unreadCount = 0;
    
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const data = child.val();
        const isUnread = !data.read;
        if (isUnread) unreadCount++;
        
        const notifItem = document.createElement("div");
        notifItem.className = `notif-item ${isUnread ? "unread" : ""}`;
        notifItem.textContent = data.message || "Notification";
        notifItem.onclick = () => {
          if (isUnread) {
            markNotificationAsRead(userId, child.key);
            notifItem.classList.remove("unread");
            updateNotificationCount();
          }
        };
        
        panel.appendChild(notifItem);
      });
    } else {
      panel.innerHTML += '<div class="notif-item">No notifications</div>';
    }
    
    // Update notification badge
    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? "block" : "none";
    }
  });
}

/* ======================
   MARK NOTIFICATION AS READ
====================== */
function markNotificationAsRead(userId, notificationId) {
  update(ref(db, `notifications/${userId}/${notificationId}`), {
    read: true
  }).catch(error => {
    console.error("Error marking notification as read:", error);
  });
}

/* ======================
   UPDATE NOTIFICATION COUNT
====================== */
function updateNotificationCount() {
  const unread = document.querySelectorAll(".notif-item.unread").length;
  const badge = document.getElementById("notifCount");
  if (badge) {
    badge.textContent = unread;
    badge.style.display = unread > 0 ? "block" : "none";
  }
}

/* ======================
   LOAD INVESTMENTS
====================== */
function loadInvestments(userId) {
  const container = document.getElementById("investments");
  if (!container) return;
  
  const invRef = ref(db, `users/${userId}/investments`);
  
  onValue(invRef, snapshot => {
    container.innerHTML = "";
    let activeCount = 0;
    
    if (!snapshot.exists()) {
      container.innerHTML = "<p>No active investments</p>";
      updateActiveInvestmentsCount(0);
      return;
    }
    
    snapshot.forEach(child => {
      const inv = child.val();
      if (inv.status === "active") {
        activeCount++;
        container.appendChild(renderInvestment(child.key, inv));
      }
    });
    
    updateActiveInvestmentsCount(activeCount);
  });
}

/* ======================
   RENDER INVESTMENT
====================== */
function renderInvestment(id, inv) {
  const div = document.createElement("div");
  div.className = "investment";
  
  const countdown = getRemainingTime(inv.maturity);
  
  div.innerHTML = `
    <strong>${inv.plan || 'Investment Plan'}</strong><br>
    Invested: ZMK ${inv.amount || 0}<br>
    Payout: ZMK ${inv.total || inv.amount || 0}<br>
    <small>${countdown}</small><br>
    <button onclick="withdrawInvestment('${id}')">Withdraw Early</button>
  `;
  
  return div;
}

/* ======================
   GET REMAINING TIME
====================== */
function getRemainingTime(maturity) {
  if (!maturity) return "N/A";
  
  const diff = maturity - Date.now();
  if (diff <= 0) return "Matured";
  
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  
  return `${days}d ${hours}h ${minutes}m remaining`;
}

/* ======================
   UPDATE ACTIVE INVESTMENTS COUNT
====================== */
function updateActiveInvestmentsCount(count) {
  const activeInvestmentsEl = document.getElementById("activeInvestments");
  if (activeInvestmentsEl) {
    activeInvestmentsEl.textContent = count > 0 ? 
      `${count} active investment${count > 1 ? 's' : ''}` : 
      "No active investments yet";
  }
}

/* ======================
   WITHDRAW INVESTMENT
====================== */
function withdrawInvestment(investmentId) {
  if (!currentUserId) {
    alert("Please login first");
    return;
  }
  
  if (confirm("Withdraw this investment early? Early withdrawal fees may apply.")) {
    update(ref(db, `users/${currentUserId}/investments/${investmentId}`), {
      status: "withdrawn",
      withdrawnAt: Date.now()
    }).then(() => {
      alert("Investment withdrawal requested successfully!");
    }).catch(error => {
      console.error("Withdrawal error:", error);
      alert("Withdrawal failed. Please try again.");
    });
  }
}

/* ======================
   SETUP LOGOUT BUTTON
====================== */
function setupLogoutButton() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) {
    console.warn("Logout button not found");
    return;
  }
  
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

/* ======================
   SETUP NAVIGATION BUTTONS
====================== */
function setupNavigationButtons() {
  // Investments button
  const investmentsBtn = document.getElementById("investmentsBtn");
  if (investmentsBtn) {
    investmentsBtn.addEventListener("click", () => {
      window.location.href = "investments.html";
    });
  }
  
  // Start Investing button
  const startInvestBtn = document.getElementById("startInvestBtn");
  if (startInvestBtn) {
    startInvestBtn.addEventListener("click", () => {
      window.location.href = "investments.html";
    });
  }
  
  // Deposit button redirects to wallet
  const depositBtn = document.getElementById("depositBtn");
  if (depositBtn) {
    depositBtn.addEventListener("click", () => {
      window.location.href = "wallet.html";
    });
  }
}

/* ======================
   SETUP REAL-TIME UPDATES
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
    
    const formatCurrency = (amount) => {
      return `ZMK ${parseFloat(amount).toFixed(2)}`;
    };
    
    const depositEl = document.getElementById("depositWallet");
    const earningsEl = document.getElementById("earningsWallet");
    const returnsEl = document.getElementById("returnsWallet");
    const referralEl = document.getElementById("referralWallet");

    if (depositEl) depositEl.textContent = formatCurrency(depositAmount);
    if (earningsEl) earningsEl.textContent = formatCurrency(earningsAmount);
    if (returnsEl) returnsEl.textContent = formatCurrency(returnsAmount);
    if (referralEl) referralEl.textContent = formatCurrency(referralAmount);
  });
}

/* ======================
   UPDATE LAST LOGIN
====================== */
function updateLastLogin(userId) {
  const lastLoginRef = ref(db, `users/${userId}/profile/lastLogin`);
  update(lastLoginRef, Date.now()).catch(error => {
    console.error("Error updating last login:", error);
  });
}

/* ======================
   REFERRAL BONUS FUNCTION
====================== */
async function applyReferralBonus(userId, depositAmount) {
  try {
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
      bonus: bonus,
      date: Date.now()
    });
    
    console.log("Referral bonus applied:", bonus);
  } catch (error) {
    console.error("Error applying referral bonus:", error);
  }
}

/* ======================
   NAVIGATION FUNCTIONS (Global)
====================== */
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

function goNotifications() {
  toggleNotifications();
}

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

/* ======================
   MAKE FUNCTIONS GLOBALLY AVAILABLE
====================== */
window.goHome = goHome;
window.goRefer = goRefer;
window.goInvestments = goInvestments;
window.goWallet = goWallet;
window.goWithdraw = goWithdraw;
window.goAbout = goAbout;
window.goNotifications = goNotifications;
window.toggleNotifications = toggleNotifications;
window.markRead = markRead;
window.withdrawInvestment = withdrawInvestment;
window.applyReferralBonus = applyReferralBonus;

/* ======================
   INITIAL LOAD FALLBACK
====================== */
// Quick fallback to show cached name if available
const cachedName = localStorage.getItem('userFirstName');
if (cachedName && document.getElementById('heroHeading')) {
  document.getElementById('heroHeading').textContent = `Hello, ${cachedName}`;
}